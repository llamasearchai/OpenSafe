"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
// Simple logger fallback
const logger = {
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};
// Simple AppError class
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
// Mock safety service
const safetyService = {
    analyzeText: async (_params, _actorId) => ({
        safe: true,
        score: 0.95,
        violations: [],
        metadata: {
            analysisTime: 50,
            modelVersion: 'mock-v1.0',
            timestamp: new Date().toISOString()
        }
    }),
    applyConstitutionalPrinciples: async (params, _actorId) => ({
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
    logAction: async (data) => {
        console.log('[AUDIT]', data);
    }
};
class OpenAIService {
    openai;
    constructor() {
        const apiKey = (0, config_1.getProviderApiKey)(config_1.config.provider);
        if (!apiKey) {
            throw new Error(`API key not found for provider: ${config_1.config.provider}`);
        }
        this.openai = new openai_1.default({
            apiKey: apiKey,
            timeout: 60 * 1000,
            maxRetries: 2,
        });
    }
    async createSafeChatCompletion(params, actorId) {
        const { messages, safety_mode, user_id, custom_policy_id, ...openAIParams } = params;
        const startTime = Date.now();
        try {
            // Pre-flight safety check
            const combinedInputText = messages.map((m) => m.content).filter(Boolean).join('\n');
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
            const { stream: _, ...filteredParams } = openAIParams;
            const completionParams = {
                messages: messages,
                stream: false, // Ensure non-streaming response
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
            let constitutionalResult = undefined;
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Error in createSafeChatCompletion', { error, userId: actorId });
            await auditService.logAction({
                userId: actorId,
                action: 'chat_completion_error',
                details: {
                    model: params.model,
                    duration,
                    safetyMode: safety_mode,
                    error: error.message
                }
            });
            if (error instanceof AppError)
                throw error;
            throw new AppError(500, `Failed to create chat completion: ${error.message}`);
        }
    }
    async createSafeStreamingCompletion(params, onChunk, onComplete, onError, actorId) {
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
        }
        catch (error) {
            logger.error('Error in createSafeStreamingCompletion', { error, userId: actorId });
            onError(error instanceof Error ? error : new Error(String(error)));
            await auditService.logAction({
                userId: actorId,
                action: 'chat_completion_stream_error',
                details: {
                    model: params.model,
                    error: error.message
                }
            });
        }
    }
}
exports.OpenAIService = OpenAIService;
exports.openAIService = new OpenAIService();
//# sourceMappingURL=openai.service.js.map