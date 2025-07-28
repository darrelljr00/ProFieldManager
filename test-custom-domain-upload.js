// Test script to verify custom domain authentication and upload
const fs = require('fs');

async function testCustomDomainUpload() {
  console.log('🔐 Testing custom domain login...');
  
  // Step 1: Login
  const loginResponse = await fetch('https://profieldmanager.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'sales@texaspowerwash.net',
      password: 'password123'
    }),
  });
  
  const loginData = await loginResponse.json();
  console.log('Login response:', {
    status: loginResponse.status,
    hasToken: !!loginData.token,
    tokenPreview: loginData.token ? loginData.token.slice(0, 8) + '...' : 'NO TOKEN'
  });
  
  if (!loginData.token) {
    console.error('❌ No token received from login');
    return;
  }
  
  // Step 2: Test authenticated API call
  console.log('🔐 Testing authenticated API call...');
  const authTestResponse = await fetch('https://profieldmanager.com/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${loginData.token}`,
    },
  });
  
  console.log('Auth test response:', {
    status: authTestResponse.status,
    statusText: authTestResponse.statusText
  });
  
  if (authTestResponse.ok) {
    const userData = await authTestResponse.json();
    console.log('✅ Authentication successful for user:', userData.username);
    
    // Step 3: Test file upload if we have a test file
    if (fs.existsSync('test_image.png')) {
      console.log('🚀 Testing file upload...');
      
      const formData = new FormData();
      const fileBuffer = fs.readFileSync('test_image.png');
      const blob = new Blob([fileBuffer], { type: 'image/png' });
      formData.append('file', blob, 'test_image.png');
      
      const uploadResponse = await fetch('https://profieldmanager.com/api/projects/38/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
        },
        body: formData,
      });
      
      console.log('Upload response:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText
      });
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('✅ Upload successful:', uploadData);
      } else {
        const errorText = await uploadResponse.text();
        console.log('❌ Upload failed:', errorText);
      }
    } else {
      console.log('⚠️ No test_image.png found, skipping upload test');
    }
  } else {
    console.error('❌ Authentication failed');
  }
}

testCustomDomainUpload().catch(console.error);