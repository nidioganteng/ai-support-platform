import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { mapClerkRoleToRole } from './webhooks.js';
import { OrganizationRole } from '@app/database';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: null, orgSlug: null }),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn((rawBody: string, sig: string) => {
        if (sig === 'invalid_sig') throw new Error('Invalid signature');
        return JSON.parse(rawBody);
      }),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: 1700000000,
      }),
    },
  })),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email_1' }) },
  })),
}));

vi.mock('svix', () => {
  return {
    Webhook: vi.fn().mockImplementation(() => ({
      verify: vi.fn((rawBody: string, headers: Record<string, string>) => {
        if (headers['svix-signature'] === 'invalid_sig') {
          throw new Error('Invalid signature');
        }
        return JSON.parse(rawBody);
      }),
    })),
  };
});

vi.mock('@app/database', async () => {
  const actual = await vi.importActual('@app/database');
  return {
    ...actual,
    prisma: {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'user_1', clerkUserId: 'clerk_user_1', email: 'test@example.com' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'user_1', clerkUserId: 'clerk_user_1', email: 'test@example.com' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      organization: {
        upsert: vi.fn().mockResolvedValue({ id: 'org_1', name: 'Test Org', slug: 'test-org' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'org_1', name: 'Test Org', slug: 'test-org' }),
        update: vi.fn().mockResolvedValue({ id: 'org_1', plan: 'PRO' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      membership: {
        upsert: vi.fn().mockResolvedValue({ id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'OWNER' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    },
  };
});

vi.mock('@app/shared', async () => {
  const actual = await vi.importActual('@app/shared');
  return {
    ...actual,
    getEnv: vi.fn().mockReturnValue({
      CLERK_WEBHOOK_SECRET: 'whsec_test_secret_key',
    }),
  };
});

describe('Clerk Webhook Helpers', () => {
  it('maps clerk roles correctly', () => {
    expect(mapClerkRoleToRole('org:admin')).toBe(OrganizationRole.ADMIN);
    expect(mapClerkRoleToRole('org:owner')).toBe(OrganizationRole.OWNER);
    expect(mapClerkRoleToRole('admin')).toBe(OrganizationRole.OWNER);
    expect(mapClerkRoleToRole('org:member')).toBe(OrganizationRole.AGENT);
  });
});

describe('POST /webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if svix verification headers are missing', async () => {
    const app = createApp();
    const res = await request(app).post('/webhooks/clerk').send({ type: 'user.created' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing svix verification headers' });
  });

  it('returns 400 if signature verification fails', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/webhooks/clerk')
      .set('svix-id', 'msg_123')
      .set('svix-timestamp', '123456789')
      .set('svix-signature', 'invalid_sig')
      .send({ type: 'user.created' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid webhook signature' });
  });

  it('processes user.created event and upserts user', async () => {
    const app = createApp();
    const payload = {
      type: 'user.created',
      data: {
        id: 'clerk_user_1',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    const res = await request(app)
      .post('/webhooks/clerk')
      .set('svix-id', 'msg_123')
      .set('svix-timestamp', '123456789')
      .set('svix-signature', 'valid_sig')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, received: 'user.created' });
  });

  it('processes organizationMembership.created event and upserts membership', async () => {
    const app = createApp();
    const payload = {
      type: 'organizationMembership.created',
      data: {
        role: 'org:admin',
        public_user_data: { user_id: 'clerk_user_1' },
        organization: { id: 'org_123', slug: 'my-org', name: 'My Org' },
      },
    };

    const res = await request(app)
      .post('/webhooks/clerk')
      .set('svix-id', 'msg_123')
      .set('svix-timestamp', '123456789')
      .set('svix-signature', 'valid_sig')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, received: 'organizationMembership.created' });
  });
});

describe('POST /webhooks/stripe', () => {
  it('returns 500 when STRIPE_SECRET_KEY is not configured', async () => {
    const { getEnv } = await import('@app/shared');
    vi.mocked(getEnv).mockReturnValueOnce({ STRIPE_SECRET_KEY: null } as any);

    const app = createApp();
    const res = await request(app).post('/webhooks/stripe').send({});
    expect(res.status).toBe(500);
  });

  it('returns 400 when Stripe signature verification fails', async () => {
    const { getEnv } = await import('@app/shared');
    vi.mocked(getEnv).mockReturnValueOnce({
      STRIPE_SECRET_KEY: 'sk_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    } as any);

    const app = createApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'invalid_sig')
      .send({ type: 'checkout.session.completed' });

    expect(res.status).toBe(400);
  });

  it('processes checkout.session.completed event and updates organization plan', async () => {
    const { getEnv } = await import('@app/shared');
    vi.mocked(getEnv).mockReturnValue({
      STRIPE_SECRET_KEY: 'sk_test',
      STRIPE_PRO_PRICE_ID: 'price_pro',
    } as any);

    const app = createApp();
    const payload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { orgId: 'org_1' },
          subscription: 'sub_123',
        },
      },
    };

    const res = await request(app).post('/webhooks/stripe').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('processes customer.subscription.deleted event and resets organization to FREE plan', async () => {
    const { getEnv } = await import('@app/shared');
    vi.mocked(getEnv).mockReturnValue({ STRIPE_SECRET_KEY: 'sk_test' } as any);

    const app = createApp();
    const payload = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          metadata: { orgId: 'org_1' },
        },
      },
    };

    const res = await request(app).post('/webhooks/stripe').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
