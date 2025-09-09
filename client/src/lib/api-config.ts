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
  console.log('🔐 SIMPLIFIED AUTHENTICATION:', {
    isCustomDomain: isCustomDomain(),
    hasCredentials: !!credentials.username && !!credentials.password,
    timestamp: new Date().toISOString()
  });
  
  // For custom domain, use same-origin GET request to our login endpoint
  if (isCustomDomain()) {
    console.log('🌐 CUSTOM DOMAIN: Using same-origin authentication');
    
    // Create URL parameters for GET request
    const params = new URLSearchParams({
      username: credentials.username,
      password: credentials.password
    });
    
    if (credentials.gpsData) {
      if (credentials.gpsData.latitude) params.append('latitude', credentials.gpsData.latitude.toString());
      if (credentials.gpsData.longitude) params.append('longitude', credentials.gpsData.longitude.toString());
      if (credentials.gpsData.accuracy) params.append('accuracy', credentials.gpsData.accuracy.toString());
    }
    
    const loginUrl = `/api/auth/login-fallback?${params.toString()}`;
    console.log('🔐 CUSTOM DOMAIN LOGIN URL:', loginUrl);
    
    try {
      const response = await fetch(loginUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'same-origin'
      });
      
      console.log('🔐 CUSTOM DOMAIN RESPONSE:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 CUSTOM DOMAIN LOGIN ERROR:', errorText);
        throw new Error(`Login failed: ${response.status} - Invalid credentials`);
      }
      
      const data = await response.json();
      console.log('✅ CUSTOM DOMAIN LOGIN SUCCESS:', data);
      
      // Store authentication data
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        console.log('🔐 Auth data stored for custom domain');
      }
      
      return data;
      
    } catch (error) {
      console.error('🚨 CUSTOM DOMAIN AUTH ERROR:', error);
      throw new Error('Invalid credentials');
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