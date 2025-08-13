// Test script to verify login endpoint connectivity
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔧 Testing login endpoint...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'sales@texaspowerwash.net',
        password: 'password123'
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful:', {
        hasToken: !!data.token,
        hasUser: !!data.user,
        userRole: data.user?.role,
        userId: data.user?.id
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Login failed:', errorText);
    }
  } catch (error) {
    console.error('💥 Network error:', error.message);
  }
}

testLogin();