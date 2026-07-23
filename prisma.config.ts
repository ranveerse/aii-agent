import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env.local (if present) overrides .env, matching Next.js's own convention.
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

// Migrations run against Supabase's direct connection (port 5432), not the
// pgbouncer pooler (port 6543) the app uses at runtime — pgbouncer's transaction
// mode doesn't support the prepared statements/DDL Prisma migrate needs.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
