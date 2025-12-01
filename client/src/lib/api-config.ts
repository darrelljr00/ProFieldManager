// src/lib/apiConfig.ts
/**
 * Robust API configuration for custom-domain vs replit usage.
 * - Uses safe defaults to avoid "undefined" being embedded into URLs.
 * - Normalizes incoming env values (ensures protocol for API URL).
 * - Provides runtime fallbacks so the app won't break before a rebuild.
 * - Exports helpers: getApiBaseUrl, buildApiUrl, isCustomDomain, getAuthHeaders,
 *   authenticateUser, getApiConfigDebug
 *
 * Important: Vite env vars are injected at build time. If you change .env,
 * you MUST rebuild the frontend for values to take effect.
 */

type ApiConfig = {
  customDomain: {
    hostname: string; // e.g. "profieldmanager.com" (no protocol)
    apiBaseUrl: string; // e.g. "https://profieldmanager.com" or Replit backend url
  };
  replitDomain: {
    apiBaseUrl: string; // usually '' or '/' for relative requests on repl
  };
};

// Read env safely and normalize
const rawHost = (import.meta.env.VITE_PROD_HOSTNAME as string) || "";
const rawApi = (import.meta.env.VITE_PROD_API_URL as string) || "";

// helpers to normalize
const normalizeHostname = (value: string): string => {
  // Strip protocol and trailing slashes -> keep only hostname (ex: mysite.com)
  if (!value) return "";
  try {
    // If someone accidentally passed a full URL, extract hostname
    if (value.includes("://")) {
      const u = new URL(value);
      return u.hostname;
    }
    // remove protocol-like prefix if present and any trailing slashes
    return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
};

const normalizeApiUrl = (value: string): string => {
  if (!value) return "";
  // Ensure there's a protocol. If missing, assume https.
  try {
    if (!value.includes("://")) {
      return `https://${value.replace(/\/+$/, "")}`;
    }
    return value.replace(/\/+$/, ""); // remove trailing slash
  } catch {
    return value;
  }
};

const DEFAULT_HOSTNAME = normalizeHostname(rawHost) || "profieldmanager.com";
const DEFAULT_API_URL = normalizeApiUrl(rawApi) || ""; // leave empty if unknown

export const API_CONFIG: ApiConfig = {
  customDomain: {
    hostname: DEFAULT_HOSTNAME,
    apiBaseUrl: DEFAULT_API_URL,
  },
  replitDomain: {
    apiBaseUrl: "", // relative requests by default
  },
};

/**
 * Runtime detection of custom domain
 */
export const isCustomDomain = (): boolean => {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname || "";
  const href = window.location.href || "";
  const origin = window.location.origin || "";

  // Stored flags (persisted)
  const flag = localStorage.getItem("accessed_from_custom_domain") === "true";
  const sessionFlag = localStorage.getItem("custom_domain_session") === "true";

  // Various heuristics - direct hostname, URL contains, origin contains, flags and referrer
  const directMatch = hostname === API_CONFIG.customDomain.hostname;
  const urlContains = href.includes(API_CONFIG.customDomain.hostname);
  const originContains = origin.includes(API_CONFIG.customDomain.hostname);
  const referrerContains = (document.referrer || "").includes(
    API_CONFIG.customDomain.hostname,
  );

  const result =
    directMatch ||
    urlContains ||
    originContains ||
    flag ||
    sessionFlag ||
    referrerContains;

  // mark for future runs
  if (result && !flag) {
    try {
      localStorage.setItem("accessed_from_custom_domain", "true");
    } catch {
      /* noop */
    }
  }

  return result;
};

/**
 * Decide and return the API base URL at runtime.
 * - If custom domain detected, use configured API URL (if present) or fallback to origin.
 * - If replit domain, use relative base ('') unless configured otherwise.
 */
export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname || "";
  const isCustom = isCustomDomain();

  const customApi = API_CONFIG.customDomain.apiBaseUrl || "";
  const replitApi = API_CONFIG.replitDomain.apiBaseUrl || "";

  if (isCustom) {
    // prefer explicit custom API URL; fallback to current origin
    return customApi || window.location.origin;
  }

  // non-custom (replit or others) - prefer replitApi (which is usually '') or relative
  return replitApi || "";
};

/**
 * Normalize an endpoint into a final URL string.
 * If base is empty -> return a relative URL starting with '/'
 */
export const buildApiUrl = (endpoint: string): string => {
  if (typeof window === "undefined") return endpoint || "";

  const base = getApiBaseUrl();
  const raw = String(endpoint || "");
  const clean = raw.startsWith("/") ? raw : `/${raw}`;

  if (!base) return clean; // relative URL

  // Avoid double slashes
  return `${base.replace(/\/+$/, "")}${clean}`;
};

/**
 * Authentication helpers
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const token = localStorage.getItem("auth_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore storage errors in privacy modes
  }

  return headers;
};

/**
 * Authenticate user (POST). This function will:
 * - pick the correct login URL depending on domain
 * - send credentials and store token+user on success
 */
export const authenticateUser = async (credentials: {
  username: string;
  password: string;
  gpsData?: any;
}) => {
  if (typeof window === "undefined") {
    throw new Error("authenticateUser must be called from browser");
  }

  const isCustom = isCustomDomain();
  const base = getApiBaseUrl();
  const loginUrl = isCustom ? `${base}/api/auth/login` : `/api/auth/login`;

  // Build payload
  const body = {
    username: credentials.username,
    password: credentials.password,
    gpsData: credentials.gpsData ?? null,
  };

  try {
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });

    // Log debug info (safe)
    console.debug("[auth] request:", {
      loginUrl,
      isCustom,
      status: res.status,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[auth] login failed:", {
        loginUrl,
        status: res.status,
        body: text,
      });
      throw new Error(`Login failed (status ${res.status})`);
    }

    const data = await res.json();

    if (data?.token) {
      try {
        localStorage.setItem("auth_token", data.token);
        if (data.user)
          localStorage.setItem("user_data", JSON.stringify(data.user));
        if (isCustom) {
          localStorage.setItem("custom_domain_session", "true");
          localStorage.setItem("accessed_from_custom_domain", "true");
        }
      } catch {
        // ignore localStorage write errors
      }
    } else {
      console.warn("[auth] response missing token:", data);
    }

    return data;
  } catch (err) {
    console.error("[auth] error:", err);
    throw err;
  }
};

/**
 * Debug helper - returns info about the current runtime API config
 */
export const getApiConfigDebug = () => {
  if (typeof window === "undefined") {
    return { serverSide: true };
  }

  const hostname = window.location.hostname || "";
  const apiBase = getApiBaseUrl();
  const customFlag = isCustomDomain();

  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem("auth_token");
  } catch {
    hasToken = false;
  }

  return {
    hostname,
    isCustomDomain: customFlag,
    apiBaseUrl: apiBase,
    env_custom_hostname: API_CONFIG.customDomain.hostname,
    env_custom_apiBase: API_CONFIG.customDomain.apiBaseUrl,
    hasAuthToken: hasToken,
    timestamp: new Date().toISOString(),
  };
};

export default {
  API_CONFIG,
  isCustomDomain,
  getApiBaseUrl,
  buildApiUrl,
  getAuthHeaders,
  authenticateUser,
  getApiConfigDebug,
};
