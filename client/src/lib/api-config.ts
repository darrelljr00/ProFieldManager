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
  
  const isCustom = window.location.hostname === API_CONFIG.customDomain.hostname;
  console.log('🔍 CUSTOM DOMAIN CHECK:', {
    hostname: window.location.hostname,
    expectedCustomDomain: API_CONFIG.customDomain.hostname,
    isCustomDomain: isCustom
  });
  return isCustom;
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
    console.log('🔐 CUSTOM DOMAIN AUTH HEADERS:', {
      hasToken: !!token,
      tokenLength: token?.length,
      isCustomDomain: true
    });
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // If no Bearer token, rely on cookie authentication (same-origin)
  } else {
    console.log('🔐 REPLIT DOMAIN AUTH HEADERS: Using cookie auth');
  }
  
  return headers;
};

/**
 * Enhanced login function specifically for custom domain compatibility
 * @param credentials - Login credentials
 * @returns Promise with authentication result
 */
export const authenticateUser = async (credentials: { username: string; password: string; gpsData?: any }) => {
  console.log('🔐 SIMPLIFIED AUTHENTICATION:', {
    isCustomDomain: isCustomDomain(),
    hasCredentials: !!credentials.username && !!credentials.password,
    timestamp: new Date().toISOString()
  });
  
  // For custom domain, authenticate directly with Replit server
  if (isCustomDomain()) {
    console.log('🌐 CUSTOM DOMAIN: Using direct Replit server authentication');
    
    // Direct connection to Replit server
    const replitServerUrl = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
    const loginUrl = `${replitServerUrl}/api/auth/login`;
    
    console.log('🔐 CUSTOM DOMAIN -> REPLIT SERVER:', loginUrl);
    
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          gpsData: credentials.gpsData
        })
      });
      
      console.log('🔐 CUSTOM DOMAIN RESPONSE:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      console.log('🔐 Custom domain response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 CUSTOM DOMAIN LOGIN ERROR:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Login failed - Invalid credentials`);
      }
      
      const data = await response.json();
      console.log('✅ CUSTOM DOMAIN LOGIN SUCCESS:', data);
      
      // Store authentication data for custom domain
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        console.log('🔐 Custom domain auth data stored successfully');
      } else {
        console.warn('⚠️ No token received in response:', data);
      }
      
      return data;
      
    } catch (error) {
      console.error('🚨 CUSTOM DOMAIN AUTH ERROR:', {
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack
      });
      // Preserve the original error message
      throw error;
    }
  }
  
  // For Replit domain, use regular POST
  console.log('🔧 REPLIT DOMAIN: Using regular POST authentication');
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 REPLIT LOGIN ERROR:', errorText);
      throw new Error('Invalid credentials');
    }
    
    const data = await response.json();
    console.log('✅ REPLIT LOGIN SUCCESS:', data);
    return data;
    
  } catch (error) {
    console.error('🚨 REPLIT AUTH ERROR:', error);
    throw new Error('Invalid credentials');
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