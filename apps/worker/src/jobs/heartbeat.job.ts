import type { HeartbeatJobData } from '../queues/heartbeat.queue.js';

export interface HeartbeatResult {
  receivedAt: string;
  processedAt: string;
  latencyMs: number;
}

/**
 * Processes a single heartbeat job. This exists as a standalone
 * function (rather than inline in the BullMQ Worker callback) purely
 * so it can be unit tested without spinning up Redis — the Worker in
 * index.ts is a thin wrapper around this.
 */
export function processHeartbeat(data: HeartbeatJobData): HeartbeatResult {
  const receivedAt = data.emittedAt;
  const processedAt = new Date().toISOString();
  const latencyMs = Date.parse(processedAt) - Date.parse(receivedAt);

  return { receivedAt, processedAt, latencyMs };
}
