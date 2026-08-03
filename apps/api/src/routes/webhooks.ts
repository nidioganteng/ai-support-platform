import { Router, type Request, type Response } from 'express';
import { Webhook } from 'svix';
import { prisma, OrganizationRole } from '@app/database';
import { getEnv } from '@app/shared';
import crypto from 'crypto';

export const webhooksRouter: Router = Router();

export interface CustomRequest extends Request {
  rawBody?: string;
}

/**
 * Maps Clerk membership role string to Prisma OrganizationRole enum.
 */
export function mapClerkRoleToRole(clerkRole: string): OrganizationRole {
  const normalized = clerkRole.toLowerCase();
  if (normalized.includes('owner') || normalized === 'admin') {
    return OrganizationRole.OWNER;
  }
  if (normalized.includes('admin')) {
    return OrganizationRole.ADMIN;
  }
  return OrganizationRole.AGENT;
}

webhooksRouter.post('/clerk', async (req: CustomRequest, res: Response) => {
  const env = getEnv();
  const webhookSecret = env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ error: 'CLERK_WEBHOOK_SECRET is not configured' });
    return;
  }

  const svixId = req.headers['svix-id'] as string | undefined;
  const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
  const svixSignature = req.headers['svix-signature'] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: 'Missing svix verification headers' });
    return;
  }

  const rawBody = req.rawBody ?? JSON.stringify(req.body);

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

interface ClerkUserData {
  id?: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
  slug?: string;
  name?: string;
  user_id?: string;
  role?: string;
  public_user_data?: { user_id?: string };
  organization?: { id?: string; slug?: string; name?: string };
}

  const eventType = evt.type;
  const data = evt.data as ClerkUserData;

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const clerkUserId = data.id as string;
        const email = data.email_addresses?.[0]?.email_address as string | undefined;
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

        if (!email) {
          res.status(400).json({ error: 'User missing email address' });
          return;
        }

        await prisma.user.upsert({
          where: { clerkUserId },
          create: { clerkUserId, email, name },
          update: { email, name },
        });
        break;
      }

      case 'user.deleted': {
        const clerkUserId = data.id as string;
        await prisma.user.deleteMany({
          where: { clerkUserId },
        });
        break;
      }

      case 'organization.created':
      case 'organization.updated': {
        const name = data.name as string;
        const slug = (data.slug as string) || (data.id as string);
        const newKey = `ai_live_${crypto.randomBytes(24).toString('hex')}`;

        await prisma.organization.upsert({
          where: { slug },
          create: { name, slug, publicApiKey: newKey },
          update: { name },
        });
        break;
      }

      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        const clerkUserId = (data.public_user_data?.user_id || data.user_id) as string;
        const orgSlug = (data.organization?.slug || data.organization?.id) as string | undefined;
        const orgName = (data.organization?.name || orgSlug || 'Default Org') as string;
        const clerkRole = (data.role || 'member') as string;

        if (!clerkUserId || !orgSlug) {
          res.status(400).json({ error: 'Missing user or organization identifiers in membership event' });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { clerkUserId },
        });

        if (!user) {
          res.status(404).json({ error: `User with clerkUserId ${clerkUserId} not found` });
          return;
        }

        const newKey = `ai_live_${crypto.randomBytes(24).toString('hex')}`;
        const org = await prisma.organization.upsert({
          where: { slug: orgSlug },
          create: { name: orgName, slug: orgSlug, publicApiKey: newKey },
          update: { name: orgName },
        });

        const role = mapClerkRoleToRole(clerkRole);

        await prisma.membership.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: org.id,
            },
          },
          create: {
            userId: user.id,
            organizationId: org.id,
            role,
          },
          update: {
            role,
          },
        });
        break;
      }

      case 'organizationMembership.deleted': {
        const clerkUserId = (data.public_user_data?.user_id || data.user_id) as string;
        const orgSlug = (data.organization?.slug || data.organization?.id) as string | undefined;

        if (clerkUserId && orgSlug) {
          const user = await prisma.user.findUnique({ where: { clerkUserId } });
          const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });

          if (user && org) {
            await prisma.membership.deleteMany({
              where: { userId: user.id, organizationId: org.id },
            });
          }
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    res.status(200).json({ success: true, received: eventType });
  } catch {
    res.status(500).json({ error: 'Failed to process webhook event' });
  }
});
