import OpenAI from 'openai';
import { config, getProviderApiKey } from '../config';
import { ChatRequestSchema } from '../models/schemas';
import { ConstitutionalAIResult } from '../models/types';
import { z } from 'zod';

// Simple logger fallback
const logger = {
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// Simple AppError class
class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Mock safety service
const safetyService = {
  analyzeText: async (_params: any, _actorId?: string) => ({
    safe: true,
    score: 0.95,
    violations: [],
    metadata: {
      analysisTime: 50,
      modelVersion: 'mock-v1.0',
      timestamp: new Date().toISOString()
    }
  }),
  applyConstitutionalPrinciples: async (params: any, _actorId?: string): Promise<ConstitutionalAIResult> => ({
    original: params.text,
    revised: params.text,
    critiques: [],
    revisionCount: 0,
    principles: ['harmlessness', 'helpfulness'],
    appliedSuccessfully: true
  })
};

// Mock audit service
const auditService = {
  logAction: async (data: any) => {
    console.log('[AUDIT]', data);
  }
};

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = getProviderApiKey(config.provider);
    if (!apiKey) {
      throw new Error(`API key not found for provider: ${config.provider}`);
    }
    
    this.openai = new OpenAI({ 
        apiKey: apiKey,
        timeout: 60 * 1000,
        maxRetries: 2,
    });
  }

  async createSafeChatCompletion(
    params: z.infer<typeof ChatRequestSchema>,
    actorId?: string
  ): Promise<any> {
    const { messages, safety_mode, user_id, custom_policy_id, ...openAIParams } = params;
    const startTime = Date.now();

    try {
      // Pre-flight safety check
      const combinedInputText = messages.map((m: any) => m.content).filter(Boolean).join('\n');
      const inputSafety = await safetyService.analyzeText({
        text: combinedInputText,
        mode: 'fast',
        include_interpretability: false,
        policy_id: custom_policy_id,
        userId: user_id,
      }, actorId);

      if (inputSafety.violations.length > 0 && safety_mode === 'strict') {
        throw new AppError(400, 'Input failed safety check (strict mode).');
      }

      // Generate response from OpenAI
      const { stream: _, ...filteredParams } = openAIParams as any;
      const completionParams = {
        messages: messages as any,
        stream: false as const, // Ensure non-streaming response
        ...filteredParams
      };
      
      const completion = await this.openai.chat.completions.create(completionParams);

      // Type guard to ensure we have a non-streaming completion
      if (!('choices' in completion) || !Array.isArray(completion.choices)) {
        throw new AppError(500, 'Unexpected response format from OpenAI API');
      }

      const responseText = completion.choices[0]?.message?.content || '';

      // Post-generation safety check
      const outputSafety = await safetyService.analyzeText({
        text: responseText,
        mode: 'comprehensive',
        include_interpretability: false,
        policy_id: custom_policy_id,
        userId: user_id,
      }, actorId);

      let finalResponseText = responseText;
      let constitutionalResult: ConstitutionalAIResult | undefined = undefined;

      if (!outputSafety.safe && safety_mode !== 'permissive') {
        logger.warn('Output failed safety check, applying constitutional AI', { 
          violations: outputSafety.violations.length, 
          userId: actorId 
        });
        
        constitutionalResult = await safetyService.applyConstitutionalPrinciples({ 
          text: responseText,
          max_revisions: 3 
        }, actorId);
        
        finalResponseText = constitutionalResult.revised;
        
        if (safety_mode === 'strict' && !constitutionalResult.appliedSuccessfully) {
          throw new AppError(400, 'Output failed safety check even after revision (strict mode).');
        }
      }

      // Update the completion with revised content
      if (completion.choices[0]?.message) {
        completion.choices[0].message.content = finalResponseText;
      }
      
      const duration = Date.now() - startTime;
      await auditService.logAction({
        userId: actorId, 
        action: 'chat_completion',
        details: { 
          model: params.model, 
          duration, 
          safetyMode: safety_mode,
          constitutionalRevisionApplied: !!constitutionalResult
        }
      });

      return {
        ...completion,
        safety_metadata: {
          input_safety_score: inputSafety.score,
          output_safety_score: outputSafety.score,
          constitutional_ai_result: constitutionalResult,
          applied_safety_mode: safety_mode,
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in createSafeChatCompletion', { error, userId: actorId });
      await auditService.logAction({
        userId: actorId, 
        action: 'chat_completion_error',
        details: { 
          model: params.model, 
          duration, 
          safetyMode: safety_mode,
          error: (error as Error).message
        }
      });
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Failed to create chat completion: ${(error as Error).message}`);
    }
  }

  async createSafeStreamingCompletion(
    params: z.infer<typeof ChatRequestSchema>,
    onChunk: (chunk: any, isSafe: boolean, violations?: any[]) => void,
    onComplete: (fullResponseText: string, finalSafety: any) => void,
    onError: (error: Error) => void,
    actorId?: string
  ): Promise<void> {
    try {
      // For now, use non-streaming and simulate chunks
      const completion = await this.createSafeChatCompletion(params, actorId);
      const responseText = completion.choices?.[0]?.message?.content || '';
      
      // Simulate streaming by sending the response in chunks
      const chunkSize = 50;
      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = {
          choices: [{
            delta: { content: responseText.slice(i, i + chunkSize) },
            finish_reason: i + chunkSize >= responseText.length ? 'stop' : null
          }]
        };
        onChunk(chunk, true, []);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      onComplete(responseText, completion.safety_metadata);
      
      await auditService.logAction({
        userId: actorId,
        action: 'chat_completion_stream',
        details: { 
          model: params.model, 
          responseLength: responseText.length,
          safetyMode: params.safety_mode 
        }
      });
      
    } catch (error) {
      logger.error('Error in createSafeStreamingCompletion', { error, userId: actorId });
      onError(error instanceof Error ? error : new Error(String(error)));
      
      await auditService.logAction({
        userId: actorId,
        action: 'chat_completion_stream_error',
        details: { 
          model: params.model, 
          error: (error as Error).message 
        }
      });
    }
  }
}

export const openAIService = new OpenAIService(); 