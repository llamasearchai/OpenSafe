import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { UserRole } from '../../models/types';
import { userService } from '../../services/user.service';

// Simple logger fallback
const logger = {
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
};

// Simple AppError class
class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Authentication required: No authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Authentication required: Malformed token or unsupported scheme');
    }
    
    // JWT authentication
    if (token.split('.').length === 3) { // Basic check for JWT format
        try {
            const decoded = jwt.verify(token, config.jwtSecret) as any;
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
            };
            return next();
        } catch (error) {
            logger.warn('JWT authentication failed', { error: (error as Error).message });
            // Fall through to API key check or fail if no other method
        }
    }

    // API Key authentication (if JWT fails or not a JWT)
    if (token.startsWith('osk-')) {
        const user = await userService.validateApiKey(token);
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            };
            return next();
        } else {
            logger.warn('Invalid API Key authentication attempt');
            throw new AppError(401, 'Authentication required: Invalid API Key');
        }
    }
    
    throw new AppError(401, 'Authentication failed: Invalid token or API key');

  } catch (error) {
    if (error instanceof AppError) {
        next(error);
    } else {
        logger.warn('Unexpected authentication error', error);
        next(new AppError(500, 'Internal server error during authentication'));
    }
  }
}

export function authorize(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', { userId: req.user.id, requiredRoles: allowedRoles, userRole: req.user.role });
      return next(new AppError(403, 'Forbidden: Insufficient permissions'));
    }
    next();
  };
} 