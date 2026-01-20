import { insertLessonSchema, insertQuizSchema } from "@shared/schema";
import { Router } from "express";
import { storage } from "server/storage";
import { z } from "zod"

const router = Router()

router.post("/lessons", async (req, res) => {
    try {
      const lessons = z.array(insertLessonSchema).parse(req.body);
      const imported = await storage.importLessons(lessons);
      res.status(201).json({ message: `Imported ${imported.length} lessons`, lessons: imported });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import lessons" });
    }
  });

  router.post("/quizzes", async (req, res) => {
    try {
      const quizzes = z.array(insertQuizSchema).parse(req.body);
      const imported = await storage.importQuizzes(quizzes);
      res.status(201).json({ message: `Imported ${imported.length} quizzes`, quizzes: imported });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import quizzes" });
    }
  });

export default router;