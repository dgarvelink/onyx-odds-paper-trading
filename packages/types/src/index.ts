import { z } from "zod";

export const MarketResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  sport: z.string(),
  name: z.string().nullable(),
  event_name: z.string().nullable(),
  status: z.string(),
  expiry_date: z.string().nullable(),
  yes_price: z.number().nullable(),
});

export type MarketResponse = z.infer<typeof MarketResponseSchema>;

export const MarketPriceResponseSchema = z.object({
  symbol: z.string(),
  bid_price: z.number().nullable(),
  ask_price: z.number().nullable(),
  last_price: z.number().nullable(),
  volume: z.number().nullable(),
});

export type MarketPriceResponse = z.infer<typeof MarketPriceResponseSchema>;

export const EventResponseSchema = z.object({
  id: z.string(),
  event_key: z.string().nullable(),
  sport: z.string(),
  event_type: z.string(),
  name: z.string(),
  event_date: z.string().nullable(),
  home_participant: z.string().nullable(),
  away_participant: z.string().nullable(),
  is_live: z.boolean().nullable(),
  markets_count: z.number().nullable(),
  sd_home_score: z.number().nullable(),
  sd_away_score: z.number().nullable(),
  sd_home_logo: z.string().nullable(),
  sd_away_logo: z.string().nullable(),
  sd_status: z.string().nullable(),
  sd_quarter: z.string().nullable(),
  sd_time_remaining: z.string().nullable(),
});

export type EventResponse = z.infer<typeof EventResponseSchema>;

export const SportCountSchema = z.object({
  sport: z.string(),
  count: z.number(),
});

export type SportCount = z.infer<typeof SportCountSchema>;
