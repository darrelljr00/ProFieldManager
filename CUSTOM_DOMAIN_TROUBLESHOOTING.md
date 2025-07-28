# Custom Domain Upload Troubleshooting Guide

## Issue: Image uploads fail on profieldmanager.com but work on Replit preview

### Root Cause Analysis:
The authentication system requires users to be logged in from the specific domain they're using. The custom domain (profieldmanager.com) and Replit preview domain have separate authentication contexts.

### Current Status:
- ✅ Database has `cloudinary_url` column
- ✅ All existing files have Cloudinary URLs populated  
- ✅ MediaGallery prioritizes Cloudinary URLs
- ✅ Cloudinary service is properly configured
- ❌ **Authentication token not available on custom domain**

### The Problem:
When users access profieldmanager.com without logging in from that domain, they don't have an authentication token stored in localStorage for that domain. This causes:

1. 401 Unauthorized responses from API calls
2. Upload requests rejected before reaching Cloudinary
3. "Upload failed" errors in frontend

### Solution Steps:

#### For Users:
1. **Login from Custom Domain**: Navigate to https://profieldmanager.com/login
2. **Enter Credentials**: Use your existing username/password
3. **Token Storage**: System will store auth token for profieldmanager.com domain
4. **Test Upload**: Try uploading images after logging in from custom domain

#### For Developers:
1. **Enhanced Authentication Debug**: Added comprehensive logging to track auth tokens
2. **Cross-Domain Token Support**: System supports Bearer token authentication
3. **Fallback Protection**: Prevents broken local file paths on custom domain
4. **Cloudinary Priority**: Always attempts Cloudinary upload first

### Technical Details:

#### Authentication Flow:
```
1. User visits profieldmanager.com (no token)
2. API calls fail with 401 Unauthorized  
3. User must login from profieldmanager.com
4. Token stored in localStorage for profieldmanager.com
5. Subsequent API calls include Bearer token
6. Uploads succeed to Cloudinary
```

#### Upload Process:
```
1. File selected for upload
2. FormData created with file
3. API request to /api/projects/:id/files
4. Authentication middleware checks token
5. If authenticated: Cloudinary upload
6. Database stores cloudinary_url
7. Frontend displays image via proxy
```

### Verification Steps:

1. **Check Authentication**:
   ```javascript
   // In browser console on profieldmanager.com:
   console.log('Auth token:', localStorage.getItem('auth_token'));
   ```

2. **Test API Access**:
   ```javascript
   // Should return user data, not 401:
   fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json())
   ```

3. **Upload Test**:
   - Select small image file
   - Monitor browser network tab
   - Should see 201 response, not 401/500

### Expected Behavior After Fix:
- ✅ Login from profieldmanager.com stores token
- ✅ File uploads succeed to Cloudinary
- ✅ Images display immediately after upload
- ✅ All files stored permanently in cloud
- ✅ No more "Upload failed" errors

### Monitoring:
Server logs will show:
```
🔐 Auth Debug (Enhanced): {
  authMethod: 'Bearer Token',
  hasAuthToken: true,
  ...
}
```

Instead of:
```
🔐 Auth Debug (Enhanced): {
  authMethod: 'None',
  hasAuthToken: false,
  ...
}
```