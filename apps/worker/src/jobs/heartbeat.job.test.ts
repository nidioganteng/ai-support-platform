import { describe, expect, it } from 'vitest';
import { processHeartbeat } from './heartbeat.job.js';

describe('processHeartbeat', () => {
  it('echoes back the received timestamp and adds a processedAt', () => {
    const emittedAt = new Date().toISOString();
    const result = processHeartbeat({ emittedAt });

    expect(result.receivedAt).toBe(emittedAt);
    expect(typeof result.processedAt).toBe('string');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('computes a positive latency for a timestamp in the past', () => {
    const emittedAt = new Date(Date.now() - 1000).toISOString();
    const result = processHeartbeat({ emittedAt });

    expect(result.latencyMs).toBeGreaterThanOrEqual(1000);
  });
});
