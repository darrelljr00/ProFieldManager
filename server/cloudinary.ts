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
      
      // Create organization-specific folder path
      const folderPath = `pro-field-manager/org-${organizationId}/${folder}`;
      
      // Generate public ID with timestamp for uniqueness
      const timestamp = Date.now();
      const publicId = filename 
        ? `${folderPath}/${timestamp}-${filename.replace(/\.[^/.]+$/, '')}`
        : `${folderPath}/${timestamp}-upload`;

      // Upload with automatic optimization
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: folderPath,
            resource_type: 'image',
            format: 'jpg', // Convert to JPG for optimal compression
            quality: quality,
            transformation: [
              {
                width: maxWidth,
                height: maxHeight,
                crop: 'limit',
                fetch_format: 'auto',
                quality: 'auto:good'
              }
            ],
            overwrite: false,
            unique_filename: true,
            use_filename: false
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Unknown upload error'));
            }
          }
        ).end(buffer);
      });

      console.log(`✅ Cloudinary upload successful: ${result.secure_url} (${result.bytes} bytes)`);

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