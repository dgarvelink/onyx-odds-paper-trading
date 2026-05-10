import { Hono } from "hono";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { clerkAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = new Hono();

const OrderBody = z.object({
  game_id: z.number(),
  betType: z.enum(["spread", "total"]),
  side: z.enum(["home", "away", "over", "under"]),
  label: z.string(),
  line: z.number(),
  stake: z.number().min(1).max(1000),
  odds: z.number().min(-125).max(-100),
});

router.post("/api/orders", clerkAuth, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = OrderBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", message: parsed.error.message }, 400);
    }
    const { game_id, betType, side, label, line, stake, odds } = parsed.data;
    const clerkId = c.get("clerkId");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return c.json({ error: "user_not_found" }, 404);

    const stakeCents = new Decimal(stake).times(100).floor();
    if (stakeCents.lt(100)) {
      return c.json({ error: "invalid_stake", message: "Minimum stake is $1" }, 400);
    }
    if (stakeCents.gt(100000)) {
      return c.json({ error: "invalid_stake", message: "Maximum stake is $1000" }, 400);
    }
    if (new Decimal(user.balanceCents).lt(stakeCents)) {
      return c.json({ error: "insufficient_balance", message: "Insufficient balance" }, 400);
    }

    const toWinCents = stakeCents.times(100).div(new Decimal(Math.abs(odds))).toDecimalPlaces(0, Decimal.ROUND_DOWN);
    const symbol = `${betType.toUpperCase()}-${game_id}-${side.toUpperCase()}`;

    const [updatedUser, order] = await prisma.$transaction([
      prisma.user.update({
        where: { clerkId },
        data: { balanceCents: { decrement: stakeCents.toNumber() } },
      }),
      prisma.order.create({
        data: {
          userId: user.id,
          symbol,
          side: side.toUpperCase(),
          quantity: 1,
          fillPrice: stakeCents.toNumber(),
          status: "FILLED",
          metadata: {
            game_id,
            betType,
            label,
            line,
            odds,
            toWinCents: toWinCents.toNumber(),
          },
        },
      }),
      prisma.position.upsert({
        where: {
          userId_symbol_side: { userId: user.id, symbol, side: side.toUpperCase() },
        },
        create: {
          userId: user.id,
          symbol,
          side: side.toUpperCase(),
          quantity: 1,
          avgPriceCents: stakeCents.toNumber(),
        },
        update: { quantity: { increment: 1 } },
      }),
    ]);

    return c.json({
      orderId: order.id,
      label,
      stake,
      toWin: toWinCents.toNumber() / 100,
      newBalance: updatedUser.balanceCents / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "order_failed", message }, 500);
  }
});

export default router;
