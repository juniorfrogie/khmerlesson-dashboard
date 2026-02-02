import { Lesson, Quiz } from "@shared/schema";
import { LessonController } from "server/features/lessons/controller/controller";
import { QuizController } from "server/features/quizzes/controller/controller";

export class ExportController{
  async exportLessons(): Promise<Lesson[]> {
    return new LessonController().getAllLessons();
  }

  async exportQuizzes(): Promise<Quiz[]> {
    return new QuizController().getQuizzes();
  }
}