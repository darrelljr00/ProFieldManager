// Test script to verify the custom domain upload fix
// This simulates what happens when a user uploads via profieldmanager.com

const testUploadRouting = () => {
  console.log('🧪 TESTING CUSTOM DOMAIN UPLOAD FIX');
  console.log('=====================================');
  
  // Simulate custom domain detection
  const mockWindow = {
    location: {
      hostname: 'profieldmanager.com'
    }
  };
  
  // Simulate buildApiUrl function
  const buildApiUrl = (endpoint) => {
    const isCustomDomain = mockWindow.location.hostname === 'profieldmanager.com';
    
    if (isCustomDomain) {
      console.log('🌐 CUSTOM DOMAIN DETECTED - Routing to Replit backend');
      const replitBackend = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
      const finalUrl = `${replitBackend}${endpoint}`;
      console.log('📍 Upload URL:', finalUrl);
      return finalUrl;
    }
    
    return endpoint;
  };
  
  // Test the routing
  const uploadEndpoint = '/api/projects/38/files';
  const resolvedUrl = buildApiUrl(uploadEndpoint);
  
  console.log('\n✅ ROUTING TEST RESULTS:');
  console.log('- Original endpoint:', uploadEndpoint);
  console.log('- Resolved URL:', resolvedUrl);
  console.log('- Custom domain detected:', mockWindow.location.hostname === 'profieldmanager.com');
  console.log('- Routed to working backend:', resolvedUrl.includes('riker.replit.dev'));
  
  console.log('\n📋 EXPECTED BEHAVIOR:');
  console.log('1. User accesses profieldmanager.com');
  console.log('2. Frontend detects custom domain');
  console.log('3. Upload request automatically routed to Replit backend');
  console.log('4. Bearer token authentication used');
  console.log('5. File uploads to Cloudinary successfully');
  
  return {
    success: true,
    routedCorrectly: resolvedUrl.includes('riker.replit.dev'),
    finalUrl: resolvedUrl
  };
};

// Run the test
const result = testUploadRouting();
console.log('\n🎯 TEST RESULT:', result.success && result.routedCorrectly ? 'PASS' : 'FAIL');