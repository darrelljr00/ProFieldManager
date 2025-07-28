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
  
  // Use Replit backend when accessing via custom domain
  if (hostname === API_CONFIG.customDomain.hostname) {
    console.log('🌐 Custom domain detected - routing API calls to Replit backend');
    return API_CONFIG.customDomain.apiBaseUrl;
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
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${cleanEndpoint}`;
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // For custom domain, always use Bearer token from localStorage
  if (isCustomDomain()) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
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