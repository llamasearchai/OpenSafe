import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Simple asyncHandler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Mock research service
const researchService = {
  createExperiment: async (data: any) => ({
    id: 'mock-experiment-id',
    ...data,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  getExperiment: async (id: string) => ({
    id,
    hypothesis: 'Mock hypothesis',
    status: 'completed',
    results: { metrics: { accuracy: 0.95 } }
  }),
  listExperiments: async (filters: any) => ({
    experiments: [],
    total: 0,
    page: filters.page || 1,
    totalPages: 0
  }),
  runExperiment: async (id: string) => ({
    id,
    status: 'running',
    startedAt: new Date()
  })
};

router.post('/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const experiment = await researchService.createExperiment({
      ...req.body,
      userId: req.user!.id
    });
    res.status(201).json({ experiment });
  })
);

router.get('/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const experiment = await researchService.getExperiment(req.params.id);
    res.json({ experiment });
  })
);

router.get('/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string,
      userId: req.query.userId as string
    };
    const result = await researchService.listExperiments(filters);
    res.json(result);
  })
);

router.post('/:id/run',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await researchService.runExperiment(req.params.id);
    res.json(result);
  })
);

router.post('/:id/stop',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Mock stop experiment
    res.json({ 
      id: req.params.id, 
      status: 'stopped',
      stoppedAt: new Date()
    });
  })
);

export default router; 