"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn('Request body validation failed', { errors: error.errors, path: req.path, body: req.body });
                return next(new errors_1.AppError(400, 'Validation failed', error.errors));
            }
            next(error);
        }
    };
}
exports.validateBody = validateBody;
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn('Request query validation failed', { errors: error.errors, path: req.path, query: req.query });
                return next(new errors_1.AppError(400, 'Query validation failed', error.errors));
            }
            next(error);
        }
    };
}
exports.validateQuery = validateQuery;
function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logger.warn('Request params validation failed', { errors: error.errors, path: req.path, params: req.params });
                return next(new errors_1.AppError(400, 'Parameters validation failed', error.errors));
            }
            next(error);
        }
    };
}
exports.validateParams = validateParams;
//# sourceMappingURL=validation.js.map