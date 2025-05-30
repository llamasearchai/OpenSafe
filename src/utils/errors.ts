import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logger.warn('Validation error', { 
      errors: err.errors, 
      path: req.path,
      method: req.method,
      body: req.body 
    });
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn('Application error', { 
      error: err.message, 
      statusCode: err.statusCode,
      path: req.path,
      method: req.method 
    });
    res.status(err.statusCode).json({
      error: err.message,
      code: err.statusCode
    });
    return;
  }

  // Unexpected error
  logger.error('Unexpected error', { 
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method 
  });
  
  res.status(500).json({
    error: 'Internal server error',
    code: 500
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Resource not found',
    path: req.path,
    method: req.method
  });
} 