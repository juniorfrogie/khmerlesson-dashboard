import { DebugLog, debugLogs } from "@shared/schema"
import { and, desc, eq } from "drizzle-orm"
import { db } from "server/db"

export class DebugLogController {

  async getAllDebugLogs(
    limit: number,
    offset: number,
    filters?: { traceId?: string; level?: string; source?: string }
  ): Promise<{ data: DebugLog[]; total: number }> {
    const conditions = []
    if (filters?.traceId) {
      conditions.push(eq(debugLogs.traceId, filters.traceId))
    }
    if (filters?.level && filters.level !== "all") {
      conditions.push(eq(debugLogs.level, filters.level))
    }
    if (filters?.source && filters.source !== "all") {
      conditions.push(eq(debugLogs.source, filters.source))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db.select()
      .from(debugLogs)
      .where(whereClause)
      .orderBy(desc(debugLogs.createdAt))
      .limit(limit)
      .offset(offset)

    const total = await db.$count(debugLogs, whereClause)

    return { data: rows, total }
  }
}
