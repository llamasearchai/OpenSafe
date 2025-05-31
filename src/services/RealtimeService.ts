import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { config, getProviderApiKey } from '../config';
import { logger } from '../utils/logger';

export interface RealtimeSession {
  id: string;
  model: string;
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  tools?: any[];
  tool_choice?: string;
  temperature?: number;
  max_response_output_tokens?: number;
}

export interface RealtimeMessage {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export interface AgentHandoff {
  from_agent: string;
  to_agent: string;
  reason: string;
  context?: any;
}

export class RealtimeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private currentSession: RealtimeSession | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private agents: Map<string, any> = new Map();
  private currentAgent: string | null = null;
  private conversationHistory: RealtimeMessage[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize connection to OpenAI Realtime API
   */
  async connect(): Promise<void> {
    const apiKey = getProviderApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    this.ws = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    this.setupWebSocketHandlers();

    return new Promise((resolve, reject) => {
      this.ws!.once('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to OpenAI Realtime API');
        resolve();
      });

      this.ws!.once('error', (error) => {
        logger.error('WebSocket connection error:', error);
        reject(error);
      });
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const message: RealtimeMessage = JSON.parse(data.toString());
        this.handleRealtimeMessage(message);
      } catch (error) {
        logger.error('Failed to parse realtime message:', error);
      }
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      logger.warn('WebSocket connection closed');
      this.attemptReconnect();
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle incoming realtime messages
   */
  private handleRealtimeMessage(message: RealtimeMessage): void {
    this.conversationHistory.push(message);
    this.emit('message', message);

    switch (message.type) {
      case 'session.created':
        this.handleSessionCreated(message);
        break;
      case 'conversation.item.created':
        this.handleConversationItem(message);
        break;
      case 'response.audio.delta':
        this.handleAudioDelta(message);
        break;
      case 'response.audio.done':
        this.handleAudioDone(message);
        break;
      case 'response.text.delta':
        this.handleTextDelta(message);
        break;
      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(message);
        break;
      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(message);
        break;
      case 'error':
        this.handleError(message);
        break;
      default:
        logger.debug('Unhandled message type:', message.type);
    }
  }

  /**
   * Create a new realtime session
   */
  async createSession(sessionConfig: Partial<RealtimeSession>): Promise<void> {
    const session: RealtimeSession = {
      id: sessionConfig.id || `session_${Date.now()}`,
      model: sessionConfig.model || config.voice.model,
      modalities: sessionConfig.modalities || ['text', 'audio'],
      instructions: sessionConfig.instructions || 'You are a helpful AI assistant.',
      voice: sessionConfig.voice || config.voice.voice,
      input_audio_format: sessionConfig.input_audio_format || config.voice.format,
      output_audio_format: sessionConfig.output_audio_format || config.voice.format,
      input_audio_transcription: sessionConfig.input_audio_transcription || config.voice.inputAudioTranscription,
      turn_detection: sessionConfig.turn_detection || {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      tools: sessionConfig.tools || [],
      tool_choice: sessionConfig.tool_choice || 'auto',
      temperature: sessionConfig.temperature || 0.8,
      max_response_output_tokens: sessionConfig.max_response_output_tokens || 4096,
    };

    this.currentSession = session;
    await this.sendMessage({
      type: 'session.update',
      session,
    });
  }

  /**
   * Send audio input to the model
   */
  async sendAudio(audioData: Buffer): Promise<void> {
    await this.sendMessage({
      type: 'input_audio_buffer.append',
      audio: audioData.toString('base64'),
    });
  }

  /**
   * Commit audio input and trigger response
   */
  async commitAudio(): Promise<void> {
    await this.sendMessage({
      type: 'input_audio_buffer.commit',
    });
  }

  /**
   * Send text input to the model
   */
  async sendText(text: string, role: 'user' | 'assistant' = 'user'): Promise<void> {
    await this.sendMessage({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role,
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    });

    await this.sendMessage({
      type: 'response.create',
    });
  }

  /**
   * Register an agent configuration
   */
  registerAgent(name: string, agentConfig: any): void {
    this.agents.set(name, agentConfig);
    logger.info(`Registered agent: ${name}`);
  }

  /**
   * Perform agent handoff
   */
  async handoffToAgent(agentName: string, context?: any): Promise<void> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const handoff: AgentHandoff = {
      from_agent: this.currentAgent || 'system',
      to_agent: agentName,
      reason: context?.reason || 'User request',
      context,
    };

    logger.info(`Performing handoff: ${handoff.from_agent} -> ${handoff.to_agent}`);
    this.emit('agent_handoff', handoff);

    // Update session with new agent configuration
    await this.createSession({
      instructions: agent.instructions,
      tools: agent.tools || [],
    });

    this.currentAgent = agentName;
  }

  /**
   * Execute function/tool call
   */
  async executeFunction(name: string, args: any): Promise<any> {
    logger.info(`Executing function: ${name}`, args);
    
    // Handle agent transfer function
    if (name === 'transfer_to_agent') {
      await this.handoffToAgent(args.agent_name, args.context);
      return { success: true, message: `Transferred to ${args.agent_name}` };
    }

    // Emit function call for external handling
    return new Promise((resolve, reject) => {
      this.emit('function_call', { name, args }, (result: any, error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Send message to realtime API
   */
  private async sendMessage(message: RealtimeMessage): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    this.ws.send(JSON.stringify(message));
    logger.debug('Sent message:', message.type);
  }

  /**
   * Handle session created event
   */
  private handleSessionCreated(message: RealtimeMessage): void {
    logger.info('Session created:', message.session?.id);
    this.emit('session_created', message.session);
  }

  /**
   * Handle conversation item
   */
  private handleConversationItem(message: RealtimeMessage): void {
    this.emit('conversation_item', message.item);
  }

  /**
   * Handle audio delta
   */
  private handleAudioDelta(message: RealtimeMessage): void {
    if (message.delta) {
      const audioBuffer = Buffer.from(message.delta, 'base64');
      this.emit('audio_delta', audioBuffer);
    }
  }

  /**
   * Handle audio done
   */
  private handleAudioDone(message: RealtimeMessage): void {
    this.emit('audio_done', message);
  }

  /**
   * Handle text delta
   */
  private handleTextDelta(message: RealtimeMessage): void {
    this.emit('text_delta', message.delta);
  }

  /**
   * Handle function call delta
   */
  private handleFunctionCallDelta(message: RealtimeMessage): void {
    this.emit('function_call_delta', message.delta);
  }

  /**
   * Handle function call done
   */
  private async handleFunctionCallDone(message: RealtimeMessage): Promise<void> {
    const { name, arguments: args, call_id } = message;
    
    try {
      const result = await this.executeFunction(name, JSON.parse(args || '{}'));
      
      await this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(result),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Function execution failed:', error);
      
      await this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify({ error: errorMessage }),
        },
      });
    }
  }

  /**
   * Handle error messages
   */
  private handleError(message: RealtimeMessage): void {
    logger.error('Realtime API error:', message.error);
    this.emit('error', new Error(message.error?.message || 'Unknown error'));
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
        if (this.currentSession) {
          await this.createSession(this.currentSession);
        }
      } catch (error) {
        logger.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Disconnect from the realtime API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.currentSession = null;
      this.conversationHistory = [];
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): RealtimeMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Check if connected
   */
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current agent
   */
  getCurrentAgent(): string | null {
    return this.currentAgent;
  }

  /**
   * Get registered agents
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

export default RealtimeService; 