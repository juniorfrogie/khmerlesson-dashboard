import { Router } from "express";
import { storage } from "server/storage";

const router = Router()

router.get("/", async (req, res) => {
    try{
      const { payment_status, purchase_date, search } = req.query
      let limit = parseInt(req.query.limit?.toString() ?? "15") || 15
      let offset = parseInt(req.query.offset?.toString() ?? "0") || 0
      let purchaseHistoryResponse = await storage.getPurchaseHistory(limit, offset)
      let purchaseHistoryCount = await storage.getPurchaseHistoryCount()

      // Apply filters
      if (payment_status && payment_status !== "all") {
        purchaseHistoryResponse = purchaseHistoryResponse.filter(e => e.paymentStatus?.toLowerCase() === payment_status.toString().toLowerCase())
      }

      if(purchase_date && purchase_date !== "all"){
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()

        switch(purchase_date){
          case "today":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => new Date(f.purchaseDate).toLocaleDateString() === currentDate.toLocaleDateString())
            break
          case "yesterday":
            const yesterdayDate = new Date(currentDate)
            yesterdayDate.setDate(currentDate.getDate() - 1)
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => yesterdayDate.toLocaleDateString() === new Date(f.purchaseDate).toLocaleDateString())
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() > new Date(f.purchaseDate).getDate()
            //   && new Date(f.purchaseDate).getDate() === currentDate.getDate() - 1
            //   && currentYear === new Date(f.purchaseDate).getFullYear() && currentMonth === new Date(f.purchaseDate).getMonth())
            break
          case "last-week":
            // const startLastWeekDate = new Date(new Date().setDate(new Date().getDate() - 8))
            // const endLastWeekDate = new Date(new Date().setDate(startLastWeekDate.getDate() + 6))
            const nowLastWeek = new Date()
            const startLastWeekDate = new Date(nowLastWeek.setDate((nowLastWeek.getDate() - nowLastWeek.getDay()) - 6))
            const endLastWeekDate = new Date(nowLastWeek.setDate(startLastWeekDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLastWeekDate <= new Date(f.purchaseDate) 
              && endLastWeekDate >= new Date(f.purchaseDate))
            break
          case "last-month":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => (currentMonth + 1) > (new Date(f.purchaseDate).getMonth() + 1) 
              && ((currentMonth + 1) - 2) < (new Date(f.purchaseDate).getMonth() + 1) 
              && currentYear === new Date(f.purchaseDate).getFullYear())
            break    
          case "last-year":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getFullYear() > new Date(f.purchaseDate).getFullYear() 
              && new Date(f.purchaseDate).getFullYear() > currentDate.getFullYear() - 2)
            break  
          case "last-7-days":
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 7 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            const startDate = new Date(new Date().setDate(currentDate.getDate() - 7))
            const endDate = new Date(new Date().setDate(startDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startDate <= new Date(f.purchaseDate) 
              && endDate >= new Date(f.purchaseDate))
            break
          case "last-30-days":
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 30 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            const startLast30days = new Date(new Date().setDate(currentDate.getDate() - 30))
            const endLast30days = new Date(new Date().setDate(startLast30days.getDate() - 1))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLast30days <= new Date(f.purchaseDate) 
              && endLast30days >= new Date(f.purchaseDate))
            break
          case "last-90-days":
            const startLast90days = new Date(new Date().setDate(currentDate.getDate() - 90))
            const endLast90days = new Date(new Date().setDate(startLast90days.getDate() - 2))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startLast90days <= new Date(f.purchaseDate) 
              && endLast90days >= new Date(f.purchaseDate))
            // purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentDate.getDate() - 90 <= new Date(f.purchaseDate).getDate() 
            //   && currentDate.getDate() > new Date(f.purchaseDate).getDate())
            break
          case "this-week":
            const now = new Date()
            const previousDay = now.getDay() - 1
            const startThisWeekDate = new Date(now.setDate(now.getDate() - previousDay))
            const endThisWeekDate = new Date(now.setDate(startThisWeekDate.getDate() + 6))
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => startThisWeekDate <= new Date(f.purchaseDate) 
              && endThisWeekDate >= new Date(f.purchaseDate))
            break  
          case "this-month":
            const nowThisMonth = new Date()
            const startThisMonthDate = new Date(nowThisMonth.getFullYear(), nowThisMonth.getMonth(), 1)
            const endThisMonthDate = new Date(nowThisMonth.getFullYear(), nowThisMonth.getMonth() + 1, 0)
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentYear === new Date(f.purchaseDate).getFullYear() 
              && currentMonth === new Date(f.purchaseDate).getMonth()
              && startThisMonthDate <= new Date(f.purchaseDate) 
              && endThisMonthDate >= new Date(f.purchaseDate))
            break
          case "this-year":
            purchaseHistoryResponse = purchaseHistoryResponse.filter(f => currentYear === new Date(f.purchaseDate).getFullYear())
            break
          default:
            break          
        }
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        purchaseHistoryResponse = purchaseHistoryResponse.filter(e => 
          e.email.toLowerCase().includes(searchTerm)
        )
      }

      const sendReponse = {
        data: purchaseHistoryResponse,
        total: purchaseHistoryCount
      }
      return res.status(200).json(sendReponse)
    }catch(error){
      res.status(500).send("Failed to get purchase history")
    }
  })

export default router;