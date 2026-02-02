import { Router } from "express";
import { z } from "zod"
import { UserController } from "../controller/controller";

const router = Router()
const controller = new UserController()

router.get("/", async (req, res) => {
    try {
      const { role, isActive, search } = req.query;
      const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
      const offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let users = await controller.getUsersPageData(limit, offset);
      const usercount = await controller.getUserCount()
      
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
      res.json({
        users: usersResponse,
        total: role !== "all" || isActive !== "all" ? users.length : usercount
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  router.get("/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      const user = await controller.getUserById(userId);
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
  
  router.put("/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      // Check if user exists
      const existingUser = await controller.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // If email is being updated, check for uniqueness
      if (req.body.email && req.body.email !== existingUser.email) {
        const emailExists = await controller.getUserByEmail(req.body.email);
        if (emailExists) {
          return res.status(409).json({ message: "Email already exists" });
        }
      }
  
      const updatedUser = await controller.updateUser(userId, req.body);
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
  
  router.delete("/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({success: false, message: "Invalid user ID" });
      }
  
      const success = await controller.deleteUser(userId);
      if (!success) {
        return res.status(404).json({success: success, message: "User not found" });
      }
  
      res.json({success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({success: false, message: "Failed to delete user" });
    }
  });
  
  router.patch("/:id/status", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
  
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
  
      const updatedUser = await controller.updateUser(userId, { isActive });
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

export default router;