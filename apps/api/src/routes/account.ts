import { Hono } from "hono";
import { Decimal } from "decimal.js";
import { clerkAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { runAutoSettlement } from "../lib/autoSettle.js";

const router = new Hono();

interface PositionRow {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avgPriceCents: number;
  updatedAt: Date;
}

interface OrderMetadata {
  game_id: number;
  betType: string;
  label: string;
  line: number;
  odds: number;
  toWinCents: number;
}

function latestOrderMap(
  orders: Array<{ symbol: string; metadata: unknown }>
): Map<string, OrderMetadata> {
  const map = new Map<string, OrderMetadata>();
  for (const o of orders) {
    if (!map.has(o.symbol)) {
      map.set(o.symbol, o.metadata as OrderMetadata);
    }
  }
  return map;
}

router.get("/api/account/balance", clerkAuth, async (c) => {
  const clerkId = c.get("clerkId");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "user_not_found" }, 404);
  return c.json({
    balanceCents: user.balanceCents,
    balance: user.balanceCents / 100,
    currency: "USD",
  });
});

router.get("/api/account/orders", clerkAuth, async (c) => {
  const clerkId = c.get("clerkId");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "user_not_found" }, 404);
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { settlements: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(orders);
});

router.get("/api/account/positions", clerkAuth, async (c) => {
  const clerkId = c.get("clerkId");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "user_not_found" }, 404);

  const [positions, orders] = await Promise.all([
    prisma.position.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { userId: user.id, status: "FILLED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const metaMap = latestOrderMap(orders);

  const enriched = positions
    .filter((p: PositionRow) => metaMap.has(p.symbol))
    .map((p: PositionRow) => {
      const betType = p.symbol.split("-")[0].toLowerCase();
      const meta = metaMap.get(p.symbol);

      return {
        id: p.id,
        symbol: p.symbol,
        betType,
        side: p.side,
        quantity: p.quantity,
        stakeCents: p.avgPriceCents * p.quantity,
        toWinCents: (meta?.toWinCents ?? 0) * p.quantity,
        label: meta?.label ?? p.symbol,
        line: meta?.line ?? 0,
        odds: meta?.odds ?? -110,
        game_id: meta?.game_id ?? 0,
        status: "OPEN",
        updatedAt: p.updatedAt,
      };
    });

  return c.json(enriched);
});

router.get("/api/account/summary", clerkAuth, async (c) => {
  const clerkId = c.get("clerkId");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "user_not_found" }, 404);

  const [positions, filledOrders, settledOrders, parlays] = await Promise.all([
    prisma.position.findMany({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id, status: "FILLED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { userId: user.id, status: { in: ["WON", "LOST", "PUSH"] } },
      include: { settlements: true },
    }),
    prisma.parlay.findMany({ where: { userId: user.id }, include: { settlement: true } }),
  ]);

  const filledMetaMap = latestOrderMap(filledOrders);
  const openPositions = positions.filter((p: PositionRow) => filledMetaMap.has(p.symbol));

  let totalStakedCents = new Decimal(0);
  let totalToWinCents = new Decimal(0);
  for (const p of openPositions) {
    totalStakedCents = totalStakedCents.plus(
      new Decimal(p.avgPriceCents).times(p.quantity)
    );
    const meta = filledMetaMap.get(p.symbol);
    totalToWinCents = totalToWinCents.plus(
      new Decimal(meta?.toWinCents ?? 0).times(p.quantity)
    );
  }

  let totalWon = new Decimal(0);
  let totalPushed = 0;
  for (const o of settledOrders) {
    if (o.settlements) {
      if (o.status === "WON") totalWon = totalWon.plus(o.settlements.payout);
      if (o.status === "PUSH") totalPushed++;
    }
  }

  const allOrderWagered = [...filledOrders, ...settledOrders].reduce(
    (sum: number, o: { fillPrice: number }) => sum + o.fillPrice,
    0
  );
  const allParlayWagered = parlays.reduce(
    (sum: number, p: { stakeCents: number }) => sum + p.stakeCents,
    0
  );
  const totalWageredCents = allOrderWagered + allParlayWagered;

  const allOrderReturned = settledOrders.reduce(
    (sum: number, o: { settlements?: { payout: number } | null }) =>
      sum + (o.settlements?.payout ?? 0),
    0
  );
  const allParlayReturned = parlays.reduce(
    (sum: number, p: { settlement?: { payout: number } | null }) =>
      sum + (p.settlement?.payout ?? 0),
    0
  );
  const totalReturnedCents = allOrderReturned + allParlayReturned;

  return c.json({
    balance: user.balanceCents / 100,
    balanceCents: user.balanceCents,
    totalStaked: totalStakedCents.div(100).toNumber(),
    totalToWin: totalToWinCents.div(100).toNumber(),
    openPositionsCount: openPositions.length,
    totalOrdersCount: filledOrders.length + settledOrders.length,
    settledCount: settledOrders.length,
    totalWon: totalWon.div(100).toNumber(),
    totalPushed,
    totalWagered: totalWageredCents / 100,
    totalReturned: totalReturnedCents / 100,
    netPL: (totalReturnedCents - totalWageredCents) / 100,
    currency: "USD",
  });
});

router.get("/api/account/settlement-status", clerkAuth, async (c) => {
  const result = await runAutoSettlement();
  return c.json(result);
});

export default router;
