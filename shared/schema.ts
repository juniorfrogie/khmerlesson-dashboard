import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mainLessons = pgTable("main_lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageCover: text("image_cover").notNull(),
  isFree: boolean("is_free").notNull().default(false),
  order: integer("order").notNull().default(0),
  status: text("status").notNull().default("draft"), // "draft" | "published" | "coming_soon"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  mainLessonId: integer("main_lesson_id")
    .references(() => mainLessons.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(), // association with main lesson
  lessonTypeId: integer("lesson_type_id")
    .references(() => lessonType.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(), // association with lesson type
  title: text("title").notNull(),
  description: text("description").notNull(),
  level: text("level").notNull(), // "Beginner" | "Intermediate" | "Advanced"
  image: text("image").notNull(), // image type identifier
  sections: jsonb("sections").notNull().default([]), // array of {title: string, content: string, html: string, ops: []}
  status: text("status").notNull().default("draft"), // "draft" | "published"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const lessonType = pgTable("lesson_type", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon").notNull(),
  iconMode: text("icon_mode").notNull().default("raw"), // "raw" | "file"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade", onUpdate: "cascade" }), // optional association with lesson
  questions: jsonb("questions").notNull().default([]), // array of quiz questions
  status: text("status").notNull().default("draft"), // "draft" | "active"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
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
  registrationType: varchar("registration_type").notNull().default("authenication"), // "authenication" | "google_service"
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id"),
  quizId: integer("quiz_id"),
  completions: integer("completions").default(0),
  averageScore: integer("average_score"), // for quizzes
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  platform: varchar("platform").notNull(),                           // "ios" | "android"
  productId: varchar("product_id").notNull(),                        // App Store product ID
  originalTransactionId: varchar("original_transaction_id").notNull().unique(),
  status: varchar("status").notNull().default("trial"),              // "trial" | "active" | "expired" | "cancelled"
  currentPeriodEndsAt: timestamp("current_period_ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  price: integer("price").notNull(),                  // annual price in cents
  productIdIos: varchar("product_id_ios"),            // App Store product ID
  productIdAndroid: varchar("product_id_android"),    // Play Store product ID (future)
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionPlanCourses = pgTable("subscription_plan_courses", {
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id, { onDelete: "cascade" }),
  mainLessonId: integer("main_lesson_id").notNull().references(() => mainLessons.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.planId, table.mainLessonId] }),
]);

export const blacklist = pgTable("blacklist", {
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiredAt: timestamp("expired_at").notNull()
});

// Main Lesson schema
export const insertMainLessonSchema = createInsertSchema(mainLessons).omit({
  id: true,
  order: true,
  createdAt: true,
  updatedAt: true
})

export const updateMainLessonSchema = insertMainLessonSchema.partial()

// Subscription schema
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateSubscriptionSchema = insertSubscriptionSchema.partial()

// Subscription Plan schema
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateSubscriptionPlanSchema = insertSubscriptionPlanSchema.partial()

// Blacklist schema
export const insertBlacklistSchema = createInsertSchema(blacklist).omit({
  createdAt: true
});

// Lesson schema
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLessonSchema = insertLessonSchema.partial();

// Lesson Type schema
export const insertLessonTypeSchema = createInsertSchema(lessonType).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateLessonTypeSchema = createInsertSchema(lessonType).partial()

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

export const insertUserWithAuthServiceSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
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
export type InsertUserWithAuthService = z.infer<typeof insertUserWithAuthServiceSchema>;

export type MainLesson = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  title: string;
  description: string;
  imageCover: string;
  imageCoverUrl?: string | null;
  isFree: boolean;
  order: number;
}
export type InsertMainLesson = z.infer<typeof insertMainLessonSchema>
export type UpdateMainLesson = z.infer<typeof updateMainLessonSchema>

//export type Lesson = typeof lessons.$inferSelect;
export type Lesson = {
  id: number
  title: string
  mainLessonId: number
  lessonTypeId: number
  lessonType?: LessonType
  description: string
  level: string
  image: string
  status: string
  sections: unknown
  createdAt: Date
  updatedAt: Date
}
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type UpdateLesson = z.infer<typeof updateLessonSchema>;

// export type LessonType = typeof lessonType.$inferSelect;
export type LessonType = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  icon: string;
  iconUrl?: string | null;
  iconMode: string;
}
export type InsertLessonType = z.infer<typeof insertLessonTypeSchema>;
export type UpdateLessonType = z.infer<typeof updateLessonTypeSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type UpdateQuiz = z.infer<typeof updateQuizSchema>;

export type Analytics = typeof analytics.$inferSelect;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UpdateSubscriptionPlan = z.infer<typeof updateSubscriptionPlanSchema>;

export type SubscriptionPlanCourse = typeof subscriptionPlanCourses.$inferSelect;

export type Blacklist = typeof blacklist.$inferSelect
export type InsertBlacklist = z.infer<typeof insertBlacklistSchema>

// Lesson
// export type LessonData = {
//   id: number
//   title: string
//   mainLessonId: number
//   lessonType: LessonType
//   description: string
//   level: string
//   image: string
//   // free: boolean
//   // price: number
//   status: string
//   sections: unknown
//   createdAt: Date
//   updatedAt: Date
// }

// Lesson section type
export type LessonSection = {
  title: string;
  content: string;
  html?: string | null;
  ops?: unknown;
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
  totalMainLessons: number;
  totalLessons: number;
  totalQuizzes: number;
  totalUsers: number;
  totalActiveUsers: number;
  totalActiveSubscriptions: number;
  totalTrialSubscriptions: number;
  mainLessonsGrowth: number;
  lessonsGrowth: number;
  quizzesGrowth: number;
  usersGrowth: number;
  activeUsersGrowth: number;
  subscriptionsGrowth: number;
};

// Subscription dashboard row type
export type SubscriptionData = {
  id: number;
  email: string;
  planName: string;
  platform: string;
  status: string;
  currentPeriodEndsAt: Date;
  createdAt: Date;
}