/**
 * Single home for docs/MR_MARKET_INDEX_SPEC.md's composite-score arithmetic.
 * Nothing outside this file may compute score -> orient -> weight -> composite —
 * see CLAUDE.md's "Analysis logic has one home each" rule. Callers (the /api/mr-market
 * route) supply only the current raw value per component; this function scales each
 * against the spec's fixed calibration bounds, then orients/weights/composites.
 */

export const MR_MARKET_COMPONENT_NAMES = [
  'VIX',
  'S&P vs 125-day MA',
  'CAPE',
  'Equity Risk Premium',
  'AAII Bull-Bear Spread',
] as const;

export type MrMarketComponentName = (typeof MR_MARKET_COMPONENT_NAMES)[number];

export type MrMarketComponentInput = {
  name: MrMarketComponentName;
  /** Current reading only — no history required. */
  raw: number;
};

export type MrMarketComponentOutput = MrMarketComponentInput & {
  /** 0-100, oriented so higher always means greedier. */
  oriented_score: number;
  weight: number;
};

export type MrMarketZone = 'Deep Value' | 'Fearful' | 'Neutral' | 'Greedy' | 'Euphoric';

export type MrMarketResult = {
  composite_score: number;
  zone: MrMarketZone;
  reading: string;
  components: MrMarketComponentOutput[];
};

// Fixed per docs/MR_MARKET_INDEX_SPEC.md. Weights must sum to 1.00.
// low/high are long-run historical extremes for the raw reading (not direction-adjusted);
// risesWithFear controls the inversion applied after min-max scaling.
const COMPONENT_CONFIG: Record<
  MrMarketComponentName,
  { weight: number; risesWithFear: boolean; low: number; high: number }
> = {
  'VIX': { weight: 0.15, risesWithFear: true, low: 10, high: 40 },
  'S&P vs 125-day MA': { weight: 0.15, risesWithFear: false, low: -0.2, high: 0.15 },
  'CAPE': { weight: 0.25, risesWithFear: false, low: 13, high: 44 },
  'Equity Risk Premium': { weight: 0.25, risesWithFear: true, low: -0.02, high: 0.07 },
  'AAII Bull-Bear Spread': { weight: 0.2, risesWithFear: false, low: -50, high: 50 },
};

function scaleToScore(raw: number, low: number, high: number): number {
  const pct = ((raw - low) / (high - low)) * 100;
  return Math.min(100, Math.max(0, pct));
}

const ZONE_READING: Record<MrMarketZone, string> = {
  'Deep Value':
    'Mr. Market is despondent — extreme fear. Historically where the best purchases are made, if the fundamentals hold up.',
  Fearful:
    'Mr. Market is fearful, offering to sell you his holdings at a discount. Look for opportunities where the forensic screens come back clean.',
  Neutral:
    'Mr. Market is composed today — prices broadly track value. Neutral markets offer fewer gifts; this is a day for research, not action.',
  Greedy:
    'Mr. Market is greedy today, offering to buy your shares at generous prices. Demand a wider margin of safety before acting on his enthusiasm.',
  Euphoric:
    "Mr. Market is euphoric — maximum caution. Graham would counsel selling him what is dear and ignoring the rest of his chatter.",
};

function zoneFor(score: number): MrMarketZone {
  if (score < 20) return 'Deep Value';
  if (score < 40) return 'Fearful';
  if (score < 60) return 'Neutral';
  if (score < 80) return 'Greedy';
  return 'Euphoric';
}

export function computeMrMarketComposite(inputs: MrMarketComponentInput[]): MrMarketResult {
  if (inputs.length !== MR_MARKET_COMPONENT_NAMES.length) {
    throw new Error(`Expected exactly ${MR_MARKET_COMPONENT_NAMES.length} components, got ${inputs.length}`);
  }

  const seen = new Set<string>();
  const components: MrMarketComponentOutput[] = inputs.map((input) => {
    if (seen.has(input.name)) throw new Error(`Duplicate component: ${input.name}`);
    seen.add(input.name);

    const config = COMPONENT_CONFIG[input.name];
    if (!config) throw new Error(`Unknown component: ${input.name}`);

    const score = scaleToScore(input.raw, config.low, config.high);
    const oriented_score = config.risesWithFear ? 100 - score : score;
    return { ...input, oriented_score, weight: config.weight };
  });

  for (const name of MR_MARKET_COMPONENT_NAMES) {
    if (!seen.has(name)) throw new Error(`Missing component: ${name}`);
  }

  const rawComposite = components.reduce((sum, c) => sum + c.oriented_score * c.weight, 0);
  const composite_score = Math.round(rawComposite * 10) / 10;
  const zone = zoneFor(composite_score);

  return { composite_score, zone, reading: ZONE_READING[zone], components };
}
