import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { DebugLog } from "@shared/schema";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { format } from "date-fns";
import Pagination from "../common/Pagination";

type DebugLogsQuery = {
  data: DebugLog[];
  total: number;
};

const LEVEL_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  debug: "outline",
  info: "secondary",
  warn: "default",
  error: "destructive",
};

export default function DebugLogsView() {
  const [traceIdFilter, setTraceIdFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const handleNext = () => { setPageNumber(p => p + 1); setOffset(o => o + limit); };
  const handlePrevious = () => { setPageNumber(p => Math.max(1, p - 1)); setOffset(o => Math.max(0, o - limit)); };

  const fetchDebugLogs = async ({ queryKey }: any) => {
    const [_key, params] = queryKey;
    const qs = new URLSearchParams({
      level: params.level,
      source: params.source,
      limit: String(params.limit),
      offset: String(params.offset),
      ...(params.traceId ? { traceId: params.traceId } : {}),
    });
    const response = await apiRequest("GET", `/api/debug-logs?${qs}`);
    return await response.json();
  };

  const { data: data = { data: [], total: 0 }, isLoading, refetch } = useQuery<DebugLogsQuery>({
    queryKey: ["debug-logs", { traceId: traceIdFilter.trim(), level: levelFilter, source: sourceFilter, limit, offset }],
    queryFn: fetchDebugLogs,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Debug Logs</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by trace ID..."
              value={traceIdFilter}
              onChange={(e) => { setTraceIdFilter(e.target.value); setOffset(0); setPageNumber(1); }}
              className="max-w-xs"
            />

            <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setOffset(0); setPageNumber(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setOffset(0); setPageNumber(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Time", "Level", "Source", "Trace ID", "Message", "Context"].map(h => (
                    <th key={h} className="text-left p-4 text-sm font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-400">Loading...</td></tr>
                ) : data.data.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-gray-400">No debug logs found.</td></tr>
                ) : data.data.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 align-top">
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="p-4">
                      <Badge variant={LEVEL_COLORS[log.level] ?? "outline"}>
                        {log.level}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm capitalize">{log.source}</td>
                    <td className="p-4 text-xs font-mono">
                      <button
                        className="hover:underline"
                        title="Filter by this trace ID"
                        onClick={() => { setTraceIdFilter(log.traceId); setOffset(0); setPageNumber(1); }}
                      >
                        {log.traceId}
                      </button>
                    </td>
                    <td className="p-4 text-sm max-w-md">{log.message}</td>
                    <td className="p-4 text-xs font-mono text-gray-500 max-w-xs truncate" title={log.context ? JSON.stringify(log.context) : ""}>
                      {log.context ? JSON.stringify(log.context) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            title="debug logs"
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
