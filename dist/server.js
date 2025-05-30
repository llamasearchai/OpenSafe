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
const ws_1 = require("ws");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errors_1 = require("./utils/errors");
const routes_1 = require("./api/routes");
const services_1 = require("./services");
const realtime_1 = require("./websocket/realtime");
const metrics_1 = require("./utils/metrics");
const database_1 = require("./models/database");
const logging_1 = require("./api/middleware/logging");
const monitoring_service_1 = require("./services/monitoring.service");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const wss = new ws_1.WebSocketServer({ server });
async function startServer() {
    try {
        // Initialize database
        await (0, database_1.initializeDatabase)();
        // Security middleware
        app.use((0, helmet_1.default)());
        app.use((0, cors_1.default)(config_1.config.cors));
        app.use(express_1.default.json({ limit: '10mb' }));
        app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        app.use(logging_1.requestLogging);
        // Initialize metrics
        const metrics = new metrics_1.MetricsCollector();
        app.use(metrics.middleware());
        // Initialize services
        await (0, services_1.initializeServices)();
        // Setup routes
        (0, routes_1.setupRoutes)(app);
        // Setup WebSocket
        (0, realtime_1.setupWebSocket)(wss);
        // Health check
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                version: process.env.npm_package_version,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
        // Metrics endpoint
        app.get('/metrics', (req, res) => {
            res.set('Content-Type', metrics.register.contentType);
            res.end(metrics.register.metrics());
        });
        // Error logging and handling (order matters)
        app.use(logging_1.detailedErrorLogging);
        app.use(errors_1.errorHandler);
        // Start server
        server.listen(config_1.config.port, () => {
            logger_1.logger.info(`OpenAI Safe API server running on port ${config_1.config.port}`);
            logger_1.logger.info(`Environment: ${config_1.config.env}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, attempting graceful shutdown...');
            monitoring_service_1.monitoringService.shutdown();
            // Close WebSocket server connections
            logger_1.logger.info('Closing WebSocket server...');
            wss.clients.forEach(client => client.terminate());
            wss.close(err => {
                if (err)
                    logger_1.logger.error("Error closing WebSocket server", err);
                else
                    logger_1.logger.info("WebSocket server closed.");
            });
            // Close HTTP server
            server.close(async () => {
                logger_1.logger.info('HTTP Server closed.');
                try {
                    await database.close();
                    logger_1.logger.info('Database pool closed.');
                }
                catch (dbError) {
                    logger_1.logger.error('Error closing database pool during shutdown:', dbError);
                }
                logger_1.logger.info('All resources cleaned up. Exiting.');
                process.exit(0);
            });
            // Force shutdown if graceful shutdown takes too long
            setTimeout(() => {
                logger_1.logger.error('Graceful shutdown timed out. Forcing exit.');
                process.exit(1);
            }, 10000); // 10 seconds timeout
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map