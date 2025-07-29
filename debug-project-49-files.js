// Debug script to check project 49 files API
const fetch = require('node-fetch');

async function debugProject49Files() {
  try {
    const response = await fetch('http://localhost:5000/api/projects/49/files', {
      headers: {
        'Cookie': 'auth_token=' + process.env.AUTH_TOKEN || ''
      }
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      return;
    }
    
    const files = await response.json();
    console.log('Total files:', files.length);
    
    // Find July 26 files specifically
    const july26Files = files.filter(file => 
      ['missing images.JPG', 'failed to load.JPG', '7519099369553255047.jpg'].includes(file.originalName)
    );
    
    console.log('\n=== JULY 26 FILES DEBUG ===');
    console.log('Found July 26 files:', july26Files.length);
    
    july26Files.forEach(file => {
      console.log('\nFile:', file.originalName);
      console.log('ID:', file.id);
      console.log('filePath:', file.filePath);
      console.log('cloudinaryUrl:', file.cloudinaryUrl);
      console.log('fileType:', file.fileType);
      console.log('mimeType:', file.mimeType);
      console.log('fileSize:', file.fileSize);
      console.log('createdAt:', file.createdAt);
    });
    
    // Check all Cloudinary files
    const cloudinaryFiles = files.filter(file => 
      file.cloudinaryUrl || (file.filePath && file.filePath.includes('cloudinary.com'))
    );
    
    console.log('\n=== ALL CLOUDINARY FILES ===');
    console.log('Total Cloudinary files:', cloudinaryFiles.length);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugProject49Files();