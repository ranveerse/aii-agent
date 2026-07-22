import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env.local (if present) overrides .env, matching Next.js's own convention.
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

const url = `mysql://${encodeURIComponent(process.env.MYSQL_USER ?? '')}:${encodeURIComponent(
  process.env.MYSQL_PASSWORD ?? '',
)}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url,
  },
});
