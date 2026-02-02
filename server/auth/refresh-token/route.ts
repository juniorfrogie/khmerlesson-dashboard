import { Router } from "express";
import jwt from "jsonwebtoken"
import { tokenGenerator } from "server/utils/token-generator";

const router = Router()

router.post("/refresh-token", (req, res) => {
    const { REFRESH_TOKEN_SECRET } = process.env
    try{
      const body = req.body;
      const { refreshToken } = body;
      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as string, (err: any, user: any) => {
        if(err) return res.status(401).json({message: "Invalid token or expired."})
        const payload = { id: user.id, email: user.email }
        const result = tokenGenerator(payload)
        return res.status(200).json({
          token: result.token,
          refreshToken: result.refreshToken
        })
      })
    }catch(error){
      console.error("Failed to refreshing token:", error);
      if(error instanceof jwt.TokenExpiredError){
        return res.status(401).json({message: "Invalid token or expired."})
      }
      res.status(500).send("Failed to refreshing token");
    }
})

export default router;