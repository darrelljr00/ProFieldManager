import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authData, isLoading, error } = useQuery<{user: User}>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/me');
        if (!response.ok) {
          // Store current path as intended destination for unauthorized access
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/signup') {
            localStorage.setItem('intended_destination', currentPath);
          }
          throw new Error(`Auth failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.log('Auth check failed:', error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry 401 errors (authentication failures)
      if (error.message?.includes('401')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    staleTime: 30 * 1000, // 30 seconds (reduced for better responsiveness)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const user = authData?.user;

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      // Still redirect to login even if logout fails
      queryClient.clear();
      setLocation("/login");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const changePassword = (currentPassword: string, newPassword: string) => {
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const isAuthenticated = Boolean(user && !error);
  const isAdmin = Boolean(user?.role === "admin");
  const isManager = Boolean(user?.role === "manager");
  const isManagerOrAdmin = Boolean(isAdmin || isManager);

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isManager,
    isManagerOrAdmin,
    logout,
    changePassword,
    changePasswordMutation,
  };
}