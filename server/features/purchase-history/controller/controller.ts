import { InsertPurchaseHistory, mainLessons, purchase_history, PurchaseHistory, PurchaseHistoryData, UpdatePurchaseHistory, users } from "@shared/schema";
import { count, eq } from "drizzle-orm";
import { db } from "server/db";

export class PurchaseHistoryController{
    // static instance: PurchaseHistoryController | null = null
    // constructor(){
    //   if(PurchaseHistoryController.instance){
    //     return PurchaseHistoryController.instance
    //   }
    //   PurchaseHistoryController.instance = this
    // }

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
        const result = await db.select({count: count()}).from(purchase_history)
        return result[0]["count"] ?? 0
    }
}

// const instance = new PurchaseHistoryController()
// Object.freeze(instance)
// export default instance