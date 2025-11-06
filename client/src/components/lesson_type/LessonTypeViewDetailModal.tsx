import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Lesson, LessonType } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface LessonTypeViewDetailModalProps {
  lessonType: LessonType | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LessonTypeViewDetailModal({ lessonType, isOpen, onClose }: LessonTypeViewDetailModalProps){
    if (!lessonType) return null;

    const getLessons = async ({ queryKey }: any) => {
        const [_key, _] = queryKey
        const response = await apiRequest("GET", `/api/lesson-type/${lessonType.id}`)
        return await response.json()
    }

    const { data: lessons = [], isFetching } = useQuery<Lesson[]>({
        //queryKey: [`/api/lesson-type/${lessonType.id}`]
        queryKey: ['lesson-type-detail'],
        queryFn: getLessons,
        refetchOnMount: "always"
    })

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center">
                        Lesson Type Detail
                    </DialogTitle>
                    <DialogDescription />
                </DialogHeader>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                    { isFetching ? (<p className="neutral-light text-sm">Please wait...</p>) : (<div className="space-y-6">
                        { 
                            lessons.length === 0 ? (
                                <div className="text-gray-500">
                                    <p>No lessons found</p>
                                </div>
                            ) : (
                                lessons.map((lesson) => (
                                    <Card key={lesson.id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        {
                                                            lessonType?.iconMode === "file" ? <img src={`${lessonType?.iconUrl}`} width="24" height="24" alt={lessonType?.title}/> 
                                                            : <span className="text-2xl">{lessonType?.icon || "📚"}</span>
                                                        }
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-2xl neutral-dark">{lesson.title}</CardTitle>
                                                         <p className="neutral-medium mt-1">{lesson.description}</p>
                                                         <div className="flex items-center space-x-2 mt-3">
                                                            <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                                            {/* {lesson.image?.charAt(0).toUpperCase() + lesson.image?.slice(1)} */}
                                                            { lessonType && (
                                                                lessonType.title?.charAt(0).toUpperCase() + lessonType.title?.slice(1)
                                                            )}
                                                            </Badge>
                                                            <Badge className={
                                                                lesson.level === "Beginner" ? "bg-green-100 text-green-700" :
                                                                lesson.level === "Intermediate" ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-red-100 text-red-700"
                                                                }>
                                                                {lesson.level}
                                                            </Badge>
                                                            {/* <Badge variant={lesson.free ? "default" : "secondary"}>
                                                                {lesson.free ? "Free" : `${Intl.NumberFormat("en-US", {
                                                                    style: "currency",
                                                                    currency: "USD",
                                                                }).format((lesson.price || 0) / 100)}`}
                                                            </Badge> */}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))
                            )
                        }
                    </div>)}
                </div>
            </DialogContent>
        </Dialog>
    )
}