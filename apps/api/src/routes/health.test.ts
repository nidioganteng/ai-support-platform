import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: null, orgSlug: null }),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email_1' }) },
  })),
}));

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
