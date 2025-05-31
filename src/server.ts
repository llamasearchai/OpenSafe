import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { setupRoutes } from './api/routes';
import { MetricsCollector } from './utils/metrics';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize metrics
const metrics = new MetricsCollector();
app.use(metrics.middleware());

// Setup routes
setupRoutes(app);

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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.port, () => {
  console.log(`OpenSafe AI Security Platform running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server }; 