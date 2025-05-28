import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id"),
  quizId: integer("quiz_id"),
  completions: integer("completions").default(0),
  averageScore: integer("average_score"), // for quizzes
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Types
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type UpdateLesson = z.infer<typeof updateLessonSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type UpdateQuiz = z.infer<typeof updateQuizSchema>;

export type Analytics = typeof analytics.$inferSelect;

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
