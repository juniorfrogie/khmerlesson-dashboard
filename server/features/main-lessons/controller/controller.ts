import { InsertMainLesson, 
    lessons, 
    lessonType,
    MainLesson, 
    mainLessons, 
    purchase_history,
    UpdateMainLesson, 
    User } from "@shared/schema"
import { eq, sql } from "drizzle-orm"
import { extname } from "path"
import { db } from "server/db"

export class MainLessonController{
    // static instance: MainLessonController | null = null
    // constructor(){
    //   if(MainLessonController.instance){
    //     return MainLessonController.instance;
    //   }
    //   MainLessonController.instance = this;
    // }

    async getAllMainLessons(): Promise<MainLesson[]> {
        const result = await db.select().from(mainLessons).orderBy(mainLessons.createdAt)
        return result
    }
    
    async getMainLessons(limit: number, offset: number): Promise<MainLesson[]> {
        const result = await db.select()
          .from(mainLessons)
          .limit(limit)
          .offset(offset)
          .orderBy(mainLessons.createdAt)
        return result
    }
    
    async getMainLessonsJoin(user: User): Promise<any> {
        // const result = await db.select().from(mainLessons)
        //   .orderBy(mainLessons.createdAt);
        // const mainLessonsUserPurchased = await db.select().from(mainLessons)
        //   .fullJoin(purchase_history, eq(mainLessons.id, purchase_history.mainLessonId))
        //   .innerJoin(users, eq(users.id, purchase_history.userId))
        //   .where(eq(users.id, user.id))
        //   .orderBy(mainLessons.createdAt);
    
        // const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`
        // const publishedLessons = result.filter(e => e.status === "published").map(e => ({
        //   id: e.id,
        //   title: e.title,
        //   description: e.description,
        //   imageCover: e.imageCover,
        //   imageFile: {
        //     name: e.imageCover,
        //     extension: extname(`${bucketEndpoint}/${e.imageCover}`)
        //   },
        //   free: e.free,
        //   price: e.price,
        //   priceCurrency: `${Intl.NumberFormat("en-US", {
        //     style: "currency",
        //     currency: "USD"
        //   }).format((e.price || 0) / 100)}`,
        //   hasPurchased: false,
        //   createdAt: e.createdAt,
        //   updatedAt: e.updatedAt
        // }))
    
        // for(const mainLessonPurchased of mainLessonsUserPurchased){
        //     const indexFound = publishedLessons.findIndex(e => e.id === mainLessonPurchased.main_lessons?.id)
        //     const hasPurchased = mainLessonPurchased.main_lessons?.id === mainLessonPurchased.purchase_history?.mainLessonId
        //         && mainLessonPurchased.purchase_history?.userId === user.id 
        //         && mainLessonPurchased.purchase_history?.paymentStatus?.toLowerCase() === "completed"
        //     if(indexFound === -1) break
        //     publishedLessons[indexFound].hasPurchased = hasPurchased
        // }
        // return publishedLessons;
          
        const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`
    
        // const rawCommand = sql`SELECT *, 
        //   (SELECT CAST(COUNT(${purchase_history.mainLessonId}) AS INT) FROM ${purchase_history}
        //   WHERE ${purchase_history.paymentStatus} = 'completed' 
        //     AND ${purchase_history.userId} = ${user.id} AND ${purchase_history.mainLessonId} = ${mainLessons.id})
        //   FROM ${mainLessons} ORDER BY (${mainLessons.createdAt})`
    
        //let rawCommand: string | SQLWrapper
    
        // if(user){
        //   rawCommand = sql`SELECT *, 
        //     (SELECT CAST(COUNT(${purchase_history.mainLessonId}) AS INT) FROM ${purchase_history}
        //     WHERE ${purchase_history.paymentStatus} = 'completed' 
        //       AND ${purchase_history.userId} = ${user?.id} 
        //       AND ${purchase_history.mainLessonId} = ${mainLessons.id})
        //     FROM ${mainLessons} ORDER BY ${mainLessons.price} DESC, ${mainLessons.createdAt} DESC`
        // }else{
        //   rawCommand = sql`SELECT *, 
        //     (SELECT CAST(COUNT(${purchase_history.mainLessonId}) AS INT) FROM ${purchase_history}
        //     WHERE ${purchase_history.paymentStatus} = 'completed' 
        //       AND ${purchase_history.mainLessonId} = ${mainLessons.id})
        //     FROM ${mainLessons} ORDER BY ${mainLessons.price} DESC, ${mainLessons.createdAt} DESC`
        // }
    
        const command = sql`SELECT *, 
            (SELECT CAST(COUNT(${purchase_history.mainLessonId}) AS INT) FROM ${purchase_history}
            WHERE ${purchase_history.paymentStatus} = 'completed' 
              AND ${purchase_history.userId} > ${user?.id ?? 0}
              AND ${purchase_history.mainLessonId} = ${mainLessons.id})
            FROM ${mainLessons} ORDER BY ${mainLessons.price} DESC, ${mainLessons.createdAt} DESC`
    
        const queryResult = await db.execute(command)
    
        return queryResult.rows.map((e: any) => (
          {
            id: e.id,
            title: e.title,
            description: e.description,
            imageCover: e.imageCover,
            imageFile: {
              name: e.imageCover,
              extension: extname(`${bucketEndpoint}/${e.imageCover}`)
            },
            free: e.free,
            price: e.price,
            priceCurrency: `${Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD"
            }).format((e.price || 0) / 100)}`,
            hasPurchased: e.count > 0 && user !== undefined && user !== null,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
          }
        ))
    
        // const result = await db.select()
        //   .from(mainLessons)
        //   .where(eq(mainLessons.status, "published"))
        //   .orderBy(mainLessons.createdAt)
    
        // const data = []
        // for(const e of result){
        //   const purchaseHistories = await db.select()
        //     .from(purchase_history)
        //     .where(and(eq(purchase_history.mainLessonId, e.id), 
        //       eq(purchase_history.userId, user.id), 
        //       eq(purchase_history.paymentStatus, "completed")))
    
        //   data.push({
        //     id: e.id,
        //     title: e.title,
        //     description: e.description,
        //     imageCover: e.imageCover,
        //     imageFile: {
        //       name: e.imageCover,
        //       extension: extname(`${bucketEndpoint}/${e.imageCover}`)
        //     },
        //     free: e.free,
        //     price: e.price,
        //     priceCurrency: `${Intl.NumberFormat("en-US", {
        //       style: "currency",
        //       currency: "USD"
        //     }).format((e.price || 0) / 100)}`,
        //     hasPurchased: purchaseHistories.length > 0,
        //     createdAt: e.createdAt,
        //     updatedAt: e.updatedAt
        //   })  
        // }
    
        // return data
    }
    
    async getAllLessonsByMainLesson(id: number): Promise<any> {
        const result = await db.select().from(lessons)
          .innerJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
          .innerJoin(mainLessons, eq(mainLessons.id, lessons.mainLessonId))
          .where(eq(mainLessons.id, id))
          .orderBy(lessons.createdAt);
    
        const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`  
        const publishedLessons = result.filter(e => e.lessons.status === "published").map(e => ({
          id: e.lessons.id,
          mainLessonId: e.lessons.mainLessonId,
          title: e.lessons.title,
          description: e.lessons.description,
          level: e.lessons.level,
          lessonType: e.lesson_type,
          image: e.lessons.image,
          imageFile: e.lesson_type.iconMode === "raw" ? null : {
            name: e.lesson_type.icon,
            extension: extname(`${bucketEndpoint}/${e.lesson_type.icon}`)
          },
          createdAt: e.lessons.createdAt,
          updatedAt: e.lessons.updatedAt
        }))
        return publishedLessons
    }
    
    async getMainLesson(id: number): Promise<MainLesson | undefined> {
        const [result] = await db.select().from(mainLessons).where(eq(mainLessons.id, id))
        return result || undefined;
    }

    async createMainLesson(mainLesson: InsertMainLesson): Promise<MainLesson> {
        const [result] = await db.insert(mainLessons).values(
          {
            ...mainLesson, 
            status: mainLesson.status || "draft"
          }).returning()
        return result
    }
    
    async updateMainLesson(id: number, mainLesson: UpdateMainLesson): Promise<MainLesson | undefined> {
        const [result] = await db.update(mainLessons).set({
          ...mainLesson,
          updatedAt: new Date()
        }).where(eq(mainLessons.id, id)).returning()
        return result || undefined
    }
    
    async deleteMainLesson(id: number): Promise<boolean> {
        const result = await db.delete(mainLessons).where(eq(mainLessons.id, id))
        return (result.rowCount ?? 0) > 0
    }
    
    async getMainLessonCount(): Promise<number> {
        const result = await db.$count(mainLessons)
        return result
    }
}

// const instance = new MainLessonController()
// Object.freeze(instance)
// export default instance