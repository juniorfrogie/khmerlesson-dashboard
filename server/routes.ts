import type { Express } from "express";
import express from "express"
import { createServer, type Server } from "http";
import { request } from "https";
import { storage } from "./storage";
import { forgotPasswordSchema, loginSchema, insertUserSchema,
   insertLessonSchema, updateLessonSchema, 
   insertQuizSchema, updateQuizSchema, 
   insertBlacklistSchema, 
   insertPurchaseHistorySchema,
   insertUserWithAuthServiceSchema,
   insertLessonTypeSchema,
   updateLessonTypeSchema,
   insertMainLessonSchema,
   updateMainLessonSchema,
   MainLesson} from "@shared/schema";
import { z } from "zod";
import apiRoutes from "./api";
import paypalRoutes from "./paypal/orders"
import fileUploadRoute from "./file-upload/file_upload"
import nodemailer from "nodemailer";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import cors from "cors";
import { mailTemplate } from "./mail/mail_template";
import cron from "node-cron"
import path from "path";
import fs from "fs";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3"
import appleAuthRoute from "./auth/apple_auth"

export async function registerRoutes(app: Express): Promise<Server> {

  const { TOKEN_SECRET } = process.env
  const expiresIn = app.get("env") === "development" ? "1800s" : "90d"
  const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`

  const s3 = new S3Client({
    region: process.env.BUCKET_REGION,
    endpoint: process.env.BUCKET_END_POINT,
    credentials: {
      accessKeyId: process.env.BUCKET_ACCESS_KEY ?? "",
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY ?? ""
    }
  })

  async function checkFileExists(key: string): Promise<string> {
    const defaultImageNotFoundPath = "/uploads/no-image-placeholder.png"
    try {
      if(process.env.NODE_ENV === "production"){
        const params = {
          Bucket: process.env.BUCKET_NAME ?? "",
          Key: key
        }
        //const s3RequestHeadObject = s3.headObject(params)
        //await s3RequestHeadObject.promise()
        const command = new HeadObjectCommand(params)
        await s3.send(command)
        const urlBucketEndpoint = `${bucketEndpoint}/${params.Key}`
        return urlBucketEndpoint
        // s3.headObject(params, (err, data) => {
        //   if (err) {
        //     if (err.code === 'NotFound') {
        //       console.log('File does not exist in S3 Bucket')
        //       return defaultImageNotFoundPath
        //     } else {
        //       console.log('Error Occured While headObject():', err)
        //       return defaultImageNotFoundPath
        //     }
        //   } else {
        //     const urlBucketEndpoint = `${bucketEndpoint}/${params.Key}`
        //     return urlBucketEndpoint
        //   }
        // });
      }else{
        await fs.promises.access(`uploads/${key}`, fs.constants.F_OK)
        return `/uploads/${key}`
      }
    } catch (error) {
      return defaultImageNotFoundPath
    }
  }

  // Middleware to set CORS headers for all routes
  app.use(cors({
    origin: app.get("env") === "development" ? "*" : "https://cambodianlesson.netlify.app"
  }))

  // Mount public API routes
  app.use("/api/v1", apiRoutes);
  app.use("/api", paypalRoutes, fileUploadRoute);
  app.use("/api/auth", appleAuthRoute);

  //app.disable('etag');

  //const publicDir = path.join(import.meta.dirname, '..');
  const uploadDir = path.join(import.meta.dirname, '.', '../uploads');
  app.use("/uploads", express.static(uploadDir))

  const storagesDir = path.join(import.meta.dirname, '.', '../storages');
  app.use("/storages", express.static(storagesDir))

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/privacy-policy", async (req, res) => {
    const filePath = path.join(import.meta.dirname, '.', '../attached_assets/khmer-privacy-policy.html')

    // Read the HTML file
    fs.readFile(filePath, (err, data) => {
      if (err) {
          // Handle errors if the file cannot be read
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Error loading file.')
          return
      }

      // Set the content type to HTML and send the file content
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(data)
    })
  })

  // Main Lessons CRUD
  app.get("/api/main-lessons", async (req, res) => {
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
      for(let mainLesson of mainLessons){
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

  app.get("/api/main-lessons-details/:id", async (req, res) => {
    try {
      const { id } = req.params
      // const result = await storage.getLessonDetailByMainLessonId(parseInt(id))
      const result = await storage.getAllLessonsByMainLesson(parseInt(id))
      for(let e of result){
        if(e.lessonType?.iconMode === "file"){
          if(process.env.NODE_ENV === "production"){
            const urlBucketEndpoint = `${bucketEndpoint}/${e.lessonType?.icon}`
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

  app.get("/api/main-lessons/:id", async (req, res) => {
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

  app.post("/api/main-lessons", async (req, res) => {
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

  app.patch("/api/main-lessons/:id", async (req, res) => {
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

  app.delete("/api/main-lesson/:id", async (req, res) => {{
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

  // Lessons CRUD
  app.get("/api/lessons", async (req, res) => {
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

      for(let lesson of lessons){
        if(lesson.lessonType?.iconMode === "file"){
          if(process.env.NODE_ENV === "production"){
            const urlBucketEndpoint = `${bucketEndpoint}/${lesson.lessonType?.icon}`
            lesson.lessonType.iconUrl = urlBucketEndpoint
          }else{
            const url = `/uploads/${lesson.lessonType?.icon}`
            lesson.lessonType.iconUrl = url
          }
        }
      }
      
      //res.json(lessons);
      res.json({
        lessons: lessons,
        total: level !== "all" || type !== "all" || status !== "all" ? lessons.length : lessonCount
      });
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

  // Lesson Type CRUD
  app.get("/api/lesson-type", async (req, res) => {
    try{
      const { search } = req.query;
      let lessonTypes = await storage.getAllLessonType()

      if(search){
        const searchTerm = (search as string).toLowerCase();
        lessonTypes = lessonTypes.filter(lessonType => 
          lessonType.title.toLowerCase().includes(searchTerm)
        );
      }

      for(let lessonType of lessonTypes){
        if(lessonType?.iconMode === "file"){
          if(process.env.NODE_ENV === "production"){
            const urlBucketEndpoint = `${bucketEndpoint}/${lessonType?.icon}`
            lessonType.iconUrl = urlBucketEndpoint
          }else{
            const url = `/uploads/${lessonType?.icon}`
            lessonType.iconUrl = url
          }
        }
      }

      res.json(lessonTypes)
    } catch(error) {
      res.status(500).json({ message: "Failed to fetch lesson type" });
    }
  })

  app.get("/api/lesson-type/:id", async (req, res) => {
    try{
      const { id } = req.params
      // const lessonTypeDetails = await storage.getLessonTypeDetail(parseInt(id))
      const lessonTypeDetails = await storage.getLessonDetailByLessonTypeId(parseInt(id))
      res.json(lessonTypeDetails)
    } catch(error) {
      res.status(500).json({ message: "Failed to fetch lesson type detail" });
    }
  })

  app.post("/api/lesson-type", async (req, res) => {
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

  app.patch("/api/lesson-type/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id)
      const validatedData = updateLessonTypeSchema.parse(req.body);
      const lessonType = await storage.updateLessonType(id, validatedData)

      if(!lessonType){
        return res.status(404).json({message: "Lesson type not found"})
      }

      if(lessonType?.iconMode === "file"){
        if(process.env.NODE_ENV === "production"){
          const urlBucketEndpoint = `${bucketEndpoint}/${lessonType?.icon}`
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

  app.delete("/api/lesson-type/:id", async (req, res) => {
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
      
      if (status && status !== "all") {
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

  // Register user authentication routes directly to avoid Vite interference
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
      }
  
      const user = await storage.createUser(userData);
      
      const { password, resetToken, registrationType, ...userResponse } = user;
      
      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: expiresIn
      })
  
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token: token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/register-auth-service", async (req, res) => {
    try {
      const userData = insertUserWithAuthServiceSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        if(existingUser.registrationType === "authenication"){
          return res.status(409).json({ message: "User already exists with this email" });
        }
        //
        const { password, resetToken, registrationType, ...userResponse } = existingUser;
        const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
          expiresIn: expiresIn
        })
        return res.status(200).json({
          user: userResponse,
          token: token
        });
      }

      const user = await storage.createUserWithAuthService(userData);
      
      const { password, resetToken, registrationType, ...userResponse } = user;
      
      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: expiresIn
      })
  
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token: token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await storage.verifyPassword(loginData.email, loginData.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
  
      const { password, resetToken, registrationType, ...userResponse } = user;
      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: expiresIn
      })
  
      const days = 90;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);
      res.cookie("token", token, {
        expires: expirationDate,
        httpOnly: true
      })
      //
      res.json({
        message: "Login successful",
        user: userResponse,
        token: token
      });
      //
      await storage.updateUserLastLogin(user.id)
    } catch (error) { 
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Admin Login
  app.post("/api/auth/admin", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await storage.loginByAdmin(loginData.email, loginData.password);
      if (!user) {
        return res.status(401).send("Invalid email or password");
      }
  
      if (!user.isActive) {
        return res.status(401).send("Account is disabled");
      }
  
      const { password, ...userResponse } = user;
      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: expiresIn
      })
  
      const days = 90;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);
      res.cookie("token", token, {
        expires: expirationDate,
        httpOnly: true
      })
      //
      res.json({
        user: userResponse,
        token: token
      });
      //
      await storage.updateUserLastLogin(user.id)
    } catch (error) { 
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Login error:", error);
      res.status(500).send("Failed to login");
    }
  });

  // Authenication
  const blacklistToken = async (token: string) => {
    const decoded = jwt.decode(token) as JwtPayload
    if(decoded){
      if(decoded.exp){
        const expTimestamp = decoded.exp * 1000; // Convert to milliseconds

        const blacklistData = insertBlacklistSchema.parse({
          token: token,
          expiredAt: new Date(expTimestamp)
        })
        await storage.createBlacklist(blacklistData)
      }
    }
  };

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers['authorization']
      let token = authHeader && authHeader.split(' ')[1]

      if (!token && req.body.token) {
        token = req.body.token;
      }

      if (token) {
        await blacklistToken(token);
      }

      res.cookie("token", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
      })

      res.status(200).json({
        success: true,
        message: "Logout successful"
      })
    } catch (error) { 
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Forgot Password
  app.post('/api/auth/forgot-password', async (req, res) => {
    try{
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(email)
  
      // Check if the email exists in your user database
      if (user) {
        if (!user.isActive) {
          return res.status(401).json({ message: "Account is disabled" })
        }
        if(user.registrationType !== "authenication"){
          return res.status(401).json({ message: "Invalid email" });
        }
        // Generate a reset token
        const token = crypto.randomBytes(20).toString('hex');
        // Store the token with the user's email in a database or in-memory store
        await storage.updateUserResetToken(email, token)
        // Send the reset token to the user's email
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: parseInt(process.env.MAIL_PORT?.toString() ?? "465"),
          auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
          }
        });
  
        const resetPasswordLink = req.protocol + '://' + req.get('host') + `/reset-password/${token}`
  
        const mailOptions = {
          from: process.env.MAIL_USERNAME,
          to: email,
          subject: 'Password Reset',
          //text: `Click the following link to reset your password: ${resetPasswordLink}`,
          html: mailTemplate(user.firstName ?? "", resetPasswordLink)
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            res.status(500).json({message: 'Error sending email'});
          } else {
            console.log(`Email sent: ${info.response}`);
            res.status(200).json({message: 'Check your email for instructions on resetting your password'});
          }
        });
      } else {
        res.status(404).json({message: "Email not found!"});
      }
    }catch(error){
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Forgot pasword error:", error);
      res.status(500).json({ message: "Failed to forgot password" });
    }
  });

  // Change Password
  app.put('/api/auth/change-password', async (req: any, res: any) => {
    try{
      const { id, currentPassword, newPassword, confirmPassword } = req.body
  
      if(newPassword !== confirmPassword){
        return res.status(403).send('Password does not match!')
      }
  
      // Find the user with the given id and update their password
      // const user = await storage.getUserByResetToken(token)
      // if (user) {
      //   await storage.changePassword()
      //   res.status(200).send('Password updated successfully');
      // } else {
      //   res.status(404).send('User not found')
      // }

      const user = await storage.changePassword(id, currentPassword, newPassword)
      if (user) {
        res.status(200).send('Password updated successfully');
      } else {
        res.status(404).send('User not found')
      }
    }catch(error){
      console.error("Change pasword error:", error);
      res.status(500).send('Failed to change password')
    }
  });

  // Reset Password
  app.post('/api/auth/reset-password', async (req: any, res: any) => {
    try{
      const { token, password, confirmPassword } = req.body
  
      if(password !== confirmPassword){
        res.status(403).send('Password does not match!')
        return
      }
  
      // Find the user with the given token and update their password
      const user = await storage.getUserByResetToken(token)
      if (user) {
        await storage.updatePassword(user.id, password)
        //user.password = password;
        //delete user.resetToken; // Remove the reset token after the password is updated
        res.status(200).send('Password updated successfully');
      } else {
        res.status(404).send('Invalid or expired token')
      }
    }catch(error){
      console.error("Reset pasword error:", error);
      res.status(500).send('Failed to reset password')
    }
  });

  // Users API routes
  app.get("/api/users", async (req, res) => {
    try {
      const { role, isActive, search } = req.query;
      //let users = await storage.getAllUsers();
      const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
      const offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let users = await storage.getUsers(limit, offset);
      const usercount = await storage.getUserCount()
      
      // Apply filters
      if (role && role !== "all") {
        users = users.filter(user => user.role === role);
      }
      
      if (isActive !== undefined && isActive !== "all") {
        const activeFilter = isActive === 'true';
        users = users.filter(user => user.isActive === activeFilter);
      }
      
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        users = users.filter(user => 
          user.email.toLowerCase().includes(searchTerm) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchTerm))
        );
      }
      
      // Remove passwords from response
      const usersResponse = users.map(({ password, ...user }) => user);
      //res.json(usersResponse);
      res.json({
        users: usersResponse,
        total: role !== "all" || isActive !== "all" ? users.length : usercount
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      // Check if user exists
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // If email is being updated, check for uniqueness
      if (req.body.email && req.body.email !== existingUser.email) {
        const emailExists = await storage.getUserByEmail(req.body.email);
        if (emailExists) {
          return res.status(409).json({ message: "Email already exists" });
        }
      }
  
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const { password, ...userResponse } = updatedUser;
      res.json({
        message: "User updated successfully",
        user: userResponse
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Check if token is valid
  app.post("/api/verifyToken", (req: any, res: any, next) => {
    try {
      const { cookie } = req.headers
      if(cookie){
        const token = cookie.split("token=")[1].split(";")[0]
         jwt.verify(token, process.env.TOKEN_SECRET as string, (err: any, user: any) => {
          if (err) return res.status(403).json({message: "Forbidden"})
          next()
        })
      }
    } catch (error) {
      res.status(500).send("Failed to verify token")
    }
  })

  // app.get("/api/usercount", async (req, res) => {
  //   try{
  //     const usercount = await storage.getUserCount()
  //     res.status(200).json({total: usercount})
  //   }catch(error){
  //     console.error("Get user count error:", error);
  //     res.status(500).json({ message: "Failed to get user count" });
  //   }
  // })
  
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  app.patch("/api/users/:id/status", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
  
      const updatedUser = await storage.updateUser(userId, { isActive });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const { password, ...userResponse } = updatedUser;
      res.json({
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: userResponse
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Purchase History Route
  app.get("/api/purchase_history", async (req, res) => {
    try{
      const { payment_status, purchase_date, search } = req.query
      let limit = parseInt(req.query.limit?.toString() ?? "15") || 15
      let offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let purchaseHistoryResponse = await storage.getPurchaseHistory(limit, offset)
      let purchaseHistoryCount = await storage.getPurchaseHistoryCount()

      // Apply filters
      if (payment_status && payment_status !== "all") {
        purchaseHistoryResponse = purchaseHistoryResponse.filter(e => e.paymentStatus?.toLowerCase() === payment_status.toString().toLowerCase())
      }

      if(purchase_date && purchase_date !== "all"){
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()

        switch(purchase_date){
          case "today":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => new Date(f.purchaseDate).toLocaleDateString() === currentDate.toLocaleDateString())
            break
          case "yesterday":
            const yesterdayDate = new Date(currentDate)
            yesterdayDate.setDate(currentDate.getDate() - 1)
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => yesterdayDate.toLocaleDateString() === new Date(f.purchaseDate).toLocaleDateString())
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() > new Date(f.purchaseDate).getDate()
            //   && new Date(f.purchaseDate).getDate() === currentDate.getDate() - 1
            //   && currentYear === new Date(f.purchaseDate).getFullYear() && currentMonth === new Date(f.purchaseDate).getMonth())
            break
          case "last-week":
            // const startLastWeekDate = new Date(new Date().setDate(new Date().getDate() - 8))
            // const endLastWeekDate = new Date(new Date().setDate(startLastWeekDate.getDate() + 6))
            const nowLastWeek = new Date()
            const startLastWeekDate = new Date(nowLastWeek.setDate((nowLastWeek.getDate() - nowLastWeek.getDay()) - 6))
            const endLastWeekDate = new Date(nowLastWeek.setDate(startLastWeekDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLastWeekDate <= new Date(f.purchaseDate) 
              && endLastWeekDate >= new Date(f.purchaseDate))
            break
          case "last-month":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => (currentMonth + 1) > (new Date(f.purchaseDate).getMonth() + 1) 
              && ((currentMonth + 1) - 2) < (new Date(f.purchaseDate).getMonth() + 1) 
              && currentYear === new Date(f.purchaseDate).getFullYear())
            break    
          case "last-year":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getFullYear() > new Date(f.purchaseDate).getFullYear() 
              && new Date(f.purchaseDate).getFullYear() > currentDate.getFullYear() - 2)
            break  
          case "last-7-days":
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 7 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            const startDate = new Date(new Date().setDate(currentDate.getDate() - 7))
            const endDate = new Date(new Date().setDate(startDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startDate <= new Date(f.purchaseDate) 
              && endDate >= new Date(f.purchaseDate))
            break
          case "last-30-days":
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 30 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            const startLast30days = new Date(new Date().setDate(currentDate.getDate() - 30))
            const endLast30days = new Date(new Date().setDate(startLast30days.getDate() - 1))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLast30days <= new Date(f.purchaseDate) 
              && endLast30days >= new Date(f.purchaseDate))
            break
          case "last-90-days":
            const startLast90days = new Date(new Date().setDate(currentDate.getDate() - 90))
            const endLast90days = new Date(new Date().setDate(startLast90days.getDate() - 2))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLast90days <= new Date(f.purchaseDate) 
              && endLast90days >= new Date(f.purchaseDate))
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 90 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            break
          case "this-week":
            const now = new Date()
            const previousDay = now.getDay() - 1
            const startThisWeekDate = new Date(now.setDate(now.getDate() - previousDay))
            const endThisWeekDate = new Date(now.setDate(startThisWeekDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startThisWeekDate <= new Date(f.purchaseDate) 
              && endThisWeekDate >= new Date(f.purchaseDate))
            break  
          case "this-month":
            const nowThisMonth = new Date()
            const startThisMonthDate = new Date(nowThisMonth.getFullYear(), nowThisMonth.getMonth(), 1)
            const endThisMonthDate = new Date(nowThisMonth.getFullYear(), nowThisMonth.getMonth() + 1, 0)
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentYear === new Date(f.purchaseDate).getFullYear() 
              && currentMonth === new Date(f.purchaseDate).getMonth()
              && startThisMonthDate <= new Date(f.purchaseDate) 
              && endThisMonthDate >= new Date(f.purchaseDate))
            break
          case "this-year":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentYear === new Date(f.purchaseDate).getFullYear())
            break
          default:
            break          
        }
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        purchaseHistoryResponse = purchaseHistoryResponse.filter(e => 
          e.email.toLowerCase().includes(searchTerm)
        )
      }

      const sendReponse = {
        data: purchaseHistoryResponse,
        total: purchaseHistoryCount
      }
      return res.status(200).json(sendReponse)
    }catch(error){
      res.status(500).send("Failed to get purchase history")
    }
  })

  // POST /api/lessons/purchase
  app.post("/api/lessons/purchase", async (req, res) => {
    try {
      const validatedData = insertPurchaseHistorySchema.parse(req.body);
      const purchaseHistory = await storage.createPurchaseHistory(validatedData);
      res.status(201).json(purchaseHistory);
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Failed to create purchase!", errors: error });
    }
  })

  app.patch("/api/lessons/purchase/:purchaseId/payment-status", async (req, res) => {
    try {
      const { purchaseId } = req.params
      const { paymentStatus } = req.body
      const updatedPurchaseHistory = await storage.updatePurchaseHistory(purchaseId, { paymentStatus })
      if (!updatedPurchaseHistory) {
        return res.status(404).json({ message: "Purchase history not found" });
      }
      res.json({
        message: "Purchase history updated successfully",
        data: updatedPurchaseHistory
      });
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Failed to update purchase history!", errors: error });
    }
  })

  app.delete("/api/lessons/purchase/:purchaseId", async (req, res) => {
    try {
      const { purchaseId } = req.params
      const deleted = await storage.deletePurchaseHistoryByPurchaseId(purchaseId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Purchase history not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to purchase history" });
    }
  });

  // Proxy: Google Text to Speech
  app.get("/api/tts", async (req, res) => {
    try{
      const { q } = req.query
      const options = {
        protocol: 'https:',
        method: req.method,
        hostname: 'translate.google.com',
        path: `/translate_tts?ie=UTF-8&tl=km-Kh&client=tw-ob&q=${encodeURIComponent(q?.toString() ?? "")}`,
        //headers: req.headers
      }
      const proxyReq = request(options, (proxyRes) => {
        console.log(`STATUS: ${proxyRes.statusCode}`);

        // Set response headers from the proxy target
        //res.writeHead(proxyRes.statusCode!, proxyRes.headers)
        res.set('Content-Type', 'audio/mpeg')

        // Pipe the proxy response back to the original client response
        proxyRes.pipe(res)
      })

      proxyReq.on('error', (error) => {
        console.error(`Problem with proxy request: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error')
      })

      // Pipe the incoming request body to the outgoing proxy requ
      //req.pipe(proxyReq)
      proxyReq.end()
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Proxy error.", errors: error });
    }
  })

  //Clean up expired token From Blacklist in every 10 minutes
  const cleanExpiredTokens = async () => {
    const result = await storage.deleteBlacklist();
    if (result) {
      console.log(
        `Expired tokens cleaned from blacklist. Count: ${result}`
      );
    }
  }
  cron.schedule("*/10 * * * *", cleanExpiredTokens);

  //DELETE delete file
  app.delete("/api/unlinkFile/:filename", (req, res) => {
    try {
      const { filename } = req.params
      const { role } = req.body

      if(role === "admin"){
        fs.unlink(`uploads/${filename}`, (err) => {
          if(err) throw err
          console.log(`File deleted successfully: ${filename}`)
          res.send()
        })
      }
    } catch (error) {
      res.status(500).send("Failed to delete file")
    }
  })

  const httpServer = createServer(app);
  return httpServer;
}