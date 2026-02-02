import { insertUserSchema, insertUserWithAuthServiceSchema } from "@shared/schema";
import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";
import { tokenGenerator } from "server/utils/token-generator";
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

router.post("/register-auth-service", async (req, res) => {
    try {
      const userData = insertUserWithAuthServiceSchema.parse(req.body);

      const existingUser = await controller.getUserByEmail(userData.email);
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

      const user = await controller.createUserWithAuthService(userData);
      
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

export default router;