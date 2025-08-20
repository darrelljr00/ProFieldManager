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

      // Check configuration - Enhanced Debug for Custom Domain Issues
      const configStatus = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
        cloud_name_value: process.env.CLOUDINARY_CLOUD_NAME,
        configured_via_sdk: cloudinary.config().cloud_name,
        sdk_api_key: cloudinary.config().api_key ? 'SET' : 'MISSING'
      };
      console.log('🔧 CLOUDINARY CONFIG DEBUG - CUSTOM DOMAIN UPLOAD:', {
        ...configStatus,
        cloud_name_value: configStatus.cloud_name_value || 'UNDEFINED',
        api_key_length: process.env.CLOUDINARY_API_KEY?.length || 0,
        api_secret_length: process.env.CLOUDINARY_API_SECRET?.length || 0,
        buffer_size: buffer.length,
        options: JSON.stringify(options, null, 2)
      });
      
      // Fail fast if Cloudinary is not properly configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ CLOUDINARY NOT CONFIGURED - Missing environment variables');
        return {
          success: false,
          error: 'Cloudinary configuration missing - check environment variables'
        };
      }
      
      // Create organization-specific folder path
      const folderPath = `org-${organizationId}/${folder}`;
      
      // Generate public ID with timestamp for uniqueness  
      const timestamp = Date.now();
      const cleanFilename = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-') : 'upload';
      const publicId = `${timestamp}-${cleanFilename}`;
      
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

      // Enhanced upload with retry mechanism for intermittent failures
      const result: UploadApiResponse = await this.uploadWithRetry(uploadOptions, buffer, 3);

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
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : 'No stack'
      });
      
      // Check if it's a configuration error
      if (error instanceof Error && error.message.includes('cloud_name')) {
        console.error('🚨 CLOUDINARY CONFIGURATION ERROR - Cloud name issue');
      }
      if (error instanceof Error && error.message.includes('api_key')) {
        console.error('🚨 CLOUDINARY CONFIGURATION ERROR - API key issue');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload with retry mechanism to handle intermittent failures
   * @param uploadOptions - Cloudinary upload options
   * @param buffer - Image buffer
   * @param maxRetries - Maximum number of retry attempts
   */
  private static async uploadWithRetry(
    uploadOptions: any, 
    buffer: Buffer, 
    maxRetries: number = 3
  ): Promise<UploadApiResponse> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Cloudinary upload attempt ${attempt}/${maxRetries}`);
        
        const result: UploadApiResponse = await new Promise((resolve, reject) => {
          console.log('🔄 CUSTOM DOMAIN: Creating Cloudinary upload stream with enhanced debugging...');
          console.log('🔧 CUSTOM DOMAIN Upload options (attempt ' + attempt + '):', JSON.stringify(uploadOptions, null, 2));
          console.log('🔧 Environment variables at upload time:', {
            NODE_ENV: process.env.NODE_ENV,
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.substring(0, 10) + '...',
            timestamp: new Date().toISOString(),
            attempt: attempt
          });
          
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error(`❌ CLOUDINARY UPLOAD STREAM ERROR (Attempt ${attempt}) - FULL ANALYSIS:`);
                console.error('❌ Error object:', error);
                console.error('❌ Error name:', error.name || 'No name');
                console.error('❌ Error message:', error.message || 'No message');
                console.error('❌ Error http_code:', error.http_code || 'No HTTP code');
                console.error('❌ Error API response:', error.error?.message || 'No API message');
                
                // Enhanced error diagnostics for intermittent issues
                if (error.message?.includes('signatureUrl')) {
                  console.error('🚨 CRITICAL: signatureUrl error detected - This appears to be a Cloudinary SDK issue');
                  console.error('🚨 Retry may resolve this intermittent authentication problem');
                }
                
                // Specific error type checks
                if (error.message?.includes('Invalid cloud_name')) {
                  console.error('🚨 INVALID CLOUD NAME - Check CLOUDINARY_CLOUD_NAME environment variable');
                }
                if (error.message?.includes('Invalid API key')) {
                  console.error('🚨 INVALID API KEY - Check CLOUDINARY_API_KEY environment variable');
                }
                if (error.http_code === 401) {
                  console.error('🚨 AUTHENTICATION ERROR - Verify all Cloudinary credentials');
                }
                if (error.http_code === 400) {
                  console.error('🚨 BAD REQUEST - Check upload parameters and buffer');
                }
                
                reject(error);
              } else if (result) {
                console.log(`✅ Cloudinary upload successful (attempt ${attempt}):`, result.secure_url);
                console.log('📊 Upload details:', {
                  public_id: result.public_id,
                  bytes: result.bytes,
                  format: result.format,
                  resource_type: result.resource_type,
                  attempt: attempt
                });
                resolve(result);
              } else {
                console.error(`❌ No result returned from Cloudinary (attempt ${attempt}) - this should not happen`);
                reject(new Error(`No result returned from Cloudinary on attempt ${attempt}`));
              }
            }
          );
          
          console.log(`📤 About to write buffer to stream (attempt ${attempt}) - Buffer size:`, buffer.length, 'bytes');
          uploadStream.end(buffer);
          console.log(`✅ Buffer successfully written to upload stream (attempt ${attempt})`);
        });
        
        // If we reach here, upload was successful
        console.log(`✅ Upload succeeded on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        
        // Check if we should retry
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Retrying in ${delay}ms... (${maxRetries - attempt} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retry attempts failed
    console.error(`❌ All ${maxRetries} upload attempts failed. Last error:`, lastError);
    throw lastError;
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
   * Extract public ID from Cloudinary URL
   * @param cloudinaryUrl - Full Cloudinary URL
   */
  static extractPublicIdFromUrl(cloudinaryUrl: string): string | null {
    try {
      // Example URL: https://res.cloudinary.com/dcx5v8cuk/image/upload/v1755111835/org-2/image-gallery/filename.png
      // Public ID: org-2/image-gallery/filename
      
      const url = new URL(cloudinaryUrl);
      const pathParts = url.pathname.split('/');
      
      // Find the version part (starts with 'v' followed by numbers)
      const versionIndex = pathParts.findIndex(part => /^v\d+$/.test(part));
      
      if (versionIndex === -1 || versionIndex + 1 >= pathParts.length) {
        console.warn('Could not extract public ID from URL:', cloudinaryUrl);
        return null;
      }
      
      // Everything after version is the public ID (without file extension)
      const publicIdParts = pathParts.slice(versionIndex + 1);
      const publicIdWithExtension = publicIdParts.join('/');
      
      // Remove file extension from the last part
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
      
      console.log('📍 Extracted public ID:', publicId, 'from URL:', cloudinaryUrl);
      return publicId;
    } catch (error) {
      console.error('Error extracting public ID from URL:', error);
      return null;
    }
  }

  /**
   * Check if Cloudinary is properly configured
   */
  static isConfigured(): boolean {
    const configured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    // Enhanced debugging for custom domain configuration issues
    console.log('🔧 CLOUDINARY isConfigured() DEBUG:', {
      configured,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING', 
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
      cloud_name_length: process.env.CLOUDINARY_CLOUD_NAME?.length || 0,
      api_key_length: process.env.CLOUDINARY_API_KEY?.length || 0,
      api_secret_length: process.env.CLOUDINARY_API_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
    return configured;
  }
}

export default CloudinaryService;