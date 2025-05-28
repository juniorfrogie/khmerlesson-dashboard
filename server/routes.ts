import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLessonSchema, updateLessonSchema, insertQuizSchema, updateQuizSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Lessons CRUD
  app.get("/api/lessons", async (req, res) => {
    try {
      const { search, level, type, status } = req.query;
      let lessons = await storage.getLessons();
      
      // Apply filters
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        lessons = lessons.filter(lesson => 
          lesson.title.toLowerCase().includes(searchTerm) ||
          lesson.description.toLowerCase().includes(searchTerm)
        );
      }
      
      if (level) {
        lessons = lessons.filter(lesson => lesson.level === level);
      }
      
      if (type) {
        lessons = lessons.filter(lesson => lesson.image === type);
      }
      
      if (status) {
        lessons = lessons.filter(lesson => lesson.status === status);
      }
      
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLesson(id);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.post("/api/lessons", async (req, res) => {
    try {
      const validatedData = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.patch("/api/lessons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateLessonSchema.parse(req.body);
      const lesson = await storage.updateLesson(id, validatedData);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLesson(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Quizzes CRUD
  app.get("/api/quizzes", async (req, res) => {
    try {
      const { search, lessonId, status } = req.query;
      let quizzes = await storage.getQuizzes();
      
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
      
      if (status) {
        quizzes = quizzes.filter(quiz => quiz.status === status);
      }
      
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quizzes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quiz = await storage.getQuiz(id);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  app.post("/api/quizzes", async (req, res) => {
    try {
      const validatedData = insertQuizSchema.parse(req.body);
      const quiz = await storage.createQuiz(validatedData);
      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.patch("/api/quizzes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateQuizSchema.parse(req.body);
      const quiz = await storage.updateQuiz(id, validatedData);
      
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

  app.delete("/api/quizzes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteQuiz(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quiz" });
    }
  });

  // Import/Export
  app.get("/api/export/lessons", async (req, res) => {
    try {
      const lessons = await storage.exportLessons();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="lessons.json"');
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to export lessons" });
    }
  });

  app.get("/api/export/quizzes", async (req, res) => {
    try {
      const quizzes = await storage.exportQuizzes();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="quizzes.json"');
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Failed to export quizzes" });
    }
  });

  app.post("/api/import/lessons", async (req, res) => {
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

  app.post("/api/import/quizzes", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
