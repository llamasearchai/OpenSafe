import { z } from 'zod';
import { SafetyMode, UserRole, ViolationType } from './types';
export { UserRole, ViolationType, SafetyMode } from './types';
export declare const MessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant", "tool"]>;
    content: z.ZodNullable<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
            arguments: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            arguments: string;
        }, {
            name: string;
            arguments: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }, {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }>, "many">>;
    tool_call_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "user" | "system" | "assistant" | "tool";
    content: string | null;
    name?: string | undefined;
    tool_calls?: {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }[] | undefined;
    tool_call_id?: string | undefined;
}, {
    role: "user" | "system" | "assistant" | "tool";
    content: string | null;
    name?: string | undefined;
    tool_calls?: {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }[] | undefined;
    tool_call_id?: string | undefined;
}>;
export declare const ChatRequestSchema: z.ZodObject<{
    model: z.ZodDefault<z.ZodString>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant", "tool"]>;
        content: z.ZodNullable<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"function">;
            function: z.ZodObject<{
                name: z.ZodString;
                arguments: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                arguments: string;
            }, {
                name: string;
                arguments: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }, {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }>, "many">>;
        tool_call_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "system" | "assistant" | "tool";
        content: string | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }, {
        role: "user" | "system" | "assistant" | "tool";
        content: string | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }>, "many">;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    safety_mode: z.ZodDefault<z.ZodNativeEnum<typeof SafetyMode>>;
    user_id: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    tool_choice: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
        }, {
            name: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
        };
        type: "function";
    }, {
        function: {
            name: string;
        };
        type: "function";
    }>]>>;
    custom_policy_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: {
        role: "user" | "system" | "assistant" | "tool";
        content: string | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }[];
    stream: boolean;
    safety_mode: SafetyMode;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    user_id?: string | undefined;
    tools?: any[] | undefined;
    tool_choice?: "none" | "auto" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    custom_policy_id?: string | undefined;
}, {
    messages: {
        role: "user" | "system" | "assistant" | "tool";
        content: string | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }[];
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    stream?: boolean | undefined;
    safety_mode?: SafetyMode | undefined;
    user_id?: string | undefined;
    tools?: any[] | undefined;
    tool_choice?: "none" | "auto" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    custom_policy_id?: string | undefined;
}>;
export declare const SafetyAnalysisRequestSchema: z.ZodObject<{
    text: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
    mode: z.ZodDefault<z.ZodEnum<["comprehensive", "fast", "deep", "custom"]>>;
    include_interpretability: z.ZodDefault<z.ZodBoolean>;
    policy_id: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    mode: "custom" | "comprehensive" | "fast" | "deep";
    include_interpretability: boolean;
    userId?: string | undefined;
    context?: string | undefined;
    policy_id?: string | undefined;
}, {
    text: string;
    userId?: string | undefined;
    context?: string | undefined;
    mode?: "custom" | "comprehensive" | "fast" | "deep" | undefined;
    include_interpretability?: boolean | undefined;
    policy_id?: string | undefined;
}>;
export declare const ConstitutionalAIRequestSchema: z.ZodObject<{
    text: z.ZodString;
    principles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    max_revisions: z.ZodDefault<z.ZodNumber>;
    target_audience: z.ZodOptional<z.ZodString>;
    custom_instructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    max_revisions: number;
    principles?: string[] | undefined;
    target_audience?: string | undefined;
    custom_instructions?: string | undefined;
}, {
    text: string;
    principles?: string[] | undefined;
    max_revisions?: number | undefined;
    target_audience?: string | undefined;
    custom_instructions?: string | undefined;
}>;
export declare const ResearchExperimentSchema: z.ZodObject<{
    hypothesis: z.ZodString;
    experiment_type: z.ZodEnum<["safety_evaluation", "alignment_tuning", "interpretability_study", "robustness_testing", "bias_mitigation", "red_teaming_simulation"]>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    dataset_id: z.ZodOptional<z.ZodString>;
    model_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    resources: z.ZodOptional<z.ZodObject<{
        gpu_hours: z.ZodOptional<z.ZodNumber>;
        memory_gb: z.ZodOptional<z.ZodNumber>;
        cpus: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        gpu_hours?: number | undefined;
        memory_gb?: number | undefined;
        cpus?: number | undefined;
    }, {
        gpu_hours?: number | undefined;
        memory_gb?: number | undefined;
        cpus?: number | undefined;
    }>>;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    hypothesis: string;
    experiment_type: "safety_evaluation" | "alignment_tuning" | "interpretability_study" | "robustness_testing" | "bias_mitigation" | "red_teaming_simulation";
    parameters?: Record<string, any> | undefined;
    dataset_id?: string | undefined;
    model_config?: Record<string, any> | undefined;
    resources?: {
        gpu_hours?: number | undefined;
        memory_gb?: number | undefined;
        cpus?: number | undefined;
    } | undefined;
}, {
    userId: string;
    hypothesis: string;
    experiment_type: "safety_evaluation" | "alignment_tuning" | "interpretability_study" | "robustness_testing" | "bias_mitigation" | "red_teaming_simulation";
    parameters?: Record<string, any> | undefined;
    dataset_id?: string | undefined;
    model_config?: Record<string, any> | undefined;
    resources?: {
        gpu_hours?: number | undefined;
        memory_gb?: number | undefined;
        cpus?: number | undefined;
    } | undefined;
}>;
export declare const ExperimentUpdateSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "queued", "running", "completed", "failed", "cancelled"]>>;
    results: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "queued" | "running" | "completed" | "failed" | "cancelled" | undefined;
    results?: Record<string, any> | undefined;
    logs?: string[] | undefined;
}, {
    status?: "pending" | "queued" | "running" | "completed" | "failed" | "cancelled" | undefined;
    results?: Record<string, any> | undefined;
    logs?: string[] | undefined;
}>;
export declare const UserRegistrationSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    role: UserRole;
}, {
    email: string;
    password: string;
    role?: UserRole | undefined;
}>;
export declare const UserLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const UserUpdateSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    role?: UserRole | undefined;
    settings?: Record<string, any> | undefined;
}, {
    email?: string | undefined;
    role?: UserRole | undefined;
    settings?: Record<string, any> | undefined;
}>;
export declare const ApiKeyRequestSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    expiresInDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    expiresInDays?: number | undefined;
}, {
    name?: string | undefined;
    expiresInDays?: number | undefined;
}>;
export declare const PolicyRuleSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    condition: z.ZodObject<{
        type: z.ZodEnum<["regex", "keyword_list", "semantic_similarity", "model_threshold", "script"]>;
        parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
        parameters: Record<string, any>;
    }, {
        type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
        parameters: Record<string, any>;
    }>;
    action: z.ZodEnum<["block", "flag", "redact", "revise", "escalate", "log_only"]>;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    violationType: z.ZodNativeEnum<typeof ViolationType>;
}, "strip", z.ZodTypeAny, {
    action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
    description: string;
    condition: {
        type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
        parameters: Record<string, any>;
    };
    severity: "low" | "medium" | "high" | "critical";
    violationType: ViolationType;
    id?: string | undefined;
}, {
    action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
    description: string;
    condition: {
        type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
        parameters: Record<string, any>;
    };
    severity: "low" | "medium" | "high" | "critical";
    violationType: ViolationType;
    id?: string | undefined;
}>;
export declare const SafetyPolicySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    rules: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        condition: z.ZodObject<{
            type: z.ZodEnum<["regex", "keyword_list", "semantic_similarity", "model_threshold", "script"]>;
            parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        }, {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        }>;
        action: z.ZodEnum<["block", "flag", "redact", "revise", "escalate", "log_only"]>;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        violationType: z.ZodNativeEnum<typeof ViolationType>;
    }, "strip", z.ZodTypeAny, {
        action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
        description: string;
        condition: {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        };
        severity: "low" | "medium" | "high" | "critical";
        violationType: ViolationType;
        id?: string | undefined;
    }, {
        action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
        description: string;
        condition: {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        };
        severity: "low" | "medium" | "high" | "critical";
        violationType: ViolationType;
        id?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    name: string;
    version: string;
    rules: {
        action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
        description: string;
        condition: {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        };
        severity: "low" | "medium" | "high" | "critical";
        violationType: ViolationType;
        id?: string | undefined;
    }[];
    id?: string | undefined;
    description?: string | undefined;
}, {
    name: string;
    rules: {
        action: "block" | "flag" | "redact" | "revise" | "escalate" | "log_only";
        description: string;
        condition: {
            type: "regex" | "keyword_list" | "semantic_similarity" | "model_threshold" | "script";
            parameters: Record<string, any>;
        };
        severity: "low" | "medium" | "high" | "critical";
        violationType: ViolationType;
        id?: string | undefined;
    }[];
    id?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | undefined;
    version?: string | undefined;
}>;
export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
export declare const AuditLogFilterSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    resourceType: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    userId?: string | undefined;
    action?: string | undefined;
    resourceType?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: number | undefined;
    userId?: string | undefined;
    action?: string | undefined;
    resourceType?: string | undefined;
    page?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map