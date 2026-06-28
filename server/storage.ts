import {
  Analytics,
  DashboardStats,
  lessons,
  quizzes,
  analytics,
  users,
  subscriptions,
  InsertBlacklist,
  blacklist,
  insertBlacklistSchema,
  Blacklist,
  mainLessons
} from "@shared/schema";
import { db } from "./db";
import {
  and,
  eq,
  gt,
  lte,
  sql } from "drizzle-orm";
import { getLastMonthGrowthValue } from "./utils/query-utils";

export interface IStorage {
  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getAnalytics(): Promise<Analytics[]>;

  //BlackList
  createBlacklist(insertBlacklist: InsertBlacklist): Promise<Blacklist>
  getBlacklist(token: string): Promise<Blacklist | undefined>
  deleteBlacklist(): Promise<number>
}

export class DatabaseStorage implements IStorage {

  private getPriorMonth = (date: Date) => {
    const priorMonth = new Date(date)
    priorMonth.setDate(1)
    priorMonth.setMonth(priorMonth.getMonth() - 1)
    return priorMonth
  }

  private getLastMonthGrowthValue = (data: any[]) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const currentMonthValue = data.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.createdAt.getFullYear() === currentYear).length
    const priorMonthValue = data.filter(f => f.createdAt.getMonth() === this.getPriorMonth(currentDate).getMonth()).length
    const growth = priorMonthValue === 0 ? 0 : ((currentMonthValue / priorMonthValue) - 1)
    return growth
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allUsers = await db.select({
      isActive: users.isActive,
      createdAt: users.createdAt
    }).from(users)
      .where(eq(users.role, "student"))

    const now = new Date()
    const totalMainLessons = await db.$count(mainLessons);
    const totalLessons = await db.$count(lessons);
    const totalQuizzes = await db.$count(quizzes);
    const totalUsers = await db.$count(users);
    const totalActiveUsers = await db.$count(users, eq(users.isActive, true));
    const totalActiveSubscriptions = await db.$count(subscriptions,
      and(eq(subscriptions.status, "active"), gt(subscriptions.currentPeriodEndsAt, now))
    );
    const totalTrialSubscriptions = await db.$count(subscriptions,
      and(eq(subscriptions.status, "trial"), gt(subscriptions.currentPeriodEndsAt, now))
    );

    const allSubscriptions = await db.select({ createdAt: subscriptions.createdAt }).from(subscriptions)

    const usersGrowth = this.getLastMonthGrowthValue(allUsers)
    const activeUsersGrowth = this.getLastMonthGrowthValue(allUsers.filter(f => f.isActive))
    const mainLessonsGrowth = await getLastMonthGrowthValue(mainLessons)
    const lessonsGrowth = await getLastMonthGrowthValue(lessons)
    const quizzesGrowth = await getLastMonthGrowthValue(quizzes)
    const subscriptionsGrowth = this.getLastMonthGrowthValue(allSubscriptions)

    return {
      totalMainLessons,
      totalLessons,
      totalQuizzes,
      totalUsers,
      totalActiveUsers,
      totalActiveSubscriptions,
      totalTrialSubscriptions,
      mainLessonsGrowth,
      lessonsGrowth,
      quizzesGrowth,
      usersGrowth,
      activeUsersGrowth,
      subscriptionsGrowth,
    };
  }

  async getAnalytics(): Promise<Analytics[]> {
    const result = await db.select().from(analytics).orderBy(analytics.createdAt);
    return result;
  }

  // Blacklist Operations
  async createBlacklist(insertBlacklist: InsertBlacklist): Promise<Blacklist> {
    const [blacklists] = await db
      .insert(blacklist)
      .values({
        ...insertBlacklistSchema,
        token: insertBlacklist.token,
        expiredAt: insertBlacklist.expiredAt
      })
      .returning();
    return blacklists;
  }

  async getBlacklist(token: string): Promise<Blacklist | undefined> {
    const [blacklistResult] = await db.select().from(blacklist).where(eq(blacklist.token, token));
    return blacklistResult || undefined;
  }

  async deleteBlacklist(): Promise<number> {
    const now = new Date()
    const result = await db.delete(blacklist).where(lte(blacklist.expiredAt, now));
    return result.rowCount ?? 0;
  }
}

export const storage = new DatabaseStorage();