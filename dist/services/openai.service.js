"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const safety_service_1 = require("./safety.service"); // Use the enhanced SafetyService
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const audit_service_1 = require("./audit.service");
class OpenAIService {
    openai;
    constructor() {
        this.openai = new openai_1.default({
            apiKey: config_1.config.openaiApiKey,
            timeout: 60 * 1000, // 60 seconds timeout
            maxRetries: 2,
        });
    }
    async createSafeChatCompletion(params, actorId) {
        const { messages, safety_mode, user_id, custom_policy_id, ...openAIParams } = params;
        const startTime = Date.now();
        let inputSafetyScore = 1.0;
        let outputSafetyScore = 1.0;
        let constitutionalRevisionApplied = false;
        let constitutionalResult = undefined;
        try {
            // 1. Pre-flight safety check on input
            const combinedInputText = messages.map((m) => m.content).filter(Boolean).join('\n');
            const inputSafety = await safety_service_1.safetyService.analyzeText({
                text: combinedInputText,
                policy_id: custom_policy_id, // Use user-specified policy for input
                userId: user_id,
            }, actorId);
            inputSafetyScore = inputSafety.score;
            if (!inputSafety.safe) {
                logger_1.logger.warn('Input failed pre-flight safety check', { violations: inputSafety.violations.length, score: inputSafety.score, userId: actorId });
                if (safety_mode === 'strict') {
                    throw new errors_1.AppError(400, 'Input failed safety check (strict mode).', { violations: inputSafety.violations });
                }
                // In 'balanced' or 'permissive', we might proceed but log heavily.
            }
            // 2. Generate response from OpenAI
            const completion = await this.openai.chat.completions.create({
                messages: messages, // Cast if MessageSchema is slightly different from OpenAI's expected type
                ...openAIParams
            });
            const responseText = completion.choices[0]?.message?.content || '';
            // 3. Post-generation safety check on output
            let outputSafety = await safety_service_1.safetyService.analyzeText({
                text: responseText,
                policy_id: custom_policy_id, // Use user-specified policy for output
                userId: user_id,
            }, actorId);
            outputSafetyScore = outputSafety.score;
            let finalResponseText = responseText;
            if (!outputSafety.safe) {
                logger_1.logger.warn('Output failed initial safety check', { violations: outputSafety.violations.length, score: outputSafety.score, userId: actorId });
                if (safety_mode === 'strict') {
                    // Attempt Constitutional AI revision even in strict mode as a last resort
                    constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({ text: responseText }, actorId);
                    constitutionalRevisionApplied = true;
                    finalResponseText = constitutionalResult.revised;
                    // Re-analyze after revision
                    outputSafety = await safety_service_1.safetyService.analyzeText({ text: finalResponseText, policy_id: custom_policy_id, userId: user_id }, actorId);
                    outputSafetyScore = outputSafety.score;
                    if (!outputSafety.safe) {
                        throw new errors_1.AppError(400, 'Output failed safety check even after revision (strict mode).', { violations: outputSafety.violations });
                    }
                }
                else if (safety_mode === 'balanced') {
                    // Apply Constitutional AI
                    constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({ text: responseText }, actorId);
                    constitutionalRevisionApplied = true;
                    finalResponseText = constitutionalResult.revised;
                    // Re-analyze after revision
                    outputSafety = await safety_service_1.safetyService.analyzeText({ text: finalResponseText, policy_id: custom_policy_id, userId: user_id }, actorId);
                    outputSafetyScore = outputSafety.score;
                    if (!outputSafety.safe) {
                        logger_1.logger.warn('Output still unsafe after constitutional revision (balanced mode)', { violations: outputSafety.violations.length });
                        // Proceed with revised (potentially still unsafe) text in balanced, but with safety flags.
                    }
                }
                // In 'permissive' mode, we might log but return the original unsafe content or the revised one if revision happened.
            }
            // Update the completion choice with the potentially revised content
            if (completion.choices[0]?.message) {
                completion.choices[0].message.content = finalResponseText;
            }
            const duration = Date.now() - startTime;
            await audit_service_1.auditService.logAction({
                userId: actorId, serviceName: 'OpenAIService', action: 'chat_completion',
                details: { model: params.model, duration, inputSafetyScore, outputSafetyScore, constitutionalRevisionApplied, safetyMode: safety_mode },
                status: 'success'
            });
            return {
                ...completion,
                safety_metadata: {
                    input_analysis: inputSafety,
                    output_analysis: outputSafety,
                    constitutional_ai_result: constitutionalRevisionApplied ? constitutionalResult : undefined,
                    applied_safety_mode: safety_mode,
                }
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Error in createSafeChatCompletion', { error, userId: actorId });
            await audit_service_1.auditService.logAction({
                userId: actorId, serviceName: 'OpenAIService', action: 'chat_completion',
                details: { model: params.model, duration, safetyMode: safety_mode },
                status: 'failure', errorMessage: error.message
            });
            if (error instanceof errors_1.AppError)
                throw error;
            throw new errors_1.AppError(500, `Failed to create chat completion: ${error.message}`);
        }
    }
    async createSafeStreamingCompletion(params, onChunk, // Callback with safety status
    onComplete, onError, actorId) {
        const { messages, safety_mode, user_id, custom_policy_id, ...openAIParams } = params;
        let fullResponse = '';
        let isCurrentlySafe = true;
        let currentViolations = [];
        const startTime = Date.now();
        try {
            // 1. Pre-flight safety check (optional for streaming, but good for initial prompt)
            const combinedInputText = messages.map((m) => m.content).filter(Boolean).join('\n');
            const inputSafety = await safety_service_1.safetyService.analyzeText({ text: combinedInputText, policy_id: custom_policy_id, userId: user_id }, actorId);
            if (!inputSafety.safe && safety_mode === 'strict') {
                throw new errors_1.AppError(400, 'Input failed safety check for streaming (strict mode).', { violations: inputSafety.violations });
            }
            const stream = await this.openai.chat.completions.create({
                messages: messages,
                ...openAIParams,
                stream: true,
            });
            let chunkBuffer = '';
            const ANALYSIS_INTERVAL_CHARS = 100; // Analyze every N characters
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                fullResponse += delta;
                chunkBuffer += delta;
                // Real-time safety monitoring (simplified)
                if (chunkBuffer.length >= ANALYSIS_INTERVAL_CHARS || chunk.choices[0]?.finish_reason) {
                    const safetyCheckText = fullResponse.slice(-Math.max(ANALYSIS_INTERVAL_CHARS * 2, chunkBuffer.length)); // Analyze a larger window
                    const currentSafety = await safety_service_1.safetyService.analyzeText({ text: safetyCheckText, policy_id: custom_policy_id, mode: 'fast' }, actorId);
                    chunkBuffer = ''; // Reset buffer
                    isCurrentlySafe = currentSafety.safe;
                    currentViolations = currentSafety.violations;
                    if (!isCurrentlySafe && safety_mode === 'strict') {
                        logger_1.logger.warn('Streaming response failed safety check (strict mode)', { violations: currentViolations });
                        // Stop streaming and send an error or a safe fallback message.
                        // For now, we'll just flag it in the onChunk callback.
                        // A more robust implementation would close the stream and send a final error event.
                        onChunk({ ...chunk, choices: [{ ...chunk.choices[0], delta: { content: "\n[STREAM INTERRUPTED DUE TO SAFETY CONCERN]\n" } }] }, false, currentViolations);
                        stream.controller.abort(); // Attempt to abort the stream
                        throw new errors_1.AppError(400, "Stream interrupted due to safety violation (strict mode).");
                    }
                }
                onChunk(chunk, isCurrentlySafe, currentViolations);
            }
            // Final safety check on the full response
            const finalSafety = await safety_service_1.safetyService.analyzeText({ text: fullResponse, policy_id: custom_policy_id }, actorId);
            if (!finalSafety.safe) {
                logger_1.logger.warn('Streaming response failed final comprehensive safety check', { violations: finalSafety.violations });
                // Depending on mode, might still send onComplete but with safety flags.
            }
            onComplete(fullResponse, finalSafety);
            const duration = Date.now() - startTime;
            await audit_service_1.auditService.logAction({
                userId: actorId, serviceName: 'OpenAIService', action: 'chat_completion_stream',
                details: { model: params.model, duration, safetyMode: safety_mode, finalSafetyScore: finalSafety.score },
                status: 'success'
            });
        }
        catch (error) {
            logger_1.logger.error('Error in createSafeStreamingCompletion', { error, userId: actorId });
            onError(error instanceof Error ? error : new Error(String(error)));
            const duration = Date.now() - startTime;
            await audit_service_1.auditService.logAction({
                userId: actorId, serviceName: 'OpenAIService', action: 'chat_completion_stream',
                details: { model: params.model, duration, safetyMode: safety_mode },
                status: 'failure', errorMessage: error.message
            });
        }
    }
}
exports.OpenAIService = OpenAIService;
exports.openAIService = new OpenAIService();
//# sourceMappingURL=openai.service.js.map