import { z } from 'zod';

/**
 * Full environment schema for the platform.
 *
 * Individual services (api/worker/web) only read the keys they need,
 * but we validate against one shared schema so every service agrees
 * on the shape/types of shared config (DATABASE_URL, REDIS_URL, etc).
 *
 * Secrets are optional at this stage (Phase 0) since most integrations
 * (Clerk, OpenAI, Pinecone, Resend, Stripe) are wired in later phases.
 * They become required via `.min(1)` once the corresponding phase lands.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),

  CLERK_SECRET_KEY: z.string().min(1, 'Required'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Required'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().default('support-platform'),

  RESEND_API_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Parses and validates `process.env` once, then caches the result.
 * Throws with a readable message (listing every missing/invalid var)
 * if validation fails, so misconfiguration is caught at boot time
 * instead of failing mysteriously mid-request.
 */
export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Test-only helper to reset the cache between test cases. */
export function __resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
