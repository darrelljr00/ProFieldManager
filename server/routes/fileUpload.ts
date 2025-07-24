import { Router } from 'express';
import { fileManager } from '../fileManager';
import { s3Service } from '../s3Service';
import { requireAuth } from '../auth';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import { ensureOrganizationFolders } from '../folderCreation';

const router = Router();

// Configure multer for temporary file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Enhanced file upload with S3 integration
router.post('/api/files/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const user = req.user!;
    const { projectId, category = 'files' } = req.body;

    // Ensure organization folders exist
    await ensureOrganizationFolders(user.organizationId);

    // Handle file upload with S3 integration
    const uploadResult = await fileManager.handleFileUpload(
      req.file.path,
      req.file.originalname,
      user.organizationId,
      user.id,
      category,
      projectId ? parseInt(projectId) : undefined
    );

    // Save file record to database
    const fileRecord = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: uploadResult.filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      organizationId: user.organizationId,
      uploadedBy: user.id,
      useS3: uploadResult.useS3,
      fileUrl: uploadResult.fileUrl,
    };

    // Create file record based on upload type
    let savedFile;
    if (projectId) {
      savedFile = await storage.uploadProjectFile({
        ...fileRecord,
        projectId: parseInt(projectId),
      });
    } else {
      savedFile = await storage.uploadFile(fileRecord);
    }

    res.json({
      ...savedFile,
      message: uploadResult.useS3 
        ? 'File uploaded to secure cloud storage' 
        : 'File uploaded to local storage',
      useS3: uploadResult.useS3,
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// S3 migration endpoint
router.post('/api/files/migrate-to-s3', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    // Only allow admins to run migration
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can run file migration' });
    }

    if (!s3Service.isConfigured()) {
      return res.status(400).json({ 
        message: 'AWS S3 not configured. Please set AWS credentials in environment variables.' 
      });
    }

    const result = await fileManager.migrateToS3();
    
    res.json({
      message: 'File migration completed',
      migrated: result.migrated,
      failed: result.failed,
      results: result.results,
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get S3 configuration status
router.get('/api/files/s3-status', requireAuth, async (req, res) => {
  try {
    const isConfigured = s3Service.isConfigured();
    
    res.json({
      configured: isConfigured,
      message: isConfigured 
        ? 'AWS S3 is configured and ready for file storage'
        : 'AWS S3 not configured. Files will use local storage.',
    });

  } catch (error) {
    console.error('S3 status check error:', error);
    res.status(500).json({ message: 'Failed to check S3 status' });
  }
});

export default router;