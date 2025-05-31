import { PolicyService } from '../../src/services/policy.service';
import { ViolationType, PolicyAction } from '../../src/models/types';

// Mock console.log for audit service
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

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
  });

  describe('createPolicy', () => {
    it('should create a new policy successfully', async () => {
      const policy = await policyService.createPolicy(mockPolicyData, mockActorId);

      expect(policy.name).toBe(mockPolicyData.name);
      expect(policy.description).toBe(mockPolicyData.description);
      expect(policy.isActive).toBe(mockPolicyData.isActive);
      expect(policy.rules[0].description).toBe(mockPolicyData.rules[0].description);
      expect(policy.id).toBeDefined();
      expect(policy.createdAt).toBeInstanceOf(Date);
      expect(policy.updatedAt).toBeInstanceOf(Date);
      
      // Check audit log was called
      expect(console.log).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          userId: mockActorId,
          action: 'create_policy',
          details: expect.objectContaining({
            policyId: policy.id,
            name: policy.name
          })
        })
      );
    });

    it('should create multiple policies with unique IDs', async () => {
      const policy1 = await policyService.createPolicy(mockPolicyData, mockActorId);
      const policy2 = await policyService.createPolicy({
        ...mockPolicyData,
        name: "Test Policy 2"
      }, mockActorId);

      expect(policy1.id).not.toBe(policy2.id);
      expect(policy1.name).toBe("Test Policy");
      expect(policy2.name).toBe("Test Policy 2");
    });
  });

  describe('getPolicyById', () => {
    it('should return a policy if found', async () => {
      const createdPolicy = await policyService.createPolicy(mockPolicyData, mockActorId);
      
      const policy = await policyService.getPolicyById(createdPolicy.id);
      expect(policy).toEqual(createdPolicy);
      expect(policy?.name).toBe(mockPolicyData.name);
    });

    it('should return null if policy not found', async () => {
      const policy = await policyService.getPolicyById('non-existent-id');
      expect(policy).toBeNull();
    });
  });
  
  describe('initializeDefaultPolicies', () => {
    it('should create default policy on initialization', () => {
      // The constructor already calls initializeDefaultPolicies
      // Check that default policy exists
      const defaultPolicy = policyService.getPolicyById('default-policy');
      expect(defaultPolicy).toBeDefined();
    });

    it('should have default policy with correct structure', async () => {
      const defaultPolicy = await policyService.getPolicyById('default-policy');
      
      expect(defaultPolicy).not.toBeNull();
      expect(defaultPolicy?.name).toBe('Default Safety Policy');
      expect(defaultPolicy?.isActive).toBe(true);
      expect(defaultPolicy?.rules).toHaveLength(2);
      expect(defaultPolicy?.rules[0].violationType).toBe(ViolationType.HARMFUL_CONTENT);
      expect(defaultPolicy?.rules[1].violationType).toBe(ViolationType.PII_DETECTED);
    });
  });

  describe('listPolicies', () => {
    it('should list all policies with pagination', async () => {
      // Create additional policies
      await policyService.createPolicy(mockPolicyData, mockActorId);
      await policyService.createPolicy({
        ...mockPolicyData,
        name: "Test Policy 2"
      }, mockActorId);

      const result = await policyService.listPolicies(1, 10);
      
      expect(result.policies).toHaveLength(3); // Default + 2 created
      expect(result.total).toBe(3);
      expect(result.policies[0].name).toBe('Default Safety Policy');
    });

    it('should handle pagination correctly', async () => {
      // Create multiple policies
      for (let i = 0; i < 5; i++) {
        await policyService.createPolicy({
          ...mockPolicyData,
          name: `Test Policy ${i}`
        }, mockActorId);
      }

      const page1 = await policyService.listPolicies(1, 2);
      const page2 = await policyService.listPolicies(2, 2);
      
      expect(page1.policies).toHaveLength(2);
      expect(page2.policies).toHaveLength(2);
      expect(page1.total).toBe(6); // Default + 5 created
      expect(page2.total).toBe(6);
    });
  });

  describe('updatePolicy', () => {
    it('should update a policy successfully', async () => {
      const createdPolicy = await policyService.createPolicy(mockPolicyData, mockActorId);
      
      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updates = {
        description: "Updated description",
        isActive: false
      };

      const updatedPolicy = await policyService.updatePolicy(createdPolicy.id, updates, mockActorId);
      
      expect(updatedPolicy.description).toBe("Updated description");
      expect(updatedPolicy.isActive).toBe(false);
      expect(updatedPolicy.name).toBe(mockPolicyData.name); // Should remain unchanged
      expect(updatedPolicy.updatedAt.getTime()).toBeGreaterThanOrEqual(createdPolicy.updatedAt.getTime());
    });

    it('should throw error when updating non-existent policy', async () => {
      await expect(
        policyService.updatePolicy('non-existent-id', { description: "test" }, mockActorId)
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('deletePolicy', () => {
    it('should delete a policy successfully', async () => {
      const createdPolicy = await policyService.createPolicy(mockPolicyData, mockActorId);
      
      await policyService.deletePolicy(createdPolicy.id, mockActorId);
      
      const deletedPolicy = await policyService.getPolicyById(createdPolicy.id);
      expect(deletedPolicy).toBeNull();
    });

    it('should throw error when deleting non-existent policy', async () => {
      await expect(
        policyService.deletePolicy('non-existent-id', mockActorId)
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('getActivePolicyById', () => {
    it('should return active policy', async () => {
      const createdPolicy = await policyService.createPolicy({
        ...mockPolicyData,
        isActive: true
      }, mockActorId);
      
      const activePolicy = await policyService.getActivePolicyById(createdPolicy.id);
      expect(activePolicy).toEqual(createdPolicy);
    });

    it('should return null for inactive policy', async () => {
      const createdPolicy = await policyService.createPolicy({
        ...mockPolicyData,
        isActive: false
      }, mockActorId);
      
      const activePolicy = await policyService.getActivePolicyById(createdPolicy.id);
      expect(activePolicy).toBeNull();
    });

    it('should return null for non-existent policy', async () => {
      const activePolicy = await policyService.getActivePolicyById('non-existent-id');
      expect(activePolicy).toBeNull();
    });
  });
}); 