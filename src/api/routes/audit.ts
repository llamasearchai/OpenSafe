import { Router, Request, Response, NextFunction } from 'express';
import { auditService } from '../../services/audit.service';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../../models/types';

const router = Router();

router.use(authenticate, authorize([UserRole.ADMIN, UserRole.RESEARCHER])); // Admins and Researchers can view audit logs

// Simple asyncHandler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.get('/', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      userId: req.query.userId as string,
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };

    const result = await auditService.getAuditLogs(filters);
    res.json(result);
  })
);

export default router; 