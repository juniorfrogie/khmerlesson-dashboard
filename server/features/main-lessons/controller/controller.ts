import {
  InsertMainLesson,
  lessons,
  lessonType,
  MainLesson,
  mainLessons,
  purchase_history,
  UpdateMainLesson,
  User
} from "@shared/schema"
import { eq, sql, asc } from "drizzle-orm"
import { db } from "server/db"

export class MainLessonController {

  async getAllMainLessons(): Promise<MainLesson[]> {
    const result = await db.select().from(mainLessons).orderBy(asc(mainLessons.order), asc(mainLessons.createdAt))
    return result
  }

  async getMainLessons(limit: number, offset: number): Promise<MainLesson[]> {
    const result = await db.select()
      .from(mainLessons)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(mainLessons.order), asc(mainLessons.createdAt))
    return result
  }

  async getMainLessonsJoin(user: User): Promise<any> {

    const bucketEndpoint = `${process.env.BUCKET_ORIGIN_END_POINT}`

    const userFilter = user?.id
      ? sql`AND ${purchase_history.userId} = ${user.id}`
      : sql`AND 1=0`;

    // console.log("UserID", user?.id)

    const command = sql`
        SELECT
          ${mainLessons.id},
          ${mainLessons.title},
          ${mainLessons.description},
          ${mainLessons.imageCover},
          ${mainLessons.free},
          ${mainLessons.price},
          ${mainLessons.order},
          ${mainLessons.createdAt},
          ${mainLessons.updatedAt},
          ${mainLessons.productId},

          (
            SELECT CAST(COUNT(*) AS INT)
            FROM ${purchase_history}
            WHERE ${purchase_history.paymentStatus} = 'completed'
              ${userFilter}
              AND ${purchase_history.mainLessonId} = ${mainLessons.id}
          ) as purchase_count,

          (
            SELECT CAST(COUNT(*) AS INT)
            FROM ${lessons}
            WHERE ${lessons.mainLessonId} = ${mainLessons.id}
              AND ${lessons.status} = 'published'
          ) as lesson_count

        FROM ${mainLessons}
        ORDER BY ${mainLessons.order} ASC,
                ${mainLessons.price} DESC,
                ${mainLessons.createdAt} DESC
        `;
    const queryResult = await db.execute(command)

    return queryResult.rows.map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      thumbnailUrl: e.image_cover ? `${bucketEndpoint}/${e.image_cover}` : null,
      isFree: e.free,
      lessonCount: e.lesson_count,
      order: e.order,
      price: Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((e.price ?? 0) / 100),
      hasPurchased: (e.purchase_count ?? 0) > 0,
      productId: e.product_id ?? null,
    }))
  }

  async getAllLessonsByMainLesson(id: number): Promise<any> {
    const result = await db.select().from(lessons)
      .innerJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
      .innerJoin(mainLessons, eq(mainLessons.id, lessons.mainLessonId))
      .where(eq(mainLessons.id, id))
      .orderBy(lessons.createdAt);

    const publishedLessons = result.filter(e => e.lessons.status === "published").map(e => ({
      id: e.lessons.id,
      courseId: e.lessons.mainLessonId,
      title: e.lessons.title,
      description: e.lessons.description,
      level: e.lessons.level,
      type: e.lesson_type.title,
    }))
    return publishedLessons
  }

  async getMainLesson(id: number): Promise<MainLesson | undefined> {
    const [result] = await db.select().from(mainLessons).where(eq(mainLessons.id, id))
    return result || undefined;
  }

  async createMainLesson(mainLesson: InsertMainLesson): Promise<MainLesson> {
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${mainLessons.order}), -1)` })
      .from(mainLessons)
    const [result] = await db.insert(mainLessons).values({
      ...mainLesson,
      order: maxOrder + 1,
      status: mainLesson.status || "draft"
    }).returning()
    return result
  }

  async reorderMainLessons(items: { id: number; order: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(mainLessons)
          .set({ order: item.order, updatedAt: new Date() })
          .where(eq(mainLessons.id, item.id))
      }
    })
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