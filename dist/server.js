"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const config_1 = require("./config");
const routes_1 = require("./api/routes");
const metrics_1 = require("./utils/metrics");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.config.cors));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Initialize metrics
const metrics = new metrics_1.MetricsCollector();
app.use(metrics.middleware());
// Setup routes
(0, routes_1.setupRoutes)(app);
// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        version: process.env.npm_package_version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// Metrics endpoint
app.get('/metrics', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics placeholder');
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
server.listen(config_1.config.port, () => {
    console.log(`OpenVault AI Security Platform running on port ${config_1.config.port}`);
    console.log(`Environment: ${config_1.config.env}`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map