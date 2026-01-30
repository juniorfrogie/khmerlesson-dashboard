import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  HelpCircle,
  Unlock,
  Crown,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Users,
  UserCheck,
  Library,
  BookOpen,
} from "lucide-react";
import { DashboardStats as StatsType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function DashboardStats() {
  const getDashboardStats = async ({ queryKey }: any) => {
    const response = await apiRequest("GET", "/api/dashboard/stats");
    return await response.json();
  };

  const { data: stats, isLoading } = useQuery<StatsType>({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const numberCompactFormat = (value: number) => {
    return Intl.NumberFormat("en-US", {
      style: "decimal",
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

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
      title: "Total Main Lessons",
      value: numberCompactFormat(stats.totalMainLessons),
      growth: `${stats.mainLessonsGrowth}%`,
      growthValue: stats.mainLessonsGrowth,
      icon: BookOpen,
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-500",
    },
    {
      title: "Premium Main Lessons",
      value: numberCompactFormat(stats.totalPremiumMainLessons),
      subtitle: `Average price: ${Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(stats.avgPrice)}`,
      icon: Crown,
      iconBg: "bg-orange-100",
      iconColor: "fluent-orange",
    },
    {
      title: "Free Main Lessons",
      value: numberCompactFormat(stats.totalFreeMainLessons),
      subtitle: `${Math.round((stats.totalFreeMainLessons / stats.totalMainLessons) * 100)}% of total content`,
      icon: Unlock,
      iconBg: "bg-green-100",
      iconColor: "fluent-green",
    },
    {
      title: "Total Lessons",
      value: numberCompactFormat(stats.totalLessons),
      growth: `${stats.lessonsGrowth}%`,
      growthValue: stats.lessonsGrowth,
      icon: Library,
      iconBg: "bg-blue-100",
      iconColor: "fluent-blue",
    },
    {
      title: "Quiz Questions",
      value: numberCompactFormat(stats.totalQuizzes),
      growth: `${stats.quizzesGrowth}%`,
      growthValue: stats.quizzesGrowth,
      icon: HelpCircle,
      iconBg: "bg-purple-100",
      iconColor: "fluent-purple",
    },
    // {
    //   title: "Premium Lessons",
    //   value: numberCompactFormat(stats.premiumLessons),
    //   subtitle: `Average price: ${Intl.NumberFormat("en-US", {
    //     style: "currency",
    //     currency: "USD"
    //   }).format(stats.avgPrice)}`,
    //   icon: Crown,
    //   iconBg: "bg-orange-100",
    //   iconColor: "fluent-orange",
    // },
    {
      title: "Total Users",
      value: numberCompactFormat(stats.totalUsers),
      growth: `${stats.usersGrowth ? stats.usersGrowth.toFixed(2) : 0}%`,
      growthValue: stats.usersGrowth,
      icon: Users,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
    },
    {
      title: "Total Active Users",
      value: numberCompactFormat(stats.totalActiveUsers),
      growth: `${stats.activeUsersGrowth ? stats.activeUsersGrowth.toFixed(2) : 0}%`,
      growthValue: stats.activeUsersGrowth,
      icon: UserCheck,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-500",
    },
    {
      title: "Total Purchases Complete",
      value: `${Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(stats.totalPurchaseHistoryComplete)}`,
      growth: `${stats.purchasesGrowth ? stats.purchasesGrowth.toFixed(2) : 0}%`,
      growthValue: stats.purchasesGrowth,
      icon: CircleDollarSign,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="neutral-medium text-sm font-medium">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold neutral-dark">{stat.value}</p>
              </div>
              <div
                className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className={stat.iconColor} size={20} />
              </div>
            </div>
            {/* {stat.growth && stat.growthValue && (
              stat.growthValue > 0 ? (
                <p className="fluent-green text-sm mt-2">
                  <TrendingUp className="inline mr-1" size={14} />
                  +{stat.growth} from last month
                </p>
              ) : (
                <p className="fluent-red text-sm mt-2">
                  <TrendingDown className="inline mr-1" size={14} />
                  {stat.growth} from last month
                </p>
              )
            )} */}
            {stat.growth &&
              (stat.growthValue === 0 ? (
                <p className="neutral-light text-sm font-medium">
                  {stat.growth} from last month
                </p>
              ) : stat.growthValue > 0 ? (
                <p className="fluent-green text-sm mt-2">
                  <TrendingUp className="inline mr-1" size={14} />+{stat.growth}{" "}
                  from last month
                </p>
              ) : (
                <p className="fluent-red text-sm mt-2">
                  <TrendingDown className="inline mr-1" size={14} />
                  {stat.growth} from last month
                </p>
              ))}
            {stat.subtitle && (
              <p className="neutral-medium text-sm mt-2">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
