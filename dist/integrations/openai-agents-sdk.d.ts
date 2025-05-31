/**
 * OpenSafe AI Security Platform - OpenAI Agents SDK Integration
 *
 * This module provides integration with OpenAI's Agents SDK while maintaining
 * comprehensive safety analysis and constitutional AI principles.
 */
import OpenAI from 'openai';
import { SafetyAnalysisResult } from '../models/types';
interface AgentConfig {
    name: string;
    description: string;
    instructions: string;
    model: string;
    tools?: OpenAI.Beta.Assistants.AssistantTool[];
    metadata?: Record<string, string>;
    safety_mode?: 'strict' | 'balanced' | 'permissive';
    constitutional_principles?: string[];
}
interface SafeAgentResponse {
    id: string;
    object: string;
    created_at: number;
    name: string | null;
    description: string | null;
    model: string;
    instructions: string | null;
    tools: OpenAI.Beta.Assistants.AssistantTool[];
    file_ids: string[];
    metadata: Record<string, string> | null;
    safety_metadata: {
        safety_mode: string;
        constitutional_principles: string[];
        last_safety_check: string;
        safety_score: number;
    };
}
interface SafeThreadMessage {
    id: string;
    object: string;
    created_at: number;
    thread_id: string;
    role: 'user' | 'assistant';
    content: OpenAI.Beta.Threads.Messages.MessageContent[];
    file_ids: string[];
    assistant_id?: string | null;
    run_id?: string | null;
    metadata: Record<string, string> | null;
    safety_analysis?: SafetyAnalysisResult;
}
interface SafeRunResponse {
    id: string;
    object: string;
    created_at: number;
    assistant_id: string;
    thread_id: string;
    status: string;
    started_at?: number | null;
    expires_at?: number | null;
    cancelled_at?: number | null;
    failed_at?: number | null;
    completed_at?: number | null;
    last_error?: unknown;
    model: string;
    instructions: string;
    tools: OpenAI.Beta.Assistants.AssistantTool[];
    file_ids: string[];
    metadata: Record<string, string> | null;
    safety_metadata: {
        input_safety_score: number;
        output_safety_score?: number;
        constitutional_revisions: number;
        safety_violations: string[];
    };
}
export declare class SafeOpenAIAgentsSDK {
    private openai;
    private defaultSafetyMode;
    private defaultPrinciples;
    constructor(apiKey: string, options?: {
        safety_mode?: 'strict' | 'balanced' | 'permissive';
        constitutional_principles?: string[];
        base_url?: string;
    });
    /**
     * Create a safe AI assistant with built-in safety analysis
     */
    createSafeAssistant(config: AgentConfig, actorId?: string): Promise<SafeAgentResponse>;
    /**
     * Create a thread with safety monitoring
     */
    createSafeThread(metadata?: Record<string, string>, actorId?: string): Promise<OpenAI.Beta.Threads.Thread>;
    /**
     * Add a message to a thread with safety analysis
     */
    createSafeMessage(threadId: string, content: string, role?: 'user' | 'assistant', options?: {
        metadata?: Record<string, string>;
        safety_mode?: 'strict' | 'balanced' | 'permissive';
    }, actorId?: string): Promise<SafeThreadMessage>;
    /**
     * Run an assistant with comprehensive safety monitoring
     */
    createSafeRun(threadId: string, assistantId: string, options?: {
        model?: string;
        instructions?: string;
        additional_instructions?: string;
        tools?: OpenAI.Beta.Assistants.AssistantTool[];
        metadata?: Record<string, string>;
        safety_mode?: 'strict' | 'balanced' | 'permissive';
    }, actorId?: string): Promise<SafeRunResponse>;
    /**
     * Monitor a run and analyze outputs for safety
     */
    monitorSafeRun(threadId: string, runId: string, actorId?: string): Promise<SafeRunResponse>;
    /**
     * List all safe assistants with safety metadata
     */
    listSafeAssistants(options?: {
        limit?: number;
        order?: 'asc' | 'desc';
        after?: string;
        before?: string;
    }): Promise<{
        data: SafeAgentResponse[];
        object: string;
        first_id?: string;
        last_id?: string;
        has_more: boolean;
    }>;
    /**
     * Delete a safe assistant with audit logging
     */
    deleteSafeAssistant(assistantId: string, actorId?: string): Promise<{
        id: string;
        object: string;
        deleted: boolean;
    }>;
}
export declare const safeOpenAIAgents: SafeOpenAIAgentsSDK;
export {};
//# sourceMappingURL=openai-agents-sdk.d.ts.map