// Test Cloudinary unsigned upload
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Testing Cloudinary unsigned upload...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');

// Unsigned upload test
async function testUnsignedUpload() {
  try {
    // Create a simple 1x1 PNG image buffer
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    console.log('Attempting unsigned upload...');
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          upload_preset: 'ml_default', // Use default unsigned preset
          resource_type: 'image'
        },
        (error, result) => {
          if (error) {
            console.error('Unsigned upload error:', error);
            reject(error);
          } else {
            console.log('Unsigned upload success:', result.secure_url);
            resolve(result);
          }
        }
      ).end(buffer);
    });
    
    console.log('✅ Cloudinary unsigned test successful!');
    return result;
  } catch (error) {
    console.error('❌ Cloudinary unsigned test failed:', error);
    
    // Try with manual cloud_name URL
    try {
      console.log('Trying alternative approach...');
      const formData = new FormData();
      formData.append('file', new Blob([buffer]));
      formData.append('upload_preset', 'ml_default');
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (response.ok) {
        console.log('✅ Alternative upload successful:', result.secure_url);
        return result;
      } else {
        console.error('❌ Alternative upload failed:', result);
      }
    } catch (altError) {
      console.error('❌ Alternative approach failed:', altError);
    }
    
    throw error;
  }
}

testUnsignedUpload().catch(console.error);