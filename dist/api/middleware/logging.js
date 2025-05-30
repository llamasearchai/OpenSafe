"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailedErrorLogging = exports.requestLogging = void 0;
const logger_1 = require("../../utils/logger");
const audit_service_1 = require("../../services/audit.service"); // Import AuditService
const errors_1 = require("../../utils/errors");
function requestLogging(req, res, next) {
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
            logger_1.logger.warn('HTTP Request Warning/Error', logDetails);
        }
        else {
            logger_1.logger.info('HTTP Request', logDetails);
        }
        // Log significant actions to audit trail
        // Exclude GET requests from audit trail unless they are sensitive (e.g., fetching sensitive data)
        // Exclude health checks and metrics from audit trail
        const isAuditablePath = !['/health', '/metrics'].includes(req.path);
        if (isAuditablePath && (method !== 'GET' || req.path.includes('/admin/'))) { // Example: audit admin GETs
            audit_service_1.auditService.logAction({
                userId,
                serviceName: 'APIGateway',
                action: `${method} ${req.path}`, // Log path instead of full URL for consistency
                resourceType: req.path.split('/')[3], // e.g., 'users', 'experiments' from /api/v1/users
                details: { query: req.query, params: req.params, bodyKeys: req.body ? Object.keys(req.body) : [] }, // Avoid logging full body for PII
                ipAddress: ip,
                userAgent,
                status: statusCode < 400 ? 'success' : 'failure',
                errorMessage: statusCode >= 400 ? (res.locals.errorMessage || `HTTP Error ${statusCode}`) : undefined,
            }).catch(err => logger_1.logger.error("Failed to write to audit log from requestLogging", err));
        }
    });
    next();
}
exports.requestLogging = requestLogging;
// Error logging middleware (already in src/utils/errors.ts - errorHandler, but can be specialized)
// For now, the existing errorHandler in utils/errors.ts handles general error logging.
// If more specific error logging tied to requests is needed, it can be added here.
// This function can augment the existing error handler or replace parts of it.
function detailedErrorLogging(err, req, res, next) {
    const statusCode = err instanceof errors_1.AppError ? err.statusCode : 500;
    const message = err instanceof errors_1.AppError ? err.message : 'Internal Server Error';
    const isOperational = err instanceof errors_1.AppError ? err.isOperational : false;
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
    logger_1.logger.error('Request Processing Error', errorDetails);
    // Store error message for audit logging in res.on('finish')
    res.locals.errorMessage = message;
    // Ensure the default error handler still runs
    next(err);
}
exports.detailedErrorLogging = detailedErrorLogging;
//# sourceMappingURL=logging.js.map