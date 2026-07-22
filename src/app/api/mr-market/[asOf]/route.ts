import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(_request: Request, { params }: { params: Promise<{ asOf: string }> }) {
  const { asOf } = await params;
  const date = new Date(asOf);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  try {
    await prisma.mrMarketReading.delete({ where: { asOf: date } });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
