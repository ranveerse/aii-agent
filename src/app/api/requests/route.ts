import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stockRequestCreateSchema } from '@/lib/validation/stockRequest';

export async function GET() {
  const rows = await prisma.stockRequest.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      ticker: row.ticker,
      requested_at: row.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = stockRequestCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid stock request payload', issues: parsed.error.issues }, { status: 400 });
  }

  const row = await prisma.stockRequest.create({
    data: { ticker: parsed.data.ticker },
  });

  return NextResponse.json(
    { id: row.id, ticker: row.ticker, requested_at: row.createdAt.toISOString() },
    { status: 201 },
  );
}
