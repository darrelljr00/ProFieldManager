# Custom Domain Upload Fix - Comprehensive Solution

## Problem Analysis
The custom domain `profieldmanager.com` is configured as **static website hosting** instead of properly proxying API requests to our Express server. This causes:

- Upload API requests return HTML frontend instead of JSON responses
- Server never receives custom domain requests (no logs appear)
- Authentication works (some endpoints cached) but uploads fail
- Perfect functionality on Replit domain confirms our backend is correct

## Solution 1: Replit Deployment Configuration Fix (RECOMMENDED)

### Current Issue
Custom domain is configured for static hosting instead of full-stack app deployment

### Fix Steps
1. **Check Deployment Type**: Ensure the Replit deployment is configured as "Web Service" not "Static Site"
2. **Verify DNS Configuration**: Custom domain should proxy ALL requests to the Express server
3. **Update Deployment Settings**: Configure custom domain to handle both static assets AND API routes

### Implementation
```yaml
# .replit deployment configuration
[deployment]
run = ["node", "server/index.ts"]
deploymentTarget = "gce"  # Ensures full server deployment
```

## Solution 2: Frontend API URL Detection (IMMEDIATE WORKAROUND)

Implement dynamic API URL detection to use correct endpoints based on domain.

### Implementation
```typescript
// lib/api-config.ts
export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return ''; // Server-side
  
  const hostname = window.location.hostname;
  
  // Use Replit domain for API calls when on custom domain
  if (hostname === 'profieldmanager.com') {
    return 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
  }
  
  // Use current domain for Replit hosting
  return '';
};

// Update apiRequest to use dynamic base URL
export const apiRequest = async (method: string, url: string, data?: any) => {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl + url;
  
  // Rest of implementation...
};
```

## Solution 3: Custom Domain Proxy Server (COMPREHENSIVE)

Create a proxy server that properly routes requests between static assets and API endpoints.

### Proxy Configuration
```javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// API proxy configuration
const apiProxy = createProxyMiddleware({
  target: 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Keep API prefix
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`Proxying API request: ${req.method} ${req.url}`);
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(502).json({ error: 'API service unavailable' });
    }
  }
});

// Proxy all API requests to backend server
app.use('/api', apiProxy);

// Serve static files for everything else
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Custom domain proxy server running on port ${PORT}`);
});
```

## Solution 4: Environment-Based API Configuration

Configure different API endpoints based on the environment.

### Environment Detection
```typescript
// config/api.ts
export const API_CONFIG = {
  // Production custom domain uses Replit backend
  production: {
    customDomain: 'profieldmanager.com',
    apiBaseUrl: 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api'
  },
  // Development uses local backend
  development: {
    customDomain: null,
    apiBaseUrl: '/api'
  }
};

export const getApiUrl = (endpoint: string) => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const config = hostname === 'profieldmanager.com' ? API_CONFIG.production : API_CONFIG.development;
  
  return `${config.apiBaseUrl}${endpoint}`;
};
```

## Implementation Priority

1. **Immediate Fix**: Implement Solution 2 (Frontend API URL Detection)
2. **Short-term**: Configure Replit deployment properly (Solution 1)  
3. **Long-term**: Consider custom proxy server if needed (Solution 3)

## Testing Strategy

1. Test upload functionality on custom domain after each solution
2. Verify authentication continues to work
3. Confirm static assets load properly
4. Monitor server logs for proper request routing

## Expected Results

- ✅ Custom domain uploads work correctly
- ✅ Authentication remains functional  
- ✅ Static assets serve properly
- ✅ Backend receives all API requests
- ✅ Cloudinary integration works seamlessly