import prisma from "./prisma.js";
import {
  calculateSpreadResult,
  calculateTotalResult,
  calculatePayout,
} from "./settlement.js";
import { calculateParlayOdds, calculateParlayToWin } from "./parlayOdds.js";

const BASE_URL = "https://predictions.dev-onyxodds.com";

type GameShape = {
  game_id: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

async function settleParlays(
  finalGames: GameShape[]
): Promise<{ settled: number; errors: number }> {
  let settled = 0,
    errors = 0;

  for (const game of finalGames) {
    const parlays = await prisma.parlay.findMany({
      where: {
        status: "OPEN",
        legs: { some: { game_id: game.game_id, status: "PENDING" } },
      },
      include: { legs: true, user: true },
    });

    for (const parlay of parlays) {
      try {
        const updatedLegs = await Promise.all(
          parlay.legs.map(async (leg) => {
            if (leg.game_id !== game.game_id || leg.status !== "PENDING") return leg;
            const result =
              leg.betType === "spread"
                ? calculateSpreadResult(
                    game.home_score!,
                    game.away_score!,
                    leg.line,
                    leg.side as "home" | "away"
                  )
                : calculateTotalResult(
                    game.home_score!,
                    game.away_score!,
                    leg.line,
                    leg.side as "over" | "under"
                  );
            await prisma.parlayLeg.update({ where: { id: leg.id }, data: { status: result } });
            return { ...leg, status: result };
          })
        );

        // Not all games done yet — will settle when the last leg finishes
        if (updatedLegs.some((l) => l.status === "PENDING")) continue;

        let parlayResult: "WON" | "LOST" | "PUSH";
        let payout: number;

        if (updatedLegs.some((l) => l.status === "LOST")) {
          parlayResult = "LOST";
          payout = 0;
        } else if (updatedLegs.every((l) => l.status === "PUSH")) {
          parlayResult = "PUSH";
          payout = parlay.stakeCents;
        } else {
          // WON or WON+PUSH mix — drop pushed legs from odds recalc
          const wonLegs = updatedLegs.filter((l) => l.status === "WON");
          parlayResult = "WON";
          if (wonLegs.length === updatedLegs.length) {
            payout = parlay.stakeCents + parlay.toWinCents;
          } else {
            const newOdds = calculateParlayOdds(wonLegs.map((l) => l.odds));
            payout = parlay.stakeCents + calculateParlayToWin(parlay.stakeCents, newOdds);
          }
        }

        await prisma.$transaction([
          prisma.parlaySettlement.create({
            data: { parlayId: parlay.id, result: parlayResult, payout },
          }),
          prisma.parlay.update({ where: { id: parlay.id }, data: { status: parlayResult } }),
          ...(payout > 0
            ? [
                prisma.user.update({
                  where: { id: parlay.userId },
                  data: { balanceCents: { increment: payout } },
                }),
              ]
            : []),
        ]);
        settled++;
      } catch (err) {
        console.error("[Settlement] parlay", parlay.id, err);
        errors++;
      }
    }
  }

  return { settled, errors };
}

export async function runAutoSettlement(): Promise<{
  settled: number;
  skipped: number;
  errors: number;
}> {
  // Fetch directly from Onyx for yesterday+today — the display cache intentionally
  // excludes Final games, so we can't use it here.
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
          r.ok ? (r.json() as Promise<{ games?: GameShape[] }>) : { games: [] }
        )
        .then((d: { games?: GameShape[] }) => d.games ?? []);
    })
  );
  const seen = new Set<number>();
  const games: GameShape[] = [];
  for (const batch of results)
    for (const g of batch)
      if (!seen.has(g.game_id)) {
        seen.add(g.game_id);
        games.push(g);
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

  const parlayStats = await settleParlays(finalGames);
  return {
    settled: settled + parlayStats.settled,
    skipped,
    errors: errors + parlayStats.errors,
  };
}
