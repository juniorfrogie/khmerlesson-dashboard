import { Router } from "express";
import jwt from "jsonwebtoken"
import { generateTokenPair } from "server/auth/token/token-service";

const router = Router()

router.post("/refresh-token", (req, res) => {
    const { REFRESH_TOKEN_SECRET } = process.env
    try{
      const body = req.body;
      const { refreshToken } = body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "refreshToken is required." })
      }

      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as string, (err: any, decoded: any) => {
        if(err) {
          // Distinguish expired vs invalid for better client UX
          if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Refresh token expired. Please log in again.", code: "REFRESH_EXPIRED" })
          }
          return res.status(401).json({ message: "Invalid refresh token.", code: "INVALID_TOKEN" })
        }
        // Only embed minimal payload into the new tokens
        const payload = { id: decoded.id, email: decoded.email }
        const result = generateTokenPair(payload)
        // `accessToken` is the field the mobile client reads
        // (khmerlesson-app authStore.refreshTokens). `token` is kept for
        // any consumer built against the login/register routes' shape —
        // both carry the same newly issued access token. Every shipped app
        // build read `accessToken` and got undefined here, which bricked
        // the session ~1 day after login once the access token expired.
        return res.status(200).json({
          token: result.token,
          accessToken: result.token,
          refreshToken: result.refreshToken
        })
      })
    }catch(error){
      console.error("Failed to refresh token:", error);
      res.status(500).send("Failed to refresh token");
    }
})

export default router;