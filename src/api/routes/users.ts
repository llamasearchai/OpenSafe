import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { userService } from '../../services/user.service';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../../middleware/validation'; 
import { UserRegistrationSchema, UserLoginSchema, UserUpdateSchema, ApiKeyRequestSchema } from '../../models/schemas';
import { UserRole } from '../../models/types';
import { z } from 'zod';

// Simple AppError class
class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Simple asyncHandler implementation
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

// Public routes
router.post(
    '/register', 
    validateBody(UserRegistrationSchema), 
    asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.createUser(req.body);
        res.status(201).json({ user });
    })
);

router.post(
    '/login', 
    validateBody(UserLoginSchema), 
    asyncHandler(async (req: Request, res: Response) => {
        const result = await userService.loginUser(req.body);
        res.json(result);
    })
);

// Authenticated routes
router.use(authenticate); // Apply authenticate middleware to all subsequent routes

router.get(
    '/profile', 
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getUserById(req.user!.id);
        res.json({ user });
    })
);

router.put(
    '/profile',
    validateBody(UserUpdateSchema.partial()), // Allow partial updates for profile
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user?.id) throw new AppError(401, "User not authenticated for profile update");
        const updatedUser = await userService.updateUser(req.user.id, req.body, req.user.id);
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    })
);

router.post(
    '/api-key',
    validateBody(ApiKeyRequestSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user?.id) throw new AppError(401, "User not authenticated for API key generation");
        const apiKeyData = await userService.generateApiKey(req.user.id, req.body);
        res.status(201).json({ message: 'API Key generated successfully', ...apiKeyData });
    })
);

router.delete(
    '/api-key',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user?.id) throw new AppError(401, "User not authenticated for API key revocation");
        await userService.revokeApiKey(req.user.id);
        res.status(204).send();
    })
);

// Admin routes
router.get(
    '/', 
    authorize([UserRole.ADMIN]), 
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { page = '1', limit = '20' } = req.query;
        const result = await userService.listUsers(parseInt(page as string), parseInt(limit as string));
        res.json(result);
    })
);

const UserIdParamsSchema = z.object({ id: z.string().uuid("Invalid user ID format") });

router.get(
    '/:id',
    authorize([UserRole.ADMIN]),
    validateParams(UserIdParamsSchema), // Ensure validateParams middleware exists
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await userService.getUserById(req.params.id);
        if (!user) throw new AppError(404, "User not found");
        res.json({ user });
    })
);

router.put(
    '/:id', 
    authorize([UserRole.ADMIN]), 
    validateParams(UserIdParamsSchema),
    validateBody(UserUpdateSchema.partial()), 
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user?.id) throw new AppError(500, "Authenticated user ID missing"); // Should not happen if authorize works
        const user = await userService.updateUser(req.params.id, req.body, req.user.id);
        res.json({ message: 'User updated successfully', user });
    })
);

router.delete(
    '/:id', 
    authorize([UserRole.ADMIN]), 
    validateParams(UserIdParamsSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user?.id) throw new AppError(500, "Authenticated user ID missing");
        await userService.deleteUser(req.params.id, req.user.id);
        res.status(204).send();
    })
);

export default router; 

export function validateParams(schema: z.ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn('Request params validation failed', { errors: error.errors, path: req.path, params: req.params });
        return next(new AppError(400, 'Parameters validation failed'));
      }
      next(error);
    }
  };
} 