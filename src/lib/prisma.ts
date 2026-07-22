import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';
import { rawEnv } from '@/lib/rawEnv';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const env = rawEnv();
  const adapter = new PrismaMariaDb({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT ? Number(env.MYSQL_PORT) : undefined,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
