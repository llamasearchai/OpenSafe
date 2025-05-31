"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
// Simple logger fallback
const logger = {
    warn: (...args) => console.warn('[WARN]', ...args),
};
// Simple AppError class
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger.warn('Request body validation failed', { errors: error.errors, path: req.path, body: req.body });
                return next(new AppError(400, 'Validation failed'));
            }
            next(error);
        }
    };
}
exports.validateBody = validateBody;
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger.warn('Request query validation failed', { errors: error.errors, path: req.path, query: req.query });
                return next(new AppError(400, 'Query validation failed'));
            }
            next(error);
        }
    };
}
exports.validateQuery = validateQuery;
function validateParams(schema) {
    return (req, _res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger.warn('Request params validation failed', { errors: error.errors, path: req.path, params: req.params });
                return next(new AppError(400, 'Parameters validation failed'));
            }
            next(error);
        }
    };
}
exports.validateParams = validateParams;
//# sourceMappingURL=validation.js.map