/**
 * Domain-level shared types. These mirror the Prisma schema at a glance
 * but stay hand-written so apps can import lightweight types without
 * pulling in the Prisma client (e.g. from the Next.js edge runtime).
 */

export type OrganizationPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'AGENT';

export type KnowledgeSourceType = 'PDF' | 'TEXT' | 'WEBSITE';

export type KnowledgeSourceStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export type ConversationStatus = 'OPEN' | 'PENDING_HUMAN' | 'RESOLVED' | 'CLOSED';

export type MessageSender = 'CUSTOMER' | 'AI' | 'AGENT';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}
