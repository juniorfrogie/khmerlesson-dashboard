import { insertLessonTypeSchema, updateLessonTypeSchema } from "@shared/schema";
import { Router } from "express";
import { storage } from "server/storage";
import { z } from "zod"

const router = Router()

const { NODE_ENV, BUCKET_ORIGIN_END_POINT } = process.env

  router.get("/", async (req, res) => {
    try{
      const { search } = req.query;
      // let lessonTypes = await storage.getAllLessonType()
      const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
      const offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let lessonTypes = await storage.getLessonTypePage(limit, offset)
      const total = await storage.getLessonTypeCount()

      if(search){
        const searchTerm = (search as string).toLowerCase();
        lessonTypes = lessonTypes.filter(lessonType => 
          lessonType.title.toLowerCase().includes(searchTerm)
        );
      }

      for(const lessonType of lessonTypes){
        if(lessonType?.iconMode === "file"){
          if(NODE_ENV === "production"){
            const urlBucketEndpoint = `${BUCKET_ORIGIN_END_POINT}/${lessonType?.icon}`
            lessonType.iconUrl = urlBucketEndpoint
          }else{
            const url = `/uploads/${lessonType?.icon}`
            lessonType.iconUrl = url
          }
        }
      }

      //res.json(lessonTypes)
      res.json({
        data: lessonTypes,
        total: total
      })
    } catch(error) {
      res.status(500).json({ message: "Failed to fetch lesson type" });
    }
  })

  router.get("/:id", async (req, res) => {
    try{
      const { id } = req.params
      // const lessonTypeDetails = await storage.getLessonTypeDetail(parseInt(id))
      const lessonTypeDetails = await storage.getLessonDetailByLessonTypeId(parseInt(id))
      res.json(lessonTypeDetails)
    } catch(error) {
      res.status(500).json({ message: "Failed to fetch lesson type detail" });
    }
  })

  router.post("/", async (req, res) => {
    try {
      const validatedData = insertLessonTypeSchema.parse(req.body);
      const lessonTypeList = await storage.createLessonType(validatedData);
      res.status(201).json(lessonTypeList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lesson type" });
    }
  })

  router.patch("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      const validatedData = updateLessonTypeSchema.parse(req.body);
      const lessonType = await storage.updateLessonType(id, validatedData)

      if(!lessonType){
        return res.status(404).json({message: "Lesson type not found"})
      }

      if(lessonType?.iconMode === "file"){
        if(NODE_ENV === "production"){
          const urlBucketEndpoint = `${BUCKET_ORIGIN_END_POINT}/${lessonType?.icon}`
          lessonType.iconUrl = urlBucketEndpoint
        }else{
          const url = `/uploads/${lessonType?.icon}`
          lessonType.iconUrl = url
        }
      }

      res.json(lessonType)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lesson type" });
    }
  })

  router.delete("/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      const deleted = await storage.deleteLessonType(id)

      if(!deleted){
        return res.status(404).json({message: "Lesson type not found"})
      }
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson type" });
    }
  })

  export default router;