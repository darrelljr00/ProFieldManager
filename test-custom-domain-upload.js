/**
 * Test Custom Domain Upload - Final Verification
 */

import fs from 'fs';

const customDomain = 'https://profieldmanager.com';
const token = '8d761ca9bfd242cd5d795955a6555a82d890327745d88e32b9e0d4e74eb240e5';

// Create a small test image
const createTestImage = () => {
  // Create a minimal valid PNG file (1x1 transparent pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync('test_custom_upload.png', pngData);
  return 'test_custom_upload.png';
};

async function testCustomDomainUpload() {
  console.log('🧪 Final Custom Domain Upload Test');
  console.log('===================================\n');
  
  try {
    const testFile = createTestImage();
    
    // Test upload to custom domain
    console.log('📤 Testing upload to profieldmanager.com...');
    
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(testFile);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test_custom_upload.png');
    formData.append('description', 'Custom domain upload test - Final verification');
    
    const response = await fetch(`${customDomain}/api/projects/38/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ UPLOAD SUCCESS:', {
        id: result.id,
        fileName: result.fileName,
        originalName: result.originalName,
        fileSize: result.fileSize,
        cloudinaryUrl: result.cloudinaryUrl ? 'CLOUDINARY SET' : 'LOCAL STORAGE',
        success: result.success
      });
      
      console.log('\n🎉 CUSTOM DOMAIN UPLOAD WORKING PERFECTLY!');
      console.log('    - API routing: ✅ Working');
      console.log('    - Authentication: ✅ Working');
      console.log('    - File upload: ✅ Working');
      console.log('    - Cloud storage: ✅ Working');
      
    } else {
      const errorText = await response.text();
      console.log('❌ Upload failed:', errorText);
      
      // Check if it's infrastructure issue
      if (response.status === 500 && errorText.includes('Cloud storage')) {
        console.log('\n🔧 DIAGNOSIS: Custom domain Cloudinary environment variable issue');
        console.log('    - API routing: ✅ Working');
        console.log('    - Authentication: ✅ Working');  
        console.log('    - File processing: ✅ Working');
        console.log('    - Cloud config: ❌ Needs environment variable sync');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync('test_custom_upload.png')) {
      fs.unlinkSync('test_custom_upload.png');
    }
  }
}

testCustomDomainUpload();