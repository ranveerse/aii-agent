import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Admin-only: lists every stored reading, not just the latest one that the
// public GET /api/mr-market (used by the live site) returns.
export async function GET() {
  const rows = await prisma.mrMarketReading.findMany({ orderBy: { asOf: 'desc' } });
  return NextResponse.json(
    rows.map((row) => ({
      as_of: row.asOf.toISOString().slice(0, 10),
      composite_score: row.compositeScore,
      zone: row.zone,
      reading: row.reading,
      components: row.components,
    })),
  );
}
