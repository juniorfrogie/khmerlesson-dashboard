# Purchase API — Backend Implementation Guide

Mobile platform: React Native (iOS + Android)  
IAP library: `react-native-iap` v15  
Store: Apple App Store (StoreKit 2), Google Play  

---

## Overview

The mobile app uses native in-app purchase (IAP) to collect payment from Apple/Google, then calls two backend endpoints to record the entitlement:

```
Mobile                          Apple StoreKit            Backend
  |                                   |                      |
  |-- requestPurchase(sku) ---------->|                      |
  |<-- signed JWS transaction --------|                      |
  |-- POST /api/v1/verify-purchase ------------------------->|
  |<-- 200 OK ------------------------------------------------|
  |-- POST /api/v1/purchase-history ------------------------->|
  |<-- 200 OK ------------------------------------------------|
  |-- finishTransaction() ------>|                            |
```

After both calls succeed the app navigates to the course. `GET /api/v1/main-lessons` must then return `hasPurchased: true` (or `isLocked: false`) for the purchased product so the user can access content on every subsequent app launch.

---

## 1. POST /api/v1/verify-purchase

**Purpose:** Validate the receipt/JWS with Apple or Google and confirm the purchase is genuine. This is the idempotent trust anchor — it must succeed (or be already-verified) before history is written.

**Auth:** Bearer token (`Authorization: Bearer <accessToken>`)

**Request body (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Internal user ID |
| `userEmail` | string | User's email address |
| `mainLessonId` | number | Course/lesson ID being purchased |
| `purchaseId` | string | Transaction ID from StoreKit (`transactionId`). **"0" in Xcode environment** — see §4 |
| `platformType` | `"ios"` \| `"android"` | Device platform |
| `purchaseAmount` | number | Price in major currency units (e.g. `1.00` for $1.00) |
| `purchaseDate` | string | ISO 8601 timestamp (e.g. `"2025-05-14T10:41:02.581Z"`) |
| `paymentStatus` | `"completed"` | Always `"completed"` from the mobile app |
| `receipt` | string \| null | Raw `purchaseToken` value. On iOS (StoreKit 2) this is identical to `jws`. On Android this is the Google Play purchase token. |
| `jws` | string \| null | iOS only: the signed JWS transaction string (compact serialization). On Android: `null`. |

**Example request (iOS):**

```json
{
  "userId": "123",
  "userEmail": "user@example.com",
  "mainLessonId": 7,
  "purchaseId": "0",
  "platformType": "ios",
  "purchaseAmount": 1.00,
  "purchaseDate": "2025-05-14T10:41:02.581Z",
  "paymentStatus": "completed",
  "receipt": "<JWS string>",
  "jws": "<JWS string>"
}
```

**Expected responses:**

| Status | Meaning |
|--------|---------|
| `200` | Verified successfully |
| `200` | Already verified (idempotent — do not return 4xx for a duplicate) |
| `400` | Invalid receipt / verification failed with Apple |
| `401` | Access token invalid or expired (mobile will refresh and retry) |

**Idempotency:** The mobile app calls this endpoint again on every "resume entitlement" flow (user re-opens the purchase screen for a product they already own). The backend **must not** return an error for a transaction that was already verified. Use `purchaseId` + `platformType` as the uniqueness key; if a record already exists return `200`.

---

## 2. POST /api/v1/purchase-history

**Purpose:** Record the purchase event and grant access. After this call succeeds, `GET /api/v1/main-lessons` must reflect the entitlement.

**Auth:** Bearer token

**Request body (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Internal user ID |
| `mainLessonId` | number | Course/lesson ID |
| `purchaseId` | string | Transaction ID (same as verify-purchase) |
| `platformType` | `"ios"` \| `"android"` | Device platform |
| `purchaseAmount` | number | Price in major currency units |
| `purchaseDate` | string | ISO 8601 timestamp |
| `paymentStatus` | `"completed"` | Always `"completed"` |
| `jws` | string \| null | Same as verify-purchase |
| `receipt` | string \| null | Same as verify-purchase |

**Expected responses:**

| Status | Meaning |
|--------|---------|
| `200` or `201` | History recorded, access granted |
| `200` | Already recorded (idempotent — same rule as verify-purchase) |
| `401` | Access token invalid/expired |

**Idempotency:** Same requirement. If a history record already exists for `(userId, mainLessonId, purchaseId)` return success without creating a duplicate.

---

## 3. Suggested Database Schema

```sql
CREATE TABLE purchase_history (
  id                BIGSERIAL PRIMARY KEY,
  user_id           TEXT NOT NULL,
  main_lesson_id    INTEGER NOT NULL,
  purchase_id       TEXT NOT NULL,          -- StoreKit transactionId / Google purchaseToken hash
  platform_type     TEXT NOT NULL,          -- 'ios' | 'android'
  purchase_amount   NUMERIC(10, 2),
  purchase_date     TIMESTAMPTZ,
  payment_status    TEXT NOT NULL DEFAULT 'completed',
  jws               TEXT,                   -- raw JWS string (iOS only)
  receipt           TEXT,                   -- purchaseToken (iOS = same as jws, Android = token)
  environment       TEXT,                   -- 'Xcode' | 'Sandbox' | 'Production' (decoded from JWS)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, main_lesson_id, purchase_id)   -- idempotency key
);

CREATE INDEX ON purchase_history (user_id, main_lesson_id);
```

The `environment` column should be populated by decoding the JWS payload (see §4).

---

## 4. JWS Payload (iOS)

Apple's StoreKit 2 returns purchases as a **JSON Web Signature** (JWS) compact serialization:  
`<header>.<payload>.<signature>`

Decode `base64url(payload)` to get a JSON object. Example decoded from a real Xcode test transaction:

```json
{
  "environment": "Xcode",
  "transactionId": "0",
  "originalTransactionId": "0",
  "productId": "premium_vocabulary_yearly",
  "type": "Non-Consumable",
  "inAppOwnershipType": "PURCHASED",
  "bundleId": "com.digital606.khmerlesson",
  "currency": "USD",
  "price": 1000,
  "purchaseDate": 1778775662581,
  "storefront": "USA",
  "storefrontId": "143441"
}
```

### Key fields

| JWS field | Notes |
|-----------|-------|
| `environment` | `"Xcode"` (local simulator), `"Sandbox"` (TestFlight / real device sandbox account), `"Production"` (live App Store) |
| `transactionId` | **Always `"0"` in Xcode environment.** Real sandbox/production transactions have a UUID. Use `(purchaseId, platformType, environment)` together as the uniqueness key, or simply skip strict uniqueness checks for `environment = "Xcode"` during development. |
| `price` | **Milliunits** — divide by 1000 to get the amount in major currency units. `1000` → `$1.00` USD. |
| `purchaseDate` | Unix timestamp in **milliseconds** — divide by 1000 for seconds / use directly with `new Date(ms)`. |
| `type` | `"Non-Consumable"`, `"Auto-Renewable Subscription"`, `"Consumable"`, etc. |
| `inAppOwnershipType` | `"PURCHASED"` (user bought it) or `"FAMILY_SHARED"` (family sharing) |

### Verifying the JWS with Apple

For production, verify the JWS against Apple's certificate chain using the App Store Server API:

- **Sandbox:** `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/{transactionId}`
- **Production:** `https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}`

Apple's public root certificate: [AppleRootCA-G3.cer](https://www.apple.com/certificateauthority/)

The JWS header contains `x5c` with the certificate chain. Standard JWS verification (RS256 or ES256) against that chain is sufficient.

For the **Xcode environment** (`transactionId: "0"`), Apple's API will return 404 — skip remote verification and trust the JWS structure alone during development/testing.

---

## 5. Environment Handling

| `environment` value | Where it occurs | `transactionId` | Recommendation |
|--------------------|-----------------|-----------------|----------------|
| `"Xcode"` | iOS Simulator with `.storekit` config file | Always `"0"` | Accept without Apple API verification; skip uniqueness check on `purchaseId` |
| `"Sandbox"` | Real device with sandbox App Store account / TestFlight | UUID string | Verify against sandbox API; enforce uniqueness |
| `"Production"` | Live App Store purchase | UUID string | Verify against production API; enforce uniqueness |

The mobile app does **not** send the environment field — extract it from the decoded JWS payload.

---

## 6. Entitlement — main-lessons API

After a successful `purchase-history` write, the user must have permanent access. The `GET /api/v1/main-lessons` (or equivalent lesson-detail) endpoint should include:

```json
{
  "id": 7,
  "title": "Premium Vocabulary",
  "isLocked": false,
  "hasPurchased": true
}
```

The mobile app checks `hasPurchased` (or `isLocked`) on every load to decide whether to show the Unlock button or full course content. Without this flag persisting after purchase the user will be prompted to buy again on their next app session.

---

## 7. Auth Endpoint — register-auth-service

**Current issue:** `POST /api/auth/register-auth-service` returns a non-2xx error for users who already have an account (Apple or Google social login), causing the mobile app to show an error on every sign-in after the first.

**Required behaviour:** This endpoint must act as an **upsert** — create the user if new, or return a valid session if the user already exists. The response body should always contain `token` and `refreshToken` on success regardless of whether a new account was created.

If changing to a true upsert is not feasible, the `verify-apple-id-token` response already returns `token` for existing Apple users — the mobile app now handles that path. But for Google login there is no equivalent pre-check, so `register-auth-service` must handle returning users gracefully.

---

## 8. Token Refresh

The mobile app handles `TOKEN_EXPIRED` automatically:

1. Backend returns HTTP 401 with JSON body `{ "code": "TOKEN_EXPIRED", "message": "..." }`
2. Mobile calls `POST /api/auth/refresh-token` with `{ "refreshToken": "<token>" }`
3. Backend returns `{ "accessToken": "<new>", "refreshToken": "<new or same>" }`
4. Mobile retries the original request with the new token

Ensure `verify-purchase` and `purchase-history` return this exact error shape for expired tokens so the retry loop works correctly.

---

## 9. Error Response Shape

All endpoints should use a consistent JSON error body so the mobile app can surface meaningful messages:

```json
{
  "message": "Human-readable error description",
  "code": "MACHINE_READABLE_CODE"
}
```

Known codes the mobile app handles:

| `code` | Behaviour |
|--------|-----------|
| `TOKEN_EXPIRED` | Triggers silent token refresh + retry |
| _(any other)_ | Displayed as an alert to the user |
