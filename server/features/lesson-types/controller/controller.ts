import { InsertLessonType, LessonType, lessonType, UpdateLessonType } from "@shared/schema"
import { count, eq } from "drizzle-orm"
import { db } from "server/db"

export class LessonTypeController{

    // static instance: LessonTypeController | null = null
    // constructor(){
    //     if(LessonTypeController.instance){
    //         return LessonTypeController.instance
    //     }
    //     LessonTypeController.instance = this
    // }
    
    async getAllLessonType(): Promise<LessonType[]> {
        const result = await db.select().from(lessonType).orderBy(lessonType.createdAt)
        return result
    }
    
    async getLessonTypePage(limit: number, offset: number): Promise<LessonType[]> {
        const result = await db.select()
          .from(lessonType)
          .limit(limit)
          .offset(offset)
          .orderBy(lessonType.createdAt)
        return result
    }
    
    async getLessonTypeCount(): Promise<number> {
        const result = await db.select({count: count()}).from(lessonType)
        return result[0].count ?? 0
    }
    
    async createLessonType(insertLessonType: InsertLessonType): Promise<LessonType> {
        const [ result ] = await db.insert(lessonType).values(
          {...insertLessonType, 
            icon: insertLessonType.icon, 
            title: insertLessonType.title
          }
        ).returning()
        return result
    }
    
    async updateLessonType(id: number, updateLessonType: UpdateLessonType): Promise<LessonType | undefined> {
        const [result] = await db.update(lessonType).set({...updateLessonType, updatedAt: new Date()})
          .where(eq(lessonType.id, id)).returning()
        return result || undefined
    }
    
    async deleteLessonType(id: number): Promise<boolean> {
        const result = await db.delete(lessonType).where(eq(lessonType.id, id))
        return (result.rowCount ?? 0) > 0
    }
}

// const instance = new LessonTypeController()
// Object.freeze(instance)
// export default instance