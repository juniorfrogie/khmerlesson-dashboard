import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonData, LessonType } from "@shared/schema";
// import { IMAGE_MAP } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";

export default function ContentDistribution() {

  const getLessons = async ({ queryKey }: any) => {
    const [ _key, params ] = queryKey
    const response = await apiRequest("GET", "/api/lessons")
    return await response.json()
  }

  const { data: lessons = [] } = useQuery<LessonData[]>({
    queryKey: ["lessons"],
    queryFn: getLessons
  });

  // Calculate distribution by type
  // const distribution = Object.entries(IMAGE_MAP).map(([type, emoji]) => {
  //   const count = lessons.filter(lesson => lesson.image === type).length;
  //   const percentage = lessons.length > 0 ? (count / lessons.length) * 100 : 0;
    
  //   return {
  //     type,
  //     emoji,
  //     count,
  //     percentage,
  //     label: type.charAt(0).toUpperCase() + type.slice(1),
  //   };
  // }).filter(item => item.count > 0);

  const getAllLessonType = async ({ queryKey }: any) => {
    const [_key, params] = queryKey
    const response = await apiRequest("GET", "/api/lesson-type")
    return await response.json()
  }

  const { data: lessonTypeList = [] } = useQuery<LessonType[]>({
    queryKey: ["lesson-type"],
    queryFn: getAllLessonType
  })

  const distribution = lessonTypeList.map((lessonType) => {
    const id = lessonType.id
    const title = lessonType.title
    const icon = lessonType.icon
    const iconMode = lessonType.iconMode
    const count = lessons.filter(lesson => lesson.lessonType.title.toLowerCase() === title.toLowerCase()).length;
    const percentage = lessons.length > 0 ? (count / lessons.length) * 100 : 0;
    
    return {
      id,
      title,
      icon,
      iconMode,
      count,
      percentage,
      label: title.charAt(0).toUpperCase() + title.slice(1),
    };
  }).filter(item => item.count > 0);

  const colors = [
    "bg-blue-500",
    "bg-purple-500", 
    "bg-green-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-stone-500",
    "bg-zinc-500",
    "bg-neutral-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-fuchsia-500"
  ];

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold neutral-dark">Content Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {distribution.length === 0 ? (
            <p className="neutral-medium text-sm text-center py-8">No lessons created yet</p>
          ) : (
            distribution.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                {
                  item.iconMode === "file" ? (
                    <div className="flex items-center">
                      <span className="text-lg mr-3">
                        <img src={`/uploads/${item.icon}`} width="24" height="24" alt={item.title}/>
                      </span>
                      <span className="neutral-dark">{item.label}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{item.icon}</span>
                      <span className="neutral-dark">{item.label}</span>
                    </div>
                  )
                }
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className={`${colors[index % colors.length]} h-2 rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm neutral-medium w-6 text-right">{item.count}</span>
                </div>
              </div>
            ))
          )}
          {distribution.length === 0 && lessons.length === 0 && (
            <div className="text-center py-8">
              <p className="neutral-medium text-sm">Create your first lesson to see distribution</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
