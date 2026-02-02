import { insertQuizSchema, updateQuizSchema } from "@shared/schema";
import { Router } from "express";
import { z } from "zod"
import { QuizController } from "../controller/controller";

const router = Router()
const controller = new QuizController()

router.get("/", async (req, res) => {
    try {
      const { search, lessonId, status } = req.query;
      let quizzes = await controller.getQuizzes();
      
      // Apply filters
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        quizzes = quizzes.filter(quiz => 
          quiz.title.toLowerCase().includes(searchTerm) ||
          quiz.description.toLowerCase().includes(searchTerm)
        );
      }
      
      if (lessonId) {
        quizzes = quizzes.filter(quiz => quiz.lessonId === parseInt(lessonId as string));
      }
      
      if (status && status !== "all") {
        quizzes = quizzes.filter(quiz => quiz.status === status);
      }
      
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quiz = await controller.getQuiz(id);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const validatedData = insertQuizSchema.parse(req.body);
      const quiz = await controller.createQuiz(validatedData);
      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  router.patch("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateQuizSchema.parse(req.body);
      const quiz = await controller.updateQuiz(id, validatedData);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update quiz" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await controller.deleteQuiz(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quiz" });
    }
  });

export default router;