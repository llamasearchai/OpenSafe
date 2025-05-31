import { Router, Request, Response, NextFunction } from 'express';
import { openAIService } from '../../services/openai.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ChatRequestSchema } from '../../models/schemas';
import { validateBody } from '../../middleware/validation';

const router = Router();

// Simple asyncHandler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Simple rate limiter placeholder
const simpleRateLimit = (_req: Request, _res: Response, next: NextFunction) => {
  // In production, implement proper rate limiting
  next();
};

router.post('/completions',
  authenticate,
  simpleRateLimit,
  validateBody(ChatRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const completion = await openAIService.createSafeChatCompletion(
        req.body,
        req.user!.id
      );

      res.json({ completion });
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  })
);

router.post('/stream',
  authenticate,
  simpleRateLimit,
  validateBody(ChatRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Set streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await openAIService.createSafeStreamingCompletion(
        req.body,
        (chunk: Record<string, unknown>, isSafe: boolean, violations?: unknown[]) => {
          const dataToSend = { 
            ...chunk, 
            safety_status: { 
              is_safe: isSafe, 
              violations_detected: violations?.length || 0 
            }
          };
          res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
        },
        (_fullResponseText: string, finalSafety: unknown) => {
          res.write(`data: ${JSON.stringify({ event: 'done', final_safety_analysis: finalSafety })}\n\n`);
          res.end();
        },
        (error: unknown) => {
          const err = error as { statusCode?: number; message?: string };
          if (!res.headersSent) {
            if (err.statusCode) {
              res.status(err.statusCode).json({ error: err.message });
            } else {
              res.status(500).json({ error: 'Streaming failed' });
            }
          } else {
            res.write(`data: ${JSON.stringify({ error: 'stream_failed', message: err.message })}\n\n`);
            res.end();
          }
        },
        req.user!.id
      );
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      if (!res.headersSent) {
        if (err.statusCode) {
          res.status(err.statusCode).json({ error: err.message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  })
);

export { router as chatRoutes }; 