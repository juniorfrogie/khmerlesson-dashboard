import { sql } from "drizzle-orm"
import { db } from "server/db"

// type QueryFilter = {
//     columnName: string
//     value: string
// }

export const getLastMonthGrowthValue = async (table: any) => {

    // const columnName = filter ? sql.raw(filter.columnName) : null
    // const value = filter ? sql.raw(filter.value) : null
    const command = sql`
        WITH MonthOverMonth AS (
            SELECT
                (SELECT CAST(COUNT(${table.createdAt}) AS INT) AS currentMonth
                FROM ${table}
                WHERE EXTRACT(MONTH FROM ${table.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM ${table.createdAt}) = EXTRACT(YEAR FROM CURRENT_DATE)
                ),

                (SELECT CAST(COUNT(${table.createdAt}) AS INT) AS priorMonth
                FROM ${table} 
                WHERE EXTRACT(MONTH FROM ${table.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
                    AND EXTRACT(YEAR FROM ${table.createdAt}) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 year')
                )
        )
        
        SELECT 
            CASE 
            WHEN currentmonth > 0 AND priormonth > 0 
                THEN ((currentmonth / priormonth) - 1) 
            ELSE 0 
            END AS growth FROM MonthOverMonth
        `

    const result = await db.execute(command)   
    return result.rowCount && result.rowCount > 0 ? (result.rows[0].growth as number) : 0
}