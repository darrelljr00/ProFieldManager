import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  originalFilename?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  error?: string;
}

export class CloudinaryService {
  /**
   * Upload image to Cloudinary with automatic optimization
   * @param buffer - Image buffer
   * @param options - Upload options
   */
  static async uploadImage(
    buffer: Buffer, 
    options: {
      folder: string;
      filename?: string;
      organizationId: number;
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<CloudinaryUploadResult> {
    try {
      const { folder, filename, organizationId, quality = 80, maxWidth = 2000, maxHeight = 2000 } = options;
      
      console.log('🔧 Cloudinary Debug - Starting upload with options:', {
        folder,
        filename,
        organizationId,
        quality,
        maxWidth,
        maxHeight,
        bufferSize: buffer.length
      });

      // Check configuration
      console.log('🔧 Cloudinary Config Check:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
      });
      
      // Create organization-specific folder path
      const folderPath = `org-${organizationId}/${folder}`;
      
      // Generate public ID with timestamp for uniqueness  
      const timestamp = Date.now();
      const cleanFilename = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-') : 'upload';
      const publicId = `${folderPath}/${timestamp}-${cleanFilename}`;
      
      console.log('🔧 Cloudinary Upload Parameters:', {
        folderPath,
        publicId,
        timestamp
      });

      // Use signed upload with Cloudinary SDK
      const uploadOptions = {
        resource_type: 'image' as const,
        folder: folderPath,
        public_id: publicId,
        quality: 'auto:good' as const,
        fetch_format: 'auto' as const,
        // Remove transformation for initial upload - apply on delivery instead
        eager: [
          { width: maxWidth, height: maxHeight, crop: 'limit', quality: 'auto:good' }
        ]
      };
      
      console.log('🔧 Using signed SDK upload to Cloudinary');

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary SDK upload error:', error);
              reject(error);
            } else if (result) {
              console.log('✅ Cloudinary SDK upload successful:', result.secure_url);
              resolve(result);
            } else {
              reject(new Error('Unknown upload error'));
            }
          }
        ).end(buffer);
      });

      return {
        success: true,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        originalFilename: filename,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      };

    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Cloudinary public ID
   */
  static async deleteImage(publicId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`✅ Cloudinary delete successful: ${publicId}`);
        return { success: true };
      } else {
        console.warn(`⚠️ Cloudinary delete warning: ${publicId} - ${result.result}`);
        return { success: false, error: result.result };
      }
    } catch (error) {
      console.error('❌ Cloudinary delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error'
      };
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param publicId - Cloudinary public ID
   * @param transformations - Image transformations
   */
  static getOptimizedUrl(
    publicId: string,
    transformations?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    }
  ): string {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto:good',
      ...transformations
    });
  }

  /**
   * Get thumbnail URL
   * @param publicId - Cloudinary public ID
   */
  static getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 300,
      height: 200,
      crop: 'fill',
      fetch_format: 'auto',
      quality: 'auto:eco'
    });
  }

  /**
   * Check if Cloudinary is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

export default CloudinaryService;