import { loginSchema } from "@shared/schema";
import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";
import { setCookieTokens } from "server/auth/token/token-service";
import { generateTokenPair } from "server/auth/token/token-service";
import { z } from "zod"


const router = Router()
const controller = new UserController()

  router.post("/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await controller.verifyPassword(loginData.email, loginData.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
  
      const { password, resetToken, registrationType, ...userResponse } = user;
      // Use centralised token service — ensures consistent expiry across all login paths
      const { token, refreshToken } = generateTokenPair({ id: userResponse.id, email: userResponse.email, role: userResponse.role })

      res.json({
        message: "Login successful",
        user: userResponse,
        token: token,
        refreshToken: refreshToken
      });
      //
      await controller.updateUserLastLogin(user.id)
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
router.post("/admin", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await controller.loginByAdmin(loginData.email, loginData.password);
      if (!user) {
        return res.status(401).send("Invalid email or password");
      }
  
      if (!user.isActive) {
        return res.status(401).send("Account is disabled");
      }
  
      const { password, ...userResponse } = user;
      // Use centralised token service — ensures consistent expiry
      const { token, refreshToken } = generateTokenPair({ id: userResponse.id, email: userResponse.email, role: userResponse.role })

      setCookieTokens(res, token, refreshToken)
      res.json({
        user: userResponse,
        token: token
      });
      await controller.updateUserLastLogin(user.id)
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

export default router;