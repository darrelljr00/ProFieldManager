/**
 * API Configuration for Custom Domain Compatibility
 * 
 * This module handles dynamic API URL detection to ensure API requests
 * work correctly on both the custom domain (profieldmanager.com) and
 * the Replit domain by routing requests to the proper backend server.
 */

export const API_CONFIG = {
  // Custom domain configuration - routes API calls to Replit backend
  customDomain: {
    hostname: 'profieldmanager.com',
    apiBaseUrl: 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev'
  },
  // Replit domain uses relative URLs
  replitDomain: {
    apiBaseUrl: ''
  }
};

/**
 * Get the appropriate API base URL based on current hostname
 * @returns Base URL for API requests
 */
export const getApiBaseUrl = (): string => {
  // Server-side rendering check
  if (typeof window === 'undefined') {
    return '';
  }
  
  const hostname = window.location.hostname;
  
  // Use same-origin requests for custom domain (API served by same server)
  if (hostname === API_CONFIG.customDomain.hostname) {
    console.log('🌐 Custom domain detected - using same-origin API requests');
    return API_CONFIG.replitDomain.apiBaseUrl; // Use empty string for same-origin requests
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
  const endpointStr = String(endpoint || '');
  const cleanEndpoint = endpointStr.startsWith('/') ? endpointStr : `/${endpointStr}`;
  
  const finalUrl = `${baseUrl}${cleanEndpoint}`;
  
  // Enhanced debugging for custom domain uploads
  if (window.location.hostname === 'profieldmanager.com') {
    console.log('🌐 CUSTOM DOMAIN API ROUTING:', {
      originalEndpoint: endpoint,
      cleanEndpoint,
      baseUrl,
      finalUrl,
      timestamp: new Date().toISOString()
    });
  }
  
  return finalUrl;
};

/**
 * Check if current domain is the custom domain
 * @returns True if accessing via custom domain
 */
export const isCustomDomain = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.location.hostname === API_CONFIG.customDomain.hostname;
};

/**
 * Get authentication headers appropriate for current domain
 * @returns Headers object with authentication
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // For custom domain, try Bearer token first, fall back to cookie auth
  if (isCustomDomain()) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // If no Bearer token, rely on cookie authentication (same-origin)
  }
  
  return headers;
};

/**
 * Enhanced login function specifically for custom domain compatibility
 * @param credentials - Login credentials
 * @returns Promise with authentication result
 */
export const authenticateUser = async (credentials: { username: string; password: string; gpsData?: any }) => {
  console.log('🔐 AUTHENTICATION ATTEMPT:', {
    isCustomDomain: isCustomDomain(),
    credentialsKeys: Object.keys(credentials),
    timestamp: new Date().toISOString()
  });
  
  // If on custom domain, route to Replit backend since custom domain API doesn't work
  if (isCustomDomain()) {
    console.log('🌐 CUSTOM DOMAIN DETECTED - Routing to Replit backend');
    console.log('🔐 CREDENTIALS:', { 
      hasUsername: !!credentials.username, 
      hasPassword: !!credentials.password,
      hasGpsData: !!credentials.gpsData,
      usernameLength: credentials.username?.length || 0,
      passwordLength: credentials.password?.length || 0
    });
    
    try {
      // Route to Replit domain since custom domain API is broken
      const fallbackUrl = `${API_CONFIG.customDomain.apiBaseUrl}/api/auth/login`;
      
      console.log('🔄 CROSS-ORIGIN LOGIN URL:', fallbackUrl);
      
      const response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Origin': window.location.origin
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('🔐 FALLBACK LOGIN RESPONSE:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        let errorText = '';
        let errorData = null;
        
        try {
          errorText = await response.text();
          console.log('🚨 FALLBACK ERROR RESPONSE TEXT:', errorText);
          
          try {
            errorData = JSON.parse(errorText);
            console.log('🚨 FALLBACK ERROR RESPONSE JSON:', errorData);
          } catch (jsonError) {
            console.log('🚨 FALLBACK ERROR RESPONSE NOT JSON:', jsonError);
          }
        } catch (textError) {
          console.error('🚨 FAILED TO READ FALLBACK ERROR RESPONSE:', textError);
          errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorData?.message || errorText || `Login failed with status ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('✅ FALLBACK LOGIN SUCCESS DATA:', data);
      } catch (jsonError) {
        console.error('🚨 FAILED TO PARSE FALLBACK SUCCESS RESPONSE:', jsonError);
        throw new Error('Login response was not valid JSON');
      }
      
      // Store token and user data for custom domain use
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('🔐 Token stored for custom domain authentication');
        
        localStorage.setItem('user_data', JSON.stringify(data.user));
        console.log('👤 User data stored for custom domain');
      }
      
      return data;
      
    } catch (error) {
      console.error('🚨 FALLBACK AUTHENTICATION ERROR:', error);
      throw error;
    }
  }
  
  // Original logic for Replit domain
  const loginUrl = buildApiUrl('/api/auth/login');
  
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    console.log('🔐 LOGIN RESPONSE:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      url: response.url
    });
    
    if (!response.ok) {
      let errorText = '';
      let errorData = null;
      
      try {
        errorText = await response.text();
        console.log('🚨 ERROR RESPONSE TEXT:', errorText);
        
        try {
          errorData = JSON.parse(errorText);
          console.log('🚨 ERROR RESPONSE JSON:', errorData);
        } catch (jsonError) {
          console.log('🚨 ERROR RESPONSE NOT JSON:', jsonError);
        }
      } catch (textError) {
        console.error('🚨 FAILED TO READ ERROR RESPONSE:', textError);
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorData?.message || errorText || `Login failed with status ${response.status}`);
    }
    
    let data;
    try {
      data = await response.json();
      console.log('✅ LOGIN SUCCESS DATA:', data);
    } catch (jsonError) {
      console.error('🚨 FAILED TO PARSE SUCCESS RESPONSE:', jsonError);
      throw new Error('Login response was not valid JSON');
    }
    
    return data;
    
  } catch (error) {
    console.error('🚨 AUTHENTICATION ERROR:', error);
    throw error;
  }
};

/**
 * Debug information about current API configuration
 * @returns Configuration debug info
 */
export const getApiConfigDebug = () => {
  if (typeof window === 'undefined') {
    return { serverSide: true };
  }
  
  return {
    hostname: window.location.hostname,
    isCustomDomain: isCustomDomain(),
    apiBaseUrl: getApiBaseUrl(),
    hasAuthToken: !!localStorage.getItem('auth_token'),
    timestamp: new Date().toISOString()
  };
};