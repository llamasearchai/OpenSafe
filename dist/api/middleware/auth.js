"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const user_service_1 = require("../../services/user.service");
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
async function authenticate(req, _res, next) {
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
                const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                };
                return next();
            }
            catch (error) {
                logger.warn('JWT authentication failed', { error: error.message });
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
                logger.warn('Invalid API Key authentication attempt');
                throw new AppError(401, 'Authentication required: Invalid API Key');
            }
        }
        throw new AppError(401, 'Authentication failed: Invalid token or API key');
    }
    catch (error) {
        if (error instanceof AppError) {
            next(error);
        }
        else {
            logger.warn('Unexpected authentication error', error);
            next(new AppError(500, 'Internal server error during authentication'));
        }
    }
}
exports.authenticate = authenticate;
function authorize(allowedRoles) {
    return (req, _res, next) => {
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
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map