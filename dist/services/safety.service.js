"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyService = exports.SafetyService = void 0;
const types_1 = require("../models/types");
const analyzer_1 = require("../safety/analyzer");
const constitutional_1 = require("../safety/constitutional");
const audit_service_1 = require("./audit.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const policy_service_1 = require("./policy.service");
class SafetyService {
    safetyAnalyzer;
    constitutionalAI;
    constructor() {
        this.safetyAnalyzer = new analyzer_1.SafetyAnalyzer();
        this.constitutionalAI = new constitutional_1.ConstitutionalAI();
    }
    async analyzeText(params, actorId) {
        const { text, context, policy_id } = params;
        let appliedPolicy = null;
        let analysisResult;
        try {
            analysisResult = await this.safetyAnalyzer.analyze(text, context);
            // Apply dynamic policy if specified
            if (policy_id) {
                appliedPolicy = await policy_service_1.policyService.getActivePolicyById(policy_id);
                if (appliedPolicy) {
                    analysisResult = this.applySafetyPolicy(text, analysisResult, appliedPolicy);
                    analysisResult.metadata.policyVersion = `${appliedPolicy.name} v${appliedPolicy.version}`;
                }
                else {
                    logger_1.logger.warn(`Policy ID ${policy_id} specified but not found or not active. Using default analysis.`);
                }
            }
            await audit_service_1.auditService.logAction({
                userId: actorId,
                serviceName: 'SafetyService',
                action: 'analyze_text',
                details: { textLength: text.length, contextProvided: !!context, policyId: policy_id, violations: analysisResult.violations.length, score: analysisResult.score },
                resourceId: policy_id, // could be a hash of the text if we store analyses
                status: 'success',
            });
            return analysisResult;
        }
        catch (error) {
            logger_1.logger.error('Text analysis failed in SafetyService', { error, textLength: text.length });
            await audit_service_1.auditService.logAction({
                userId: actorId,
                serviceName: 'SafetyService',
                action: 'analyze_text',
                details: { textLength: text.length },
                status: 'failure',
                errorMessage: error.message,
            });
            throw new errors_1.AppError(500, 'Text analysis failed');
        }
    }
    applySafetyPolicy(text, currentAnalysis, policy) {
        const policyViolations = [];
        for (const rule of policy.rules) {
            let ruleTriggered = false;
            // Evaluate rule condition (simplified example, real implementation would be more complex)
            if (rule.condition.type === 'regex' && rule.condition.parameters.pattern) {
                const regex = new RegExp(rule.condition.parameters.pattern, 'gi');
                if (regex.test(text)) {
                    ruleTriggered = true;
                }
            }
            else if (rule.condition.type === 'keyword_list' && Array.isArray(rule.condition.parameters.keywords)) {
                const keywords = rule.condition.parameters.keywords;
                if (keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
                    ruleTriggered = true;
                }
            }
            // Add more condition types: semantic_similarity, model_threshold, script...
            if (ruleTriggered) {
                // For 'block' action, we might want to override the 'safe' status
                if (rule.action === types_1.PolicyAction.BLOCK) {
                    currentAnalysis.safe = false;
                }
                policyViolations.push({
                    type: rule.violationType,
                    severity: rule.severity,
                    description: rule.description,
                    confidence: rule.condition.parameters.confidence || 0.9, // Confidence from policy or default
                    evidence: [text.substring(0, 100)], // Placeholder evidence
                    policySource: `${policy.name} v${policy.version} (Rule ID: ${rule.id})`,
                });
            }
        }
        // Merge policy violations with existing ones, potentially deduplicating
        // For simplicity, just adding them. A more robust merge/override logic might be needed.
        currentAnalysis.violations.push(...policyViolations);
        // Recalculate score if new violations are added or safety status changed
        currentAnalysis.score = this.safetyAnalyzer['calculateSafetyScore'](currentAnalysis.violations); // Access private method if needed or make it public/protected
        return currentAnalysis;
    }
    async applyConstitutionalPrinciples(params, actorId) {
        const { text, principles, max_revisions } = params;
        try {
            const result = await this.constitutionalAI.applyConstitutional(text, principles, max_revisions);
            await audit_service_1.auditService.logAction({
                userId: actorId,
                serviceName: 'SafetyService',
                action: 'apply_constitutional_ai',
                details: { textLength: text.length, revisions: result.revisionCount, principlesUsed: result.principles.length },
                status: 'success',
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Constitutional AI application failed in SafetyService', { error, textLength: text.length });
            await audit_service_1.auditService.logAction({
                userId: actorId,
                serviceName: 'SafetyService',
                action: 'apply_constitutional_ai',
                details: { textLength: text.length },
                status: 'failure',
                errorMessage: error.message,
            });
            throw new errors_1.AppError(500, 'Constitutional AI application failed');
        }
    }
}
exports.SafetyService = SafetyService;
exports.safetyService = new SafetyService();
//# sourceMappingURL=safety.service.js.map