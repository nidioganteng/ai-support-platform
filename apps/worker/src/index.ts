import { Worker } from 'bullmq';
import pino from 'pino';
import { getEnv } from '@app/shared';
import { getRedisConnectionOptions } from './connection.js';
import {
  createHeartbeatQueue,
  HEARTBEAT_QUEUE_NAME,
  type HeartbeatJobData,
} from './queues/heartbeat.queue.js';
import { processHeartbeat } from './jobs/heartbeat.job.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

async function main() {
  // Fail fast if REDIS_URL / DATABASE_URL are missing or malformed.
  getEnv();

  const heartbeatQueue = createHeartbeatQueue();

  // Repeatable job: proves the worker + Redis + queue wiring works
  // end-to-end before Phase 2/3 add the real PDF/website processing
  // jobs on top of this same pattern.
  await heartbeatQueue.add(
    'tick',
    { emittedAt: new Date().toISOString() } satisfies HeartbeatJobData,
    { repeat: { every: 30_000 }, removeOnComplete: 20, removeOnFail: 20 },
  );

  const worker = new Worker<HeartbeatJobData>(
    HEARTBEAT_QUEUE_NAME,
    async (job) => {
      const result = processHeartbeat(job.data);
      logger.info({ jobId: job.id, ...result }, 'heartbeat processed');
      return result;
    },
    { connection: getRedisConnectionOptions() },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'heartbeat job failed');
  });

  logger.info('worker started, listening on queue: %s', HEARTBEAT_QUEUE_NAME);

  const shutdown = async () => {
    logger.info('shutting down worker...');
    await worker.close();
    await heartbeatQueue.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err, 'worker failed to start');
  process.exit(1);
});
