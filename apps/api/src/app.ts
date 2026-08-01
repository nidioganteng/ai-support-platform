import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { webhooksRouter, type CustomRequest } from './routes/webhooks.js';

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

  app.use('/health', healthRouter);
  app.use('/webhooks', webhooksRouter);

  return app;
}
