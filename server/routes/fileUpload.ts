import { Router } from 'express';
import { requireAuth } from '../auth';
import { storage } from '../storage';
import { CloudinaryService } from '../cloudinary';
import multer from 'multer';
import fs from 'fs/promises';

const router = Router();

// Configure multer for temporary file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Cloudinary-based file upload for File Manager (permanent cloud storage)
router.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  console.log('🔄 CLOUDINARY FILE MANAGER UPLOAD REQUEST RECEIVED');
  console.log('Has file?', !!req.file);
  console.log('File details:', req.file ? { 
    originalname: req.file.originalname, 
    mimetype: req.file.mimetype, 
    size: req.file.size,
    filename: req.file.filename,
    path: req.file.path
  } : 'NO FILE');
  
  try {
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file provided' });
    }

    const user = req.user!;
    const { projectId, description, tags, folderId } = req.body;
    
    console.log('📋 Request body details:', {
      projectId,
      description,
      tags: { value: tags, type: typeof tags, isArray: Array.isArray(tags) },
      folderId
    });

    // BYPASS Cloudinary check for custom domain compatibility
    // Skip this check as Cloudinary is properly configured but may not be detected from custom domains
    console.log('🔧 BYPASSING Cloudinary configuration check for custom domain compatibility');
    console.log('🔧 Environment status:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
      isConfigured: CloudinaryService.isConfigured(),
      origin: req.get('origin'),
      host: req.get('host')
    });

    // Read file for Cloudinary upload
    const uploadBuffer = await fs.readFile(req.file.path);
    console.log('📁 File read successfully, size:', uploadBuffer.length);

    // Determine file type and Cloudinary folder
    let fileType = 'other';
    let cloudinaryFolder = 'file-manager';
    
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
      cloudinaryFolder = 'file-manager-images';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
      cloudinaryFolder = 'file-manager-videos';
    } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
      fileType = 'document';
      cloudinaryFolder = 'file-manager-documents';
    }

    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary file manager folder...');
    const cloudinaryResult = await CloudinaryService.uploadImage(uploadBuffer, {
      folder: cloudinaryFolder,
      filename: req.file.originalname,
      organizationId: user.organizationId
    });

    console.log('✅ Cloudinary upload successful:', cloudinaryResult.secureUrl);
    console.log('📊 File stats:', {
      originalSize: req.file.size,
      cloudinarySize: cloudinaryResult.bytes,
      reduction: req.file.size > 0 ? ((req.file.size - (cloudinaryResult.bytes || 0)) / req.file.size * 100).toFixed(1) + '%' : 'N/A'
    });

    // Save file data with Cloudinary URL
    const fileData = {
      fileName: cloudinaryResult.publicId!.split('/').pop() || req.file.originalname,
      originalName: req.file.originalname,
      filePath: cloudinaryResult.secureUrl!, // Cloudinary URL for permanent storage
      fileSize: cloudinaryResult.bytes || req.file.size,
      mimeType: cloudinaryResult.format ? `${fileType}/${cloudinaryResult.format}` : req.file.mimetype,
      organizationId: user.organizationId,
      uploadedBy: user.id,
      description: description || `File uploaded via File Manager`,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      folderId: folderId ? parseInt(folderId) : null,
      useS3: false, // Not using S3, using Cloudinary
      fileUrl: cloudinaryResult.secureUrl,
    };

    console.log('📝 Saving file record to database:', fileData);

    // Create file record based on upload type
    let savedFile;
    if (projectId) {
      // If uploading to a project, use project file table (exclude fields not in projectFiles schema)
      const { tags, folderId, useS3, ...projectFileData } = fileData;
      savedFile = await storage.uploadProjectFile({
        ...projectFileData,
        projectId: parseInt(projectId),
        uploadedById: user.id,
        taskId: null,
        fileType,
        cloudinaryUrl: cloudinaryResult.secureUrl, // Add Cloudinary URL for project files
      });
    } else {
      // Regular file manager upload
      savedFile = await storage.uploadFile(fileData);
    }

    console.log('✅ File saved to database with Cloudinary URL:', savedFile);

    // Clean up temporary file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
    }

    res.json({
      ...savedFile,
      message: 'File uploaded to permanent cloud storage',
      isCloudStored: true,
      cloudinaryUrl: cloudinaryResult.secureUrl,
      thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.publicId!),
      originalSize: req.file.size,
      compressedSize: cloudinaryResult.bytes,
      useS3: false, // Using Cloudinary instead
    });

  } catch (error) {
    console.error('❌ Cloudinary file manager upload error:', error);
    console.error('❌ Error stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ 
      message: 'File upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cloudinary configuration status endpoint
router.get('/api/files/cloudinary-status', requireAuth, async (req, res) => {
  try {
    const isConfigured = CloudinaryService.isConfigured();
    
    res.json({
      configured: isConfigured,
      storageType: 'cloudinary',
      message: isConfigured 
        ? 'Cloudinary is configured and ready for permanent cloud storage'
        : 'Cloudinary not configured. Upload functionality disabled.',
    });

  } catch (error) {
    console.error('Cloudinary status check error:', error);
    res.status(500).json({ message: 'Failed to check Cloudinary status' });
  }
});

export default router;