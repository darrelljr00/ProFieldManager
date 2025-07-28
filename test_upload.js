// Test upload with proper authentication to identify 500 error
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  try {
    console.log('Step 1: Logging in to get valid auth token...');
    
    // First, login to get a valid token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sales@texaspowerwash.net',
      password: 'password123'
    });
    
    const authToken = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Create a simple test image file
    const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync('test_upload_image.png', testImageContent);
    console.log('✅ Test image created');
    
    console.log('Step 2: Testing upload with valid auth token...');
    
    // Now try the upload with the valid token
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test_upload_image.png'));
    formData.append('description', 'Test upload for debugging 500 error');
    
    const uploadResponse = await axios.post('http://localhost:5000/api/projects/48/files', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Upload successful:', uploadResponse.status);
    console.log('Response:', uploadResponse.data);
    
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.status === 500) {
      console.error('🚨 500 INTERNAL SERVER ERROR CONFIRMED');
      console.error('This will help identify the exact line causing the issue in server logs');
    }
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync('test_upload_image.png');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testUpload();