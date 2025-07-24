import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.s3 = new AWS.S3();
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || '';

    if (!this.bucketName) {
      console.warn('AWS S3 bucket name not configured. Files will use local storage.');
    }
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    );
  }

  /**
   * Upload a file to S3 and return the URL
   */
  async uploadFile(localFilePath: string, s3Key: string, contentType?: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AWS S3 not configured. Please set AWS credentials.');
    }

    try {
      // Read the file
      const fileContent = fs.readFileSync(localFilePath);
      
      // Upload parameters
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType || this.getContentType(localFilePath),
        ACL: 'private' // Files are private by default
      };

      // Upload to S3
      const result = await this.s3.upload(uploadParams).promise();
      
      console.log(`✅ File uploaded to S3: ${s3Key}`);
      return result.Location;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for accessing a file
   */
  async getPresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AWS S3 not configured');
    }

    const params = {
      Bucket: this.bucketName,
      Key: s3Key,
      Expires: expiresIn // URL expires in seconds
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    if (!this.isConfigured()) {
      return; // Skip if not configured
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: s3Key
      }).promise();
      
      console.log(`🗑️ File deleted from S3: ${s3Key}`);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw error;
    }
  }

  /**
   * Generate S3 key for organization-based file storage
   */
  generateS3Key(organizationId: number, category: string, filename: string): string {
    return `org-${organizationId}/${category}/${filename}`;
  }

  /**
   * Generate S3 key for project files
   */
  generateProjectFileKey(organizationId: number, projectId: number, filename: string): string {
    return `org-${organizationId}/projects/${projectId}/${filename}`;
  }

  /**
   * Migrate existing local file to S3
   */
  async migrateLocalFileToS3(localFilePath: string, s3Key: string): Promise<string> {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local file not found: ${localFilePath}`);
    }

    const s3Url = await this.uploadFile(localFilePath, s3Key);
    
    // Optionally delete local file after successful upload
    // fs.unlinkSync(localFilePath);
    
    return s3Url;
  }

  /**
   * Bulk migrate files from local storage to S3
   */
  async bulkMigrateFiles(fileMappings: Array<{ localPath: string; s3Key: string }>): Promise<Array<{ s3Key: string; s3Url: string; success: boolean; error?: string }>> {
    const results = [];

    for (const mapping of fileMappings) {
      try {
        const s3Url = await this.migrateLocalFileToS3(mapping.localPath, mapping.s3Key);
        results.push({
          s3Key: mapping.s3Key,
          s3Url,
          success: true
        });
      } catch (error) {
        results.push({
          s3Key: mapping.s3Key,
          s3Url: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
export const s3Service = new S3Service();