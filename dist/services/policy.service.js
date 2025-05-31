"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = exports.PolicyService = void 0;
const types_1 = require("../models/types");
const uuid_1 = require("uuid");
// Simple AppError class
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
// Mock audit service
const auditService = {
    logAction: async (data) => {
        console.log('[AUDIT]', data);
    }
};
class PolicyService {
    policies = new Map();
    constructor() {
        // Initialize with default policies
        this.initializeDefaultPolicies();
    }
    initializeDefaultPolicies() {
        const defaultPolicy = {
            id: 'default-policy',
            name: 'Default Safety Policy',
            description: 'Basic safety rules for content filtering',
            version: 1,
            isActive: true,
            rules: [
                {
                    id: 'harmful-content-rule',
                    description: 'Block harmful content',
                    condition: {
                        type: 'keyword_list',
                        parameters: {
                            keywords: ['harm', 'violence', 'kill']
                        }
                    },
                    action: 'block',
                    severity: 'high',
                    violationType: types_1.ViolationType.HARMFUL_CONTENT
                },
                {
                    id: 'pii-detection-rule',
                    description: 'Flag potential PII',
                    condition: {
                        type: 'regex',
                        parameters: {
                            pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b'
                        }
                    },
                    action: 'flag',
                    severity: 'medium',
                    violationType: types_1.ViolationType.PII_DETECTED
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.policies.set(defaultPolicy.id, defaultPolicy);
    }
    async createPolicy(data, actorId) {
        const policy = {
            id: (0, uuid_1.v4)(),
            name: data.name,
            description: data.description,
            version: 1,
            isActive: data.isActive || false,
            rules: data.rules || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.policies.set(policy.id, policy);
        await auditService.logAction({
            userId: actorId,
            action: 'create_policy',
            details: { policyId: policy.id, name: policy.name }
        });
        return policy;
    }
    async getPolicyById(id) {
        return this.policies.get(id) || null;
    }
    async getActivePolicyById(id) {
        const policy = this.policies.get(id);
        return policy && policy.isActive ? policy : null;
    }
    async listPolicies(page = 1, limit = 10) {
        const allPolicies = Array.from(this.policies.values());
        const offset = (page - 1) * limit;
        const policies = allPolicies.slice(offset, offset + limit);
        return {
            policies,
            total: allPolicies.length
        };
    }
    async updatePolicy(id, updates, actorId) {
        const policy = this.policies.get(id);
        if (!policy) {
            throw new AppError(404, 'Policy not found');
        }
        const updatedPolicy = {
            ...policy,
            ...updates,
            id, // Ensure ID doesn't change
            updatedAt: new Date()
        };
        this.policies.set(id, updatedPolicy);
        await auditService.logAction({
            userId: actorId,
            action: 'update_policy',
            details: { policyId: id, updates: Object.keys(updates) }
        });
        return updatedPolicy;
    }
    async deletePolicy(id, actorId) {
        if (!this.policies.has(id)) {
            throw new AppError(404, 'Policy not found');
        }
        this.policies.delete(id);
        await auditService.logAction({
            userId: actorId,
            action: 'delete_policy',
            details: { policyId: id }
        });
    }
}
exports.PolicyService = PolicyService;
exports.policyService = new PolicyService();
// Add policy table to database.ts initializeDatabase
// In src/models/database.ts, add:
/*
    await database.query(`
      CREATE TABLE IF NOT EXISTS safety_policies (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        rules JSONB NOT NULL, -- Store rules as JSON array
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, version) -- Ensure name and version combination is unique
      )
    `);
    await database.query(`CREATE INDEX IF NOT EXISTS idx_safety_policies_name_version ON safety_policies(name, version);`);
    await database.query(`CREATE INDEX IF NOT EXISTS idx_safety_policies_is_active ON safety_policies(is_active);`);
*/
// Also call policyService.initializeDefaultPolicies() in src/services/index.ts initializeServices 
//# sourceMappingURL=policy.service.js.map