"use strict";
/**
 * OpenVault AI Security Platform - OpenAI Agents SDK Integration
 *
 * This module provides integration with OpenAI's Agents SDK while maintaining
 * comprehensive safety analysis and constitutional AI principles.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeOpenAIAgents = exports.SafeOpenAIAgentsSDK = void 0;
const openai_1 = __importDefault(require("openai"));
const safety_service_1 = require("../services/safety.service");
const audit_service_1 = require("../services/audit.service");
class SafeOpenAIAgentsSDK {
    openai;
    defaultSafetyMode;
    defaultPrinciples;
    constructor(apiKey, options = {}) {
        this.openai = new openai_1.default({
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
    async createSafeAssistant(config, actorId) {
        try {
            // Analyze instructions for safety
            const instructionsSafety = await safety_service_1.safetyService.analyzeText({
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
                const constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({
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
            await audit_service_1.auditService.logAction({
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
        }
        catch (error) {
            await audit_service_1.auditService.logAction({
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
    async createSafeThread(metadata, actorId) {
        const thread = await this.openai.beta.threads.create({
            metadata: {
                ...metadata,
                created_by_openvault: 'true',
                safety_monitoring: 'enabled'
            }
        });
        await audit_service_1.auditService.logAction({
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
    async createSafeMessage(threadId, content, role = 'user', options = {}, actorId) {
        try {
            // Analyze message content for safety
            const safetyAnalysis = await safety_service_1.safetyService.analyzeText({
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
                const constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({
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
            await audit_service_1.auditService.logAction({
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
        }
        catch (error) {
            await audit_service_1.auditService.logAction({
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
    async createSafeRun(threadId, assistantId, options = {}, actorId) {
        try {
            const safetyMode = options.safety_mode || this.defaultSafetyMode;
            // Analyze additional instructions if provided
            let inputSafetyScore = 1.0;
            let safeInstructions = options.instructions;
            let safeAdditionalInstructions = options.additional_instructions;
            if (options.instructions) {
                const instructionsSafety = await safety_service_1.safetyService.analyzeText({
                    text: options.instructions,
                    mode: 'comprehensive'
                }, actorId);
                inputSafetyScore = Math.min(inputSafetyScore, instructionsSafety.score);
                if (!instructionsSafety.safe && safetyMode === 'strict') {
                    throw new Error(`Run instructions failed safety check: ${instructionsSafety.violations.map(v => v.type).join(', ')}`);
                }
                if (instructionsSafety.score < 0.8) {
                    const constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({
                        text: options.instructions,
                        principles: this.defaultPrinciples,
                        max_revisions: 2
                    }, actorId);
                    safeInstructions = constitutionalResult.revised;
                }
            }
            if (options.additional_instructions) {
                const additionalSafety = await safety_service_1.safetyService.analyzeText({
                    text: options.additional_instructions,
                    mode: 'comprehensive'
                }, actorId);
                inputSafetyScore = Math.min(inputSafetyScore, additionalSafety.score);
                if (!additionalSafety.safe && safetyMode === 'strict') {
                    throw new Error(`Additional instructions failed safety check: ${additionalSafety.violations.map(v => v.type).join(', ')}`);
                }
                if (additionalSafety.score < 0.8) {
                    const constitutionalResult = await safety_service_1.safetyService.applyConstitutionalPrinciples({
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
            await audit_service_1.auditService.logAction({
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
        }
        catch (error) {
            await audit_service_1.auditService.logAction({
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
    async monitorSafeRun(threadId, runId, actorId) {
        try {
            // Poll for completion
            let run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
            while (run.status === 'queued' || run.status === 'in_progress') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
            }
            let outputSafetyScore;
            const safetyViolations = [];
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
                            .map(c => c.text.value)
                            .join('\n');
                        const outputSafety = await safety_service_1.safetyService.analyzeText({
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
            await audit_service_1.auditService.logAction({
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
        }
        catch (error) {
            await audit_service_1.auditService.logAction({
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
    async listSafeAssistants(options = {}) {
        const assistants = await this.openai.beta.assistants.list(options);
        const safeAssistants = assistants.data
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
    async deleteSafeAssistant(assistantId, actorId) {
        try {
            const result = await this.openai.beta.assistants.del(assistantId);
            await audit_service_1.auditService.logAction({
                userId: actorId,
                action: 'safe_assistant_deleted',
                status: 'success',
                details: { assistantId }
            });
            return result;
        }
        catch (error) {
            await audit_service_1.auditService.logAction({
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
exports.SafeOpenAIAgentsSDK = SafeOpenAIAgentsSDK;
// Export a default instance
exports.safeOpenAIAgents = new SafeOpenAIAgentsSDK(process.env.OPENAI_API_KEY || '', {
    safety_mode: 'balanced',
    constitutional_principles: ['harmlessness', 'helpfulness', 'honesty', 'privacy_protection']
});
//# sourceMappingURL=openai-agents-sdk.js.map