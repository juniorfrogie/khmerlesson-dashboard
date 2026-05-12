# Code Review: `server/api.ts`

## Summary

The file is a well-structured Express router (~526 lines) but carries several **security gaps**, **logic bugs**, **architectural issues**, and **dead code** worth addressing.

---

## 🔴 Critical Issues

### 1. `GET /me` — No Authentication Middleware
`req.user` is accessed but **no middleware is attached** to this route. `req.user` will always be `undefined`, causing a runtime crash (`Cannot read properties of undefined`).

```diff
- router.get("/me", async (req: any, res) => {
+ router.get("/me", authenticateAPI, async (req: any, res) => {
```

> **Root cause**: The JWT `authenticateToken` middleware (lines 49–70) is commented out, and `authenticateAPI` only checks an API key — it never sets `req.user`. The `/me` route needs actual JWT auth wired up.

---

### 2. `POST /purchase-history` — No Authentication
Anyone can POST purchase history records without any identity check. This endpoint should at minimum require `authenticateAPI`, and ideally full JWT auth.

```diff
- router.post("/purchase-history", async (req, res) => {
+ router.post("/purchase-history", authenticateAPI, async (req, res) => {
```

---

### 3. `POST /verify-purchase` — No Authentication
Same issue. The JWS receipt can be probed freely without any auth. Requires `authenticateAPI` at minimum.

---

### 4. `authenticateAPI` Skips All Auth in Non-Production
In dev/staging, `authenticateAPI` does **nothing** — it just calls `next()`. Combined with no JWT middleware, all "protected" routes are fully open in non-production environments.

```typescript
// Current: completely open in dev
if(process.env.NODE_ENV === "production"){
  if (apiKey !== process.env.API_KEY) { ... }
}
```

Consider always validating the key if it's set:
```typescript
const apiKey = req.header('X-API-Key') || req.query.api_key;
const configuredKey = process.env.API_KEY;

if (configuredKey && apiKey !== configuredKey) {
  return res.status(401).json({ error: 'Unauthorized', message: 'Valid API key required' });
}
```

---

## 🟠 Significant Issues

### 5. Route Ordering Conflict: `/quizzes/:id` vs `/quizzes/lesson/:lessonId`
Express matches routes **in declaration order**. Since `/quizzes/:id` (line 275) is declared **before** `/quizzes/lesson/:lessonId` (line 307), the second route will **never be reached** — `"lesson"` matches `:id`.

**Fix**: Declare the specific route first.
```diff
+ router.get("/quizzes/lesson/:lessonId", authenticateAPI, ...)  // ← Move ABOVE
  router.get("/quizzes/:id", ...)
- router.get("/quizzes/lesson/:lessonId", authenticateAPI, ...)  // ← Remove from here
```

Same issue exists with `/lessons/level/:level` (line 210) vs `/lessons/:id` (line 154). Move `/lessons/level/:level` **above** `/lessons/:id`.

---

### 6. Section Content Mutation via `Object.assign`
`GET /lessons/:id` mutates the `sections` objects in-place:
```typescript
Object.assign(section, { items: parsedEntries })
```
If the `lesson` object is cached anywhere (in-memory, ORM cache), this will corrupt the cached object across requests. Use a non-mutating spread instead:

```typescript
const enrichedSections = sections.map(section => {
  // ... parse entries
  return { ...section, items: parsedEntries };
});
```

---

### 7. No Input Validation on `:id` Params
`parseInt(req.params.id)` returns `NaN` for invalid inputs (e.g., `/lessons/abc`), which is silently passed to the DB layer.

```typescript
const id = parseInt(req.params.id);
if (isNaN(id) || id <= 0) {
  return res.status(400).json({ success: false, error: 'Invalid ID parameter' });
}
```

---

### 8. Quiz Submit — No Validation on `answers` Body
`req.body.answers` is used directly with no schema validation. An attacker can send malformed data to crash the scoring logic.

```typescript
// Add before scoring:
if (!Array.isArray(answers)) {
  return res.status(400).json({ success: false, error: 'answers must be an array' });
}
```

Consider using Zod schema like `insertPurchaseHistorySchema` already does.

---

## 🟡 Code Quality & Architecture

### 9. Excessive Dead Code (commented-out blocks)
Lines 22–35, 49–70, 97–133 are large commented-out blocks that clutter the file. These should be:
- **Removed** if no longer needed, or
- **Tracked in Git history** and removed from source

### 10. `any` Types Everywhere
Most route handlers use `req: any, res: any`. Define proper types:

```typescript
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: number; email: string; /* etc */ };
}
```

### 11. Duplicated Status Filtering Logic
`quiz.status === 'active'` appears in **4 separate places** and `lesson.status === 'published'` in **3 places**. Push this filtering into the controller/service layer.

### 12. `GET /lessons/level/:level` — Full Table Scan
Fetches **all lessons** then filters in JS. If the dataset is large, this should be a DB-level query:
```typescript
// Instead of:
const lessons = await lessonController.getAllLessons();
const filteredLessons = lessons.filter(l => l.level === level);

// Prefer:
const filteredLessons = await lessonController.getLessonsByLevel(level);
```

Same applies to `GET /quizzes/lesson/:lessonId` and `GET /search`.

### 13. Error Logging is Inconsistent
Some catch blocks `console.error(error)` (lines 86, 492, 521), others are silent. All production errors should be logged consistently.

### 14. Inconsistent Response Shape
- Most routes return `{ success: true, data: ..., total: ... }`
- `/purchase-history` returns raw object from controller
- `/me` returns a custom object directly

Standardize all responses through a helper:
```typescript
const ok = (data: any, total?: number) => ({ success: true, data, ...(total !== undefined && { total }) });
const fail = (message: string, code = 500) => ({ success: false, error: message });
```

### 15. Magic Number: Passing Grade of 70
```typescript
passed: score >= 70, // 70% passing grade
```
This should be a named constant or configurable value:
```typescript
const PASSING_GRADE_PERCENT = 70;
passed: score >= PASSING_GRADE_PERCENT,
```

---

## 🟢 Quick Wins Summary

| # | Priority | Issue | Fix |
|---|----------|-------|-----|
| 1 | 🔴 Critical | `/me` crashes — `req.user` is undefined | Add JWT auth middleware |
| 2 | 🔴 Critical | `/purchase-history` unauthenticated | Add `authenticateAPI` |
| 3 | 🔴 Critical | `/verify-purchase` unauthenticated | Add `authenticateAPI` |
| 4 | 🔴 Critical | Auth skipped entirely in dev | Validate key when `API_KEY` is set |
| 5 | 🟠 High | Route order conflict (quizzes + lessons) | Reorder specific routes before dynamic ones |
| 6 | 🟠 High | Mutating cached lesson sections | Use spread instead of `Object.assign` |
| 7 | 🟠 High | NaN IDs passed to DB | Validate `parseInt` result |
| 8 | 🟠 High | Unvalidated quiz `answers` body | Add Array + schema check |
| 9 | 🟡 Medium | Large dead code blocks | Remove commented code |
| 10 | 🟡 Medium | `any` types everywhere | Add `AuthRequest` interface |
| 11 | 🟡 Medium | Repeated status filter logic | Push to controller/service layer |
| 12 | 🟡 Medium | Full table scan for filtered queries | Add DB-level filter methods |
| 13 | 🟡 Medium | Inconsistent error logging | Centralize error handler middleware |
| 14 | 🟡 Medium | Inconsistent response shape | Add response helper util |
| 15 | 🟢 Low | Magic number `70` (passing grade) | Extract to named constant |
