import type { Request, Response, NextFunction } from "express";

/** Must run after authenticateToken. Rejects anyone whose JWT role isn't "admin". */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required." });
    return;
  }
  next();
};
