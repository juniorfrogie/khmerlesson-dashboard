# API Update Notes — Mobile Developer Reference

Date: 2026-05-15  
Updated by: Backend review (security & purchase flow fixes)

---

## Summary of Changes

Several endpoints were updated for security, idempotency, and correct purchase access control. The changes below describe what the mobile app must update.

---

## 1. POST /api/v1/verify-purchase

> **This endpoint is now optional.** `purchase-history` verifies the JWS with Apple on its own. Call this only if you want a pre-flight check before recording.

### What changed
- **Auth:** Now requires `Authorization: Bearer <accessToken>`. API key alone is no longer sufficient.
- **New field:** `mainLessonId` should be included. The backend uses it to validate against the correct product ID.

### Request body

```json
{
  "mainLessonId": 7,
  "jws": "<JWS string>",
  "platformType": "ios"
}
```

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ "message": "Transaction verified." }` | Verified successfully |
| `400` | `{ "message": "Transaction failed." }` | Apple verification failed |
| `401` | `{ "message": "...", "code": "TOKEN_EXPIRED" }` | Token missing or expired — refresh and retry |

---

## 2. POST /api/v1/purchase-history

### What changed
- **Auth:** Now requires `Authorization: Bearer <accessToken>`. API key alone is no longer sufficient.
- **`userId` and `userEmail` are ignored from the request body.** The backend reads them from the JWT.
- **`mainLessonId` is required.** Used for Apple product ID validation and to record the purchase.
- **Idempotent:** If the same `(purchaseId, userId, mainLessonId)` was already recorded, returns `200` with the existing record. Safe to call multiple times.
- **Standalone:** Does not require `verify-purchase` to be called first. Verifies the JWS with Apple itself if needed.

### Request body

```json
{
  "mainLessonId": 7,
  "purchaseId": "0",
  "platformType": "ios",
  "purchaseAmount": 100,
  "purchaseDate": "2026-05-15T10:00:00.000Z",
  "paymentStatus": "completed",
  "jws": "<JWS string from StoreKit>"
}
```

> `userId` and `userEmail` are no longer required — the server reads these from your access token.

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `201` | Purchase record | New purchase recorded |
| `200` | Purchase record | Already recorded — idempotent success |
| `400` | `{ "message": "Create purchase history failed." }` | JWS verification failed |
| `401` | `{ "message": "...", "code": "TOKEN_EXPIRED" }` | Token missing or expired — refresh and retry |

---

## 3. GET /api/v1/main-lessons/:id/lessons

### What changed
- **Premium courses now enforce purchase.** If the course is not free, the backend checks whether the authenticated user has a completed purchase before returning the lesson list.

### Responses

| Status | Meaning |
|--------|---------|
| `200` | Lesson list returned |
| `401` + `code: "TOKEN_EXPIRED"` | Course is premium and user is not logged in |
| `403` | Course is premium and user has not purchased it |
| `404` | Main lesson not found |

---

## 4. GET /api/v1/lessons/:id

### What changed
- **Premium lesson content is now gated.** If the lesson belongs to a premium course, the backend checks for a completed purchase before returning the lesson content.

### Responses

| Status | Meaning |
|--------|---------|
| `200` | Lesson content returned |
| `401` + `code: "TOKEN_EXPIRED"` | Lesson is premium and user is not logged in |
| `403` | Lesson is premium and user has not purchased the course |
| `404` | Lesson not found or not published |

---

## 5. Token Expiry — Standard Error Shape

All protected endpoints return this shape when the access token is missing or expired:

```json
{
  "message": "Access token expired. Please refresh your token.",
  "code": "TOKEN_EXPIRED"
}
```

**Action:** Call `POST /api/auth/refresh-token` with your refresh token, then retry the original request with the new access token.

---

## 6. No Changes To

The following endpoints are **unchanged** and work as before:

- `GET /api/v1/main-lessons` — public, returns `hasPurchased` per user
- `GET /api/v1/lessons/level/:level` — public
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/register-auth-service` — upsert behaviour (returns token for existing users)
- `POST /api/auth/refresh-token`
- `POST /api/auth/verify-apple-id-token`
- `GET /api/v1/quizzes` and related quiz endpoints

---

## Recommended Purchase Flow

`verify-purchase` is **optional**. Use the minimal flow unless you specifically need a pre-flight check.

**Minimal flow (recommended):**

```
1. POST /api/v1/purchase-history   { jws, mainLessonId, ... }  →  201 / 200
2. finishTransaction() on device
3. GET  /api/v1/main-lessons                                    →  hasPurchased: true
```

**Two-step flow (saves one Apple API call via server-side cache):**

```
1. POST /api/v1/verify-purchase    { jws, mainLessonId }        →  200
2. POST /api/v1/purchase-history   { jws, mainLessonId, ... }   →  201 / 200
3. finishTransaction() on device
4. GET  /api/v1/main-lessons                                    →  hasPurchased: true
```

`purchase-history` is safe to retry — it returns the existing record on duplicate calls instead of an error.
