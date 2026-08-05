import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email_1' }) },
  })),
}));

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(() => ({ userId: 'user-1', orgSlug: 'acme', orgId: 'clerk-org-1' })),
}));

vi.mock('@app/database', () => ({
  prisma: {
    organization: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    conversation: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    message: { aggregate: vi.fn(), findMany: vi.fn() },
    knowledgeSource: { count: vi.fn() },
  },
}));

vi.mock('@app/shared', () => ({
  getEnv: vi.fn(() => ({
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://test',
  })),
}));

describe('Organizations Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAuth).mockReturnValueOnce({ userId: null, orgSlug: null } as any);
      
      const res = await request(app).get('/organizations/me');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized or no active organization' });
    });
  });

  describe('GET /organizations/me', () => {
    it('returns org with masked API key successfully', async () => {
      vi.mocked(prisma.organization.upsert).mockResolvedValueOnce({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme',
        plan: 'FREE',
        publicApiKey: 'ai_live_1234567890abcdef12345678',
      } as any);

      const res = await request(app).get('/organizations/me');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Acme Corp');
      expect(res.body.publicApiKey).toBe('ai_live_1234...5678');
    });

    it('handles null API key', async () => {
      vi.mocked(prisma.organization.upsert).mockResolvedValueOnce({
        id: 'org-1',
        publicApiKey: null,
      } as any);

      const res = await request(app).get('/organizations/me');
      expect(res.status).toBe(200);
      expect(res.body.publicApiKey).toBeNull();
    });
  });

  describe('PATCH /organizations/me', () => {
    it('returns 400 for invalid widgetPosition', async () => {
      const res = await request(app)
        .patch('/organizations/me')
        .send({ widgetPosition: 'TOP_RIGHT' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid widgetPosition');
    });

    it('returns 400 for invalid botTone', async () => {
      const res = await request(app)
        .patch('/organizations/me')
        .send({ botTone: 'ANGRY' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid botTone');
    });

    it('updates org successfully', async () => {
      vi.mocked(prisma.organization.update).mockResolvedValueOnce({
        widgetPosition: 'BOTTOM_LEFT',
        botTone: 'FRIENDLY',
      } as any);

      const res = await request(app)
        .patch('/organizations/me')
        .send({ widgetPosition: 'BOTTOM_LEFT', botTone: 'FRIENDLY', botName: 'SupportBot' });
      
      expect(res.status).toBe(200);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { slug: 'acme' },
        data: {
          widgetPosition: 'BOTTOM_LEFT',
          botTone: 'FRIENDLY',
          botName: 'SupportBot',
        },
        select: expect.any(Object),
      });
      expect(res.body.widgetPosition).toBe('BOTTOM_LEFT');
    });
  });

  describe('GET /organizations/api-key', () => {
    it('returns raw api key successfully', async () => {
      vi.mocked(prisma.organization.upsert).mockResolvedValueOnce({
        publicApiKey: 'ai_live_rawkeyhere',
      } as any);

      const res = await request(app).get('/organizations/api-key');
      expect(res.status).toBe(200);
      expect(res.body.publicApiKey).toBe('ai_live_rawkeyhere');
    });
  });

  describe('POST /organizations/api-key/generate', () => {
    it('generates a new key starting with ai_live_', async () => {
      (vi.mocked(prisma.organization.upsert) as any).mockImplementationOnce(async (args: any) => {
        return { publicApiKey: args.update.publicApiKey };
      });

      const res = await request(app).post('/organizations/api-key/generate');
      expect(res.status).toBe(200);
      expect(res.body.publicApiKey).toMatch(/^ai_live_[0-9a-f]+$/);
    });
  });
});
