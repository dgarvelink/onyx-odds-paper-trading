# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

npm workspaces with three packages:

- `apps/web` — Vite + React 19 + TypeScript frontend (`@onyx-odds/web`)
- `apps/api` — Hono + TypeScript backend on `@hono/node-server` (`@onyx-odds/api`)
- `packages/types` — shared Zod schemas and inferred TypeScript types (`@onyx-odds/types`)

All dependencies are hoisted to a single `node_modules` at the root. No Turborepo.

## Commands

Run from the repo root unless noted.

```bash
# Dev servers
npm run dev:web          # Vite on http://localhost:5173
npm run dev:api          # tsx watch on http://localhost:3001

# Typecheck all workspaces
npm run typecheck

# Build all workspaces
npm run build

# Workspace-scoped (examples)
npm run typecheck --workspace=apps/web
npm install <pkg> --workspace=apps/api
```

Run from inside `apps/api`:
```bash
npx prisma migrate dev   # once schema is added
npx prisma generate
```

## Key architectural decisions

**Tailwind v4 — no config file.** Tailwind is configured entirely in `apps/web/src/index.css` via `@theme inline { ... }`. Do not create a `tailwind.config.js/ts`. The `@theme inline` block maps CSS variables (e.g. `--background`) to Tailwind color tokens (e.g. `bg-background`). Adding new design tokens means adding entries to both the `:root` block and the `@theme inline` block.

**shadcn/ui.** `components.json` at `apps/web/` root configures shadcn. Add components with `npx shadcn@latest add <component>` from inside `apps/web/`. Components land in `apps/web/src/components/ui/`. The `cn()` utility is at `@/lib/utils`.

**Shared types flow one way.** `packages/types` exports Zod schemas and their inferred TypeScript types for Onyx API responses (`MarketResponseSchema`, `EventResponseSchema`, `SportCountSchema`, etc.). Both `apps/web` and `apps/api` depend on it via `"@onyx-odds/types": "*"`. The types package must be built (`npm run build --workspace=packages/types`) before it can be imported at runtime; during dev in the web app Vite resolves it directly from source via the workspace symlink.

**API auth via Clerk.** The backend uses `@clerk/backend` for token verification via `clerkAuth` middleware in `apps/api/src/middleware/auth.ts`. The frontend uses `@clerk/react`. Keys come from env vars — never hardcoded. The frontend axios instance in `apps/web/src/lib/api.ts` attaches tokens via `window.Clerk?.session?.getToken()` in a request interceptor.

**Decimal precision.** Use `decimal.js` for all price/money arithmetic on the API side. JavaScript `number` is not used for financial values. **Critical**: use the named import `import { Decimal } from "decimal.js"` — the default import fails TypeScript's NodeNext module resolution (`import Decimal from "decimal.js"` causes TS2351).

**Zustand v5 pattern.** All stores use the curried create form: `create<State>()((set) => ...)`. Three stores exist: `sportsStore` (active sport/filter/search), `betSlipStore` (pending bet selections), and `useToastStore` (in `lib/toast.ts`). The toast store also exports an imperative `toast.success/error` helper that calls `useToastStore.getState()` so it works outside React components.

**TanStack Query v5.** Frontend data hooks use `useQuery` / `useMutation`. Established query keys: `["balance"]`, `["orders"]`, `["positions"]`, `["summary"]`, `["games", sport]`, `["sports"]`. Invalidate `["balance"]` and `["orders"]` after order placement; invalidate `["positions"]` and `["summary"]` if needed.

## Data flow

Games come from the external Onyx API at `https://predictions.dev-onyxodds.com`. The backend proxies all Onyx API calls (in `routes/onyx.ts`) and caches responses in Redis. Cache TTLs: sports 60 s, markets/events 5 s, prices 3 s, sportsdata/games 30 s, live 10 s. The frontend fetches via `useGames(sport)` which hits `/api/onyx/sportsdata/games`.

## Order placement

The symbol format for bets is `BETTYPE-GAME_ID-SIDE` in uppercase (e.g. `SPREAD-23785-HOME`, `TOTAL-23785-OVER`). `POST /api/orders` atomically updates balance, creates an `Order`, and upserts a `Position` in a `prisma.$transaction([...])`. The `Order.metadata` JSON field stores `{ game_id, betType, label, line, odds, toWinCents }`.

When placing multiple bets from the bet slip, use sequential `await` (not `Promise.all`) so each balance check sees the result of the previous deduction:

```ts
for (const sel of selections) { await placeOrder(sel); }
clearSlip();
```

## Prisma schema summary

- `User` — `balanceCents Int @default(100000)` (starts at $1,000), linked to `clerkId`
- `Order` — `fillPrice` = stake in cents; `metadata Json @default("{}")` holds bet details
- `Position` — unique on `(userId, symbol, side)`; `avgPriceCents` = stake per unit; upserted on each order

## N+1 avoidance on account routes

`GET /api/account/positions` and `GET /api/account/summary` both need order metadata enrichment. They batch-fetch all orders once and build a `Map<symbol, OrderMetadata>` via `latestOrderMap()` rather than querying per position.

## Environment variables

`apps/web/.env` — copy from `.env.example`:
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (`pk_test_…`)
- `VITE_API_URL` — e.g. `http://localhost:3001`

`apps/api/.env` — copy from `.env.example`:
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `CLERK_SECRET_KEY` — Clerk secret key (`sk_test_…`)
- `FRONTEND_URL` — e.g. `http://localhost:5173` (used for CORS)
- `PORT` — defaults to `3001`
