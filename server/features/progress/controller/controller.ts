import {
  quizAttempts,
  lessonCompletions,
  type InsertQuizAttempt,
  type InsertLessonCompletion,
  type QuizAttempt,
  type LessonCompletion,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "server/db";

// Account-scoped quiz/lesson progress — one row per user+quiz (or
// user+lesson), upserted on retake/re-completion. Deliberately final-state
// only, matching the mobile client: a quiz is graded entirely client-side in
// one pass, so there is no partial/in-progress attempt to persist here.
export class ProgressController {
  async getQuizAttempts(userId: number): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));
  }

  async getLessonCompletions(userId: number): Promise<LessonCompletion[]> {
    return db.select().from(lessonCompletions).where(eq(lessonCompletions.userId, userId));
  }

  async upsertQuizAttempt(data: InsertQuizAttempt & { userId: number }): Promise<QuizAttempt> {
    const [result] = await db.insert(quizAttempts)
      .values(data)
      .onConflictDoUpdate({
        target: [quizAttempts.userId, quizAttempts.quizId],
        set: {
          lessonId: data.lessonId,
          score: data.score,
          total: data.total,
          completedAt: data.completedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async upsertLessonCompletion(data: InsertLessonCompletion & { userId: number }): Promise<LessonCompletion> {
    const [result] = await db.insert(lessonCompletions)
      .values(data)
      .onConflictDoUpdate({
        target: [lessonCompletions.userId, lessonCompletions.lessonId],
        set: {
          mainLessonId: data.mainLessonId,
          completedAt: data.completedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
}
