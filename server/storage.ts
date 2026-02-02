import { 
  Analytics,
  DashboardStats,
  lessons,
  quizzes,
  analytics,
  users,
  purchase_history,
  InsertBlacklist,
  blacklist,
  insertBlacklistSchema,
  Blacklist,
  mainLessons
} from "@shared/schema";
import { db } from "./db";
import {
  eq, 
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
    // const allMainLessons = await db.select({
    //   free: mainLessons.free, 
    //   price: mainLessons.price,
    //   createdAt: mainLessons.createdAt}).from(mainLessons)

    //const allLessons = await db.select({createdAt: lessons.createdAt}).from(lessons)

    //const allQuizzes = await db.select({createdAt: quizzes.createdAt}).from(quizzes)

    const allUsers = await db.select({
      isActive: users.isActive, 
      createdAt: users.createdAt
    }).from(users)
      .where(eq(users.role, "student"))

    const allPurchaseHistory = await db.select({
      createdAt: purchase_history.createdAt,
      paymentStatus: purchase_history.paymentStatus,
      purchaseAmount: purchase_history.purchaseAmount
    }).from(purchase_history)
      .where(eq(purchase_history.paymentStatus, "completed"))
    
    const totalMainLessons = await db.$count(mainLessons);
    const totalLessons = await db.$count(lessons);
    const totalQuizzes = await db.$count(quizzes);
    const totalUsers = await db.$count(users);
    const totalActiveUsers = await db.$count(users, eq(users.isActive, true));

    const totalPurchaseHistoryComplete = allPurchaseHistory
      .reduce((sum, f) => sum + ((f.purchaseAmount) / 100), 0)
 
    const totalFreeMainLessons = await db.$count(mainLessons, eq(mainLessons.free, true));
    const totalPremiumMainLessons = Math.max(totalMainLessons - totalFreeMainLessons, 0)

    // Calculate MoM (Month over Month) Users Growth Rate
    const usersGrowth = this.getLastMonthGrowthValue(allUsers)

    // Calculate MoM (Month over Month) Active Users Growth Rate
    const activeUsersGrowth = this.getLastMonthGrowthValue(allUsers.filter(f => f.isActive))

    // Calculate MoM (Month over Month) Main Lessons Growth Rate
    const mainLessonsGrowth = await getLastMonthGrowthValue(mainLessons)

    // Calculate MoM (Month over Month) Lessons Growth Rate
    const lessonsGrowth = await getLastMonthGrowthValue(lessons)

    // Calculate MoM (Month over Month) Quizzes Growth Rate
    const quizzesGrowth = await getLastMonthGrowthValue(quizzes)

    // Calculate complete purchase amount Growth Rate
    const purchasesGrowth = this.getLastMonthGrowthValue(allPurchaseHistory)
    
    // Calculate average price for main lessons
    // const premiumMainLessonsWithPrice = allMainLessons.filter(l => !l.free && l.price);
    // const avgPrice = premiumMainLessonsWithPrice.length > 0 
    //   ? premiumMainLessonsWithPrice.reduce((sum, l) => sum + ((l.price || 0) / 100), 0) / premiumMainLessonsWithPrice.length
    //   : 0;

    const commandAvgPrice = sql`
      WITH AvgPrice AS (
        SELECT 
          (SELECT CAST(COUNT(${mainLessons.id}) AS INT) AS count),
          (SELECT CAST(ROUND(SUM(${mainLessons.price})::DECIMAL / 100::NUMERIC, 2) AS NUMERIC) AS sum)
        FROM ${mainLessons}     
        WHERE ${mainLessons.free} IS FALSE
            AND ${mainLessons.price} IS NOT NULL 
            AND ${mainLessons.price} > 0 
      )
      SELECT CAST(ROUND((sum / count)::NUMERIC, 2) AS NUMERIC) AS value FROM AvgPrice    
    `
    const result = await db.execute(commandAvgPrice)
    const avgPrice = result.rowCount && result.rowCount > 0 ? (result.rows[0].value as number) : 0

    return {
      totalMainLessons,
      totalLessons,
      totalQuizzes,
      totalUsers,
      totalActiveUsers,
      totalPurchaseHistoryComplete,
      totalFreeMainLessons,
      totalPremiumMainLessons,
      mainLessonsGrowth,
      lessonsGrowth,
      quizzesGrowth,
      usersGrowth,
      activeUsersGrowth,
      purchasesGrowth,
      avgPrice: avgPrice
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