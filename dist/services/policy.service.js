"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = exports.PolicyService = void 0;
const database_1 = require("../models/database");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const uuid_1 = require("uuid");
const audit_service_1 = require("./audit.service");
class PolicyService {
    async createPolicy(data, actorId) {
        const policyId = (0, uuid_1.v4)();
        const rulesWithIds = data.rules.map(rule => ({ ...rule, id: (0, uuid_1.v4)() }));
        try {
            const result = await database_1.database.transaction(async (client) => {
                const policyRes = await client.query(`INSERT INTO safety_policies (id, name, description, version, is_active, rules)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, name, description, version, is_active, rules, created_at, updated_at`, [policyId, data.name, data.description, data.version, data.isActive, JSON.stringify(rulesWithIds)]);
                return policyRes.rows[0];
            });
            logger_1.logger.info('Safety policy created', { policyId: result.id, name: result.name });
            await audit_service_1.auditService.logAction({
                userId: actorId,
                action: 'policy_create',
                resourceType: 'safety_policy',
                resourceId: result.id,
                details: { name: data.name, ruleCount: data.rules.length },
                status: 'success',
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error creating safety policy', { error, name: data.name });
            if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
                throw new errors_1.AppError(409, `Policy with name "${data.name}" and version "${data.version}" might already exist.`);
            }
            throw new errors_1.AppError(500, 'Failed to create safety policy');
        }
    }
    async getPolicyById(id) {
        const result = await database_1.database.query(`SELECT id, name, description, version, is_active, rules, created_at, updated_at 
             FROM safety_policies WHERE id = $1`, [id]);
        if (result.length === 0)
            return null;
        return result[0];
    }
    async getActivePolicyById(id) {
        const result = await database_1.database.query(`SELECT id, name, description, version, is_active, rules, created_at, updated_at 
             FROM safety_policies WHERE id = $1 AND is_active = TRUE`, [id]);
        if (result.length === 0)
            return null;
        return result[0];
    }
    async listPolicies(page = 1, limit = 20, isActive) {
        const offset = (page - 1) * limit;
        let query = `SELECT id, name, description, version, is_active, created_at, updated_at FROM safety_policies`;
        let countQuery = `SELECT COUNT(*) as count FROM safety_policies`;
        const params = [];
        let paramIndex = 1;
        if (typeof isActive === 'boolean') {
            query += ` WHERE is_active = $${paramIndex}`;
            countQuery += ` WHERE is_active = $${paramIndex}`;
            params.push(isActive);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const [policiesResult, countResult] = await Promise.all([
            database_1.database.query(query, params), // Not fetching rules for list view for performance
            database_1.database.query(countQuery, params.slice(0, params.length - 2))
        ]);
        const total = parseInt(countResult[0].count, 10);
        // Cast to SafetyPolicyEntity[], potentially fetching rules if needed or adjusting type
        return { policies: policiesResult, total, pages: Math.ceil(total / limit) };
    }
    async updatePolicy(id, data, actorId) {
        const existingPolicy = await this.getPolicyById(id);
        if (!existingPolicy)
            throw new errors_1.AppError(404, 'Safety policy not found');
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = $${paramIndex++}`);
                values.push(key === 'rules' ? JSON.stringify(value.map(rule => ({ ...rule, id: rule.id || (0, uuid_1.v4)() }))) : value);
            }
        });
        if (updateFields.length === 0) {
            return existingPolicy; // No changes
        }
        values.push(id);
        const query = `UPDATE safety_policies SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}
                       RETURNING id, name, description, version, is_active, rules, created_at, updated_at`;
        try {
            const result = await database_1.database.query(query, values);
            const updatedPolicy = result[0];
            logger_1.logger.info('Safety policy updated', { policyId: id });
            await audit_service_1.auditService.logAction({
                userId: actorId,
                action: 'policy_update',
                resourceType: 'safety_policy',
                resourceId: id,
                details: { changes: Object.keys(data) },
                status: 'success',
            });
            return updatedPolicy;
        }
        catch (error) {
            logger_1.logger.error('Error updating safety policy', { error, policyId: id });
            throw new errors_1.AppError(500, 'Failed to update safety policy');
        }
    }
    async deletePolicy(id, actorId) {
        const result = await database_1.database.query('DELETE FROM safety_policies WHERE id = $1 RETURNING id', [id]);
        if (result.length === 0) {
            throw new errors_1.AppError(404, 'Safety policy not found');
        }
        logger_1.logger.info('Safety policy deleted', { policyId: id });
        await audit_service_1.auditService.logAction({
            userId: actorId,
            action: 'policy_delete',
            resourceType: 'safety_policy',
            resourceId: id,
            status: 'success',
        });
    }
    // Method to initialize default policies if DB table for policies is empty
    async initializeDefaultPolicies() {
        const countResult = await database_1.database.query("SELECT COUNT(*) FROM safety_policies");
        if (parseInt(countResult[0].count) === 0) {
            logger_1.logger.info("No safety policies found. Initializing default basic policy.");
            const defaultPolicy = {
                name: "Default Basic Safety Policy",
                description: "A baseline policy covering common harmful content and PII.",
                version: "1.0.0",
                isActive: true,
                rules: [
                    {
                        description: "Block severe harmful content keywords.",
                        condition: { type: 'keyword_list', parameters: { keywords: ["kill", "murder", "bomb", "terrorist"] } },
                        action: 'block',
                        severity: 'critical',
                        violationType: ViolationType.HARMFUL_CONTENT
                    },
                    {
                        description: "Flag potential PII (SSN as example).",
                        condition: { type: 'regex', parameters: { pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" } },
                        action: 'flag',
                        severity: 'high',
                        violationType: ViolationType.PII_DETECTED
                    }
                ]
            };
            // Use a system/admin ID for actorId or null if contextually appropriate
            await this.createPolicy(defaultPolicy, 'system-init');
        }
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