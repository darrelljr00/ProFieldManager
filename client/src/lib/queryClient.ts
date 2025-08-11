import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl, getAuthHeaders, isCustomDomain } from './api-config';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle unauthorized access - store intended destination
    if (res.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/signup') {
        localStorage.setItem('intended_destination', currentPath);
      }
    }
    
    const text = (await res.text()) || res.statusText;
    console.error('❌ HTTP Error Response:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries()),
      body: text
    });
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Build the full URL using API configuration
  const fullUrl = buildApiUrl(url);
  
  // Get appropriate headers for current domain
  let headers = getAuthHeaders();
  let body: string | FormData | undefined;

  if (data instanceof FormData) {
    // For FormData, don't set Content-Type - let browser set multipart boundary
    // Remove Content-Type from headers if it exists
    delete headers['Content-Type'];
    body = data;
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  console.log('🌐 API Request:', {
    method,
    originalUrl: url,
    fullUrl,
    isCustomDomain: isCustomDomain(),
    hasAuthHeader: !!headers.Authorization,
    hasFormData: data instanceof FormData,
    formDataEntries: data instanceof FormData ? Array.from(data.entries()).map(([key, value]) => ({
      key,
      value: value instanceof File ? { name: value.name, size: value.size, type: value.type } : value
    })) : undefined
  });

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: "include", // Always include credentials for authentication
  });

  console.log('📡 API Response:', {
    originalUrl: url,
    fullUrl,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries())
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construct URL from query key array
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      // For arrays like ['/api/projects', projectId, 'tasks'], join them
      url = queryKey.filter(Boolean).join('/');
    } else {
      // For simple string queries, use as-is
      url = queryKey[0] as string;
    }
    
    // Build the full URL using API configuration
    const fullUrl = buildApiUrl(url);
    
    // Get appropriate headers for current domain
    const headers = getAuthHeaders();
    
    console.log('🌐 Query Request:', {
      originalUrl: url,
      fullUrl,
      isCustomDomain: isCustomDomain(),
      hasAuthHeader: !!headers.Authorization
    });
    
    const res = await fetch(fullUrl, {
      headers,
      credentials: isCustomDomain() ? "omit" : "include", // Don't send cookies for cross-origin requests
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
