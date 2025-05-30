import { z } from 'zod';
import { SafetyMode, UserRole, ViolationType } from './types'; // Remove unused User import

// Export the types for other modules to use
export { UserRole, ViolationType, SafetyMode } from './types';

// --- Chat Schemas ---
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().nullable(), // Content can be null for some tool calls
  name: z.string().optional(), // For tool calls/responses
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(), // JSON string
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  model: z.string().default('gpt-4-turbo'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string().nullable(),
    name: z.string().optional(),
    tool_calls: z.array(z.object({
      id: z.string(),
      type: z.literal('function'),
      function: z.object({
        name: z.string(),
        arguments: z.string(),
      }),
    })).optional(),
    tool_call_id: z.string().optional(),
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  stream: z.boolean().optional().default(false),
  safety_mode: z.nativeEnum(SafetyMode).default(SafetyMode.Balanced),
  user_id: z.string().uuid().optional(), // For tracking and personalized safety
  tools: z.array(z.any()).optional(), // Define more strictly if needed
  tool_choice: z.union([z.literal('none'), z.literal('auto'), z.object({
    type: z.literal('function'),
    function: z.object({ name: z.string() }),
  })]).optional(),
  custom_policy_id: z.string().optional(), // Allow users to specify a custom policy
});

// --- Safety Schemas ---
export const SafetyAnalysisRequestSchema = z.object({
  text: z.string().min(1).max(100000, "Text exceeds maximum length of 100,000 characters"),
  context: z.string().optional(),
  mode: z.enum(['comprehensive', 'fast', 'deep', 'custom']).default('comprehensive'),
  include_interpretability: z.boolean().default(false),
  policy_id: z.string().optional(), // Apply a specific safety policy
  userId: z.string().uuid().optional(),
});

export const ConstitutionalAIRequestSchema = z.object({
  text: z.string().min(1),
  principles: z.array(z.string()).optional(), // If not provided, use default principles
  max_revisions: z.number().positive().default(3),
  target_audience: z.string().optional(), // e.g., 'children', 'general'
  custom_instructions: z.string().optional(), // Additional instructions for revision
});

// --- Research Schemas ---
export const ResearchExperimentSchema = z.object({
  hypothesis: z.string().min(10, "Hypothesis must be at least 10 characters"),
  experiment_type: z.enum(['safety_evaluation', 'alignment_tuning', 'interpretability_study', 'robustness_testing', 'bias_mitigation', 'red_teaming_simulation']),
  parameters: z.record(z.any()).optional(),
  dataset_id: z.string().optional(), // Link to a dataset
  model_config: z.record(z.any()).optional(), // Configuration for the model to be used/tested
  resources: z.object({
    gpu_hours: z.number().positive().optional(),
    memory_gb: z.number().positive().optional(),
    cpus: z.number().positive().optional(),
  }).optional(),
  userId: z.string().uuid(),
});

export const ExperimentUpdateSchema = z.object({
  status: z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  results: z.record(z.any()).optional(), // Simplified, actual results schema might be complex
  logs: z.array(z.string()).optional(),
});


// --- User Schemas ---
export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  settings: z.record(z.any()).optional(), // Define UserSettingsSchema if needed
});

export const ApiKeyRequestSchema = z.object({
  name: z.string().optional().default('default-key'),
  expiresInDays: z.number().positive().optional(), // Optional expiry
});


// --- Policy Engine Schemas ---
export const PolicyRuleSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string(),
  condition: z.object({
    type: z.enum(['regex', 'keyword_list', 'semantic_similarity', 'model_threshold', 'script']),
    parameters: z.record(z.any()),
  }),
  action: z.enum(['block', 'flag', 'redact', 'revise', 'escalate', 'log_only']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  violationType: z.nativeEnum(ViolationType),
});

export const SafetyPolicySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  isActive: z.boolean().default(true),
  rules: z.array(PolicyRuleSchema).min(1),
});

// Export the inferred types
export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

// --- Audit Log Schemas ---
export const AuditLogFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
}); 