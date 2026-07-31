import { PrismaClient } from './generated/client/index.js';

/**
 * Singleton PrismaClient. In dev, Node's module cache combined with
 * hot-reload can otherwise spawn a new client (and new connection
 * pool) per file edit, which exhausts Postgres connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './generated/client/index.js';
