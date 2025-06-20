// import exp from "constants";
import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  free: boolean("free").notNull().default(true),
  price: integer("price"), // price in cents
  level: text("level").notNull(), // "Beginner" | "Intermediate" | "Advanced"
  image: text("image").notNull(), // image type identifier
  sections: jsonb("sections").notNull().default([]), // array of {title: string, content: string}
  status: text("status").notNull().default("draft"), // "draft" | "published"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lessonId: integer("lesson_id"), // optional association with lesson
  questions: jsonb("questions").notNull().default([]), // array of quiz questions
  status: text("status").notNull().default("draft"), // "draft" | "active"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 50 }).notNull().default("student"), // "admin" | "teacher" | "student"
  isActive: boolean("is_active").notNull().default(true),
  resetToken: varchar("reset_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id"),
  quizId: integer("quiz_id"),
  completions: integer("completions").default(0),
  averageScore: integer("average_score"), // for quizzes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchase_history = pgTable("purchase_history", {
  id: serial("id").primaryKey(),
  purchaseId: varchar("purchase_id").notNull(),
  userId: integer("user_id").references(() => users.id, {onDelete: 'cascade'}).notNull(),
  userEmail: varchar("user_email").references(() => users.email, {onDelete: 'cascade'}).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id, {onDelete: 'cascade'}).notNull(),
  paymentType: varchar("payment_type"),
  platformType: varchar("platform_type"),
  purchaseDate: varchar("purchase_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const blacklist = pgTable("blacklist", {
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiredAt: timestamp("expired_at").notNull()
});

// Blacklist schema
export const insertBlacklistSchema = createInsertSchema(blacklist).omit({
  createdAt: true
});

// Purchase History schema
export const insertPurchaseHistorySchema = createInsertSchema(purchase_history).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Lesson schema
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLessonSchema = insertLessonSchema.partial();

// Quiz schema
export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateQuizSchema = insertQuizSchema.partial();

// User schema
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
});

export const changePasswordSchema = z.object({
  id: z.number(),
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
});

// export const userCount = z.object({
//   count: z.number()
// })

export const updateUserSchema = insertUserSchema.partial().omit({
  password: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type ResetPasswordUser = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordUser = z.infer<typeof changePasswordSchema>;
// export type UserCount = z.infer<typeof userCount>

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type UpdateLesson = z.infer<typeof updateLessonSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type UpdateQuiz = z.infer<typeof updateQuizSchema>;

export type Analytics = typeof analytics.$inferSelect;

export type PurchaseHistory = typeof purchase_history.$inferSelect;
export type InsertPurchaseHistory = z.infer<typeof insertPurchaseHistorySchema>;

export type Blacklist = typeof blacklist.$inferSelect
export type InsertBlacklist = z.infer<typeof insertBlacklistSchema>

// Lesson section type
export type LessonSection = {
  title: string;
  content: string;
};

// Quiz question type
export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
};

// Dashboard stats type
export type DashboardStats = {
  totalLessons: number;
  totalQuizzes: number;
  freeLessons: number;
  premiumLessons: number;
  lessonsGrowth: number;
  quizzesGrowth: number;
  avgPrice: number;
};