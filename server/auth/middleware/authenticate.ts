/**
 * authenticate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised JWT authentication middleware.
 *
 * Design decisions:
 *  - Extracted from routes.ts so it can be tested in isolation and reused
 *    without importing the entire routes module.
 *  - Reads the access token from EITHER the `token` cookie (admin dashboard)
 *    OR the `Authorization: Bearer <token>` header (mobile / API clients).
 *  - Reads the refresh token from EITHER the `refreshToken` cookie (admin)
 *    OR the request body `refreshToken` field sent explicitly by clients.
 *    NOTE: Auto-refresh inside this middleware is intentionally DISABLED for
 *    mobile clients.  Mobile clients must call POST /api/auth/refresh-token
 *    explicitly.  Auto-refresh is kept only for cookie-based (dashboard) flows.
 *  - Semi-authenticated routes (e.g. /api/v1/main-lessons) call next() even
 *    without a valid token — req.user will simply be undefined in those routes.
 *    The route handler is responsible for personalised vs public responses.
 */

import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "server/storage";
import { setToken } from "server/auth/token/token-service";

// Extend Express Request so TypeScript knows about req.user and req.correlationId
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
      correlationId?: string;
    }
  }
}

/** Routes that are "semi-public": the middleware lets unauthenticated requests
 *  through but still attaches req.user when a valid token IS present. */
const SEMI_PUBLIC_PREFIXES = ["/api/v1/main-lessons", "/api/v1/lessons"];

function isSemiPublic(url: string): boolean {
  return SEMI_PUBLIC_PREFIXES.some((prefix) => url.includes(prefix));
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = req.correlationId ?? "no-corr-id";
  const { TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

  // ── 1. Extract tokens ───────────────────────────────────────────────────────
  const authHeader = req.headers["authorization"];
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;

  // Access token: cookie (dashboard) or Authorization header (mobile/API)
  const token: string | undefined = (req as any).cookies?.token ?? bearerToken;

  // Refresh token: its OWN cookie, never the same as the access token.
  // Bug fixed: previously this read req.cookies.token (the access token).
  const refreshToken: string | undefined =
    (req as any).cookies?.refreshToken ?? req.body?.refreshToken;

  console.log(
    `[AUTH][${correlationId}] path=${req.path} ` +
      `hasToken=${!!token} hasRefreshToken=${!!refreshToken} ` +
      `source=${(req as any).cookies?.token ? "cookie" : bearerToken ? "bearer" : "none"}`
  );

  // ── 2. No tokens at all ─────────────────────────────────────────────────────
  if (!token && !refreshToken) {
    if (isSemiPublic(req.originalUrl)) {
      // Public access — req.user remains undefined; controller handles this
      console.log(
        `[AUTH][${correlationId}] Semi-public route, proceeding unauthenticated`
      );
      next();
      return;
    }
    res
      .status(401)
      .json({ message: "You are not logged in. Please log in to get access." });
    return;
  }

  // ── 3. Refresh-token-only path (token expired, refresh still valid) ─────────
  if (!token && refreshToken) {
    // Only perform auto-refresh for cookie-based clients (dashboard).
    // Mobile clients should use POST /api/auth/refresh-token explicitly.
    const isCookieBased = !!(req as any).cookies?.refreshToken;
    if (!isCookieBased) {
      console.warn(
        `[AUTH][${correlationId}] Mobile client missing access token — tell client to refresh`
      );
      res.status(401).json({
        message: "Access token expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
      return;
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        REFRESH_TOKEN_SECRET as string
      ) as { id: number; email: string; [key: string]: any };
      await setToken(res, { id: decoded.id, email: decoded.email });
      req.user = decoded;
      console.log(
        `[AUTH][${correlationId}] Auto-refreshed token for user.id=${decoded.id}`
      );
      next();
    } catch (err) {
      console.error(
        `[AUTH][${correlationId}] Refresh token invalid:`,
        (err as Error).message
      );
      res.status(403).json({ message: "Session expired. Please log in again." });
    }
    return;
  }

  // ── 4. Blacklist check ──────────────────────────────────────────────────────
  if (token) {
    try {
      const isBlacklisted = await storage.getBlacklist(token);
      if (isBlacklisted) {
        console.warn(
          `[AUTH][${correlationId}] Blacklisted token presented — rejecting`
        );
        res.status(401).json({
          message: "Token is no longer valid. Please log in again.",
          code: "TOKEN_REVOKED",
        });
        return;
      }
    } catch (err) {
      // Storage error should not block the request in semi-public routes
      console.error(
        `[AUTH][${correlationId}] Blacklist check error:`,
        (err as Error).message
      );
    }
  }

  // ── 5. Verify access token ──────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(
      token as string,
      TOKEN_SECRET as string
    ) as Record<string, any>;
    req.user = decoded;
    console.log(
      `[AUTH][${correlationId}] Access token valid — user.id=${decoded.id} user.email=${decoded.email}`
    );
    next();
  } catch (tokenErr) {
    // Access token invalid/expired — attempt refresh for cookie-based clients
    const isCookieBased = !!(req as any).cookies?.token;
    if (isCookieBased && refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          REFRESH_TOKEN_SECRET as string
        ) as { id: number; email: string; [key: string]: any };
        await setToken(res, { id: decoded.id, email: decoded.email });
        req.user = decoded;
        console.log(
          `[AUTH][${correlationId}] Access token expired — auto-refreshed for user.id=${decoded.id}`
        );
        next();
      } catch (refreshErr) {
        console.error(
          `[AUTH][${correlationId}] Both tokens invalid:`,
          (refreshErr as Error).message
        );
        res
          .status(403)
          .json({ message: "Session expired. Please log in again." });
      }
      return;
    }

    // Mobile client — report expired token so client can call refresh endpoint
    console.warn(
      `[AUTH][${correlationId}] Access token invalid:`,
      (tokenErr as Error).message
    );
    if (isSemiPublic(req.originalUrl)) {
      // Still allow public access — just without a user
      console.log(
        `[AUTH][${correlationId}] Semi-public, allowing unauthenticated access`
      );
      next();
      return;
    }
    res.status(401).json({
      message: "Access token expired. Please refresh your token.",
      code: "TOKEN_EXPIRED",
    });
  }
};
