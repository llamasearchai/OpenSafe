"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = void 0;
const chat_1 = __importDefault(require("./chat"));
const safety_1 = __importDefault(require("./safety"));
const research_1 = __importDefault(require("./research"));
const users_1 = __importDefault(require("./users"));
const audit_1 = __importDefault(require("./audit"));
const policies_1 = __importDefault(require("./policies"));
function setupRoutes(app) {
    // API routes
    app.use('/api/v1/chat', chat_1.default);
    app.use('/api/v1/safety', safety_1.default);
    app.use('/api/v1/research', research_1.default);
    app.use('/api/v1/users', users_1.default);
    app.use('/api/v1/audit', audit_1.default);
    app.use('/api/v1/policies', policies_1.default);
    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            name: 'OpenAI Safe API',
            version: '1.0.0',
            description: 'Production-grade AI Safety Research and Deployment Platform',
            endpoints: {
                health: '/health',
                metrics: '/metrics',
                api: '/api/v1',
                websocket: '/ws'
            }
        });
    });
}
exports.setupRoutes = setupRoutes;
//# sourceMappingURL=index.js.map