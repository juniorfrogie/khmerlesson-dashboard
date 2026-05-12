/**
 * correlation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Request correlation ID middleware.
 *
 * Attaches a unique ID to every incoming request so that auth events, DB
 * queries, and errors can all be traced back to a single request in logs.
 *
 * Usage: add `app.use(correlationMiddleware)` BEFORE all other middleware.
 *
 * Clients can supply their own correlation ID via the `X-Correlation-ID`
 * header (useful for end-to-end tracing from mobile/frontend to server).
 */

import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incoming = req.headers["x-correlation-id"];
  const correlationId =
    typeof incoming === "string" && incoming.length > 0
      ? incoming
      : randomUUID();

  // Make available on the request object
  (req as any).correlationId = correlationId;

  // Echo it back so clients can correlate their logs too
  res.setHeader("X-Correlation-ID", correlationId);

  next();
}
