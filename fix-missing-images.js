// Fix missing images that have display problems
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Files that need to be fixed from database analysis
const filesToFix = [
  {
    id: 546,
    originalName: 'Screenshot_2025-07-26-13-53-41-30_6012fa4d4ddec268fc5c7112cbb265e7.jpg',
    localPath: 'uploads/org-2/files/compressed-timestamped-file-1753543806273-103543519.jpg',
    organizationId: 2
  },
  {
    id: 542,
    originalName: '7519099369553255047.jpg',
    localPath: 'uploads/org-2/files/compressed-file-1753542077427-637783225.jpg',
    organizationId: 2
  },
  {
    id: 541,
    originalName: '1528282953642450184.jpg',
    localPath: 'uploads/org-2/files/compressed-file-1753542076508-323567482.jpg',
    organizationId: 2
  }
];

async function migrateAndFixFile(fileInfo) {
  try {
    console.log(`🔄 Fixing file: ${fileInfo.originalName}`);
    
    // Check if file exists locally
    try {
      await fs.access(fileInfo.localPath);
      console.log(`✅ File found: ${fileInfo.localPath}`);
    } catch (error) {
      console.log(`❌ File not found: ${fileInfo.localPath}`);
      return null;
    }
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileInfo.localPath, {
      folder: `org-${fileInfo.organizationId}/project-images`,
      public_id: `${Date.now()}-${path.parse(fileInfo.originalName).name.replace(/[^a-zA-Z0-9-_]/g, '-')}`,
      resource_type: 'auto',
      quality: 'auto:good'
    });
    
    console.log(`🌤️ Successfully uploaded to Cloudinary: ${result.secure_url}`);
    console.log(`📏 File size: ${result.bytes} bytes`);
    
    return {
      id: fileInfo.id,
      cloudinaryUrl: result.secure_url,
      fileSize: result.bytes
    };
    
  } catch (error) {
    console.error(`❌ Error fixing ${fileInfo.originalName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting to fix missing images from July 26...\n');
  
  const fixedFiles = [];
  
  for (const fileInfo of filesToFix) {
    const result = await migrateAndFixFile(fileInfo);
    if (result) {
      fixedFiles.push(result);
      console.log(`✅ Fixed file ID ${result.id} - now has permanent Cloudinary URL`);
    }
    
    // Delay between uploads
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Migration completed. ${fixedFiles.length} files fixed successfully.`);
  
  // Generate SQL commands to update database
  console.log('\n🗄️ SQL commands to update database:');
  fixedFiles.forEach(file => {
    console.log(`UPDATE project_files SET cloudinary_url = '${file.cloudinaryUrl}', file_path = '${file.cloudinaryUrl}', file_size = ${file.fileSize} WHERE id = ${file.id};`);
  });
  
  return fixedFiles;
}

const result = await main();
export { result };