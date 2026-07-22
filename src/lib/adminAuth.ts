import { createHmac, timingSafeEqual } from 'crypto';
import { rawEnv } from '@/lib/rawEnv';

export const ADMIN_COOKIE = 'admin_session';

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function sessionToken(): string {
  const secret = rawEnv().ADMIN_PASSWORD ?? '';
  return createHmac('sha256', secret).update('admin-session').digest('hex');
}

/** Exposed so the login route can mint a cookie without recomputing the HMAC itself. */
export function currentSessionToken(): string {
  return sessionToken();
}

export function verifyPassword(password: string): boolean {
  const secret = rawEnv().ADMIN_PASSWORD;
  return Boolean(secret) && constantTimeEqual(password, secret!);
}

export function isAuthed(cookieValue: string | undefined): boolean {
  if (!cookieValue || !rawEnv().ADMIN_PASSWORD) return false;
  return constantTimeEqual(cookieValue, sessionToken());
}
