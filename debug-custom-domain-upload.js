#!/usr/bin/env node

/**
 * Custom Domain Upload Diagnostic Script
 * Tests upload functionality and authentication on custom domain
 */

console.log('🔍 CUSTOM DOMAIN UPLOAD DIAGNOSTIC');
console.log('=====================================');

async function testCustomDomainAuth() {
  console.log('\n1. AUTHENTICATION TEST:');
  
  try {
    // Test auth endpoint
    const authResponse = await fetch('https://profieldmanager.com/api/auth/me', {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
      }
    });
    
    console.log('Auth Response:', authResponse.status, authResponse.statusText);
    
    if (authResponse.ok) {
      const userData = await authResponse.json();
      console.log('✅ Authentication successful:', userData.email);
    } else {
      console.log('❌ Authentication failed');
    }
  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }
}

async function testCloudinaryConfig() {
  console.log('\n2. CLOUDINARY CONFIGURATION:');
  
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
    api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
  };
  
  console.log('Config status:', config);
  
  if (config.cloud_name === 'SET' && config.api_key === 'SET' && config.api_secret === 'SET') {
    console.log('✅ Cloudinary configuration complete');
    return true;
  } else {
    console.log('❌ Cloudinary configuration incomplete');
    return false;
  }
}

async function runDiagnostics() {
  console.log('Starting custom domain upload diagnostics...\n');
  
  await testCustomDomainAuth();
  const cloudinaryOk = await testCloudinaryConfig();
  
  console.log('\n3. RECOMMENDATIONS:');
  
  if (!cloudinaryOk) {
    console.log('- Set up Cloudinary environment variables');
  }
  
  console.log('- Login to https://profieldmanager.com/login with: superadmin@profieldmanager.com / admin123');
  console.log('- Test upload on https://profieldmanager.com/jobs');
  console.log('- Check browser console and server logs for detailed debugging');
  
  console.log('\n✅ Diagnostic complete');
}

runDiagnostics().catch(console.error);