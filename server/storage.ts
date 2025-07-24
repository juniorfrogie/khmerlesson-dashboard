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
  Blacklist,
  PurchaseHistoryData,
  UpdatePurchaseHistory,
  InsertUserWithAuthService,
  LessonType,
  InsertLessonType,
  UpdateLessonType,
  LessonData,
  lessonType,
  MainLesson,
  InsertMainLesson,
  UpdateMainLesson,
  mainLessons,
} from "@shared/schema";
import { db } from "./db";
import { and, count, eq, not, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import generatorPassword from "generate-password"

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUsers(limit: number, offset: number): Promise<User[]>;
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
  changePassword(id: number, currentPassword: string, newPassword: string): Promise<User | null>
  getUserCount(): Promise<number>;
  createUserWithAuthService(user: InsertUserWithAuthService): Promise<User>;

  // Main Lessons
  getMainLessons(): Promise<MainLesson[]>
  createMainLesson(mainLesson: InsertMainLesson): Promise<MainLesson>
  updateMainLesson(id: number, mainLesson: UpdateMainLesson): Promise<MainLesson | undefined>
  
  // Lessons
  // getLessons(): Promise<Lesson[]>;
  getLessons(): Promise<LessonData[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(insertLesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: UpdateLesson): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;
  getLessonsJoin(user: User): Promise<any>

  // Lesson Type
  getAllLessonType(): Promise<LessonType[]>;
  createLessonType(insertLessonType: InsertLessonType): Promise<LessonType>;
  updateLessonType(id: number, updateLessonType: UpdateLessonType): Promise<LessonType | undefined>;
  deleteLessonType(id: number): Promise<boolean>;
  getLessonTypeDetail(id: number): Promise<Lesson[]>
  
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
  exportLessons(): Promise<Lesson[] | LessonData[]>;
  exportQuizzes(): Promise<Quiz[]>;
  importLessons(lessons: InsertLesson[]): Promise<Lesson[]>;
  importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]>;

  // Purchase History
  createPurchaseHistory(insertPurchaseHistory: InsertPurchaseHistory): Promise<PurchaseHistory>;
  getPurchaseHistory(limit: number, offset: number): Promise<PurchaseHistoryData[]>;
  getPurchaseHistoryCount(): Promise<number>
  updatePurchaseHistory(purchaseId: string, purchaseHistory: UpdatePurchaseHistory): Promise<PurchaseHistory>;
  deletePurchaseHistoryByPurchaseId(purchaseId: string): Promise<boolean>;

  //BlackList
  createBlacklist(insertBlacklist: InsertBlacklist): Promise<Blacklist>
  getBlacklist(token: string): Promise<Blacklist | undefined>
  deleteBlacklist(): Promise<number>
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(users.createdAt);
    return result;
  }

  async getUsers(limit: number, offset: number): Promise<User[]> {
    const result = await db.select().from(users).limit(limit).offset(offset).orderBy(users.createdAt);
    return result;
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({count: count()}).from(users)
    return result[0]["count"] ?? 0
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

  async createUserWithAuthService(insertUser: InsertUserWithAuthService): Promise<User> {
    const password = generatorPassword.generate({
      length: 12,
      uppercase: true,
      lowercase: true,
      symbols: true
    })

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userToInsert = {
      ...insertUser,
      password: hashedPassword
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

  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<User | null> {

    const currentUser = await this.getUserById(id)
    if(!currentUser) return null

    const isValid = await bcrypt.compare(currentPassword, currentUser.password);
    if(!isValid) return null

    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Main Lesson operations
  async getMainLessons(): Promise<MainLesson[]> {
    const result = await db.select().from(mainLessons).orderBy(mainLessons.createdAt)
    return result
  }

  async createMainLesson(mainLesson: InsertMainLesson): Promise<MainLesson> {
    const [result] = await db.insert(mainLessons).values(
      {
        ...mainLesson, 
        status: mainLesson.status || "draft"
      }).returning()
    return result
  }

  async updateMainLesson(id: number, mainLesson: UpdateMainLesson): Promise<MainLesson | undefined> {
    const [result] = await db.update(mainLessons).set({
      ...mainLesson,
      updatedAt: new Date()
    }).where(eq(mainLessons.id, id)).returning()
    return result || undefined
  }

  // Lesson operations
  async getLessons(): Promise<LessonData[]> {
    // const result = await db.select().from(lessons).orderBy(lessons.createdAt);
    const result = await db.select().from(lessons)
      .leftJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
      .orderBy(lessons.createdAt)
  
    const lessonList = result.map(e => (<LessonData>{
      id: e.lessons.id,
      lessonTypeId: e.lessons.lessonTypeId,
      lessonType: e.lesson_type,
      title: e.lessons.title,
      description: e.lessons.description,
      level: e.lessons.level,
      free: e.lessons.free,
      image: e.lessons.image,
      price: e.lessons.price,
      status: e.lessons.status,
      sections: e.lessons.sections,
      createdAt: e.lessons.createdAt,
      updatedAt: e.lessons.updatedAt
    })) 
    return lessonList;
  }

  async getLessonsJoin(user: User): Promise<any> {
    // const result = await db.select().from(users)
    // .innerJoin(purchase_history, eq(users.id, purchase_history.userId))
    // .fullJoin(lessons, eq(lessons.id, purchase_history.lessonId))
    // .orderBy(lessons.id);
    // const publishedLessons = result.filter(e => e.lessons?.status == "published").map(e => ({
    //   id: e.lessons?.id,
    //   title: e.lessons?.title,
    //   description: e.lessons?.description,
    //   level: e.lessons?.level,
    //   image: e.lessons?.image,
    //   free: e.lessons?.free,
    //   price: e.lessons?.price,
    //   hasPurchased: e.purchase_history?.lessonId === e.lessons?.id && e.purchase_history?.userId === user.id
    //     && e.purchase_history?.paymentStatus?.toLowerCase() === "completed",
    //   createdAt: e.lessons?.createdAt,
    //   updatedAt: e.lessons?.updatedAt
    // }))
    // return publishedLessons;

    // const result = await db.select().from(lessons)
    // .fullJoin(purchase_history, eq(lessons.id, purchase_history.lessonId))
    // .fullJoin(users, eq(users.id, purchase_history.userId))
    // .orderBy(lessons.id);
    // const publishedLessons = result.filter(e => e.lessons?.status === "published").map(e => ({
    //   id: e.lessons?.id,
    //   title: e.lessons?.title,
    //   description: e.lessons?.description,
    //   level: e.lessons?.level,
    //   image: e.lessons?.image,
    //   free: e.lessons?.free,
    //   price: e.lessons?.price,
    //   hasPurchased: e.purchase_history?.lessonId === e.lessons?.id && e.purchase_history?.userId === user.id
    //     && e.purchase_history?.paymentStatus?.toLowerCase() === "completed",
    //   createdAt: e.lessons?.createdAt,
    //   updatedAt: e.lessons?.updatedAt
    // }))

    // for(let i = 0; i < publishedLessons.length - 1; i++){
    //   if(publishedLessons[i].id === publishedLessons[i + 1].id){
    //       if(!publishedLessons[i].hasPurchased){
    //         publishedLessons.splice(i, 1)
    //       }else if(!publishedLessons[i + 1].hasPurchased){
    //         publishedLessons.splice(i + 1, 1)
    //       }
    //   }
    // }

    // const uniqueArray = publishedLessons.filter((obj, index, self) =>
    //   index === self.findIndex((o) => o.id === obj.id)
    // );
    
    // return publishedLessons;

    const result = await db.select().from(lessons)
      .innerJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
      .orderBy(lessons.createdAt);
    const lessonsUserPurchased = await db.select().from(lessons)
      .fullJoin(purchase_history, eq(lessons.id, purchase_history.lessonId))
      .innerJoin(users, eq(users.id, purchase_history.userId))
      .where(eq(users.id, user.id))
      .orderBy(lessons.createdAt);

    const publishedLessons = result.filter(e => e.lessons.status === "published").map(e => ({
      id: e.lessons.id,
      title: e.lessons.title,
      description: e.lessons.description,
      level: e.lessons.level,
      lessonType: e.lesson_type,
      image: e.lessons.image,
      free: e.lessons.free,
      price: e.lessons.price,
      priceCurrency: `${Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format((e.lessons.price || 0) / 100)}`,
      hasPurchased: false,
      createdAt: e.lessons.createdAt,
      updatedAt: e.lessons.updatedAt
    }))

    // for(let e1 of publishedLessons){
    //   for(let e2 of lessonUserPurchased){
    //     let hasPurchased = e1.id === e2.purchase_history?.lessonId && e2.purchase_history?.userId === user.id 
    //         && e2.purchase_history?.paymentStatus?.toLowerCase() === "completed"
    //     if(hasPurchased){
    //       e1.hasPurchased = hasPurchased
    //     }
    //   }
    // }

    for(let lessonPurchased of lessonsUserPurchased){
        const indexFound = publishedLessons.findIndex(e => e.id === lessonPurchased.lessons?.id)
        let hasPurchased = lessonPurchased.lessons?.id === lessonPurchased.purchase_history?.lessonId
            && lessonPurchased.purchase_history?.userId === user.id 
            && lessonPurchased.purchase_history?.paymentStatus?.toLowerCase() === "completed"
        if(indexFound === -1) break
        //if(publishedLessons[indexFound].free) continue
        publishedLessons[indexFound].hasPurchased = hasPurchased
    }
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
    return (result.rowCount ?? 0) > 0;
  }

  // Quiz Operations
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
    return (result.rowCount ?? 0) > 0;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allLessons = await db.select().from(lessons);
    const allQuizzes = await db.select().from(quizzes);
    const allUsers = await db.select({email: users.email, 
      isActive: users.isActive, 
      role: users.role,
      createdAt: users.createdAt}).from(users).where(eq(users.role, "student"))
    const allPurchaseHistory = await db.select().from(purchase_history)
    
    const totalLessons = allLessons.length;
    const totalQuizzes = allQuizzes.length;
    const totalUsers = allUsers.length;
    const totalActiveUsers = allUsers.filter(f => f.isActive).length
    const totalPurchaseHistoryComplete = allPurchaseHistory
      .filter(f => f.paymentStatus?.toLowerCase() === "completed")
      .reduce((sum, f) => sum + ((f.purchaseAmount) / 100), 0)
    const freeLessons = allLessons.filter(l => l.free).length;
    const premiumLessons = allLessons.filter(l => !l.free).length;
    
    // Calculate growth (mock data)
    //const lessonsGrowth = 12; // 12% growth
    //const quizzesGrowth = 8;  // 8% growth
    //const usersGrowth = 12

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Calculate MoM (Month over Month) Users Growth Rate
    const currentMonthUsers = allUsers.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.createdAt.getFullYear() === currentYear)
    const priorMonthUsers = allUsers.filter(f => (f.createdAt.getMonth() + 1) < currentMonth 
      && (f.createdAt.getMonth() + 1) < currentMonth - 2 
      && f.createdAt.getFullYear() === currentYear)
    const usersGrowth = priorMonthUsers.length === 0 ? 0 : ((currentMonthUsers.length / priorMonthUsers.length) - 1)

    // Calculate MoM (Month over Month) Active Users Growth Rate
    const currentMonthActiveUsers = allUsers.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.isActive && f.createdAt.getFullYear() === currentYear)
    const priorMonthActiveUsers = allUsers.filter(f => (f.createdAt.getMonth() + 1) < currentMonth && f.isActive 
      && (f.createdAt.getMonth() + 1) < currentMonth - 2 
      && f.createdAt.getFullYear() === currentYear)
    const activeUsersGrowth = priorMonthActiveUsers.length === 0 ? 0 : ((currentMonthActiveUsers.length / priorMonthActiveUsers.length) - 1)

    // Calculate MoM (Month over Month) Lessons Growth Rate
    const currentMonthLessons = allLessons.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.createdAt.getFullYear() === currentYear)
    const priorMonthLessons = allLessons.filter(f => (f.createdAt.getMonth() + 1) < currentMonth 
      && (f.createdAt.getMonth() + 1) < currentMonth - 2 
      && f.createdAt.getFullYear() === currentYear)
    const lessonsGrowth = priorMonthLessons.length === 0 ? 0 : ((currentMonthLessons.length / priorMonthLessons.length) - 1)

    // Calculate MoM (Month over Month) Quizzes Growth Rate
    const currentMonthQuizzes = allQuizzes.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.createdAt.getFullYear() === currentYear)
    const priorMonthQuizzes = allQuizzes.filter(f => (f.createdAt.getMonth() + 1) < currentMonth 
      && (f.createdAt.getMonth() + 1) < currentMonth - 2 
      && f.createdAt.getFullYear() === currentYear)
    const quizzesGrowth = priorMonthQuizzes.length === 0 ? 0 : ((currentMonthQuizzes.length / priorMonthQuizzes.length) - 1)

    // Calculate complete purchase amount Growth Rate
    const currentMonthPurchases = allPurchaseHistory.filter(f => (f.createdAt.getMonth() + 1) === currentMonth 
      && f.paymentStatus?.toLowerCase() === "completed" 
      && f.createdAt.getFullYear() === currentYear)
    const priorMonthPurchases = allPurchaseHistory.filter(f => (f.createdAt.getMonth() + 1) < currentMonth 
      && f.paymentStatus?.toLowerCase() === "completed" 
      && (f.createdAt.getMonth() + 1) < currentMonth - 2 
      && f.createdAt.getFullYear() === currentYear)
    const purchasesGrowth = priorMonthPurchases.length === 0 ? 0 : ((currentMonthPurchases.length / priorMonthPurchases.length) - 1)
    
    // Calculate average price
    const premiumLessonsWithPrice = allLessons.filter(l => !l.free && l.price);
    const avgPrice = premiumLessonsWithPrice.length > 0 
      ? premiumLessonsWithPrice.reduce((sum, l) => sum + ((l.price || 0) / 100), 0) / premiumLessonsWithPrice.length
      : 0;

    return {
      totalLessons,
      totalQuizzes,
      totalUsers,
      totalActiveUsers,
      totalPurchaseHistoryComplete,
      freeLessons,
      premiumLessons,
      lessonsGrowth,
      quizzesGrowth,
      usersGrowth,
      activeUsersGrowth,
      purchasesGrowth,
      avgPrice: Math.round(avgPrice)
    };
  }

  async getAnalytics(): Promise<Analytics[]> {
    const result = await db.select().from(analytics).orderBy(analytics.createdAt);
    return result;
  }

  async exportLessons(): Promise<Lesson[] | LessonData[]> {
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

  // Purchase History Operations
  async createPurchaseHistory(insertPurchaseHistory: InsertPurchaseHistory): Promise<PurchaseHistory> {
    const [purchaseHistory] = await db
      .insert(purchase_history)
      .values({
        ...insertPurchaseHistory,
        purchaseId: insertPurchaseHistory.purchaseId,
        userId: insertPurchaseHistory.userId,
        userEmail: insertPurchaseHistory.userEmail,
        lessonId: insertPurchaseHistory.lessonId,
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
      .innerJoin(lessons, eq(lessons.id, purchase_history.lessonId))
      .limit(limit)
      .offset(offset)
      .orderBy(purchase_history.createdAt)
    
    const publishedPurchaseHistory = result.map(e => ({
      id: e.purchase_history.id,
      purchaseId: e.purchase_history.purchaseId,
      email: e.users.email,
      lessonId: e.purchase_history.lessonId,
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

  // Lesson Type Operations
  async getAllLessonType(): Promise<LessonType[]> {
    const result = await db.select().from(lessonType).orderBy(lessonType.createdAt)
    return result
  }

  async createLessonType(insertLessonType: InsertLessonType): Promise<LessonType> {
    const [ result ] = await db.insert(lessonType).values(
      {...insertLessonType, 
        icon: insertLessonType.icon, 
        title: insertLessonType.title
      }
    ).returning()
    return result
  }

  async updateLessonType(id: number, updateLessonType: UpdateLessonType): Promise<LessonType | undefined> {
    const [result] = await db.update(lessonType).set({...updateLessonType, updatedAt: new Date()})
      .where(eq(lessonType.id, id)).returning()
    return result || undefined
  }

  async deleteLessonType(id: number): Promise<boolean> {
    const result = await db.delete(lessonType).where(eq(lessonType.id, id))
    return (result.rowCount ?? 0) > 0
  }

  async getLessonTypeDetail(id: number): Promise<Lesson[]> {
    const result = await db.select().from(lessons)
      .where(eq(lessons.lessonTypeId, id))
      .orderBy(lessons.createdAt)
    return result
  }
}

export const storage = new DatabaseStorage();