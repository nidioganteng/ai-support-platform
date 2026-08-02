import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { clerkMiddleware } from '@clerk/express';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { webhooksRouter, type CustomRequest } from './routes/webhooks.js';
import { knowledgeSourcesRouter } from './routes/knowledge-sources.js';
import { chatRouter, conversationsRouter } from './routes/chat.js';
import { orgRouter } from './routes/organizations.js';

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

  return app;
}
