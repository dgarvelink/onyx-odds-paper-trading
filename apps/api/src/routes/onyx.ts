import { Hono } from "hono";
import { getCached, setCached } from "../lib/redis.js";

const BASE_URL = "https://predictions.dev-onyxodds.com";

const onyx = new Hono();

onyx.get("/api/onyx/sportsdata/games", async (c) => {
  try {
    const cacheKey = "onyx:sportsdata:nba:games";
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return c.json(cached);

    // Generate today + next 6 days in UTC (YYYY-MM-DD)
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    // Fetch all 7 dates in parallel
    const results = await Promise.all(
      dates.map(async (date) => {
        const params = new URLSearchParams({ sport: "NBA", date });
        const res = await fetch(`${BASE_URL}/api/sportsdata/games?${params}`);
        if (!res.ok) return [];
        const data = await res.json() as { games?: unknown[] };
        return Array.isArray(data.games) ? data.games : [];
      })
    );

    // Merge and deduplicate by game_id, filter to games with usable lines
    const seen = new Set<number>();
    const merged: unknown[] = [];
    for (const batch of results) {
      for (const game of batch as Array<{ game_id: number; spread: unknown; over_under: unknown; datetime_utc: string }>) {
        if (seen.has(game.game_id)) continue;
        seen.add(game.game_id);
        if (game.spread !== null || game.over_under !== null) {
          merged.push(game);
        }
      }
    }

    // Sort ascending by datetime_utc
    (merged as Array<{ datetime_utc: string }>).sort(
      (a, b) => new Date(a.datetime_utc).getTime() - new Date(b.datetime_utc).getTime()
    );

    const payload = { sport: "NBA", games: merged, count: merged.length, dates_checked: dates };
    await setCached(cacheKey, payload, 60);
    return c.json(payload);
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
