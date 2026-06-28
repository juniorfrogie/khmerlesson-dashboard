import { InsertSubscriptionPlan, mainLessons, MainLesson, SubscriptionPlan, subscriptionPlanCourses, subscriptionPlans, UpdateSubscriptionPlan } from "@shared/schema"
import { asc, eq, inArray } from "drizzle-orm"
import { db } from "server/db"

export class SubscriptionPlanController {

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.id))
  }

  async getActivePlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.id))
  }

  async getPlanByIosProductId(productId: string): Promise<SubscriptionPlan | undefined> {
    const [result] = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.productIdIos, productId))
    return result
  }

  async createPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [result] = await db.insert(subscriptionPlans).values(plan).returning()
    return result
  }

  async updatePlan(id: number, plan: UpdateSubscriptionPlan): Promise<SubscriptionPlan | undefined> {
    const [result] = await db.update(subscriptionPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning()
    return result
  }

  async deletePlan(id: number): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async getCourseIdsForPlan(planId: number): Promise<number[]> {
    const rows = await db.select({ mainLessonId: subscriptionPlanCourses.mainLessonId })
      .from(subscriptionPlanCourses)
      .where(eq(subscriptionPlanCourses.planId, planId))
    return rows.map(r => r.mainLessonId)
  }

  async getCoursesForPlan(planId: number): Promise<MainLesson[]> {
    const courseIds = await this.getCourseIdsForPlan(planId)
    if (courseIds.length === 0) return []
    return db.select().from(mainLessons)
      .where(inArray(mainLessons.id, courseIds))
      .orderBy(asc(mainLessons.order))
  }

  async setCoursesForPlan(planId: number, mainLessonIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(subscriptionPlanCourses).where(eq(subscriptionPlanCourses.planId, planId))
      if (mainLessonIds.length > 0) {
        await tx.insert(subscriptionPlanCourses)
          .values(mainLessonIds.map(id => ({ planId, mainLessonId: id })))
      }
    })
  }
}
