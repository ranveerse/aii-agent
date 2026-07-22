import * as z from 'zod';

export const stockRequestCreateSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .transform((v) => v.toUpperCase()),
});

export type StockRequestCreateInput = z.infer<typeof stockRequestCreateSchema>;
