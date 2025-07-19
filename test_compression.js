// Test script to verify image compression is working
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testProjectFileUpload() {
  console.log('🧪 Testing project file upload compression...');
  
  // Check if test image exists
  const testImagePath = './test_image.png';
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found at:', testImagePath);
    return;
  }
  
  console.log('✅ Test image found, checking size...');
  const stats = fs.statSync(testImagePath);
  console.log('📏 Original file size:', (stats.size / 1024).toFixed(2), 'KB');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(testImagePath));
  form.append('description', 'Test upload for compression verification');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // First, login to get session cookie
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@profieldmanager.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🔐 Login successful, got cookies');
    
    // Upload to a project (assuming project ID 1 exists)
    const uploadResponse = await fetch('http://localhost:5000/api/projects/1/files', {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
      body: form
    });
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload successful:', result);
    } else {
      const error = await uploadResponse.text();
      console.log('❌ Upload failed:', error);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testProjectFileUpload();