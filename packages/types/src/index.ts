import { z } from "zod";

export const MarketResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  sport: z.string(),
  name: z.string(),
  event_name: z.string(),
  status: z.string(),
  expiry_date: z.string(),
  yes_price: z.number(),
});

export type MarketResponse = z.infer<typeof MarketResponseSchema>;
