// Migration script to restore missing files to Cloudinary
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Files that need migration based on our investigation
const filesToMigrate = [
  {
    id: 555,
    originalName: 'f56.jpg',
    localPath: '/home/runner/workspace/uploads/temp/file-1753717854654-295639235.jpg',
    organizationId: 2
  },
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

async function migrateFileToCloudinary(fileInfo) {
  try {
    console.log(`🔄 Migrating file: ${fileInfo.originalName}`);
    console.log(`📁 Local path: ${fileInfo.localPath}`);
    
    // Check if file exists locally
    try {
      await fs.access(fileInfo.localPath);
      console.log(`✅ File exists at: ${fileInfo.localPath}`);
    } catch (error) {
      console.log(`❌ File not found at: ${fileInfo.localPath}`);
      return null;
    }
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileInfo.localPath, {
      folder: `org-${fileInfo.organizationId}/project-images`,
      public_id: `${Date.now()}-${path.parse(fileInfo.originalName).name}`,
      resource_type: 'auto'
    });
    
    console.log(`🌤️ Uploaded to Cloudinary: ${result.secure_url}`);
    console.log(`📏 File size: ${result.bytes} bytes`);
    
    return {
      id: fileInfo.id,
      cloudinaryUrl: result.secure_url,
      fileSize: result.bytes,
      publicId: result.public_id
    };
    
  } catch (error) {
    console.error(`❌ Error migrating ${fileInfo.originalName}:`, error);
    return null;
  }
}

async function updateDatabase(migratedFiles) {
  // This would update the database with new Cloudinary URLs
  // For now, we'll just log the SQL commands needed
  console.log('\n🗄️ Database update commands needed:');
  
  migratedFiles.forEach(file => {
    if (file) {
      console.log(`UPDATE project_files SET cloudinary_url = '${file.cloudinaryUrl}', file_path = '${file.cloudinaryUrl}', file_size = ${file.fileSize} WHERE id = ${file.id};`);
    }
  });
}

async function main() {
  console.log('🚀 Starting file migration to Cloudinary...\n');
  
  const migratedFiles = [];
  
  for (const fileInfo of filesToMigrate) {
    const result = await migrateFileToCloudinary(fileInfo);
    migratedFiles.push(result);
    
    // Add delay between uploads to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Migration completed. ${migratedFiles.filter(f => f).length} files migrated successfully.`);
  
  await updateDatabase(migratedFiles);
}

main().catch(console.error);

export { migrateFileToCloudinary, filesToMigrate };