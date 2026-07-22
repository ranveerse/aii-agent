import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const row = await prisma.report.findUnique({ where: { ticker: ticker.toUpperCase() } });

  if (!row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(row.raw);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  try {
    await prisma.report.delete({ where: { ticker: ticker.toUpperCase() } });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
