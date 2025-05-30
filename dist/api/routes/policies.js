"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policy_service_1 = require("../../services/policy.service");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errors_1 = require("../../utils/errors");
const schemas_1 = require("../../models/schemas");
const types_1 = require("../../models/types");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER])); // Admins and Researchers can manage policies
const PolicyIdParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid("Invalid policy ID format") });
const PolicyListQuerySchema = zod_1.z.object({
    page: zod_1.z.preprocess(val => Number(val), zod_1.z.number().int().positive().optional().default(1)),
    limit: zod_1.z.preprocess(val => Number(val), zod_1.z.number().int().positive().max(100).optional().default(20)),
    isActive: zod_1.z.preprocess(val => val === 'true' ? true : (val === 'false' ? false : undefined), zod_1.z.boolean().optional()),
});
const PolicySuggestionRequestSchema = zod_1.z.object({
    description: zod_1.z.string().min(10, "Description must be at least 10 characters."),
    context: zod_1.z.string().optional(),
    targetViolationType: zod_1.z.nativeEnum(ViolationType).optional(),
});
router.post('/', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), (0, validation_1.validateBody)(schemas_1.SafetyPolicySchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const policy = await policy_service_1.policyService.createPolicy(req.body, req.user.id);
    res.status(201).json(policy);
}));
router.post('/suggest-rule', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateBody)(PolicySuggestionRequestSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const { description, context, targetViolationType } = req.body;
    if (!req.user?.id)
        throw new errors_1.AppError(500, "Authenticated user ID missing");
    let suggestedRule = {
        description: `Suggested rule for: "${description}"`,
        condition: { type: 'keyword_list', parameters: { keywords: ["example", "suggested"] } },
        action: PolicyAction.FLAG,
        severity: 'medium',
        violationType: targetViolationType || ViolationType.POLICY_VIOLATION,
        confidence: 0.75,
        notes: "This is an AI-generated suggestion. Please review and refine before activating."
    };
    if (description.toLowerCase().includes("block urgent") || context?.toLowerCase().includes("critical")) {
        suggestedRule.action = PolicyAction.BLOCK;
        suggestedRule.severity = 'critical';
        suggestedRule.condition = { type: 'regex', parameters: { pattern: "(?i)(urgent|critical|immediate action)" } };
    }
    else if (description.toLowerCase().includes("pii") || description.toLowerCase().includes("personal info")) {
        suggestedRule.violationType = ViolationType.PII_DETECTED;
        suggestedRule.condition = { type: 'regex', parameters: { pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b|\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b" } };
        suggestedRule.action = PolicyAction.REDACT;
        suggestedRule.severity = 'high';
    }
    await auditService.logAction({
        userId: req.user.id,
        action: 'policy_rule_suggest',
        resourceType: 'safety_policy_suggestion',
        details: { requestDescription: description, suggestedAction: suggestedRule.action },
        status: 'success',
    });
    res.json({ suggestion: suggestedRule });
}));
exports.default = router;
//# sourceMappingURL=policies.js.map