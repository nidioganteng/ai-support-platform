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
    organization: { findUnique: vi.fn(), upsert: vi.fn() },
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

describe('Analytics Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAuth).mockReturnValueOnce({ userId: null, orgSlug: null } as any);
      
      const res = await request(app).get('/analytics/overview');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized or no active organization' });
    });
  });

  describe('GET /analytics/overview', () => {
    it('returns 404 when org not found', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);

      const res = await request(app).get('/analytics/overview');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Organization not found' });
    });

    it('returns overview stats successfully', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(prisma.conversation.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // resolved
        .mockResolvedValueOnce(2); // handoff
      vi.mocked(prisma.message.aggregate).mockResolvedValueOnce({ _count: { id: 50 } } as any);

      const res = await request(app).get('/analytics/overview');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalConversations: 10,
        totalMessages: 50,
        resolutionRate: 50,
        handoffRate: 20,
        avgMessagesPerConversation: 5,
      });
    });
  });

  describe('GET /analytics/volume', () => {
    it('returns 404 when org not found', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);

      const res = await request(app).get('/analytics/volume?days=7');
      expect(res.status).toBe(404);
    });

    it('returns volume data successfully', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({ id: 'org-1' } as any);
      const now = new Date();
      vi.mocked(prisma.conversation.findMany).mockResolvedValueOnce([
        { createdAt: now },
        { createdAt: now },
      ] as any);

      const res = await request(app).get('/analytics/volume?days=1');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const lastEntry = res.body.data[res.body.data.length - 1];
      expect(lastEntry.count).toBe(2);
    });
  });

  describe('GET /analytics/status-breakdown', () => {
    it('returns 404 when org not found', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);

      const res = await request(app).get('/analytics/status-breakdown');
      expect(res.status).toBe(404);
    });

    it('returns grouped status data successfully', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValueOnce([
        { status: 'RESOLVED', _count: { id: 5 } },
        { status: 'OPEN', _count: { id: 3 } },
      ] as any);

      const res = await request(app).get('/analytics/status-breakdown');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [
          { status: 'RESOLVED', count: 5 },
          { status: 'OPEN', count: 3 },
        ],
      });
    });
  });

  describe('GET /analytics/top-questions', () => {
    it('returns 404 when org not found', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);

      const res = await request(app).get('/analytics/top-questions');
      expect(res.status).toBe(404);
    });

    it('returns top questions data successfully', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(prisma.message.findMany).mockResolvedValueOnce([
        { content: 'How do I reset password?' },
        { content: 'How do I reset password?' },
        { content: 'What is the pricing?' },
      ] as any);

      const res = await request(app).get('/analytics/top-questions?limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [
          { question: 'how do i reset password?', count: 2 },
          { question: 'what is the pricing?', count: 1 },
        ],
      });
    });
  });
});
