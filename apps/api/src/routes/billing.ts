import { Router, type Request, type Response } from 'express';
import { getAuth } from '@clerk/express';
import Stripe from 'stripe';
import { prisma } from '@app/database';
import { getEnv } from '@app/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter: Router = Router();

export const PLAN_LIMITS = {
  FREE: { knowledgeSources: 3, conversationsPerMonth: 100 },
  PRO: { knowledgeSources: 20, conversationsPerMonth: 1000 },
  ENTERPRISE: { knowledgeSources: Infinity, conversationsPerMonth: Infinity },
};

function getStripe(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(env.STRIPE_SECRET_KEY);
}

function requireOrgAuth(req: Request, res: Response, next: () => void): void {
  const { userId, orgSlug } = getAuth(req);
  if (!userId || !orgSlug) {
    res.status(401).json({ error: 'Unauthorized or no active organization' });
    return;
  }
  next();
}

billingRouter.use(requireOrgAuth);

// GET /billing/status — plan, usage, limits
billingRouter.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string },
    update: {},
    select: { id: true, plan: true, currentPeriodEnd: true, stripeSubscriptionId: true },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sourceCount, convCount] = await Promise.all([
    prisma.knowledgeSource.count({ where: { organizationId: org.id } }),
    prisma.conversation.count({
      where: { organizationId: org.id, createdAt: { gte: startOfMonth } },
    }),
  ]);

  const limits = PLAN_LIMITS[org.plan];

  res.json({
    plan: org.plan,
    currentPeriodEnd: org.currentPeriodEnd,
    hasActiveSubscription: !!org.stripeSubscriptionId,
    usage: {
      knowledgeSources: { used: sourceCount, limit: limits.knowledgeSources },
      conversationsThisMonth: { used: convCount, limit: limits.conversationsPerMonth },
    },
  });
}));

// POST /billing/create-checkout — create Stripe Checkout session
billingRouter.post('/create-checkout', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);
  const env = getEnv();

  if (!env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: 'Stripe is not configured' });
    return;
  }

  const { plan } = req.body as { plan?: string };
  if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
    res.status(400).json({ error: 'plan must be PRO or ENTERPRISE' });
    return;
  }

  const priceId = plan === 'PRO' ? env.STRIPE_PRO_PRICE_ID : env.STRIPE_ENTERPRISE_PRICE_ID;
  if (!priceId) {
    res.status(503).json({ error: `STRIPE_${plan}_PRICE_ID is not configured` });
    return;
  }

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string },
    update: {},
    select: { id: true, stripeCustomerId: true },
  });

  const stripe = getStripe();

  // Reuse or create Stripe customer
  let customerId = org.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { orgId: org.id, orgSlug: orgSlug as string } });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const webUrl = env.NEXT_PUBLIC_WEB_URL;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${webUrl}/dashboard/billing?success=1`,
    cancel_url: `${webUrl}/dashboard/billing?canceled=1`,
    metadata: { orgId: org.id },
  });

  res.json({ url: session.url });
}));

// POST /billing/create-portal — Stripe Customer Portal session
billingRouter.post('/create-portal', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);
  const env = getEnv();

  if (!env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: 'Stripe is not configured' });
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug as string },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    res.status(400).json({ error: 'No Stripe customer found for this organization' });
    return;
  }

  const stripe = getStripe();
  const webUrl = env.NEXT_PUBLIC_WEB_URL;
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${webUrl}/dashboard/billing`,
  });

  res.json({ url: session.url });
}));
