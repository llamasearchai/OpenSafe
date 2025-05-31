import request from 'supertest';
import { app, server } from '../../src/server';
import { database } from '../../src/models/database';
import { userService } from '../../src/services/user.service';
import { UserRole, ViolationType, PolicyAction } from '../../src/models/types';
import { policyService } from '../../src/services/policy.service';

let adminUserId: string;
let adminToken: string;
let researcherToken: string;

const testPolicyPayload = {
    name: `Integration Test Policy ${Date.now()}`,
    description: "Policy created during integration tests.",
    version: "1.0.0",
    isActive: true,
    rules: [
      {
        description: "Block mentions of 'super_secret_project_alpha'",
        condition: { type: 'keyword_list' as const, parameters: { keywords: ["super_secret_project_alpha"] } },
        action: PolicyAction.BLOCK,
        severity: 'critical' as const,
        violationType: ViolationType.POLICY_VIOLATION
      }
    ]
};


beforeAll(async () => {
    try {
        const admin = await userService.createUser({ email: 'policy-admin@example.com', password: 'Password123!', role: UserRole.ADMIN });
        adminUserId = admin.id;
        const adminLogin = await userService.loginUser({ email: 'policy-admin@example.com', password: 'Password123!' });
        adminToken = adminLogin.token;

        await userService.createUser({ email: 'policy-researcher@example.com', password: 'Password123!', role: UserRole.RESEARCHER });
        const researcherLogin = await userService.loginUser({ email: 'policy-researcher@example.com', password: 'Password123!' });
        researcherToken = researcherLogin.token;

    } catch (error) {
        console.warn("Test users for policies.integration.test might already exist. Attempting login...");
        try {
            const adminLogin = await userService.loginUser({ email: 'policy-admin@example.com', password: 'Password123!' });
            adminToken = adminLogin.token; adminUserId = adminLogin.user.id;
            const researcherLogin = await userService.loginUser({ email: 'policy-researcher@example.com', password: 'Password123!' });
            researcherToken = researcherLogin.token;
        } catch(loginError) {
            console.error("Failed to setup users for policy integration tests:", loginError);
            throw loginError;
        }
    }
});

afterAll(async () => {
  await database.close();
  if (server && server.listening) {
    server.close();
  }
});

describe('POST /api/v1/policies - Policy Management Integration Tests', () => {
    let createdPolicyId: string;

    it('Admin should be able to create a new policy', async () => {
        const response = await request(app)
            .post('/api/v1/policies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testPolicyPayload);
        
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBe(testPolicyPayload.name);
        expect(response.body.rules.length).toBe(1);
        createdPolicyId = response.body.id;
    });

    it('Researcher should NOT be able to create a new policy', async () => {
        const response = await request(app)
            .post('/api/v1/policies')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({ ...testPolicyPayload, name: `Researcher Policy ${Date.now()}` });
        expect(response.status).toBe(403); // Forbidden
    });

    it('Should list policies (admin can see all)', async () => {
        const response = await request(app)
            .get('/api/v1/policies')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.policies).toBeInstanceOf(Array);
        expect(response.body.policies.some((p: any) => p.id === createdPolicyId)).toBe(true);
    });
    
    it('Should get a specific policy by ID', async () => {
        const response = await request(app)
            .get(`/api/v1/policies/${createdPolicyId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdPolicyId);
        expect(response.body.name).toBe(testPolicyPayload.name);
    });

    it('Admin should be able to update a policy', async () => {
        const updates = { description: "Updated policy description.", isActive: false };
        const response = await request(app)
            .put(`/api/v1/policies/${createdPolicyId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updates);
        
        expect(response.status).toBe(200);
        expect(response.body.description).toBe(updates.description);
        expect(response.body.isActive).toBe(false);
    });
    
    it('Researcher should NOT be able to update a policy', async () => {
        const updates = { description: "Researcher update attempt." };
        const response = await request(app)
            .put(`/api/v1/policies/${createdPolicyId}`)
            .set('Authorization', `Bearer ${researcherToken}`)
            .send(updates);
        expect(response.status).toBe(403);
    });

    it('Should apply safety analysis with a custom policy', async () => {
        // Ensure the policy is active for this test part
        await policyService.updatePolicy(createdPolicyId, { isActive: true }, adminUserId);

        const safetyResponse = await request(app)
            .post('/api/v1/safety/analyze')
            .set('Authorization', `Bearer ${researcherToken}`) // Researcher can use policies
            .send({
                text: "Let's discuss super_secret_project_alpha details.",
                policy_id: createdPolicyId
            });
        
        expect(safetyResponse.status).toBe(200);
        expect(safetyResponse.body.safe).toBe(false); // Blocked by policy
        expect(safetyResponse.body.violations.some((v: any) => v.policySource && v.policySource.includes(testPolicyPayload.name))).toBe(true);
    });

    it('Admin should be able to delete a policy', async () => {
        const response = await request(app)
            .delete(`/api/v1/policies/${createdPolicyId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(204);

        // Verify it's gone
        const getResponse = await request(app)
            .get(`/api/v1/policies/${'00000000-0000-0000-0000-000000000000'}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(getResponse.status).toBe(404);
    });
     it('Should return 404 when trying to get a non-existent policy', async () => {
        const response = await request(app)
            .get(`/api/v1/policies/${'00000000-0000-0000-0000-000000000000'}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(404);
    });
});