"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.asyncHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("./logger");
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
exports.asyncHandler = asyncHandler;
function errorHandler(err, req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn('Validation error', {
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
        logger_1.logger.warn('Application error', {
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
    // Unhandled errors
    logger_1.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body
    });
    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    res.status(500).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}
exports.errorHandler = errorHandler;
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Resource not found',
        path: req.path,
        method: req.method
    });
}
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errors.js.map