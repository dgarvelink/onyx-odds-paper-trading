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
| Deployment | Railway (API + database + Redis), Vercel or similar (frontend) |

## Monorepo layout

```
apps/
  api/      Hono REST API, Prisma, settlement scheduler
  web/      Vite + React frontend
packages/
  types/    Shared Zod schemas and inferred TypeScript types
```
