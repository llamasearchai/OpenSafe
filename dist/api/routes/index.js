"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = void 0;
const chat_1 = require("./chat");
const safety_1 = __importDefault(require("./safety"));
const research_1 = __importDefault(require("./research"));
const users_1 = __importDefault(require("./users"));
const audit_1 = __importDefault(require("./audit"));
function setupRoutes(app) {
    // API routes
    app.use('/api/v1/chat', chat_1.chatRoutes);
    app.use('/api/v1/safety', safety_1.default);
    app.use('/api/v1/research', research_1.default);
    app.use('/api/v1/users', users_1.default);
    app.use('/api/v1/audit', audit_1.default);
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({
            status: 'healthy',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });
}
exports.setupRoutes = setupRoutes;
//# sourceMappingURL=index.js.map