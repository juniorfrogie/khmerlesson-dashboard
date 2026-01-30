import type { Express } from "express";
import express from "express"
import { createServer, type Server } from "http";
import { request } from "https";
import { storage } from "./storage";
import { forgotPasswordSchema, loginSchema, insertUserSchema,
   insertBlacklistSchema,
   insertUserWithAuthServiceSchema} from "@shared/schema";
import { z } from "zod";
import apiRoutes from "./api";
import paypalRoutes from "./paypal/orders"
import mainLessonRoutes from "./routes/main-lessons/route"
import lessonRoutes from "./routes/lessons/route"
import lessonTypeRoutes from "./routes/lesson-type/route"
import quizRoutes from "./routes/quizzes/route"
import userRoutes from "./routes/users/route"
import purchaseHistoryRoutes from "./routes/purchase-history/route"
import exportRoutes from "./routes/export/route"
import importRoutes from "./routes/import/route"
import fileUploadRoute from "./file-upload/file_upload"
import nodemailer from "nodemailer";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import cors from "cors";
import { mailTemplate } from "./mail/mail_template";
import cron from "node-cron"
import path from "path";
import fs from "fs";
import appleAuthRoute from "./auth/apple/route"
import cookieParser from "cookie-parser"
import { tokenGenerator } from "./utils/token-generator";

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

const setCookies = (res: any, token: string, refreshToken: string) => {
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

  const authenticateToken = async (req: any, res: any, next: any) => {
    
    const authHeader = req.headers['authorization']
    const token = req.cookies.token || authHeader && authHeader.split(' ')[1]
    const refreshToken = req.cookies.refreshToken || authHeader && authHeader.split(' ')[1]
  
    //if (!token) return res.status(401).json({message: "You are not logged in! Please log in to get access."})

    console.log(process.env.APPLE_STORE_AUTH)

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
  app.use("/api/auth", appleAuthRoute);

  // Apply authentication
  app.use("/api/v1", authenticateToken, apiRoutes);
  app.use("/api/upload", authenticateToken, fileUploadRoute)

  //app.disable('etag');
  //const publicDir = path.join(import.meta.dirname, '..');
  const uploadDir = path.join(import.meta.dirname, '.', '../uploads');
  app.use("/uploads", express.static(uploadDir))

  const storagesDir = path.join(import.meta.dirname, '.', '../storages');
  app.use("/storages", express.static(storagesDir))

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
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
      
      // const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
      //   expiresIn: expiresIn
      // })
      const { token, refreshToken } = tokenGenerator(userResponse)
  
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token: token,
        refreshToken: refreshToken
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
        // const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        //   expiresIn: expiresIn
        // })
        const { token, refreshToken } = tokenGenerator(userResponse)
        return res.status(200).json({
          user: userResponse,
          token: token,
          refreshToken: refreshToken
        });
      }

      const user = await storage.createUserWithAuthService(userData);
      
      const { password, resetToken, registrationType, ...userResponse } = user;
      
      // const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
      //   expiresIn: expiresIn
      // })
      const { token, refreshToken } = tokenGenerator(userResponse)
  
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token: token,
        refreshToken: refreshToken
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
      const { token, refreshToken } = tokenGenerator(userResponse)
  
      // const days = 90;
      // const expirationDate = new Date();
      // expirationDate.setDate(expirationDate.getDate() + days);
      // res.cookie("token", token, {
      //   expires: expirationDate,
      //   httpOnly: true,
      //   sameSite: "strict",
      //   secure: true,
      //   maxAge: 1000 * 60 * 60 * 24 * 7
      // })
      //
      res.json({
        message: "Login successful",
        user: userResponse,
        token: token,
        refreshToken: refreshToken
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
      // const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
      //   expiresIn: expiresIn
      // })

      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: NODE_ENV === "development" ? "1m" : "1d"
      })

      const refreshToken = jwt.sign(userResponse, REFRESH_TOKEN_SECRET as string, {
        expiresIn: NODE_ENV === "development" ? "5m" : "7d"
      })

      setCookies(res, token, refreshToken)
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

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      const authHeader = req.headers['authorization']
      let token = req.cookies.token || authHeader && authHeader.split(' ')[1]

      if (!token && req.body.token) {
        token = req.body.token;
      }

      if (token) {
        await blacklistToken(token);
      }

      res.clearCookie("token", { path: "/" })
      res.clearCookie("refreshToken", { path: "/" })

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
  app.put('/api/auth/change-password', authenticateToken, async (req: any, res: any) => {
    try{
      const { id, currentPassword, newPassword, confirmPassword } = req.body
  
      if(newPassword !== confirmPassword){
        return res.status(403).json({message: 'Password does not match!'})
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
        res.status(200).json({message: 'Password updated successfully'});
      } else {
        res.status(404).json({message: 'User not found'})
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

  app.post("/api/auth/refresh-token", (req, res) => {
    try{
      const body = req.body;
      const { refreshToken } = body;
      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as string, (err: any, user: any) => {
        if(err) return res.status(401).json({message: "Invalid token or expired."})
        const payload = { id: user.id, email: user.email }
        const result = tokenGenerator(payload)
        return res.status(200).json({
          token: result.token,
          refreshToken: result.refreshToken
        })
      })
    }catch(error){
      console.error("Failed to refreshing token:", error);
      if(error instanceof jwt.TokenExpiredError){
        return res.status(401).json({message: "Invalid token or expired."})
      }
      res.status(500).send("Failed to refreshing token");
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

  app.delete("/api/purchase-history/:purchaseId", async (req, res) => {
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