import { InsertSubscription, Subscription, SubscriptionData, subscriptionPlanCourses, subscriptionPlans, subscriptions, users } from "@shared/schema"
import { and, desc, eq, gt, inArray, ne } from "drizzle-orm"
import { db } from "server/db"

// Thrown when a transaction chain is already registered to a different app
// account and the caller did not explicitly ask to claim it. Apple
// subscriptions belong to the Apple ID, app accounts are ours — a passive
// sync (reconcile on screen open) must never silently move a subscription
// between app accounts; only an explicit purchase/restore by the user may.
export class SubscriptionOwnedByOtherAccountError extends Error {
  constructor() {
    super("This subscription is linked to another account.")
    this.name = "SubscriptionOwnedByOtherAccountError"
  }
}

export class SubscriptionController {

  async getActiveSubscription(userId: number): Promise<Subscription | null> {
    const [result] = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["trial", "active"]),
        gt(subscriptions.currentPeriodEndsAt, new Date())
      ))
      .orderBy(desc(subscriptions.id))
      .limit(1)
    return result ?? null
  }

  async hasAccessToCourse(userId: number, mainLessonId: number): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId)
    if (!sub) return false

    const [row] = await db.select({ planId: subscriptionPlanCourses.planId })
      .from(subscriptionPlanCourses)
      .where(and(
        eq(subscriptionPlanCourses.planId, sub.planId),
        eq(subscriptionPlanCourses.mainLessonId, mainLessonId)
      ))
      .limit(1)

    return !!row
  }

  async createOrUpdateSubscription(
    data: InsertSubscription,
    opts?: { allowTransfer?: boolean }
  ): Promise<Subscription> {
    // Ownership guard: if this transaction chain already belongs to another
    // app account, only an explicit purchase (allowTransfer) may move it.
    const [existing] = await db.select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.originalTransactionId, data.originalTransactionId))
      .limit(1)
    if (existing && existing.userId !== data.userId && !opts?.allowTransfer) {
      throw new SubscriptionOwnedByOtherAccountError()
    }

    const [result] = await db.insert(subscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: subscriptions.originalTransactionId,
        set: {
          userId: data.userId,
          planId: data.planId,
          productId: data.productId,
          status: data.status,
          currentPeriodEndsAt: data.currentPeriodEndsAt,
          updatedAt: new Date(),
        },
      })
      .returning()

    // One current plan per user: a new/changed subscription supersedes any
    // other row still marked active or trial (e.g. an older Apple transaction
    // chain from before a lapse-and-resubscribe). Without this, stale rows
    // accumulate and getActiveSubscription can pick the wrong plan.
    await db.update(subscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(
        eq(subscriptions.userId, data.userId),
        ne(subscriptions.id, result.id),
        inArray(subscriptions.status, ["trial", "active"]),
      ))

    return result
  }

  async getAllSubscriptions(
    limit: number,
    offset: number,
    filters?: { status?: string; platform?: string }
  ): Promise<{ data: SubscriptionData[]; total: number }> {
    const conditions = []
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(subscriptions.status, filters.status))
    }
    if (filters?.platform && filters.platform !== "all") {
      conditions.push(eq(subscriptions.platform, filters.platform))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db.select({
      id: subscriptions.id,
      email: users.email,
      planName: subscriptionPlans.name,
      platform: subscriptions.platform,
      status: subscriptions.status,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      createdAt: subscriptions.createdAt,
    })
      .from(subscriptions)
      .innerJoin(users, eq(users.id, subscriptions.userId))
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset)

    const total = await db.$count(subscriptions, whereClause)

    return { data: rows, total }
  }
}
