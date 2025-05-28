import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, HelpCircle, Unlock, Crown, TrendingUp } from "lucide-react";
import { DashboardStats as StatsType } from "@shared/schema";

export default function DashboardStats() {
  const { data: stats, isLoading } = useQuery<StatsType>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Lessons",
      value: stats.totalLessons,
      growth: `+${stats.lessonsGrowth}%`,
      icon: BookOpen,
      iconBg: "bg-blue-100",
      iconColor: "fluent-blue",
    },
    {
      title: "Quiz Questions",
      value: stats.totalQuizzes,
      growth: `+${stats.quizzesGrowth}%`,
      icon: HelpCircle,
      iconBg: "bg-purple-100",
      iconColor: "fluent-purple",
    },
    {
      title: "Free Lessons",
      value: stats.freeLessons,
      subtitle: `${Math.round((stats.freeLessons / stats.totalLessons) * 100)}% of total content`,
      icon: Unlock,
      iconBg: "bg-green-100",
      iconColor: "fluent-green",
    },
    {
      title: "Premium Lessons",
      value: stats.premiumLessons,
      subtitle: `Average price: $${stats.avgPrice}`,
      icon: Crown,
      iconBg: "bg-orange-100",
      iconColor: "fluent-orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="neutral-medium text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold neutral-dark">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={stat.iconColor} size={20} />
              </div>
            </div>
            {stat.growth && (
              <p className="fluent-green text-sm mt-2">
                <TrendingUp className="inline mr-1" size={14} />
                {stat.growth} from last month
              </p>
            )}
            {stat.subtitle && (
              <p className="neutral-medium text-sm mt-2">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
