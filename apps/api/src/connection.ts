import { getEnv } from '@app/shared';

export function getRedisConnectionOptions() {
  const env = getEnv();
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}
