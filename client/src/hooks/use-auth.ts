// import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChangePasswordUser, InsertUser, LoginUser, ResetPasswordUser, User } from "@shared/schema";
import { useState, useEffect } from "react";


export function useAuth(){
  const [ user, setUser ] = useState<User | null>(null)
  const [ isLoading, setIsLoading ] = useState(false)

  useEffect(() => {
    // Check localStorage for stored user data
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      return await apiRequest("POST", "/api/auth/admin", credentials);
    },
    onSuccess: async (userData) => {
      const data = await userData.json()
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: async (userData) => {
      const data = await userData.json()
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordUser) => {
      return await apiRequest("POST", "/api/auth/reset-password", data);
    },
    onSuccess: () => {},
    onError: () => {}
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordUser) => {
        await apiRequest("PUT", `api/auth/change-password`, data)
    },
    onSuccess: () => {
        // queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        // queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        // toast({
        //     title: "Success",
        //     description: "Password updated successfully"
        // });
    },
    onError: () => {
        // toast({
        //     title: "Error",
        //     description: "Failed to change password", 
        //     variant: "destructive"
        // });
    }
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem("user");
    },
  });

  return { 
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    isAuthenticated: !!user,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isChangePasswordLoading: changePasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync
   }
}