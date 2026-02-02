import { Router } from "express";
import { ExportController } from "../controller/controller";

const router = Router()
const controller = new ExportController()

router.get("/lessons", async (req, res) => {
    try {
      const lessons = await controller.exportLessons();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="lessons.json"');
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to export lessons" });
    }
  });

  router.get("/quizzes", async (req, res) => {
    try {
      const quizzes = await controller.exportQuizzes();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="quizzes.json"');
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Failed to export quizzes" });
    }
  });

export default router;