import { s3Service } from './s3Service';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

export class FileManager {
  /**
   * Handle file upload with S3 integration
   */
  async handleFileUpload(
    localFilePath: string, 
    originalName: string, 
    organizationId: number, 
    userId: number, 
    category: string = 'files',
    projectId?: number
  ): Promise<{ filePath: string; fileUrl?: string; useS3: boolean }> {
    
    // Check if S3 is configured
    if (s3Service.isConfigured()) {
      try {
        // Generate S3 key
        const s3Key = projectId 
          ? s3Service.generateProjectFileKey(organizationId, projectId, path.basename(localFilePath))
          : s3Service.generateS3Key(organizationId, category, path.basename(localFilePath));
        
        // Upload to S3
        const s3Url = await s3Service.uploadFile(localFilePath, s3Key);
        
        // Keep local file as backup, but mark it as S3-stored
        console.log(`✅ File uploaded to S3: ${originalName}`);
        
        return {
          filePath: s3Key, // Store S3 key instead of local path
          fileUrl: s3Url,
          useS3: true
        };
      } catch (error) {
        console.error('S3 upload failed, falling back to local storage:', error);
        // Fall back to local storage
      }
    }
    
    // Use local storage (current behavior)
    return {
      filePath: localFilePath,
      useS3: false
    };
  }

  /**
   * Get file URL for serving
   */
  async getFileUrl(filePath: string, useS3: boolean = false): Promise<string> {
    if (useS3 && s3Service.isConfigured()) {
      try {
        // Generate presigned URL for S3 files
        return await s3Service.getPresignedUrl(filePath, 3600); // 1 hour expiry
      } catch (error) {
        console.error('Failed to generate S3 URL:', error);
      }
    }
    
    // Return local file path
    return `/${filePath}`;
  }

  /**
   * Migrate existing files to S3
   */
  async migrateToS3(): Promise<{ migrated: number; failed: number; results: any[] }> {
    if (!s3Service.isConfigured()) {
      throw new Error('S3 not configured. Cannot migrate files.');
    }

    console.log('🚀 Starting file migration to S3...');
    
    // Get all project files from database
    const allFiles = await storage.getAllFiles();
    
    const migrationTasks = [];
    const results = [];
    let migrated = 0;
    let failed = 0;

    for (const file of allFiles) {
      try {
        // Skip if already using S3
        if (file.useS3) {
          console.log(`⏭️ Skipping ${file.originalName} (already on S3)`);
          continue;
        }

        const localPath = file.filePath;
        
        // Check if local file exists
        if (!fs.existsSync(localPath)) {
          console.log(`⚠️ Local file not found: ${localPath}`);
          failed++;
          results.push({
            fileId: file.id,
            fileName: file.originalName,
            success: false,
            error: 'Local file not found'
          });
          continue;
        }

        // Generate S3 key
        const s3Key = file.projectId
          ? s3Service.generateProjectFileKey(file.organizationId || 1, file.projectId, path.basename(localPath))
          : s3Service.generateS3Key(file.organizationId || 1, 'files', path.basename(localPath));

        // Upload to S3
        const s3Url = await s3Service.uploadFile(localPath, s3Key);

        // Update database to use S3
        await storage.updateFileLocation(file.id, s3Key, s3Url, true);

        migrated++;
        results.push({
          fileId: file.id,
          fileName: file.originalName,
          success: true,
          s3Key,
          s3Url
        });

        console.log(`✅ Migrated: ${file.originalName} -> ${s3Key}`);

      } catch (error) {
        failed++;
        results.push({
          fileId: file.id,
          fileName: file.originalName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ Failed to migrate ${file.originalName}:`, error);
      }
    }

    console.log(`🎉 Migration complete: ${migrated} files migrated, ${failed} failed`);
    
    return { migrated, failed, results };
  }

  /**
   * Clean up local files after successful S3 migration
   */
  async cleanupLocalFiles(results: any[]): Promise<void> {
    console.log('🧹 Cleaning up local files...');
    
    for (const result of results) {
      if (result.success && result.s3Url) {
        try {
          // Get file info to find local path
          const file = await storage.getFile(result.fileId, 1); // Organization doesn't matter for cleanup
          
          if (file && fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
            console.log(`🗑️ Deleted local file: ${file.filePath}`);
          }
        } catch (error) {
          console.error(`Failed to delete local file for ${result.fileName}:`, error);
        }
      }
    }
  }
}

export const fileManager = new FileManager();