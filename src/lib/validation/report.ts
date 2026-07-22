import * as z from 'zod';

// Mirrors docs/ANALYSIS_ENGINE.md's Phase 3 output JSON exactly, plus `company_name`
// (the engine has no name field — supplied by whoever submits the report). Most
// numeric-looking fields accept a string too, because the engine's own rules allow
// it to return "N/A – insufficient data" for anything it can't compute rather than
// guess — see ANALYSIS_ENGINE.md's Data Input Mode section.
const numberOrNA = z.union([z.number(), z.string()]);

export const reportCreateSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
  company_name: z.string().trim().min(1).max(120),

  current_price: z.number(),
  traditional_multiples: z.string(),
  corporate_lifecycle_stage: z.string(),
  owner_earnings: numberOrNA,
  maintenance_capex_estimate: numberOrNA,
  sbc_dilution_flag: z.string(),
  earnings_quality_flag: z.string(),
  accrual_ratio: numberOrNA,
  roic: numberOrNA,
  roiic_3yr: numberOrNA,
  wacc: numberOrNA,
  economic_profit_spread: numberOrNA,
  capital_verdict: z.string(),
  rule_of_40_score: numberOrNA,
  rule_of_40_verdict: z.string(),
  denominator_trap_risk: z.string(),
  share_cannibal_status: z.string(),
  per_share_growth_quality: z.string(),
  epv_per_share: numberOrNA,
  reproduction_value_per_share: numberOrNA,
  epv_to_rv_ratio: numberOrNA,
  franchise_verdict: z.string(),
  reverse_dcf_implied_growth: numberOrNA,
  peg_ratio: numberOrNA,
  peg_ratio_verdict: z.string(),
  intrinsic_value_per_share: numberOrNA,
  adjusted_margin_of_safety_percentage: numberOrNA,
  piotroski_f_score: numberOrNA,
  altman_z_score: numberOrNA,
  beneish_m_score: numberOrNA,
  insider_alignment_evaluation: z.string(),
  buyback_quality: z.string(),
  dividend_coverage: z.string(),
  intangible_moat_strength: z.string(),
  credible_catalyst_identified: z.string(),
  composite_score: z.number(),
  red_flags: z.array(z.string()),
  data_gaps: z.array(z.string()),
  investment_grade: z.enum(['CATALYST-DRIVEN VALUE', 'FAIR VALUE', 'DEAD MONEY', 'VALUE TRAP']),
  forward_looking_rationale: z.string(),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

/** typeof value === 'number' && finite — used to decide typed-column vs raw-only storage. */
export function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
