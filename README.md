# Onyx Odds

A paper trading web app for NBA sports betting built on real-time lines from the Onyx Odds API.

## What it does

**Live odds dashboard** — Pulls NBA game lines (spread and total) and displays them in a FanDuel-style card layout. Lines refresh every 30 seconds and drop to 10 seconds when any game is in progress. When a spread or total moves between polls, the affected bet buttons flash green or red for 1.5 seconds.

**Bet slip** — Users build a slip by clicking any line on any game card. Two modes:
- *Single* — each selection has an independent stake and "to win" amount
- *Parlay* — combines selections into one wager; odds are calculated in real time; correlations (e.g. home spread + away spread on the same game) are blocked

**Line-change protection** — When a user clicks "Place Bets", the app fetches fresh lines and compares them against what is in the slip. If any line moved against the bettor since they added it, a modal surfaces showing exactly what changed before asking for confirmation. Favorable moves are silently accepted.

**Auto-updating slip** — While the slip is open, background polls automatically update the line and odds on each selection if they shift, with a brief flash on the affected row.

**Paper balance** — Each account starts with $1,000 in play money. Every filled order deducts the stake from the balance and records a potential payout. Balance is shown in the nav bar and checked before any bet is placed.

**Order history and positions** — The account page shows three tabs: open positions (unsettled bets), parlays (expandable to show individual legs), and a full order history with status badges.

**Automatic settlement** — A background job runs every 60 seconds and checks completed games directly against the Onyx upstream API. Spread and total results are evaluated, orders move from `FILLED` to `WON`, `LOST`, or `PUSH`, and winning payouts are credited to the user's balance. Parlays settle once all legs are resolved; a leg that pushes is dropped and the remaining odds are recalculated.

**Authentication** — Sign-up and sign-in via Clerk. All betting and account endpoints are protected; the dashboard is publicly viewable.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind v4, TanStack Query, Zustand, Clerk React |
| Backend | Hono on Node.js, Prisma (PostgreSQL), Redis (line caching), Clerk backend |
| Shared types | Zod schemas in `packages/types`, consumed by both apps |
| Deployment | Railway (API + database + Redis), Vercel (frontend) |

## Monorepo layout

```
apps/
  api/      Hono REST API, Prisma, settlement scheduler
  web/      Vite + React frontend
packages/
  types/    Shared Zod schemas and inferred TypeScript types
```

---

## Design decisions

### Frontend

**React 19 + TypeScript + Vite**

Vite over Create React App or Next.js. CRA is dead. Next.js was considered and rejected — server components and the App Router add meaningful complexity for a project where SEO is irrelevant and the entire surface area is behind auth. This is a client-heavy, real-time trading UI with no reason to add SSR overhead. Vite gives fast HMR, zero config, and clean separation between frontend and backend.

**Tailwind CSS + shadcn/ui**

Tailwind for utility-first styling with no runtime cost. shadcn/ui over a component library like MUI or Chakra because shadcn components are copy-owned — they live in your codebase, not a node_modules black box, so you can modify them freely. This matters for a trading UI where you need tight control over components like the order ticket and position table. MUI would have been faster to scaffold but harder to customize and visually generic.

**Zustand**

Zustand owns all client-side UI state: the active bet slip, filters, and anything that doesn't need to be fetched. Chosen over Redux Toolkit because RTK is architecturally excessive for a single-developer project — the boilerplate-to-value ratio is wrong here. Chosen over React Context because Context re-renders the entire subtree on every state change, which is a real problem in a live-updating market list. Zustand's selector model means components only re-render when the specific slice they subscribe to changes. Jotai was also considered but is less structured — Zustand's slice pattern maps more naturally to distinct UI domains like the bet slip, account state, and market filters.

**TanStack Query**

TanStack Query owns all server state: market data, order history, positions, and account balance. The separation between Zustand (UI state) and TanStack Query (server state) is intentional — these are fundamentally different concerns and conflating them into a single store is a common architectural mistake. TanStack Query gives you stale-while-revalidate, background refetching, and cache invalidation out of the box. Order history and positions invalidate and refetch immediately after a successful order fill.

### Backend

**TypeScript over Python**

TypeScript on the backend enables a true end-to-end typed monorepo. Shared Zod schemas in `packages/types` are imported by both the frontend and backend, eliminating an entire class of API contract bugs. Python would have required a separate type layer or generated client. TypeScript also performs better for high-throughput inbound/outbound HTTP workloads.

**Hono**

Hono over Express because it's TypeScript-native from the ground up, not TypeScript-bolted-on. Express's type story is still `@types/express` shims and loose inference. Hono has a first-class `hono/client` that gives end-to-end type safety between backend route definitions and frontend fetch calls — the same benefit as tRPC without the monorepo ceremony and router boilerplate. It also runs natively on Vercel edge, Cloudflare Workers, and Node, so deployment target flexibility is built in. tRPC was evaluated and cut because the setup cost would have consumed roughly an hour of the time budget for a benefit that `hono/client` largely replicates.

**Zod**

Zod at two boundaries: validating inbound order requests before they touch the database, and validating Onyx API responses at the fetch layer before they enter the application. The Onyx API is a third-party service — treating its responses as trusted without a runtime schema check is a bug waiting to happen. Zod schemas also serve as living documentation of what shapes the application actually depends on.

**Prisma**

Prisma over raw SQL or Drizzle. Raw SQL was ruled out — writing migrations by hand under a time constraint is unnecessary risk. Drizzle is compelling if you want to stay closer to SQL, but Prisma's migration workflow (`prisma migrate dev`) is faster to iterate on and its generated client is more immediately readable. The tradeoff is that Prisma's query layer abstracts away some SQL expressiveness — for complex analytical queries you'd drop to `prisma.$queryRaw`. For this project that tradeoff is correct.

### Auth

**Clerk**

Clerk handles signup, login, session management, and JWT issuance. Building auth from scratch — even with a library like NextAuth or Lucia — takes time that should go into product. Clerk's React SDK gives you `<SignIn />`, `<SignUp />`, and `useUser()` that just work. On the backend, Hono middleware validates the Clerk JWT on protected routes. The tradeoff is vendor dependency and a small cold-start overhead on the auth check, both acceptable for this context. Each authenticated user maps to a `User` row in Postgres keyed on Clerk's `userId`.

### Database

**PostgreSQL**

Postgres over SQLite because this application has financial transaction semantics. Balance debits on order fill need to be atomic — if the order record writes but the balance update fails, the user gets a free trade. Postgres row-level locking and transactions prevent that. SQLite would work for a single-server demo but doesn't give you the ACID guarantees you'd want to defend in a fintech context.

All monetary values are stored as integer cents in Postgres. No floats in the database anywhere.

### Financial math

**Decimal.js**

All arithmetic that touches money goes through Decimal.js on the backend before any database write. JavaScript's native floating point is not safe for financial calculations — `0.1 + 0.2 === 0.30000000000000004`. The pattern: read integer cents from Postgres → convert to Decimal → compute → round to nearest cent → write integer cents back. The frontend receives pre-rounded values and formats them for display. Floats never touch a dollar amount at any layer.

### Caching

**Redis**

Redis sits in front of the Onyx API calls on the backend with an 8-second TTL on game and price data. Without it, every user polling market data would generate a direct Onyx API call on every request — a rate limiting problem at even modest traffic. With it, the Onyx API gets hit at most once per 8 seconds regardless of how many users are active. TanStack Query on the frontend polls every 10 seconds for live games and 30 seconds for scheduled games, so the data users see is always within one cache cycle of fresh.

### Deployment

**Vercel + Railway**

Vercel for the frontend because it's zero-config Vite deploy with instant CDN distribution and a clean subdomain out of the box. Railway for everything backend because it runs persistent Node servers — not serverless functions — which means stable Redis connections and no cold start latency on API routes. Render was considered as a Railway alternative but its free tier has 30-second cold starts on inactivity, which would make the demo look broken.

Vercel provides CI/CD out of the box. Every push to main triggers a build and deploys automatically. GitHub Actions was considered for additional checks like TypeScript validation and Prisma migration guards before merge, but given the time constraint, relying on Vercel's built-in pipeline was the right tradeoff.

**Why not AWS**

Speed of deployment for a time-boxed exercise. Railway and Vercel go from code to live URL in minutes. On AWS you're making decisions about EC2 vs ECS vs Lambda, configuring VPCs, security groups, IAM roles, and load balancers — none of it is hard, but it's 45–60 minutes of infrastructure configuration that doesn't demonstrate product thinking. For a production system with real users the stack would be AWS throughout: RDS for Postgres, ElastiCache for Redis, ECS for the backend, CloudFront for the frontend.

---

## What I would build next

**Cash out** — A cash out option for open bets using current line movement to calculate fair value. For live games, cash out value would be derived from how the spread has moved relative to the original bet. For pre-game bets, a simple stake-minus-vig return. This requires comparing the original line at bet placement against the current line from the sportsdata API.

**Admin balance management** — A lightweight admin panel to manually adjust user balances and trigger bet settlement for testing. Currently settlement runs automatically on a 60-second scheduler when games go Final, but there's no way to force a settlement or correct a balance without directly querying the database.
