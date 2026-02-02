import { Router } from "express";
import { blacklistToken } from "server/utils/blacklist-token";

const router = Router()

router.post("/", async (req, res) => {
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

export default router;