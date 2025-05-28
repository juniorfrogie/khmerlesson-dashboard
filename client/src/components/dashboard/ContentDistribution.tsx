import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lesson } from "@shared/schema";
import { IMAGE_MAP } from "@/lib/constants";

export default function ContentDistribution() {
  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  // Calculate distribution by type
  const distribution = Object.entries(IMAGE_MAP).map(([type, emoji]) => {
    const count = lessons.filter(lesson => lesson.image === type).length;
    const percentage = lessons.length > 0 ? (count / lessons.length) * 100 : 0;
    
    return {
      type,
      emoji,
      count,
      percentage,
      label: type.charAt(0).toUpperCase() + type.slice(1),
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
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-3">{item.emoji}</span>
                  <span className="neutral-dark">{item.label}</span>
                </div>
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
