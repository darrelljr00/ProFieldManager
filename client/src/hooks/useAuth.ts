import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organizationId: number;
  [key: string]: any;
}

interface AuthData {
  user: User;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Force clear auth cache to test fresh data fetch
  React.useEffect(() => {
    console.log('🔍 USEAUTH: Force clearing auth cache to get updated permissions');
    queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    
    // Also clear navigation cache to ensure fresh navigation rendering
    queryClient.removeQueries({ queryKey: ["/api/navigation-order"] });
    queryClient.invalidateQueries({ queryKey: ["/api/navigation-order"] });
  }, []);

  const { data, isLoading, error, refetch } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      console.log('🔍 USEAUTH: Calling /api/auth/me endpoint');
      
      // Try to get token from localStorage first (for custom domain)
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedToken) {
        try {
          console.log('🔍 USEAUTH: Using stored token for auth');
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('🔍 USEAUTH: Auth success with stored token:', result);
            return result;
          } else if (response.status === 401) {
            console.log('🔍 USEAUTH: Stored token invalid, removing');
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        } catch (err) {
          console.error('Auth with stored token failed:', err);
          localStorage.removeItem('auth_token');
        }
      }
      
      // Fall back to cookie-based auth (for Replit domain)
      console.log('🔍 USEAUTH: Falling back to cookie-based auth');
      const response = await apiRequest("GET", "/api/auth/me");
      console.log('🔍 USEAUTH: Cookie auth response:', response);
      return response;
    },
    retry: false,
    staleTime: 0, // Always check for fresh auth data
    gcTime: 0, // Don't cache auth data - updated from cacheTime to gcTime for TanStack Query v5
  });

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear stored token
      localStorage.removeItem('auth_token');
      // Clear React Query cache
      queryClient.clear();
      // Redirect to login
      window.location.href = '/login';
    }
  };

  return {
    user: data?.user,
    isAuthenticated: !!data?.user,
    isAdmin: data?.user?.role === 'admin' || data?.user?.role === 'superadmin',
    isLoading,
    error,
    logout
  };
}