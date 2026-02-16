import type { Express } from "express";
import express from "express"
import { createServer, type Server } from "http";
import { request } from "https";
import { storage } from "./storage";
import apiRoutes from "./api";
import paypalRoutes from "./services/paypal/service"
import mainLessonRoutes from "./features/main-lessons/route/route"
import lessonRoutes from "./features/lessons/route/route"
import lessonTypeRoutes from "./features/lesson-types/route/route"
import quizRoutes from "./features/quizzes/route/route"
import userRoutes from "./features/users/route/route"
import purchaseHistoryRoutes from "./features/purchase-history/route/route"
import exportRoutes from "./features/export/route/route"
import importRoutes from "./features/import/route/route"
import fileUploadRoute from "./file-upload/file_upload"
import jwt, { JwtPayload } from "jsonwebtoken";
import cors from "cors";
import cron from "node-cron"
import path from "path";
import fs from "fs";
import loginRoutes from "./auth/login/route"
import registerationRoutes from "./auth/register/route"
import logoutRoutes from "./auth/logout/route"
import forgotPasswordRoutes from "./auth/forgot-password/route"
import changePasswordRoutes from "./auth/change-password/route"
import resetPasswordRoutes from "./auth/reset-password/route"
import refreshTokenRoutes from "./auth/refresh-token/route"
import cookieParser from "cookie-parser"
import { PurchaseHistoryController } from "./features/purchase-history/controller/controller";
import { verifyAppleToken } from "./services/auth/apple/service";
import { UserController } from "./features/users/controller/controller";

export const setToken = async (res: any, user: any) => {
  const { NODE_ENV, 
    TOKEN_SECRET, 
    REFRESH_TOKEN_SECRET
  } = process.env
  const payload = { id: user.id, email: user.email }
  const newToken = jwt.sign(payload, TOKEN_SECRET as string, {
    expiresIn: NODE_ENV === "development" ? "1m" : "1d"
  })
  const newRefreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET as string, {
    expiresIn: NODE_ENV === "development" ? "5m" : "7d"
  })
  setCookies(res, newToken, newRefreshToken)
}

export const setCookies = (res: any, token: string, refreshToken: string) => {
  const { NODE_ENV } = process.env
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production",
    maxAge: NODE_ENV === "development" ? 1000 * 60 * 1 : 1000 * 60 * 60 * 24 * 1
  })

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV === "production",
    maxAge: NODE_ENV === "development" ? 1000 * 60 * 5 : 1000 * 60 * 60 * 24 * 7
  })
}

export async function registerRoutes(app: Express): Promise<Server> {
  const { NODE_ENV,
    TOKEN_SECRET, 
    REFRESH_TOKEN_SECRET
  } = process.env
  
  const purchaseHistoryController = new PurchaseHistoryController()

  const authenticateToken = async (req: any, res: any, next: any) => {
    
    const authHeader = req.headers['authorization']
    const token = req.cookies.token || authHeader && authHeader.split(' ')[1]
    const refreshToken = req.cookies.refreshToken || authHeader && authHeader.split(' ')[1]
  
    //if (!token) return res.status(401).json({message: "You are not logged in! Please log in to get access."})

    if(!token && !refreshToken){
      //return res.redirect("/")

      const url = req.originalUrl
      if(url.includes("/api/v1/main-lessons") || url.includes("/api/v1/lessons")){
        next()
        return
      }
      return res.status(401).json({message: "You are not logged in! Please log in to get access."})
    }
    if(!token && refreshToken){
      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as string, async (err: any, user: any) => {
        if(err) return res.status(403).json({message: "Forbidden"})
        setToken(res, user)  
        req.user = user
        next()
      })
      return
    }
  
    const isBlacklisted = await storage.getBlacklist(token)
    if (isBlacklisted) {
      return res.status(401).json({
        message: "Token is no longer valid. Please log in again."
      })
    }
  
    jwt.verify(token, TOKEN_SECRET as string, async (err: any, user: any) => {
      if(err){
        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as string, async (err: any, user: any) => {
          if(err) return res.status(403).json({message: "Forbidden"})
          setToken(res, user)  
          req.user = user
          next()
        })
        return
      }

      req.user = user
      next()
    })
  }

  //const expiresIn = NODE_ENV === "development" ? "1800s" : "90d"
  //const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`

  app.use(cookieParser())

  // Middleware to set CORS headers for all routes
  app.use(cors({
    origin: NODE_ENV === "development" ? "*" : "https://cambodianlesson.netlify.app"
  }))

  // Mount public API routes
  app.use("/api", paypalRoutes);
  app.use("/api/auth", 
    loginRoutes, 
    registerationRoutes, 
    forgotPasswordRoutes, 
    resetPasswordRoutes,
    refreshTokenRoutes
  )

  //app.disable('etag');
  //const publicDir = path.join(import.meta.dirname, '..');
  const uploadDir = path.join(import.meta.dirname, '.', '../uploads');
  app.use("/uploads", express.static(uploadDir))

  const storagesDir = path.join(import.meta.dirname, '.', '../storages');
  app.use("/storages", express.static(storagesDir))

  // Protected Routes
  app.use("/api/v1", authenticateToken, apiRoutes);
  app.use("/api/auth/logout", authenticateToken, logoutRoutes)
  app.use("/api/auth/change-password", authenticateToken, changePasswordRoutes)
  app.use("/api/upload", authenticateToken, fileUploadRoute)

  //**  Main Lessons CRUD Router */
  app.use("/api/main-lessons", authenticateToken, mainLessonRoutes)

  //** Lessons CRUD Router */
  app.use("/api/lessons", authenticateToken, lessonRoutes)

  //** Lesson Type CRUD Router */
  app.use("/api/lesson-type", authenticateToken, lessonTypeRoutes)

  //** Quizzes CRUD Router */
  app.use("/api/quizzes", authenticateToken, quizRoutes)

  //** Users CRUD Router */
  app.use("/api/users", authenticateToken, userRoutes)

  //** Purchase History CRUD Router */
  app.use("/api/purchase-history", authenticateToken, purchaseHistoryRoutes)

  //** Export CRUD Router */
  app.use("/api/export", authenticateToken, exportRoutes)

  //** Import CRUD Router */
  app.use("/api/import", authenticateToken, importRoutes)

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/me", authenticateToken, async (req: any, res) => {
    try{
      if(!req.user?.id) {
        return res.status(400).json({message: "Invalid user."})
      }
      const id = req.user.id as number
      const user = await new UserController().getUserById(id)
      if(!user){
        return res.status(404).json({message: "User not found."})
      }
      const { password, resetToken, registrationType, ...safeUser } = user
      return res.status(200).json(safeUser)
    }catch(error){
      console.error(error)
      res.status(500).json({message: "Failed to get me."})
    }
  })

  // Privacy Policy
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

  app.post("/api/auth/verify-apple-id-token", async (req, res) => {
    const { idToken } = req.body
    const verifedPayload = await verifyAppleToken(idToken)
      
    if (verifedPayload) {
      // Token is valid, proceed with user authentication or registration
      const payload = (verifedPayload as JwtPayload)
      const user = {
          email: payload["email"]
      }
      res.status(200).json({success: true, message: 'Apple token verified successfully', user: user})
    } else {
      // Token is invalid
      res.status(401).json({success: false, message: 'Apple token verification failed'})
    }
  })

  // POST /api/lessons/purchase
  // app.post("/api/lessons/purchase", async (req, res) => {
  //   try {
  //     const validatedData = insertPurchaseHistorySchema.parse(req.body);
  //     const purchaseHistory = await storage.createPurchaseHistory(validatedData);
  //     res.status(201).json(purchaseHistory);
  //   } catch (error) {
  //     console.log(error)
  //     res.status(500).json({ message: "Failed to create purchase!", errors: error });
  //   }
  // })

  app.patch("/api/purchase-history/:purchaseId/payment-status", async (req, res) => {
    try {
      const { purchaseId } = req.params
      const { paymentStatus } = req.body
      const updatedPurchaseHistory = await purchaseHistoryController.updatePurchaseHistory(purchaseId, { paymentStatus })
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

  app.delete("/api/purchase-history/:purchaseId", async (req, res) => {
    try {
      const { purchaseId } = req.params
      const deleted = await purchaseHistoryController.deletePurchaseHistoryByPurchaseId(purchaseId);
      
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
    try{
      const result = await storage.deleteBlacklist();
      if (result) {
        console.log(
          `Expired tokens cleaned from blacklist. Count: ${result}`
        );
      }
    }catch(err){
      console.error("Error during schedule cron-job:", err)
    }
  }
  cron.schedule("*/10 * * * *", cleanExpiredTokens);

  //DELETE delete file
  app.delete("/api/unlinkFile/:filename", authenticateToken, (req, res) => {
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