# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Express + Vite HMR on same port)
npm run build      # vite build (client → dist/public) + esbuild (server → dist/index.js)
npm start          # Run production build: node dist/index.js
npm run check      # TypeScript type-check (no emit)
npm run db:push    # Push Drizzle schema to the database
```

No test suite is configured.

## Environment Variables

Required in `.env` at project root:

```
NODE_ENV=development
DATABASE_URL=postgresql://...
PORT=5001
TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
```

Optional (for full feature set):
- `BUCKET_*` — DigitalOcean Spaces S3-compatible file storage
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NODEMAILER_*` — Email (forgot password, etc.)
- `NODE_EXTRA_CA_CERTS` — Path to CA cert for SSL DB connections in prod

## Architecture

This is a monorepo with three packages sharing one `node_modules`:

- **`client/`** — React SPA (Vite, Wouter, TanStack Query, Tailwind + shadcn/ui)
- **`server/`** — Express API (TypeScript, tsx in dev / esbuild bundle in prod)
- **`shared/`** — Drizzle schema + Zod types shared by both sides

In development, the Express server hosts Vite as middleware (`server/vite.ts:setupVite`). In production, Express serves the pre-built `dist/public/` directory via `serveStatic`, which looks for that path relative to `import.meta.dirname` (i.e., the `dist/` folder). **Both client and server must be built before `npm start` works.**

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |

### Database

- PostgreSQL via `pg` (standard node driver, not Neon serverless)
- `shared/schema.ts` is the single source of truth for all table definitions and Zod insert schemas
- `server/db.ts` exports `db` (Drizzle instance) and `pool`
- `server/storage.ts` contains a thin `DatabaseStorage` class used only for dashboard analytics and the JWT blacklist — all other DB access goes directly through the feature controllers

### Auth

Dual-client auth supporting both the admin dashboard (cookies) and a mobile app (Bearer tokens):

- **`server/auth/token/token-service.ts`** — single source of truth for JWT generation, token TTLs (15m access / 1d prod, 7d refresh), and cookie configuration
- **`server/auth/middleware/authenticate.ts`** — centralised `authenticateToken` middleware; reads access token from `cookie.token` OR `Authorization: Bearer`; reads refresh token from `cookie.refreshToken` OR `req.body.refreshToken`; auto-refreshes for cookie-based clients only
- Logout adds the access token to a `blacklist` table; a node-cron job purges expired entries every 10 minutes
- `/api/v1/main-lessons` and `/api/v1/lessons` are semi-public: `authenticateToken` calls `next()` even without a valid token, leaving `req.user` undefined for the route handler to decide

### Server feature modules

Each domain lives under `server/features/<domain>/` with two layers:

```
server/features/<domain>/
  controller/controller.ts   # DB access via Drizzle, no Express types
  route/route.ts             # Express Router, calls controller
```

Feature routes are mounted in `server/routes.ts` and all require `authenticateToken` except the public auth endpoints.

The `server/api.ts` router (mounted at `/api/v1`) handles mobile-facing endpoints — iOS IAP verification, lesson purchase flow, quiz results — and aggregates several controllers.

### Client

- Single-page app with two routes: `/` and `/dashboard` (both render `<Dashboard>` when logged in, `<Login>` otherwise)
- `App.tsx` fetches `/api/me` on load to determine auth state; 401/403 responses redirect to `/`
- `client/src/lib/queryClient.ts` configures TanStack Query with `credentials: "include"` on all fetches and `staleTime: Infinity` (no automatic background refetch)
- UI components are shadcn/ui in `client/src/components/ui/`; domain components are co-located under `client/src/components/<domain>/`

### File uploads

- `POST /api/upload` saves files locally to `uploads/` via multer, then copies to DigitalOcean Spaces (S3-compatible)
- `uploads/` and `storages/` are served as static directories
- `DELETE /api/unlinkFile/:filename` requires `admin` role (enforced from `req.user.role`, not the request body)

### CORS

In production, only `https://cambodianlesson.netlify.app` is in the allowed-origins list (`server/routes.ts`). Update this when the frontend domain changes.
