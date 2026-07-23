import * as z from 'zod';
import { MR_MARKET_COMPONENT_NAMES, type MrMarketComponentName } from '@/lib/mrMarket';

// Case/whitespace/dash-insensitive fold, so "equity risk premium" or an en-dash
// variant of "AAII Bull-Bear Spread" (e.g. copied from the methodology page's
// prose, which phrases these more loosely than the canonical enum) still matches.
const DASH_VARIANTS = /[‐-―−]/g; // hyphen, non-breaking hyphen, figure/en/em dash, minus sign

function foldComponentName(s: string): string {
  return s
    .normalize('NFKC')
    .replace(DASH_VARIANTS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const CANONICAL_BY_FOLDED_NAME: Record<string, MrMarketComponentName> = Object.fromEntries(
  MR_MARKET_COMPONENT_NAMES.map((name) => [foldComponentName(name), name]),
);

// Fallback for phrasings that don't fold to an exact match (e.g. "S&P 500 vs 125-Day
// Moving Average", "AAII Sentiment Survey (Bull/Bear Spread)"). Each canonical name has
// one substring that's unique to it across all five components — checked in order so
// a name can't be claimed by a shorter, less specific match first.
const COMPONENT_NAME_KEYWORDS: [substring: string, name: MrMarketComponentName][] = [
  ['aaii', 'AAII Bull-Bear Spread'],
  ['vix', 'VIX'],
  ['cape', 'CAPE'],
  ['risk premium', 'Equity Risk Premium'],
  ['erp', 'Equity Risk Premium'],
  ['125', 'S&P vs 125-day MA'],
  ['moving average', 'S&P vs 125-day MA'],
  ['momentum', 'S&P vs 125-day MA'],
];

function resolveComponentName(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const folded = foldComponentName(input);
  if (CANONICAL_BY_FOLDED_NAME[folded]) return CANONICAL_BY_FOLDED_NAME[folded];
  for (const [substring, name] of COMPONENT_NAME_KEYWORDS) {
    if (folded.includes(substring)) return name;
  }
  return input;
}

const componentInputSchema = z.object({
  name: z.preprocess(resolveComponentName, z.enum(MR_MARKET_COMPONENT_NAMES)),
  raw: z.number(),
});

export const mrMarketCreateSchema = z.object({
  // "YYYY-MM-DD", per docs/MR_MARKET_INDEX_SPEC.md's output `as_of` field.
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'as_of must be YYYY-MM-DD'),
  components: z.array(componentInputSchema).length(5),
});

export type MrMarketCreateInput = z.infer<typeof mrMarketCreateSchema>;
