import { InsertQuiz, Quiz, quizzes, UpdateQuiz } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "server/db";

export class QuizController{
  
    // static instance: QuizController | null = null
    // constructor(){
    //   if(QuizController.instance){
    //     return QuizController.instance
    //   }
    //   QuizController.instance = this
    // }

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
}

// const instance = new QuizController()
// Object.freeze(instance)
// export default instance