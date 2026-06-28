import { Router } from "express"
import { SubscriptionController } from "../controller/controller"

const router = Router()
const controller = new SubscriptionController()

router.get("/", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const limit = parseInt(req.query.limit as string) || 15
    const offset = parseInt(req.query.offset as string) || 0
    const status = (req.query.status as string) || "all"
    const platform = (req.query.platform as string) || "all"

    const result = await controller.getAllSubscriptions(limit, offset, { status, platform })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subscriptions" })
  }
})

export default router
