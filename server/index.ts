import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { insertBlacklistSchema, insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotEnv from "dotenv"
 
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
dotEnv.config()

const { TOKEN_SECRET } = process.env
const expiresIn = app.get("env") === "development" ? "1800s" : "90d"

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

    const days = 90;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    res.cookie("token", token, {
      expires: expirationDate,
      httpOnly: true
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

// Users API routes
app.get("/api/users", async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    let users = await storage.getAllUsers();
    
    // Apply filters
    if (role) {
      users = users.filter(user => user.role === role);
    }
    
    if (isActive !== undefined) {
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
    res.json(usersResponse);
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes BEFORE setting up Vite to ensure they take precedence
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: false,
  }, () => {
    log(`serving on port ${port}`);
  });
})();