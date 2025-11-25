export const API_CONFIG = {
  // Custom domain configuration - routes API calls to Replit backend
  customDomain: {
    hostname: import.meta.env.VITE_PROD_HOSTNAME,
    apiBaseUrl: import.meta.env.VITE_PROD_API_URL,
  },
  // Replit domain uses relative URLs
  replitDomain: {
    apiBaseUrl: "",
  },
};

/**
 * Get the appropriate API base URL based on the current hostname
 * @returns Base URL for API requests
 */
export const getApiBaseUrl = (): string => {
  // Server-side rendering check
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = window.location.hostname;

  // CRITICAL FIX: For custom domain, ALWAYS route API calls to Replit backend
  if (hostname === API_CONFIG.customDomain.hostname || isCustomDomain()) {
    console.log(
      "🌐 Custom domain detected - routing ALL API calls to Replit backend:",
      API_CONFIG.customDomain.apiBaseUrl,
    );
    return API_CONFIG.customDomain.apiBaseUrl; // Route to Replit backend
  }

  // Use relative URLs for Replit domain
  return API_CONFIG.replitDomain.apiBaseUrl;
};

/**
 * Build complete API URL for a given endpoint
 * @param endpoint - API endpoint path (e.g., '/api/projects')
 * @returns Complete URL for the API request
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();

  // Ensure endpoint is a string and starts with /
  const endpointStr = String(endpoint || "");
  const cleanEndpoint = endpointStr.startsWith("/")
    ? endpointStr
    : `/${endpointStr}`;

  const finalUrl = `${baseUrl}${cleanEndpoint}`;

  // Enhanced debugging for custom domain uploads
  if (window.location.hostname === "profieldmanager.com") {
    console.log("🌐 CUSTOM DOMAIN API ROUTING:", {
      originalEndpoint: endpoint,
      cleanEndpoint,
      baseUrl,
      finalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  return finalUrl;
};

/**
 * Check if current domain is the custom domain
 * @returns True if accessing via custom domain
 */
export const isCustomDomain = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  // Check multiple indicators for custom domain access
  const hostname = window.location.hostname;
  const href = window.location.href;
  const origin = window.location.origin;

  // Clear only domain-specific flags when on Replit domain (preserve auth tokens)
  if (hostname.includes("replit.dev") || hostname.includes("repl.co")) {
    // console.log('🧹 CLEARING STALE CUSTOM DOMAIN FLAGS - We are on Replit domain');
    localStorage.removeItem("accessed_from_custom_domain");
    localStorage.removeItem("custom_domain_session");
    // CRITICAL FIX: Do NOT clear auth_token - it's needed for API authentication
  }

  // Direct hostname match
  const directMatch = hostname === API_CONFIG.customDomain.hostname;

  // Check if URL contains custom domain
  const urlContainsCustomDomain = href.includes(
    API_CONFIG.customDomain.hostname,
  );

  // Check if we're making requests to custom domain (for proxied scenarios)
  const originContainsCustomDomain = origin.includes(
    API_CONFIG.customDomain.hostname,
  );

  // NEW: Check if we have a stored flag indicating custom domain access
  // This handles proxy/iframe scenarios where JS context doesn't show real domain
  const hasCustomDomainFlag =
    localStorage.getItem("accessed_from_custom_domain") === "true";

  // NEW: Check document referrer for proxy scenarios
  const referrerFromCustomDomain = document.referrer.includes(
    API_CONFIG.customDomain.hostname,
  );

  // NEW: Check if we're receiving login requests from custom domain
  const hasCustomDomainSession =
    localStorage.getItem("custom_domain_session") === "true";

  const isCustom =
    directMatch ||
    urlContainsCustomDomain ||
    originContainsCustomDomain ||
    hasCustomDomainFlag ||
    referrerFromCustomDomain ||
    hasCustomDomainSession;

  // Disabled to reduce console noise - uncomment for debugging
  // console.log('🔍 ENHANCED CUSTOM DOMAIN CHECK:', {
  //   hostname,
  //   href,
  //   origin,
  //   expectedCustomDomain: API_CONFIG.customDomain.hostname,
  //   directMatch,
  //   urlContainsCustomDomain,
  //   originContainsCustomDomain,
  //   hasCustomDomainFlag,
  //   referrerFromCustomDomain,
  //   hasCustomDomainSession,
  //   documentReferrer: document.referrer,
  //   finalResult: isCustom
  // });

  // If we detect custom domain access, store the flag for future requests
  if (isCustom && !hasCustomDomainFlag) {
    localStorage.setItem("accessed_from_custom_domain", "true");
    console.log("🏷️ MARKED AS CUSTOM DOMAIN ACCESS");
  }

  return isCustom;
};

/**
 * Get authentication headers appropriate for current domain
 * @returns Headers object with authentication
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};

  // CRITICAL FIX: Always check for stored token first, regardless of domain
  const token = localStorage.getItem("auth_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    // Disabled to reduce console noise - uncomment for debugging
    // console.log('✅ AUTH HEADERS: Using Bearer token authentication', {
    //   hasToken: true,
    //   tokenLength: token.length,
    //   isCustomDomain: isCustomDomain()
    // });
  } else {
    // console.log('🔐 AUTH HEADERS: No token found, falling back to cookie auth', {
    //   isCustomDomain: isCustomDomain()
    // });
  }

  return headers;
};

/**
 * Enhanced login function specifically for custom domain compatibility
 * @param credentials - Login credentials
 * @returns Promise with authentication result
 */
export const authenticateUser = async (credentials: {
  username: string;
  password: string;
  gpsData?: any;
}) => {
  console.log("🔐 SIMPLIFIED AUTHENTICATION:", {
    isCustomDomain: isCustomDomain(),
    hasCredentials: !!credentials.username && !!credentials.password,
    timestamp: new Date().toISOString(),
  });

  // For custom domain, authenticate directly with Replit server
  if (isCustomDomain()) {
    console.log("🌐 CUSTOM DOMAIN: Using direct Replit server authentication");

    // Direct connection to Replit server
    const replitServerUrl = import.meta.env.VITE_PROD_API_URL;
    const loginUrl = `${replitServerUrl}/api/auth/login`;

    console.log("🔐 CUSTOM DOMAIN -> REPLIT SERVER:", loginUrl);

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          gpsData: credentials.gpsData,
        }),
      });

      console.log("🔐 CUSTOM DOMAIN RESPONSE:", {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      console.log(
        "🔐 Custom domain response status:",
        response.status,
        response.ok,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🚨 CUSTOM DOMAIN LOGIN ERROR:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
        throw new Error(`Login failed - Invalid credentials`);
      }

      const data = await response.json();
      console.log("✅ CUSTOM DOMAIN LOGIN SUCCESS:", data);

      // For custom domain, ensure we return the authentication data WITHOUT redirecting
      // ALWAYS store authentication data regardless of domain detection
      if (data.token && data.user) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));
        console.log(
          "🔐 CUSTOM DOMAIN AUTH STORED - STAYING ON CUSTOM DOMAIN:",
          {
            hasToken: !!data.token,
            hasUser: !!data.user,
            tokenLength: data.token.length,
            userName: data.user.username,
            currentDomain: window.location.hostname,
          },
        );

        // Immediately verify stored data
        const verifyToken = localStorage.getItem("auth_token");
        const verifyUser = localStorage.getItem("user_data");
        console.log("🔍 STORAGE VERIFICATION:", {
          tokenStored: !!verifyToken,
          userStored: !!verifyUser,
          tokenMatch: verifyToken === data.token,
          userParseable: (() => {
            try {
              const parsed = JSON.parse(verifyUser || "");
              return parsed.username === data.user.username;
            } catch {
              return false;
            }
          })(),
        });
      } else {
        console.error("⚠️ MISSING AUTH DATA:", {
          hasToken: !!data.token,
          hasUser: !!data.user,
          fullResponse: data,
        });
      }

      return data;
    } catch (error) {
      console.error("🚨 CUSTOM DOMAIN AUTH ERROR:", {
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      });
      // Preserve the original error message
      throw error;
    }
  }

  // For Replit domain, use regular POST
  console.log("🔧 REPLIT DOMAIN: Using regular POST authentication");

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 REPLIT LOGIN ERROR:", errorText);
      throw new Error("Invalid credentials");
    }

    const data = await response.json();
    console.log("✅ REPLIT LOGIN SUCCESS:", data);

    // Also store token for Replit domain to ensure consistency
    if (data.token && data.user) {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_data", JSON.stringify(data.user));
      console.log("🔐 REPLIT DOMAIN AUTH DATA STORED");
    }

    return data;
  } catch (error) {
    console.error("🚨 REPLIT AUTH ERROR:", error);

    // FALLBACK: Try login-fallback endpoint as last resort
    console.log("🔄 ATTEMPTING LOGIN-FALLBACK AS FINAL FALLBACK");
    try {
      const fallbackResponse = await fetch(
        "/api/auth/login-fallback?" +
          new URLSearchParams({
            username: credentials.username,
            password: credentials.password,
          }),
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log("✅ LOGIN-FALLBACK SUCCESS:", fallbackData);

        // CRITICAL: Store the token from fallback response
        if (fallbackData.token && fallbackData.user) {
          localStorage.setItem("auth_token", fallbackData.token);
          localStorage.setItem("user_data", JSON.stringify(fallbackData.user));
          console.log("🔐 FALLBACK TOKEN STORED SUCCESSFULLY");

          // If server indicates this was a custom domain request, set the flag
          if (fallbackData.isCustomDomain) {
            localStorage.setItem("custom_domain_session", "true");
            localStorage.setItem("accessed_from_custom_domain", "true");
            console.log(
              "🏷️ CUSTOM DOMAIN SESSION FLAG SET FROM SERVER RESPONSE",
            );
          }
        }

        return fallbackData;
      }
    } catch (fallbackError) {
      console.error("🚨 LOGIN-FALLBACK ALSO FAILED:", fallbackError);
    }

    throw new Error("Invalid credentials");
  }
};

/**
 * Debug information about current API configuration
 * @returns Configuration debug info
 */
export const getApiConfigDebug = () => {
  if (typeof window === "undefined") {
    return { serverSide: true };
  }

  return {
    hostname: window.location.hostname,
    isCustomDomain: isCustomDomain(),
    apiBaseUrl: getApiBaseUrl(),
    hasAuthToken: !!localStorage.getItem("auth_token"),
    timestamp: new Date().toISOString(),
  };
};
