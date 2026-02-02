import { insertBlacklistSchema } from "@shared/schema";
import jwt, { JwtPayload } from "jsonwebtoken"
import { storage } from "server/storage";

export const blacklistToken = async (token: string) => {
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