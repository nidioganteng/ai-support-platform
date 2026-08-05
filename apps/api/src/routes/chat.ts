import { Router, type Request, type Response, type NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { prisma } from '@app/database';
import { getEnv } from '@app/shared';
import { PLAN_LIMITS } from './billing.js';
import crypto from 'crypto';

export const chatRouter: Router = Router();
export const conversationsRouter: Router = Router();

function requireOrgAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

async function getOrUpsertOrg(orgSlug: string, orgId: string | null) {
    const newKey = `ai_live_${crypto.randomBytes(24).toString('hex')}`;
    return prisma.organization.upsert({
      where: { slug: orgSlug },
      create: { slug: orgSlug, name: orgId ?? orgSlug, publicApiKey: newKey },
      update: {},
    });
}

export interface ChatSource {
  sourceId: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface OrgPersona {
  botName: string;
  botTone: string;
  fallbackMessage: string;
}

export async function runRagPipeline(
  question: string,
  organizationId: string,
  orgName: string,
  persona?: OrgPersona,
): Promise<{ answer: string; sources: ChatSource[]; requiresHandoff: boolean }> {
  const env = getEnv();

  const provider = env.AI_PROVIDER;
  const apiKey = provider === 'gemini' ? env.GEMINI_API_KEY : provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

  if (!apiKey || !env.PINECONE_API_KEY) {
    return {
      answer:
        'The AI service is not configured yet. Please set your AI provider API key and PINECONE_API_KEY.',
      sources: [],
      requiresHandoff: false,
    };
  }

  let baseURL: string | undefined = undefined;
  let chatModel = 'gpt-4o-mini';
  let embedModel = 'text-embedding-3-small';

  if (provider === 'gemini') {
    baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    chatModel = 'gemini-2.5-flash';
    embedModel = 'text-embedding-004';
  }
  // Anthropic requires a different SDK structure or proxy for embeddings, so we just pass through for now if anthropic is set.

  const openai = new OpenAI({ apiKey, baseURL });
  const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const index = pc.index(env.PINECONE_INDEX_NAME);

  // 1. Embed the question
  let questionVector: number[];
  
  if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-2',
        content: { parts: [{ text: question }] },
        outputDimensionality: 1536
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini embedding failed: ${err}`);
    }
    const data = (await res.json()) as { embedding: { values: number[] } };
    questionVector = data.embedding.values;
  } else {
    const embeddingRes = await openai.embeddings.create({
      model: embedModel,
      input: question,
    });
    questionVector = embeddingRes.data[0]?.embedding ?? [];
  }

  // 2. Similarity search scoped to this organization's namespace
  const queryRes = await index.namespace(organizationId).query({
    vector: questionVector,
    topK: 5,
    includeMetadata: true,
  });

  const sources: ChatSource[] = (queryRes.matches ?? [])
    .filter((m) => (m.score ?? 0) > 0.3)
    .map((m) => ({
      sourceId: (m.metadata?.['sourceId'] as string | undefined) ?? '',
      chunkIndex: (m.metadata?.['chunkIndex'] as number | undefined) ?? 0,
      text: (m.metadata?.['text'] as string | undefined) ?? '',
      score: m.score ?? 0,
    }))
    .filter((s) => s.text.length > 0);

  const isLowConfidence = sources.length === 0;

  const explicitHandoffPatterns = [
    /talk to (a )?(human|agent|person)/i,
    /speak to (a )?(human|agent|person)/i,
    /live agent/i,
    /customer (service|support)/i,
    /bantuan manusia/i,
    /bicara dengan (admin|operator|manusia)/i,
    /hubungi admin/i
  ];
  const isExplicitRequest = explicitHandoffPatterns.some(p => p.test(question));

  if (isExplicitRequest || isLowConfidence) {
    return {
      answer: persona?.fallbackMessage ?? "I'm connecting you with a human agent",
      sources,
      requiresHandoff: true,
    };
  }

  // 3. Assemble prompt with retrieved context
  const contextBlock = sources.map((s, i) => `[Source ${i + 1}]:\n${s.text}`).join('\n\n');

  const botName = persona?.botName ?? 'AI Assistant';
  const toneInstruction =
    persona?.botTone === 'FRIENDLY'
      ? 'Be warm, approachable, and friendly in tone.'
      : persona?.botTone === 'CONCISE'
        ? 'Be as brief and direct as possible. Avoid filler words.'
        : 'Be professional and clear.';

  const systemPrompt = `You are ${botName}, an AI customer support assistant for ${orgName}.
${toneInstruction}
IMPORTANT: Detect the language of the user's message and always respond in that same language.
Answer the user's question using ONLY the context provided below.
If the answer is not in the context, say the equivalent of "I don't have information about that in my knowledge base." in the user's language.
Never make up information. Cite sources by referencing [Source N] when relevant.

Context:
${contextBlock}`;

  // 4. Generate answer
  const completion = await openai.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  });

  const answer =
    completion.choices[0]?.message.content ??
    "I'm unable to generate a response at this time.";

  return { answer, sources, requiresHandoff: false };
}

// GET /chat/messages - Widget polling endpoint to fetch conversation history & agent replies
chatRouter.get('/messages', async (req: Request, res: Response) => {
  const publicApiKey = req.headers['x-org-key'] as string;
  const conversationId = req.query['conversationId'] as string;

  if (!publicApiKey || !conversationId) {
    res.status(400).json({ error: 'x-org-key and conversationId are required' });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { publicApiKey },
  });

  if (!org) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId: org.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({
    status: conversation.status,
    messages: conversation.messages,
  });
});

// POST /chat
chatRouter.post(
  '/',
  async (req: Request, res: Response) => {
    let org;

    // Check for public API key first (Widget access)
    const publicApiKey = req.headers['x-org-key'] as string;
    if (publicApiKey) {
      org = await prisma.organization.findUnique({
        where: { publicApiKey },
      });
      if (!org) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      // Enforce allowed domains whitelist (skip if no domains configured)
      if (org.allowedDomains.length > 0) {
        const origin = req.headers['origin'] ?? '';
        const hostname = origin.replace(/^https?:\/\//, '').split(':')[0] ?? '';
        const allowed = org.allowedDomains.some(
          (d) => hostname === d || hostname.endsWith(`.${d}`),
        );
        if (!allowed) {
          res.status(403).json({ error: 'Origin not allowed' });
          return;
        }
      }
    } else {
      // Fallback to Clerk Auth (Dashboard access)
      const { userId, orgSlug, orgId } = getAuth(req);
      if (!userId || !orgSlug) {
        res.status(401).json({ error: 'Unauthorized or no active organization' });
        return;
      }
      org = await getOrUpsertOrg(orgSlug, orgId ?? null);
    }

    const { message, conversationId } = req.body as {
      message?: string;
      conversationId?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, organizationId: org.id },
      });
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
    } else {
      // Enforce monthly conversation limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const convCount = await prisma.conversation.count({
        where: { organizationId: org.id, createdAt: { gte: startOfMonth } },
      });
      const limit = PLAN_LIMITS[org.plan].conversationsPerMonth;
      if (convCount >= limit) {
        res.status(403).json({
          error: `Monthly conversation limit reached (${limit} on ${org.plan} plan). Upgrade to continue.`,
          code: 'LIMIT_EXCEEDED',
        });
        return;
      }

      conversation = await prisma.conversation.create({
        data: { organizationId: org.id, status: 'OPEN' },
      });
    }

    // Persist customer message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'CUSTOMER',
        content: message.trim(),
      },
    });

    // Check if we are already waiting for a human
    if (conversation.status === 'PENDING_HUMAN') {
      res.status(200).json({
        conversationId: conversation.id,
        message: null,
        sources: [],
      });
      return;
    }

    // Run RAG pipeline
    let answer: string;
    let sources: ChatSource[];
    let requiresHandoff = false;
    try {
      ({ answer, sources, requiresHandoff } = await runRagPipeline(
        message.trim(),
        org.id,
        org.name,
        {
          botName: org.botName,
          botTone: org.botTone,
          fallbackMessage: org.fallbackMessage,
        },
      ));
    } catch (ragErr) {
      const msg = ragErr instanceof Error ? ragErr.message : String(ragErr);
      const isQuota = msg.includes('insufficient_quota') || msg.includes('exceeded your current quota');
      answer = isQuota
        ? 'OpenAI quota exceeded. Please add billing credits at platform.openai.com.'
        : `AI service error: ${msg}`;
      sources = [];
    }

    // Persist AI response
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AI',
        content: answer,
      },
    });

    if (requiresHandoff) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PENDING_HUMAN' },
      });

      // fire-and-forget email notification — respects org notification preferences
      const env = getEnv();
      if (env.RESEND_API_KEY && org.notifyOnHandoff) {
        const { Resend } = await import('resend');
        const resend = new Resend(env.RESEND_API_KEY);

        const firstMsg = await prisma.message.findFirst({
          where: { conversationId: conversation.id, sender: 'CUSTOMER' },
          orderBy: { createdAt: 'asc' },
        });

        const ticketUrl = `${env.NEXT_PUBLIC_API_URL?.replace(':4000', ':3000') ?? 'http://localhost:3000'}/dashboard/conversations?id=${conversation.id}`;
        const customerInfo = conversation.customerEmail ?? 'Anonymous visitor';

        // Use org notifyEmail if set, otherwise fall back to all admins/owners
        const recipients: string[] = [];
        if (org.notifyEmail) {
          recipients.push(org.notifyEmail);
        } else {
          const admins = await prisma.membership.findMany({
            where: { organizationId: org.id, role: { in: ['OWNER', 'ADMIN'] } },
            include: { user: true },
          });
          recipients.push(...admins.map((m) => m.user.email));
        }

        for (const to of recipients) {
          resend.emails.send({
            from: 'AI Support <onboarding@resend.dev>',
            to,
            subject: `New ticket: customer needs human help`,
            html: `<h2>New Support Ticket</h2>
              <p><strong>Customer:</strong> ${customerInfo}</p>
              <p><strong>First message:</strong></p>
              <blockquote>${firstMsg?.content ?? '(no message)'}</blockquote>
              <p><a href="${ticketUrl}">View ticket in dashboard →</a></p>`,
          }).catch((err: unknown) => console.error('Resend email failed:', err));
        }
      }
    }

    res.status(201).json({
      conversationId: conversation.id,
      message: aiMessage,
      sources: sources.map(({ sourceId, chunkIndex, text }) => ({
        sourceId,
        chunkIndex,
        text,
      })),
    });
  },
);

// GET /conversations
conversationsRouter.get(
  '/',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug, orgId } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const org = await getOrUpsertOrg(orgSlug, orgId ?? null);

    const conversations = await prisma.conversation.findMany({
      where: { organizationId: org.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    res.json(conversations);
  },
);

// GET /conversations/:id
conversationsRouter.get(
  '/:id',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug, orgId } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const org = await getOrUpsertOrg(orgSlug, orgId ?? null);

    const paramId = req.params['id'];
    if (!paramId) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: paramId, organizationId: org.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(conversation);
  },
);

// POST /conversations/:id/reply - Send message as AGENT
conversationsRouter.post(
  '/:id/reply',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug, orgId } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const org = await getOrUpsertOrg(orgSlug, orgId ?? null);
    const paramId = req.params['id'];
    if (!paramId) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    const { message } = req.body as { message?: string };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: paramId, organizationId: org.id },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const agentMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'AGENT',
        content: message.trim(),
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(agentMessage);
  },
);

// PATCH /conversations/:id - Update status (RESOLVED, PENDING_HUMAN, OPEN, CLOSED)
conversationsRouter.patch(
  '/:id',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug, orgId } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const org = await getOrUpsertOrg(orgSlug, orgId ?? null);
    const paramId = req.params['id'];
    if (!paramId) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    const { status } = req.body as { status?: string };

    if (!status || !['OPEN', 'PENDING_HUMAN', 'RESOLVED', 'CLOSED'].includes(status)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: paramId, organizationId: org.id },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const updated = await prisma.conversation.update({
      where: { id: paramId },
      data: { status: status as any },
    });

    res.json(updated);
  },
);

// GET /conversations/:id/suggestions — AI-suggested replies for agents
conversationsRouter.get(
  '/:id/suggestions',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug, orgId } = getAuth(req);
    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const org = await getOrUpsertOrg(orgSlug, orgId ?? null);
    const paramId = req.params['id'];
    if (!paramId) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: paramId, organizationId: org.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const env = getEnv();
    const provider = env.AI_PROVIDER;
    const apiKey = provider === 'gemini' ? env.GEMINI_API_KEY : provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

    if (!apiKey) {
      res.json({ suggestions: [] });
      return;
    }

    const baseURL = provider === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
      : undefined;
    const model = provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
    const openai = new OpenAI({ apiKey, baseURL });

    const transcript = conversation.messages
      .map((m) => `${m.sender}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a helpful support agent assistant. Based on the conversation transcript, generate exactly 3 short, helpful reply suggestions for the human support agent to send to the customer.
Detect the language used by the customer and write all suggestions in that same language.
Return ONLY a JSON array of 3 strings, no explanation. Example: ["Reply 1", "Reply 2", "Reply 3"]`,
        },
        { role: 'user', content: `Conversation:\n${transcript}` },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    let suggestions: string[] = [];
    try {
      const raw = completion.choices[0]?.message.content ?? '[]';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      suggestions = JSON.parse(cleaned) as string[];
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      suggestions = [];
    }

    res.json({ suggestions: suggestions.slice(0, 3) });
  },
);

