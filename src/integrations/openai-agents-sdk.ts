/**
 * OpenVault AI Security Platform - OpenAI Agents SDK Integration
 * 
 * This module provides integration with OpenAI's Agents SDK while maintaining
 * comprehensive safety analysis and constitutional AI principles.
 */

import OpenAI from 'openai';
import { safetyService } from '../services/safety.service';
import { auditService } from '../services/audit.service';
import { SafetyAnalysisResult } from '../models/types';

// Types for OpenAI Agents SDK integration
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

export class SafeOpenAIAgentsSDK {
  private openai: OpenAI;
  private defaultSafetyMode: 'strict' | 'balanced' | 'permissive';
  private defaultPrinciples: string[];

  constructor(
    apiKey: string,
    options: {
      safety_mode?: 'strict' | 'balanced' | 'permissive';
      constitutional_principles?: string[];
      base_url?: string;
    } = {}
  ) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: options.base_url
    });
    
    this.defaultSafetyMode = options.safety_mode || 'balanced';
    this.defaultPrinciples = options.constitutional_principles || [
      'harmlessness',
      'helpfulness',
      'honesty',
      'privacy_protection'
    ];
  }

  /**
   * Create a safe AI assistant with built-in safety analysis
   */
  async createSafeAssistant(config: AgentConfig, actorId?: string): Promise<SafeAgentResponse> {
    try {
      // Analyze instructions for safety
      const instructionsSafety = await safetyService.analyzeText({
        text: config.instructions,
        mode: 'comprehensive',
        include_interpretability: true
      }, actorId);

      if (!instructionsSafety.safe && config.safety_mode === 'strict') {
        throw new Error(`Assistant instructions failed safety check: ${instructionsSafety.violations.map(v => v.type).join(', ')}`);
      }

      // Apply constitutional AI to instructions if needed
      let safeInstructions = config.instructions;
      if (instructionsSafety.score < 0.8 || config.constitutional_principles) {
        const constitutionalResult = await safetyService.applyConstitutionalPrinciples({
          text: config.instructions,
          principles: config.constitutional_principles || this.defaultPrinciples,
          max_revisions: 3
        }, actorId);
        
        safeInstructions = constitutionalResult.revised;
      }

      // Create the assistant with OpenAI
      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        description: config.description,
        instructions: safeInstructions,
        model: config.model,
        tools: config.tools || [],
        metadata: {
          ...config.metadata,
          safety_mode: config.safety_mode || this.defaultSafetyMode,
          created_by_openvault: 'true'
        }
      });

      // Log the creation
      await auditService.logAction({
        userId: actorId,
        action: 'safe_assistant_created',
        status: 'success',
        details: {
          assistantId: assistant.id,
          name: config.name,
          safetyMode: config.safety_mode || this.defaultSafetyMode,
          instructionsSafetyScore: instructionsSafety.score,
          constitutionalRevisionsApplied: safeInstructions !== config.instructions
        }
      });

      return {
        ...assistant,
        file_ids: [],
        safety_metadata: {
          safety_mode: config.safety_mode || this.defaultSafetyMode,
          constitutional_principles: config.constitutional_principles || this.defaultPrinciples,
          last_safety_check: new Date().toISOString(),
          safety_score: instructionsSafety.score
        }
      };

    } catch (error) {
      await auditService.logAction({
        userId: actorId,
        action: 'safe_assistant_creation_failed',
        status: 'failure',
        details: {
          name: config.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Create a thread with safety monitoring
   */
  async createSafeThread(metadata?: Record<string, string>, actorId?: string): Promise<OpenAI.Beta.Threads.Thread> {
    const thread = await this.openai.beta.threads.create({
      metadata: {
        ...metadata,
        created_by_openvault: 'true',
        safety_monitoring: 'enabled'
      }
    });

    await auditService.logAction({
      userId: actorId,
      action: 'safe_thread_created',
      status: 'success',
      details: { threadId: thread.id }
    });

    return thread;
  }

  /**
   * Add a message to a thread with safety analysis
   */
  async createSafeMessage(
    threadId: string,
    content: string,
    role: 'user' | 'assistant' = 'user',
    options: {
      metadata?: Record<string, string>;
      safety_mode?: 'strict' | 'balanced' | 'permissive';
    } = {},
    actorId?: string
  ): Promise<SafeThreadMessage> {
    try {
      // Analyze message content for safety
      const safetyAnalysis = await safetyService.analyzeText({
        text: content,
        mode: 'comprehensive',
        include_interpretability: true
      }, actorId);

      const safetyMode = options.safety_mode || this.defaultSafetyMode;

      if (!safetyAnalysis.safe && safetyMode === 'strict') {
        throw new Error(`Message content failed safety check: ${safetyAnalysis.violations.map(v => v.type).join(', ')}`);
      }

      // Apply constitutional AI if needed
      let safeContent = content;
      if (safetyAnalysis.score < 0.8 && role === 'user') {
        const constitutionalResult = await safetyService.applyConstitutionalPrinciples({
          text: content,
          principles: this.defaultPrinciples,
          max_revisions: 2
        }, actorId);
        
        safeContent = constitutionalResult.revised;
      }

      // Create the message
      const message = await this.openai.beta.threads.messages.create(threadId, {
        role,
        content: safeContent,
        metadata: {
          ...options.metadata,
          safety_score: safetyAnalysis.score.toString(),
          safety_mode: safetyMode,
          constitutional_revised: (safeContent !== content).toString()
        }
      });

      await auditService.logAction({
        userId: actorId,
        action: 'safe_message_created',
        status: 'success',
        details: {
          threadId,
          messageId: message.id,
          role,
          safetyScore: safetyAnalysis.score,
          safetyViolations: safetyAnalysis.violations.length,
          constitutionalRevised: safeContent !== content
        }
      });

      return {
        ...message,
        file_ids: [],
        safety_analysis: safetyAnalysis
      };

    } catch (error) {
      await auditService.logAction({
        userId: actorId,
        action: 'safe_message_creation_failed',
        status: 'failure',
        details: {
          threadId,
          role,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Run an assistant with comprehensive safety monitoring
   */
  async createSafeRun(
    threadId: string,
    assistantId: string,
    options: {
      model?: string;
      instructions?: string;
      additional_instructions?: string;
      tools?: OpenAI.Beta.Assistants.AssistantTool[];
      metadata?: Record<string, string>;
      safety_mode?: 'strict' | 'balanced' | 'permissive';
    } = {},
    actorId?: string
  ): Promise<SafeRunResponse> {
    try {
      const safetyMode = options.safety_mode || this.defaultSafetyMode;

      // Analyze additional instructions if provided
      let inputSafetyScore = 1.0;
      let safeInstructions = options.instructions;
      let safeAdditionalInstructions = options.additional_instructions;

      if (options.instructions) {
        const instructionsSafety = await safetyService.analyzeText({
          text: options.instructions,
          mode: 'comprehensive'
        }, actorId);

        inputSafetyScore = Math.min(inputSafetyScore, instructionsSafety.score);

        if (!instructionsSafety.safe && safetyMode === 'strict') {
          throw new Error(`Run instructions failed safety check: ${instructionsSafety.violations.map(v => v.type).join(', ')}`);
        }

        if (instructionsSafety.score < 0.8) {
          const constitutionalResult = await safetyService.applyConstitutionalPrinciples({
            text: options.instructions,
            principles: this.defaultPrinciples,
            max_revisions: 2
          }, actorId);
          safeInstructions = constitutionalResult.revised;
        }
      }

      if (options.additional_instructions) {
        const additionalSafety = await safetyService.analyzeText({
          text: options.additional_instructions,
          mode: 'comprehensive'
        }, actorId);

        inputSafetyScore = Math.min(inputSafetyScore, additionalSafety.score);

        if (!additionalSafety.safe && safetyMode === 'strict') {
          throw new Error(`Additional instructions failed safety check: ${additionalSafety.violations.map(v => v.type).join(', ')}`);
        }

        if (additionalSafety.score < 0.8) {
          const constitutionalResult = await safetyService.applyConstitutionalPrinciples({
            text: options.additional_instructions,
            principles: this.defaultPrinciples,
            max_revisions: 2
          }, actorId);
          safeAdditionalInstructions = constitutionalResult.revised;
        }
      }

      // Create the run
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        model: options.model,
        instructions: safeInstructions,
        additional_instructions: safeAdditionalInstructions,
        tools: options.tools,
        metadata: {
          ...options.metadata,
          safety_mode: safetyMode,
          input_safety_score: inputSafetyScore.toString(),
          created_by_openvault: 'true'
        }
      });

      await auditService.logAction({
        userId: actorId,
        action: 'safe_run_created',
        status: 'success',
        details: {
          threadId,
          runId: run.id,
          assistantId,
          inputSafetyScore,
          safetyMode
        }
      });

      return {
        ...run,
        file_ids: [],
        safety_metadata: {
          input_safety_score: inputSafetyScore,
          constitutional_revisions: (safeInstructions !== options.instructions ? 1 : 0) + 
                                   (safeAdditionalInstructions !== options.additional_instructions ? 1 : 0),
          safety_violations: []
        }
      };

    } catch (error) {
      await auditService.logAction({
        userId: actorId,
        action: 'safe_run_creation_failed',
        status: 'failure',
        details: {
          threadId,
          assistantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Monitor a run and analyze outputs for safety
   */
  async monitorSafeRun(
    threadId: string,
    runId: string,
    actorId?: string
  ): Promise<SafeRunResponse> {
    try {
      // Poll for completion
      let run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      
      while (run.status === 'queued' || run.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      }

      let outputSafetyScore: number | undefined;
      const safetyViolations: string[] = [];

      if (run.status === 'completed') {
        // Analyze the assistant's response
        const messages = await this.openai.beta.threads.messages.list(threadId, {
          order: 'desc',
          limit: 1
        });

        if (messages.data.length > 0) {
          const lastMessage = messages.data[0];
          if (lastMessage.role === 'assistant') {
            const content = lastMessage.content
              .filter(c => c.type === 'text')
              .map(c => (c as any).text.value)
              .join('\n');

            const outputSafety = await safetyService.analyzeText({
              text: content,
              mode: 'comprehensive',
              include_interpretability: true
            }, actorId);

            outputSafetyScore = outputSafety.score;
            
            if (!outputSafety.safe) {
              safetyViolations.push(...outputSafety.violations.map(v => v.type));
            }
          }
        }
      }

      await auditService.logAction({
        userId: actorId,
        action: 'safe_run_completed',
        status: 'success',
        details: {
          threadId,
          runId,
          status: run.status,
          outputSafetyScore,
          safetyViolations: safetyViolations.length
        }
      });

      return {
        ...run,
        file_ids: [],
        safety_metadata: {
          input_safety_score: parseFloat(run.metadata?.input_safety_score || '1.0'),
          output_safety_score: outputSafetyScore,
          constitutional_revisions: 0,
          safety_violations: safetyViolations
        }
      };

    } catch (error) {
      await auditService.logAction({
        userId: actorId,
        action: 'safe_run_monitoring_failed',
        status: 'failure',
        details: {
          threadId,
          runId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * List all safe assistants with safety metadata
   */
  async listSafeAssistants(
    options: {
      limit?: number;
      order?: 'asc' | 'desc';
      after?: string;
      before?: string;
    } = {}
  ): Promise<{ data: SafeAgentResponse[]; object: string; first_id?: string; last_id?: string; has_more: boolean }> {
    const assistants = await this.openai.beta.assistants.list(options);
    
    const safeAssistants: SafeAgentResponse[] = assistants.data
      .filter(assistant => assistant.metadata?.created_by_openvault === 'true')
      .map(assistant => ({
        ...assistant,
        file_ids: [],
        safety_metadata: {
          safety_mode: assistant.metadata?.safety_mode || 'balanced',
          constitutional_principles: this.defaultPrinciples,
          last_safety_check: new Date().toISOString(),
          safety_score: parseFloat(assistant.metadata?.safety_score || '1.0')
        }
      }));

    return {
      data: safeAssistants,
      object: 'list',
      has_more: assistants.has_more
    };
  }

  /**
   * Delete a safe assistant with audit logging
   */
  async deleteSafeAssistant(assistantId: string, actorId?: string): Promise<{ id: string; object: string; deleted: boolean }> {
    try {
      const result = await this.openai.beta.assistants.del(assistantId);
      
      await auditService.logAction({
        userId: actorId,
        action: 'safe_assistant_deleted',
        status: 'success',
        details: { assistantId }
      });

      return result;
    } catch (error) {
      await auditService.logAction({
        userId: actorId,
        action: 'safe_assistant_deletion_failed',
        status: 'failure',
        details: {
          assistantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }
}

// Export a default instance
export const safeOpenAIAgents = new SafeOpenAIAgentsSDK(
  process.env.OPENAI_API_KEY || '',
  {
    safety_mode: 'balanced',
    constitutional_principles: ['harmlessness', 'helpfulness', 'honesty', 'privacy_protection']
  }
); 