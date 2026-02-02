import { loginSchema } from "@shared/schema";
import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";
import { setCookies } from "server/routes";
import { tokenGenerator } from "server/utils/token-generator";
import { z } from "zod"
import jwt from "jsonwebtoken"

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
    const { NODE_ENV, TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env
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