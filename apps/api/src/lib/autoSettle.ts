import prisma from "./prisma.js";
import { getCached } from "./redis.js";
import {
  calculateSpreadResult,
  calculateTotalResult,
  calculatePayout,
} from "./settlement.js";

const BASE_URL = "https://predictions.dev-onyxodds.com";

type GameShape = {
  game_id: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

export async function runAutoSettlement(): Promise<{
  settled: number;
  skipped: number;
  errors: number;
}> {
  // 1. Redis cache first; fallback to direct Onyx fetch for yesterday+today
  let games: GameShape[] = [];
  const cached = await getCached<{ games: GameShape[] }>("onyx:sportsdata:nba:games");
  if (cached?.games) {
    games = cached.games;
  } else {
    const dates = [-1, 0].map((offset) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    });
    const results = await Promise.all(
      dates.map((date) => {
        const params = new URLSearchParams({ sport: "NBA", date });
        return fetch(`${BASE_URL}/api/sportsdata/games?${params}`)
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{ games?: GameShape[] }>)
              : { games: [] }
          )
          .then((d: { games?: GameShape[] }) => d.games ?? []);
      })
    );
    const seen = new Set<number>();
    for (const batch of results)
      for (const g of batch)
        if (!seen.has(g.game_id)) {
          seen.add(g.game_id);
          games.push(g);
        }
  }

  // 2. Only Final games with both scores present
  const finalGames = games.filter(
    (g) => g.status === "Final" && g.home_score !== null && g.away_score !== null
  );
  if (finalGames.length === 0) return { settled: 0, skipped: 0, errors: 0 };

  let settled = 0,
    skipped = 0,
    errors = 0;

  for (const game of finalGames) {
    const orders = await prisma.order.findMany({
      where: { status: "FILLED", symbol: { contains: `-${game.game_id}-` } },
      include: { user: true },
    });
    if (orders.length === 0) {
      skipped++;
      continue;
    }

    for (const order of orders) {
      try {
        // "SPREAD-23785-HOME" → betType=spread, side=home
        const parts = order.symbol.split("-");
        const betType = parts[0].toLowerCase() as "spread" | "total";
        const side = parts[2].toLowerCase();
        const meta = order.metadata as { line: number; toWinCents: number };

        const result =
          betType === "spread"
            ? calculateSpreadResult(
                game.home_score!,
                game.away_score!,
                meta.line,
                side as "home" | "away"
              )
            : calculateTotalResult(
                game.home_score!,
                game.away_score!,
                meta.line,
                side as "over" | "under"
              );

        const payout = calculatePayout(order.fillPrice, meta.toWinCents, result);

        await prisma.$transaction([
          prisma.settlement.create({ data: { orderId: order.id, result, payout } }),
          prisma.order.update({ where: { id: order.id }, data: { status: result } }),
          ...(payout > 0
            ? [
                prisma.user.update({
                  where: { id: order.userId },
                  data: { balanceCents: { increment: payout } },
                }),
              ]
            : []),
        ]);
        settled++;
      } catch (err) {
        console.error("[Settlement] order", order.id, err);
        errors++;
      }
    }
  }

  return { settled, skipped, errors };
}
