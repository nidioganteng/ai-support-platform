import { Router, type Request, type Response, type NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';

export const orgRouter: Router = Router();

function requireOrgAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId, orgSlug } = getAuth(req);
  if (!userId || !orgSlug) {
    res.status(401).json({ error: 'Unauthorized or no active organization' });
    return;
  }
  next();
}

orgRouter.use(requireOrgAuth);

// GET /organizations/me
orgRouter.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string },
    update: {},
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      publicApiKey: true,
      widgetPrimaryColor: true,
      widgetPosition: true,
      widgetLabel: true,
      allowedDomains: true,
      botName: true,
      botTone: true,
      fallbackMessage: true,
      notifyEmail: true,
      notifyOnHandoff: true,
      notifyOnNewConversation: true,
    },
  });

  res.json({
    ...org,
    publicApiKey: org.publicApiKey
      ? `${org.publicApiKey.slice(0, 12)}...${org.publicApiKey.slice(-4)}`
      : null,
  });
}));

// PATCH /organizations/me
orgRouter.patch('/me', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug } = getAuth(req);

  const {
    widgetPrimaryColor,
    widgetPosition,
    widgetLabel,
    allowedDomains,
    botName,
    botTone,
    fallbackMessage,
    notifyEmail,
    notifyOnHandoff,
    notifyOnNewConversation,
  } = req.body as Record<string, unknown>;

  const validPositions = ['BOTTOM_RIGHT', 'BOTTOM_LEFT'];
  const validTones = ['PROFESSIONAL', 'FRIENDLY', 'CONCISE'];

  if (widgetPosition !== undefined && !validPositions.includes(widgetPosition as string)) {
    res.status(400).json({ error: 'Invalid widgetPosition' });
    return;
  }
  if (botTone !== undefined && !validTones.includes(botTone as string)) {
    res.status(400).json({ error: 'Invalid botTone' });
    return;
  }

  const data: Record<string, unknown> = {};
  if (widgetPrimaryColor !== undefined) data['widgetPrimaryColor'] = widgetPrimaryColor;
  if (widgetPosition !== undefined) data['widgetPosition'] = widgetPosition;
  if (widgetLabel !== undefined) data['widgetLabel'] = widgetLabel;
  if (allowedDomains !== undefined) data['allowedDomains'] = allowedDomains;
  if (botName !== undefined) data['botName'] = botName;
  if (botTone !== undefined) data['botTone'] = botTone;
  if (fallbackMessage !== undefined) data['fallbackMessage'] = fallbackMessage;
  if (notifyEmail !== undefined) data['notifyEmail'] = notifyEmail;
  if (notifyOnHandoff !== undefined) data['notifyOnHandoff'] = notifyOnHandoff;
  if (notifyOnNewConversation !== undefined) data['notifyOnNewConversation'] = notifyOnNewConversation;

  const org = await prisma.organization.update({
    where: { slug: orgSlug as string },
    data,
    select: {
      widgetPrimaryColor: true,
      widgetPosition: true,
      widgetLabel: true,
      allowedDomains: true,
      botName: true,
      botTone: true,
      fallbackMessage: true,
      notifyEmail: true,
      notifyOnHandoff: true,
      notifyOnNewConversation: true,
    },
  });

  res.json(org);
}));

// GET /organizations/api-key
orgRouter.get('/api-key', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string },
    update: {},
    select: { publicApiKey: true },
  });

  res.json({ publicApiKey: org.publicApiKey });
}));

// POST /organizations/api-key/generate
orgRouter.post('/api-key/generate', asyncHandler(async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);

  const newKey = `ai_live_${crypto.randomBytes(24).toString('hex')}`;

  const updatedOrg = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string, publicApiKey: newKey },
    update: { publicApiKey: newKey },
    select: { publicApiKey: true },
  });

  res.json({ publicApiKey: updatedOrg.publicApiKey });
}));
