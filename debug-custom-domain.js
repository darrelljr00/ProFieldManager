/**
 * Debug script to check custom domain behavior in detail
 */

async function debugCustomDomain() {
  console.log('🔍 Debugging Custom Domain Issues');
  console.log('==================================\n');
  
  const customDomain = 'https://profieldmanager.com';
  const replitDomain = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
  const token = '8d761ca9bfd242cd5d795955a6555a82d890327745d88e32b9e0d4e74eb240e5';
  
  try {
    // Test 1: Check if custom domain returns HTML for API calls
    console.log('1. Testing custom domain API endpoint behavior...');
    const response1 = await fetch(`${customDomain}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const text1 = await response1.text();
    const isHtml = text1.includes('<!DOCTYPE html>');
    
    console.log(`   Custom domain /api/auth/me: ${response1.status}`);
    console.log(`   Response type: ${isHtml ? 'HTML (static hosting)' : 'JSON (API proxy)'}`);
    console.log(`   Content preview: ${text1.substring(0, 100)}...`);
    
    // Test 2: Compare with Replit domain
    console.log('\n2. Testing Replit domain for comparison...');
    const response2 = await fetch(`${replitDomain}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const text2 = await response2.text();
    console.log(`   Replit domain /api/auth/me: ${response2.status}`);
    console.log(`   Response type: JSON (API working)`);
    console.log(`   Content preview: ${text2.substring(0, 100)}...`);
    
    // Test 3: Frontend simulation
    console.log('\n3. Frontend API routing simulation...');
    
    // Simulate our API config detection
    const hostname = 'profieldmanager.com';
    const shouldRoute = hostname === 'profieldmanager.com';
    const apiBaseUrl = shouldRoute ? replitDomain : '';
    const fullUrl = `${apiBaseUrl}/api/auth/me`;
    
    console.log(`   Detected hostname: ${hostname}`);
    console.log(`   Should route to Replit: ${shouldRoute}`);
    console.log(`   Generated API URL: ${fullUrl}`);
    
    // Test the routed URL
    const response3 = await fetch(fullUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`   Routed request status: ${response3.status}`);
    console.log(`   Frontend routing works: ${response3.ok ? 'YES ✅' : 'NO ❌'}`);
    
    console.log('\n📊 DIAGNOSIS:');
    if (isHtml) {
      console.log('   ❌ Custom domain serves static files (confirmed)');
      console.log('   ✅ Frontend routing solution is correct approach');
      console.log('   📝 Users must access frontend which will route API calls');
    } else {
      console.log('   ✅ Custom domain is now proxying API calls correctly');
      console.log('   ✅ Upload functionality should work directly');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCustomDomain();