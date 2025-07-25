const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testRealUpload() {
  try {
    console.log('Testing real image upload to project...');
    
    // Create a test image buffer (small PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Create form data
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-cloudinary-upload.png',
      contentType: 'image/png'
    });
    
    // Upload to project 47 (existing project)
    const response = await fetch('http://localhost:5000/api/projects/47/files', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'connect.sid=s%3AyourSessionId' // Would need real session
      }
    });
    
    const result = await response.text();
    console.log('Upload response:', response.status, result);
    
  } catch (error) {
    console.error('Test upload failed:', error.message);
  }
}

testRealUpload();