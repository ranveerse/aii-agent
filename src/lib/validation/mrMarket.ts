import * as z from 'zod';
import { MR_MARKET_COMPONENT_NAMES } from '@/lib/mrMarket';

const componentInputSchema = z.object({
  name: z.enum(MR_MARKET_COMPONENT_NAMES),
  raw: z.number(),
});

export const mrMarketCreateSchema = z.object({
  // "YYYY-MM-DD", per docs/MR_MARKET_INDEX_SPEC.md's output `as_of` field.
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'as_of must be YYYY-MM-DD'),
  components: z.array(componentInputSchema).length(5),
});

export type MrMarketCreateInput = z.infer<typeof mrMarketCreateSchema>;
