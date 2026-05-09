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

onyx.get("/api/onyx/games/:sport", async (c) => {
  try {
    const sport = c.req.param("sport");
    const key = `onyx:games:${sport}`;

    const cached = await getCached<unknown>(key);
    if (cached) return c.json(cached);

    console.warn(`/games/${sport}: passing through unvalidated Onyx response`);
    const res = await fetch(`https://predictions.dev-onyxodds.com/games/${sport}`);
    if (!res.ok) {
      throw new Error(`Onyx API returned ${res.status} for /games/${sport}`);
    }
    const data: unknown = await res.json();
    await setCached(key, data, 5);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

onyx.get("/api/onyx/games/detail/:eventKey", async (c) => {
  try {
    const eventKey = c.req.param("eventKey");
    const key = `onyx:game:detail:${eventKey}`;

    const cached = await getCached<unknown>(key);
    if (cached) return c.json(cached);

    console.warn(`/games/detail/${eventKey}: passing through unvalidated Onyx response`);
    const res = await fetch(`https://predictions.dev-onyxodds.com/games/detail/${eventKey}`);
    if (!res.ok) {
      throw new Error(`Onyx API returned ${res.status} for /games/detail/${eventKey}`);
    }
    const data: unknown = await res.json();
    await setCached(key, data, 5);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

export default onyx;
