import { Router, type Request, type Response, type NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '@app/database';
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

// GET /organizations/api-key
orgRouter.get('/api-key', async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);
  if (!orgSlug) {
    res.status(400).json({ error: 'Missing orgSlug' });
    return;
  }
  
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string },
    update: {},
    select: { publicApiKey: true },
  });

  res.json({ publicApiKey: org.publicApiKey });
});

// POST /organizations/api-key/generate
orgRouter.post('/api-key/generate', async (req: Request, res: Response) => {
  const { orgSlug, orgId } = getAuth(req);
  if (!orgSlug) {
    res.status(400).json({ error: 'Missing orgSlug' });
    return;
  }
  
  // Generate a random API key (e.g., ai_live_xxxxxxxxxxxxxxxx)
  const newKey = `ai_live_${crypto.randomBytes(24).toString('hex')}`;

  const updatedOrg = await prisma.organization.upsert({
    where: { slug: orgSlug as string },
    create: { slug: orgSlug as string, name: orgId ?? orgSlug as string, publicApiKey: newKey },
    update: { publicApiKey: newKey },
    select: { publicApiKey: true },
  });

  res.json({ publicApiKey: updatedOrg.publicApiKey });
});
