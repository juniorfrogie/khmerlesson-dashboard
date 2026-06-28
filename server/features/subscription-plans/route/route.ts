import { Router } from "express"
import { insertSubscriptionPlanSchema, updateSubscriptionPlanSchema } from "@shared/schema"
import { SubscriptionPlanController } from "../controller/controller"
import { ZodError } from "zod"

const router = Router()
const controller = new SubscriptionPlanController()

router.get("/", async (_req, res) => {
  try {
    const plans = await controller.getAllPlans()
    res.json({ data: plans, total: plans.length })
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subscription plans" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const plans = await controller.getAllPlans()
    const plan = plans.find(p => p.id === id)
    if (!plan) return res.status(404).json({ message: "Plan not found" })
    res.json(plan)
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plan" })
  }
})

router.post("/", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const data = insertSubscriptionPlanSchema.parse(req.body)
    const plan = await controller.createPlan(data)
    res.status(201).json(plan)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors })
    }
    res.status(500).json({ message: "Failed to create plan" })
  }
})

router.patch("/:id", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const id = parseInt(req.params.id)
    const data = updateSubscriptionPlanSchema.parse(req.body)
    const plan = await controller.updatePlan(id, data)
    if (!plan) return res.status(404).json({ message: "Plan not found" })
    res.json(plan)
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors })
    }
    res.status(500).json({ message: "Failed to update plan" })
  }
})

router.delete("/:id", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const id = parseInt(req.params.id)
    const deleted = await controller.deletePlan(id)
    if (!deleted) return res.status(404).json({ message: "Plan not found" })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ message: "Failed to delete plan" })
  }
})

router.get("/:id/courses", async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const courses = await controller.getCoursesForPlan(id)
    res.json({ data: courses, total: courses.length })
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plan courses" })
  }
})

router.put("/:id/courses", async (req: any, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." })
    }
    const id = parseInt(req.params.id)
    const { mainLessonIds } = req.body
    if (!Array.isArray(mainLessonIds)) {
      return res.status(400).json({ message: "mainLessonIds must be an array" })
    }
    await controller.setCoursesForPlan(id, mainLessonIds)
    res.json({ message: "Courses updated" })
  } catch (error) {
    res.status(500).json({ message: "Failed to update plan courses" })
  }
})

export default router
