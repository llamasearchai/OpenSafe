import { Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from './auth';
import { auditService } from '../../services/audit.service'; // Import AuditService
import { AppError } from '../../utils/errors';


export function requestLogging(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl, ip } = req; // Use originalUrl for full path with query
  const userAgent = req.get('User-Agent') || '';
  const userId = req.user?.id;
  const userEmail = req.user?.email; // For richer logs

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logDetails = {
      method,
      url: originalUrl,
      statusCode,
      durationMs: duration,
      ip,
      userAgent,
      userId,
      userEmail,
    };

    if (statusCode >= 400) {
        logger.warn('HTTP Request Warning/Error', logDetails);
    } else {
        logger.info('HTTP Request', logDetails);
    }

    // Log significant actions to audit trail
    // Exclude GET requests from audit trail unless they are sensitive (e.g., fetching sensitive data)
    // Exclude health checks and metrics from audit trail
    const isAuditablePath = !['/health', '/metrics'].includes(req.path);

    if (isAuditablePath && (method !== 'GET' || req.path.includes('/admin/')) ) { // Example: audit admin GETs
      auditService.logAction({
        userId,
        serviceName: 'APIGateway',
        action: `${method} ${req.path}`, // Log path instead of full URL for consistency
        resourceType: req.path.split('/')[3], // e.g., 'users', 'experiments' from /api/v1/users
        details: { query: req.query, params: req.params, bodyKeys: req.body ? Object.keys(req.body) : [] }, // Avoid logging full body for PII
        ipAddress: ip,
        userAgent,
        status: statusCode < 400 ? 'success' : 'failure',
        errorMessage: statusCode >=400 ? (res.locals.errorMessage || `HTTP Error ${statusCode}`) : undefined,
      }).catch(err => logger.error("Failed to write to audit log from requestLogging", err));
    }
  });

  next();
}

// Error logging middleware (already in src/utils/errors.ts - errorHandler, but can be specialized)
// For now, the existing errorHandler in utils/errors.ts handles general error logging.
// If more specific error logging tied to requests is needed, it can be added here.
// This function can augment the existing error handler or replace parts of it.
export function detailedErrorLogging(err: Error | AppError, req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : 'Internal Server Error';
    const isOperational = err instanceof AppError ? err.isOperational : false;

    const errorDetails = {
        error: err.name,
        message: err.message,
        statusCode,
        isOperational,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Only show stack in dev
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
    };

    logger.error('Request Processing Error', errorDetails);
    
    // Store error message for audit logging in res.on('finish')
    res.locals.errorMessage = message;

    // Ensure the default error handler still runs
    next(err);
} 