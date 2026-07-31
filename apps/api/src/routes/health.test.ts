import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with an ok status payload', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'api' });
    expect(typeof res.body.timestamp).toBe('string');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});
