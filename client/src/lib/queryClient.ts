import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let headers: Record<string, string> = {};
  let body: string | FormData | undefined;

  if (data instanceof FormData) {
    // For FormData, don't set Content-Type - let browser set multipart boundary
    body = data;
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  console.log('🌐 API Request:', {
    method,
    url,
    hasFormData: data instanceof FormData,
    formDataEntries: data instanceof FormData ? Array.from(data.entries()).map(([key, value]) => ({
      key,
      value: value instanceof File ? { name: value.name, size: value.size, type: value.type } : value
    })) : undefined
  });

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  console.log('📡 API Response:', {
    url,
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
    
    const res = await fetch(url, {
      credentials: "include",
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
