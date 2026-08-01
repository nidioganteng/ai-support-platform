import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(() => ({ userId: null, orgSlug: null, orgId: null })),
}));

vi.mock('@app/database', () => ({
  prisma: {
    organization: {
      upsert: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
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
  const mockOrg = { id: 'org-1', slug: 'acme', name: 'Acme' };
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
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuth).mockReturnValue({ userId: null } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).post('/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when no org selected', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user-1',
      orgSlug: null,
      orgId: null,
    } as unknown as ReturnType<typeof getAuth>);
    const app = createApp();
    const res = await request(app).post('/chat').send({ message: 'hello' });
    expect(res.status).toBe(403);
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
