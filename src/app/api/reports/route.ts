import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { asFiniteNumber, reportCreateSchema } from '@/lib/validation/report';

export async function GET() {
  const rows = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows.map((row) => row.raw));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = reportCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report payload', issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  const row = await prisma.report.upsert({
    where: { ticker: data.ticker },
    create: {
      ticker: data.ticker,
      companyName: data.company_name,
      currentPrice: asFiniteNumber(data.current_price),
      investmentGrade: data.investment_grade,
      compositeScore: asFiniteNumber(data.composite_score),
      adjustedMarginOfSafetyPct: asFiniteNumber(data.adjusted_margin_of_safety_percentage),
      piotroskiFScore: asFiniteNumber(data.piotroski_f_score),
      altmanZScore: asFiniteNumber(data.altman_z_score),
      roic: asFiniteNumber(data.roic),
      wacc: asFiniteNumber(data.wacc),
      intrinsicValuePerShare: asFiniteNumber(data.intrinsic_value_per_share),
      epvPerShare: asFiniteNumber(data.epv_per_share),
      raw: data,
    },
    update: {
      companyName: data.company_name,
      currentPrice: asFiniteNumber(data.current_price),
      investmentGrade: data.investment_grade,
      compositeScore: asFiniteNumber(data.composite_score),
      adjustedMarginOfSafetyPct: asFiniteNumber(data.adjusted_margin_of_safety_percentage),
      piotroskiFScore: asFiniteNumber(data.piotroski_f_score),
      altmanZScore: asFiniteNumber(data.altman_z_score),
      roic: asFiniteNumber(data.roic),
      wacc: asFiniteNumber(data.wacc),
      intrinsicValuePerShare: asFiniteNumber(data.intrinsic_value_per_share),
      epvPerShare: asFiniteNumber(data.epv_per_share),
      raw: data,
    },
  });

  return NextResponse.json(row.raw, { status: 201 });
}
