import { insertLessonSchema, updateLessonSchema } from "@shared/schema";
import { Router } from "express";
import { storage } from "server/storage";
import { z } from "zod";

const router = Router()

const { NODE_ENV, BUCKET_ORIGIN_END_POINT } = process.env

router.get("/", async (req, res) => {
    try {
      const { search, level, type, status } = req.query;
      let lessons = []
      let lessonCount = 0
      if(req.query.limit && req.query.offset){
        const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
        const offset = parseInt(req.query.offset?.toString() ?? "0") || 0
        lessons = await storage.getLessons(limit, offset)
        lessonCount = await storage.getLessonCount()
      }else{
        lessons = await storage.getAllLessons()
      }
      
      // Apply filters
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        lessons = lessons.filter(lesson => 
          lesson.title.toLowerCase().includes(searchTerm) ||
          lesson.description.toLowerCase().includes(searchTerm)
        );
      }
      
      if (level && level !== "all") {
        lessons = lessons.filter(lesson => lesson.level === level);
      }
      
      if (type && type !== "all") {
        lessons = lessons.filter(lesson => lesson.lessonType?.title.toLowerCase() === type);
      }
      
      if (status && status !== "all") {
        lessons = lessons.filter(lesson => lesson.status === status);
      }

      for(const lesson of lessons){
        if(lesson.lessonType?.iconMode === "file"){
          if(NODE_ENV === "production"){
            const urlBucketEndpoint = `${BUCKET_ORIGIN_END_POINT}/${lesson.lessonType?.icon}`
            lesson.lessonType.iconUrl = urlBucketEndpoint
          }else{
            const url = `/uploads/${lesson.lessonType?.icon}`
            lesson.lessonType.iconUrl = url
          }
        }
      }
      
      res.json({
        lessons: lessons,
        total: level !== "all" || type !== "all" || status !== "all" ? lessons.length : lessonCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  router.get("/:id", async (req, res) => {
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

  router.post("/", async (req, res) => {
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

  router.patch("/:id", async (req, res) => {
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

  router.delete("/:id", async (req, res) => {
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

  export default router;