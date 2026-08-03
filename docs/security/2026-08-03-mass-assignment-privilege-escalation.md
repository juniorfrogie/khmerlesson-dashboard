# Mass Assignment / Missing Authorization — 2026-08-03

## Source

Anonymous report received via email, self-identified as "Rathank Phoung, Security Researcher."
Reported against `https://khmerlessons.app`. Report claims Critical severity: Mass Assignment
(Privilege Escalation) on `POST /api/auth/register`, plus unspecified "Dashboard Information
Disclosure."

Reporter's PoC claimed registering with `"role": "admin"` in the request body returns a
created admin user (`id: 26`). Not independently reproduced against prod (no test account was
created), but confirmed by code review below — production `users.id` currently tops out at 16,
so the reporter's exact PoC response is not literally reflected in current DB state.

## Status: confirmed by code review AND confirmed exploited against production prior to this report

Three accounts believed to have been created by the reporter (or another party) as part of the
PoC were found and deleted by the team (khmerlesson admin) before this review began. Their
details (email, role, timestamps) were not captured before deletion, so the exact scope of what
was accessed cannot be reconstructed from the current `users` table alone — see "Follow-up"
below.

## Finding 1 — Mass assignment on registration (as reported)

`server/auth/register/route.ts:12` parses the request body directly with `insertUserSchema`:

```ts
const userData = insertUserSchema.parse(req.body);
...
const user = await controller.createUser(userData);
```

`insertUserSchema` (`shared/schema.ts:205`) only omits `id`, `createdAt`, `updatedAt` — it does
**not** omit `role` or `isActive`. `createUser` (`server/features/users/controller/controller.ts:58`)
spreads the parsed input straight into the insert with no field allowlist:

```ts
const userToInsert = { ...insertUser, password: hashedPassword };
const [user] = await db.insert(users).values(userToInsert).returning();
```

Any unauthenticated caller can `POST /api/auth/register` with `"role": "admin", "isActive": true`
and receive back a valid admin JWT. Matches the report.

## Finding 2 — same mass-assignment bug on user update (not in the report, found during verification)

`PUT /api/users/:id` (`server/features/users/route/route.ts:88`) passes `req.body` straight to
`controller.updateUser(userId, req.body)` with no schema validation and no field allowlist. Any
caller who can reach this route can set `role: "admin"` on **any** user id, including their own.

## Finding 3 — no role/authorization check on most dashboard feature routes (broader than the report)

`authenticateToken` (`server/auth/middleware/authenticate.ts`) only verifies the JWT is valid —
it never checks `role`. Route-level authorization is opt-in per feature module and most modules
don't opt in:

| Feature route | Admin-role check present? |
|---|---|
| `debug-logs` | ✅ (`req.user?.role !== "admin"`) |
| `subscription-plans` | ✅ |
| `subscriptions` | ✅ |
| `users` | ❌ |
| `main-lessons` | ❌ |
| `lessons` | ❌ |
| `lesson-types` | ❌ |
| `quizzes` | ❌ |
| `export` | ❌ |
| `import` | ❌ |

Practical effect: **any** authenticated principal — including a normal mobile-app `student`
account, since dashboard and mobile share the same JWT/middleware — can currently list/view/
update/delete all users via `/api/users`, bulk-export the DB via `/api/export`, bulk-import
arbitrary records via `/api/import`, and fully manage lessons/quizzes/lesson-types. This is the
"Dashboard Information Disclosure" the reporter gestured at, and it's exploitable independently
of Finding 1 (a plain `student` registration is enough — no privilege escalation needed to reach
it).

## Verification performed

- Read `server/auth/register/route.ts`, `shared/schema.ts` (`insertUserSchema`,
  `insertUserWithAuthServiceSchema`, `updateUserSchema`), `server/features/users/controller/controller.ts`,
  `server/features/users/route/route.ts`, `server/auth/middleware/authenticate.ts`, and every
  `server/features/*/route/route.ts` for role-check presence.
- Queried production `users` table (`id, email, role, is_active, registration_type, created_at`,
  40 most recent) via `DATABASE_URL`. Result: 14 rows, only `id=1` (`admin@khmer.com`, created
  2025-08-15) has `role='admin'`. No account matching the reporter's PoC email
  (`researcher-test@example.com`) or id (`26`) exists — **but per the team, that's because three
  accounts believed to be the reporter's were already found and manually deleted before this
  review**, not because the endpoint is unreachable. Treat this as **confirmed exploited against
  production**, not merely theoretical.

## Follow-up needed

- The three deleted accounts' emails/roles/timestamps were not recorded before deletion, and
  **`debug_logs` cannot fill that gap**: `server/auth/register/route.ts` never calls
  `traceLogger` (only `console.error` on failure — nothing persisted on success), so there is no
  DB record of registration requests at all. `debug_logs` in this environment only spans
  2026-07-02 → 2026-07-19 and is populated almost entirely by mobile-client subscription/reconcile
  noise (`khmerlesson-app/src/shared/utils/logger.ts`) — nothing auth-related. **There is
  currently no audit trail for who registered, when, or with what role**, which is itself worth
  fixing (log registrations and role changes through `traceLogger`, independent of the schema fix).
- Check hosting/proxy access logs (outside this repo/DB — e.g. your PaaS provider's HTTP logs)
  for requests to `/api/auth/register`, `/api/users`, `/api/export`, `/api/import` around the
  time the three accounts existed, to determine what — if anything — was accessed with an
  escalated session before the accounts were deleted.

## Remediation — implemented 2026-08-03

1. `shared/schema.ts`: `insertUserSchema` and `insertUserWithAuthServiceSchema` (public
   registration) now `.omit({ role: true, isActive: true })`. Both columns have DB-level
   defaults (`role="student"`, `isActive=true`), so omitting them from the parsed insert lets
   Postgres apply the safe default — the client can no longer set either field at registration.
2. `updateUserSchema` (admin-only dashboard user editing) was decoupled from `insertUserSchema`
   so it still allows `role`/`isActive` — those need to stay settable for legitimate admin user
   management, just not from an unauthenticated/self-service context. `PUT /api/users/:id`
   (`server/features/users/route/route.ts`) now validates `req.body` through this schema instead
   of passing it straight to the DB.
3. Added `server/auth/middleware/require-admin.ts` (`requireAdmin`) and applied
   `router.use(requireAdmin)` to every route file that had no authorization check:
   `users`, `main-lessons`, `lessons`, `lesson-types`, `quizzes`, `export`, `import`. These are
   all dashboard-only surfaces (mobile traffic uses the separate `/api/v1` router in
   `server/api.ts`, unaffected), and no `teacher`-role account exists or is treated specially
   anywhere in the codebase today, so locking to `admin`-only doesn't remove functionality from
   any current user. If teacher-level dashboard access becomes a real requirement later, these
   guards are the place to loosen.
4. Verified end-to-end against a running dev server:
   - `POST /api/auth/register` with `"role": "admin"` in the body now returns a `student`
     account.
   - A `student` JWT now gets `403 Admin access required.` from `GET /api/users`,
     `GET /api/export/lessons`, and `PUT /api/users/:id` (including a self-escalation attempt
     setting its own `role` to `admin`).
   - `npm run check` passes with no type errors from the schema changes.
   - Test account created during verification was deleted afterward.

## Still open

- No audit trail exists for registrations or role changes (see "Follow-up needed" above) — worth
  adding `traceLogger` calls to `server/auth/register/route.ts` and the `PUT /api/users/:id`
  role-change path as a separate follow-up, so a future incident like this one is actually
  reconstructable from the DB instead of relying on manual recollection.
- Hosting/proxy access logs from around when the three since-deleted accounts existed have not
  been reviewed (outside this repo's reach).
