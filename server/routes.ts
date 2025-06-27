import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { forgotPasswordSchema, loginSchema, insertUserSchema,
   insertLessonSchema, updateLessonSchema, 
   insertQuizSchema, updateQuizSchema, 
   insertBlacklistSchema, 
   insertPurchaseHistorySchema} from "@shared/schema";
import { z } from "zod";
import apiRoutes from "./api";
import paypalRoutes from "./paypal/orders"
import nodemailer from "nodemailer";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import cors from "cors";
import { mailTemplate } from "./mail/mail_template";


export async function registerRoutes(app: Express): Promise<Server> {

  const { TOKEN_SECRET } = process.env
  const expiresIn = app.get("env") === "development" ? "1800s" : "90d"

  // Middleware to set CORS headers for all routes
  // app.use('*', (req, res, next) => {
  //     res.setHeader('Access-Control-Allow-Origin', '*'); // Allow specific origin
  //     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  //     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  //     next();
  // });
  app.use(cors({
    origin: "*"
  }))

  // Mount public API routes
  app.use("/api/v1", apiRoutes);
  app.use("/api", paypalRoutes);

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
      
      if (level && level !== "all") {
        lessons = lessons.filter(lesson => lesson.level === level);
      }
      
      if (type && type !== "all") {
        lessons = lessons.filter(lesson => lesson.image === type);
      }
      
      if (status && status !== "all") {
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
      
      const { password, ...userResponse } = user;
      
      const token = jwt.sign(userResponse, TOKEN_SECRET as string, {
        expiresIn: expiresIn
      })
  
      // const days = 90;
      // const expirationDate = new Date();
      // expirationDate.setDate(expirationDate.getDate() + days);
      // res.cookie("token", token, {
      //   expires: expirationDate,
      //   httpOnly: true
      // })
  
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
        message: "Login successful",
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

  app.get("/api/auth/logout", async (req, res) => {
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
        // Generate a reset token
        const token = crypto.randomBytes(20).toString('hex');
        // Store the token with the user's email in a database or in-memory store
        //user.resetToken = token;
        await storage.updateUserResetToken(email, token)
        // Send the reset token to the user's email
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: 2525,
          auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
          },
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

  // app.get('/reset-password/:token', async (req, res) => {
  //   const { token } = req.params;
  //   // Check if the token exists and is still valid
  //   const user = await storage.getUserByResetToken(token)
  //   if (!user) {
  //     res.status(404).send('Invalid or expired token');
  //   } else {
  //     res.sendStatus(200)
  //   }
  // });

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
        //user.resetToken = null // Remove the reset token after the password is updated
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
      let limit = parseInt(req.query.limit?.toString() ?? "10") || 10
      let offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let users = await storage.getUsers(limit, offset);
      let usercount = await storage.getUserCount()
      
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
      const { payment_status, search } = req.query
      let limit = parseInt(req.query.limit?.toString() ?? "10") || 10
      let offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let purchaseHistoryResponse = await storage.getPurchaseHistory(limit, offset)
      let purchaseHistoryCount = await storage.getPurchaseHistoryCount()

      // Apply filters
      if (payment_status && payment_status !== "all") {
        purchaseHistoryResponse = purchaseHistoryResponse.filter(e => e.paymentStatus?.toLowerCase() === payment_status.toString().toLowerCase());
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
      console.log(error)
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

  const httpServer = createServer(app);
  return httpServer;
}
