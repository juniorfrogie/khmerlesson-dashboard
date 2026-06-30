# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Express + Vite HMR on same port)
npm run build      # vite build (client → dist/public) + esbuild (server → dist/index.js)
npm start          # Run production build: node dist/index.js
npm run check      # TypeScript type-check (no emit)
npm run db:push    # Push Drizzle schema to the database (dev — destructive on conflict)
npm run db:migrate # Generate and apply Drizzle migrations (safer for prod)
```

No test suite is configured.

## Environment Variables

Required in `.env` at project root:

```
NODE_ENV=development
DATABASE_URL=postgresql://...
BASE_URL=http://localhost
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
- `main_lessons` — `status: "draft" | "published" | "coming_soon"`, `requiredPlanLevel: integer` (1–5, minimum subscription plan to access), `order: integer` (drag-and-drop display order)
- `lessons` — `status: "draft" | "published"`, `level: "Beginner" | "Intermediate" | "Advanced"`, `sections: jsonb` (array of `{title, content, html, ops}` where `ops` is a Quill Delta)
- `lesson_type` — `icon: text`, `iconMode: "raw" | "file"` (raw = inline SVG/emoji, file = uploaded asset)
- `quizzes` — `status: "draft" | "active"`, `questions: jsonb`, optionally linked to a lesson
- `users` — `role: "admin" | "teacher" | "student"`, `registrationType: "authenication" | "google_service" | "apple_service"` (**note**: `"authenication"` is a typo baked into the DB default — do not correct it without a migration)
- `subscriptions` — user subscription records; `status: "trial" | "active" | "expired" | "cancelled"`, `planLevel: integer`, `platform: "ios" | "android"`, `originalTransactionId` (unique), `currentPeriodEndsAt`
- `subscription_plans` — admin-managed plan definitions; `planLevel: integer` (unique 1–5), `price` in cents, `productIdIos`, `productIdAndroid`, `isActive: boolean`
- `analytics` — tracks per-lesson/quiz `completions` and `averageScore`; populated via `DatabaseStorage` in `server/storage.ts`
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

Current features: `main-lessons`, `lessons`, `lesson-types`, `quizzes`, `users`, `subscriptions`, `subscription-plans`, `export`, `import`.

The `export` feature streams lessons/quizzes as downloadable JSON (`GET /api/export/lessons`, `GET /api/export/quizzes`). The `import` feature validates against Zod insert schemas before bulk-inserting (`POST /api/import/lessons`, `POST /api/import/quizzes`).

### Mobile API (`/api/v1`)

`server/api.ts` — mounted at `/api/v1`, behind `authenticateToken` (which calls `next()` even without a valid token, so `req.user` may be undefined). Routes check `req.user` themselves for gated content.

Response envelope: `{ success: true, data, total? }` (success) or `{ success: false, error: string }` (failure).

Optional `authenticateAPI` middleware within this router validates `X-API-Key` header or `?api_key=` when `API_KEY` env var is set.

Key endpoints:
- `GET /api/v1/main-lessons` — lists published + coming_soon courses; each entry includes `hasAccess` (based on user's active subscription vs `requiredPlanLevel`) and `comingSoon`
- `GET /api/v1/main-lessons/:id/lessons` — 401 if unauthenticated; 403 if subscription level insufficient or course is coming_soon
- `GET /api/v1/lessons/:id` — same subscription gate
- `GET /api/v1/subscription-plans` — public; lists active plans for the paywall UI
- `POST /api/v1/subscriptions` — verifies Apple StoreKit 2 JWS, upserts subscription record; in dev mode JWS verification is skipped
- `GET /api/v1/subscriptions/me` — returns user's active/trial subscription or null
- `GET /api/v1/quizzes`, `GET /api/v1/quizzes/:id`, `GET /api/v1/quizzes/lesson/:lessonId`

Quiz passing grade is 70% (`PASSING_GRADE_PERCENT` in `server/api.ts`).

Access control logic: `subscription.planLevel >= course.requiredPlanLevel && status IN ('trial','active') && currentPeriodEndsAt > now`.

### Server services

`server/services/` contains third-party integrations that are not tied to a feature CRUD module:

- `services/auth/apple/` — Apple Sign-In token verification (`verifyAppleToken`)
- `services/auth/google/` — Google OAuth helpers
- `services/iap/ios/storekit2/` — Apple StoreKit 2 subscription verification (`verifySubscription`, `decodeJWSPayload`, `markVerified`, `isTransactionVerified`). Checks `type === "Auto-Renewable Subscription"` and `offerType === INTRODUCTORY_OFFER` for trial detection. In development mode, JWS verification is skipped.

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
- Lesson section content is edited with a Quill v2 rich-text editor (`client/src/components/ui/quill-editor.tsx`); the `ops` field in `sections` stores Quill Delta format
- Main lesson ordering uses `@dnd-kit` drag-and-drop (`MainLessonsView.tsx`); the `order` column on `main_lessons` is the persisted sort index

## Planned Features

### AI Quiz Generation (not yet built)

After an admin creates/edits a lesson, a "Generate Quiz with AI" button should auto-generate quiz questions using the **Google Gemini API** (free tier, `gemini-1.5-flash` model).

**Environment variable:** `GEMINI_API_KEY` — add to `.env`

**Implementation plan:**
- Backend: `POST /api/ai/generate-quiz` (admin-only) — accepts `{ lessonId }`, fetches lesson content from DB, sends title + description + sections to Gemini, returns structured questions
- Questions must match the existing `quizzes.questions` jsonb format: `{ id, question, options: string[], correctAnswer: string }[]`
- Frontend: "Generate Quiz with AI" button on the lesson edit page — calls the endpoint, pre-populates the quiz creation form with results for admin review/edit before saving
- New quiz is linked to the lesson via `quizzes.lessonId` FK automatically
