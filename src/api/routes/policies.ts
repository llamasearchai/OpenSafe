import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ViolationType, PolicyAction } from '../../models/types';

const router = Router();

// Simple asyncHandler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Simple audit service fallback
const auditService = {
  logAction: async (data: Record<string, unknown>) => {
    console.log('[AUDIT]', data);
  }
};

router.post('/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Mock policy creation
    const policy = {
      id: 'mock-policy-id',
      name: req.body.name || 'Default Policy',
      rules: req.body.rules || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    res.status(201).json({ policy });
  })
);

router.get('/suggest',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { content, targetViolationType } = req.query;
    
    // Simple policy suggestion based on content
    const suggestedRule = {
      description: `Auto-generated rule for ${targetViolationType || 'general'} content`,
      condition: {
        type: 'keyword_list' as const,
        parameters: { keywords: ['harmful', 'unsafe'] }
      },
      action: PolicyAction.FLAG,
      severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      violationType: targetViolationType || ViolationType.POLICY_VIOLATION,
    };

    // Adjust based on detected patterns
    if (content && typeof content === 'string') {
      if (content.toLowerCase().includes('violent')) {
        suggestedRule.action = PolicyAction.BLOCK;
        suggestedRule.severity = 'high';
      }
      if (content.toLowerCase().includes('personal')) {
        suggestedRule.violationType = ViolationType.PII_DETECTED;
        suggestedRule.action = PolicyAction.REDACT;
      }
    }

    await auditService.logAction({
      userId: req.user!.id,
      action: 'policy_suggestion_generated',
      details: { suggestedRule, content }
    });

    res.json({ suggestedRule });
  })
);

export default router; 