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

// A few longer-form phrasings (e.g. from page.tsx's descriptive "Rises with" table)
// that don't fold to the same string as the canonical name and need an explicit map.
const COMPONENT_NAME_ALIASES: Record<string, MrMarketComponentName> = {
  'erp': 'Equity Risk Premium',
  's&p 500 vs 125-day ma': 'S&P vs 125-day MA',
  's&p 500 vs. 125-day ma': 'S&P vs 125-day MA',
  's&p vs 125-day moving average': 'S&P vs 125-day MA',
  's&p 500 vs 125-day moving average': 'S&P vs 125-day MA',
  's&p 500 vs. 125-day moving average': 'S&P vs 125-day MA',
};

const CANONICAL_BY_FOLDED_NAME: Record<string, MrMarketComponentName> = Object.fromEntries(
  MR_MARKET_COMPONENT_NAMES.map((name) => [foldComponentName(name), name]),
);

function resolveComponentName(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const folded = foldComponentName(input);
  return CANONICAL_BY_FOLDED_NAME[folded] ?? COMPONENT_NAME_ALIASES[folded] ?? input;
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
