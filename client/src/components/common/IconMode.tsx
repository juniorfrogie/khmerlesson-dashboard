import { LessonType } from "@shared/schema";

interface iconModeProps{
    lessonType: LessonType
}

export default function IconMode({ lessonType }: iconModeProps) {
    return (
        <>
            <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                {/* <span className="text-lg">{IMAGE_MAP[lesson.image as keyof typeof IMAGE_MAP] || "📚"}</span> */}
                {/* { <span className="text-2xl">{ lesson.lessonType.icon || "📚"}</span> } */}
                {
                lessonType?.iconMode === "file" ? <img src={`/storages/${lessonType?.icon}`} width="24" height="24" alt={lessonType?.title}/> 
                    : <span className="text-lg">{lessonType?.icon || "📚"}</span>
                }
            </div>
        </>
    );
}