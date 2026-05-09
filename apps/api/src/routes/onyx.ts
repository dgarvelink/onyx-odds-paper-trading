import { Hono } from "hono";
import { z } from "zod";
import {
  MarketResponseSchema,
  MarketPriceResponseSchema,
  EventResponseSchema,
  SportCountSchema,
} from "@onyx-odds/types";
import { onyxFetch } from "../lib/onyx.js";
import { getCached, setCached } from "../lib/redis.js";

const BASE_URL = "https://predictions.dev-onyxodds.com";

const onyx = new Hono();

onyx.get("/api/onyx/sports", async (c) => {
  try {
    const key = "onyx:sports";
    const cached = await getCached<z.infer<typeof SportCountSchema>[]>(key);
    if (cached) return c.json(cached);

    const data = await onyxFetch("/markets/sports", z.array(SportCountSchema));
    await setCached(key, data, 60);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isParseError = message.includes("validation failed");
    return c.json({ error: isParseError ? "parse_error" : "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/markets", async (c) => {
  try {
    const sport = c.req.query("sport") ?? "";
    const status = c.req.query("status") ?? "";
    const limit = c.req.query("limit") ?? "50";
    const key = `onyx:markets:${sport}:${status}:${limit}`;

    const cached = await getCached<z.infer<typeof MarketResponseSchema>[]>(key);
    if (cached) return c.json(cached);

    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (status) params.set("status", status);
    params.set("limit", limit);

    const data = await onyxFetch(`/markets?${params}`, z.array(MarketResponseSchema));
    await setCached(key, data, 5);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isParseError = message.includes("validation failed");
    return c.json({ error: isParseError ? "parse_error" : "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/markets/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol");
    const key = `onyx:market:${symbol}`;

    const cached = await getCached<z.infer<typeof MarketResponseSchema>>(key);
    if (cached) return c.json(cached);

    const data = await onyxFetch(`/markets/${symbol}`, MarketResponseSchema);
    await setCached(key, data, 5);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isParseError = message.includes("validation failed");
    return c.json({ error: isParseError ? "parse_error" : "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/markets/:symbol/prices", async (c) => {
  try {
    const symbol = c.req.param("symbol");
    const key = `onyx:prices:${symbol}`;

    const cached = await getCached<z.infer<typeof MarketPriceResponseSchema>>(key);
    if (cached) return c.json(cached);

    const data = await onyxFetch(`/markets/${symbol}/prices`, MarketPriceResponseSchema);
    await setCached(key, data, 3);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isParseError = message.includes("validation failed");
    return c.json({ error: isParseError ? "parse_error" : "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/events", async (c) => {
  try {
    const sport = c.req.query("sport") ?? "";
    const limit = c.req.query("limit") ?? "50";
    const key = `onyx:events:${sport}:${limit}`;

    const cached = await getCached<z.infer<typeof EventResponseSchema>[]>(key);
    if (cached) return c.json(cached);

    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    params.set("limit", limit);

    const data = await onyxFetch(`/events?${params}`, z.array(EventResponseSchema));
    await setCached(key, data, 5);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isParseError = message.includes("validation failed");
    return c.json({ error: isParseError ? "parse_error" : "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/sportsdata/games", async (c) => {
  try {
    const sport = c.req.query("sport") ?? "";
    const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
    const key = `onyx:sportsdata:games:${sport}:${date}`;

    const cached = await getCached<unknown>(key);
    if (cached) return c.json(cached);

    const params = new URLSearchParams({ sport, date });
    const res = await fetch(`${BASE_URL}/api/sportsdata/games?${params}`);
    if (!res.ok) {
      throw new Error(`Onyx API returned ${res.status} for /api/sportsdata/games`);
    }
    const data: unknown = await res.json();
    await setCached(key, data, 30);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/sportsdata/games/:sport/:gameId", async (c) => {
  try {
    const sport = c.req.param("sport");
    const gameId = c.req.param("gameId");
    const key = `onyx:sportsdata:game:${sport}:${gameId}`;

    const cached = await getCached<unknown>(key);
    if (cached) return c.json(cached);

    const res = await fetch(`${BASE_URL}/api/sportsdata/games/${sport}/${gameId}`);
    if (!res.ok) {
      throw new Error(`Onyx API returned ${res.status} for /api/sportsdata/games/${sport}/${gameId}`);
    }
    const data: unknown = await res.json();
    await setCached(key, data, 15);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/sportsdata/live", async (c) => {
  try {
    const sport = c.req.query("sport") ?? "";
    const key = `onyx:sportsdata:live:${sport}`;

    const cached = await getCached<unknown>(key);
    if (cached) return c.json(cached);

    const params = new URLSearchParams({ sport });
    const res = await fetch(`${BASE_URL}/api/sportsdata/live?${params}`);
    if (!res.ok) {
      throw new Error(`Onyx API returned ${res.status} for /api/sportsdata/live`);
    }
    const data: unknown = await res.json();
    await setCached(key, data, 10);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

export default onyx;
