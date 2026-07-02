/**
 * trace-logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists log lines to the `debug_logs` table, keyed by the request's
 * X-Correlation-ID (see server/auth/middleware/correlation.ts). Use this
 * instead of a bare console.log when a log line is worth being able to pull
 * up later by trace id — e.g. to correlate a server-side error with the
 * mobile app logs that led to it (khmerlesson-app/src/shared/utils/logger.ts
 * posts its own log lines with the same traceId to POST /api/v1/debug-logs).
 *
 * Fire-and-forget: a logging failure must never break the request it's
 * describing, so DB errors here are swallowed (after a console.error).
 */

import { db } from "server/db";
import { debugLogs, type InsertDebugLog } from "@shared/schema";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogSource = "server" | "mobile";

export async function logTrace(
  traceId: string,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  userId?: number,
  source: LogSource = "server"
): Promise<void> {
  const prefix = `[${level.toUpperCase()}][${traceId}]${source === "mobile" ? "[mobile]" : ""}`;
  const line = context ? `${prefix} ${message} :: ${JSON.stringify(context)}` : `${prefix} ${message}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  try {
    const row: InsertDebugLog = {
      traceId,
      source,
      level,
      message,
      context: context ?? null,
    };
    await db.insert(debugLogs).values({ ...row, userId: userId ?? null });
  } catch (err) {
    console.error(`[trace-logger] failed to persist log for traceId=${traceId}:`, err);
  }
}

// Convenience wrappers mirroring console.{debug,info,warn,error}
export const traceLogger = {
  debug: (traceId: string, message: string, context?: Record<string, unknown>, userId?: number, source?: LogSource) =>
    logTrace(traceId, "debug", message, context, userId, source),
  info: (traceId: string, message: string, context?: Record<string, unknown>, userId?: number, source?: LogSource) =>
    logTrace(traceId, "info", message, context, userId, source),
  warn: (traceId: string, message: string, context?: Record<string, unknown>, userId?: number, source?: LogSource) =>
    logTrace(traceId, "warn", message, context, userId, source),
  error: (traceId: string, message: string, context?: Record<string, unknown>, userId?: number, source?: LogSource) =>
    logTrace(traceId, "error", message, context, userId, source),
};
