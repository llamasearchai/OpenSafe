import { Router, Request, Response, NextFunction } from 'express';
import { SafetyAnalysisRequestSchema, ConstitutionalAIRequestSchema } from '../../models/schemas';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../../middleware/validation';

const router = Router();

// Simple asyncHandler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Mock safety service
const safetyService = {
  analyzeText: async (_data: any) => ({
    safe: true,
    score: 0.95,
    violations: [],
    metadata: {
      analysisTime: 50,
      modelVersion: 'mock-v1.0',
      timestamp: new Date().toISOString()
    }
  }),
  applyConstitutionalPrinciples: async (data: any) => ({
    original: data.text,
    revised: data.text,
    critiques: [],
    revisionCount: 0,
    principles: ['harmlessness', 'helpfulness'],
    appliedSuccessfully: true
  })
};

router.post('/analyze',
  authenticate,
  validateBody(SafetyAnalysisRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await safetyService.analyzeText({
      ...req.body,
      userId: req.user!.id
    });
    res.json(result);
  })
);

router.post('/constitutional',
  authenticate,
  validateBody(ConstitutionalAIRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await safetyService.applyConstitutionalPrinciples(req.body);
    res.json(result);
  })
);

router.get('/policies',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    // Mock policy list
    const policies = [
      {
        id: 'default',
        name: 'Default Safety Policy',
        version: '1.0.0',
        isActive: true,
        rules: []
      }
    ];
    res.json({ policies });
  })
);

export default router; 