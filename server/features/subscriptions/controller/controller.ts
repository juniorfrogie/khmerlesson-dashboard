import { InsertSubscription, Subscription, SubscriptionData, subscriptionPlanCourses, subscriptionPlans, subscriptions, users } from "@shared/schema"
import { and, desc, eq, gt, inArray } from "drizzle-orm"
import { db } from "server/db"

export class SubscriptionController {

  async getActiveSubscription(userId: number): Promise<Subscription | null> {
    const [result] = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["trial", "active"]),
        gt(subscriptions.currentPeriodEndsAt, new Date())
      ))
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

  async createOrUpdateSubscription(data: InsertSubscription): Promise<Subscription> {
    const [result] = await db.insert(subscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: subscriptions.originalTransactionId,
        set: {
          status: data.status,
          planId: data.planId,
          currentPeriodEndsAt: data.currentPeriodEndsAt,
          updatedAt: new Date(),
        },
      })
      .returning()
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
