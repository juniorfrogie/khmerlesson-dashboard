import { 
  Lesson, 
  InsertLesson, 
  UpdateLesson,
  Quiz, 
  InsertQuiz, 
  UpdateQuiz,
  Analytics,
  DashboardStats,
  User,
  InsertUser,
  UpdateUser,
  lessons,
  quizzes,
  analytics,
  users,
  purchase_history,
  PurchaseHistory,
  InsertPurchaseHistory,
  InsertBlacklist,
  blacklist,
  insertBlacklistSchema,
  Blacklist
} from "@shared/schema";
import { db } from "./db";
import { and, eq, not } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByResetToken(resetToken: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  updateUserResetToken(email: string, resetToken: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  updatePassword(id: number, password: string): Promise<User | null>
  loginByAdmin(email: string, password: string): Promise<User | null>;
  
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

  // Purchase History
  createPurchaseHistory(insertPurchaseHistory: InsertPurchaseHistory): Promise<PurchaseHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(users.createdAt);
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), not(eq(users.role, "admin"))));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByResetToken(resetToken: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, resetToken));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const userToInsert = {
      ...insertUser,
      password: hashedPassword,
    };

    const [user] = await db.insert(users).values(userToInsert).returning();
    return user;
  }

  async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updateUser, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserResetToken(email: string, resetToken: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ resetToken: resetToken, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async loginByAdmin(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.role, "admin")));
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updatePassword(id: number, password: string): Promise<User | null> {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, resetToken: null, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Lesson operations
  async getLessons(): Promise<Lesson[]> {
    const result = await db.select().from(lessons).orderBy(lessons.createdAt);
    return result;
  }

    // Lesson operations
  async getLessonsJoin(user: User): Promise<any> {
    const result = await db.select().from(users)
    .innerJoin(purchase_history, eq(users.id, purchase_history.userId))
    .fullJoin(lessons, eq(lessons.id, purchase_history.lessonId))
    .orderBy(lessons.createdAt);
    const publishedLessons = result.filter(e => e.lessons?.status == "published").map(e => ({
      id: e.lessons?.id,
      title: e.lessons?.title,
      description: e.lessons?.description,
      level: e.lessons?.level,
      image: e.lessons?.image,
      free: e.lessons?.free,
      price: e.lessons?.price,
      hasPurchased: e.purchase_history?.lessonId === e.lessons?.id && e.purchase_history?.userId === user.id,
      createdAt: e.lessons?.createdAt,
      updatedAt: e.lessons?.updatedAt
    }))
    return publishedLessons;
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

  async createPurchaseHistory(insertPurchaseHistory: InsertPurchaseHistory): Promise<PurchaseHistory> {
    const [purchaseHistory] = await db
      .insert(purchase_history)
      .values({
        ...insertPurchaseHistory,
        purchaseId: insertPurchaseHistory.purchaseId,
        userId: insertPurchaseHistory.userId,
        userEmail: insertPurchaseHistory.userEmail,
        lessonId: insertPurchaseHistory.lessonId,
        purchaseDate: insertPurchaseHistory.purchaseDate
      })
      .returning();
    return purchaseHistory;
  }

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
}

export const storage = new DatabaseStorage();