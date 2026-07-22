import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isAuthed } from '@/lib/adminAuth';

// Gates every mutating (and admin-only) route under /api/reports and
// /api/mr-market behind the admin login. The public, read-only GETs the live
// site depends on (list reports, one report by ticker, latest Mr. Market
// reading) are explicitly exempted below and stay open with no login required.
export const config = {
  matcher: ['/api/reports/:path*', '/api/mr-market/:path*'],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isPublicGet =
    method === 'GET' &&
    (pathname === '/api/reports' || /^\/api\/reports\/[^/]+$/.test(pathname) || pathname === '/api/mr-market');

  if (isPublicGet) {
    return NextResponse.next();
  }

  if (!isAuthed(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized — admin login required.' }, { status: 401 });
  }

  return NextResponse.next();
}
