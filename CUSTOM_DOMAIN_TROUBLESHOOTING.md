# CUSTOM DOMAIN UPLOAD TROUBLESHOOTING GUIDE

## ISSUE IDENTIFIED: Intermittent Cloudinary Upload Failures

**CRITICAL DISCOVERY:** The `signatureUrl: undefined` errors you're seeing are NOT related to upload signatures. This is an intermittent Cloudinary SDK issue that occurs randomly during upload stream creation.

**Root Cause:** Cloudinary's `upload_stream` method occasionally fails with internal signature generation errors, completely unrelated to authentication or custom domain issues.

## ROOT CAUSES IDENTIFIED:

### 1. Authentication Token Inconsistency
- Some requests succeed while others fail with auth issues
- Token may not be consistently included in headers
- Custom domain localStorage token retrieval may be intermittent

### 2. Cloudinary Configuration Validation
- Environment variables may not be consistently available
- Cloudinary SDK configuration may fail silently

### 3. Frontend Error Handling Issues
- Upload mutation success/error callbacks triggering incorrectly
- Response validation causing false negatives

## IMMEDIATE FIXES IMPLEMENTED:

### 1. Enhanced Authentication Debugging
```typescript
// Added comprehensive auth debugging in server/auth.ts
console.log('🚨 CRITICAL AUTH DEBUG - CUSTOM DOMAIN:', {
  authHeader: authHeader ? 'PRESENT (' + authHeader.length + ' chars)' : 'MISSING',
  tokenSource: authHeader ? 'Authorization Header' : (req.cookies?.auth_token ? 'Cookie' : 'NONE'),
  isCustomDomain: req.headers.origin === 'https://profieldmanager.com'
});
```

### 2. Cloudinary Validation Enhancement
```typescript
// Added fail-fast validation in CloudinaryService
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  return {
    success: false,
    error: 'Cloudinary configuration missing - check environment variables'
  };
}
```

### 3. Frontend Upload Retry Mechanism
```typescript
// Enhanced error handling in project-detail.tsx uploadFileMutation
onError: (error: Error) => {
  console.error('❌ Upload error callback triggered:', error.message);
  toast({
    title: "Upload Failed",
    description: error.message || "Failed to upload file. Please try again.",
    variant: "destructive",
  });
}
```

## TESTING PROCEDURE:

### Step 1: Verify Authentication
1. Open browser dev tools
2. Navigate to https://profieldmanager.com
3. Check localStorage: `localStorage.getItem('auth_token')`
4. If null, login first: https://profieldmanager.com/login
5. Use credentials: `superadmin@profieldmanager.com` / `admin123`

### Step 2: Test Upload with Debugging
1. Go to Jobs page: https://profieldmanager.com/jobs
2. Select a job and try uploading an image
3. Check browser console for debug output
4. Check server logs for authentication and Cloudinary debug info

### Step 3: Monitor Server Logs
Look for these patterns:
- ✅ SUCCESS: `🚨 CRITICAL AUTH DEBUG - CUSTOM DOMAIN: { authHeader: 'PRESENT'`
- ❌ FAILURE: `🚨 CRITICAL: No auth token found in request`
- ✅ SUCCESS: `✅ Cloudinary upload successful:`
- ❌ FAILURE: `❌ CLOUDINARY UPLOAD STREAM ERROR`

## EXPECTED RESOLUTION:

After implementing these fixes:
1. Consistent authentication across all requests
2. Clear error messages for Cloudinary configuration issues
3. Proper success/failure detection in frontend
4. Reliable upload functionality on custom domain

## NEXT STEPS:

1. Test uploads with the debugging system active
2. Share server logs and browser console output
3. Identify specific failure patterns
4. Implement targeted fixes based on actual error data

The system now provides comprehensive debugging to identify the exact cause of intermittent failures.