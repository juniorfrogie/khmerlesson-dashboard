import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLesson, SubscriptionPlan } from "@shared/schema";
import SubscriptionPlanModal from "./SubscriptionPlanModal";

function PlanCourses({ planId }: { planId: number }) {
  const { data } = useQuery<{ data: MainLesson[] }>({
    queryKey: ["/api/subscription-plans", planId, "courses"],
    queryFn: () => apiRequest("GET", `/api/subscription-plans/${planId}/courses`).then(r => r.json()),
  });
  const courses = data?.data ?? [];
  if (courses.length === 0) return <span className="text-gray-400 text-xs">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {courses.map(c => (
        <Badge key={c.id} variant="outline" className="text-xs">{c.title}</Badge>
      ))}
    </div>
  );
}

export default function SubscriptionPlansView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data, isLoading } = useQuery<{ data: SubscriptionPlan[]; total: number }>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subscription-plans");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subscription-plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
  });

  const plans = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <Button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Name", "Price/year", "Courses", "iOS Product ID", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left p-4 text-sm font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center p-8 text-gray-400">Loading...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-gray-400">No plans configured yet. Add a plan to get started.</td></tr>
                ) : plans.map(plan => (
                  <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-4 font-medium">{plan.name}</td>
                    <td className="p-4 text-sm">
                      {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(plan.price / 100)}
                    </td>
                    <td className="p-4 text-sm max-w-xs"><PlanCourses planId={plan.id} /></td>
                    <td className="p-4 text-sm text-gray-500">{plan.productIdIos ?? "—"}</td>
                    <td className="p-4">
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingPlan(plan); setIsModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { if (confirm(`Delete "${plan.name}"?`)) deleteMutation.mutate(plan.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <SubscriptionPlanModal
          plan={editingPlan}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
          }}
        />
      )}
    </div>
  );
}
