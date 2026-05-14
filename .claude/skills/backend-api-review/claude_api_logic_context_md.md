# context.md

## Project Overview

This project is a lesson platform with both free and premium `main_lesson` content.

The API logic must prioritize:

- Secure access control
- Clear purchase validation flow
- Minimal unnecessary token validation
- Good separation of authentication vs authorization
- Preventing frontend-only security logic
- Clean backend-first permission checks

Claude should carefully review:

- Authentication flow
- Purchase validation logic
- Token verification logic
- Route protection
- Database query optimization
- API response consistency
- Edge cases
- Security vulnerabilities
- Backend best practices

Claude should suggest improvements whenever:

- Logic is duplicated
- Middleware is missing
- API flow is insecure
- Queries are inefficient
- Token checks are redundant
- Authorization is handled incorrectly
- Frontend is trusted too much
- Error handling is weak
- Business logic is mixed into controllers unnecessarily

---

# Business Flow

## 1. Public Lesson Access

### Requirement

- Loading `main_lesson` does NOT require authentication.
- Users can access FREE lessons without login.

### Expected Logic

```text
GET /main-lessons/:id
```

Backend should:

1. Load lesson metadata.
2. Check if lesson type is `free`.
3. If free:
   - Return lesson immediately.
   - No auth required.
4. If premium:
   - Return limited preview OR require auth.

Important:

- Avoid requiring JWT validation for free content.
- Do not block public traffic unnecessarily.
- Public endpoints should remain lightweight.

---

# 2. Premium Lesson Purchase Access Flow

## Requirement

Premium `main_lesson` requires purchase before full access.

Users must:

1. Login
2. Purchase premium content
3. Access lesson after successful purchase

---

# 3. Authentication Flow

## After Login

Backend should:

1. Verify JWT token.
2. Extract user ID securely.
3. Load user purchase records.
4. Check if user purchased the premium lesson.
5. If purchased:
   - Allow access.
6. If not purchased:
   - Return payment required / forbidden response.

---

# Recommended Backend Logic

## Good API Structure

```text
GET /main-lessons/:id
```

### Free Lesson

```text
if lesson.is_free:
    return lesson
```

### Premium Lesson

```text
if lesson.is_premium:
    if no auth token:
        return 401

    verify token

    if token invalid:
        return 401

    check purchase record

    if not purchased:
        return 403

    return premium lesson
```

---

# Important Best Practices

## 1. Do NOT Trust Frontend Purchase State

Bad practice:

```js
if (frontendSaysPurchased) {
  allowAccess();
}
```

Correct:

```js
const purchase = await db.purchases.findOne({
  userId,
  lessonId,
  status: 'paid'
})
```

Backend must always verify purchase ownership.

---

## 2. Avoid Rechecking JWT Multiple Times

Bad practice:

- Verifying token in every service
- Verifying token in controllers repeatedly
- Parsing JWT multiple times per request

Correct:

Use middleware once:

```text
authMiddleware
```

Then attach:

```text
req.user
```

Example:

```js
req.user = decodedUser
```

---

## 3. Separate Authentication vs Authorization

Authentication:

```text
Who is the user?
```

Authorization:

```text
Can the user access this premium lesson?
```

Do not combine both carelessly.

---

## 4. Use Dedicated Purchase Middleware

Recommended:

```text
requirePurchase(mainLessonId)
```

Example flow:

```text
route
 → authMiddleware
 → requirePurchase
 → controller
```

Benefits:

- Reusable
- Cleaner controllers
- Easier maintenance
- Consistent security

---

# Suggested Database Tables

## users

```text
id
email
password_hash
```

## main_lessons

```text
id
title
is_free
price
```

## purchases

```text
id
user_id
lesson_id
status
purchased_at
```

Important:

- Use indexes on:
  - user_id
  - lesson_id
  - status

Recommended composite index:

```text
(user_id, lesson_id)
```

---

# Recommended API Responses

## Free Lesson

```json
{
  "success": true,
  "data": {}
}
```

## Premium Lesson Without Login

```json
{
  "success": false,
  "message": "Authentication required"
}
```

Status:

```text
401 Unauthorized
```

---

## Premium Lesson Without Purchase

```json
{
  "success": false,
  "message": "Purchase required"
}
```

Status:

```text
403 Forbidden
```

---

## Premium Lesson With Purchase

```json
{
  "success": true,
  "data": {}
}
```

---

# Security Checklist

Claude should verify:

- JWT expiration validation exists
- JWT secret is stored securely
- Purchase validation happens server-side
- Premium content is never exposed before validation
- Route middleware order is correct
- User cannot spoof purchase state
- Database queries use parameterized queries
- Rate limiting exists on auth endpoints
- Sensitive data is never returned accidentally
- Admin-only routes are protected properly

---

# Performance Suggestions

Claude should suggest optimization if:

- Same purchase query repeats unnecessarily
- N+1 database queries exist
- Lesson content loads before permission validation
- Middleware chain is inefficient
- Heavy queries run on public endpoints

Potential improvements:

- Cache purchase checks
- Use Redis for session/token blacklist
- Use lightweight lesson previews for guests
- Lazy load premium content

---

# Suggested Architecture

Recommended structure:

```text
routes/
controllers/
services/
middleware/
repositories/
validators/
```

Recommended separation:

- Controller → request/response only
- Service → business logic
- Repository → database queries
- Middleware → auth/access checks

---

# Edge Cases Claude Should Review

- Expired JWT
- Deleted lesson
- Refunded purchase
- Failed payment state
- Duplicate purchases
- User banned/suspended
- Lesson unpublished
- Race condition after payment
- Access after subscription expiry

---

# Example Ideal Flow

```text
Client requests premium lesson
    ↓
Backend loads lesson metadata
    ↓
Is lesson free?
    ↓ yes
Return content
    ↓ no
Require authentication
    ↓
Verify JWT once
    ↓
Check purchase ownership
    ↓ yes
Return premium content
    ↓ no
Return purchase required
```

---

# Claude Review Instructions

When reviewing code:

1. Identify security risks first.
2. Check for unnecessary token verification.
3. Verify purchase checks are backend enforced.
4. Suggest middleware extraction when logic repeats.
5. Suggest database indexing improvements.
6. Suggest cleaner architecture if business logic is messy.
7. Detect missing edge-case handling.
8. Recommend best-practice HTTP status codes.
9. Check if API leaks premium data accidentally.
10. Recommend scalable patterns for future subscriptions or bundles.

Claude should prioritize:

- Security
- Scalability
- Maintainability
- Clear separation of concerns
- Minimal redundant logic
- Backend authority over permissions

