import { Hono } from "hono";
import { clerkAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const users = new Hono();

users.post("/api/users/sync", clerkAuth, async (c) => {
  try {
    const clerkId = c.get("clerkId");
    const user = await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, balanceCents: 100000 },
      update: {},
    });
    return c.json({
      id: user.id,
      clerkId: user.clerkId,
      balanceCents: user.balanceCents,
      createdAt: user.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "sync_failed", message }, 500);
  }
});

export default users;
