import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

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

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request body validation failed', { errors: error.errors, path: req.path, body: req.body });
        return next(new AppError(400, 'Validation failed'));
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request query validation failed', { errors: error.errors, path: req.path, query: req.query });
        return next(new AppError(400, 'Query validation failed'));
      }
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request params validation failed', { errors: error.errors, path: req.path, params: req.params });
        return next(new AppError(400, 'Parameters validation failed'));
      }
      next(error);
    }
  };
} 