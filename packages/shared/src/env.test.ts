import { describe, expect, it, beforeEach } from 'vitest';
import { getEnv, __resetEnvCacheForTests } from './env.js';

const validEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/support_platform',
  REDIS_URL: 'redis://localhost:6379',
  CLERK_SECRET_KEY: 'sk_test_123',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
};

describe('getEnv', () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
  });

  it('parses a valid environment and applies defaults', () => {
    const env = getEnv(validEnv as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(4000);
    expect(env.WEB_PORT).toBe(3000);
    expect(env.PINECONE_INDEX_NAME).toBe('support-platform');
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _drop, ...rest } = validEnv;
    expect(() => getEnv(rest as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it('throws when REDIS_URL is not a valid URL', () => {
    expect(() =>
      getEnv({ ...validEnv, REDIS_URL: 'not-a-url' } as NodeJS.ProcessEnv),
    ).toThrow(/REDIS_URL/);
  });

  it('coerces numeric ports from string env vars', () => {
    const env = getEnv({ ...validEnv, API_PORT: '5001' } as unknown as NodeJS.ProcessEnv);
    expect(env.API_PORT).toBe(5001);
  });
});
