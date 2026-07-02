import { Router } from "express"
import { DebugLogController } from "../controller/controller"

const router = Router()
const controller = new DebugLogController()

router.get("/", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const limit = parseInt(req.query.limit as string) || 25
    const offset = parseInt(req.query.offset as string) || 0
    const traceId = (req.query.traceId as string) || undefined
    const level = (req.query.level as string) || "all"
    const source = (req.query.source as string) || "all"

    const result = await controller.getAllDebugLogs(limit, offset, { traceId, level, source })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch debug logs" })
  }
})

export default router
