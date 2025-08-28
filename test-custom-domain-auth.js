#!/usr/bin/env node

// Test script to verify custom domain authentication works
const credentials = {
  username: 'sales@texaspowerwash.net',
  password: 'password123'
};

const replitUrl = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev';
const customDomainUrl = 'https://profieldmanager.com';

async function testAuthentication(baseUrl, domainName) {
  console.log(`\n🔐 Testing authentication on ${domainName} (${baseUrl})`);
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Login successful!`);
      console.log(`👤 User: ${data.user?.username || 'Unknown'}`);
      console.log(`🎫 Token: ${data.token ? 'Present' : 'Missing'}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Login failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting custom domain authentication tests...');
  
  // Test 1: Replit domain
  await testAuthentication(replitUrl, 'Replit Domain');
  
  // Test 2: Custom domain
  await testAuthentication(customDomainUrl, 'Custom Domain');
  
  console.log('\n🏁 Authentication tests completed!');
}

runTests().catch(console.error);