import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(() => ({ userId: null, orgSlug: null, orgId: null })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email_1' }) },
  })),
}));

vi.mock('@app/database', () => ({
  prisma: {
    organization: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@app/shared', () => ({
  getEnv: vi.fn(() => ({
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://test',
    OPENAI_API_KEY: null,
    PINECONE_API_KEY: null,
    PINECONE_INDEX_NAME: 'test-index',
    NEXT_PUBLIC_API_URL: 'http://localhost:4000',
  })),
}));

import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';

describe('POST /chat', () => {
  const mockOrg = { id: 'org-1', slug: 'acme', name: 'Acme', plan: 'FREE' };
  const mockConversation = { id: 'conv-1', organizationId: 'org-1', status: 'OPEN' };
  const mockAiMessage = {
    id: 'msg-2',
    conversationId: 'conv-1',
    sender: 'AI',
    content: 'The AI service is not configured yet. Please set OPENAI_API_KEY and PINECONE_API_KEY.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
      orgId: 'clerk-org-1',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue(mockOrg as never);
    vi.mocked(prisma.conversation.create).mockResolvedValue(mockConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(mockAiMessage as never);
    vi.mocked(prisma.conversation.count).mockResolvedValue(0 as never);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: null } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).post('/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when no org selected', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: null,
      orgId: null,
    } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).post('/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when message is missing', async () => {
    const app = createApp();
    const res = await request(app).post('/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'message is required' });
  });

  it('creates a new conversation and returns AI response', async () => {
    const app = createApp();
    const res = await request(app).post('/chat').send({ message: 'What is your refund policy?' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('conversationId', 'conv-1');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('sources');
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it('returns 404 when conversationId does not exist', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null);
    const app = createApp();
    const res = await request(app)
      .post('/chat')
      .send({ message: 'hello', conversationId: 'nonexistent' });
    expect(res.status).toBe(404);
  });
});

describe('GET /conversations', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
      orgId: 'clerk-org-1',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue({
      id: 'org-1',
      slug: 'acme',
      name: 'Acme',
    } as never);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: null } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).get('/conversations');
    expect(res.status).toBe(401);
  });

  it('returns 403 when no org selected', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: null,
    } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).get('/conversations');
    expect(res.status).toBe(403);
  });

  it('returns list of conversations', async () => {
    const app = createApp();
    const res = await request(app).get('/conversations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /conversations/:id', () => {
  const mockConversation = {
    id: 'conv-1',
    organizationId: 'org-1',
    status: 'OPEN',
    messages: [],
  };

  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
      orgId: 'clerk-org-1',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue({
      id: 'org-1',
      slug: 'acme',
      name: 'Acme',
    } as never);
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(mockConversation as never);
  });

  it('returns conversation with messages', async () => {
    const app = createApp();
    const res = await request(app).get('/conversations/conv-1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'conv-1');
    expect(res.body).toHaveProperty('messages');
  });

  it('returns 404 for unknown conversation', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null);
    const app = createApp();
    const res = await request(app).get('/conversations/unknown');
    expect(res.status).toBe(404);
  });
});

describe('GET /chat/messages (Widget polling)', () => {
  it('returns 400 if x-org-key or conversationId is missing', async () => {
    const app = createApp();
    const res = await request(app).get('/chat/messages');
    expect(res.status).toBe(400);
  });

  it('returns 401 if public API key is invalid', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .get('/chat/messages?conversationId=conv-1')
      .set('x-org-key', 'invalid_key');
    expect(res.status).toBe(401);
  });

  it('returns conversation status and messages for valid request', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({ id: 'org-1' } as any);
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({
      id: 'conv-1',
      status: 'OPEN',
      messages: [{ id: 'msg-1', content: 'Hello' }],
    } as any);

    const app = createApp();
    const res = await request(app)
      .get('/chat/messages?conversationId=conv-1')
      .set('x-org-key', 'valid_key');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'OPEN',
      messages: [{ id: 'msg-1', content: 'Hello' }],
    });
  });
});

describe('POST /conversations/:id/reply (Agent Reply)', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue({ id: 'org-1' } as any);
  });

  it('returns 400 when message is missing or blank', async () => {
    const app = createApp();
    const res = await request(app).post('/conversations/conv-1/reply').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when conversation not found', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .post('/conversations/conv-1/reply')
      .send({ message: 'Agent reply' });
    expect(res.status).toBe(404);
  });

  it('creates AGENT message and updates conversation timestamp', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({ id: 'conv-1' } as any);
    vi.mocked(prisma.message.create).mockResolvedValueOnce({
      id: 'msg-agent-1',
      sender: 'AGENT',
      content: 'Agent reply text',
    } as any);
    vi.mocked(prisma.conversation.update).mockResolvedValueOnce({ id: 'conv-1' } as any);

    const app = createApp();
    const res = await request(app)
      .post('/conversations/conv-1/reply')
      .send({ message: 'Agent reply text' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sender', 'AGENT');
  });
});

describe('PATCH /conversations/:id (Status Update)', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue({ id: 'org-1' } as any);
  });

  it('returns 400 for invalid status', async () => {
    const app = createApp();
    const res = await request(app).patch('/conversations/conv-1').send({ status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('updates conversation status successfully', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({ id: 'conv-1' } as any);
    vi.mocked(prisma.conversation.update).mockResolvedValueOnce({
      id: 'conv-1',
      status: 'RESOLVED',
    } as any);

    const app = createApp();
    const res = await request(app).patch('/conversations/conv-1').send({ status: 'RESOLVED' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'RESOLVED');
  });
});

describe('GET /conversations/:id/suggestions (AI Suggestions)', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: 'acme',
    } as unknown as ReturnType<typeof getAuth>);
    vi.mocked(prisma.organization.upsert).mockResolvedValue({ id: 'org-1' } as any);
  });

  it('returns empty suggestions when no AI key is configured', async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({
      id: 'conv-1',
      messages: [{ sender: 'CUSTOMER', content: 'Help me' }],
    } as any);

    const app = createApp();
    const res = await request(app).get('/conversations/conv-1/suggestions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestions: [] });
  });
});
