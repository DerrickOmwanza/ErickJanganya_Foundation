import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient across hot reloads in dev so we don't exhaust
// the Postgres connection pool every time `node --watch` restarts the file.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
