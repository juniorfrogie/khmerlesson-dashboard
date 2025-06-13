import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Eye, Save } from "lucide-react";
import { User } from "@shared/schema";
// import RichTextEditor from "@/components/ui/rich-text-editor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const userSchema = z.object({
  firstName: z.string().min(1, "Firstname is required"),
  lastName: z.string().min(1, "Lastname is required"),
  isActive: z.boolean(),
  role: z.string().min(1, "Role is required")
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user: User | null;
  onSubmit: (data: UserFormData, isDraft?: boolean) => void;
  onPreview: (data: UserFormData) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function UserForm({ user, onSubmit, onPreview, onClose, isLoading }: UserFormProps) {
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      isActive: user?.isActive ?? false,
      role: user?.role || "student"
    }
  });

  // const { watch, setValue } = form;
  // const watchedStatus = watch("status");
  // const watchedSections = watch("sections");

  // Auto-save simulation
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setAutoSaveTime(new Date());
  //   }, 30000);

  //   return () => clearInterval(timer);
  // }, []);

  // const addSection = () => {
  //   const currentSections = form.getValues("sections");
  //   setValue("sections", [...currentSections, { title: "", content: "" }]);
  // };

  // const removeSection = (index: number) => {
  //   const currentSections = form.getValues("sections");
  //   if (currentSections.length > 1) {
  //     setValue("sections", currentSections.filter((_, i) => i !== index));
  //   }
  // };

  // const handlePreview = () => {
  //   const data = form.getValues();
  //   if (data.title && data.sections.length > 0) {
  //     onPreview({
  //       ...data,
  //       price: data.free ? undefined : (data.price || 0) * 100,
  //     });
  //   }
  // };


  const updateStatusMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/users/${user?.id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User disabled successfully"
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disable user", 
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: UserFormData, isDraft = false) => {
    onSubmit({
      ...data,
    }, isDraft);
  };

  const handleDisableUserSubmit = (data: any) => {
    const payload = {
      ...data
    }
    updateStatusMutation.mutate(payload)
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(IMAGE_MAP).map(([key, emoji]) => (
                      <SelectItem key={key} value={key}>
                        {emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value.toString()} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* {!watchedFree && (
            <FormField
              control={form.control}
              status="Status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )} */}
        </div>

        {/* <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter lesson description" 
                  className="h-24 resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {/* Preview Section */}
        {/* <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold neutral-dark">Preview</h3>
            <Button type="button" variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Show Preview
            </Button>
          </div>
        </div> */}

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleSubmit(form.getValues(), true)}
              disabled={isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            {autoSaveTime && (
              <div className="text-xs neutral-medium auto-save-indicator">
                <Save className="inline mr-1 h-3 w-3" />
                Auto-saved {autoSaveTime.toLocaleTimeString()}
              </div>
            )}
            <Button 
              type="button" 
              variant="ghost"
              className={user?.isActive ? "text-red-600" : "text-green-600"} 
              onClick={() => handleDisableUserSubmit({isActive: !user?.isActive})}
              disabled={isLoading}
            >{user?.isActive ? "Disable User" : "Enable User"}
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button type="submit" disabled={isLoading} className="bg-fluent-blue hover:bg-blue-600">
              {isLoading ? "Publishing..." : "Publish user"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}