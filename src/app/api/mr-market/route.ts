import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeMrMarketComposite } from '@/lib/mrMarket';
import { mrMarketCreateSchema } from '@/lib/validation/mrMarket';

export async function GET() {
  const row = await prisma.mrMarketReading.findFirst({ orderBy: { asOf: 'desc' } });

  if (!row) {
    // Normal "no data yet" state — 200 + null, not 404, so the frontend never
    // needs a non-2xx branch for what is a completely expected empty state.
    return NextResponse.json(null);
  }

  return NextResponse.json({
    as_of: row.asOf.toISOString().slice(0, 10),
    composite_score: row.compositeScore,
    zone: row.zone,
    reading: row.reading,
    components: row.components,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = mrMarketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Mr. Market payload', issues: parsed.error.issues }, { status: 400 });
  }

  let result;
  try {
    // The only place the percentile -> orient -> weight -> composite arithmetic runs.
    result = computeMrMarketComposite(parsed.data.components);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid components' }, { status: 400 });
  }

  const row = await prisma.mrMarketReading.upsert({
    where: { asOf: new Date(parsed.data.as_of) },
    create: {
      asOf: new Date(parsed.data.as_of),
      compositeScore: result.composite_score,
      zone: result.zone,
      reading: result.reading,
      components: result.components,
    },
    update: {
      compositeScore: result.composite_score,
      zone: result.zone,
      reading: result.reading,
      components: result.components,
    },
  });

  return NextResponse.json(
    {
      as_of: row.asOf.toISOString().slice(0, 10),
      composite_score: row.compositeScore,
      zone: row.zone,
      reading: row.reading,
      components: row.components,
    },
    { status: 201 },
  );
}
