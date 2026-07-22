import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isAuthed } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  return NextResponse.json({ authed: isAuthed(request.cookies.get(ADMIN_COOKIE)?.value) });
}
