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
- `API_KEY` — When set, gates mobile-facing `/api/v1` routes behind `X-API-Key` header or `?api_key=` query param
- `DEV_ORIGIN` — Extra allowed CORS origin in development (e.g. an Expo dev client URL)

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

Key tables and their status enums:
- `main_lessons` — `status: "draft" | "published"`, `free: boolean`, `price` in cents, `productId` for Apple IAP
- `lessons` — `status: "draft" | "published"`, `level: "Beginner" | "Intermediate" | "Advanced"`, `sections: jsonb` (array of `{title, content, html, ops}`)
- `quizzes` — `status: "draft" | "active"`, `questions: jsonb`
- `users` — `role: "admin" | "teacher" | "student"`, `registrationType: "authenication" | "google_service" | "apple_service"`
- `purchase_history` — `paymentStatus: "Complete" | "Refund" | "Pending" | "Cancel"`, unique on `(purchaseId, userId, mainLessonId)`
- `blacklist` — JWT blacklist with `expiredAt`; purged every 10 minutes by node-cron

### Auth

Dual-client auth supporting both the admin dashboard (cookies) and a mobile app (Bearer tokens):

- **`server/auth/token/token-service.ts`** — single source of truth for JWT generation, token TTLs (15m access / 1d prod, 7d refresh), and cookie configuration
- **`server/auth/middleware/authenticate.ts`** — centralised `authenticateToken` middleware; reads access token from `cookie.token` OR `Authorization: Bearer`; reads refresh token from `cookie.refreshToken` OR `req.body.refreshToken`; auto-refreshes for cookie-based clients only
- Logout adds the access token to the `blacklist` table; a node-cron job purges expired entries every 10 minutes
- Auth routes live under `server/auth/<flow>/route.ts` (no controller layer — logic is inline in the route file)

### Server feature modules

Each domain lives under `server/features/<domain>/` with two layers:

```
server/features/<domain>/
  controller/controller.ts   # DB access via Drizzle, no Express types
  route/route.ts             # Express Router, calls controller
```

Feature routes are mounted in `server/routes.ts` and all require `authenticateToken`.

Current features: `main-lessons`, `lessons`, `lesson-types`, `quizzes`, `users`, `purchase-history`, `export`, `import`.

### Mobile API (`/api/v1`)

`server/api.ts` — mounted at `/api/v1`, behind `authenticateToken` (which calls `next()` even without a valid token, so `req.user` may be undefined). Routes check `req.user` themselves for paid/premium content.

Response envelope: `{ success: true, data, total? }` (success) or `{ success: false, error: string }` (failure).

Optional `authenticateAPI` middleware within this router validates `X-API-Key` header or `?api_key=` when `API_KEY` env var is set.

Semi-public endpoints (no auth required but premium content is gated):
- `GET /api/v1/main-lessons` — lists all published main lessons
- `GET /api/v1/main-lessons/:id/lessons` — returns 401 if unauthenticated and lesson pack is paid; 403 if not purchased
- `GET /api/v1/lessons/:id` — same purchase gate as above
- `GET /api/v1/quizzes`, `GET /api/v1/quizzes/:id`, `GET /api/v1/quizzes/lesson/:lessonId`

Quiz passing grade is 70% (`PASSING_GRADE_PERCENT` in `server/api.ts`).

### Server services

`server/services/` contains third-party integrations that are not tied to a feature CRUD module:

- `services/auth/apple/` — Apple Sign-In token verification (`verifyAppleToken`)
- `services/auth/google/` — Google OAuth helpers
- `services/iap/ios/storekit2/` — Apple StoreKit 2 JWS purchase verification (`verifyPurchase`, `decodeJWSPayload`, `markVerified`, `isTransactionVerified`). In development mode, JWS verification is skipped.
- `services/paypal/` — PayPal payment routes (mounted at `/api`)

### Miscellaneous routes

- `GET /api/tts?q=<text>` — proxies Google Translate TTS (`translate.google.com`) for Khmer audio playback; unauthenticated
- `GET /privacy-policy` — serves `attached_assets/khmer-privacy-policy.html`
- `POST /api/auth/verify-apple-id-token` — Apple Sign-In entry point for the mobile app

### File uploads

- `POST /api/upload` saves files locally to `uploads/` via multer, then copies to DigitalOcean Spaces (S3-compatible)
- `uploads/` and `storages/` are served as static directories
- `DELETE /api/unlinkFile/:filename` requires `admin` role (enforced from `req.user.role`, not the request body)

### CORS

In production, allowed origins are `https://cambodianlesson.netlify.app` and `https://khmerlessons.app` (`server/routes.ts`). Update this list when the frontend domain changes.

In development, allowed origins include `localhost:3000`, `localhost:5001`, `localhost:5000`, `localhost:8081`, and `DEV_ORIGIN` if set.

### Client

- Pages live in `client/src/pages/`: `dashboard.tsx`, `login.tsx`, `reset-password.tsx`, `api-settings.tsx`, `payment-complete.tsx`, `payment-cancel.tsx`, `not-found.tsx`
- `App.tsx` fetches `/api/me` on load to determine auth state; 401/403 responses redirect to `/`
- `client/src/contexts/user-context.tsx` — React context providing the authenticated user to the component tree
- `client/src/lib/queryClient.ts` configures TanStack Query with `credentials: "include"` on all fetches and `staleTime: Infinity` (no automatic background refetch)
- UI components are shadcn/ui in `client/src/components/ui/`; domain components are co-located under `client/src/components/<domain>/`
