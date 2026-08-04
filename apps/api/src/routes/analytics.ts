import { Router, type Request, type Response, type NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyticsRouter: Router = Router();

function requireOrgAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId, orgSlug } = getAuth(req);
  if (!userId || !orgSlug) {
    res.status(401).json({ error: 'Unauthorized or no active organization' });
    return;
  }
  next();
}

analyticsRouter.use(requireOrgAuth);

// GET /analytics/overview
// Returns summary stats: total conversations, resolution rate, handoff rate, avg messages
analyticsRouter.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug as string },
    select: { id: true },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const [total, resolved, handoff, messageAgg] = await Promise.all([
    prisma.conversation.count({
      where: { organizationId: org.id },
    }),
    prisma.conversation.count({
      where: { organizationId: org.id, status: 'RESOLVED' },
    }),
    prisma.conversation.count({
      where: { organizationId: org.id, status: 'PENDING_HUMAN' },
    }),
    prisma.message.aggregate({
      where: { conversation: { organizationId: org.id } },
      _count: { id: true },
    }),
  ]);

  const totalMessages = messageAgg._count.id;
  const avgMessages = total > 0 ? Math.round((totalMessages / total) * 10) / 10 : 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const handoffRate = total > 0 ? Math.round((handoff / total) * 100) : 0;

  res.json({
    totalConversations: total,
    totalMessages,
    resolutionRate,
    handoffRate,
    avgMessagesPerConversation: avgMessages,
  });
}));

// GET /analytics/volume?days=30
// Returns conversation count per day for the last N days
analyticsRouter.get('/volume', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);
  const days = Math.min(Number(req.query['days']) || 30, 90);

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug as string },
    select: { id: true },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: org.id, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Build a map of date → count
  const countByDate = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    countByDate.set(key, 0);
  }
  for (const c of conversations) {
    const key = c.createdAt.toISOString().slice(0, 10);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const data = Array.from(countByDate.entries()).map(([date, count]) => ({ date, count }));
  res.json({ data });
}));

// GET /analytics/status-breakdown
// Returns count per conversation status
analyticsRouter.get('/status-breakdown', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug as string },
    select: { id: true },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const grouped = await prisma.conversation.groupBy({
    by: ['status'],
    where: { organizationId: org.id },
    _count: { id: true },
  });

  const data = grouped.map((g) => ({
    status: g.status,
    count: g._count.id,
  }));

  res.json({ data });
}));

// GET /analytics/top-questions?limit=10
// Returns the most recent unique customer messages as a proxy for top questions
analyticsRouter.get('/top-questions', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);
  const limit = Math.min(Number(req.query['limit']) || 10, 50);

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug as string },
    select: { id: true },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  // Get recent customer messages, deduplicate by content similarity (exact match for now)
  const messages = await prisma.message.findMany({
    where: {
      sender: 'CUSTOMER',
      conversation: { organizationId: org.id },
    },
    select: { content: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  // Count occurrences of each message
  const countMap = new Map<string, number>();
  for (const m of messages) {
    const key = m.content.trim().toLowerCase();
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const data = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([question, count]) => ({ question, count }));

  res.json({ data });
}));
