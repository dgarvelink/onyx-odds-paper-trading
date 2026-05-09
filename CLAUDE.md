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

**Shared types flow one way.** `packages/types` exports Zod schemas and their inferred TypeScript types. Both `apps/web` and `apps/api` depend on it via `"@onyx-odds/types": "*"`. The types package must be built (`npm run build --workspace=packages/types`) before it can be imported at runtime; during dev in the web app Vite resolves it directly from source via the workspace symlink.

**API auth via Clerk.** The backend uses `@clerk/backend` for token verification. The frontend uses `@clerk/react`. Keys come from env vars — never hardcoded.

**Decimal precision.** Use `decimal.js` for all price/money arithmetic on the API side. JavaScript `number` is not used for financial values.

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
