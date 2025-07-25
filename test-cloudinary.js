// Test Cloudinary configuration
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Testing Cloudinary configuration...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');

// Simple upload test
async function testUpload() {
  try {
    // Create a simple 1x1 PNG image buffer
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    console.log('Attempting simple upload...');
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: 'test-upload-' + Date.now()
        },
        (error, result) => {
          if (error) {
            console.error('Upload error:', error);
            reject(error);
          } else {
            console.log('Upload success:', result.secure_url);
            resolve(result);
          }
        }
      ).end(buffer);
    });
    
    console.log('✅ Cloudinary test successful!');
    return result;
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error);
    throw error;
  }
}

testUpload().catch(console.error);