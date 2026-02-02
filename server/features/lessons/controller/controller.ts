import { InsertLesson, Lesson, lessons, lessonType, UpdateLesson } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "server/db";

export class LessonController{

    // static instance: LessonController | null = null
    // constructor(){
    //     if(LessonController.instance){
    //         return LessonController.instance
    //     }
    //     LessonController.instance = this
    // }

    async getAllLessons(): Promise<Lesson[]> {
        const result = await db.select().from(lessons)
            .leftJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
            .orderBy(lessons.createdAt)
    
        const lessonList = result.map(e => (<Lesson>{
            id: e.lessons.id,
            mainLessonId: e.lessons.mainLessonId,
            lessonTypeId: e.lessons.lessonTypeId,
            lessonType: e.lesson_type,
            title: e.lessons.title,
            description: e.lessons.description,
            level: e.lessons.level,
            image: e.lessons.image,
            status: e.lessons.status,
            sections: e.lessons.sections,
            createdAt: e.lessons.createdAt,
            updatedAt: e.lessons.updatedAt
        })) 
        return lessonList;
    }

    async getLessons(limit: number, offset: number): Promise<Lesson[]> {
        const result = await db.select().from(lessons)
            .leftJoin(lessonType, eq(lessonType.id, lessons.lessonTypeId))
            .limit(limit)
            .offset(offset)
            .orderBy(lessons.createdAt)
    
        const lessonList = result.map(e => (<Lesson>{
            id: e.lessons.id,
            mainLessonId: e.lessons.mainLessonId,
            lessonTypeId: e.lessons.lessonTypeId,
            lessonType: e.lesson_type,
            title: e.lessons.title,
            description: e.lessons.description,
            level: e.lessons.level,
            image: e.lessons.image,
            status: e.lessons.status,
            sections: e.lessons.sections,
            createdAt: e.lessons.createdAt,
            updatedAt: e.lessons.updatedAt
        }))
        return lessonList
    }

    async getLesson(id: number): Promise<Lesson | undefined> {
        const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
        return lesson || undefined;
    }

    async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
        const [lesson] = await db
        .insert(lessons)
        .values({
            ...insertLesson,
            status: insertLesson.status || "draft",
            sections: insertLesson.sections || []
        })
        .returning();
        return lesson;
    }

    async updateLesson(id: number, updateLesson: UpdateLesson): Promise<Lesson | undefined> {
        const [lesson] = await db
            .update(lessons)
            .set({
                ...updateLesson,
                updatedAt: new Date()
            })
            .where(eq(lessons.id, id))
            .returning();
        return lesson || undefined;
    }

    async deleteLesson(id: number): Promise<boolean> {
        const result = await db.delete(lessons).where(eq(lessons.id, id));
        return (result.rowCount ?? 0) > 0;
    }

    async getLessonsByLessonTypeId(id: number): Promise<Lesson[]> {
        const result = await db.select().from(lessons)
            .where(eq(lessons.lessonTypeId, id))
            .orderBy(lessons.createdAt)
        return result
    }

    async getLessonCount(): Promise<number> {
        const result = await db.$count(lessons)
        return result
    }
}

// const instance = new LessonController()
// Object.freeze(instance)
// export default instance