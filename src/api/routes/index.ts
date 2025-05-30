import { Application, Request, Response } from 'express';
import { chatRoutes } from './chat';
import safetyRoutes from './safety';
import researchRoutes from './research';
import userRoutes from './users';
import auditRoutes from './audit';

export function setupRoutes(app: Application) {
  // API routes
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/safety', safetyRoutes);
  app.use('/api/v1/research', researchRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/audit', auditRoutes);
  
  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
} 