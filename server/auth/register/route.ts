import { insertUserSchema, insertUserWithAuthServiceSchema } from "@shared/schema";
import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";
import { generateTokenPair } from "server/auth/token/token-service";
import { z } from "zod"

const router = Router()
const controller = new UserController()

router.post("/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await controller.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
      }
  
      const user = await controller.createUser(userData);
      const { password, resetToken, registrationType, ...userResponse } = user;
      // Use centralised token service — consistent expiry across all auth paths
      const { token, refreshToken } = generateTokenPair({ id: userResponse.id, email: userResponse.email, role: userResponse.role })
  
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

router.post("/register-auth-service", async (req, res) => {
    try {
      const userData = insertUserWithAuthServiceSchema.parse(req.body);

      const existingUser = await controller.getUserByEmail(userData.email);
      if (existingUser) {
        // Google/Apple already verify the email before handing us the token, so it's
        // safe to log into any existing account on email match — same behavior as
        // the Apple verify-apple-id-token route (server/routes.ts) already uses.
        const { password, resetToken, registrationType, ...userResponse } = existingUser;
        const { token, refreshToken } = generateTokenPair({ id: userResponse.id, email: userResponse.email, role: userResponse.role })
        return res.status(200).json({
          user: userResponse,
          token: token,
          refreshToken: refreshToken
        });
      }

      const user = await controller.createUserWithAuthService(userData);
      const { password, resetToken, registrationType, ...userResponse } = user;
      const { token, refreshToken } = generateTokenPair({ id: userResponse.id, email: userResponse.email, role: userResponse.role })
  
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

export default router;