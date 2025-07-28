/**
 * Test script to verify custom domain upload functionality
 * This script tests the comprehensive fix for custom domain uploads
 */

// Test configuration
const CUSTOM_DOMAIN = 'https://profieldmanager.com';
const REPLIT_DOMAIN = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
const AUTH_TOKEN = '8d761ca9bfd242cd5d795955a6555a82d890327745d88e32b9e0d4e74eb240e5';

// Test file content
const testFileContent = 'Custom domain upload test - ' + new Date().toISOString();

async function testCustomDomainUpload() {
  console.log('🧪 Testing Custom Domain Upload Fix');
  console.log('=====================================');
  
  try {
    // Test 1: Direct API call with new configuration
    console.log('\n1. Testing direct API call to custom domain...');
    
    const formData = new FormData();
    formData.append('file', new Blob([testFileContent], { type: 'text/plain' }), 'custom-domain-test.txt');
    formData.append('description', 'Custom domain upload test');
    
    const response = await fetch(`${CUSTOM_DOMAIN}/api/projects/38/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Custom domain upload SUCCESS:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Custom domain upload FAILED:', errorText.substring(0, 200) + '...');
    }
    
    // Test 2: Compare with Replit domain (should work)
    console.log('\n2. Testing same request to Replit domain...');
    
    const formData2 = new FormData();
    formData2.append('file', new Blob([testFileContent], { type: 'text/plain' }), 'replit-domain-test.txt');
    formData2.append('description', 'Replit domain upload test');
    
    const response2 = await fetch(`${REPLIT_DOMAIN}/api/projects/38/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: formData2
    });
    
    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Replit domain upload SUCCESS:', result2);
    } else {
      const errorText2 = await response2.text();
      console.log('❌ Replit domain upload FAILED:', errorText2);
    }
    
    // Test 3: Test API configuration detection
    console.log('\n3. Testing API configuration logic...');
    
    // Simulate custom domain detection
    const mockWindow = {
      location: { hostname: 'profieldmanager.com' }
    };
    
    console.log('Custom domain detection would return:', mockWindow.location.hostname === 'profieldmanager.com');
    console.log('API base URL would be:', mockWindow.location.hostname === 'profieldmanager.com' ? REPLIT_DOMAIN : '');
    
    console.log('\n✅ Test completed - Check results above');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCustomDomainUpload();