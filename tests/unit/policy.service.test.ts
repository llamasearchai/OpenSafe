import { PolicyService } from '../../src/services/policy.service';
import { database } from '../../src/models/database';
import { auditService } from '../../src/services/audit.service';
import { AppError } from '../../src/utils/errors';
import { ViolationType, PolicyAction } from '../../src/models/types';

jest.mock('../../src/models/database');
jest.mock('../../src/services/audit.service');

describe('PolicyService', () => {
  let policyService: PolicyService;
  const mockActorId = 'admin-user-id';
  const mockPolicyData = {
    name: "Test Policy",
    description: "A policy for testing",
    version: "1.0",
    isActive: true,
    rules: [
      {
        description: "Block bad words",
        condition: { type: 'keyword_list' as const, parameters: { keywords: ["bad", "word"] } },
        action: PolicyAction.BLOCK,
        severity: 'high' as const,
        violationType: ViolationType.HARMFUL_CONTENT
      }
    ]
  };

  beforeEach(() => {
    policyService = new PolicyService();
    jest.clearAllMocks();
    // Mock database.transaction to call the callback directly
    (database.transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
        const mockClient = { query: jest.fn() };
        // Simulate policy creation within transaction
        mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockPolicyData, id: 'policy-uuid-123', created_at: new Date(), updated_at: new Date() }]});
        return callback(mockClient);
    });
  });

  describe('createPolicy', () => {
    it('should create a new policy successfully', async () => {
      const policy = await policyService.createPolicy(mockPolicyData, mockActorId);

      expect(database.transaction).toHaveBeenCalled();
      // Inside the transaction, client.query would be called
      // This is a bit harder to assert directly without deeper mocking of the client
      expect(policy.name).toBe(mockPolicyData.name);
      expect(policy.rules[0].description).toBe(mockPolicyData.rules[0].description);
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
        action: 'policy_create',
        resourceId: policy.id
      }));
    });

    it('should throw an error if policy creation fails in DB (e.g. duplicate)', async () => {
        (database.transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
            const mockClient = { query: jest.fn() };
            mockClient.query.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
            return callback(mockClient);
        });

        await expect(policyService.createPolicy(mockPolicyData, mockActorId))
            .rejects
            .toThrow(new AppError(409, `Policy with name "${mockPolicyData.name}" and version "${mockPolicyData.version}" might already exist.`));
    });
  });

  describe('getPolicyById', () => {
    it('should return a policy if found', async () => {
      const dbPolicy = { ...mockPolicyData, id: 'policy-uuid-123', created_at: new Date(), updated_at: new Date() };
      (database.query as jest.Mock).mockResolvedValueOnce([dbPolicy]);

      const policy = await policyService.getPolicyById('policy-uuid-123');
      expect(policy).toEqual(dbPolicy);
      expect(database.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), ['policy-uuid-123']);
    });

    it('should return null if policy not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([]);
      const policy = await policyService.getPolicyById('non-existent-id');
      expect(policy).toBeNull();
    });
  });
  
  describe('initializeDefaultPolicies', () => {
    it('should create default policy if no policies exist', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([{ count: "0" }]); // No policies
      // Mock the createPolicy call within initializeDefaultPolicies
      const createPolicySpy = jest.spyOn(policyService, 'createPolicy').mockResolvedValueOnce(undefined as any); 
      
      await policyService.initializeDefaultPolicies();
      
      expect(database.query).toHaveBeenCalledWith(expect.stringContaining("SELECT COUNT(*) FROM safety_policies"));
      expect(createPolicySpy).toHaveBeenCalled();
      createPolicySpy.mockRestore();
    });

    it('should not create default policy if policies already exist', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([{ count: "1" }]); // Policies exist
      const createPolicySpy = jest.spyOn(policyService, 'createPolicy');
      
      await policyService.initializeDefaultPolicies();
      
      expect(createPolicySpy).not.toHaveBeenCalled();
      createPolicySpy.mockRestore();
    });
  });

  // Add more tests for listPolicies, updatePolicy, deletePolicy
}); 