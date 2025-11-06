import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// import { Link, useLocation } from "wouter";
import { resetPasswordSchema, ResetPasswordUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap } from "lucide-react";

export default function ResetPassword() {
  //const [, setLocation] = useLocation();
  const { resetPassword } = useAuth()
  const [ isLoading, setLoading ] = useState(false)
  const { toast } = useToast();

  const form = useForm<ResetPasswordUser>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: window.location.pathname.split("/")[2],
      password: "",
      confirmPassword: ""
    },
  });

  const onSubmit = async (data: ResetPasswordUser) => {
    try {
      setLoading(true)  
      await resetPassword(data)
      setLoading(false)
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    } catch (error: any) {
      setLoading(false)
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-semibold neutral-dark flex items-center">
              <GraduationCap className="fluent-blue mr-3" size={24} />
              Khmer Learning
            </h1>
          </div>
          <div className="py-4">
            Reset Password
          </div>
          </CardTitle>
          <CardDescription className="text-center">
            Enter a new password below to change your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Confirm password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Resetting password.." : "Reset"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}