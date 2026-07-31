import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../connection.js';

export const HEARTBEAT_QUEUE_NAME = 'system-heartbeat';

export interface HeartbeatJobData {
  emittedAt: string;
}

export function createHeartbeatQueue(): Queue<HeartbeatJobData> {
  return new Queue<HeartbeatJobData>(HEARTBEAT_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });
}
