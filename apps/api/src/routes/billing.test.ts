import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';
import { getEnv } from '@app/shared';
import { PLAN_LIMITS } from './billing.js';

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_123' }) },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
  })),
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
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_PRO_PRICE_ID: 'price_pro',
    STRIPE_ENTERPRISE_PRICE_ID: 'price_ent',
    NEXT_PUBLIC_WEB_URL: 'http://localhost:3000',
  })),
}));

describe('Billing Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getAuth).mockReturnValueOnce({ userId: null, orgSlug: null } as any);
      
      const res = await request(app).get('/billing/status');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized or no active organization' });
    });
  });

  describe('GET /billing/status', () => {
    it('returns plan, usage, and limits successfully', async () => {
      const now = new Date();
      vi.mocked(prisma.organization.upsert).mockResolvedValueOnce({
        id: 'org-1',
        plan: 'FREE',
        currentPeriodEnd: now,
        stripeSubscriptionId: null,
      } as any);

      vi.mocked(prisma.knowledgeSource.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.conversation.count).mockResolvedValueOnce(15);

      const res = await request(app).get('/billing/status');
      expect(res.status).toBe(200);
      expect(res.body.plan).toBe('FREE');
      expect(res.body.currentPeriodEnd).toBe(now.toISOString());
      expect(res.body.hasActiveSubscription).toBe(false);
      expect(res.body.usage).toEqual({
        knowledgeSources: { used: 2, limit: 3 },
        conversationsThisMonth: { used: 15, limit: 100 },
      });
    });
  });

  describe('POST /billing/create-checkout', () => {
    it('returns 400 with missing plan', async () => {
      const res = await request(app).post('/billing/create-checkout').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('plan must be PRO or ENTERPRISE');
    });

    it('returns 400 with invalid plan', async () => {
      const res = await request(app).post('/billing/create-checkout').send({ plan: 'BASIC' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('plan must be PRO or ENTERPRISE');
    });

    it('returns 503 when STRIPE_SECRET_KEY missing', async () => {
      vi.mocked(getEnv).mockReturnValueOnce({
        DATABASE_URL: 'postgresql://test',
        REDIS_URL: 'redis://test',
        STRIPE_SECRET_KEY: undefined,
      } as any);

      const res = await request(app).post('/billing/create-checkout').send({ plan: 'PRO' });
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Stripe is not configured');
    });

    it('creates checkout session successfully', async () => {
      vi.mocked(prisma.organization.upsert).mockResolvedValueOnce({
        id: 'org-1',
        stripeCustomerId: 'cus_123',
      } as any);

      const res = await request(app).post('/billing/create-checkout').send({ plan: 'PRO' });
      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://checkout.stripe.com/test');
    });
  });

  describe('POST /billing/create-portal', () => {
    it('returns 400 when no stripeCustomerId', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        stripeCustomerId: null,
      } as any);

      const res = await request(app).post('/billing/create-portal');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No Stripe customer found for this organization');
    });

    it('creates portal session successfully', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        stripeCustomerId: 'cus_123',
      } as any);

      const res = await request(app).post('/billing/create-portal');
      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://billing.stripe.com/test');
    });
  });

  describe('PLAN_LIMITS', () => {
    it('export values are correct', () => {
      expect(PLAN_LIMITS).toEqual({
        FREE: { knowledgeSources: 3, conversationsPerMonth: 100 },
        PRO: { knowledgeSources: 20, conversationsPerMonth: 1000 },
        ENTERPRISE: { knowledgeSources: Infinity, conversationsPerMonth: Infinity },
      });
    });
  });
});
