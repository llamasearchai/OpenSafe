export interface SafetyAnalysisResult {
  safe: boolean;
  score: number;
  violations: SafetyViolation[];
  metadata: {
    analysisTime: number;
    modelVersion: string;
    timestamp: string;
    policyVersion?: string; // For dynamic policy engine
  };
}

export interface SafetyViolation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[]; // Snippets of text that caused the violation
  confidence: number;
  remediation?: string; // Suggested way to fix
  policySource?: string; // Which policy identified this
}

export enum ViolationType {
  HARMFUL_CONTENT = 'harmful_content',
  BIAS = 'bias',
  PRIVACY = 'privacy',
  PII_DETECTED = 'pii_detected',
  MISINFORMATION = 'misinformation',
  MANIPULATION = 'manipulation',
  ILLEGAL_CONTENT = 'illegal_content',
  PROFANITY = 'profanity',
  SELF_HARM = 'self_harm',
  HATE_SPEECH = 'hate_speech',
  POLICY_VIOLATION = 'policy_violation', // Generic policy violation
}

export interface ConstitutionalAIResult {
  original: string;
  revised: string;
  critiques: Critique[];
  revisionCount: number;
  principles: string[];
  appliedSuccessfully: boolean;
}

export interface Critique {
  principle: string;
  violation: string;
  suggestion: string;
  severity: number; // 1-10 scale
}

export interface ResearchExperiment {
  id: string;
  userId?: string; // Link to user who created it
  hypothesis: string;
  methodology: string;
  parameters: Record<string, any>;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  results?: ExperimentResults;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  logs?: string[]; // Store logs or links to logs
}

export interface ExperimentResults {
  metrics: Record<string, number | string>; // Allow string for qualitative metrics
  artifacts: string[]; // Paths to generated files, models, etc.
  conclusions: string;
  nextSteps: string[];
  error?: string; // If experiment failed
}

export interface InterpretabilityAnalysis {
  modelName?: string;
  text?: string;
  tokens?: string[];
  activations?: number[][]; // Layer-wise or token-wise activations
  attentionWeights?: any; // Can be complex, e.g., per head/layer
  featureImportance?: Record<string, number>; // For specific features/tokens
  neuronExplanations?: NeuronExplanation[];
  saliencyMaps?: any; // For vision or other modalities if extended
}

export interface NeuronExplanation {
  layer: number;
  neuron: number;
  concept?: string; // Learned concept by the neuron
  activationStrength: number;
  examples?: string[]; // Text snippets that strongly activate this neuron
}

// User and Auth Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  apiKey?: string; // For API access
  settings?: UserSettings;
}

export enum UserRole {
  USER = 'user',
  RESEARCHER = 'researcher',
  ADMIN = 'admin',
  SERVICE = 'service', // For machine-to-machine communication
}

export interface UserSettings {
  defaultSafetyMode?: SafetyMode;
  preferredLanguage?: string;
}

export enum SafetyMode {
  Strict = "strict",
  Balanced = "balanced", 
  Permissive = "permissive"
}

// Audit Log Types
export interface AuditLogEntry {
  id: string;
  userId?: string;
  serviceName?: string; // e.g., 'SafetyService', 'ChatAPI'
  action: string; // e.g., 'analyze_text', 'create_completion', 'login_user'
  resourceType?: string; // e.g., 'experiment', 'user_settings'
  resourceId?: string;
  details?: Record<string, any>; // Contextual details of the action
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  status: 'success' | 'failure';
  errorMessage?: string;
}

// Policy Engine Types
export interface SafetyPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  rules: PolicyRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  id: string;
  description: string;
  condition: PolicyCondition; // Could be a string for a DSL or a structured object
  action: PolicyAction; // e.g., 'block', 'flag', 'redact', 'escalate'
  severity: 'low' | 'medium' | 'high' | 'critical';
  violationType: ViolationType;
}

export interface PolicyCondition {
  type: 'regex' | 'keyword_list' | 'semantic_similarity' | 'model_threshold';
  parameters: Record<string, any>; // e.g., pattern for regex, list of keywords
}

export enum PolicyAction {
  BLOCK = 'block',
  FLAG = 'flag',
  REDACT = 'redact',
  REVISE = 'revise', // Trigger constitutional AI
  ESCALATE = 'escalate', // Notify admin
  LOG_ONLY = 'log_only',
} 