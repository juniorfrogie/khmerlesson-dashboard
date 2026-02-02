import { InsertLesson, InsertQuiz, Lesson, Quiz } from "@shared/schema";
import { LessonController } from "server/features/lessons/controller/controller";
import { QuizController } from "server/features/quizzes/controller/controller";

export class ImportController{
  async importLessons(lessons: InsertLesson[]): Promise<Lesson[]> {
    const imported: Lesson[] = [];
    const controller = new LessonController()
    for (const lesson of lessons) {
      imported.push(await controller.createLesson(lesson));
    }
    return imported;
  }

  async importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]> {
    const imported: Quiz[] = [];
    const controller = new QuizController()
    for (const quiz of quizzes) {
      imported.push(await controller.createQuiz(quiz));
    }
    return imported;
  }
}