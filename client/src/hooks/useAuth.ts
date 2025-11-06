import React, { useEffect } from "react";
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
  user: User | null;
  token?: string;
}

const isOnLoginRoute = () => {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return (
    p === "/login" ||
    p === "/login-full" ||
    p === "/login-simple" ||
    p === "/universal-login" ||
    p === "/"
  );
};

export function useAuth() {
  const queryClient = useQueryClient();

  // Optional: clear cached /api/auth/me on mount to avoid stale states
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const { data, isLoading, error } = useQuery<AuthData>({
    queryKey: ["/api/auth/me", isCustomDomain() ? "custom" : "replit"],
    staleTime: isCustomDomain() ? 0 : 5 * 60 * 1000,
    gcTime: isCustomDomain() ? 0 : 5 * 60 * 1000,
    refetchOnMount: isCustomDomain() ? "always" : true,
    refetchOnWindowFocus: isCustomDomain() ? "always" : true,
    retry: 2,
    retryDelay: 800,
    queryFn: async () => {
      // 0) If we are on a login-like page, DO NOT auto-auth with cookies.
      const onLoginPage = isOnLoginRoute();

      // 1) Try token-based auth first
      let storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("user_data");

      // Try to recover token from cookie if missing
      if (!storedToken && typeof document !== "undefined") {
        const cookies = document.cookie.split(";").reduce(
          (acc, cookie) => {
            const [key, value] = cookie.trim().split("=");
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        );
        if (cookies.auth_token) {
          storedToken = cookies.auth_token;
          localStorage.setItem("auth_token", storedToken);
        }
      }

      if (storedToken) {
        try {
          const res = await fetch(buildApiUrl("/api/auth/me"), {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (res.ok) {
            const result = await res.json();

            // If we have stored user, prefer it if ids match
            if (storedUser) {
              try {
                const u = JSON.parse(storedUser);
                if (u?.id === result?.user?.id) {
                  return { user: u, token: storedToken };
                }
              } catch {}
            }

            if (result?.user) {
              localStorage.setItem("user_data", JSON.stringify(result.user));
              return { user: result.user, token: storedToken };
            }
          } else if (res.status === 401) {
            // Bad token
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_data");
          }
        } catch {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");
        }
      }

      // 2) Cookie fallback (server session) — ONLY if not on the login page
      if (!onLoginPage) {
        try {
          const response = await apiRequest("GET", "/api/auth/me"); // credentials: "include" inside
          const parsed = await response.json();
          if (parsed?.user) {
            if (parsed.token) {
              localStorage.setItem("auth_token", parsed.token);
            }
            localStorage.setItem("user_data", JSON.stringify(parsed.user));
            return { user: parsed.user, token: parsed.token };
          }
        } catch {
          // ignore
        }
      } else {
        console.log("🔒 On a login route — skipping cookie auto-auth.");
      }

      return { user: null };
    },
  });

  const logout = async () => {
    console.log("🚪 LOGOUT: start");

    // Always call server logout to clear HttpOnly cookies (token or not)
    try {
      await fetch(buildApiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    // Some backends only support GET
    try {
      await fetch(buildApiUrl("/api/auth/logout"), {
        method: "GET",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }

    // Local cleanup
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_success_timestamp");
    localStorage.removeItem("intended_destination");

    // Best-effort cookie cleanup (won’t remove HttpOnly; server did that above)
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname}`;
      });
    }

    // Nuke cache and go to login (hard redirect to avoid race with stale state)
    const { clear } = await import("@tanstack/react-query");
    // ^ safe: but if you don't want dynamic import, just:
    // queryClient.clear();
    // I’ll call the instance directly:
    queryClient.clear();

    console.log("✅ LOGOUT: complete → /login");
    window.location.replace("/login?logged_out=1");
  };

  return {
    user: data?.user ?? null,
    isAuthenticated: !!data?.user,
    isAdmin: data?.user?.role === "admin" || data?.user?.role === "superadmin",
    isLoading,
    error,
    logout,
  };
}
