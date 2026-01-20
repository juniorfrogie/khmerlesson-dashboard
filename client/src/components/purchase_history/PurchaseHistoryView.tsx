import { Eye, RefreshCcw, Search } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { PurchaseHistoryData } from "@shared/schema";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PurchaseHistoryModal } from "./PurchaseHistoryModal";
import { format } from "date-fns";
import Pagination from "../common/Pagination";

type PurchaseHistoryQuery = {
  data: PurchaseHistoryData[];
  total: number;
};

export default function PurchaseHistoryView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseHistory, setEditingPurchaseHistory] =
    useState<PurchaseHistoryData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limit, _] = useState(15);
  var [offset, setOffset] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [purchaseDateFilter, setPurchaseDateFilter] = useState("all");

  const getPurchaseHistory = async ({ queryKey }: any) => {
    const [_key, params] = queryKey;
    const response = await apiRequest(
      "GET",
      `/api/purchase-history?payment_status=${params.paymentStatus}&purchase_date=${params.purchaseDate}&search=${params.search}&limit=${params.limit}&offset=${params.offset}`,
    );
    const result = await response.json();
    return result;
  };

  const {
    data: data = { data: [], total: 0 },
    isLoading,
    refetch,
  } = useQuery<PurchaseHistoryQuery>({
    queryKey: [
      "purchase_history",
      {
        paymentStatus: paymentStatusFilter,
        search: searchTerm,
        purchaseDate: purchaseDateFilter,
        limit: limit,
        offset: offset,
      },
    ],
    queryFn: getPurchaseHistory,
  });

  const purchaseHistoryTableHeader = [
    "Email",
    "Purchase Date",
    "Payment Method",
    "Platform Type",
    "Payment Status",
    "Purchase Amount",
    "Actions",
  ];

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
    } catch (error) {
      setIsRefreshing(false);
      console.error(error);
    }
  };

  const toggleUserSelection = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((id) => id !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === data.data.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(data.data.map((l) => l.id));
    }
  };

  const getPaymentStatusBadgeColor = (paymentStatus: string | null) => {
    switch (paymentStatus?.toLowerCase()) {
      case "complete":
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "refund":
      case "refunded":
        return "bg-gray-100 text-gray-700";
      case "cancel":
      case "cancelled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // const getPaymentStatusLabel = (paymentStatus: string) => {
  //    switch (paymentStatus.toLowerCase()) {
  //         case "complete":
  //         case "completed":
  //             return "COMPLETED";
  //         case "pending": return "Pending";
  //         case "refund":
  //         case "refunded":
  //             return "Refund";
  //         case "cancel":
  //         case "cancelled":
  //             return "Cancelled";
  //         default: return "Unknown";
  //     }
  // };

  const next = () => {
    let min = offset + limit;
    setOffset(Math.min(min, data.total));
    setPageNumber(pageNumber + 1);
  };

  const previous = () => {
    let max = offset - limit;
    setOffset(Math.max(0, max));
    setPageNumber(pageNumber - 1);
  };

  // const handleEdit = (data: PurchaseHistoryData) => {
  //     setEditingPurchaseHistory(data);
  //     setIsModalOpen(true);
  // };

  const handlePreview = (data: PurchaseHistoryData) => {
    setEditingPurchaseHistory(data);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-200">
        <CardContent className="p-6 space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  placeholder="Search email..."
                  className="pl-10"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={purchaseDateFilter}
                onValueChange={setPurchaseDateFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Purchase date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchase date</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this-week">This week</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="this-year">This year</SelectItem>
                  <SelectItem value="last-week">Last week</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                  <SelectItem value="last-year">Last year</SelectItem>
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCcw
                  className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Purchase History Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium neutral-dark">
                      <Checkbox
                        checked={
                          data.data?.length > 0 &&
                          selectedUsers.length === data.data?.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    {purchaseHistoryTableHeader.map((e) => (
                      <th
                        key={e}
                        className="text-left p-4 font-medium neutral-dark"
                      >
                        {e}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="text-gray-500">
                          <p>No purchase history found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.data?.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedUsers.includes(e.id)}
                            onCheckedChange={() => toggleUserSelection(e.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <p className="font-medium neutral-dark">
                              {e.email}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <span className="neutral-medium text-sm">
                              {/* { moment(e.purchaseDate).format("LLL") } */}
                              {format(e.purchaseDate, "PPpp")}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <p className="font-medium neutral-dark">
                              {e.paymentMethod}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex -items-center">
                            <p className="font-medium neutra-dark">
                              {e.platformType}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={getPaymentStatusBadgeColor(
                              e.paymentStatus,
                            )}
                          >
                            {e.paymentStatus}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-medium neutra-dark">
                            {`${Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format((e.purchaseAmount || 0) / 100)}`}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(e)}
                              className="neutral-medium hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {/* {data.data?.length > 0 && (
                    <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm neutral-medium">
                        Showing 1 to {data.data?.length} of {data.total} purchase history
                        </div>
                        <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={previous} disabled={offset < 1}>
                            <ChevronLeft />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-fluent-blue text-white">
                            { pageNumber }
                        </Button>
                        <Button variant="outline" size="sm" onClick={next} disabled={offset === data.total - 1 || data.data.length === data.total || (offset + limit) === data.total}>
                            <ChevronRight />
                        </Button>
                        </div>
                    </div>
                )} */}
            <Pagination
              title="Purchase History"
              currentLength={data.data?.length ?? 0}
              limit={limit}
              offset={offset}
              pageNumber={pageNumber}
              next={next}
              previous={previous}
              total={data.total}
            />
          </div>
        </CardContent>
      </Card>
      <PurchaseHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={editingPurchaseHistory}
      />
    </>
  );
}
