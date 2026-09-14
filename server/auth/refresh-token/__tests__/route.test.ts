// Regression for the refresh response shape. The mobile client reads
// `accessToken`; this route only ever returned `token`, so every refresh
// stored `accessToken: undefined` client-side and bricked the session the
// first time the 1-day access token expired. Same runner as
// server/utils/__tests__/cors-origins.test.ts (node:test via tsx).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import type { Server } from "http";

process.env.TOKEN_SECRET ??= "test-access-secret";
process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";

const { default: refreshTokenRoutes } = await import("../route");

let server: Server;
let base: string;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", refreshTokenRoutes);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as { port: number };
  base = `http://127.0.0.1:${port}`;
});

after(() => server.close());

const user = { id: 42, email: "u@example.com" };

async function refresh(refreshToken: unknown) {
  const res = await fetch(`${base}/api/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return { status: res.status, body: await res.json() };
}

test("valid refresh token returns a new access token under BOTH `accessToken` and legacy `token`", async () => {
  const rt = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "1h" });
  const { status, body } = await refresh(rt);

  assert.equal(status, 200);
  assert.equal(typeof body.accessToken, "string");
  assert.equal(body.token, body.accessToken, "token and accessToken must carry the same JWT");

  const decoded = jwt.verify(body.accessToken, process.env.TOKEN_SECRET!) as Record<string, unknown>;
  assert.equal(decoded.id, user.id);
  assert.equal(decoded.email, user.email);
});

test("valid refresh token also rotates the refresh token", async () => {
  const rt = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "1h" });
  const { body } = await refresh(rt);

  assert.equal(typeof body.refreshToken, "string");
  assert.notEqual(body.refreshToken, rt, "a new refresh token is issued on every refresh");
  const decoded = jwt.verify(body.refreshToken, process.env.REFRESH_TOKEN_SECRET!) as Record<string, unknown>;
  assert.equal(decoded.id, user.id);
});

test("role claim survives a refresh, in both the new access token and the rotated refresh token", async () => {
  const admin = { ...user, role: "admin" };
  const rt = jwt.sign(admin, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "1h" });
  const { body } = await refresh(rt);

  const access = jwt.verify(body.accessToken, process.env.TOKEN_SECRET!) as Record<string, unknown>;
  const rotated = jwt.verify(body.refreshToken, process.env.REFRESH_TOKEN_SECRET!) as Record<string, unknown>;
  assert.equal(access.role, "admin", "access token lost its role — requireAdmin would 403 after refresh");
  assert.equal(rotated.role, "admin", "rotated refresh token must keep role or the NEXT refresh loses it");
});

test("a refresh token without a role (issued before the role fix) still refreshes, with no role claim", async () => {
  const rt = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "1h" });
  const { status, body } = await refresh(rt);
  assert.equal(status, 200);
  const access = jwt.verify(body.accessToken, process.env.TOKEN_SECRET!) as Record<string, unknown>;
  assert.equal("role" in access, false);
});

test("expired refresh token → 401 REFRESH_EXPIRED (unchanged failure behavior)", async () => {
  const rt = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "-10s" });
  const { status, body } = await refresh(rt);
  assert.equal(status, 401);
  assert.equal(body.code, "REFRESH_EXPIRED");
  assert.equal(body.accessToken, undefined);
});

test("refresh token signed with the wrong secret → 401 INVALID_TOKEN (unchanged failure behavior)", async () => {
  const rt = jwt.sign(user, "not-the-refresh-secret", { expiresIn: "1h" });
  const { status, body } = await refresh(rt);
  assert.equal(status, 401);
  assert.equal(body.code, "INVALID_TOKEN");
});

test("missing refresh token → 400 (unchanged)", async () => {
  const { status } = await refresh(undefined);
  assert.equal(status, 400);
});
