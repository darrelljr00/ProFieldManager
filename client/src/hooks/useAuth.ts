import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl, isCustomDomain } from "@/lib/api-config";

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

  const { data, isLoading, error, refetch } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      console.log('🔍 USEAUTH: Calling /api/auth/me endpoint');
      
      // Check if we're on custom domain and have stored data
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      
      console.log('🔍 USEAUTH: Initial check:', {
        isCustomDomain: isCustomDomain(),
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        tokenLength: storedToken?.length
      });
      
      // For custom domain with complete stored data, use it directly
      if (isCustomDomain() && storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('🔍 USEAUTH: Using stored data for custom domain:', userData);
          // Still verify token is valid with server
          const response = await fetch(buildApiUrl('/api/auth/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const serverResult = await response.json();
            console.log('🔍 USEAUTH: Server verified stored token, using stored data');
            return { user: userData };
          } else {
            console.log('🔍 USEAUTH: Server rejected stored token, clearing storage');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
          }
        } catch (err) {
          console.error('🚨 USEAUTH: Error with stored data:', err);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
      
      // Try token-based auth for custom domain or if we have a token
      if (storedToken) {
        try {
          console.log('🔍 USEAUTH: Trying token-based auth');
          const response = await fetch(buildApiUrl('/api/auth/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('🔍 USEAUTH: Token auth success:', result);
            return result;
          } else if (response.status === 401) {
            console.log('🔍 USEAUTH: Token invalid, removing');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
          }
        } catch (err) {
          console.error('🚨 USEAUTH: Token auth failed:', err);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
      
      // Fall back to cookie-based auth (for Replit domain)
      console.log('🔍 USEAUTH: Falling back to cookie-based auth');
      const response = await apiRequest("GET", "/api/auth/me");
      console.log('🔍 USEAUTH: Cookie auth response:', response);
      return response;
    },
    retry: false,
    staleTime: 0, // Don't cache auth state to ensure fresh checks
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
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