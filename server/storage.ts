import { 
  Lesson, 
  InsertLesson, 
  UpdateLesson,
  Quiz, 
  InsertQuiz, 
  UpdateQuiz,
  Analytics,
  DashboardStats,
  lessons,
  quizzes,
  analytics
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Lessons
  getLessons(): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: UpdateLesson): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;
  
  // Quizzes
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, quiz: UpdateQuiz): Promise<Quiz | undefined>;
  deleteQuiz(id: number): Promise<boolean>;
  
  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getAnalytics(): Promise<Analytics[]>;
  
  // Import/Export
  exportLessons(): Promise<Lesson[]>;
  exportQuizzes(): Promise<Quiz[]>;
  importLessons(lessons: InsertLesson[]): Promise<Lesson[]>;
  importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]>;
}

export class DatabaseStorage implements IStorage {
  async getLessons(): Promise<Lesson[]> {
    const result = await db.select().from(lessons).orderBy(lessons.createdAt);
    return result;
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const [lesson] = await db
      .insert(lessons)
      .values({
        ...insertLesson,
        status: insertLesson.status || "draft",
        free: insertLesson.free ?? true,
        price: insertLesson.price || null,
        sections: insertLesson.sections || []
      })
      .returning();
    return lesson;
  }

  async updateLesson(id: number, updateLesson: UpdateLesson): Promise<Lesson | undefined> {
    const [lesson] = await db
      .update(lessons)
      .set({
        ...updateLesson,
        updatedAt: new Date()
      })
      .where(eq(lessons.id, id))
      .returning();
    return lesson || undefined;
  }

  async deleteLesson(id: number): Promise<boolean> {
    const result = await db.delete(lessons).where(eq(lessons.id, id));
    return result.rowCount > 0;
  }

  async getQuizzes(): Promise<Quiz[]> {
    const result = await db.select().from(quizzes).orderBy(quizzes.createdAt);
    return result;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db
      .insert(quizzes)
      .values({
        ...insertQuiz,
        status: insertQuiz.status || "draft",
        lessonId: insertQuiz.lessonId || null,
        questions: insertQuiz.questions || []
      })
      .returning();
    return quiz;
  }

  async updateQuiz(id: number, updateQuiz: UpdateQuiz): Promise<Quiz | undefined> {
    const [quiz] = await db
      .update(quizzes)
      .set({
        ...updateQuiz,
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, id))
      .returning();
    return quiz || undefined;
  }

  async deleteQuiz(id: number): Promise<boolean> {
    const result = await db.delete(quizzes).where(eq(quizzes.id, id));
    return result.rowCount > 0;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allLessons = await db.select().from(lessons);
    const allQuizzes = await db.select().from(quizzes);
    
    const totalLessons = allLessons.length;
    const totalQuizzes = allQuizzes.length;
    const freeLessons = allLessons.filter(l => l.free).length;
    const premiumLessons = allLessons.filter(l => !l.free).length;
    
    // Calculate growth (mock data)
    const lessonsGrowth = 12; // 12% growth
    const quizzesGrowth = 8;  // 8% growth
    
    // Calculate average price
    const premiumLessonsWithPrice = allLessons.filter(l => !l.free && l.price);
    const avgPrice = premiumLessonsWithPrice.length > 0 
      ? premiumLessonsWithPrice.reduce((sum, l) => sum + (l.price || 0), 0) / premiumLessonsWithPrice.length
      : 0;

    return {
      totalLessons,
      totalQuizzes,
      freeLessons,
      premiumLessons,
      lessonsGrowth,
      quizzesGrowth,
      avgPrice: Math.round(avgPrice)
    };
  }

  async getAnalytics(): Promise<Analytics[]> {
    const result = await db.select().from(analytics).orderBy(analytics.date);
    return result;
  }

  async exportLessons(): Promise<Lesson[]> {
    return this.getLessons();
  }

  async exportQuizzes(): Promise<Quiz[]> {
    return this.getQuizzes();
  }

  async importLessons(lessons: InsertLesson[]): Promise<Lesson[]> {
    const imported: Lesson[] = [];
    for (const lesson of lessons) {
      imported.push(await this.createLesson(lesson));
    }
    return imported;
  }

  async importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]> {
    const imported: Quiz[] = [];
    for (const quiz of quizzes) {
      imported.push(await this.createQuiz(quiz));
    }
    return imported;
  }
}

export const storage = new DatabaseStorage();