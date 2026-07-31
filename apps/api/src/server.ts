import { getEnv } from '@app/shared';
import { createApp } from './app.js';
import { logger } from './logger.js';

const env = getEnv();
const app = createApp();

app.listen(env.API_PORT, () => {
  logger.info(`api listening on http://localhost:${env.API_PORT}`);
});
