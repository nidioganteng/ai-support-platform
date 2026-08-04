import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { clerkMiddleware } from '@clerk/express';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { webhooksRouter, type CustomRequest } from './routes/webhooks.js';
import { knowledgeSourcesRouter } from './routes/knowledge-sources.js';
import { chatRouter, conversationsRouter } from './routes/chat.js';
import { orgRouter } from './routes/organizations.js';
import { analyticsRouter } from './routes/analytics.js';
import { billingRouter } from './routes/billing.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(
    express.json({
      verify: (req: CustomRequest, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(clerkMiddleware({
    ...(process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']
      ? { publishableKey: process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] }
      : {}),
    ...(process.env['CLERK_SECRET_KEY']
      ? { secretKey: process.env['CLERK_SECRET_KEY'] }
      : {}),
  }));

  app.use('/health', healthRouter);
  app.use('/webhooks', webhooksRouter);
  app.use('/knowledge-sources', knowledgeSourcesRouter);
  app.use('/chat', chatRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/organizations', orgRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/billing', billingRouter);

  // Global error handler — catches any error thrown/rejected inside route handlers
  // Prevents unhandled rejections from crashing the process
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled route error');
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}
