import { Hono } from "hono";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { clerkAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import {
  calculateParlayOdds,
  calculateParlayToWin,
  validateParlayLegs,
} from "../lib/parlayOdds.js";

const router = new Hono();

const ParlayBody = z.object({
  stake: z.number().min(1).max(500),
  legs: z
    .array(
      z.object({
        game_id: z.number(),
        betType: z.enum(["spread", "total"]),
        side: z.enum(["home", "away", "over", "under"]),
        label: z.string(),
        line: z.number(),
        odds: z.number(),
      })
    )
    .min(2)
    .max(8),
});

router.post("/api/parlays", clerkAuth, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ParlayBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", message: parsed.error.message }, 400);
    }
    const { stake, legs } = parsed.data;

    const validation = validateParlayLegs(legs);
    if (!validation.valid) {
      return c.json({ error: "invalid_parlay", message: validation.error }, 400);
    }

    const clerkId = c.get("clerkId");
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return c.json({ error: "user_not_found" }, 404);

    const parlayOdds = calculateParlayOdds(legs.map((l) => l.odds));

    const stakeCents = new Decimal(stake).times(100).floor();
    if (stakeCents.lt(100)) {
      return c.json({ error: "invalid_stake", message: "Minimum stake is $1" }, 400);
    }
    if (stakeCents.gt(50000)) {
      return c.json({ error: "invalid_stake", message: "Maximum stake is $500" }, 400);
    }
    if (new Decimal(user.balanceCents).lt(stakeCents)) {
      return c.json({ error: "insufficient_balance", message: "Insufficient balance" }, 400);
    }

    const toWinCents = calculateParlayToWin(stakeCents.toNumber(), parlayOdds);

    const [updatedUser, parlay] = await prisma.$transaction([
      prisma.user.update({
        where: { clerkId },
        data: { balanceCents: { decrement: stakeCents.toNumber() } },
      }),
      prisma.parlay.create({
        data: {
          userId: user.id,
          stakeCents: stakeCents.toNumber(),
          toWinCents,
          parlayOdds,
          legs: {
            create: legs.map((l) => ({
              game_id: l.game_id,
              betType: l.betType,
              side: l.side,
              label: l.label,
              line: l.line,
              odds: l.odds,
            })),
          },
        },
        include: { legs: true },
      }),
    ]);

    return c.json({
      parlayId: parlay.id,
      parlayOdds,
      stake,
      toWin: toWinCents / 100,
      legs: parlay.legs,
      newBalance: updatedUser.balanceCents / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "parlay_failed", message }, 500);
  }
});

router.get("/api/parlays", clerkAuth, async (c) => {
  const clerkId = c.get("clerkId");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "user_not_found" }, 404);

  const parlays = await prisma.parlay.findMany({
    where: { userId: user.id },
    include: { legs: true, settlement: true },
    orderBy: { createdAt: "desc" },
  });

  return c.json(parlays);
});

export default router;
