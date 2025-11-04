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

  // Clear any cached auth errors on mount
  React.useEffect(() => {
    queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const { data, isLoading, error, refetch } = useQuery<AuthData>({
    queryKey: ["/api/auth/me", isCustomDomain() ? 'custom' : 'replit'],
    staleTime: isCustomDomain() ? 0 : 5 * 60 * 1000, // Force refresh for custom domain
    gcTime: isCustomDomain() ? 0 : 5 * 60 * 1000, // No caching for custom domain
    refetchOnMount: isCustomDomain() ? 'always' : true, // Always refetch for custom domain
    refetchOnWindowFocus: isCustomDomain() ? 'always' : true, // Always refetch for custom domain
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      console.log('🔍 USEAUTH: Calling /api/auth/me endpoint');
      
      // Check for stored authentication data (localStorage and cookies)
      let storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      
      // CRITICAL FIX: Check cookies if localStorage doesn't have token
      if (!storedToken) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        if (cookies.auth_token) {
          console.log('🍪 USEAUTH: Found token in cookies, storing in localStorage');
          storedToken = cookies.auth_token;
          localStorage.setItem('auth_token', storedToken);
        }
      }
      
      console.log('🔍 USEAUTH: Authentication check:', {
        isCustomDomain: isCustomDomain(),
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        tokenLength: storedToken?.length,
        hasCookie: document.cookie.includes('auth_token')
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
      try {
        const response = await apiRequest("GET", "/api/auth/me");
        const parsedResponse = await response.json();
        console.log('🔍 USEAUTH: Cookie auth response:', parsedResponse);
        
        // Validate response has user data
        if (parsedResponse && parsedResponse.user) {
          console.log('✅ USEAUTH: Valid user data received, authentication successful');
          
          // CRITICAL FIX: Always store token when available (regardless of domain)
          if (parsedResponse.token) {
            console.log('🔐 USEAUTH: Storing authentication token for all domains');
            localStorage.setItem('auth_token', parsedResponse.token);
            localStorage.setItem('user_data', JSON.stringify(parsedResponse.user));
          }
          
          // CRITICAL FIX: Force React Query to update immediately for custom domain
          if (isCustomDomain()) {
            console.log('🔄 CUSTOM DOMAIN: Forcing immediate auth state update');
            // Clear any cached states that might be interfering
            localStorage.setItem('auth_success_timestamp', Date.now().toString());
            
            // Force immediate cache invalidation and re-render
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            queryClient.setQueryData(["/api/auth/me", 'custom'], parsedResponse);
          }
          
          return parsedResponse;
        } else {
          console.log('❌ USEAUTH: No user data in response:', parsedResponse);
          throw new Error('Authentication failed - no user data');
        }
      } catch (authError) {
        console.error('❌ USEAUTH: Authentication failed:', authError);
        
        // On custom domain, clear any stale tokens when auth fails
        if (isCustomDomain()) {
          console.log('🧹 USEAUTH: Clearing stale auth data on custom domain');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
        
        throw authError;
      }
    }
  });

  const logout = async () => {
    console.log('🚪 LOGOUT: Starting logout process');
    
    // Set a timeout to ensure logout completes even if server is unresponsive
    const logoutTimeout = setTimeout(() => {
      console.log('⚠️ LOGOUT: Server timeout, proceeding with client-side cleanup');
      performClientLogout();
    }, 3000); // 3 second timeout
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Try to notify server (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      
      try {
        if (token) {
          // Call logout endpoint with token
          await fetch(buildApiUrl('/api/auth/logout'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            signal: controller.signal
          });
        } else {
          // Fallback to cookie-based logout
          await fetch(buildApiUrl('/api/auth/logout'), {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal
          });
        }
        console.log('✅ LOGOUT: Server logout successful');
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn('⚠️ LOGOUT: Server request timed out');
        } else {
          console.error("❌ LOGOUT: Server logout error:", fetchError);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("❌ LOGOUT: Unexpected error:", error);
    } finally {
      // Clear the main timeout and perform logout
      clearTimeout(logoutTimeout);
      performClientLogout();
    }
  };

  const performClientLogout = () => {
    // Clear ALL stored authentication data
    console.log('🧹 LOGOUT: Clearing local storage and cache');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('auth_success_timestamp');
    
    // Clear all cookies
    try {
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        // Clear for all possible paths and domains
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname}`;
      });
    } catch (cookieError) {
      console.error("❌ LOGOUT: Error clearing cookies:", cookieError);
    }
    
    // Clear React Query cache
    try {
      queryClient.clear();
      console.log('✅ LOGOUT: Query cache cleared');
    } catch (cacheError) {
      console.error("❌ LOGOUT: Error clearing cache:", cacheError);
    }
    
    console.log('🔄 LOGOUT: Redirecting to login page');
    // Force redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100); // Small delay to ensure cleanup completes
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