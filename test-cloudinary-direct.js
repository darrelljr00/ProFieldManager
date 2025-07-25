import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testDirectUpload() {
  try {
    console.log('🔧 Testing direct Cloudinary upload...');
    console.log('Config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',  
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });

    // Create a simple test image
    const testImagePath = './europeana-replacement.jpg';
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found, creating placeholder...');
      // Create a small test file
      fs.writeFileSync('./test-image.txt', 'Test file for Cloudinary upload');
      console.log('✅ Created test file');
      return;
    }

    const result = await cloudinary.uploader.upload(testImagePath, {
      folder: 'org-2/file-manager-images',
      public_id: `europeana-VSb4zP3ixuA-unsplash`,
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto'
    });

    console.log('✅ Upload successful!');
    console.log('URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    console.log('Size:', result.bytes, 'bytes');

    return result.secure_url;

  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

testDirectUpload().then(url => {
  if (url) {
    console.log('\n🎯 SUCCESS! New Cloudinary URL:', url);
  }
}).catch(console.error);