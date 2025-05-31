"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogFilterSchema = exports.SafetyPolicySchema = exports.PolicyRuleSchema = exports.ApiKeyRequestSchema = exports.UserUpdateSchema = exports.UserLoginSchema = exports.UserRegistrationSchema = exports.ExperimentUpdateSchema = exports.ResearchExperimentSchema = exports.ConstitutionalAIRequestSchema = exports.SafetyAnalysisRequestSchema = exports.ChatRequestSchema = exports.MessageSchema = exports.SafetyMode = exports.ViolationType = exports.UserRole = void 0;
const zod_1 = require("zod");
const types_1 = require("./types"); // Remove unused User import
// Export the types for other modules to use
var types_2 = require("./types");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return types_2.UserRole; } });
Object.defineProperty(exports, "ViolationType", { enumerable: true, get: function () { return types_2.ViolationType; } });
Object.defineProperty(exports, "SafetyMode", { enumerable: true, get: function () { return types_2.SafetyMode; } });
// --- Chat Schemas ---
exports.MessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['system', 'user', 'assistant', 'tool']),
    content: zod_1.z.string().nullable(), // Content can be null for some tool calls
    name: zod_1.z.string().optional(), // For tool calls/responses
    tool_calls: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.literal('function'),
        function: zod_1.z.object({
            name: zod_1.z.string(),
            arguments: zod_1.z.string(), // JSON string
        }),
    })).optional(),
    tool_call_id: zod_1.z.string().optional(),
});
exports.ChatRequestSchema = zod_1.z.object({
    model: zod_1.z.string().default('gpt-4-turbo'),
    messages: zod_1.z.array(zod_1.z.object({
        role: zod_1.z.enum(['system', 'user', 'assistant', 'tool']),
        content: zod_1.z.string().nullable(),
        name: zod_1.z.string().optional(),
        tool_calls: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.literal('function'),
            function: zod_1.z.object({
                name: zod_1.z.string(),
                arguments: zod_1.z.string(),
            }),
        })).optional(),
        tool_call_id: zod_1.z.string().optional(),
    })).min(1),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    max_tokens: zod_1.z.number().positive().optional(),
    stream: zod_1.z.boolean().optional().default(false),
    safety_mode: zod_1.z.nativeEnum(types_1.SafetyMode).default(types_1.SafetyMode.Balanced),
    user_id: zod_1.z.string().uuid().optional(), // For tracking and personalized safety
    tools: zod_1.z.array(zod_1.z.any()).optional(), // Define more strictly if needed
    tool_choice: zod_1.z.union([zod_1.z.literal('none'), zod_1.z.literal('auto'), zod_1.z.object({
            type: zod_1.z.literal('function'),
            function: zod_1.z.object({ name: zod_1.z.string() }),
        })]).optional(),
    custom_policy_id: zod_1.z.string().optional(), // Allow users to specify a custom policy
});
// --- Safety Schemas ---
exports.SafetyAnalysisRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1).max(100000, "Text exceeds maximum length of 100,000 characters"),
    context: zod_1.z.string().optional(),
    mode: zod_1.z.enum(['comprehensive', 'fast', 'deep', 'custom']).default('comprehensive'),
    include_interpretability: zod_1.z.boolean().default(false),
    policy_id: zod_1.z.string().optional(), // Apply a specific safety policy
    userId: zod_1.z.string().uuid().optional(),
});
exports.ConstitutionalAIRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1),
    principles: zod_1.z.array(zod_1.z.string()).optional(), // If not provided, use default principles
    max_revisions: zod_1.z.number().positive().default(3),
    target_audience: zod_1.z.string().optional(), // e.g., 'children', 'general'
    custom_instructions: zod_1.z.string().optional(), // Additional instructions for revision
});
// --- Research Schemas ---
exports.ResearchExperimentSchema = zod_1.z.object({
    hypothesis: zod_1.z.string().min(10, "Hypothesis must be at least 10 characters"),
    experiment_type: zod_1.z.enum(['safety_evaluation', 'alignment_tuning', 'interpretability_study', 'robustness_testing', 'bias_mitigation', 'red_teaming_simulation']),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
    dataset_id: zod_1.z.string().optional(), // Link to a dataset
    model_config: zod_1.z.record(zod_1.z.any()).optional(), // Configuration for the model to be used/tested
    resources: zod_1.z.object({
        gpu_hours: zod_1.z.number().positive().optional(),
        memory_gb: zod_1.z.number().positive().optional(),
        cpus: zod_1.z.number().positive().optional(),
    }).optional(),
    userId: zod_1.z.string().uuid(),
});
exports.ExperimentUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
    results: zod_1.z.record(zod_1.z.any()).optional(), // Simplified, actual results schema might be complex
    logs: zod_1.z.array(zod_1.z.string()).optional(),
});
// --- User Schemas ---
exports.UserRegistrationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    role: zod_1.z.nativeEnum(types_1.UserRole).optional().default(types_1.UserRole.USER),
});
exports.UserLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.UserUpdateSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    role: zod_1.z.nativeEnum(types_1.UserRole).optional(),
    settings: zod_1.z.record(zod_1.z.any()).optional(), // Define UserSettingsSchema if needed
});
exports.ApiKeyRequestSchema = zod_1.z.object({
    name: zod_1.z.string().optional().default('default-key'),
    expiresInDays: zod_1.z.number().positive().optional(), // Optional expiry
});
// --- Policy Engine Schemas ---
exports.PolicyRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string(),
    condition: zod_1.z.object({
        type: zod_1.z.enum(['regex', 'keyword_list', 'semantic_similarity', 'model_threshold', 'script']),
        parameters: zod_1.z.record(zod_1.z.any()),
    }),
    action: zod_1.z.enum(['block', 'flag', 'redact', 'revise', 'escalate', 'log_only']),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    violationType: zod_1.z.nativeEnum(types_1.ViolationType),
});
exports.SafetyPolicySchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(3),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string().default('1.0.0'),
    isActive: zod_1.z.boolean().default(true),
    rules: zod_1.z.array(exports.PolicyRuleSchema).min(1),
});
// --- Audit Log Schemas ---
exports.AuditLogFilterSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(),
    action: zod_1.z.string().optional(),
    resourceType: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().int().positive().optional().default(1),
    limit: zod_1.z.number().int().positive().max(100).optional().default(50),
});
//# sourceMappingURL=schemas.js.map