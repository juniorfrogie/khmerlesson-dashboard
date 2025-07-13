import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonData, Quiz } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { IMAGE_MAP } from "@/lib/constants";

export default function RecentContent() {
  const { data: lessons = [] } = useQuery<LessonData[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ["/api/quizzes"],
  });

  // Combine and sort recent content
  const recentContent = [
    ...lessons.slice(0, 3).map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      type: `Lesson • ${lesson.level}`,
      //icon: IMAGE_MAP[lesson.image] || "📚",
      icon: lesson.lessonType?.icon || "📚",
      iconMode: lesson.lessonType?.iconMode,
      updated: formatDistanceToNow(new Date(lesson.updatedAt), { addSuffix: true }),
    })),
    ...quizzes.slice(0, 2).map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      type: `Quiz • ${Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions`,
      icon: "❓",
      iconMode: null,
      updated: formatDistanceToNow(new Date(quiz.updatedAt), { addSuffix: true }),
    })),
  ].sort((a, b) => b.id - a.id).slice(0, 5);

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
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    {/* <span className="text-lg">{item.icon}</span> */}
                    {
                      item.iconMode ? (
                        item.iconMode === "file" ? <img src={`/uploads/${item.icon}`} width="24" height="24" alt="icon"/> 
                        : <span className="text-lg">{item.icon}</span>
                      ) : (<span className="text-lg">{item.icon}</span>)
                    }
                  </div>
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
