/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
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
export declare class RealtimeService extends EventEmitter {
    private ws;
    private currentSession;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private agents;
    private currentAgent;
    private conversationHistory;
    constructor();
    /**
     * Initialize connection to OpenAI Realtime API
     */
    connect(): Promise<void>;
    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocketHandlers;
    /**
     * Handle incoming realtime messages
     */
    private handleRealtimeMessage;
    /**
     * Create a new realtime session
     */
    createSession(sessionConfig: Partial<RealtimeSession>): Promise<void>;
    /**
     * Send audio input to the model
     */
    sendAudio(audioData: Buffer): Promise<void>;
    /**
     * Commit audio input and trigger response
     */
    commitAudio(): Promise<void>;
    /**
     * Send text input to the model
     */
    sendText(text: string, role?: 'user' | 'assistant'): Promise<void>;
    /**
     * Register an agent configuration
     */
    registerAgent(name: string, agentConfig: any): void;
    /**
     * Perform agent handoff
     */
    handoffToAgent(agentName: string, context?: any): Promise<void>;
    /**
     * Execute function/tool call
     */
    executeFunction(name: string, args: any): Promise<any>;
    /**
     * Send message to realtime API
     */
    private sendMessage;
    /**
     * Handle session created event
     */
    private handleSessionCreated;
    /**
     * Handle conversation item
     */
    private handleConversationItem;
    /**
     * Handle audio delta
     */
    private handleAudioDelta;
    /**
     * Handle audio done
     */
    private handleAudioDone;
    /**
     * Handle text delta
     */
    private handleTextDelta;
    /**
     * Handle function call delta
     */
    private handleFunctionCallDelta;
    /**
     * Handle function call done
     */
    private handleFunctionCallDone;
    /**
     * Handle error messages
     */
    private handleError;
    /**
     * Attempt to reconnect
     */
    private attemptReconnect;
    /**
     * Disconnect from the realtime API
     */
    disconnect(): void;
    /**
     * Get conversation history
     */
    getHistory(): RealtimeMessage[];
    /**
     * Clear conversation history
     */
    clearHistory(): void;
    /**
     * Check if connected
     */
    isRealtimeConnected(): boolean;
    /**
     * Get current agent
     */
    getCurrentAgent(): string | null;
    /**
     * Get registered agents
     */
    getRegisteredAgents(): string[];
}
export default RealtimeService;
//# sourceMappingURL=RealtimeService.d.ts.map