import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionData } from "@shared/schema";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { format } from "date-fns";
import Pagination from "../common/Pagination";

type SubscriptionsQuery = {
  data: SubscriptionData[];
  total: number;
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trial: "secondary",
  active: "default",
  expired: "destructive",
  cancelled: "outline",
};

export default function SubscriptionsView() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const handleNext = () => { setPageNumber(p => p + 1); setOffset(o => o + limit); };
  const handlePrevious = () => { setPageNumber(p => Math.max(1, p - 1)); setOffset(o => Math.max(0, o - limit)); };

  const fetchSubscriptions = async ({ queryKey }: any) => {
    const [_key, params] = queryKey;
    const qs = new URLSearchParams({
      status: params.status,
      platform: params.platform,
      limit: String(params.limit),
      offset: String(params.offset),
    });
    const response = await apiRequest("GET", `/api/subscriptions?${qs}`);
    return await response.json();
  };

  const { data: data = { data: [], total: 0 }, isLoading, refetch } = useQuery<SubscriptionsQuery>({
    queryKey: ["subscriptions", { status: statusFilter, platform: platformFilter, limit, offset }],
    queryFn: fetchSubscriptions,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 mb-6">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); setPageNumber(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setOffset(0); setPageNumber(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Email", "Plan", "Platform", "Status", "Expires At", "Created"].map(h => (
                    <th key={h} className="text-left p-4 text-sm font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-400">Loading...</td></tr>
                ) : data.data.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-400">No subscriptions found.</td></tr>
                ) : data.data.map(sub => (
                  <tr key={sub.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-4 text-sm">{sub.email}</td>
                    <td className="p-4 text-sm font-medium">{sub.planName}</td>
                    <td className="p-4 text-sm capitalize">{sub.platform}</td>
                    <td className="p-4">
                      <Badge variant={STATUS_COLORS[sub.status] ?? "outline"}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">
                      {format(new Date(sub.currentPeriodEndsAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            title="subscriptions"
            currentLength={data.data.length}
            total={data.total}
            limit={limit}
            offset={offset}
            pageNumber={pageNumber}
            next={handleNext}
            previous={handlePrevious}
          />
        </CardContent>
      </Card>
    </div>
  );
}
