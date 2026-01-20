import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChangePasswordUser, InsertUser, LoginUser, ResetPasswordUser } from "@shared/schema";

export function useAuth(){

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      return await apiRequest("POST", "/api/auth/admin", credentials);
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest("POST", "/api/auth/register", userData);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordUser) => {
      return await apiRequest("POST", "/api/auth/reset-password", data);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordUser) => {
      await apiRequest("PUT", `api/auth/change-password`, data)
    }
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    }
  });

  return { 
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isChangePasswordLoading: changePasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync
   }
}