import { getEnv } from '@app/shared';

/**
 * BullMQ wants connection options, not a raw redis:// string, when we
 * later need features like maxRetriesPerRequest tuning. Parsing once
 * here keeps every queue/worker in the service consistent.
 */
export function getRedisConnectionOptions() {
  const env = getEnv();
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null, // required by BullMQ for blocking commands
  };
}
