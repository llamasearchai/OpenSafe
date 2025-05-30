export interface SafetyAnalysisResult {
    safe: boolean;
    score: number;
    violations: SafetyViolation[];
    metadata: {
        analysisTime: number;
        modelVersion: string;
        timestamp: string;
        policyVersion?: string;
    };
}
export interface SafetyViolation {
    type: ViolationType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string[];
    confidence: number;
    remediation?: string;
    policySource?: string;
}
export declare enum ViolationType {
    HARMFUL_CONTENT = "harmful_content",
    BIAS = "bias",
    PRIVACY = "privacy",
    PII_DETECTED = "pii_detected",
    MISINFORMATION = "misinformation",
    MANIPULATION = "manipulation",
    ILLEGAL_CONTENT = "illegal_content",
    PROFANITY = "profanity",
    SELF_HARM = "self_harm",
    HATE_SPEECH = "hate_speech",
    POLICY_VIOLATION = "policy_violation"
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
    severity: number;
}
export interface ResearchExperiment {
    id: string;
    userId?: string;
    hypothesis: string;
    methodology: string;
    parameters: Record<string, any>;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    results?: ExperimentResults;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    logs?: string[];
}
export interface ExperimentResults {
    metrics: Record<string, number | string>;
    artifacts: string[];
    conclusions: string;
    nextSteps: string[];
    error?: string;
}
export interface InterpretabilityAnalysis {
    modelName?: string;
    text?: string;
    tokens?: string[];
    activations?: number[][];
    attentionWeights?: any;
    featureImportance?: Record<string, number>;
    neuronExplanations?: NeuronExplanation[];
    saliencyMaps?: any;
}
export interface NeuronExplanation {
    layer: number;
    neuron: number;
    concept?: string;
    activationStrength: number;
    examples?: string[];
}
export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    apiKey?: string;
    settings?: UserSettings;
}
export declare enum UserRole {
    USER = "user",
    RESEARCHER = "researcher",
    ADMIN = "admin",
    SERVICE = "service"
}
export interface UserSettings {
    defaultSafetyMode?: SafetyMode;
    preferredLanguage?: string;
}
export declare enum SafetyMode {
    Strict = "strict",
    Balanced = "balanced",
    Permissive = "permissive"
}
export interface AuditLogEntry {
    id: string;
    userId?: string;
    serviceName?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    status: 'success' | 'failure';
    errorMessage?: string;
}
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
    condition: PolicyCondition;
    action: PolicyAction;
    severity: 'low' | 'medium' | 'high' | 'critical';
    violationType: ViolationType;
}
export interface PolicyCondition {
    type: 'regex' | 'keyword_list' | 'semantic_similarity' | 'model_threshold';
    parameters: Record<string, any>;
}
export declare enum PolicyAction {
    BLOCK = "block",
    FLAG = "flag",
    REDACT = "redact",
    REVISE = "revise",// Trigger constitutional AI
    ESCALATE = "escalate",// Notify admin
    LOG_ONLY = "log_only"
}
//# sourceMappingURL=types.d.ts.map