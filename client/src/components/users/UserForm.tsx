import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";
import { User } from "@shared/schema";

const userSchema = z.object({
  firstName: z.string().min(1, "Firstname is required"),
  lastName: z.string().min(1, "Lastname is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  isActive: z.boolean(),
  role: z.string().min(1, "Role is required")
});

const updateUserSchema = z.object({
  firstName: z.string().min(1, "Firstname is required"),
  lastName: z.string().min(1, "Lastname is required"),
  isActive: z.boolean(),
  role: z.string().min(1, "Role is required")
});

type UserFormData = z.infer<typeof userSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface UserFormProps {
  user: User | null;
  onSubmit: (data: UserFormData) => void;
  onStatusSubmit: (data: any) => void;
  onChangePasswordView: (data: UserFormData) => void;
  onUpdateSubmit: (data: UpdateUserFormData) => void;
  onClose: () => void;
  isLoading: boolean;
  isDeactivatingUser: boolean;
}

export default function UserForm({ user, onSubmit, onStatusSubmit, 
    onChangePasswordView,
    onUpdateSubmit,
    isLoading, isDeactivatingUser }: UserFormProps) {
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      isActive: user?.isActive ?? true,
      role: user?.role ?? "admin"
    }
  });

  const handleChangePasswordView = () => {
    const data = form.getValues();
    onChangePasswordView({
      ...data
    })
  }

  const handleSubmit = (data: UserFormData) => {
    onSubmit({
      ...data,
    });
  };

  const handleUpdateSubmit = (data: UpdateUserFormData) => {
    onUpdateSubmit({
      ...data,
    });
  };

  const handleStatusUserSubmit = async (data: any) => {
    onStatusSubmit({
      ...data
    })
  };

  const deactivateUserText = () => {
    if(isDeactivatingUser){
      return user?.isActive ? "Deactivating" : "Activiating"
    }else{
      return user?.isActive ? "Deactivate User" : "Activiate User"
    }
  }

  const enablePublishButton = () => {
    if(user){
      return user?.role !== "admin"
    }
    return false
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data))} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            disabled={user ? user?.role !== "admin" : false}
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
            disabled={user ? user?.role !== "admin" : false}
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

          { !user && (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          { !user && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter password" {...field} type="password"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "admin")} value={field.value.toString()} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Student</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3">
      
            { user?.role === "admin" && (
              <Button 
              type="button" 
              variant="outline" 
              onClick={handleChangePasswordView}
              disabled={isLoading || isDeactivatingUser}
              >
              <Lock className="mr-2 h-4 w-4" />
              Change password
            </Button>
            )}

            { user && (
              <Button 
              type="button" 
              variant="ghost"
              className={user?.isActive ? "text-red-600" : "text-green-600"} 
              onClick={() => handleStatusUserSubmit({isActive: !user?.isActive})}
              disabled={isDeactivatingUser || isLoading}>
                { deactivateUserText() }
            </Button>
            )}
          </div>
          
          { !enablePublishButton() && (
            <div className="flex items-center space-x-3">
            { !user ? <Button type="submit" disabled={isLoading} className="bg-fluent-blue hover:bg-blue-600">
              {isLoading ? "Publishing..." : "Publish user"}
            </Button> : <Button disabled={isLoading || isDeactivatingUser} className="bg-fluent-blue hover:bg-blue-600" onClick={() => handleUpdateSubmit(form.getValues())}>
              {isLoading ? "Updating..." : "Update user"}
            </Button>
            }
          </div>
          )}
        </div>
      </form>
    </Form>
  );
}