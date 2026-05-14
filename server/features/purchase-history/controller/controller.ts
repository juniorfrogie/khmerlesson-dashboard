import { InsertPurchaseHistory, mainLessons, purchase_history, PurchaseHistory, PurchaseHistoryData, UpdatePurchaseHistory, users } from "@shared/schema";
import { and, count, eq, gte, ilike, lte } from "drizzle-orm";
import { db } from "server/db";

export interface PurchaseFilters {
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export class PurchaseHistoryController {

    async findExistingPurchase(purchaseId: string, userId: number, mainLessonId: number): Promise<PurchaseHistory | null> {
        const [existing] = await db.select().from(purchase_history)
            .where(and(
                eq(purchase_history.purchaseId, purchaseId),
                eq(purchase_history.userId, userId),
                eq(purchase_history.mainLessonId, mainLessonId)
            ))
            .limit(1);
        return existing ?? null;
    }

    async createPurchaseHistory(insertPurchaseHistory: InsertPurchaseHistory): Promise<PurchaseHistory> {
        const [purchaseHistory] = await db
            .insert(purchase_history)
            .values({
                ...insertPurchaseHistory,
                purchaseId: insertPurchaseHistory.purchaseId,
                userId: insertPurchaseHistory.userId,
                userEmail: insertPurchaseHistory.userEmail,
                mainLessonId: insertPurchaseHistory.mainLessonId,
                purchaseDate: insertPurchaseHistory.purchaseDate,
                paymentMethod: insertPurchaseHistory.paymentMethod,
                paymentStatus: insertPurchaseHistory.paymentStatus,
                platformType: insertPurchaseHistory.platformType
            })
            .returning();
        return purchaseHistory;
    }

    async updatePurchaseHistory(purchaseId: string, purchaseHistory: UpdatePurchaseHistory): Promise<PurchaseHistory> {
        const [data] = await db
            .update(purchase_history)
            .set({
                ...purchaseHistory,
                updatedAt: new Date()
            })
            .where(eq(purchase_history.purchaseId, purchaseId))
            .returning();
        return data || undefined;
    }

    async deletePurchaseHistoryByPurchaseId(purchaseId: string): Promise<boolean> {
        const result = await db.delete(purchase_history).where(eq(purchase_history.purchaseId, purchaseId));
        return (result.rowCount ?? 0) > 0;
    }

    async getPurchaseHistory(limit: number, offset: number): Promise<PurchaseHistoryData[]> {
        const result = await db.select().from(purchase_history)
            .innerJoin(users, eq(users.id, purchase_history.userId))
            .innerJoin(mainLessons, eq(mainLessons.id, purchase_history.mainLessonId))
            .limit(limit)
            .offset(offset)
            .orderBy(purchase_history.createdAt)

        const publishedPurchaseHistory = result.map(e => ({
            id: e.purchase_history.id,
            purchaseId: e.purchase_history.purchaseId,
            email: e.users.email,
            mainLessonId: e.purchase_history.mainLessonId,
            purchaseDate: e.purchase_history.purchaseDate,
            purchaseAmount: e.purchase_history.purchaseAmount,
            platformType: e.purchase_history.platformType,
            paymentMethod: e.purchase_history.paymentMethod,
            paymentStatus: e.purchase_history.paymentStatus
        }))
        return publishedPurchaseHistory
    }

    async getPurchaseHistoryCount(): Promise<number> {
        const result = await db.select({ count: count() }).from(purchase_history)
        return result[0]["count"] ?? 0
    }

    async hasUserPurchased(userId: number, mainLessonId: number): Promise<boolean> {
        const [existing] = await db.select({ id: purchase_history.id })
            .from(purchase_history)
            .where(and(
                eq(purchase_history.userId, userId),
                eq(purchase_history.mainLessonId, mainLessonId),
                eq(purchase_history.paymentStatus, 'completed')
            ))
            .limit(1)
        return !!existing
    }

    private buildConditions(filters: PurchaseFilters) {
        const conditions = []
        if (filters.paymentStatus) {
            conditions.push(ilike(purchase_history.paymentStatus, filters.paymentStatus))
        }
        if (filters.dateFrom) {
            conditions.push(gte(purchase_history.purchaseDate, filters.dateFrom))
        }
        if (filters.dateTo) {
            conditions.push(lte(purchase_history.purchaseDate, filters.dateTo))
        }
        if (filters.search) {
            conditions.push(ilike(users.email, `%${filters.search}%`))
        }
        return conditions
    }

    async getPurchaseHistoryFiltered(limit: number, offset: number, filters: PurchaseFilters): Promise<PurchaseHistoryData[]> {
        const conditions = this.buildConditions(filters)
        const result = await db.select({
            id: purchase_history.id,
            purchaseId: purchase_history.purchaseId,
            email: users.email,
            mainLessonId: purchase_history.mainLessonId,
            purchaseDate: purchase_history.purchaseDate,
            purchaseAmount: purchase_history.purchaseAmount,
            platformType: purchase_history.platformType,
            paymentMethod: purchase_history.paymentMethod,
            paymentStatus: purchase_history.paymentStatus,
        })
            .from(purchase_history)
            .innerJoin(users, eq(users.id, purchase_history.userId))
            .innerJoin(mainLessons, eq(mainLessons.id, purchase_history.mainLessonId))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .limit(limit)
            .offset(offset)
            .orderBy(purchase_history.createdAt)
        return result
    }

    async getPurchaseHistoryFilteredCount(filters: PurchaseFilters): Promise<number> {
        const conditions = this.buildConditions(filters)
        const [result] = await db.select({ total: count() })
            .from(purchase_history)
            .innerJoin(users, eq(users.id, purchase_history.userId))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
        return result?.total ?? 0
    }
}