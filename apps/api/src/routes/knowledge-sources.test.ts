import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => {
    if (req.headers.authorization === 'Bearer valid_token') {
      return { userId: 'user_123', orgSlug: 'org_123', orgId: 'org_123' };
    }
    if (req.headers.authorization === 'Bearer no_org_token') {
      return { userId: 'user_123', orgSlug: undefined, orgId: undefined };
    }
    return { userId: null, orgSlug: null, orgId: null };
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email_1' }) },
  })),
}));

vi.mock('@app/database', async () => {
  const actual = await vi.importActual('@app/database');
  return {
    ...actual,
    prisma: {
      organization: {
        upsert: vi.fn().mockResolvedValue({ id: 'org_db_1', slug: 'org_123', plan: 'FREE' }),
      },
      knowledgeSource: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue({ id: 'ks_1', organizationId: 'org_db_1' }),
        delete: vi.fn().mockResolvedValue({ id: 'ks_1' }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ks_123',
            ...data,
            createdAt: new Date().toISOString(),
          }),
        ),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ks_1',
            type: 'WEBSITE',
            title: 'https://example.com/faq',
            sourceUrl: 'https://example.com/faq',
            status: 'READY',
            chunkCount: 3,
          },
        ]),
      },
    },
  };
});

vi.mock('@app/shared', async () => {
  const actual = await vi.importActual('@app/shared');
  return {
    ...actual,
    getEnv: vi.fn().mockReturnValue({
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      CLERK_SECRET_KEY: 'sk_test_123',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
    }),
  };
});

describe('knowledgeSourcesRouter', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /knowledge-sources/website', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app)
        .post('/knowledge-sources/website')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('returns 403 if no active org selected', async () => {
      const res = await request(app)
        .post('/knowledge-sources/website')
        .set('Authorization', 'Bearer no_org_token')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'No active organization selected' });
    });

    it('returns 400 if URL is missing or invalid', async () => {
      const resMissing = await request(app)
        .post('/knowledge-sources/website')
        .set('Authorization', 'Bearer valid_token')
        .send({});

      expect(resMissing.status).toBe(400);
      expect(resMissing.body).toEqual({ error: 'Website URL is required' });

      const resInvalid = await request(app)
        .post('/knowledge-sources/website')
        .set('Authorization', 'Bearer valid_token')
        .send({ url: 'not-a-valid-url' });

      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body).toEqual({ error: 'Invalid URL format' });
    });

    it('creates WEBSITE knowledge source and queues website-crawl job', async () => {
      const res = await request(app)
        .post('/knowledge-sources/website')
        .set('Authorization', 'Bearer valid_token')
        .send({ url: 'https://example.com/docs' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 'ks_123',
        type: 'WEBSITE',
        status: 'PENDING',
        title: 'https://example.com/docs',
        sourceUrl: 'https://example.com/docs',
      });
    });
  });

  describe('GET /knowledge-sources', () => {
    it('returns list of knowledge sources for the active org', async () => {
      const res = await request(app)
        .get('/knowledge-sources')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 'ks_1',
        type: 'WEBSITE',
        title: 'https://example.com/faq',
      });
    });
  });

  describe('DELETE /knowledge-sources/:id', () => {
    it('returns 404 if knowledge source not found', async () => {
      const { prisma } = await import('@app/database');
      vi.mocked(prisma.knowledgeSource.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/knowledge-sources/unknown_id')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(404);
    });

    it('deletes knowledge source successfully', async () => {
      const res = await request(app)
        .delete('/knowledge-sources/ks_1')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });
});
