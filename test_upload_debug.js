const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    console.log('🧪 Testing upload functionality...');
    
    // Create a simple test image buffer
    const testImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-upload.gif',
      contentType: 'image/gif'
    });
    formData.append('description', 'Test upload from debug script');
    
    console.log('📤 Sending upload request...');
    
    const response = await fetch('http://localhost:5000/api/projects/42/files', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'auth_token=your_token_here; HttpOnly; Secure; SameSite=Strict'
      }
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Upload test successful!');
    } else {
      console.log('❌ Upload test failed!');
    }
    
  } catch (error) {
    console.error('❌ Upload test error:', error);
  }
}

testUpload();