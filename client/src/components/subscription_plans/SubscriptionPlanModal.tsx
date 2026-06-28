import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLesson, SubscriptionPlan } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().int().min(1, "Price must be greater than 0"),
  productIdIos: z.string().optional(),
  productIdAndroid: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type PlanFormData = z.infer<typeof planSchema>;

interface Props {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SubscriptionPlanModal({ plan, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!plan;
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  const { data: allLessonsData } = useQuery<{ mainLessons: MainLesson[] }>({
    queryKey: ["/api/main-lessons"],
    queryFn: () => apiRequest("GET", "/api/main-lessons").then(r => r.json()),
  });

  const { data: planCoursesData } = useQuery<{ data: MainLesson[] }>({
    queryKey: ["/api/subscription-plans", plan?.id, "courses"],
    queryFn: () => apiRequest("GET", `/api/subscription-plans/${plan!.id}/courses`).then(r => r.json()),
    enabled: isEdit,
  });

  useEffect(() => {
    if (planCoursesData?.data) {
      setSelectedCourseIds(planCoursesData.data.map((c: MainLesson) => c.id));
    }
  }, [planCoursesData]);

  const allLessons: MainLesson[] = allLessonsData?.mainLessons ?? [];

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name ?? "",
      price: plan ? plan.price : 900,
      productIdIos: plan?.productIdIos ?? "",
      productIdAndroid: plan?.productIdAndroid ?? "",
      description: plan?.description ?? "",
      isActive: plan?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      let planId: number;
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/subscription-plans/${plan!.id}`, data);
        const updated = await res.json();
        planId = updated.id;
      } else {
        const res = await apiRequest("POST", "/api/subscription-plans", data);
        const created = await res.json();
        planId = created.id;
      }
      await apiRequest("PUT", `/api/subscription-plans/${planId}/courses`, { mainLessonIds: selectedCourseIds });
    },
    onSuccess: () => {
      toast({ title: "Success", description: `Plan ${isEdit ? "updated" : "created"} successfully.` });
      onSaved();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" });
    },
  });

  const toggleCourse = (id: number) => {
    setSelectedCourseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Plan" : "Add Subscription Plan"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => mutation.mutate(data))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Basic" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Price (cents)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="900" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <p className="text-xs text-gray-500">
                  = {Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(field.value / 100)}/year
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="productIdIos" render={({ field }) => (
              <FormItem>
                <FormLabel>iOS Product ID</FormLabel>
                <FormControl><Input placeholder="com.khmerlesson.plan1.annual" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="productIdAndroid" render={({ field }) => (
              <FormItem>
                <FormLabel>Android Product ID</FormLabel>
                <FormControl><Input placeholder="com.khmerlesson.plan1.annual" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="What's included..." className="h-20 resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={v => field.onChange(v === "true")} value={String(field.value)}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div>
              <FormLabel>Courses included in this plan</FormLabel>
              <p className="text-xs text-gray-500 mb-2">Users subscribed to this plan can access the selected courses.</p>
              {allLessons.length === 0 ? (
                <p className="text-sm text-gray-400">No courses available yet.</p>
              ) : (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {allLessons.map(lesson => (
                    <label key={lesson.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={selectedCourseIds.includes(lesson.id)}
                        onCheckedChange={() => toggleCourse(lesson.id)}
                      />
                      <span className="text-sm">{lesson.title}</span>
                      {lesson.status === "coming_soon" && (
                        <span className="ml-auto text-xs text-gray-400">Coming Soon</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">{selectedCourseIds.length} course(s) selected</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
