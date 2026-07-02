import type { Express } from "express";
import express from "express"
import { createServer, type Server } from "http";
import { request } from "https";
import { storage } from "./storage";
import apiRoutes from "./api";
import mainLessonRoutes from "./features/main-lessons/route/route"
import lessonRoutes from "./features/lessons/route/route"
import lessonTypeRoutes from "./features/lesson-types/route/route"
import quizRoutes from "./features/quizzes/route/route"
import userRoutes from "./features/users/route/route"
import subscriptionRoutes from "./features/subscriptions/route/route"
import subscriptionPlanRoutes from "./features/subscription-plans/route/route"
import exportRoutes from "./features/export/route/route"
import importRoutes from "./features/import/route/route"
import debugLogRoutes from "./features/debug-logs/route/route"
import fileUploadRoute from "./file-upload/file_upload"
import { JwtPayload } from "jsonwebtoken";
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
import { verifyAppleToken } from "./services/auth/apple/service";
import { UserController } from "./features/users/controller/controller";
// Centralised auth middleware (fixes the refreshToken extraction bug)
import { authenticateToken } from "./auth/middleware/authenticate";
// Centralised token service (single source of truth for expiry + cookie helpers)
export { setToken, setCookieTokens as setCookies } from "./auth/token/token-service";
import { generateTokenPair } from "./auth/token/token-service";
import googleAuthRoutes from "./auth/google/route";


export async function registerRoutes(app: Express): Promise<Server> {
  const { NODE_ENV } = process.env

  // authenticateToken is now imported from ./auth/middleware/authenticate
  // The old inline version had a critical bug: refreshToken was reading
  // req.cookies.token (the access token) instead of req.cookies.refreshToken.

  //const expiresIn = NODE_ENV === "development" ? "1800s" : "90d"
  //const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`

  app.use(cookieParser())

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Fix: added `credentials: true` so cookies are sent cross-origin (dashboard).
  // Fix: removed wildcard origin in dev — wildcard + credentials is rejected by browsers.
  // Fix: explicit allowed origins for both dev and prod.
  app.use(cors({
    origin: (origin, callback) => {
      const allowed =
        NODE_ENV === "development"
          ? ["http://localhost:3000", "http://localhost:5001", "http://localhost:5000", "http://localhost:8081",
            ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : [])]
          : ["https://cambodianlesson.netlify.app", "https://khmerlessons.app"]
      // undefined origin = same-origin or non-browser (curl, Postman, mobile)
      if (!origin || (allowed as (string | undefined)[]).includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed`))
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Correlation-ID"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }))

  // Mount public API routes
  app.use("/api/auth",
    loginRoutes,
    registerationRoutes,
    forgotPasswordRoutes,
    resetPasswordRoutes,
    refreshTokenRoutes,
    googleAuthRoutes
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

  //** Subscriptions Router */
  app.use("/api/subscriptions", authenticateToken, subscriptionRoutes)

  //** Subscription Plans Router */
  app.use("/api/subscription-plans", authenticateToken, subscriptionPlanRoutes)

  //** Export CRUD Router */
  app.use("/api/export", authenticateToken, exportRoutes)

  //** Import CRUD Router */
  app.use("/api/import", authenticateToken, importRoutes)

  //** Debug Logs Router (admin-only, read-only) */
  app.use("/api/debug-logs", authenticateToken, debugLogRoutes)

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
    try {
      if (!req.user?.id) {
        return res.status(400).json({ message: "Invalid user." })
      }
      const id = req.user.id as number
      const user = await new UserController().getUserById(id)
      if (!user) {
        return res.status(404).json({ message: "User not found." })
      }
      const { password, resetToken, registrationType, ...safeUser } = user
      return res.status(200).json(safeUser)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Failed to get me." })
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
    const { idToken, firstName, lastName } = req.body
    const verifiedPayload = await verifyAppleToken(idToken)

    if (!verifiedPayload) {
      return res.status(401).json({ success: false, message: 'Apple token verification failed' })
    }

    try {
      const payload = verifiedPayload as JwtPayload
      const email: string | undefined = payload["email"]
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email not found in Apple token' })
      }

      const userController = new UserController()
      let user = await userController.getUserByEmail(email)

      if (!user) {
        user = await userController.createUserWithAuthService({
          email,
          firstName: firstName ?? "",
          lastName: lastName ?? "",
          registrationType: "apple_service",
        })
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account is disabled' })
      }

      const { token, refreshToken } = generateTokenPair({ id: user.id, email: user.email, role: user.role })
      await userController.updateUserLastLogin(user.id)

      const { password, resetToken, registrationType, ...userResponse } = user
      const responseBody = {
        success: true,
        message: 'Apple sign-in successful',
        user: userResponse,
        token,
        refreshToken,
      }
      console.log("[Apple Sign-In] Response:\n", JSON.stringify(responseBody, null, 2))
      return res.status(200).json(responseBody)
    } catch (error) {
      console.error('Apple sign-in error:', error)
      return res.status(500).json({ success: false, message: 'Apple sign-in failed' })
    }
  })

  // Proxy: Google Text to Speech
  app.get("/api/tts", async (req, res) => {
    try {
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
    try {
      const result = await storage.deleteBlacklist();
      if (result) {
        console.log(
          `Expired tokens cleaned from blacklist. Count: ${result}`
        );
      }
    } catch (err) {
      console.error("Error during schedule cron-job:", err)
    }
  }
  cron.schedule("*/10 * * * *", cleanExpiredTokens);

  //DELETE delete file
  app.delete("/api/unlinkFile/:filename", authenticateToken, (req: any, res) => {
    try {
      const { filename } = req.params
      // Fix: use req.user.role (set by authenticateToken) instead of req.body.role.
      // Previously an attacker could delete any file by spoofing role: "admin" in the body.
      const role = req.user?.role

      if (role === "admin") {
        fs.unlink(`uploads/${filename}`, (err) => {
          if (err) throw err
          console.log(`File deleted successfully: ${filename}`)
          res.send()
        })
      } else {
        res.status(403).json({ message: "Forbidden: admin role required" })
      }
    } catch (error) {
      res.status(500).send("Failed to delete file")
    }
  })

  const httpServer = createServer(app);
  return httpServer;
}