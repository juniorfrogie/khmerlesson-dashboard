import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { insertMainLessonSchema, MainLesson, updateMainLessonSchema } from "@shared/schema";
import { Router } from "express";
import { storage } from "server/storage";
import fs from "fs";
import { z } from "zod";

const router = Router()

const { NODE_ENV,  
    BUCKET_ORIGIN_END_POINT,
    BUCKET_REGION,
    BUCKET_END_POINT,
    BUCKET_ACCESS_KEY,
    BUCKET_SECRET_ACCESS_KEY,
    BUCKET_NAME
  } = process.env

const s3 = new S3Client({
        region: BUCKET_REGION,
        endpoint: BUCKET_END_POINT,
        credentials: {
        accessKeyId: BUCKET_ACCESS_KEY ?? "",
        secretAccessKey: BUCKET_SECRET_ACCESS_KEY ?? ""
    }
})

async function checkFileExists(key: string): Promise<string> {
const defaultImageNotFoundPath = "/uploads/no-image-placeholder.png"
    try {
        if(NODE_ENV === "production"){
        const params = {
            Bucket: BUCKET_NAME ?? "",
            Key: key
        }
        const command = new HeadObjectCommand(params)
        await s3.send(command)
        const urlBucketEndpoint = `${BUCKET_ORIGIN_END_POINT}/${params.Key}`
            return urlBucketEndpoint
        }else{
            await fs.promises.access(`uploads/${key}`, fs.constants.F_OK)
            return `/uploads/${key}`
        }
    } catch (error) {
        return defaultImageNotFoundPath
    }
}

router.get("/", async (req, res) => {
    try {
        const { search, status } = req.query
        let mainLessons = <MainLesson[]>[]
        let mainLessonCount = 0
        if(req.query.limit && req.query.offset){
            const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
            const offset = parseInt(req.query.offset?.toString() ?? "0") || 0
            mainLessons = await storage.getMainLessons(limit, offset)
            mainLessonCount = await storage.getMainLessonCount()
        }else{
            mainLessons = await storage.getAllMainLessons()
        }
        //let mainLessons = await storage.getAllMainLessons()

        // Apply filters
        if (search) {
            const searchTerm = (search as string).toLowerCase();
            mainLessons = mainLessons.filter(mainLesson => 
                mainLesson.title.toLowerCase().includes(searchTerm) ||
                mainLesson.description.toLowerCase().includes(searchTerm)
            )
        }

        if(status && status !== "all"){
            mainLessons = mainLessons.filter(f => f.status === status)
        }

        //return res.json(mainLessons)
        for(const mainLesson of mainLessons){
            const result = await checkFileExists(`${mainLesson.imageCover}`)
            mainLesson.imageCoverUrl = result
        }
        return res.json({
            mainLessons: mainLessons,
            total: status !== "all" ? mainLessons.length : mainLessonCount
        })
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch main lessons" });
    }
})

router.get("/:id/lessons", async (req, res) => {
    try {
        const { id } = req.params
        // const result = await storage.getLessonDetailByMainLessonId(parseInt(id))
        const result = await storage.getAllLessonsByMainLesson(parseInt(id))
        for(const e of result){
        if(e.lessonType?.iconMode === "file"){
            if(NODE_ENV === "production"){
                const urlBucketEndpoint = `${BUCKET_ORIGIN_END_POINT}/${e.lessonType?.icon}`
                e.lessonType.iconUrl = urlBucketEndpoint
            }else{
                const url = `/uploads/${e.lessonType?.icon}`
                e.lessonType.iconUrl = url
            }
        }
        }
        res.json(result)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch main lessons detail" });
    }
})

router.get("/:id",  async (req, res) => {
    try {
        const { id } = req.params
        const mainLesson = await storage.getMainLesson(parseInt(id))
        if(!mainLesson){
            return res.status(404).json({ message: "Main Lesson not found" });
        }

        const result = await checkFileExists(`${mainLesson.imageCover}`)
        mainLesson.imageCoverUrl = result

        res.json(mainLesson)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch main lesson" });
    }
})

router.post("/", async (req, res) => {
    try {
        const validatedData = insertMainLessonSchema.parse(req.body);
        const mainLesson = await storage.createMainLesson(validatedData);
        res.status(201).json(mainLesson);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create main lesson" });
    }
})

router.patch("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const validatedData = updateMainLessonSchema.parse(req.body)
        const mainLesson = await storage.updateMainLesson(id, validatedData)
        
        if(!mainLesson){
            return res.status(404).json({message: "Main lesson not found"})
        }

        const result = await checkFileExists(`${mainLesson.imageCover}`)
        mainLesson.imageCoverUrl = result

        return res.json(mainLesson)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update main lesson" });
    }
})

router.delete("/:id", async (req, res) => {{
    try {
        const id = parseInt(req.params.id)
        const deletedMainLesson = await storage.deleteMainLesson(id)

        if(!deletedMainLesson){
            return res.status(404).json({message: "Main lesson not found"})
        }

        res.status(204).send()
    } catch (error) {
        res.status(500).json({ message: "Failed to delete main lesson" });
    }
}})

export default router;