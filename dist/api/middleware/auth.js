"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const user_service_1 = require("../../services/user.service");
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AppError(401, 'Authentication required: No authorization header');
        }
        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            throw new errors_1.AppError(401, 'Authentication required: Malformed token or unsupported scheme');
        }
        // JWT authentication
        if (token.split('.').length === 3) { // Basic check for JWT format
            try {
                const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                };
                return next();
            }
            catch (error) {
                logger_1.logger.warn('JWT authentication failed', { error: error.message });
                // Fall through to API key check or fail if no other method
            }
        }
        // API Key authentication (if JWT fails or not a JWT)
        if (token.startsWith('osk-')) {
            const user = await user_service_1.userService.validateApiKey(token);
            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                };
                return next();
            }
            else {
                logger_1.logger.warn('Invalid API Key authentication attempt');
                throw new errors_1.AppError(401, 'Authentication required: Invalid API Key');
            }
        }
        throw new errors_1.AppError(401, 'Authentication failed: Invalid token or API key');
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            next(error);
        }
        else {
            logger_1.logger.error('Unexpected authentication error', error);
            next(new errors_1.AppError(500, 'Internal server error during authentication'));
        }
    }
}
exports.authenticate = authenticate;
function authorize(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.AppError(401, 'Authentication required'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.logger.warn('Authorization failed: Insufficient permissions', { userId: req.user.id, requiredRoles: allowedRoles, userRole: req.user.role });
            return next(new errors_1.AppError(403, 'Forbidden: Insufficient permissions'));
        }
        next();
    };
}
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map