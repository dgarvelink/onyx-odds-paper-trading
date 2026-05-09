import { Hono } from "hono";
import { clerkAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = new Hono();

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
    orderBy: { createdAt: "desc" },
  });
  return c.json(orders);
});

export default router;
