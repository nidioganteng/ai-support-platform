import { getEnv } from '@app/shared';
import { createApp } from './app.js';
import { logger } from './logger.js';

// Prevent unhandled rejections and uncaught exceptions from crashing the process
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled promise rejection — keeping process alive');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaught exception — keeping process alive');
});

const env = getEnv();
const app = createApp();

app.listen(env.API_PORT, () => {
  logger.info(`api listening on http://localhost:${env.API_PORT}`);
});
