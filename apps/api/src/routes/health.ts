import { Router } from 'express';
import type { HealthCheckResponse } from '@app/shared';

export const healthRouter: Router = Router();

const startedAt = Date.now();

healthRouter.get('/', (_req, res) => {
  const body: HealthCheckResponse = {
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
  res.status(200).json(body);
});
