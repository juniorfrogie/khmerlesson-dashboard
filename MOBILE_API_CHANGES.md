# Mobile API Changes

This document describes what has changed in `/api/v1` and what the mobile app needs to update.

---

## Overview

The old per-course purchase model has been replaced with a **subscription plan** model. Users buy an annual plan (via Apple StoreKit 2), and each plan gives access to a specific set of courses configured by the admin.

Some courses can be marked **free** — accessible to anyone without an account or subscription.

---

## Authentication

JWT tokens now include a `role` field in the payload. No breaking change, but the token must be refreshed after this update (existing tokens without `role` still work for auth — they just won't carry a role).

---

## Removed

The following endpoints no longer exist:

| Old endpoint | Replacement |
|---|---|
| `POST /api/v1/purchase-history` | `POST /api/v1/subscriptions` |
| `POST /api/v1/verify-purchase` | `POST /api/v1/subscriptions` |

---

## Changed: `GET /api/v1/main-lessons`

**Authentication:** Optional. If a valid token is provided, `hasAccess` reflects the user's plan. Without a token, only free courses have `hasAccess: true`.

**Response — fields removed:**
- `hasPurchased`
- `isFree` (old boolean meaning "no price")
- `price`
- `productId`
- `requiredPlanLevel`

**Response — fields added:**

| Field | Type | Description |
|---|---|---|
| `isFree` | `boolean` | Course is free — no login or subscription needed |
| `hasAccess` | `boolean` | User can open this course (`true` if free OR user's plan includes it) |
| `comingSoon` | `boolean` | Course is visible but not yet openable |

**Example response item:**
```json
{
  "id": 1,
  "title": "Khmer Basics",
  "description": "...",
  "thumbnailUrl": "https://...",
  "isFree": false,
  "hasAccess": true,
  "comingSoon": false,
  "lessonCount": 8,
  "order": 0
}
```

**Recommended mobile logic:**
```
if comingSoon  → show lock + "Coming Soon" label
if hasAccess   → show open button
else           → show lock + "Subscribe" button
```

---

## Changed: `GET /api/v1/main-lessons/:id/lessons`

**Access rules:**

| Course type | Unauthenticated | Authenticated, no active plan | Authenticated, plan includes course |
|---|---|---|---|
| `isFree = true` | ✅ 200 | ✅ 200 | ✅ 200 |
| `isFree = false` | ❌ 401 | ❌ 403 | ✅ 200 |
| `status = coming_soon` | ❌ 403 | ❌ 403 | ❌ 403 |

**Error codes:**
- `401` + `code: "TOKEN_EXPIRED"` → token missing or expired, redirect to login
- `403` + `message: "Active subscription required."` → user needs to subscribe
- `403` + `message: "Content not yet available."` → coming soon

---

## Changed: `GET /api/v1/lessons/:id`

Same access rules as `/main-lessons/:id/lessons` above — inherits the free/subscription status from its parent course.

---

## New: `POST /api/v1/subscriptions`

Registers or renews a subscription after an Apple StoreKit 2 purchase.

**Authentication:** Required.

**Request body:**
```json
{ "jws": "<Apple JWS transaction string from StoreKit 2>" }
```

**How it works:**
1. Decodes the JWS and extracts `productId`, `originalTransactionId`, `expiresDate`, `offerType`
2. Looks up the matching plan in `subscription_plans` by `productIdIos`
3. Determines status: `offerType === 1` (introductory offer) → `"trial"`, otherwise `"active"`
4. Upserts the subscription record (conflict on `originalTransactionId`)

**Success response `201`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 42,
    "planId": 2,
    "platform": "ios",
    "productId": "com.khmerlesson.basic.annual",
    "originalTransactionId": "...",
    "status": "trial",
    "currentPeriodEndsAt": "2026-07-10T00:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error responses:**
- `400` — missing `jws`, invalid JWS, or unknown `productId`
- `400` — Apple verification failed (production only)
- `401` — not authenticated

> **Dev mode note:** In `NODE_ENV=development`, Apple JWS verification is skipped. You can pass any base64-encoded JSON payload as `jws` for testing.

---

## New: `GET /api/v1/subscriptions/me`

Returns the current user's active or trial subscription, or `null` if none.

**Authentication:** Required.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 42,
    "planId": 2,
    "platform": "ios",
    "status": "active",
    "currentPeriodEndsAt": "2027-06-26T00:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Returns `"data": null` if no active/trial subscription exists or if it has expired.

---

## Existing: `GET /api/v1/subscription-plans`

No change. Returns all active plans for the paywall UI. Public — no auth required.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic",
      "price": 900,
      "productIdIos": "com.khmerlesson.basic.annual",
      "productIdAndroid": null,
      "description": "Access to beginner courses",
      "isActive": true
    }
  ],
  "total": 1
}
```

`price` is in **cents** (900 = $9.00).

---

## Subscription status values

| Status | Meaning |
|---|---|
| `"trial"` | Free introductory offer period (Apple `offerType = 1`) |
| `"active"` | Paid and within validity period |
| `"expired"` | Past `currentPeriodEndsAt` |
| `"cancelled"` | User cancelled |

Active access check: `status IN ("trial", "active") AND currentPeriodEndsAt > now`.

---

## Response envelope

All `/api/v1` responses follow the same envelope:

```json
{ "success": true, "data": ..., "total": ... }
{ "success": false, "error": "..." }
```
