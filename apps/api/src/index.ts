import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkAuth } from "./middleware/auth.js";
import onyxRouter from "./routes/onyx.js";
import usersRouter from "./routes/users.js";
import ordersRouter from "./routes/orders.js";
import accountRouter from "./routes/account.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.route("/", onyxRouter);
app.route("/", usersRouter);
app.route("/", ordersRouter);
app.route("/", accountRouter);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/api/test-auth", clerkAuth, (c) => {
  return c.json({ clerkId: c.get("clerkId") });
});

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
