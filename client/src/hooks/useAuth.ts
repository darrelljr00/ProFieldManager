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
      
      // Check for stored authentication data
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      
      console.log('🔍 USEAUTH: Authentication check:', {
        isCustomDomain: isCustomDomain(),
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        tokenLength: storedToken?.length
      });
      
      // ALWAYS try token-based auth first if we have a stored token
      if (storedToken) {
        try {
          console.log('🔍 USEAUTH: Attempting token-based authentication');
          const response = await fetch(buildApiUrl('/api/auth/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ USEAUTH: Token authentication successful:', result);
            
            // If we have stored user data, verify it matches server response
            if (storedUser) {
              try {
                const userData = JSON.parse(storedUser);
                if (userData.id === result.user?.id) {
                  console.log('🔍 USEAUTH: Stored user data matches server response');
                  return { user: userData };
                }
              } catch (err) {
                console.warn('⚠️ USEAUTH: Error parsing stored user data:', err);
              }
            }
            
            // Store/update user data if server response is valid
            if (result.user) {
              localStorage.setItem('user_data', JSON.stringify(result.user));
              console.log('🔐 USEAUTH: Updated stored user data');
            }
            
            return result;
          } else if (response.status === 401) {
            console.log('🔍 USEAUTH: Stored token is invalid, clearing storage');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
          } else {
            console.warn('⚠️ USEAUTH: Unexpected response status:', response.status);
          }
        } catch (err) {
          console.error('🚨 USEAUTH: Token authentication error:', err);
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