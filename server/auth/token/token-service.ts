/**
 * token-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for:
 *  - Token generation (access + refresh)
 *  - Token expiry constants
 *  - Cookie configuration
 *
 * Previously, token expiry was defined in THREE different places:
 *   1. server/utils/token-generator.ts  (1m/7d access, 5m/30d refresh)
 *   2. routes.ts setToken()             (1m/1d access, 5m/7d refresh)
 *   3. auth/login/route.ts admin block  (1m/1d access, 5m/7d refresh)
 *
 * This caused inconsistent token lifetimes depending on which code path
 * issued the token. All of the above now delegate to this module.
 */

import jwt from "jsonwebtoken";
import type { Response } from "express";

// ── Expiry constants (single source of truth) ────────────────────────────────

const isDev = () => process.env.NODE_ENV === "development";

/** Access token TTL in seconds */
export const ACCESS_TOKEN_TTL_S = () => (isDev() ? 60 * 15 : 60 * 60 * 24); // 15m dev, 1d prod

/** Refresh token TTL in seconds */
export const REFRESH_TOKEN_TTL_S = () => (isDev() ? 60 * 60 : 60 * 60 * 24 * 7); // 1h dev, 7d prod

/** Access token maxAge for cookies (milliseconds) */
const ACCESS_TOKEN_COOKIE_MS = () => ACCESS_TOKEN_TTL_S() * 1000;

/** Refresh token maxAge for cookies (milliseconds) */
const REFRESH_TOKEN_COOKIE_MS = () => REFRESH_TOKEN_TTL_S() * 1000;

// ── Token generation ──────────────────────────────────────────────────────────

/**
 * Generate a signed access token + refresh token pair.
 * @param payload - Object to embed in the JWT. Only { id, email } is included
 *                  to minimise token size and avoid stale profile data.
 */
export function generateTokenPair(payload: { id: number; email: string }) {
  const { TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

  if (!TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error(
      "[token-service] TOKEN_SECRET or REFRESH_TOKEN_SECRET is not set. " +
        "Check your .env file and ensure dotenv.config() is called before server startup."
    );
  }

  const minimalPayload = { id: payload.id, email: payload.email };

  const token = jwt.sign(minimalPayload, TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_S(),
  });

  const refreshToken = jwt.sign(minimalPayload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_S(),
  });

  return { token, refreshToken };
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Set both the access-token and refresh-token as HTTP-only cookies on the
 * response. Used by cookie-based clients (admin dashboard).
 */
export function setCookieTokens(
  res: Response,
  token: string,
  refreshToken: string
): void {
  const secure = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    // "lax" is required for most cross-site flows; "strict" breaks OAuth callbacks.
    sameSite: "lax",
    secure,
    maxAge: ACCESS_TOKEN_COOKIE_MS(),
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: REFRESH_TOKEN_COOKIE_MS(),
  });
}

/**
 * Issue fresh tokens for a user and write them as cookies.
 * Called by `authenticateToken` middleware when auto-refreshing for
 * cookie-based (dashboard) clients.
 */
export async function setToken(
  res: Response,
  user: { id: number; email: string }
): Promise<void> {
  const { token, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
  });
  setCookieTokens(res, token, refreshToken);
}

// ── Legacy alias ─────────────────────────────────────────────────────────────
/**
 * @deprecated Use generateTokenPair() instead.
 * Kept for backwards compatibility until all call sites are migrated.
 */
export const tokenGenerator = generateTokenPair;
