import { ViolationType } from '../models/types';
export interface PolicyRule {
    id?: string;
    description: string;
    condition: {
        type: 'regex' | 'keyword_list' | 'semantic_similarity' | 'model_threshold' | 'script';
        parameters: Record<string, any>;
    };
    action: 'block' | 'flag' | 'redact' | 'revise' | 'escalate' | 'log_only';
    severity: 'low' | 'medium' | 'high' | 'critical';
    violationType: ViolationType;
}
export interface SafetyPolicy {
    id: string;
    name: string;
    description: string;
    version: number;
    isActive: boolean;
    rules: PolicyRule[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class PolicyService {
    private policies;
    constructor();
    initializeDefaultPolicies(): void;
    createPolicy(data: any, actorId: string): Promise<SafetyPolicy>;
    getPolicyById(id: string): Promise<SafetyPolicy | null>;
    getActivePolicyById(id: string): Promise<SafetyPolicy | null>;
    listPolicies(page?: number, limit?: number): Promise<{
        policies: SafetyPolicy[];
        total: number;
    }>;
    updatePolicy(id: string, updates: Partial<SafetyPolicy>, actorId: string): Promise<SafetyPolicy>;
    deletePolicy(id: string, actorId: string): Promise<void>;
}
export declare const policyService: PolicyService;
//# sourceMappingURL=policy.service.d.ts.map