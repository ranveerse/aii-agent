import { config as loadEnvFile } from 'dotenv';

// Next.js's built-in .env loader expands "$NAME" tokens inside values (so vars can
// reference each other), which silently mangles any secret containing a literal "$"
// followed by word characters into an empty string (see src/lib/prisma.ts's original
// bug with a MySQL password). Read the raw file contents ourselves instead of
// trusting process.env for anything that might contain "$". process.env stays the
// base layer for hosts that inject vars directly (no local .env files there, so
// nothing to mangle).
let cached: Record<string, string | undefined> | null = null;

export function rawEnv(): Record<string, string | undefined> {
  if (cached) return cached;
  const merged: Record<string, string | undefined> = { ...process.env };
  for (const file of ['.env', '.env.local']) {
    const parsed = loadEnvFile({ path: file, processEnv: {} }).parsed;
    if (parsed) Object.assign(merged, parsed);
  }
  cached = merged;
  return merged;
}
