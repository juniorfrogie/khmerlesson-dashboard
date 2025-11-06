import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChangePasswordUser, InsertUser, LoginUser, ResetPasswordUser, User } from "@shared/schema";
import { useState, useEffect } from "react";

export function useAuth(){
  const [ user, setUser ] = useState<User | null>(null)
  const [ isLoading, setIsLoading ] = useState(false)

  useEffect(() => {
    // Check localStorage for stored user data
    // const storedUser = localStorage.getItem("user");
    // if (storedUser) {
    //   try {
    //     setUser(JSON.parse(storedUser));
    //   } catch (error) {
    //     localStorage.removeItem("user");
    //   }
    // }
  
    // setIsLoading(false);
    userSession()
  }, []);

  const userSession = async () => {
    try {
      const response = await apiRequest("POST", "/api/verify-token")
      if(response.status === 200){
        const storedUser = localStorage.getItem("user")
        if(storedUser){
          setUser(JSON.parse(storedUser))
        }
        return
      }
      localStorage.removeItem("user")
    } catch (error) {
      localStorage.removeItem("user")
    }
    setIsLoading(false)
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      return await apiRequest("POST", "/api/auth/admin", credentials);
    },
    onSuccess: async (userData) => {
      const data = await userData.json()
      setUser(data["user"]);
      localStorage.setItem("user", JSON.stringify(data["user"]));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: async (userData) => {
      const data = await userData.json()
      setUser(data["user"]);
      localStorage.setItem("user", JSON.stringify(data["user"]));
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
    }
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem("user");
    }
  });

  const getFullName = () => {
    return `${user?.firstName}\t${user?.lastName}`
  }

  const getShortNameWith2Letter = () => {
    const firstName = user?.firstName
    const lastName = user?.lastName
    if(!firstName || !lastName) return ''
    return `${firstName.at(0)?.toUpperCase()}${lastName.at(0)?.toUpperCase()}`
  }

  return { 
    user,
    getFullName,
    getShortNameWith2Letter,
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