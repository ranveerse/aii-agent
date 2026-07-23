import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { rawEnv } from '@/lib/rawEnv';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const env = rawEnv();
  // Pooled connection (pgbouncer, port 6543) — safe for serverless runtime queries.
  // Migrations use DIRECT_URL instead, see prisma.config.ts.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
