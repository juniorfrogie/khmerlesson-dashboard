import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lesson, MainLesson, Quiz } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
// import { useState } from "react";
// import { IMAGE_MAP } from "@/lib/constants";

export default function RecentContent() {
  // const { data: lessons = [] } = useQuery<LessonData[]>({
  //   queryKey: ["/api/lessons"],
  // });

  // const { data: quizzes = [] } = useQuery<Quiz[]>({
  //   queryKey: ["/api/quizzes"],
  // });

  const getMainLessons = async ({ queryKey }: any) => {
    const [_key, params] = queryKey
    const response = await apiRequest("GET", "/api/main-lessons?limit=3&offset=0")
    const body = await response.json()
    return body["mainLessons"]
  }

  const { data: mainLessons = [] } = useQuery<MainLesson[]>({
    queryKey: ["main-lessons"],
    queryFn: getMainLessons
  })

  const getLessons = async ({ queryKey }: any) => {
    const [ _key, params ] = queryKey
    const response = await apiRequest("GET", "/api/lessons")
    const body = await response.json()
    return body["lessons"]
  }
  
  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["lessons"],
    queryFn: getLessons
  });

  const getQuizzes = async ({ queryKey }: any) => {
    const [ _key, params ] = queryKey
    const response = await apiRequest("GET", "/api/quizzes")
    return await response.json()
  }

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ["quizzes"],
    queryFn: getQuizzes
  })

  // Combine and sort recent content
  const recentContent = [
    ...mainLessons.slice(0, 3).map(mainLesson => ({
      id: mainLesson.id,
      title: mainLesson.title,
      imageCover: mainLesson.imageCoverUrl,
      type: `Main lesson • ${mainLesson.free ? "Free" : `${Intl.NumberFormat("en-US", {style: "currency", currency: "USD", }).format((mainLesson.price || 0) / 100)}`}`,
      icon: null,
      iconMode: null,
      updated: formatDistanceToNow(new Date(mainLesson.updatedAt), { addSuffix: true }),
    })),
    ...lessons.slice(0, 3).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      type: `Lesson • ${lesson.level}`,
      imageCover: null,
      //icon: IMAGE_MAP[lesson.image] || "📚",
      icon: lesson.lessonType?.iconMode === "file" ? lesson.lessonType?.iconUrl || "📚" : lesson.lessonType?.icon || "📚",
      iconMode: lesson.lessonType?.iconMode,
      updated: formatDistanceToNow(new Date(lesson.updatedAt), { addSuffix: true }),
    })),
    ...quizzes.slice(0, 2).map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      type: `Quiz • ${Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions`,
      imageCover: null,
      icon: "❓",
      iconMode: null,
      updated: formatDistanceToNow(new Date(quiz.updatedAt), { addSuffix: true }),
    })),
  ].sort((a, b) => b.id + a.id).slice(0, 8);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold neutral-dark">Recent Content</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          {recentContent.length === 0 ? (
            <p className="neutral-medium text-sm text-center py-8">No content created yet</p>
          ) : (
            recentContent.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  {
                    item.icon ? (
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        {/* <span className="text-lg">{item.icon}</span> */}
                        {
                          item.iconMode ? (
                            item.iconMode === "file" ? <img className="w-[24px] h-[24px]" src={`${item.icon}`} alt="icon"/> 
                            : <span className="text-lg">{item.icon}</span>
                          ) : (<span className="text-lg">{item.icon}</span>)
                        }
                      </div>
                    ) : (
                      <div className="flex items-center justify-center mr-4">
                        <img className="h-[150px] rounded-lg" src={`${item.imageCover}`} />
                      </div>
                    )
                  }
                  <div>
                    <p className="font-medium neutral-dark">{item.title}</p>
                    <p className="text-sm neutral-medium">{item.type}</p>
                  </div>
                </div>
                <span className="text-xs neutral-light">{item.updated}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
