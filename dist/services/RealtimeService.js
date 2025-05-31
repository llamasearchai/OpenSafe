"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class RealtimeService extends events_1.EventEmitter {
    ws = null;
    currentSession = null;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    agents = new Map();
    currentAgent = null;
    conversationHistory = [];
    constructor() {
        super();
    }
    /**
     * Initialize connection to OpenAI Realtime API
     */
    async connect() {
        const apiKey = (0, config_1.getProviderApiKey)('openai');
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }
        const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
        this.ws = new ws_1.default(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'OpenAI-Beta': 'realtime=v1',
            },
        });
        this.setupWebSocketHandlers();
        return new Promise((resolve, reject) => {
            this.ws.once('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                logger_1.logger.info('Connected to OpenAI Realtime API');
                resolve();
            });
            this.ws.once('error', (error) => {
                logger_1.logger.error('WebSocket connection error:', error);
                reject(error);
            });
        });
    }
    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        if (!this.ws)
            return;
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleRealtimeMessage(message);
            }
            catch (error) {
                logger_1.logger.error('Failed to parse realtime message:', error);
            }
        });
        this.ws.on('close', () => {
            this.isConnected = false;
            logger_1.logger.warn('WebSocket connection closed');
            this.attemptReconnect();
        });
        this.ws.on('error', (error) => {
            logger_1.logger.error('WebSocket error:', error);
            this.emit('error', error);
        });
    }
    /**
     * Handle incoming realtime messages
     */
    handleRealtimeMessage(message) {
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
                logger_1.logger.debug('Unhandled message type:', message.type);
        }
    }
    /**
     * Create a new realtime session
     */
    async createSession(sessionConfig) {
        const session = {
            id: sessionConfig.id || `session_${Date.now()}`,
            model: sessionConfig.model || config_1.config.voice.model,
            modalities: sessionConfig.modalities || ['text', 'audio'],
            instructions: sessionConfig.instructions || 'You are a helpful AI assistant.',
            voice: sessionConfig.voice || config_1.config.voice.voice,
            input_audio_format: sessionConfig.input_audio_format || config_1.config.voice.format,
            output_audio_format: sessionConfig.output_audio_format || config_1.config.voice.format,
            input_audio_transcription: sessionConfig.input_audio_transcription || config_1.config.voice.inputAudioTranscription,
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
    async sendAudio(audioData) {
        await this.sendMessage({
            type: 'input_audio_buffer.append',
            audio: audioData.toString('base64'),
        });
    }
    /**
     * Commit audio input and trigger response
     */
    async commitAudio() {
        await this.sendMessage({
            type: 'input_audio_buffer.commit',
        });
    }
    /**
     * Send text input to the model
     */
    async sendText(text, role = 'user') {
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
    registerAgent(name, agentConfig) {
        this.agents.set(name, agentConfig);
        logger_1.logger.info(`Registered agent: ${name}`);
    }
    /**
     * Perform agent handoff
     */
    async handoffToAgent(agentName, context) {
        const agent = this.agents.get(agentName);
        if (!agent) {
            throw new Error(`Agent ${agentName} not found`);
        }
        const handoff = {
            from_agent: this.currentAgent || 'system',
            to_agent: agentName,
            reason: context?.reason || 'User request',
            context,
        };
        logger_1.logger.info(`Performing handoff: ${handoff.from_agent} -> ${handoff.to_agent}`);
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
    async executeFunction(name, args) {
        logger_1.logger.info(`Executing function: ${name}`, args);
        // Handle agent transfer function
        if (name === 'transfer_to_agent') {
            await this.handoffToAgent(args.agent_name, args.context);
            return { success: true, message: `Transferred to ${args.agent_name}` };
        }
        // Emit function call for external handling
        return new Promise((resolve, reject) => {
            this.emit('function_call', { name, args }, (result, error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
     * Send message to realtime API
     */
    async sendMessage(message) {
        if (!this.ws || !this.isConnected) {
            throw new Error('Not connected to Realtime API');
        }
        this.ws.send(JSON.stringify(message));
        logger_1.logger.debug('Sent message:', message.type);
    }
    /**
     * Handle session created event
     */
    handleSessionCreated(message) {
        logger_1.logger.info('Session created:', message.session?.id);
        this.emit('session_created', message.session);
    }
    /**
     * Handle conversation item
     */
    handleConversationItem(message) {
        this.emit('conversation_item', message.item);
    }
    /**
     * Handle audio delta
     */
    handleAudioDelta(message) {
        if (message.delta) {
            const audioBuffer = Buffer.from(message.delta, 'base64');
            this.emit('audio_delta', audioBuffer);
        }
    }
    /**
     * Handle audio done
     */
    handleAudioDone(message) {
        this.emit('audio_done', message);
    }
    /**
     * Handle text delta
     */
    handleTextDelta(message) {
        this.emit('text_delta', message.delta);
    }
    /**
     * Handle function call delta
     */
    handleFunctionCallDelta(message) {
        this.emit('function_call_delta', message.delta);
    }
    /**
     * Handle function call done
     */
    async handleFunctionCallDone(message) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Function execution failed:', error);
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
    handleError(message) {
        logger_1.logger.error('Realtime API error:', message.error);
        this.emit('error', new Error(message.error?.message || 'Unknown error'));
    }
    /**
     * Attempt to reconnect
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger_1.logger.error('Max reconnection attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
        logger_1.logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        setTimeout(async () => {
            try {
                await this.connect();
                if (this.currentSession) {
                    await this.createSession(this.currentSession);
                }
            }
            catch (error) {
                logger_1.logger.error('Reconnection failed:', error);
            }
        }, delay);
    }
    /**
     * Disconnect from the realtime API
     */
    disconnect() {
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
    getHistory() {
        return [...this.conversationHistory];
    }
    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }
    /**
     * Check if connected
     */
    isRealtimeConnected() {
        return this.isConnected;
    }
    /**
     * Get current agent
     */
    getCurrentAgent() {
        return this.currentAgent;
    }
    /**
     * Get registered agents
     */
    getRegisteredAgents() {
        return Array.from(this.agents.keys());
    }
}
exports.RealtimeService = RealtimeService;
exports.default = RealtimeService;
//# sourceMappingURL=RealtimeService.js.map