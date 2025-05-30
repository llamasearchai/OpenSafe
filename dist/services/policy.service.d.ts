import { SafetyPolicySchema, PolicyRuleSchema } from '../models/schemas';
import { z } from 'zod';
interface SafetyPolicyEntity extends z.infer<typeof SafetyPolicySchema> {
    id: string;
    created_at: Date;
    updated_at: Date;
    rules: PolicyRuleEntity[];
}
interface PolicyRuleEntity extends z.infer<typeof PolicyRuleSchema> {
    id: string;
}
export declare class PolicyService {
    createPolicy(data: z.infer<typeof SafetyPolicySchema>, actorId: string): Promise<SafetyPolicyEntity>;
    getPolicyById(id: string): Promise<SafetyPolicyEntity | null>;
    getActivePolicyById(id: string): Promise<SafetyPolicyEntity | null>;
    listPolicies(page?: number, limit?: number, isActive?: boolean): Promise<{
        policies: SafetyPolicyEntity[];
        total: number;
        pages: number;
    }>;
    updatePolicy(id: string, data: Partial<z.infer<typeof SafetyPolicySchema>>, actorId: string): Promise<SafetyPolicyEntity>;
    deletePolicy(id: string, actorId: string): Promise<void>;
    initializeDefaultPolicies(): Promise<void>;
}
export declare const policyService: PolicyService;
export {};
//# sourceMappingURL=policy.service.d.ts.map