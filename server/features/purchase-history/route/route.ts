import { Router } from "express";
import { PurchaseHistoryController, PurchaseFilters } from "../controller/controller";

const router = Router()
const controller = new PurchaseHistoryController()

function resolveDateRange(filter: string): { from: string; to: string } | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const ms = (n: number) => n * 24 * 60 * 60 * 1000

    switch (filter) {
        case "today":
            return { from: today.toISOString(), to: new Date(today.getTime() + ms(1)).toISOString() }
        case "yesterday": {
            const start = new Date(today.getTime() - ms(1))
            return { from: start.toISOString(), to: today.toISOString() }
        }
        case "last-7-days":
            return { from: new Date(today.getTime() - ms(7)).toISOString(), to: new Date(today.getTime() + ms(1)).toISOString() }
        case "last-30-days":
            return { from: new Date(today.getTime() - ms(30)).toISOString(), to: new Date(today.getTime() + ms(1)).toISOString() }
        case "last-90-days":
            return { from: new Date(today.getTime() - ms(90)).toISOString(), to: new Date(today.getTime() + ms(1)).toISOString() }
        case "this-week": {
            const start = new Date(today)
            start.setDate(today.getDate() - today.getDay())
            return { from: start.toISOString(), to: new Date(start.getTime() + ms(7)).toISOString() }
        }
        case "this-month": {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            return { from: start.toISOString(), to: end.toISOString() }
        }
        case "this-year": {
            const start = new Date(now.getFullYear(), 0, 1)
            const end = new Date(now.getFullYear() + 1, 0, 1)
            return { from: start.toISOString(), to: end.toISOString() }
        }
        case "last-week": {
            const end = new Date(today.getTime() - today.getDay() * ms(1))
            const start = new Date(end.getTime() - ms(7))
            return { from: start.toISOString(), to: end.toISOString() }
        }
        case "last-month": {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)
            return { from: start.toISOString(), to: end.toISOString() }
        }
        case "last-year": {
            const start = new Date(now.getFullYear() - 1, 0, 1)
            const end = new Date(now.getFullYear(), 0, 1)
            return { from: start.toISOString(), to: end.toISOString() }
        }
        default:
            return null
    }
}

router.get("/", async (req, res) => {
    try {
        const { payment_status, purchase_date, search } = req.query
        const limit = parseInt(req.query.limit?.toString() ?? "15") || 15
        const offset = parseInt(req.query.offset?.toString() ?? "0") || 0

        const dateRange = purchase_date && purchase_date !== "all"
            ? resolveDateRange(purchase_date as string)
            : null

        const filters: PurchaseFilters = {
            paymentStatus: payment_status && payment_status !== "all" ? payment_status as string : undefined,
            dateFrom: dateRange?.from,
            dateTo: dateRange?.to,
            search: search ? search as string : undefined,
        }

        const [data, total] = await Promise.all([
            controller.getPurchaseHistoryFiltered(limit, offset, filters),
            controller.getPurchaseHistoryFilteredCount(filters),
        ])

        return res.status(200).json({ data, total })
    } catch (error) {
        console.error("Purchase history error:", error)
        res.status(500).json({
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }
})

export default router
