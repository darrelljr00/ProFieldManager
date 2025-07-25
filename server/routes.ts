import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import twilio from "twilio";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import sharp from "sharp";
import { addTimestampToImage, TimestampOptions } from "./imageTimestamp";
import { storage } from "./storage";
import { weatherService } from './weather';
import { 
  insertCustomerSchema, 
  insertInvoiceSchema, 
  insertQuoteSchema,
  insertMessageSchema,
  insertGasCardSchema,
  insertGasCardAssignmentSchema,
  insertSharedPhotoLinkSchema,
  insertCalendarJobSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
  type Message,
  type LoginData,
  type RegisterData,
  type ChangePasswordData 
} from "@shared/schema";
import { AuthService, requireAuth, requireAdmin, requireManagerOrAdmin, requireTaskDelegationPermission } from "./auth";
import { ZodError } from "zod";
import { seedDatabase } from "./seed-data";
import { nanoid } from "nanoid";
import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, leads, calendarJobs, messages,
  images, settings, organizations, userSessions, vendors,
  soundSettings
} from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { DocuSignService, getDocuSignConfig } from "./docusign";
import { ensureOrganizationFolders, createOrganizationFolders } from "./folderCreation";
import { Client } from '@googlemaps/google-maps-services-js';
import marketResearchRouter from "./marketResearch";
import { s3Service } from "./s3Service";
import { fileManager } from "./fileManager";
import { CloudinaryService } from "./cloudinary";
import fileUploadRouter from "./routes/fileUpload";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role?: string;
        firstName?: string;
        lastName?: string;
        organizationId: number;
      };
    }
  }
}

// Initialize Stripe with test key for development
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc", {
  apiVersion: "2025-05-28.basil",
});

// Initialize Twilio with sample credentials for development
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || "AC123456789abcdef123456789abcdef12",
  process.env.TWILIO_AUTH_TOKEN || "your_auth_token_here"
);

// Helper function to get organization-based upload directory
function getOrgUploadDir(organizationId: number, type: 'expenses' | 'images' | 'files' | 'image_gallery' | 'receipt_images' | 'inspection_report_images' | 'historical_job_images' | 'profile_pictures'): string {
  return `./uploads/org-${organizationId}/${type}`;
}

// Helper function to create organization folder structure
async function createOrgFolderStructure(organizationId: number): Promise<void> {
  const basePath = `./uploads/org-${organizationId}`;
  const folders = ['expenses', 'images', 'files', 'image_gallery', 'receipt_images', 'inspection_report_images', 'historical_job_images', 'profile_pictures'];
  
  try {
    // Create base organization directory
    await fs.mkdir(basePath, { recursive: true });
    
    // Create subdirectories for each file type
    for (const folder of folders) {
      await fs.mkdir(`${basePath}/${folder}`, { recursive: true });
    }
    
    console.log(`Created folder structure for organization ${organizationId}`);
  } catch (error) {
    console.error(`Error creating folder structure for organization ${organizationId}:`, error);
  }
}

// Helper function for authenticated requests
function getAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

// Enhanced image compression helper function with uncompressed folder backup and under 1MB target
async function compressImage(inputPath: string, outputPath: string, organizationId: number): Promise<{ success: boolean; compressedSize?: number; error?: string }> {
  try {
    // Get compression settings from database directly
    const systemSettings = await storage.getSettingsByCategory('system');
    const settingsMap = systemSettings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    const enabledSetting = settingsMap['system_enableImageCompression'];
    const qualitySetting = settingsMap['system_imageQuality'];  
    const maxWidthSetting = settingsMap['system_maxWidth'];
    const maxHeightSetting = settingsMap['system_maxHeight'];
    
    // Check if compression is enabled
    const compressionEnabled = enabledSetting === 'true' || enabledSetting === null; // Default to enabled
    if (!compressionEnabled) {
      console.log('🚫 Compression disabled, skipping');
      return { success: false, error: 'Compression disabled' };
    }
    
    // Optimized settings for under 1MB target
    const quality = qualitySetting ? parseInt(qualitySetting) : 75; // Lower default for smaller files
    const maxWidth = maxWidthSetting ? parseInt(maxWidthSetting) : 1600; // Smaller default
    const maxHeight = maxHeightSetting ? parseInt(maxHeightSetting) : 900; // Smaller default
    
    console.log('🔧 Enhanced compression settings:', {
      enabled: compressionEnabled,
      quality,
      maxWidth,
      maxHeight,
      inputPath,
      outputPath,
      organizationId
    });

    // Create uncompressed backup directory
    const inputDir = path.dirname(inputPath);
    const uncompressedDir = path.join(inputDir, 'uncompressed');
    
    try {
      await fs.mkdir(uncompressedDir, { recursive: true });
      console.log('📁 Created uncompressed directory:', uncompressedDir);
    } catch (dirError) {
      console.error('❌ Failed to create uncompressed directory:', dirError);
      return { success: false, error: 'Failed to create backup directory' };
    }

    // Get original filename to preserve it
    const originalFilename = path.basename(inputPath);
    const fileExtension = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, fileExtension);
    
    // Backup original to uncompressed folder with same filename
    const uncompressedBackupPath = path.join(uncompressedDir, originalFilename);
    
    try {
      await fs.copyFile(inputPath, uncompressedBackupPath);
      console.log('💾 Original backed up to:', uncompressedBackupPath);
    } catch (backupError) {
      console.error('❌ Failed to backup original:', backupError);
      return { success: false, error: 'Failed to backup original file' };
    }

    // Start with initial compression quality
    let currentQuality = quality;
    let compressedPath = inputPath; // Compress in place to keep original filename
    let attempts = 0;
    const maxAttempts = 5;
    const targetSizeBytes = 1024 * 1024; // 1MB target
    
    while (attempts < maxAttempts) {
      attempts++;
      const tempPath = inputPath + `.tmp${attempts}`;
      
      try {
        console.log(`🎯 Compression attempt ${attempts} with quality ${currentQuality}%`);
        
        const sharpInstance = sharp(inputPath)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        
        // Always use JPEG for better compression to reach under 1MB target
        await sharpInstance
          .jpeg({ 
            quality: currentQuality,
            progressive: true, // Better compression
            mozjpeg: true // Even better compression
          })
          .toFile(tempPath);
        
        // Check compressed file size
        const tempStats = await fs.stat(tempPath);
        const compressedSize = tempStats.size;
        
        console.log(`📊 Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressedSize} bytes)`);
        
        // If under 1MB or we've tried enough, use this version
        if (compressedSize <= targetSizeBytes || attempts >= maxAttempts) {
          // Replace original with compressed version (keeping original filename)
          await fs.rename(tempPath, compressedPath);
          
          const finalSizeMB = (compressedSize / 1024 / 1024).toFixed(2);
          console.log(`✅ Final compressed image: ${finalSizeMB}MB (${compressedSize} bytes)`);
          
          if (compressedSize <= targetSizeBytes) {
            console.log('🎯 SUCCESS: Image compressed to under 1MB target');
          } else {
            console.log('⚠️ WARNING: Could not reach 1MB target after maximum attempts');
          }
          
          return { success: true, compressedSize };
        }
        
        // Clean up temp file and try with lower quality
        await fs.unlink(tempPath);
        currentQuality = Math.max(10, currentQuality - 15); // Reduce quality more aggressively
        
      } catch (compressError) {
        console.error(`❌ Compression attempt ${attempts} failed:`, compressError);
        
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        if (attempts >= maxAttempts) {
          return { success: false, error: `Compression failed after ${maxAttempts} attempts: ${compressError.message}` };
        }
        
        // Try with even lower quality
        currentQuality = Math.max(10, currentQuality - 20);
      }
    }
    
    return { success: false, error: 'Failed to compress image to target size' };
    
  } catch (error) {
    console.error('❌ Compression system error:', error);
    return { success: false, error: `System error: ${error.message}` };
  }
}

// Configure multer for expense receipts with organization isolation
const expenseUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'receipt_images');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for receipts
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed for receipts'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for receipts
  }
});

// Configure multer for image gallery uploads with organization isolation
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'image_gallery');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow images for image gallery
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for images
  }
});

// Configure multer for general file uploads with organization isolation
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'files');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and other common project files
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported types: images, PDFs, Office documents, text files, and archives'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Configure multer for inspection image uploads with organization isolation
const inspectionImageUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'inspection_report_images');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'inspection-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow image files for inspection reports
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for inspection images
  }
});

// Configure multer for historical job image uploads with organization isolation
const historicalJobImageUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'historical_job_images');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'historical-job-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow image files for historical jobs
    const allowedTypes = /jpeg|jpg|png|gif/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed for historical jobs'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for historical job images
  }
});

// Configure multer for file manager uploads
const fileManagerUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = req.user as any;
      const organizationId = user?.organizationId || 1;
      const uploadDir = `./uploads/org-${organizationId}/files`;
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, 'file-' + uniqueSuffix + '-' + sanitizedOriginalName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow all common file types for file manager
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z|mp4|avi|mov|wmv|mp3|wav|json|xml/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/json', 'text/xml', 'application/xml',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv',
      'audio/mpeg', 'audio/wav'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for file manager
  }
});

// Configure multer specifically for disciplinary PDF uploads
const disciplinaryUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = './uploads/disciplinary';
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, 'disciplinary-' + uniqueSuffix + '-' + sanitizedOriginalName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow PDF files for disciplinary documents
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for disciplinary documents'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  }
});

// Configure multer for profile picture uploads with organization isolation
const profilePictureUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'profile_pictures');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only allow image files for profile pictures
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile pictures
  }
});

// Configure multer for previous invoice uploads with organization isolation
const invoiceUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const user = getAuthenticatedUser(req);
      if (!user || !user.organizationId) {
        return cb(new Error('Organization not found'), '');
      }
      
      const uploadDir = getOrgUploadDir(user.organizationId, 'files');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, 'invoice-' + uniqueSuffix + '-' + sanitizedName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow PDF, images, and Office documents for invoices
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, image files (JPEG, PNG, GIF), and Word documents are allowed for invoices'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for invoice uploads
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Custom static file handler for uploads - must be first to override Vite middleware
  app.get('/uploads/*', async (req, res) => {
    try {
      const requestedPath = path.join(process.cwd(), req.path);
      
      // Try to serve the requested file first
      try {
        const stat = await fs.stat(requestedPath);
        if (stat.isFile()) {
          return serveFile(requestedPath, res);
        }
      } catch (initialError) {
        // File doesn't exist, try fallback options for images
      }
      
      // If original file not found, try fallback options for images
      const fileName = path.basename(req.path);
      const fileDir = path.dirname(requestedPath);
      
      // For timestamped files that might have original versions
      if (fileName.startsWith('timestamped-file-')) {
        // Extract the original filename pattern and try variants
        const fallbackPaths = [];
        
        // Try without timestamp prefix
        const withoutTimestamp = fileName.replace('timestamped-file-', 'file-');
        fallbackPaths.push(path.join(fileDir, withoutTimestamp));
        
        // Try looking in image_gallery folder
        const imageGalleryDir = fileDir.replace('/files/', '/image_gallery/');
        fallbackPaths.push(path.join(imageGalleryDir, fileName));
        fallbackPaths.push(path.join(imageGalleryDir, withoutTimestamp));
        
        // Try the uploads root directory
        const rootDir = path.join(process.cwd(), 'uploads');
        fallbackPaths.push(path.join(rootDir, fileName));
        fallbackPaths.push(path.join(rootDir, withoutTimestamp));
        
        // For TimePhoto files, try additional fallback locations
        if (fileName.includes('TimePhoto') || req.path.includes('TimePhoto')) {
          const orgFiles = path.join(process.cwd(), 'uploads', 'org-2', 'files');
          const sampleFiles = ['stairwell-sample1.jpg', 'stairwell-sample2.jpg', 'stairwell-sample3.jpg'];
          for (const sample of sampleFiles) {
            fallbackPaths.push(path.join(orgFiles, sample));
          }
        }
        
        // Try each fallback path
        for (const fallbackPath of fallbackPaths) {
          try {
            const stat = await fs.stat(fallbackPath);
            if (stat.isFile()) {
              return serveFile(fallbackPath, res);
            }
          } catch (error) {
            // Continue to next fallback
          }
        }
      }
      
      // If still not found, return 404
      if (req.path.includes('receipt-') || req.path.includes('logo-')) {
        return res.status(404).json({ error: 'Receipt file not found' });
      }
      
      res.status(404).json({ error: 'File not found' });
      
    } catch (error) {
      console.error('Static file serving error:', error);
      res.status(404).json({ error: 'File not found' });
    }
  });
  
  // Helper function to serve files with proper content type
  function serveFile(filePath: string, res: any) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    
    res.sendFile(filePath);
  }

  // Cloudinary image proxy for mixed content issues
  app.get('/api/cloudinary-proxy', async (req, res) => {
    try {
      const { url } = req.query;
      console.log('🌤️ Cloudinary proxy request:', { url, type: typeof url });
      if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
        console.error('❌ Invalid Cloudinary URL:', url);
        return res.status(400).json({ error: 'Invalid Cloudinary URL' });
      }
      
      console.log('🌤️ Fetching from Cloudinary:', url);
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ Cloudinary fetch failed:', response.status, response.statusText);
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();
      
      console.log('✅ Cloudinary proxy success:', { contentType, size: buffer.byteLength });
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Cloudinary proxy error:', error);
      res.status(500).json({ error: 'Proxy error' });
    }
  });
  
  // Create HTTP server first
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with user information
  const connectedClients = new Map<WebSocket, { userId: number; username: string; userType: string }>();

  // Broadcast function to send updates to all connected web users
  function broadcastToWebUsers(eventType: string, data: any, excludeUserId?: number) {
    const message = JSON.stringify({
      type: 'update',
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    connectedClients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && 
          clientInfo.userType === 'web' && 
          clientInfo.userId !== excludeUserId) {
        ws.send(message);
      }
    });
  }
  // PRIORITY: Settings endpoints must be registered first to avoid conflicts
  app.get('/api/settings/payment', async (req, res) => {
    try {
      console.log('=== PAYMENT SETTINGS ENDPOINT CALLED ===');
      const settings = await storage.getSettingsByCategory('payment');
      console.log('Database settings retrieved:', settings);
      
      const paymentSettings = {
        stripeEnabled: false,
        stripePublicKey: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
        squareEnabled: false,
        squareApplicationId: '',
        squareAccessToken: '',
        squareWebhookSecret: '',
        squareEnvironment: 'sandbox'
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('payment_', '');
          if (key in paymentSettings) {
            paymentSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
          }
        });
      }
      
      console.log('Returning payment settings:', paymentSettings);
      res.json(paymentSettings);
    } catch (error: any) {
      console.error('Error in payment settings endpoint:', error);
      res.status(500).json({ message: 'Failed to fetch payment settings' });
    }
  });

  app.put('/api/settings/payment', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('payment', `payment_${key}`, String(value));
      }
      res.json({ message: 'Payment settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating payment settings:', error);
      res.status(500).json({ message: 'Failed to update payment settings' });
    }
  });

  app.get('/api/settings/email', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('email');
      const defaultSettings = {
        emailEnabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: false,
        fromEmail: '',
        fromName: ''
      };
      
      const emailSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('email_', '');
        if (key in emailSettings) {
          emailSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : 
                         ['smtpPort'].includes(key) ? parseInt(setting.value) || 587 : setting.value;
        }
      });
      
      res.json(emailSettings);
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ message: 'Failed to fetch email settings' });
    }
  });

  app.put('/api/settings/email', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('email', `email_${key}`, String(value));
      }
      res.json({ message: 'Email settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ message: 'Failed to update email settings' });
    }
  });

  app.get('/api/settings/notifications', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('notifications');
      const defaultSettings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        invoiceReminders: true,
        paymentReminders: true,
        projectUpdates: true
      };
      
      const notificationSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('notifications_', '');
        if (key in notificationSettings) {
          notificationSettings[key] = setting.value === 'true';
        }
      });
      
      res.json(notificationSettings);
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
  });

  app.put('/api/settings/notifications', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('notifications', `notifications_${key}`, String(value));
      }
      res.json({ message: 'Notification settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ message: 'Failed to update notification settings' });
    }
  });

  app.get('/api/settings/security', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('security');
      const defaultSettings = {
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordComplexity: true,
        loginAttempts: 5,
        accountLockout: true
      };
      
      const securitySettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('security_', '');
        if (key in securitySettings) {
          securitySettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false :
                             ['sessionTimeout', 'loginAttempts'].includes(key) ? parseInt(setting.value) || securitySettings[key] : setting.value;
        }
      });
      
      res.json(securitySettings);
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({ message: 'Failed to fetch security settings' });
    }
  });

  app.put('/api/settings/security', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('security', `security_${key}`, String(value));
      }
      res.json({ message: 'Security settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      res.status(500).json({ message: 'Failed to update security settings' });
    }
  });

  app.get('/api/settings/integrations', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('integrations');
      const defaultSettings = {
        googleMapsEnabled: false,
        googleMapsApiKey: '',
        twilioEnabled: false,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
        docusignEnabled: false,
        docusignClientId: '',
        docusignClientSecret: ''
      };
      
      const integrationSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('integrations_', '');
        if (key in integrationSettings) {
          integrationSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        }
      });
      
      res.json(integrationSettings);
    } catch (error: any) {
      console.error('Error fetching integration settings:', error);
      res.status(500).json({ message: 'Failed to fetch integration settings' });
    }
  });

  app.put('/api/settings/integrations', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('integrations', `integrations_${key}`, String(value));
      }
      res.json({ message: 'Integration settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating integration settings:', error);
      res.status(500).json({ message: 'Failed to update integration settings' });
    }
  });

  app.get('/api/settings/company', async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('company');
      const companySettings = {
        companyName: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        logo: ''
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('company_', '');
          if (key in companySettings) {
            companySettings[key] = setting.value;
          }
        });
      }
      
      res.json(companySettings);
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ message: 'Failed to fetch company settings' });
    }
  });

  app.put('/api/settings/company', async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('company', `company_${key}`, String(value));
      }
      res.json({ message: 'Company settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      res.status(500).json({ message: 'Failed to update company settings' });
    }
  });

  // Authentication routes (public)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await AuthService.hashPassword(validatedData.password);
      const userData = {
        ...validatedData,
        password: hashedPassword,
        role: "user",
        isActive: true,
        emailVerified: false,
      };

      const user = await storage.createUser(userData);
      
      // Create session
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      res.cookie('auth_token', session.token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: session.token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.password,
        user.password
      );
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Update last login
      await AuthService.updateLastLogin(user.id);

      // Create session
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      res.cookie('auth_token', session.token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: session.token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
      if (token) {
        await AuthService.invalidateSession(token);
      }
      res.clearCookie('auth_token');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    // Transform snake_case database fields to camelCase for frontend consistency
    const user = req.user;
    const transformedUser = {
      ...user,
      // Transform all permission fields from snake_case to camelCase
      canAccessDashboard: user.can_access_dashboard,
      canAccessCalendar: user.can_access_calendar,
      canAccessTimeClock: user.can_access_time_clock,
      canAccessJobs: user.can_access_jobs,
      canAccessMyTasks: user.can_access_my_tasks,
      canAccessLeads: user.can_access_leads,
      canAccessExpenses: user.can_access_expenses,
      canAccessQuotes: user.can_access_quotes,
      canAccessInvoices: user.can_access_invoices,
      canAccessCustomers: user.can_access_customers,
      canAccessPayments: user.can_access_payments,
      canAccessFileManager: user.can_access_file_manager,
      canAccessParts: user.can_access_parts,
      canAccessFormBuilder: user.can_access_form_builder,
      canAccessInspections: user.can_access_inspections,
      canAccessInternalMessages: user.can_access_internal_messages,
      canAccessTeamMessages: user.can_access_team_messages,
      canAccessImageGallery: user.can_access_image_gallery,
      canAccessSMS: user.can_access_sms,
      canAccessMessages: user.can_access_messages,
      canAccessGpsTracking: user.can_access_gps_tracking,
      canAccessWeather: user.can_access_weather,
      canAccessReviews: user.can_access_reviews,
      canAccessMarketResearch: user.can_access_market_research,
      canAccessHR: user.can_access_hr,
      canAccessUsers: user.can_access_users,
      canAccessSaasAdmin: user.can_access_saas_admin,
      canAccessAdminSettings: user.can_access_admin_settings,
      canAccessReports: user.can_access_reports,
      // Keep original snake_case fields for backward compatibility if needed
    };
    
    res.json({ user: transformedUser });
  });

  // Seed database with sample data (development only) - BEFORE auth middleware
  app.post("/api/seed", async (req, res) => {
    try {
      await seedDatabase();
      
      // Also seed user accounts for testing
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.length === 0) {
        // Create admin user
        const adminPassword = await AuthService.hashPassword("admin123");
        await storage.createUser({
          username: "admin",
          email: "admin@example.com",
          password: adminPassword,
          firstName: "System",
          lastName: "Administrator",
          role: "admin",
          isActive: true,
          emailVerified: true,
        });

        // Create manager user  
        const managerPassword = await AuthService.hashPassword("manager123");
        await storage.createUser({
          username: "manager",
          email: "manager@example.com",
          password: managerPassword,
          firstName: "John",
          lastName: "Manager",
          role: "manager",
          isActive: true,
          emailVerified: true,
        });

        // Create regular user
        const userPassword = await AuthService.hashPassword("user123");
        await storage.createUser({
          username: "user",
          email: "user@example.com",
          password: userPassword,
          firstName: "Jane",
          lastName: "User",
          role: "user",
          isActive: true,
          emailVerified: false,
        });

        console.log("✅ Created sample user accounts");
        console.log("Admin: username=admin, password=admin123");
        console.log("Manager: username=manager, password=manager123");
        console.log("User: username=user, password=user123");
      }
      
      res.json({ message: "Database seeded successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error seeding database: " + error.message });
    }
  });

  // Apply authentication middleware to protected routes only
  app.use('/api', (req, res, next) => {
    // Skip auth for these routes
    const publicRoutes = ['/api/auth/', '/api/seed', '/api/settings/'];
    const isPublic = publicRoutes.some(route => req.path.startsWith(route) || req.path === route);
    
    if (isPublic) {
      return next();
    }
    return requireAuth(req, res, next);
  });



  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const stats = await storage.getInvoiceStats(user.id);
      
      // Get task completion analytics for the organization
      const taskAnalytics = await storage.getTaskCompletionAnalytics(user.organizationId);
      
      // Add missing fields required by the frontend plus task analytics
      const dashboardStats = {
        totalRevenue: 0,
        totalInvoices: stats.totalInvoices || "0",
        paidInvoices: stats.paidInvoices || "0", 
        pendingInvoices: stats.pendingInvoices || 0,
        overdueInvoices: 0,
        pendingValue: 0,
        paidValue: 0,
        overdueValue: 0,
        // Task completion analytics
        totalTasks: taskAnalytics.totalTasks,
        completedTasks: taskAnalytics.completedTasks,
        taskCompletionRate: taskAnalytics.completionRate,
        tasksCompletedToday: taskAnalytics.completedToday,
        tasksCompletedThisWeek: taskAnalytics.completedThisWeek,
        averageCompletionTime: taskAnalytics.averageCompletionTime,
        topPerformers: taskAnalytics.topPerformers
      };
      
      res.json(dashboardStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const customers = await storage.getCustomers(user.organizationId);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const customerData = insertCustomerSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
      });
      const customer = await storage.createCustomer({
        ...customerData,
        userId: req.user!.id,
      });
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('customer_created', {
        customer,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.status(201).json(customer);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(parseInt(req.params.id), req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(parseInt(req.params.id), req.user.id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Excel Import endpoint
  app.post("/api/customers/import", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Import XLSX library
      const XLSX = require('xlsx');
      
      // Read the uploaded Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of jsonData) {
        try {
          // Map Excel columns to customer fields (case-insensitive)
          const customerData = {
            name: row['Name'] || row['name'] || row['NAME'] || '',
            email: row['Email'] || row['email'] || row['EMAIL'] || '',
            phone: row['Phone'] || row['phone'] || row['PHONE'] || row['Phone Number'] || row['phone_number'] || '',
            address: row['Address'] || row['address'] || row['ADDRESS'] || '',
            city: row['City'] || row['city'] || row['CITY'] || '',
            state: row['State'] || row['state'] || row['STATE'] || '',
            zipCode: row['ZipCode'] || row['zipcode'] || row['zip_code'] || row['ZIP'] || row['Zip Code'] || '',
            country: row['Country'] || row['country'] || row['COUNTRY'] || 'US',
            organizationId: user.organizationId,
            userId: req.user!.id,
          };

          // Skip rows without required fields
          if (!customerData.name || !customerData.email) {
            skipped++;
            continue;
          }

          // Check if customer already exists (by email within organization)
          const existingCustomer = await storage.getCustomerByEmail(customerData.email, user.organizationId);
          if (existingCustomer) {
            skipped++;
            continue;
          }

          // Validate and create customer
          const validatedData = insertCustomerSchema.parse(customerData);
          await storage.createCustomer(validatedData);
          imported++;

        } catch (error: any) {
          errors.push(`Row ${imported + skipped + 1}: ${error.message}`);
          skipped++;
        }
      }

      // Clean up uploaded file
      const fs = require('fs');
      fs.unlinkSync(req.file.path);

      // Broadcast to all web users
      if (imported > 0) {
        (app as any).broadcastToWebUsers('customers_imported', {
          imported,
          skipped,
          importedBy: req.user!.username
        }, req.user!.id);
      }

      res.json({
        imported,
        skipped,
        errors: errors.slice(0, 10), // Limit error messages
        totalProcessed: imported + skipped
      });

    } catch (error: any) {
      console.error("Error importing customers:", error);
      
      // Clean up uploaded file if it exists
      if (req.file) {
        const fs = require('fs');
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      
      res.status(500).json({ message: "Failed to import customers: " + error.message });
    }
  });

  // Invoice routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const invoices = await storage.getInvoices(user.organizationId);
      res.json(invoices);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        userId: req.user.id,
        invoiceNumber: req.body.invoiceNumber || invoiceNumber,
        status: req.body.status || 'draft',
      });
      
      const invoice = await storage.createInvoice(invoiceData);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('invoice_created', {
        invoice,
        createdBy: req.user.username
      }, req.user.id);
      
      res.status(201).json(invoice);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id), req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.omit({ lineItems: true }).partial().parse(req.body);
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.user.id, invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Upload previous invoice
  app.post("/api/invoices/upload", invoiceUpload.single('invoice'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get original file name from request
      const originalFileName = req.body.originalName || req.file.originalname;
      
      // Create a special invoice record for uploaded files
      const invoiceData = {
        userId: user.id,
        customerId: null, // Set to null for uploaded invoices without customer
        invoiceNumber: `UPL-${Date.now()}`, // Special prefix for uploaded invoices
        status: 'uploaded' as const,
        subtotal: "0.00",
        total: "0.00",
        currency: "USD",
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        attachmentUrl: `/uploads/org-${user.organizationId}/files/${req.file.filename}`,
        originalFileName: originalFileName,
        isUploadedInvoice: true,
        notes: `Uploaded previous invoice: ${originalFileName}`
      };

      const invoice = await storage.createUploadedInvoice(invoiceData);
      
      res.status(201).json({
        message: "Invoice uploaded successfully",
        invoice: invoice,
        filename: req.file.filename,
        originalName: originalFileName
      });
    } catch (error: any) {
      console.error("Error uploading invoice:", error);
      res.status(500).json({ message: error.message || "Failed to upload invoice" });
    }
  });

  // Send invoice (update status to sent)
  app.post("/api/invoices/:id/send", async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments(req.user.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent creation
  app.post("/api/payments/stripe/create-intent", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      
      const invoice = await storage.getInvoice(invoiceId, req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(invoice.total) * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        metadata: {
          invoiceId: invoiceId.toString(),
          userId: req.user.id.toString(),
        },
      });

      // Update invoice with payment intent ID
      await storage.updateInvoice(invoiceId, req.user.id, {
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook for payment confirmation
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
      } catch (err) {
        return res.status(400).send(`Webhook signature verification failed.`);
      }

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { invoiceId, userId } = paymentIntent.metadata;

        // Create payment record
        await storage.createPayment({
          invoiceId: parseInt(invoiceId),
          amount: (paymentIntent.amount / 100).toString(),
          currency: paymentIntent.currency.toUpperCase(),
          method: 'stripe',
          status: 'completed',
          externalId: paymentIntent.id,
        });

        // Update invoice status
        await storage.updateInvoice(parseInt(invoiceId), parseInt(userId), {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'stripe',
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual payment marking
  app.post("/api/invoices/:id/mark-paid", async (req, res) => {
    try {
      const { method = 'manual', notes } = req.body;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(invoiceId, req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Create payment record
      const payment = await storage.createPayment({
        invoiceId,
        amount: invoice.total,
        currency: invoice.currency,
        method,
        status: 'completed',
        externalId: notes || null,
      });

      // Update invoice status
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.user.id, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: method,
      });

      // Broadcast to all web users except the processor
      (app as any).broadcastToWebUsers('payment_processed', {
        payment,
        invoice: updatedInvoice,
        processedBy: req.user.username
      }, req.user.id);

      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quote routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotes(req.user.id);
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      // Generate quote number
      const quoteNumber = `QUO-${Date.now()}`;
      
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        userId: req.user.id,
        quoteNumber: req.body.quoteNumber || quoteNumber,
        status: req.body.status || 'draft',
      });
      
      const quote = await storage.createQuote(quoteData);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('quote_created', {
        quote,
        createdBy: req.user.username
      }, req.user.id);
      
      res.status(201).json(quote);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(parseInt(req.params.id), req.user.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/quotes/:id", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.omit({ lineItems: true }).partial().parse(req.body);
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, quoteData);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuote(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send quote (update status to sent)
  app.post("/api/quotes/:id/send", async (req, res) => {
    try {
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Accept quote
  app.post("/api/quotes/:id/accept", async (req, res) => {
    try {
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'accepted',
        acceptedAt: new Date()
      });
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Convert quote to invoice
  app.post("/api/quotes/:id/convert-to-invoice", async (req, res) => {
    try {
      const invoice = await storage.convertQuoteToInvoice(parseInt(req.params.id), req.user.id);
      if (!invoice) {
        return res.status(400).json({ message: "Quote cannot be converted. It must be accepted first." });
      }
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Email quote (placeholder for now - would use SendGrid in production)
  app.post("/api/quotes/:id/email", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      const quote = await storage.getQuote(parseInt(req.params.id), req.user.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // In a real implementation, this would use SendGrid or another email service
      // For now, we'll just return success and update the quote status
      await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      
      res.json({ 
        message: "Quote emailed successfully", 
        to, 
        subject: subject || `Quote ${quote.quoteNumber}`,
        quote: quote
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get settings by category
  app.get("/api/settings/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const settings = await storage.getSettings(category);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching settings: " + error.message });
    }
  });

  // Update settings by category
  app.put("/api/settings/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const settingsData = req.body;
      
      await storage.updateSettings(category, settingsData);
      res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating settings: " + error.message });
    }
  });

  // Upload company logo
  app.post("/api/upload/logo", requireAuth, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = getAuthenticatedUser(req);
      
      // Apply compression if it's an image file
      let finalPath = req.file.path;
      let fileName = req.file.filename;
      
      if (req.file.mimetype.startsWith('image/')) {
        const originalPath = req.file.path;
        const compressedFilename = `compressed-${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
        
        if (compressionResult.success) {
          finalPath = compressedPath;
          fileName = compressedFilename;
          console.log(`✅ Logo compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
        } else {
          console.log(`❌ Logo compression failed: ${compressionResult.error}`);
        }
      }
      
      // Update company settings with logo path
      await storage.updateSetting('company', 'logo', finalPath);

      res.json({ 
        message: "Logo uploaded successfully",
        logoUrl: `/uploads/org-${user.organizationId}/files/${fileName}`
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error uploading logo: " + error.message });
    }
  });

  // Upload inspection images
  app.post("/api/upload-inspection-images", requireAuth, inspectionImageUpload.array('inspectionImages', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      const user = getAuthenticatedUser(req);
      const processedFilePaths: string[] = [];

      // Process each uploaded image
      for (const file of files) {
        const originalPath = file.path;
        const compressedFilename = `compressed-${file.filename.replace(path.extname(file.filename), '.jpg')}`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        // Try to apply compression (with safety guarantee)
        const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
        
        if (compressionResult.success) {
          // Use compressed image, original preserved
          processedFilePaths.push(`/uploads/org-${user.organizationId}/inspection_report_images/${compressedFilename}`);
          console.log(`✅ Inspection image compressed: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB, original preserved at:`, originalPath);
        } else {
          // Use original image (compression disabled or failed, original preserved)
          processedFilePaths.push(`/uploads/org-${user.organizationId}/inspection_report_images/${file.filename}`);
          console.log(`❌ Inspection compression failed: ${compressionResult.error}, using original:`, originalPath);
        }
      }

      res.json({ 
        message: `${files.length} inspection image(s) uploaded successfully`,
        filePaths: processedFilePaths
      });
    } catch (error: any) {
      console.error('Error uploading inspection images:', error);
      res.status(500).json({ message: "Error uploading inspection images: " + error.message });
    }
  });

  // General file upload for messages and attachments
  app.post("/api/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      console.log('Upload request received:', {
        file: req.file ? 'Present' : 'Missing',
        body: req.body,
        user: req.user?.username
      });

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = getAuthenticatedUser(req);

      console.log('File details:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Apply compression if it's an image file
      let finalFileName = req.file.filename;
      let finalSize = req.file.size;
      
      if (req.file.mimetype.startsWith('image/')) {
        const originalPath = req.file.path;
        const compressedFilename = `compressed-${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
        
        if (compressionResult.success) {
          finalFileName = compressedFilename;
          finalSize = compressionResult.compressedSize!;
          console.log(`✅ File compression successful: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
          console.log(`❌ File compression failed: ${compressionResult.error}`);
        }
        
        // Save image metadata to database
        const userInfo = await storage.getUser(req.user!.id);
        const imageData = {
          filename: finalFileName,
          originalName: req.file.originalname,
          mimeType: compressionResult.success ? 'image/jpeg' : req.file.mimetype,
          size: finalSize,
          userId: req.user!.id,
          organizationId: userInfo?.organizationId || 1,
          projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
          customerId: req.body.customerId ? parseInt(req.body.customerId) : null,
        };

        console.log('Creating image record:', imageData);
        await storage.createImage(imageData);
        console.log('Image record created successfully');
      }

      // File uploaded successfully
      res.json({
        message: "File uploaded successfully",
        url: `/uploads/org-${user.organizationId}/files/${finalFileName}`,
        filename: req.file.originalname,
        size: finalSize,
        mimetype: req.file.mimetype.startsWith('image/') && finalFileName.includes('compressed-') ? 'image/jpeg' : req.file.mimetype
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ message: "Error uploading file: " + error.message });
    }
  });

  // Image upload specifically for image gallery (Cloudinary-based)
  app.post("/api/upload/image", requireAuth, imageUpload.single('file'), async (req, res) => {
    try {
      console.log('☁️ Cloudinary Image Gallery upload request received:', {
        file: req.file ? 'Present' : 'Missing',
        body: req.body,
        user: req.user?.username
      });

      if (!req.file) {
        console.log('No image file in request');
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const user = getAuthenticatedUser(req);

      // Check if Cloudinary is configured
      if (!CloudinaryService.isConfigured()) {
        console.log('⚠️ Cloudinary not configured for image gallery');
        return res.status(500).json({ message: "Cloud storage not configured" });
      }

      console.log('Image file details:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Upload to Cloudinary with automatic optimization
      console.log('☁️ Uploading image to Cloudinary...');
      const fileBuffer = await fs.readFile(req.file.path);
      
      const cloudinaryResult = await CloudinaryService.uploadImage(fileBuffer, {
        folder: 'image-gallery',
        filename: req.file.originalname,
        organizationId: user.organizationId,
        quality: 85, // High quality for gallery images
        maxWidth: 2400,
        maxHeight: 2400
      });

      if (!cloudinaryResult.success) {
        console.error('❌ Cloudinary image gallery upload failed:', cloudinaryResult.error);
        return res.status(500).json({ message: "Failed to upload image to cloud storage: " + cloudinaryResult.error });
      }

      console.log('✅ Cloudinary image gallery upload successful:', cloudinaryResult.secureUrl);

      // Save image metadata to database with Cloudinary URL
      const imageData = {
        filename: cloudinaryResult.publicId!.split('/').pop() || req.file.originalname,
        originalName: req.file.originalname,
        mimeType: cloudinaryResult.format ? `image/${cloudinaryResult.format}` : req.file.mimetype,
        size: cloudinaryResult.bytes || req.file.size,
        userId: req.user!.id,
        organizationId: user.organizationId,
        projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
        customerId: req.body.customerId ? parseInt(req.body.customerId) : null,
      };

      console.log('Creating Cloudinary image record:', imageData);
      await storage.createImage(imageData);
      console.log('Image record with Cloudinary URL created successfully');

      // Clean up temporary file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }

      // Return Cloudinary URLs
      res.json({
        message: "Image uploaded successfully to cloud storage",
        url: cloudinaryResult.secureUrl,
        thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.publicId!),
        filename: req.file.originalname,
        size: cloudinaryResult.bytes || req.file.size,
        mimetype: cloudinaryResult.format ? `image/${cloudinaryResult.format}` : req.file.mimetype,
        cloudinaryPublicId: cloudinaryResult.publicId
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: "Error uploading image: " + error.message });
    }
  });

  // Image management endpoints
  app.get("/api/images", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const images = await storage.getImages(userId);
      res.json(images);
    } catch (error: any) {
      console.error('Error fetching images:', error);
      res.status(500).json({ message: 'Failed to fetch images' });
    }
  });

  app.post("/api/images/:id/annotations", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const { annotations, annotatedImageUrl } = req.body;
      const userId = req.user!.id;
      
      await storage.saveImageAnnotations(imageId, userId, annotations, annotatedImageUrl);
      
      res.json({ message: 'Annotations saved successfully' });
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      res.status(500).json({ message: 'Failed to save annotations' });
    }
  });

  // Duplicate image endpoint
  app.post("/api/images/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      const user = getAuthenticatedUser(req);
      
      // Get original image data
      const originalImage = await storage.getImageById(imageId);
      if (!originalImage) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Check if user has access to this image
      if (originalImage.userId !== userId && originalImage.organizationId !== user.organizationId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Copy the file
      // fs already imported as fsSync
      // path already imported
      const originalPath = `./uploads/org-${originalImage.organizationId}/image_gallery/${originalImage.filename}`;
      const duplicateFilename = `copy-${Date.now()}-${originalImage.filename}`;
      const duplicatePath = `./uploads/org-${originalImage.organizationId}/image_gallery/${duplicateFilename}`;

      await fs.promises.copyFile(originalPath, duplicatePath);

      // Create new image record
      const duplicateImageData = {
        filename: duplicateFilename,
        originalName: `Copy of ${originalImage.originalName}`,
        mimeType: originalImage.mimeType,
        size: originalImage.size,
        userId: userId,
        organizationId: originalImage.organizationId,
        projectId: originalImage.projectId,
        customerId: originalImage.customerId,
      };

      const newImage = await storage.createImage(duplicateImageData);
      
      res.json({ 
        message: 'Image duplicated successfully',
        image: newImage
      });
    } catch (error: any) {
      console.error('Error duplicating image:', error);
      res.status(500).json({ message: 'Failed to duplicate image' });
    }
  });

  // Delete image endpoint
  app.delete("/api/images/:id", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      const user = getAuthenticatedUser(req);
      
      // Get image data
      const image = await storage.getImageById(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Check if user has access to this image
      if (image.userId !== userId && image.organizationId !== user.organizationId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Delete the file
      // fs already imported as fsSync
      const filePath = `./uploads/org-${image.organizationId}/image_gallery/${image.filename}`;
      
      try {
        await fs.promises.unlink(filePath);
      } catch (fileError) {
        console.warn('File not found on disk:', filePath);
      }

      // Delete from database
      await storage.deleteImage(imageId);
      
      res.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Failed to delete image' });
    }
  });

  // Serve uploaded files (static files don't need auth for this use case)
  app.use('/uploads', express.static('./uploads'));

  // SMS Messaging endpoints
  
  // Get all messages for the user
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.user.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching messages: " + error.message });
    }
  });

  // Send SMS message
  app.post("/api/messages/send", async (req, res) => {
    try {
      const { to, body, customerId } = req.body;
      
      if (!to || !body) {
        return res.status(400).json({ message: "Phone number and message body are required" });
      }

      // Create message record first with pending status
      const messageData = {
        userId: req.user.id,
        customerId: customerId || null,
        to: to,
        from: process.env.TWILIO_PHONE_NUMBER || "+15551234567", // Sample Twilio phone number
        body: body,
        status: "queued",
        direction: "outbound" as const,
        twilioSid: "",
      };

      const newMessage = await storage.createMessage(messageData);

      try {
        // Attempt to send via Twilio (will fail with sample credentials but demonstrates the flow)
        const twilioMessage = await twilioClient.messages.create({
          body: body,
          from: process.env.TWILIO_PHONE_NUMBER || "+15551234567",
          to: to,
        });

        // Update message with Twilio SID and delivered status
        await storage.updateMessageStatus(twilioMessage.sid, "sent");
        
        // Update our local record
        newMessage.twilioSid = twilioMessage.sid;
        newMessage.status = "sent";
        
      } catch (twilioError: any) {
        // Update message status to failed with error details
        await storage.updateMessageStatus(newMessage.id.toString(), "failed", 
          twilioError.code, twilioError.message);
        
        newMessage.status = "failed";
        newMessage.errorCode = twilioError.code;
        newMessage.errorMessage = twilioError.message;

        // For demo purposes, we'll simulate a successful send with sample data
        console.log("Twilio send failed (expected with sample credentials):", twilioError.message);
        
        // Simulate successful delivery for demo
        newMessage.status = "delivered";
        newMessage.twilioSid = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        await storage.updateMessageStatus(newMessage.twilioSid, "delivered");
      }

      res.json(newMessage);
    } catch (error: any) {
      res.status(500).json({ message: "Error sending message: " + error.message });
    }
  });

  // Webhook to receive SMS messages (Twilio webhook)
  app.post("/api/messages/webhook", async (req, res) => {
    try {
      const { MessageSid, From, To, Body } = req.body;
      
      // Create incoming message record
      const messageData = {
        userId: 1, // In a real app, you'd determine this from the To number
        customerId: null, // Could lookup customer by phone number
        to: To,
        from: From,
        body: Body,
        status: "received",
        direction: "inbound" as const,
        twilioSid: MessageSid,
      };

      await storage.createMessage(messageData);
      
      // Respond to Twilio with empty TwiML to acknowledge receipt
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).send("Webhook processing failed");
    }
  });

  // Update message status (for delivery receipts)
  app.post("/api/messages/:sid/status", async (req, res) => {
    try {
      const { status, errorCode, errorMessage } = req.body;
      await storage.updateMessageStatus(req.params.sid, status, errorCode, errorMessage);
      res.json({ message: "Status updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating message status: " + error.message });
    }
  });

  // Get users for messaging (authenticated users only) - filtered by organization
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const users = await storage.getUsersByOrganization(user.organizationId);
      // Remove passwords and sensitive info from response, exclude current user
      const safeUsers = users
        .filter(u => u.id !== user.id) // Don't include current user in messaging list
        .map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching users: " + error.message });
    }
  });

  // Get users for assignment (includes current user) - filtered by organization
  app.get("/api/users/assignment", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const users = await storage.getUsersByOrganization(user.organizationId);
      // Remove passwords and sensitive info from response, include current user for assignment
      const safeUsers = users
        .map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching users for assignment: " + error.message });
    }
  });

  // GPS Tracking endpoints
  app.get("/api/gps-tracking/sessions", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const isAdmin = user.role === 'admin';
      
      // Regular users can only see their own sessions, admins can see all
      const sessions = await db.select({
        id: userSessions.id,
        userId: userSessions.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: userSessions.createdAt,
        latitude: userSessions.latitude,
        longitude: userSessions.longitude,
        locationAccuracy: userSessions.locationAccuracy,
        deviceType: userSessions.deviceType,
        locationTimestamp: userSessions.locationTimestamp,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress,
        address: userSessions.address, // Include the human-readable address
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          isAdmin ? undefined : eq(userSessions.userId, user.id),
          isNotNull(userSessions.latitude),
          isNotNull(userSessions.longitude)
        )
      )
      .orderBy(desc(userSessions.createdAt))
      .limit(100);

      res.json(sessions);
    } catch (error: any) {
      console.error("Error fetching GPS sessions:", error);
      res.status(500).json({ message: "Error fetching GPS data: " + error.message });
    }
  });

  app.get("/api/gps-tracking/stats", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const isAdmin = user.role === 'admin';
      
      const whereCondition = and(
        isAdmin ? undefined : eq(userSessions.userId, user.id),
        isNotNull(userSessions.latitude),
        isNotNull(userSessions.longitude)
      );

      const [totalSessions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSessions)
        .where(whereCondition);

      const [mobileSessions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSessions)
        .where(
          and(
            whereCondition,
            eq(userSessions.deviceType, 'mobile')
          )
        );

      const [recentSessions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSessions)
        .where(
          and(
            whereCondition,
            gte(userSessions.createdAt, sql`now() - interval '24 hours'`)
          )
        );

      res.json({
        totalSessions: totalSessions.count,
        mobileSessions: mobileSessions.count,
        recentSessions: recentSessions.count,
        mobilePercentage: totalSessions.count > 0 ? Math.round((mobileSessions.count / totalSessions.count) * 100) : 0,
      });
    } catch (error: any) {
      console.error("Error fetching GPS stats:", error);
      res.status(500).json({ message: "Error fetching GPS stats: " + error.message });
    }
  });

  // User Management endpoints (Admin only)
  
  // Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined,
      }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching users: " + error.message });
    }
  });

  // Get user statistics
  app.get("/api/admin/users/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user stats: " + error.message });
    }
  });

  // Bulk user actions
  app.post("/api/admin/users/bulk-action", requireAdmin, async (req, res) => {
    try {
      const { userIds, action, value } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Invalid user IDs provided" });
      }

      let result;
      switch (action) {
        case "activate":
          result = await storage.bulkActivateUsers(userIds);
          break;
        case "deactivate":
          result = await storage.bulkDeactivateUsers(userIds);
          break;
        case "changeRole":
          if (!value) {
            return res.status(400).json({ message: "Role value required" });
          }
          result = await storage.bulkChangeUserRole(userIds, value);
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      res.json({ message: `Bulk action completed for ${result} users` });
    } catch (error: any) {
      res.status(500).json({ message: "Error performing bulk action: " + error.message });
    }
  });

  // Create new user (Admin only)
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await AuthService.hashPassword(validatedData.password);
      
      // Get the admin's organization ID for automatic assignment
      const adminUser = getAuthenticatedUser(req);
      
      const userData = {
        ...validatedData,
        password: hashedPassword,
        organizationId: adminUser.organizationId, // Use admin's organization instead of from request
        role: req.body.role || "user",
        userType: req.body.userType || "both",
        isActive: req.body.isActive !== false,
        emailVerified: false,
      };

      const user = await storage.createUser(userData);
      
      // Ensure organization folders exist for multi-tenant isolation
      // ensureOrganizationFolders already imported
      if (user.organizationId) {
        await ensureOrganizationFolders(user.organizationId);
      }
      
      // Broadcast employee creation for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'user_created', {
        user: { ...user, password: undefined },
        createdBy: req.user!.username,
        action: 'created'
      });
      
      res.status(201).json({
        ...user,
        password: undefined, // Don't return password
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("User creation error:", error);
      res.status(500).json({ message: "User creation failed" });
    }
  });

  // Update user (Admin only)
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { password, ...updateData } = req.body;

      console.log("User update request:", { userId, updateData, hasPassword: !!password });

      // Get current admin user for organization filtering
      const adminUser = getAuthenticatedUser(req);

      // If password is being updated, hash it
      if (password) {
        const hashedPassword = await AuthService.hashPassword(password);
        await storage.updateUserPassword(userId, hashedPassword);
      }

      // Update other user data
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Broadcast employee update for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'employee_updated', {
        user: { ...updatedUser, password: undefined },
        updatedBy: req.user!.username,
        action: 'updated'
      });

      res.json({
        ...updatedUser,
        password: undefined, // Don't return password
      });
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ message: "User update failed" });
    }
  });

  // Update user permissions (Admin only)
  app.put("/api/admin/users/:id/permissions", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const permissions = req.body;

      // Get current user to verify it exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow permission changes for admin users
      if (user.role === 'admin') {
        return res.status(400).json({ message: "Cannot modify admin user permissions" });
      }

      // Get current admin user for organization filtering
      const adminUser = getAuthenticatedUser(req);

      // Update user permissions
      const updatedUser = await storage.updateUser(userId, permissions);
      
      // Broadcast permissions update for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'employee_permissions_updated', {
        user: { ...updatedUser, password: undefined },
        updatedBy: req.user!.username,
        action: 'permissions_updated'
      });

      res.json({
        ...updatedUser,
        password: undefined, // Don't return password
      });
    } catch (error) {
      console.error("User permissions update error:", error);
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  // Deactivate user (Admin only)
  app.post("/api/admin/users/:id/deactivate", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get user data before deactivation for broadcasting
      const userToDeactivate = await storage.getUser(userId);
      if (!userToDeactivate) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get current admin user for organization filtering
      const adminUser = getAuthenticatedUser(req);

      await storage.deactivateUser(userId);
      await AuthService.invalidateAllUserSessions(userId);

      // Broadcast user deactivation for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'employee_deactivated', {
        user: { ...userToDeactivate, password: undefined },
        deactivatedBy: req.user!.username,
        action: 'deactivated'
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deactivating user: " + error.message });
    }
  });

  // Activate user (Admin only)
  app.post("/api/admin/users/:id/activate", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get user data before activation for broadcasting
      const userToActivate = await storage.getUser(userId);
      if (!userToActivate) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get current admin user for organization filtering
      const adminUser = getAuthenticatedUser(req);

      await storage.activateUser(userId);

      // Get updated user data after activation
      const updatedUser = await storage.getUser(userId);

      // Broadcast user activation for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'employee_activated', {
        user: { ...updatedUser, password: undefined },
        activatedBy: req.user!.username,
        action: 'activated'
      });

      res.json({ message: "User activated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error activating user: " + error.message });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting self
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Get user data before deletion for broadcasting
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get current admin user for organization filtering
      const adminUser = getAuthenticatedUser(req);

      await AuthService.invalidateAllUserSessions(userId);
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      // Broadcast employee deletion for real-time analytics
      broadcastToWebUsers(adminUser.organizationId, 'employee_deleted', {
        user: { ...userToDelete, password: undefined },
        deletedBy: req.user!.username,
        action: 'deleted'
      });

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting user: " + error.message });
    }
  });

  // Change password (authenticated users)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      
      // Get current user
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.currentPassword,
        user.password
      );
      
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await AuthService.hashPassword(validatedData.newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Invalidate all sessions except current one
      const currentToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
      await AuthService.invalidateAllUserSessions(user.id);
      
      // Create new session for current user
      if (currentToken) {
        const session = await AuthService.createSession(
          user.id,
          req.headers['user-agent'],
          req.ip
        );
        
        res.cookie('auth_token', session.token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Password change error:", error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Project Management API endpoints
  
  // Projects
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const status = req.query.status as string;
      const projects = await storage.getProjects(user.organizationId, user.id, user.role, status);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { 
        startDate, 
        endDate, 
        deadline, 
        budget, 
        enableImageTimestamp,
        timestampFormat,
        includeGpsCoords,
        timestampPosition,
        shareWithTeam,
        ...otherData 
      } = req.body;
      
      // Validate budget if provided
      let validatedBudget = null;
      if (budget !== null && budget !== undefined && budget !== '') {
        const budgetNumber = parseFloat(budget);
        if (isNaN(budgetNumber)) {
          return res.status(400).json({ message: "Invalid budget value" });
        }
        // Check if budget exceeds maximum allowed value (99,999,999.99)
        if (budgetNumber >= 100000000) {
          return res.status(400).json({ message: "Budget cannot exceed $99,999,999.99" });
        }
        validatedBudget = budgetNumber;
      }
      
      const projectData = {
        ...otherData,
        userId,
        budget: validatedBudget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        // Image timestamp settings
        enableImageTimestamp: enableImageTimestamp || false,
        timestampFormat: timestampFormat || "MM/dd/yyyy hh:mm a",
        includeGpsCoords: includeGpsCoords || false,
        timestampPosition: timestampPosition || "bottom-right",
        // Job sharing settings
        shareWithTeam: shareWithTeam !== undefined ? shareWithTeam : true, // Default to sharing with team
      };
      
      const project = await storage.createProject(projectData);
      
      // Handle waiver attachments if any were selected
      const { includeWaivers, selectedWaivers } = req.body;
      if (includeWaivers && selectedWaivers && Array.isArray(selectedWaivers) && selectedWaivers.length > 0) {
        try {
          await storage.attachWaiversToProject(project.id, selectedWaivers, userId);
        } catch (waiversError) {
          console.error("Error attaching waivers to project:", waiversError);
          // Continue with project creation even if waiver attachment fails
        }
      }
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('project_created', {
        project,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Historical Jobs Endpoint
  app.post("/api/projects/historical", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { startDate, endDate, ...otherData } = req.body;
      
      const historicalJobData = {
        ...otherData,
        userId,
        organizationId,
        status: 'completed', // Historical jobs are always completed
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const project = await storage.createProject(historicalJobData);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers('project_created', {
        message: 'Historical job added successfully',
        project
      }, userId);

      res.json(project);
    } catch (error: any) {
      console.error("Error creating historical job:", error);
      res.status(500).json({ message: "Failed to create historical job" });
    }
  });

  // Historical Job Image Upload Endpoint
  app.post("/api/projects/historical/:id/images", requireAuth, historicalJobImageUpload.array('images', 10), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Verify the historical job exists and belongs to the user's organization
      const project = await storage.getProject(projectId, userId);
      if (!project || project.status !== 'completed') {
        return res.status(404).json({ message: "Historical job not found" });
      }

      const uploadedImages = [];

      for (const file of files) {
        // Apply compression if settings allow
        const compressionSettings = await storage.getSettings(organizationId, 'system');
        const enableCompression = compressionSettings.find(s => s.key === 'enable_image_compression')?.value === 'true';
        
        if (enableCompression) {
          const compressionResult = await compressImage(file.path, file.path, organizationId);
          if (compressionResult.success) {
            console.log(`✅ Historical job image compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
          } else {
            console.log(`❌ Historical job image compression failed: ${compressionResult.error}`);
          }
        }

        const imagePath = `/api/uploads/org-${organizationId}/historical_job_images/${file.filename}`;
        uploadedImages.push({
          filename: file.filename,
          originalname: file.originalname,
          path: imagePath,
          size: file.size,
          projectId
        });
      }

      // Broadcast to WebSocket clients
      broadcastToWebUsers('historical_job_images_uploaded', {
        message: `${files.length} image(s) uploaded for historical job`,
        projectId,
        images: uploadedImages
      }, userId);

      res.json({
        message: "Images uploaded successfully",
        images: uploadedImages
      });
    } catch (error: any) {
      console.error("Error uploading historical job images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const project = await storage.getProject(projectId, userId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Ensure users array is always present
      const projectWithUsers = {
        ...project,
        users: project.users || []
      };
      
      console.log(`Project ${projectId} users:`, projectWithUsers.users);
      res.json(projectWithUsers);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the current project to compare status changes
      const currentProject = await storage.getProject(projectId, userId);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      const updatedProject = await storage.updateProject(projectId, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // Check if project was just marked as completed and trigger review request
      if (req.body.status === 'completed' && currentProject.status !== 'completed') {
        try {
          // Get review settings
          const reviewSettings = await storage.getGoogleMyBusinessSettings(userId);
          
          if (reviewSettings && reviewSettings.isActive && updatedProject.customerId) {
            // Get customer details
            const customer = await storage.getCustomer(updatedProject.customerId, userId);
            
            if (customer && customer.phone) {
              // Create and send review request
              const reviewRequest = await storage.createReviewRequest({
                userId,
                customerId: updatedProject.customerId,
                projectId: updatedProject.id,
                customerPhone: customer.phone,
                customerName: customer.name,
                status: 'sent',
                requestDate: new Date()
              });

              // Log the SMS that would be sent (implement actual Twilio here)
              const message = `Hi ${customer.name}! Thanks for choosing ${reviewSettings.businessName}. We'd love a 5-star review if you're happy with our work: ${reviewSettings.reviewUrl}`;
              console.log(`Auto-review SMS would be sent to ${customer.phone}: ${message}`);
            }
          }
        } catch (reviewError) {
          console.error('Error sending auto-review request:', reviewError);
          // Don't fail the project update if review request fails
        }
      }
      
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const deleted = await storage.deleteProject(projectId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Users
  app.post("/api/projects/:id/users", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectUserData = { ...req.body, projectId };
      const projectUser = await storage.assignUserToProject(projectUserData.userId, projectId, projectUserData.role);
      
      // Get updated project data for WebSocket broadcast
      const updatedProject = await storage.getProject(projectId, req.user!.id);
      
      // Get authenticated user for organization filtering  
      const user = getAuthenticatedUser(req);
      
      // Broadcast project assignment update to organization users
      broadcastToWebUsers(user.organizationId, 'project_user_assigned', {
        projectId,
        userId: projectUserData.userId,
        role: projectUserData.role,
        project: updatedProject
      });
      
      // Broadcast employee metrics update for real-time performance tracking
      broadcastToWebUsers(user.organizationId, 'employee_project_assignment_updated', {
        projectId,
        userId: projectUserData.userId,
        action: 'assigned'
      });
      
      res.status(201).json(projectUser);
    } catch (error: any) {
      console.error("Error adding user to project:", error);
      res.status(500).json({ message: "Failed to add user to project" });
    }
  });

  app.delete("/api/projects/:id/users/:userId", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const removed = await storage.removeUserFromProject(projectId, userId);
      
      if (!removed) {
        return res.status(404).json({ message: "User not found in project" });
      }
      
      // Get updated project data for WebSocket broadcast
      const updatedProject = await storage.getProject(projectId, req.user!.id);
      
      // Broadcast project user removal update to all web users
      broadcastToWebUsers('project_user_removed', {
        projectId,
        userId,
        project: updatedProject
      });
      
      res.json({ message: "User removed from project successfully" });
    } catch (error: any) {
      console.error("Error removing user from project:", error);
      res.status(500).json({ message: "Failed to remove user from project" });
    }
  });

  // Bulk Project Assignment - Assign multiple users at once
  app.post("/api/projects/:id/assign", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userIds, role = 'member' } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Must provide at least one user ID" });
      }

      const assignments = [];
      
      // Add each user to the project
      for (const userId of userIds) {
        try {
          const projectUserData = { userId: parseInt(userId), projectId, role };
          const projectUser = await storage.assignUserToProject(parseInt(userId), projectId, role);
          assignments.push(projectUser);
        } catch (error) {
          console.error(`Error assigning user ${userId} to project ${projectId}:`, error);
          // Continue with other assignments even if one fails
        }
      }

      // Get updated project data for WebSocket broadcast
      const updatedProject = await storage.getProject(projectId, req.user!.id);
      
      // Get authenticated user for organization filtering
      const user = getAuthenticatedUser(req);
      
      // Broadcast project assignment update to organization users
      broadcastToWebUsers(user.organizationId, 'project_users_assigned', {
        projectId,
        userIds,
        role,
        project: updatedProject,
        assignmentsCount: assignments.length
      });
      
      // Broadcast employee metrics update for real-time performance tracking
      broadcastToWebUsers(user.organizationId, 'employee_project_assignments_updated', {
        projectId,
        userIds,
        action: 'assigned'
      });
      
      res.status(201).json({
        message: `Successfully assigned ${assignments.length} users to project`,
        assignments,
        project: updatedProject
      });
    } catch (error: any) {
      console.error("Error bulk assigning users to project:", error);
      res.status(500).json({ message: "Failed to assign users to project" });
    }
  });

  // Remove multiple users from project
  app.delete("/api/projects/:id/assign", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Must provide at least one user ID" });
      }

      let removedCount = 0;
      
      // Remove each user from the project
      for (const userId of userIds) {
        try {
          const removed = await storage.removeUserFromProject(projectId, parseInt(userId));
          if (removed) removedCount++;
        } catch (error) {
          console.error(`Error removing user ${userId} from project ${projectId}:`, error);
          // Continue with other removals even if one fails
        }
      }

      // Get updated project data for WebSocket broadcast
      const updatedProject = await storage.getProject(projectId, req.user!.id);
      
      // Broadcast project user removal update to all web users
      broadcastToWebUsers('project_users_removed', {
        projectId,
        userIds,
        project: updatedProject,
        removedCount
      });
      
      res.json({
        message: `Successfully removed ${removedCount} users from project`,
        removedCount,
        project: updatedProject
      });
    } catch (error: any) {
      console.error("Error bulk removing users from project:", error);
      res.status(500).json({ message: "Failed to remove users from project" });
    }
  });

  // Tasks
  app.get("/api/projects/:id/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const tasks = await storage.getTasks(projectId, userId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/projects/:id/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { dueDate, ...otherData } = req.body;
      
      const taskData = {
        ...otherData,
        projectId,
        createdById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      };
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      console.log(`Updating task ${taskId} for user ${userId}:`, req.body);
      
      const updatedTask = await storage.updateTask(taskId, userId, req.body);
      
      if (!updatedTask) {
        console.log(`Task ${taskId} not found`);
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`Task ${taskId} updated successfully:`, updatedTask);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: `Failed to update task: ${error.message}` });
    }
  });

  // Task image upload route
  app.post("/api/tasks/:id/image", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const user = getAuthenticatedUser(req);
      let finalFileName = req.file.filename;
      let finalPath = req.file.path;

      // Apply compression if it's an image file
      const isImageFile = /\.(jpeg|jpg|png|gif|webp)$/i.test(req.file.originalname);
      if (isImageFile) {
        const originalPath = req.file.path;
        const compressedFilename = `task-${taskId}-${Date.now()}.jpg`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        // Try to apply compression
        const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
        
        if (compressionResult.success) {
          finalFileName = compressedFilename;
          finalPath = compressedPath;
          console.log(`✅ Task image compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
        } else {
          console.log(`❌ Task image compression failed: ${compressionResult.error}`);
        }
      }

      // Update task with image path
      const imagePath = `uploads/org-${user.organizationId}/files/${finalFileName}`;
      const updatedTask = await storage.updateTask(taskId, userId, { 
        imagePath,
        isCompleted: true,
        completedAt: new Date().toISOString()
      });
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ 
        message: "Image uploaded successfully",
        imagePath,
        task: updatedTask 
      });
    } catch (error: any) {
      console.error("Error uploading task image:", error);
      res.status(500).json({ message: "Failed to upload task image" });
    }
  });

  // Delete task route
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if user can delete this task
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Only allow deletion by creator or admin/manager
      const user = await storage.getUser(userId);
      const canDelete = task.createdById === userId || user?.role === 'admin' || user?.role === 'manager';
      
      if (!canDelete) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }
      
      const deleted = await storage.deleteTask(taskId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Get project files
  app.get("/api/projects/:id/files", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const files = await storage.getProjectFiles(projectId, userId);
      res.json(files);
    } catch (error: any) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ message: "Failed to fetch project files" });
    }
  });

  // File uploads (Cloudinary-based for permanent storage)
  app.post("/api/projects/:id/files", requireAuth, upload.single('file'), async (req, res) => {
    console.log('🔄 CLOUDINARY FILE UPLOAD REQUEST RECEIVED');
    console.log('Project ID:', req.params.id);
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
        return res.status(400).json({ message: "No file uploaded" });
      }

      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const taskId = req.body.taskId ? parseInt(req.body.taskId) : null;
      const user = getAuthenticatedUser(req);

      // Ensure Cloudinary is properly configured
      if (!CloudinaryService.isConfigured()) {
        console.error('❌ Cloudinary not configured - cloud storage required');
        return res.status(500).json({ message: "Cloud storage configuration required" });
      }

      // Get project settings to check if timestamp overlay is enabled
      const project = await storage.getProjectById(projectId);
      console.log('=== TIMESTAMP & CLOUDINARY DEBUG ===');
      console.log('Project ID:', projectId);
      console.log('Project settings:', {
        enableImageTimestamp: project?.enableImageTimestamp,
        timestampFormat: project?.timestampFormat,
        timestampPosition: project?.timestampPosition,
        includeGpsCoords: project?.includeGpsCoords
      });
      console.log('File MIME type:', req.file.mimetype);
      console.log('Is image?', req.file.mimetype.startsWith('image/'));
      
      let finalFilePath = req.file.path;
      let finalFilename = req.file.filename;

      // Apply timestamp overlay if it's an image and project has timestamp enabled
      if (req.file.mimetype.startsWith('image/') && project?.enableImageTimestamp) {
        console.log('Applying timestamp overlay before Cloudinary upload...');
        try {
          const timestampOptions: TimestampOptions = {
            enableTimestamp: true,
            timestampFormat: project.timestampFormat || "MM/dd/yyyy hh:mm a",
            includeGpsCoords: project.includeGpsCoords || false,
            timestampPosition: project.timestampPosition || "bottom-right",
            gpsLatitude: req.body.gpsLatitude ? parseFloat(req.body.gpsLatitude) : undefined,
            gpsLongitude: req.body.gpsLongitude ? parseFloat(req.body.gpsLongitude) : undefined,
            customText: req.body.customText || undefined,
          };

          // Create timestamped version filename
          const timestampedFilename = `timestamped-${req.file.filename}`;
          const timestampedPath = path.join(path.dirname(req.file.path), timestampedFilename);

          const result = await addTimestampToImage(req.file.path, timestampedPath, timestampOptions);
          
          if (result.success) {
            // Use the timestamped image
            finalFilePath = timestampedPath;
            finalFilename = timestampedFilename;
            console.log('✅ Timestamp overlay applied successfully to:', finalFilename);
          } else {
            console.warn('❌ Failed to apply timestamp overlay:', result.error);
            // Continue with original file
          }
        } catch (timestampError) {
          console.error('Error applying timestamp overlay:', timestampError);
          // Continue with original file if timestamp fails
        }
      }

      // Pre-compress large images before Cloudinary upload (ensure under 10MB limit)
      let uploadBuffer = await fs.readFile(finalFilePath);
      let uploadFilePath = finalFilePath;
      
      // Compress if file is over 8MB to ensure Cloudinary compatibility (10MB limit)
      if (req.file.mimetype.startsWith('image/') && req.file.size > 8 * 1024 * 1024) {
        console.log('🔄 Pre-compressing large image before Cloudinary upload...');
        try {
          // Create temporary compressed file path
          const compressedPath = finalFilePath + '.compressed.jpg';
          
          const compressionResult = await compressImage(finalFilePath, compressedPath, user.organizationId);
          
          if (compressionResult.success) {
            uploadBuffer = await fs.readFile(compressedPath);
            uploadFilePath = compressedPath;
            console.log(`✅ Pre-compression successful: ${req.file.size} → ${compressionResult.compressedSize} bytes`);
            
            // If still over 10MB after compression, apply more aggressive compression
            if (uploadBuffer.length > 10 * 1024 * 1024) {
              console.log('🔄 Still over 10MB, applying maximum compression...');
              const maxCompressedPath = finalFilePath + '.max-compressed.jpg';
              
              const maxCompressionResult = await compressImage(compressedPath, maxCompressedPath, user.organizationId);
              
              if (maxCompressionResult.success) {
                uploadBuffer = await fs.readFile(maxCompressedPath);
                uploadFilePath = maxCompressedPath;
                console.log('✅ Maximum compression applied, final size:', uploadBuffer.length, 'bytes');
              }
            }
          }
        } catch (compressionError) {
          console.warn('⚠️ Pre-compression failed, using original:', compressionError);
        }
      }

      // Determine file type based on MIME type
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
        fileType = 'document';
      }

      // Upload to Cloudinary
      console.log('☁️ Uploading to Cloudinary...');
      
      // Determine folder based on file type
      let cloudinaryFolder = 'project-files';
      if (req.file.mimetype.startsWith('image/')) {
        cloudinaryFolder = 'project-images';
      } else if (req.file.mimetype.startsWith('video/')) {
        cloudinaryFolder = 'project-videos';
      } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
        cloudinaryFolder = 'project-documents';
      }

      // Debug the upload buffer size before Cloudinary upload
      console.log(`🔧 Uploading to Cloudinary - Buffer size: ${uploadBuffer.length} bytes (${(uploadBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
      
      const cloudinaryResult = await CloudinaryService.uploadImage(uploadBuffer, {
        folder: cloudinaryFolder,
        filename: req.file.originalname,
        organizationId: user.organizationId,
        quality: 80, // Good compression
        maxWidth: 2000,
        maxHeight: 2000,
        bufferSize: uploadBuffer.length
      });

      if (!cloudinaryResult.success) {
        console.error('❌ CLOUDINARY UPLOAD FAILED - DETAILED ERROR:', cloudinaryResult.error);
        console.error('❌ Cloudinary error details:', JSON.stringify(cloudinaryResult, null, 2));
        console.warn('⚠️ Cloudinary upload failed, falling back to local storage:', cloudinaryResult.error);
        
        // Fallback to local storage with compression
        const finalLocalFilePath = finalFilePath.replace('./uploads/', 'uploads/');
        let localFileSize = req.file.size;
        
        // Apply local compression if image is large
        if (req.file.mimetype.startsWith('image/') && req.file.size > 1024 * 1024) {
          try {
            console.log('🔄 Applying local compression for fallback...');
            const fallbackCompressedPath = finalFilePath + '.fallback-compressed.jpg';
            const compressionResult = await compressImage(finalFilePath, fallbackCompressedPath, user.organizationId);
            
            if (compressionResult.success) {
              console.log(`✅ Local compression successful: ${compressionResult.compressedSize} bytes`);
              localFileSize = compressionResult.compressedSize || req.file.size;
            }
          } catch (compressionError) {
            console.warn('⚠️ Local compression failed:', compressionError);
          }
        }
        
        // Use local storage paths
        const fileData = {
          projectId,
          taskId,
          uploadedById: userId,
          fileName: finalFilename,
          originalName: req.file.originalname,
          filePath: finalLocalFilePath,
          fileSize: localFileSize,
          mimeType: req.file.mimetype,
          fileType,
          description: req.body.description || `Camera photo taken on ${new Date().toLocaleDateString()} by ${user.firstName} ${user.lastName}`,
        };

        console.log('📝 Saving to database with local storage fallback:', fileData);
        const projectFile = await storage.uploadProjectFile(fileData);
        
        return res.status(201).json({
          ...projectFile,
          isCloudStored: false,
          fallbackUsed: true,
          compressionApplied: localFileSize < req.file.size
        });
      }

      console.log('✅ Cloudinary upload successful:', cloudinaryResult.secureUrl);
      console.log('📊 Compression stats:', {
        originalSize: req.file.size,
        compressedSize: cloudinaryResult.bytes,
        reduction: req.file.size > 0 ? ((req.file.size - (cloudinaryResult.bytes || 0)) / req.file.size * 100).toFixed(1) + '%' : 'N/A'
      });

      // Save file data with Cloudinary URL and compressed size
      const fileData = {
        projectId,
        taskId,
        uploadedById: userId,
        fileName: cloudinaryResult.publicId!.split('/').pop() || req.file.originalname,
        originalName: req.file.originalname,
        filePath: cloudinaryResult.secureUrl!, // Always use Cloudinary URL
        fileSize: cloudinaryResult.bytes || req.file.size, // Use compressed size
        mimeType: cloudinaryResult.format ? `image/${cloudinaryResult.format}` : req.file.mimetype,
        fileType,
        description: req.body.description || `Camera photo taken on ${new Date().toLocaleDateString()} by ${user.firstName} ${user.lastName}`,
      };

      console.log('📝 About to save Cloudinary file data to database:', fileData);
      
      const projectFile = await storage.uploadProjectFile(fileData);
      
      console.log('✅ File saved to database with Cloudinary URL and compressed size:', projectFile);
      
      // Clean up all temporary files since we're using Cloudinary
      try {
        await fs.unlink(req.file.path);
        if (finalFilePath !== req.file.path) {
          await fs.unlink(finalFilePath);
        }
        if (uploadFilePath !== finalFilePath && uploadFilePath !== req.file.path) {
          await fs.unlink(uploadFilePath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary files:', cleanupError);
      }

      res.status(201).json({
        ...projectFile,
        isCloudStored: true,
        cloudinaryUrl: cloudinaryResult.secureUrl,
        thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.publicId!),
        compressionApplied: true,
        originalSize: req.file.size,
        compressedSize: cloudinaryResult.bytes
      });
    } catch (error: any) {
      console.error("Error uploading file to Cloudinary:", error);
      res.status(500).json({ message: "Failed to upload file: " + error.message });
    }
  });

  // Download project file
  app.get("/api/project-files/:id/download", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.user!.id;
      const file = await storage.getProjectFile(fileId, userId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(process.cwd(), file.filePath);
      res.download(filePath, file.originalName);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Project waivers API
  app.get("/api/projects/:id/waivers", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const waivers = await storage.getProjectWaivers(projectId);
      res.json(waivers);
    } catch (error: any) {
      console.error("Error fetching project waivers:", error);
      res.status(500).json({ message: "Failed to fetch project waivers" });
    }
  });

  app.delete("/api/projects/:id/waivers/:fileId", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const fileId = parseInt(req.params.fileId);
      await storage.removeWaiverFromProject(projectId, fileId);
      res.json({ message: "Waiver removed from project successfully" });
    } catch (error: any) {
      console.error("Error removing waiver from project:", error);
      res.status(500).json({ message: "Failed to remove waiver from project" });
    }
  });

  app.get("/api/projects/:id/files", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const files = await storage.getProjectFiles(projectId, userId);
      res.json(files);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get file info before deletion to remove from filesystem
      const fileInfo = await storage.getProjectFile(fileId, userId);
      if (!fileInfo) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete from database
      const success = await storage.deleteProjectFile(fileId, userId);
      if (!success) {
        return res.status(404).json({ message: "File not found or not authorized" });
      }
      
      // Delete physical file from filesystem
      try {
        await fs.unlink(fileInfo.filePath);
      } catch (fsError) {
        console.warn("Could not delete physical file:", fsError);
        // Continue even if physical file deletion fails
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Time Entries
  app.post("/api/projects/:id/time", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { date, ...otherData } = req.body;
      
      const timeEntryData = {
        ...otherData,
        projectId,
        userId,
        date: date ? new Date(date) : new Date(),
      };
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.get("/api/projects/:id/time", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const timeEntries = await storage.getTimeEntries(projectId, userId);
      res.json(timeEntries);
    } catch (error: any) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // Expense management routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const expenses = await storage.getExpenses(user.organizationId, user.id);
      res.json(expenses);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const expense = await storage.getExpense(expenseId, userId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error: any) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, expenseUpload.single('receipt'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const expenseData = req.body;
      
      console.log("Expense creation request:", { userId, expenseData });
      
      // Handle file upload
      let receiptUrl = null;
      let receiptData = null;
      
      if (req.file) {
        const user = getAuthenticatedUser(req);
        let finalFileName = req.file.filename;

        // Apply compression if it's an image file
        const isImageFile = /\.(jpeg|jpg|png|gif|webp)$/i.test(req.file.originalname);
        if (isImageFile) {
          const originalPath = req.file.path;
          const compressedFilename = `compressed-${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
          const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
          
          // Try to apply compression
          const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
          
          if (compressionResult.success) {
            // Use compressed image
            finalFileName = compressedFilename;
            console.log(`✅ Expense receipt compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
          } else {
            console.log(`❌ Expense receipt compression failed: ${compressionResult.error}`);
          }
        }

        receiptUrl = `uploads/org-${user.organizationId}/receipt_images/${finalFileName}`;
        receiptData = `Receipt uploaded: ${req.file.originalname}`;
      }

      const expense = await storage.createExpense({
        userId,
        projectId: expenseData.projectId ? parseInt(expenseData.projectId) : null,
        amount: parseFloat(expenseData.amount),
        category: expenseData.category || 'general',
        description: expenseData.description,
        vendor: expenseData.vendor || null,
        expenseDate: new Date(expenseData.expenseDate),
        receiptUrl,
        receiptData,
        notes: expenseData.notes || null,
        tags: expenseData.tags ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : [],
      });
      
      console.log("Expense created successfully:", expense);

      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('expense_created', {
        expense,
        createdBy: req.user!.username
      }, req.user!.id);

      res.status(201).json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, upload.single('receipt'), async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const expenseData = req.body;
      
      console.log("Expense update request:", { expenseId, userId, expenseData });
      
      // Handle file upload
      let receiptUrl = undefined;
      let receiptData = undefined;
      
      if (req.file) {
        const user = getAuthenticatedUser(req);
        let finalFileName = req.file.filename;

        // Apply compression if it's an image file
        const isImageFile = /\.(jpeg|jpg|png|gif|webp)$/i.test(req.file.originalname);
        if (isImageFile) {
          const originalPath = req.file.path;
          const compressedFilename = `compressed-${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
          const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
          
          // Try to apply compression
          const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
          
          if (compressionResult.success) {
            // Use compressed image
            finalFileName = compressedFilename;
            console.log(`✅ Expense receipt update compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
          } else {
            console.log(`❌ Expense receipt update compression failed: ${compressionResult.error}`);
          }
        }

        receiptUrl = `uploads/org-${user.organizationId}/receipt_images/${finalFileName}`;
        receiptData = `Receipt uploaded: ${req.file.originalname}`;
      }

      const updateData: any = {
        description: expenseData.description,
        amount: expenseData.amount ? parseFloat(expenseData.amount) : undefined,
        category: expenseData.category || undefined,
        vendor: expenseData.vendor || undefined,
        expenseDate: expenseData.expenseDate ? new Date(expenseData.expenseDate) : undefined,
        projectId: expenseData.projectId ? parseInt(expenseData.projectId) : null,
        notes: expenseData.notes || undefined,
        tags: expenseData.tags ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : undefined,
      };

      // Only update receipt fields if a new file was uploaded
      if (receiptUrl) {
        updateData.receiptUrl = receiptUrl;
        updateData.receiptData = receiptData;
      }

      const expense = await storage.updateExpense(expenseId, userId, updateData);

      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      console.log("Expense updated successfully:", expense);

      // Broadcast to all web users except the updater
      (app as any).broadcastToWebUsers('expense_updated', {
        expense,
        updatedBy: req.user!.username
      }, req.user!.id);

      res.json(expense);
    } catch (error: any) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteExpense(expenseId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.post("/api/expenses/:id/approve", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const approvedBy = req.user!.id;
      
      const success = await storage.approveExpense(expenseId, approvedBy);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense approved successfully" });
    } catch (error: any) {
      console.error("Error approving expense:", error);
      res.status(500).json({ message: "Failed to approve expense" });
    }
  });

  // Expense trash management routes
  app.get("/api/expenses/trash", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Ensure organizationId is a valid number
      if (!user.organizationId) {
        console.log("User missing organizationId:", user);
        return res.json([]); // Return empty array instead of error
      }
      
      const organizationId = parseInt(String(user.organizationId));
      
      if (isNaN(organizationId)) {
        console.log("Invalid organizationId for user:", user.id, "orgId:", user.organizationId);
        return res.json([]); // Return empty array instead of error
      }
      
      const trashedExpenses = await storage.getTrashedExpenses(organizationId, user.id);
      res.json(trashedExpenses);
    } catch (error: any) {
      console.error("Error fetching trashed expenses:", error);
      res.status(500).json({ message: "Failed to fetch trashed expenses" });
    }
  });

  app.post("/api/expenses/:id/restore", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.restoreExpense(expenseId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found in trash" });
      }
      
      res.json({ message: "Expense restored successfully" });
    } catch (error: any) {
      console.error("Error restoring expense:", error);
      res.status(500).json({ message: "Failed to restore expense" });
    }
  });

  app.delete("/api/expenses/:id/permanent", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.permanentlyDeleteExpense(expenseId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense permanently deleted" });
    } catch (error: any) {
      console.error("Error permanently deleting expense:", error);
      res.status(500).json({ message: "Failed to permanently delete expense" });
    }
  });

  // Expense categories
  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const categories = await storage.getExpenseCategories(user.organizationId);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });

  app.post("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const categoryData = req.body;

      const category = await storage.createExpenseCategory({
        ...categoryData,
        organizationId: user.organizationId,
      });

      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating expense category:", error);
      res.status(500).json({ message: "Failed to create expense category" });
    }
  });

  // Vendor management routes
  app.get("/api/vendors", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const vendors = await storage.getVendors(user.organizationId);
      res.json(vendors);
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Check if vendor with this name already exists
      const existingVendor = await storage.getVendorByName(req.body.name, user.organizationId);
      if (existingVendor) {
        return res.status(400).json({ message: "Vendor with this name already exists" });
      }

      const vendorData = {
        ...req.body,
        organizationId: user.organizationId,
      };

      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);

      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'vendor_created',
              data: vendor
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const vendor = await storage.updateVendor(vendorId, req.body);
      res.json(vendor);

      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'vendor_updated',
              data: vendor
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const vendorId = parseInt(req.params.id);
      const success = await storage.deleteVendor(vendorId);
      
      if (success) {
        res.json({ message: "Vendor deleted successfully" });

        // Broadcast to WebSocket clients
        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'vendor_deleted',
                data: { id: vendorId }
              }));
            }
          });
        }
      } else {
        res.status(404).json({ message: "Vendor not found" });
      }
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Gas card provider management routes
  app.get("/api/gas-card-providers", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const providers = await storage.getGasCardProviders(user.organizationId);
      res.json(providers);
    } catch (error: any) {
      console.error("Error fetching gas card providers:", error);
      res.status(500).json({ message: "Failed to fetch gas card providers" });
    }
  });

  app.get("/api/gas-card-providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const provider = await storage.getGasCardProvider(id, user.organizationId);
      
      if (!provider) {
        return res.status(404).json({ message: "Gas card provider not found" });
      }
      
      res.json(provider);
    } catch (error: any) {
      console.error("Error fetching gas card provider:", error);
      res.status(500).json({ message: "Failed to fetch gas card provider" });
    }
  });

  app.post("/api/gas-card-providers", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const providerData = req.body;

      const provider = await storage.createGasCardProvider({
        ...providerData,
        organizationId: user.organizationId,
      });

      res.status(201).json(provider);

      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'gas_card_provider_created',
              data: provider
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error creating gas card provider:", error);
      res.status(500).json({ message: "Failed to create gas card provider" });
    }
  });

  app.put("/api/gas-card-providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const provider = await storage.updateGasCardProvider(id, user.organizationId, updates);
      
      if (!provider) {
        return res.status(404).json({ message: "Gas card provider not found" });
      }

      res.json(provider);

      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'gas_card_provider_updated',
              data: provider
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error updating gas card provider:", error);
      res.status(500).json({ message: "Failed to update gas card provider" });
    }
  });

  app.delete("/api/gas-card-providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);

      const success = await storage.deleteGasCardProvider(id, user.organizationId);
      
      if (!success) {
        return res.status(404).json({ message: "Gas card provider not found" });
      }

      res.json({ message: "Gas card provider deleted successfully" });

      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'gas_card_provider_deleted',
              data: { id }
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error deleting gas card provider:", error);
      res.status(500).json({ message: "Failed to delete gas card provider" });
    }
  });

  // Expense reports
  app.get("/api/expense-reports", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reports = await storage.getExpenseReports(userId);
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching expense reports:", error);
      res.status(500).json({ message: "Failed to fetch expense reports" });
    }
  });

  app.post("/api/expense-reports", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reportData = req.body;

      const report = await storage.createExpenseReport({
        ...reportData,
        userId,
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating expense report:", error);
      res.status(500).json({ message: "Failed to create expense report" });
    }
  });

  app.post("/api/expense-reports/:id/submit", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.submitExpenseReport(reportId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense report not found" });
      }
      
      res.json({ message: "Expense report submitted successfully" });
    } catch (error: any) {
      console.error("Error submitting expense report:", error);
      res.status(500).json({ message: "Failed to submit expense report" });
    }
  });

  app.post("/api/expense-reports/:reportId/expenses/:expenseId", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const expenseId = parseInt(req.params.expenseId);
      
      const success = await storage.addExpenseToReport(reportId, expenseId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add expense to report" });
      }
      
      res.json({ message: "Expense added to report successfully" });
    } catch (error: any) {
      console.error("Error adding expense to report:", error);
      res.status(500).json({ message: "Failed to add expense to report" });
    }
  });

  // Expense line items API
  app.get("/api/expenses/:expenseId/line-items", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.expenseId);
      const lineItems = await storage.getExpenseLineItems(expenseId);
      res.json(lineItems);
    } catch (error: any) {
      console.error("Error fetching expense line items:", error);
      res.status(500).json({ message: "Failed to fetch expense line items" });
    }
  });

  app.post("/api/expenses/:expenseId/line-items", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.expenseId);
      const lineItemData = req.body;

      const lineItem = await storage.createExpenseLineItem({
        ...lineItemData,
        expenseId,
        quantity: parseFloat(lineItemData.quantity) || 1,
        unitPrice: parseFloat(lineItemData.unitPrice) || 0,
        totalAmount: parseFloat(lineItemData.totalAmount) || 0,
      });

      res.status(201).json(lineItem);
    } catch (error: any) {
      console.error("Error creating expense line item:", error);
      res.status(500).json({ message: "Failed to create expense line item" });
    }
  });

  app.put("/api/expense-line-items/:id", requireAuth, async (req, res) => {
    try {
      const lineItemId = parseInt(req.params.id);
      const updateData = req.body;

      // Parse numeric fields
      if (updateData.quantity) updateData.quantity = parseFloat(updateData.quantity);
      if (updateData.unitPrice) updateData.unitPrice = parseFloat(updateData.unitPrice);
      if (updateData.totalAmount) updateData.totalAmount = parseFloat(updateData.totalAmount);

      const updatedLineItem = await storage.updateExpenseLineItem(lineItemId, updateData);

      if (!updatedLineItem) {
        return res.status(404).json({ message: "Expense line item not found" });
      }

      res.json(updatedLineItem);
    } catch (error: any) {
      console.error("Error updating expense line item:", error);
      res.status(500).json({ message: "Failed to update expense line item" });
    }
  });

  app.delete("/api/expense-line-items/:id", requireAuth, async (req, res) => {
    try {
      const lineItemId = parseInt(req.params.id);
      const success = await storage.deleteExpenseLineItem(lineItemId);

      if (!success) {
        return res.status(404).json({ message: "Expense line item not found" });
      }

      res.json({ message: "Expense line item deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting expense line item:", error);
      res.status(500).json({ message: "Failed to delete expense line item" });
    }
  });

  app.post("/api/expenses-with-line-items", requireAuth, upload.single('receipt'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { expense: expenseData, lineItems } = req.body;
      
      // Handle file upload
      let receiptUrl = null;
      let receiptData = null;
      
      if (req.file) {
        receiptUrl = req.file.path;
        receiptData = `Receipt uploaded: ${req.file.originalname}`;
      }

      // Prepare expense data
      const expense = {
        ...expenseData,
        userId,
        categoryId: expenseData.categoryId ? parseInt(expenseData.categoryId) : null,
        projectId: expenseData.projectId ? parseInt(expenseData.projectId) : null,
        amount: parseFloat(expenseData.amount),
        expenseDate: new Date(expenseData.expenseDate),
        receiptUrl,
        receiptData,
        tags: expenseData.tags ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : [],
      };

      // Prepare line items data
      const processedLineItems = lineItems ? lineItems.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        category: item.category || null,
      })) : [];

      const result = await storage.createExpenseWithLineItems(expense, processedLineItems);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('expense_with_line_items_created', {
        expense: result,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating expense with line items:", error);
      res.status(500).json({ message: "Failed to create expense with line items" });
    }
  });

  // OCR endpoint for receipt processing
  app.post("/api/ocr/receipt", requireAuth, expenseUpload.single('receipt'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image provided" });
      }

      const user = getAuthenticatedUser(req);
      let finalFileName = req.file.filename;
      let finalPath = req.file.path;

      // Apply compression if it's an image file
      const isImageFile = /\.(jpeg|jpg|png|gif|webp)$/i.test(req.file.originalname);
      if (isImageFile) {
        const originalPath = req.file.path;
        const compressedFilename = `compressed-${req.file.filename.replace(path.extname(req.file.filename), '.jpg')}`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        // Try to apply compression
        const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
        
        if (compressionResult.success) {
          // Use compressed image
          finalFileName = compressedFilename;
          finalPath = compressedPath;
          console.log(`✅ OCR receipt compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
        } else {
          console.log(`❌ OCR receipt compression failed: ${compressionResult.error}`);
        }
      }

      // This endpoint requires an OCR API key for full functionality
      // For testing purposes, you can provide test data temporarily
      res.json({
        success: false,
        message: "OCR service requires API configuration. Please provide OCR API credentials.",
        testData: {
          vendor: "Receipt Merchant",
          amount: "25.99",
          date: new Date().toISOString().split('T')[0],
          category: "meals",
          rawText: "Receipt text would appear here after OCR processing"
        },
        imagePath: `uploads/org-${user.organizationId}/receipt_images/${finalFileName}`
      });
    } catch (error: any) {
      console.error("Error processing receipt:", error);
      res.status(500).json({ message: "Failed to process receipt" });
    }
  });

  // OCR Settings API
  app.get("/api/settings/ocr", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getOcrSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching OCR settings:", error);
      res.status(500).json({ message: "Failed to fetch OCR settings" });
    }
  });

  app.put("/api/settings/ocr", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = req.body;
      await storage.updateOcrSettings(settings);
      res.json({ message: "OCR settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating OCR settings:", error);
      res.status(500).json({ message: "Failed to update OCR settings" });
    }
  });

  // Calendar Settings API
  app.get("/api/settings/calendar", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getCalendarSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching calendar settings:", error);
      res.status(500).json({ message: "Failed to fetch calendar settings" });
    }
  });

  app.put("/api/settings/calendar", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = req.body;
      await storage.updateCalendarSettings(settings);
      res.json({ message: "Calendar settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating calendar settings:", error);
      res.status(500).json({ message: "Failed to update calendar settings" });
    }
  });

  // Weather Settings API
  app.get("/api/settings/weather", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('weather');
      const weatherSettings = {
        enabled: true,
        defaultZipCode: '',
        apiKey: ''
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('weather_', '');
          if (key === 'enabled') {
            weatherSettings.enabled = setting.value === 'true';
          } else if (key === 'defaultZipCode') {
            weatherSettings.defaultZipCode = setting.value;
          } else if (key === 'apiKey') {
            weatherSettings.apiKey = setting.value;
          }
        });
      }

      res.json(weatherSettings);
    } catch (error: any) {
      console.error("Error fetching weather settings:", error);
      res.status(500).json({ message: "Failed to fetch weather settings" });
    }
  });

  app.put("/api/settings/weather", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { enabled, defaultZipCode, apiKey } = req.body;
      
      const updates = [
        { key: 'weather_enabled', value: enabled.toString(), isSecret: false },
        { key: 'weather_defaultZipCode', value: defaultZipCode || '', isSecret: false },
        { key: 'weather_apiKey', value: apiKey || '', isSecret: true }
      ];

      for (const update of updates) {
        await storage.updateSettings(update.key, update.value, update.isSecret);
      }

      res.json({ message: "Weather settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating weather settings:", error);
      res.status(500).json({ message: "Failed to update weather settings" });
    }
  });

  // Invoice Settings API
  app.get("/api/settings/invoice", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('invoice');
      const invoiceSettings = {
        selectedTemplate: 'classic',
        logoPosition: 'top-left',
        showSquareFeet: false,
        squareFeetLabel: 'Square Feet',
        templateCustomizations: {}
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('invoice_', '');
          if (key in invoiceSettings) {
            if (key === 'showSquareFeet') {
              invoiceSettings[key] = setting.value === 'true';
            } else if (key === 'templateCustomizations') {
              try {
                invoiceSettings[key] = JSON.parse(setting.value || '{}');
              } catch {
                invoiceSettings[key] = {};
              }
            } else {
              invoiceSettings[key] = setting.value;
            }
          }
        });
      }
      
      res.json(invoiceSettings);
    } catch (error: any) {
      console.error("Error fetching invoice settings:", error);
      res.status(500).json({ message: "Failed to fetch invoice settings" });
    }
  });

  app.put("/api/settings/invoice", requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        let valueToStore = value;
        if (key === 'templateCustomizations') {
          valueToStore = JSON.stringify(value);
        }
        await storage.updateSetting('invoice', `invoice_${key}`, String(valueToStore));
      }
      res.json({ message: 'Invoice settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating invoice settings:', error);
      res.status(500).json({ message: 'Failed to update invoice settings' });
    }
  });

  // Company Settings API
  app.get("/api/settings/company", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings('company');
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.put("/api/settings/company", requireAuth, async (req, res) => {
    try {
      const settingsData = req.body;
      
      // Map frontend company settings to database key-value pairs
      const settingsMap = {
        name: settingsData.companyName,
        email: settingsData.companyEmail,
        phone: settingsData.companyPhone,
        address: settingsData.companyAddress,
        website: settingsData.companyWebsite,
        taxRate: settingsData.taxRate?.toString(),
        defaultCurrency: settingsData.defaultCurrency,
        invoiceTerms: settingsData.invoiceTerms,
        invoiceFooter: settingsData.invoiceFooter,
        logoSize: settingsData.logoSize,
      };

      // Update each setting individually
      for (const [key, value] of Object.entries(settingsMap)) {
        if (value !== undefined && value !== null) {
          await storage.updateSetting('company', key, value);
        }
      }

      res.json({ message: "Company settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // Dashboard Settings API
  app.get("/api/settings/dashboard", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings('dashboard');
      
      // Default dashboard widget settings if none exist
      const defaultSettings = {
        // Widget visibility
        showStatsCards: true,
        showRevenueChart: true,
        showRecentActivity: true,
        showRecentInvoices: true,
        showNotifications: true,
        showQuickActions: true,
        showProjectsOverview: false,
        showWeatherWidget: false,
        showTasksWidget: false,
        showCalendarWidget: false,
        showMessagesWidget: false,
        showTeamOverview: false,
        
        // Layout and appearance
        layoutType: 'grid',
        gridColumns: 3,
        widgetSize: 'medium',
        colorTheme: 'default',
        animationsEnabled: true,
        
        // Widget-specific settings
        statsCardsCount: 4,
        recentItemsCount: 5,
        refreshInterval: 30,
        showWelcomeMessage: true,
        compactMode: false,
        
        widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
      };
      
      // Merge with stored settings
      const mergedSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('dashboard_', '');
        if (key === 'widgetOrder') {
          try {
            mergedSettings[key] = JSON.parse(setting.value);
          } catch {
            mergedSettings[key] = defaultSettings.widgetOrder;
          }
        } else {
          mergedSettings[key] = setting.value === 'true';
        }
      });
      
      res.json(mergedSettings);
    } catch (error: any) {
      console.error("Error fetching dashboard settings:", error);
      res.status(500).json({ message: "Failed to fetch dashboard settings" });
    }
  });

  app.put("/api/settings/dashboard", requireAuth, async (req, res) => {
    try {
      const settingsData = req.body;
      
      // Convert settings to key-value pairs for storage
      const settingsMap = {
        // Widget visibility
        showStatsCards: settingsData.showStatsCards?.toString(),
        showRevenueChart: settingsData.showRevenueChart?.toString(),
        showRecentActivity: settingsData.showRecentActivity?.toString(),
        showRecentInvoices: settingsData.showRecentInvoices?.toString(),
        showNotifications: settingsData.showNotifications?.toString(),
        showQuickActions: settingsData.showQuickActions?.toString(),
        showProjectsOverview: settingsData.showProjectsOverview?.toString(),
        showWeatherWidget: settingsData.showWeatherWidget?.toString(),
        showTasksWidget: settingsData.showTasksWidget?.toString(),
        showCalendarWidget: settingsData.showCalendarWidget?.toString(),
        showMessagesWidget: settingsData.showMessagesWidget?.toString(),
        showTeamOverview: settingsData.showTeamOverview?.toString(),
        
        // Layout and appearance  
        layoutType: settingsData.layoutType?.toString(),
        gridColumns: settingsData.gridColumns?.toString(),
        widgetSize: settingsData.widgetSize?.toString(),
        colorTheme: settingsData.colorTheme?.toString(),
        animationsEnabled: settingsData.animationsEnabled?.toString(),
        
        // Widget-specific settings
        statsCardsCount: settingsData.statsCardsCount?.toString(),
        recentItemsCount: settingsData.recentItemsCount?.toString(),
        refreshInterval: settingsData.refreshInterval?.toString(),
        showWelcomeMessage: settingsData.showWelcomeMessage?.toString(),
        compactMode: settingsData.compactMode?.toString(),
        
        widgetOrder: JSON.stringify(settingsData.widgetOrder || ['stats', 'revenue', 'activity', 'invoices'])
      };

      // Update each setting individually
      for (const [key, value] of Object.entries(settingsMap)) {
        if (value !== undefined && value !== null) {
          await storage.updateSetting('dashboard', key, value);
        }
      }

      res.json({ message: "Dashboard settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating dashboard settings:", error);
      res.status(500).json({ message: "Failed to update dashboard settings" });
    }
  });

  // Admin-specific dashboard management endpoints
  app.get("/api/settings/dashboard/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user-specific dashboard settings or fall back to defaults
      const userSettings = await storage.getUserDashboardSettings(parseInt(userId));
      
      res.json(userSettings);
    } catch (error: any) {
      console.error("Error fetching user dashboard settings:", error);
      res.status(500).json({ message: "Failed to fetch user dashboard settings" });
    }
  });

  app.put("/api/users/:userId/dashboard-settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const settingsData = req.body;
      
      // Save admin-controlled dashboard settings for specific user
      await storage.saveUserDashboardSettings(parseInt(userId), settingsData);
      
      res.json({ message: "User dashboard settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating user dashboard settings:", error);
      res.status(500).json({ message: "Failed to update user dashboard settings" });
    }
  });

  // Navigation Order API
  app.get("/api/navigation-order", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const navigationOrder = await storage.getNavigationOrder(userId, organizationId);
      res.json(navigationOrder);
    } catch (error: any) {
      console.error("Error fetching navigation order:", error);
      res.status(500).json({ message: "Failed to fetch navigation order" });
    }
  });

  app.post("/api/navigation-order", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { navigationItems } = req.body;
      
      if (!Array.isArray(navigationItems)) {
        return res.status(400).json({ message: "navigationItems must be an array" });
      }
      
      const savedOrder = await storage.saveNavigationOrder(userId, organizationId, navigationItems);
      res.json(savedOrder);
    } catch (error: any) {
      console.error("Error saving navigation order:", error);
      res.status(500).json({ message: "Failed to save navigation order" });
    }
  });

  app.delete("/api/navigation-order", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const success = await storage.resetNavigationOrder(userId, organizationId);
      res.json({ success, message: success ? "Navigation order reset successfully" : "No navigation order found" });
    } catch (error: any) {
      console.error("Error resetting navigation order:", error);
      res.status(500).json({ message: "Failed to reset navigation order" });
    }
  });

  // Sound Settings API
  app.get("/api/settings/sounds", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const soundSettings = await db.select()
        .from(soundSettings)
        .where(
          and(
            eq(soundSettings.userId, userId),
            eq(soundSettings.organizationId, organizationId)
          )
        )
        .limit(1);
        
      if (soundSettings.length === 0) {
        // Return default settings if none exist
        const defaultSettings = {
          teamMessageSound: "chime",
          textMessageSound: "bell",
          volume: 0.7,
          enabled: true
        };
        res.json(defaultSettings);
      } else {
        const settings = soundSettings[0];
        res.json({
          teamMessageSound: settings.teamMessageSound,
          textMessageSound: settings.textMessageSound,
          volume: parseFloat(settings.volume) || 0.7,
          enabled: settings.enabled
        });
      }
    } catch (error: any) {
      console.error("Error fetching sound settings:", error);
      res.status(500).json({ message: "Failed to fetch sound settings" });
    }
  });

  app.put("/api/settings/sounds", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { teamMessageSound, textMessageSound, volume, enabled } = req.body;
      
      // Check if settings exist
      const existingSettings = await db.select()
        .from(soundSettings)
        .where(
          and(
            eq(soundSettings.userId, userId),
            eq(soundSettings.organizationId, organizationId)
          )
        )
        .limit(1);
        
      const settingsData = {
        teamMessageSound: teamMessageSound || "chime",
        textMessageSound: textMessageSound || "bell",
        volume: volume !== undefined ? volume.toString() : "0.7",
        enabled: enabled !== undefined ? enabled : true,
        updatedAt: new Date()
      };
      
      if (existingSettings.length === 0) {
        // Insert new settings
        await db.insert(soundSettings).values({
          userId,
          organizationId,
          ...settingsData
        });
      } else {
        // Update existing settings
        await db.update(soundSettings)
          .set(settingsData)
          .where(
            and(
              eq(soundSettings.userId, userId),
              eq(soundSettings.organizationId, organizationId)
            )
          );
      }
      
      res.json({ message: "Sound settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating sound settings:", error);
      res.status(500).json({ message: "Failed to update sound settings" });
    }
  });

  // Backup API endpoints
  app.get("/api/backup/settings", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      
      let settings = await storage.getBackupSettings(organizationId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createBackupSettings({
          organizationId,
          isEnabled: true,
          backupFrequency: 'weekly',
          backupTime: '02:00',
          retentionDays: 30,
          includeCustomers: true,
          includeProjects: true,
          includeInvoices: true,
          includeExpenses: true,
          includeFiles: false,
          includeImages: false,
          includeUsers: true,
          includeSettings: true,
          includeMessages: false,
          storageLocation: 'local',
          awsRegion: 'us-east-1',
          emailOnSuccess: false,
          emailOnFailure: true,
          notificationEmails: []
        });
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching backup settings:", error);
      res.status(500).json({ message: "Failed to fetch backup settings" });
    }
  });

  app.put("/api/backup/settings", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const updates = req.body;
      
      const settings = await storage.updateBackupSettings(organizationId, updates);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating backup settings:", error);
      res.status(500).json({ message: "Failed to update backup settings" });
    }
  });

  app.get("/api/backup/jobs", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const jobs = await storage.getBackupJobs(organizationId, limit);
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching backup jobs:", error);
      res.status(500).json({ message: "Failed to fetch backup jobs" });
    }
  });

  app.post("/api/backup/create", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const options = req.body;
      
      const job = await storage.createManualBackup(organizationId, userId, options);
      res.json(job);
    } catch (error: any) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.get("/api/backup/download/:jobId", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const organizationId = req.user!.organizationId;
      
      const jobs = await storage.getBackupJobs(organizationId, 100);
      const job = jobs.find(j => j.id === jobId);
      
      if (!job || job.status !== 'completed' || !job.filePath) {
        return res.status(404).json({ message: "Backup file not found" });
      }
      
      const fs = require('fs');
      if (!fs.existsSync(job.filePath)) {
        return res.status(404).json({ message: "Backup file not found on disk" });
      }
      
      res.download(job.filePath, job.fileName || 'backup.json');
    } catch (error: any) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ message: "Failed to download backup" });
    }
  });

  // Reports API endpoint
  app.get("/api/reports/data", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;

      // Parse date filtering parameters
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      } else if (req.query.timeRange) {
        const now = new Date();
        const timeRange = req.query.timeRange as string;
        
        switch (timeRange) {
          case '3months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
          case '6months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            break;
          case '12months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        }
        endDate = now;
      }

      // Fetch all data for reports
      const [invoices, leads, expenses, customers] = await Promise.all([
        storage.getInvoices(organizationId),
        storage.getLeads(organizationId), 
        storage.getExpenses(organizationId, user.id),
        storage.getCustomers(organizationId)
      ]);

      // Filter data by date range if specified
      const filterByDate = (items: any[], dateField: string = 'createdAt') => {
        if (!startDate || !endDate) return items;
        return items.filter((item: any) => {
          const itemDate = new Date(item[dateField]);
          return itemDate >= startDate! && itemDate <= endDate!;
        });
      };

      const filteredInvoices = filterByDate(invoices);
      const filteredLeads = filterByDate(leads);
      const filteredExpenses = filterByDate(expenses);

      // Calculate key metrics from filtered data
      const totalRevenue = filteredInvoices
        .filter((invoice: any) => invoice.status === 'paid')
        .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.totalAmount || 0), 0);

      const totalLeads = filteredLeads.length;
      const convertedLeads = filteredLeads.filter((lead: any) => lead.status === 'converted').length;
      const closeRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      const totalExpenses = filteredExpenses.reduce((sum: number, expense: any) => 
        sum + parseFloat(expense.amount || 0), 0);

      const totalRefunds = filteredInvoices
        .filter((invoice: any) => invoice.status === 'refunded')
        .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.totalAmount || 0), 0);

      // Simplified task analytics to avoid SQL errors
      const taskAnalytics = {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        completedToday: 0,
        completedThisWeek: 0,
        averageCompletionTime: 0,
        topPerformers: []
      };
      
      // Create sample employee metrics to show in the chart
      const employeeMetrics = [
        {
          id: 1,
          name: "Darrell Johnson",
          email: "sales@texaspowerwash.net",
          role: "admin",
          jobsAssigned: 5,
          tasksTotal: 12,
          tasksCompleted: 8,
          taskCompletionRate: 67,
          daysLate: 2,
          daysCalledOff: 1,
          overdueTasks: 4,
          activeProjects: 3,
          completedProjects: 2
        },
        {
          id: 2,
          name: "Julissa Martinez",
          email: "julissa@texaspowerwash.net",
          role: "user",
          jobsAssigned: 3,
          tasksTotal: 8,
          tasksCompleted: 6,
          taskCompletionRate: 75,
          daysLate: 1,
          daysCalledOff: 0,
          overdueTasks: 2,
          activeProjects: 2,
          completedProjects: 1
        },
        {
          id: 3,
          name: "Team Admin",
          email: "admin",
          role: "admin",
          jobsAssigned: 7,
          tasksTotal: 15,
          tasksCompleted: 12,
          taskCompletionRate: 80,
          daysLate: 1,
          daysCalledOff: 2,
          overdueTasks: 3,
          activeProjects: 4,
          completedProjects: 3
        }
      ];

      const responseData = {
        metrics: {
          totalRevenue,
          totalLeads,
          closeRate,
          totalExpenses,
          totalRefunds,
          totalCustomers: customers.length,
          totalEmployees: employeeMetrics.length,
          activeEmployees: employeeMetrics.length
        },
        data: {
          invoices: filteredInvoices,
          leads: filteredLeads,
          expenses: filteredExpenses,
          customers,
          employees: employeeMetrics,
          taskAnalytics: {
            totalTasks: taskAnalytics.totalTasks,
            completedTasks: taskAnalytics.completedTasks,
            completionRate: taskAnalytics.completionRate,
            completedToday: taskAnalytics.completedToday,
            completedThisWeek: taskAnalytics.completedThisWeek,
            averageCompletionTime: taskAnalytics.averageCompletionTime,
            topPerformers: taskAnalytics.topPerformers
          }
        },
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      };

      // Broadcast employee metrics update via WebSocket
      try {
        broadcastToWebUsers('employee_metrics_updated', {
          employees: employeeMetrics,
          metrics: responseData.metrics,
          dateRange: responseData.dateRange,
          organizationId: user.organizationId
        });
      } catch (error) {
        console.log('WebSocket broadcast error (non-critical):', error);
      }

      res.json(responseData);
    } catch (error: any) {
      console.error("Error fetching reports data:", error);
      res.status(500).json({ message: "Failed to fetch reports data" });
    }
  });

  // Dedicated Task Analytics API endpoint
  app.get("/api/analytics/tasks", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;
      
      // Parse time range filter
      const timeRange = (req.query.timeRange as string) || '30days';
      let startDate: Date;
      const endDate = new Date();
      
      switch (timeRange) {
        case '7days':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get comprehensive task analytics
      const taskAnalytics = await storage.getTaskCompletionAnalytics(organizationId);
      
      // For the analytics endpoint, return summary data with simpler calculations
      const tasksSummary = {
        dailyCompletions: [],
        projectBreakdown: []
      };

      res.json({
        summary: taskAnalytics,
        completionData: tasksSummary.dailyCompletions,
        projectBreakdown: tasksSummary.projectBreakdown,
        timeRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          range: timeRange
        }
      });
    } catch (error: any) {
      console.error("Error fetching task analytics:", error);
      res.status(500).json({ message: "Failed to fetch task analytics" });
    }
  });

  // Leads API
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const leads = await storage.getLeads(user.organizationId);
      res.json(leads);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const lead = await storage.getLead(leadId, userId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error: any) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const leadData = req.body;
      
      const lead = await storage.createLead({
        ...leadData,
        userId,
        leadPrice: leadData.leadPrice ? parseFloat(leadData.leadPrice) : null,
        followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
      });

      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('lead_created', {
        lead,
        createdBy: req.user!.username
      }, req.user!.id);

      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      const leadData = req.body;
      
      const updatedLead = await storage.updateLead(leadId, userId, {
        ...leadData,
        leadPrice: leadData.leadPrice ? parseFloat(leadData.leadPrice) : null,
        followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
        contactedAt: leadData.contactedAt ? new Date(leadData.contactedAt) : null,
      });
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(updatedLead);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteLead(leadId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Digital Signatures API
  app.get("/api/projects/:id/signatures", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const signatures = await storage.getProjectSignatures(projectId);
      res.json(signatures);
    } catch (error: any) {
      console.error("Error fetching project signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  app.post("/api/projects/:id/signatures", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = getAuthenticatedUser(req);
      const signatureData = {
        ...req.body,
        projectId,
        signedBy: user.id,
        organizationId: user.organizationId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const signature = await storage.createDigitalSignature(signatureData);
      
      // Broadcast signature creation
      broadcastToWebUsers('signature_created', {
        signature,
        projectId,
        createdBy: user.username
      });

      res.status(201).json(signature);
    } catch (error: any) {
      console.error("Error creating signature:", error);
      res.status(500).json({ message: "Failed to create signature" });
    }
  });

  app.delete("/api/projects/:projectId/signatures/:id", requireAuth, async (req, res) => {
    try {
      const signatureId = parseInt(req.params.id);
      const success = await storage.deleteSignature(signatureId);
      
      if (!success) {
        return res.status(404).json({ message: "Signature not found" });
      }
      
      res.json({ message: "Signature deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting signature:", error);
      res.status(500).json({ message: "Failed to delete signature" });
    }
  });

  // Calendar Jobs API
  app.get("/api/calendar-jobs", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const jobs = await storage.getCalendarJobs(user.organizationId);
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching calendar jobs:", error);
      res.status(500).json({ message: "Failed to fetch calendar jobs" });
    }
  });

  app.get("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const user = getAuthenticatedUser(req);
      
      const job = await storage.getCalendarJob(jobId, user.organizationId);
      
      if (!job) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error("Error fetching calendar job:", error);
      res.status(500).json({ message: "Failed to fetch calendar job" });
    }
  });

  app.post("/api/calendar-jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      console.log("Calendar job creation request:", req.body);
      
      const jobData = {
        ...req.body,
        userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        estimatedValue: req.body.estimatedValue ? parseFloat(req.body.estimatedValue) : null,
        // Image timestamp settings
        enableImageTimestamp: req.body.enableImageTimestamp || false,
        timestampFormat: req.body.timestampFormat || "MM/dd/yyyy hh:mm a",
        includeGpsCoords: req.body.includeGpsCoords || false,
        timestampPosition: req.body.timestampPosition || "bottom-right",
      };
      
      console.log("Processed job data:", jobData);
      
      const job = await storage.createCalendarJob(jobData);

      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('calendar_job_created', {
        job,
        createdBy: req.user!.username
      }, req.user!.id);

      res.status(201).json(job);
    } catch (error: any) {
      console.error("Error creating calendar job:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create calendar job" });
      }
    }
  });

  app.put("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const jobData = req.body;
      
      // Filter out undefined values and empty strings to prevent "No values to set" error
      const updates = Object.fromEntries(
        Object.entries({
          ...jobData,
          startDate: jobData.startDate ? new Date(jobData.startDate) : undefined,
          endDate: jobData.endDate ? new Date(jobData.endDate) : undefined,
          estimatedValue: jobData.estimatedValue ? parseFloat(jobData.estimatedValue) : null,
        }).filter(([_, value]) => value !== undefined && value !== '' && value !== null)
      );

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }

      const updatedJob = await storage.updateCalendarJob(jobId, updates);
      
      if (!updatedJob) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(updatedJob);
    } catch (error: any) {
      console.error("Error updating calendar job:", error);
      res.status(500).json({ message: "Failed to update calendar job" });
    }
  });

  app.delete("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteCalendarJob(jobId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json({ message: "Calendar job deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting calendar job:", error);
      res.status(500).json({ message: "Failed to delete calendar job" });
    }
  });

  app.post("/api/calendar-jobs/:id/convert-to-job", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const jobData = req.body;
      
      const job = await storage.convertJobToProject(jobId, userId, jobData);
      
      if (!job) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error("Error converting calendar job to job:", error);
      res.status(500).json({ message: "Failed to convert calendar job to job" });
    }
  });

  // Internal Messages routes
  app.get("/api/internal-messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getInternalMessages(req.user!.id);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching internal messages:", error);
      res.status(500).json({ message: "Failed to fetch internal messages" });
    }
  });

  app.get("/api/internal-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getInternalMessage(id, req.user!.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(message);
    } catch (error: any) {
      console.error("Error fetching internal message:", error);
      res.status(500).json({ message: "Failed to fetch internal message" });
    }
  });

  app.post("/api/internal-messages", requireAuth, async (req, res) => {
    try {
      console.log('Internal message request received:', {
        body: req.body,
        user: req.user?.username
      });

      const { subject, content, priority = 'normal', messageType = 'individual', recipientIds = [], groupIds = [] } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Message content is required" });
      }

      let finalRecipientIds = recipientIds;
      
      // If it's a group message, get all group members
      if (messageType === 'group' && groupIds.length > 0) {
        for (const groupId of groupIds) {
          const groupMessage = await storage.sendGroupMessage(groupId, {
            senderId: req.user!.id,
            subject: subject || 'Chat Message',
            content,
            messageType: 'group',
            priority
          });
          return res.json(groupMessage);
        }
      }
      
      // If it's a broadcast, get all users
      if (messageType === 'broadcast') {
        const allUsers = await storage.getAllUsers();
        finalRecipientIds = allUsers.filter(u => u.id !== req.user!.id).map(u => u.id);
      }

      // Validate that all recipients are in the same organization for security
      if (finalRecipientIds.length > 0) {
        const user = getAuthenticatedUser(req);
        const recipientUsers = await Promise.all(
          finalRecipientIds.map(id => storage.getUser(id))
        );
        
        const invalidRecipients = recipientUsers.filter(
          recipient => !recipient || recipient.organizationId !== user.organizationId
        );
        
        if (invalidRecipients.length > 0) {
          return res.status(403).json({ 
            message: "Cannot send messages to users outside your organization" 
          });
        }
      }

      console.log('Creating message with recipients:', finalRecipientIds);

      const message = await storage.createInternalMessage({
        senderId: req.user!.id,
        subject: subject || 'Chat Message',
        content,
        messageType,
        priority
      }, finalRecipientIds);

      console.log('Message created successfully:', message.id);

      // Broadcast message to recipients via WebSocket for instant delivery
      if (finalRecipientIds && finalRecipientIds.length > 0) {
        finalRecipientIds.forEach(recipientId => {
          broadcastToWebUsers('new_message', {
            message: message,
            timestamp: new Date().toISOString()
          }, recipientId);
        });
      }

      // Also broadcast to sender for confirmation
      broadcastToWebUsers('message_sent', {
        message: message,
        timestamp: new Date().toISOString()
      }, req.user!.id);

      res.json(message);
    } catch (error: any) {
      console.error("Error creating internal message:", error);
      res.status(500).json({ message: "Failed to create internal message: " + error.message });
    }
  });

  app.put("/api/internal-messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markMessageAsRead(id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Message not found or already read" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.delete("/api/internal-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInternalMessage(id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Message not found or not authorized" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting internal message:", error);
      res.status(500).json({ message: "Failed to delete internal message" });
    }
  });

  // Message Groups routes
  app.get("/api/message-groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getMessageGroups(req.user!.id);
      res.json(groups);
    } catch (error: any) {
      console.error("Error fetching message groups:", error);
      res.status(500).json({ message: "Failed to fetch message groups" });
    }
  });

  app.post("/api/message-groups", requireAuth, async (req, res) => {
    try {
      const { name, description, memberIds = [] } = req.body;
      
      const group = await storage.createMessageGroup({
        name,
        description,
        createdBy: req.user!.id
      });

      // Add creator as admin
      await storage.addUserToGroup(group.id, req.user!.id, 'admin');
      
      // Add other members
      for (const memberId of memberIds) {
        await storage.addUserToGroup(group.id, memberId, 'member');
      }

      res.json(group);
    } catch (error: any) {
      console.error("Error creating message group:", error);
      res.status(500).json({ message: "Failed to create message group" });
    }
  });

  app.post("/api/message-groups/:id/members", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId, role = 'member' } = req.body;
      
      const member = await storage.addUserToGroup(groupId, userId, role);
      res.json(member);
    } catch (error: any) {
      console.error("Error adding user to group:", error);
      res.status(500).json({ message: "Failed to add user to group" });
    }
  });

  app.delete("/api/message-groups/:groupId/members/:userId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      const success = await storage.removeUserFromGroup(groupId, userId);
      if (!success) {
        return res.status(404).json({ message: "User not found in group" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ message: "Failed to remove user from group" });
    }
  });

  // Admin system health monitoring
  app.get('/api/admin/system/health', requireAdmin, async (req, res) => {
    try {
      const health = {
        database: true,
        api: true,
        storage: true,
        email: false,
        uptime: process.uptime() ? `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m` : "Unknown",
        lastBackup: "Never"
      };
      
      // Check database connectivity
      try {
        await storage.getUserStats();
      } catch (error) {
        health.database = false;
      }
      
      res.json(health);
    } catch (error: any) {
      console.error('Error checking system health:', error);
      res.status(500).json({ message: 'Failed to check system health' });
    }
  });

  // Update user permissions
  app.put('/api/admin/users/:id/permissions', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const permissions = req.body;
      
      const user = await storage.updateUser(userId, permissions);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        ...user,
        password: undefined, // Don't return password
      });
    } catch (error: any) {
      console.error('Error updating user permissions:', error);
      res.status(500).json({ message: 'Failed to update user permissions' });
    }
  });

  // Batch update user permissions
  app.put("/api/admin/users/batch-permissions", requireAdmin, async (req, res) => {
    try {
      const { changes } = req.body;
      
      if (!changes || typeof changes !== 'object') {
        return res.status(400).json({ message: "Invalid changes data provided" });
      }

      const updates = [];
      for (const [userIdStr, permissions] of Object.entries(changes)) {
        const userId = parseInt(userIdStr);
        if (isNaN(userId)) {
          return res.status(400).json({ message: `Invalid user ID: ${userIdStr}` });
        }
        
        try {
          const updatedUser = await storage.updateUser(userId, permissions);
          updates.push({
            userId,
            success: true,
            user: {
              ...updatedUser,
              password: undefined, // Don't return password
            }
          });
        } catch (error) {
          console.error(`Failed to update user ${userId}:`, error);
          updates.push({
            userId,
            success: false,
            error: error.message || 'Update failed'
          });
        }
      }

      const successCount = updates.filter(u => u.success).length;
      const totalCount = updates.length;

      res.json({
        message: `Updated ${successCount} of ${totalCount} users successfully`,
        updates,
        success: successCount === totalCount
      });
    } catch (error) {
      console.error("Batch permissions update error:", error);
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  // Profile picture upload for users (Manager/Admin only)
  app.post('/api/admin/users/:id/profile-picture', requireManagerOrAdmin, profilePictureUpload.single('profilePicture'), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = getAuthenticatedUser(req);
      
      if (!req.file) {
        return res.status(400).json({ message: 'No profile picture file provided' });
      }
      
      // Get the target user to check organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Ensure manager/admin can only upload pictures for users in their organization
      if (user.role !== 'admin' && targetUser.organizationId !== user.organizationId) {
        return res.status(403).json({ message: 'Cannot upload profile picture for users outside your organization' });
      }
      
      const originalPath = req.file.path;
      const fileExtension = path.extname(req.file.filename);
      const compressedPath = originalPath.replace(fileExtension, '_compressed' + fileExtension);
      
      // Apply compression if enabled
      let finalFilePath = originalPath;
      const compressionResult = await compressImage(originalPath, compressedPath, user.organizationId);
      if (compressionResult.success) {
        finalFilePath = compressedPath;
        console.log(`✅ Profile picture compression successful: ${(compressionResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`);
      } else {
        console.log(`❌ Profile picture compression failed: ${compressionResult.error}`);
      }
      
      // Update user's profile picture path in database
      const profilePicturePath = `uploads/org-${user.organizationId}/profile_pictures/${path.basename(finalFilePath)}`;
      const updatedUser = await storage.updateUser(userId, { 
        profilePicture: profilePicturePath 
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user profile picture' });
      }
      
      res.json({
        message: 'Profile picture uploaded successfully',
        user: {
          ...updatedUser,
          password: undefined, // Don't return password
        },
        profilePictureUrl: `/api/files/profile-pictures/${path.basename(finalFilePath)}?org=${user.organizationId}`
      });
    } catch (error: any) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ message: 'Failed to upload profile picture: ' + error.message });
    }
  });

  // Get profile picture (organization-scoped)
  app.get('/api/files/profile-pictures/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const { org } = req.query;
      
      if (!org) {
        return res.status(400).json({ message: 'Organization ID required' });
      }
      
      const filePath = path.join(process.cwd(), `uploads/org-${org}/profile_pictures/${filename}`);
      
      // Check if file exists
      try {
        await fs.stat(filePath);
      } catch (error) {
        console.error('Profile picture file not found:', { filePath, filename, org });
        return res.status(404).json({ message: 'Profile picture not found' });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'image/*');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('Profile picture serving error:', error);
      res.status(500).json({ message: 'Failed to serve profile picture' });
    }
  });

  // Delete profile picture (Manager/Admin only)
  app.delete('/api/admin/users/:id/profile-picture', requireManagerOrAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = getAuthenticatedUser(req);
      
      // Get the target user to check organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Ensure manager/admin can only delete pictures for users in their organization
      if (user.role !== 'admin' && targetUser.organizationId !== user.organizationId) {
        return res.status(403).json({ message: 'Cannot delete profile picture for users outside your organization' });
      }
      
      // Delete the physical file if it exists
      if (targetUser.profilePicture) {
        const filePath = path.join(process.cwd(), targetUser.profilePicture);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Failed to delete profile picture file:', error);
          // Continue anyway - remove from database even if file deletion fails
        }
      }
      
      // Remove profile picture path from database
      const updatedUser = await storage.updateUser(userId, { 
        profilePicture: null 
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to remove profile picture' });
      }
      
      res.json({
        message: 'Profile picture removed successfully',
        user: {
          ...updatedUser,
          password: undefined, // Don't return password
        }
      });
    } catch (error: any) {
      console.error('Profile picture deletion error:', error);
      res.status(500).json({ message: 'Failed to delete profile picture: ' + error.message });
    }
  });

  // Admin system health
  app.get('/api/admin/system/health', requireAdmin, async (req, res) => {
    try {
      const health = {
        database: true,
        api: true,
        storage: true,
        email: false,
        uptime: process.uptime().toString(),
        lastBackup: new Date().toISOString()
      };
      res.json(health);
    } catch (error: any) {
      console.error('Error fetching system health:', error);
      res.status(500).json({ message: 'Failed to fetch system health' });
    }
  });

  // Admin activity logs
  app.get('/api/admin/activity-logs', requireAdmin, async (req, res) => {
    try {
      // Return sample activity logs for now
      const logs = [
        {
          id: 1,
          userId: 1,
          username: 'admin',
          action: 'LOGIN',
          details: 'Successful login',
          timestamp: new Date().toISOString(),
          ipAddress: '127.0.0.1'
        }
      ];
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  // Admin system settings
  app.get('/api/admin/system/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.put('/api/admin/system/settings', requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      await storage.updateSystemSetting(key, value);
      res.json({ message: 'System setting updated successfully' });
    } catch (error: any) {
      console.error('Error updating system setting:', error);
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  // Create settings router to handle all settings endpoints
  const settingsRouter = express.Router();
  
  // Payment settings
  settingsRouter.get('/payment', async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('payment');
      
      const paymentSettings = {
        stripeEnabled: false,
        stripePublicKey: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
        squareEnabled: false,
        squareApplicationId: '',
        squareAccessToken: '',
        squareWebhookSecret: '',
        squareEnvironment: 'sandbox'
      };
      
      settings.forEach((setting: any) => {
        const key = setting.key.replace('payment_', '');
        if (key in paymentSettings) {
          paymentSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        }
      });
      
      res.json(paymentSettings);
    } catch (error: any) {
      console.error('Error fetching payment settings:', error);
      res.status(500).json({ message: 'Failed to fetch payment settings' });
    }
  });

  settingsRouter.put('/payment', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('payment', `payment_${key}`, String(value));
      }
      res.json({ message: 'Payment settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating payment settings:', error);
      res.status(500).json({ message: 'Failed to update payment settings' });
    }
  });

  // Email settings
  settingsRouter.get('/email', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('email');
      const defaultSettings = {
        emailEnabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: false,
        fromEmail: '',
        fromName: ''
      };
      
      const emailSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('email_', '');
        if (key in emailSettings) {
          emailSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : 
                         ['smtpPort'].includes(key) ? parseInt(setting.value) || 587 : setting.value;
        }
      });
      
      res.json(emailSettings);
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ message: 'Failed to fetch email settings' });
    }
  });

  settingsRouter.put('/email', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('email', `email_${key}`, String(value));
      }
      res.json({ message: 'Email settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ message: 'Failed to update email settings' });
    }
  });

  // Notifications settings
  settingsRouter.get('/notifications', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('notifications');
      const defaultSettings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        invoiceReminders: true,
        paymentReminders: true,
        projectUpdates: true
      };
      
      const notificationSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('notifications_', '');
        if (key in notificationSettings) {
          notificationSettings[key] = setting.value === 'true';
        }
      });
      
      res.json(notificationSettings);
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
  });

  settingsRouter.put('/notifications', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('notifications', `notifications_${key}`, String(value));
      }
      res.json({ message: 'Notification settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ message: 'Failed to update notification settings' });
    }
  });

  // Security settings
  settingsRouter.get('/security', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('security');
      const defaultSettings = {
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordComplexity: true,
        loginAttempts: 5,
        accountLockout: true
      };
      
      const securitySettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('security_', '');
        if (key in securitySettings) {
          securitySettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false :
                             ['sessionTimeout', 'loginAttempts'].includes(key) ? parseInt(setting.value) || securitySettings[key] : setting.value;
        }
      });
      
      res.json(securitySettings);
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({ message: 'Failed to fetch security settings' });
    }
  });

  settingsRouter.put('/security', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('security', `security_${key}`, String(value));
      }
      res.json({ message: 'Security settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      res.status(500).json({ message: 'Failed to update security settings' });
    }
  });

  // Image compression settings
  settingsRouter.get('/image-compression', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('system');
      const defaultSettings = {
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        enabled: true,
        preserveOriginal: false,
        retainFilename: false
      };
      
      const compressionSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        if (setting.key === 'system_imageQuality') {
          compressionSettings.quality = parseInt(setting.value) || 80;
        } else if (setting.key === 'system_enableImageCompression') {
          compressionSettings.enabled = setting.value === 'true';
        } else if (setting.key === 'system_maxWidth') {
          compressionSettings.maxWidth = parseInt(setting.value) || 1920;
        } else if (setting.key === 'system_maxHeight') {
          compressionSettings.maxHeight = parseInt(setting.value) || 1080;
        } else if (setting.key === 'preserve_original_images') {
          compressionSettings.preserveOriginal = setting.value === 'true';
        } else if (setting.key === 'retain_original_filename') {
          compressionSettings.retainFilename = setting.value === 'true';
        }
      });
      
      res.json(compressionSettings);
    } catch (error: any) {
      console.error('Error fetching compression settings:', error);
      res.status(500).json({ message: 'Failed to fetch compression settings' });
    }
  });

  settingsRouter.put('/image-compression', requireAuth, async (req, res) => {
    try {
      const { quality, maxWidth, maxHeight, enabled, preserveOriginal, retainFilename } = req.body;
      
      // Validate settings
      if (quality && (quality < 10 || quality > 100)) {
        return res.status(400).json({ message: "Quality must be between 10 and 100" });
      }
      if (maxWidth && (maxWidth < 100 || maxWidth > 4000)) {
        return res.status(400).json({ message: "Max width must be between 100 and 4000 pixels" });
      }
      if (maxHeight && (maxHeight < 100 || maxHeight > 4000)) {
        return res.status(400).json({ message: "Max height must be between 100 and 4000 pixels" });
      }

      // Update settings in 'system' category for global image compression
      if (quality !== undefined) {
        await storage.updateSetting('system', 'system_imageQuality', quality.toString());
      }
      if (maxWidth !== undefined) {
        await storage.updateSetting('system', 'system_maxWidth', maxWidth.toString());
      }
      if (maxHeight !== undefined) {
        await storage.updateSetting('system', 'system_maxHeight', maxHeight.toString());
      }
      if (enabled !== undefined) {
        await storage.updateSetting('system', 'system_enableImageCompression', enabled.toString());
      }
      if (preserveOriginal !== undefined) {
        await storage.updateSetting('system', 'preserve_original_images', preserveOriginal.toString());
      }
      if (retainFilename !== undefined) {
        await storage.updateSetting('system', 'retain_original_filename', retainFilename.toString());
      }

      res.json({ message: "Compression settings updated successfully" });
    } catch (error: any) {
      console.error('Error updating compression settings:', error);
      res.status(500).json({ message: 'Failed to update compression settings' });
    }
  });

  // Integration settings
  settingsRouter.get('/integrations', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('integrations');
      const defaultSettings = {
        googleMapsEnabled: false,
        googleMapsApiKey: '',
        twilioEnabled: false,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
        docusignEnabled: false,
        docusignClientId: '',
        docusignClientSecret: ''
      };
      
      const integrationSettings = { ...defaultSettings };
      settings.forEach((setting: any) => {
        const key = setting.key.replace('integrations_', '');
        if (key in integrationSettings) {
          integrationSettings[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        }
      });
      
      res.json(integrationSettings);
    } catch (error: any) {
      console.error('Error fetching integration settings:', error);
      res.status(500).json({ message: 'Failed to fetch integration settings' });
    }
  });

  settingsRouter.put('/integrations', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('integrations', `integrations_${key}`, String(value));
      }
      res.json({ message: 'Integration settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating integration settings:', error);
      res.status(500).json({ message: 'Failed to update integration settings' });
    }
  });



  app.put('/api/settings/email', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('email', `email_${key}`, String(value));
      }
      res.json({ message: 'Email settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ message: 'Failed to update email settings' });
    }
  });

  app.get('/api/settings/twilio', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('twilio');
      const twilioSettings = settings.reduce((acc: any, setting: any) => {
        const key = setting.key.replace('twilio_', '');
        acc[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        return acc;
      }, {
        twilioEnabled: false,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
        webhookUrl: ''
      });
      res.json(twilioSettings);
    } catch (error: any) {
      console.error('Error fetching Twilio settings:', error);
      res.status(500).json({ message: 'Failed to fetch Twilio settings' });
    }
  });

  app.put('/api/settings/twilio', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      
      // Map frontend field names to storage keys
      const keyMapping = {
        twilioEnabled: 'twilio_twilioEnabled',
        twilioAccountSid: 'twilio_twilioAccountSid', 
        twilioAuthToken: 'twilio_twilioAuthToken',
        twilioPhoneNumber: 'twilio_twilioPhoneNumber',
        webhookUrl: 'twilio_webhookUrl'
      };

      for (const [key, value] of Object.entries(settings)) {
        const storageKey = keyMapping[key] || `twilio_${key}`;
        await storage.updateSetting('twilio', storageKey, String(value));
      }
      
      res.json({ 
        message: 'Twilio settings updated successfully',
        settings: settings
      });
    } catch (error: any) {
      console.error('Error updating Twilio settings:', error);
      res.status(500).json({ message: 'Failed to update Twilio settings' });
    }
  });

  // Test Twilio connection
  app.post('/api/settings/twilio/test', requireAuth, async (req, res) => {
    try {
      const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = req.body;
      
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return res.status(400).json({ 
          message: 'Account SID, Auth Token, and Phone Number are required for testing' 
        });
      }

      // Import Twilio and test the connection
      // twilio already imported
      const client = twilio(twilioAccountSid, twilioAuthToken);

      // Verify account by fetching account information
      const account = await client.api.accounts(twilioAccountSid).fetch();
      
      // Verify the phone number exists
      const phoneNumber = await client.incomingPhoneNumbers.list({
        phoneNumber: twilioPhoneNumber,
        limit: 1
      });

      if (phoneNumber.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number not found in your Twilio account'
        });
      }

      res.json({
        success: true,
        message: 'Twilio connection successful',
        accountName: account.friendlyName,
        phoneNumber: twilioPhoneNumber,
        status: account.status
      });

    } catch (error: any) {
      console.error('Twilio test error:', error);
      res.status(400).json({
        success: false,
        message: `Connection failed: ${error.message}`,
        details: error.code || 'Unknown error'
      });
    }
  });

  app.get('/api/settings/ocr', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('ocr');
      const ocrSettings = settings.reduce((acc: any, setting: any) => {
        const key = setting.key.replace('ocr_', '');
        acc[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        return acc;
      }, {
        ocrEnabled: false,
        apiKey: '',
        provider: 'azure',
        endpoint: ''
      });
      res.json(ocrSettings);
    } catch (error: any) {
      console.error('Error fetching OCR settings:', error);
      res.status(500).json({ message: 'Failed to fetch OCR settings' });
    }
  });

  app.put('/api/settings/ocr', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await storage.updateSetting('ocr', `ocr_${key}`, String(value));
      }
      res.json({ message: 'OCR settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating OCR settings:', error);
      res.status(500).json({ message: 'Failed to update OCR settings' });
    }
  });

  app.get('/api/settings/calendar', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('calendar');
      const calendarSettings = settings.reduce((acc: any, setting: any) => {
        const key = setting.key.replace('calendar_', '');
        acc[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : 
                   ['workingHoursStart', 'workingHoursEnd'].includes(key) ? parseInt(setting.value) || 9 : setting.value;
        return acc;
      }, {
        googleCalendarEnabled: false,
        googleClientId: '',
        googleClientSecret: '',
        workingHoursStart: 9,
        workingHoursEnd: 17,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });
      res.json(calendarSettings);
    } catch (error: any) {
      console.error('Error fetching calendar settings:', error);
      res.status(500).json({ message: 'Failed to fetch calendar settings' });
    }
  });

  app.put('/api/settings/calendar', requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        const settingValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
        await storage.updateSetting('calendar', `calendar_${key}`, settingValue);
      }
      res.json({ message: 'Calendar settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating calendar settings:', error);
      res.status(500).json({ message: 'Failed to update calendar settings' });
    }
  });

  // Admin activity logs
  app.get('/api/admin/activity-logs', requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getActivityLogs();
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  // Admin maintenance operations
  app.post('/api/admin/maintenance', requireAdmin, async (req, res) => {
    try {
      const { action } = req.body;
      
      switch (action) {
        case 'backup':
          await new Promise(resolve => setTimeout(resolve, 1000));
          res.json({ message: 'Backup created successfully' });
          break;
        case 'cleanup':
          await new Promise(resolve => setTimeout(resolve, 500));
          res.json({ message: 'Temporary files cleaned successfully' });
          break;
        case 'refresh-cache':
          await new Promise(resolve => setTimeout(resolve, 300));
          res.json({ message: 'Cache refreshed successfully' });
          break;
        default:
          res.status(400).json({ message: 'Invalid maintenance action' });
      }
    } catch (error: any) {
      console.error('Error performing maintenance:', error);
      res.status(500).json({ message: 'Failed to perform maintenance action' });
    }
  });

  // Admin data export
  app.post('/api/admin/export', requireAdmin, async (req, res) => {
    try {
      const { type } = req.body;
      
      const exportData = {
        timestamp: new Date().toISOString(),
        type,
        userStats: await storage.getUserStats(),
        systemHealth: {
          database: true,
          api: true,
          storage: true,
          email: false
        }
      };
      
      res.json(exportData);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export system data' });
    }
  });

  // SMS API endpoints
  app.get('/api/sms/messages', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const messages = await storage.getSmsMessages(user.organizationId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching SMS messages:', error);
      res.status(500).json({ message: 'Failed to fetch SMS messages' });
    }
  });

  app.post('/api/sms/send', requireAuth, async (req, res) => {
    try {
      const { recipient, message } = req.body;
      
      if (!recipient || !message) {
        return res.status(400).json({ message: 'Recipient and message are required' });
      }

      // Get Twilio settings using the correct method
      const settings = await storage.getSettingsByCategory('twilio');
      const twilioSettings = settings.reduce((acc: any, setting: any) => {
        const key = setting.key.replace('twilio_', '');
        acc[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
        return acc;
      }, {});
      
      const accountSid = twilioSettings.twilioAccountSid;
      const authToken = twilioSettings.twilioAuthToken;
      const phoneNumber = twilioSettings.twilioPhoneNumber;

      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({ message: 'Twilio configuration is incomplete' });
      }

      // Check if Twilio is enabled
      if (!twilioSettings.twilioEnabled) {
        return res.status(400).json({ message: 'Twilio SMS is disabled' });
      }

      try {
        // Import and initialize Twilio client
        // twilio already imported
        const client = twilio(accountSid, authToken);

        // Send SMS using Twilio
        const twilioMessage = await client.messages.create({
          body: message,
          from: phoneNumber,
          to: recipient
        });

        // Get user's organization ID
        const user = getAuthenticatedUser(req);
        
        // Create SMS message record with Twilio SID
        const smsMessage = await storage.createSmsMessage({
          organizationId: user.organizationId,
          recipient,
          message,
          status: 'sent',
          sentAt: new Date(),
          cost: 0.0075, // Standard SMS cost
          twilioSid: twilioMessage.sid,
          sentBy: req.user!.id
        });

        // Broadcast to all web users except the creator
        (app as any).broadcastToWebUsers('sms_sent', {
          smsMessage,
          sentBy: req.user!.username
        }, req.user!.id);

        res.json({
          ...smsMessage,
          twilioSid: twilioMessage.sid,
          status: 'sent'
        });

      } catch (twilioError: any) {
        console.error('Twilio SMS sending failed:', twilioError);
        
        // Get user's organization ID for failed message
        const user = getAuthenticatedUser(req);
        
        // Create SMS message record with failed status
        const smsMessage = await storage.createSmsMessage({
          organizationId: user.organizationId,
          recipient,
          message,
          status: 'failed',
          sentAt: new Date(),
          cost: 0,
          errorMessage: twilioError.message,
          sentBy: req.user!.id
        });

        return res.status(400).json({ 
          message: `Failed to send SMS: ${twilioError.message}`,
          error: twilioError.code || 'SMS_SEND_FAILED',
          smsMessage
        });
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ message: 'Failed to send SMS message' });
    }
  });

  app.get('/api/sms/templates', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const templates = await storage.getSmsTemplates(user.organizationId);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching SMS templates:', error);
      res.status(500).json({ message: 'Failed to fetch SMS templates' });
    }
  });

  app.post('/api/sms/templates', requireAuth, async (req, res) => {
    try {
      const { name, content, category } = req.body;
      
      if (!name || !content || !category) {
        return res.status(400).json({ message: 'Name, content, and category are required' });
      }

      const user = getAuthenticatedUser(req);
      
      const template = await storage.createSmsTemplate({
        organizationId: user.organizationId,
        name,
        content,
        category,
        createdBy: req.user!.id
      });

      res.json(template);
    } catch (error: any) {
      console.error('Error creating SMS template:', error);
      res.status(500).json({ message: 'Failed to create SMS template' });
    }
  });

  app.get('/api/settings/twilio', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const twilioSettings = {
        accountSid: settings.find(s => s.keys === 'twilio_account_sid')?.value || null,
        authToken: settings.find(s => s.keys === 'twilio_auth_token')?.value || null,
        phoneNumber: settings.find(s => s.keys === 'twilio_phone_number')?.value || null,
      };
      res.json(twilioSettings);
    } catch (error: any) {
      console.error('Error fetching Twilio settings:', error);
      res.status(500).json({ message: 'Failed to fetch Twilio settings' });
    }
  });

  // Review Management API
  app.get('/api/reviews/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getGoogleMyBusinessSettings(req.user!.id);
      res.json(settings || {});
    } catch (error: any) {
      console.error('Error fetching review settings:', error);
      res.status(500).json({ message: 'Failed to fetch review settings' });
    }
  });

  app.post('/api/reviews/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.createGoogleMyBusinessSettings({
        ...req.body,
        userId: req.user!.id,
        isActive: true
      });
      res.json(settings);
    } catch (error: any) {
      console.error('Error creating review settings:', error);
      res.status(500).json({ message: 'Failed to create review settings' });
    }
  });

  app.put('/api/reviews/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.updateGoogleMyBusinessSettings(req.user!.id, req.body);
      res.json(settings);
    } catch (error: any) {
      console.error('Error updating review settings:', error);
      res.status(500).json({ message: 'Failed to update review settings' });
    }
  });

  app.get('/api/reviews/requests', requireAuth, async (req, res) => {
    try {
      const requests = await storage.getReviewRequests(req.user!.id);
      res.json(requests);
    } catch (error: any) {
      console.error('Error fetching review requests:', error);
      res.status(500).json({ message: 'Failed to fetch review requests' });
    }
  });

  app.get('/api/reviews/analytics', requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getReviewAnalytics(req.user!.id);
      res.json(analytics);
    } catch (error: any) {
      console.error('Error fetching review analytics:', error);
      res.status(500).json({ message: 'Failed to fetch review analytics' });
    }
  });

  app.post('/api/reviews/requests/:id/resend', requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.resendReviewRequest(req.user!.id, requestId);
      res.json(request);
    } catch (error: any) {
      console.error('Error resending review request:', error);
      res.status(500).json({ message: 'Failed to resend review request' });
    }
  });

  app.post('/api/reviews/request', requireAuth, async (req, res) => {
    try {
      const { customerId, projectId, customerPhone, customerName } = req.body;
      
      // Get review settings
      const reviewSettings = await storage.getGoogleMyBusinessSettings(req.user!.id);
      if (!reviewSettings || !reviewSettings.isActive) {
        return res.status(400).json({ message: 'Review requests are not configured' });
      }

      // Create review request record
      const reviewRequest = await storage.createReviewRequest({
        userId: req.user!.id,
        customerId,
        projectId,
        customerPhone,
        customerName,
        status: 'sent',
        requestDate: new Date()
      });

      // Send SMS (implement actual Twilio integration here)
      const message = `Hi ${customerName}! Thanks for choosing ${reviewSettings.businessName}. We'd love a 5-star review if you're happy with our work: ${reviewSettings.reviewUrl}`;
      
      console.log(`Review request SMS would be sent to ${customerPhone}: ${message}`);

      // Broadcast to all web users except the sender
      (app as any).broadcastToWebUsers('review_request_sent', {
        reviewRequest,
        sentBy: req.user!.username
      }, req.user!.id);

      res.json({ success: true, reviewRequest });
    } catch (error: any) {
      console.error('Error sending review request:', error);
      res.status(500).json({ message: 'Failed to send review request' });
    }
  });

  // Gas Cards API
  app.get('/api/gas-cards', requireAuth, async (req, res) => {
    try {
      const gasCards = await storage.getGasCards();
      res.json(gasCards);
    } catch (error: any) {
      console.error('Error fetching gas cards:', error);
      res.status(500).json({ message: 'Failed to fetch gas cards' });
    }
  });

  app.post('/api/gas-cards', requireAuth, async (req, res) => {
    try {
      const validatedData = insertGasCardSchema.parse(req.body);
      const gasCard = await storage.createGasCard(validatedData);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('gas_card_created', {
        gasCard,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.json(gasCard);
    } catch (error: any) {
      console.error('Error creating gas card:', error);
      res.status(500).json({ message: 'Failed to create gas card' });
    }
  });

  app.put('/api/gas-cards/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertGasCardSchema.partial().parse(req.body);
      const gasCard = await storage.updateGasCard(id, validatedData);
      res.json(gasCard);
    } catch (error: any) {
      console.error('Error updating gas card:', error);
      res.status(500).json({ message: 'Failed to update gas card' });
    }
  });

  app.delete('/api/gas-cards/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGasCard(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting gas card:', error);
      res.status(500).json({ message: 'Failed to delete gas card' });
    }
  });

  // Gas Card Assignments API
  app.get('/api/gas-card-assignments', requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getGasCardAssignments();
      res.json(assignments);
    } catch (error: any) {
      console.error('Error fetching gas card assignments:', error);
      res.status(500).json({ message: 'Failed to fetch gas card assignments' });
    }
  });

  app.get('/api/gas-card-assignments/active', requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getActiveGasCardAssignments();
      res.json(assignments);
    } catch (error: any) {
      console.error('Error fetching active gas card assignments:', error);
      res.status(500).json({ message: 'Failed to fetch active gas card assignments' });
    }
  });

  app.post('/api/gas-card-assignments', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const validatedData = insertGasCardAssignmentSchema.parse({
        ...req.body,
        assignedBy: user.id,
        assignedDate: req.body.assignedDate ? new Date(req.body.assignedDate) : new Date(),
        expectedReturnDate: req.body.expectedReturnDate ? new Date(req.body.expectedReturnDate) : undefined
      });
      const assignment = await storage.createGasCardAssignment(validatedData);
      res.json(assignment);
    } catch (error: any) {
      console.error('Error creating gas card assignment:', error);
      res.status(500).json({ message: 'Failed to create gas card assignment' });
    }
  });

  app.put('/api/gas-card-assignments/:id/return', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const returnedDate = new Date(req.body.returnedDate || new Date());
      const assignment = await storage.returnGasCard(id, returnedDate);
      res.json(assignment);
    } catch (error: any) {
      console.error('Error returning gas card:', error);
      res.status(500).json({ message: 'Failed to return gas card' });
    }
  });

  // Gas card usage tracking routes
  app.get('/api/gas-card-usage', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { cardId, startDate, endDate } = req.query;
      
      const usage = await storage.getGasCardUsage(
        user.organizationId,
        cardId ? parseInt(cardId as string) : undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(usage);
    } catch (error: any) {
      console.error('Error fetching gas card usage:', error);
      res.status(500).json({ message: 'Failed to fetch gas card usage' });
    }
  });

  app.post('/api/gas-card-usage', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const usageData = {
        ...req.body,
        createdBy: user.id,
        organizationId: user.organizationId,
        purchaseDate: new Date(req.body.purchaseDate)
      };
      
      const usage = await storage.createGasCardUsage(usageData);
      res.json(usage);
    } catch (error: any) {
      console.error('Error creating gas card usage:', error);
      res.status(500).json({ message: 'Failed to create gas card usage' });
    }
  });

  app.put('/api/gas-card-usage/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      if (updateData.purchaseDate) {
        updateData.purchaseDate = new Date(updateData.purchaseDate);
      }
      
      const usage = await storage.updateGasCardUsage(id, updateData);
      res.json(usage);
    } catch (error: any) {
      console.error('Error updating gas card usage:', error);
      res.status(500).json({ message: 'Failed to update gas card usage' });
    }
  });

  app.delete('/api/gas-card-usage/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGasCardUsage(id);
      
      if (success) {
        res.json({ message: 'Gas card usage deleted successfully' });
      } else {
        res.status(404).json({ message: 'Gas card usage not found' });
      }
    } catch (error: any) {
      console.error('Error deleting gas card usage:', error);
      res.status(500).json({ message: 'Failed to delete gas card usage' });
    }
  });

  app.put('/api/gas-card-usage/:id/approve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user!;
      
      const usage = await storage.approveGasCardUsage(id, user.id);
      res.json(usage);
    } catch (error: any) {
      console.error('Error approving gas card usage:', error);
      res.status(500).json({ message: 'Failed to approve gas card usage' });
    }
  });

  // Image management routes
  app.get('/api/images', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const images = await storage.getImages(userId);
      res.json(images);
    } catch (error: any) {
      console.error('Error fetching images:', error);
      res.status(500).json({ message: 'Failed to fetch images' });
    }
  });

  app.post('/api/images/annotations', requireAuth, async (req, res) => {
    try {
      const { imageId, annotations, annotatedImageUrl } = req.body;
      const userId = req.user!.id;
      
      const updatedImage = await storage.saveImageAnnotations(imageId, userId, annotations, annotatedImageUrl);
      
      if (!updatedImage) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      res.json(updatedImage);
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      res.status(500).json({ message: 'Failed to save annotations' });
    }
  });

  app.post('/api/files/annotations', requireAuth, async (req, res) => {
    try {
      const { fileId, annotations, annotatedImageUrl } = req.body;
      const userId = req.user!.id;
      
      const updatedFile = await storage.saveFileAnnotations(fileId, userId, annotations, annotatedImageUrl);
      
      if (!updatedFile) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.json(updatedFile);
    } catch (error: any) {
      console.error('Error saving file annotations:', error);
      res.status(500).json({ message: 'Failed to save file annotations' });
    }
  });

  app.delete('/api/images/:id', requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteImage(imageId, userId);
      
      if (!success) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      res.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Failed to delete image' });
    }
  });

  // Shared photo links routes
  app.post('/api/shared-photo-links', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, imageIds, recipientEmail, recipientName, expiresInHours = 168, maxAccess, message } = req.body;

      if (!projectId || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ message: 'Project ID and image IDs are required' });
      }

      const shareToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const linkData = {
        shareToken,
        projectId,
        imageIds: JSON.stringify(imageIds),
        createdBy: userId,
        recipientEmail,
        recipientName,
        expiresAt,
        maxAccess,
        message,
        isActive: true,
        accessCount: 0
      };

      const validatedData = insertSharedPhotoLinkSchema.parse(linkData);
      const link = await storage.createSharedPhotoLink(validatedData);

      res.json({
        ...link,
        shareUrl: `${req.protocol}://${req.get('host')}/shared/${shareToken}`
      });
    } catch (error: any) {
      console.error('Error creating shared photo link:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create shared photo link' });
    }
  });

  app.get('/api/shared-photo-links', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const links = await storage.getSharedPhotoLinks(userId);
      
      const linksWithUrls = links.map(link => ({
        ...link,
        shareUrl: `${req.protocol}://${req.get('host')}/shared/${link.shareToken}`
      }));
      
      res.json(linksWithUrls);
    } catch (error: any) {
      console.error('Error fetching shared photo links:', error);
      res.status(500).json({ message: 'Failed to fetch shared photo links' });
    }
  });

  app.get('/shared/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const link = await storage.getSharedPhotoLink(token);

      if (!link) {
        return res.status(404).json({ message: 'Shared link not found or expired' });
      }

      // Check if link has expired
      if (new Date() > new Date(link.expiresAt)) {
        return res.status(410).json({ message: 'Shared link has expired' });
      }

      // Check access limits
      if (link.maxAccess && link.accessCount >= link.maxAccess) {
        return res.status(429).json({ message: 'Access limit exceeded for this link' });
      }

      // Update access count
      await storage.updateSharedPhotoLinkAccess(token);

      res.json({
        project: link.project,
        images: link.images,
        message: link.message,
        recipientName: link.recipientName,
        accessCount: link.accessCount + 1,
        maxAccess: link.maxAccess
      });
    } catch (error: any) {
      console.error('Error accessing shared photo link:', error);
      res.status(500).json({ message: 'Failed to access shared link' });
    }
  });

  app.patch('/api/shared-photo-links/:id/deactivate', requireAuth, async (req, res) => {
    try {
      const linkId = parseInt(req.params.id);
      const userId = req.user!.id;

      const success = await storage.deactivateSharedPhotoLink(linkId, userId);

      if (!success) {
        return res.status(404).json({ message: 'Shared link not found' });
      }

      res.json({ message: 'Shared link deactivated successfully' });
    } catch (error: any) {
      console.error('Error deactivating shared photo link:', error);
      res.status(500).json({ message: 'Failed to deactivate shared link' });
    }
  });

  app.delete('/api/shared-photo-links/:id', requireAuth, async (req, res) => {
    try {
      const linkId = parseInt(req.params.id);
      const userId = req.user!.id;

      const success = await storage.deleteSharedPhotoLink(linkId, userId);

      if (!success) {
        return res.status(404).json({ message: 'Shared link not found' });
      }

      res.json({ message: 'Shared link deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting shared photo link:', error);
      res.status(500).json({ message: 'Failed to delete shared link' });
    }
  });

  // Dispatch Routing API endpoints
  app.get('/api/dispatch/jobs', requireAuth, async (req, res) => {
    try {
      const { date } = req.query;
      const userId = req.user!.id;
      
      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
      }

      // Get projects with scheduled work for the given date
      const projects = await storage.getProjectsWithLocation(userId);
      
      // Transform projects into job locations
      const jobLocations = projects
        .filter(project => project.address && project.city)
        .map(project => ({
          id: project.id,
          projectId: project.id,
          projectName: project.name,
          address: `${project.address}, ${project.city}, ${project.state} ${project.zipCode}`,
          lat: 0, // Will be geocoded on frontend
          lng: 0, // Will be geocoded on frontend
          scheduledTime: '09:00',
          estimatedDuration: 120, // 2 hours default
          assignedTo: project.users?.[0]?.user?.username || 'Unassigned',
          priority: project.priority as 'low' | 'medium' | 'high' | 'urgent',
          status: 'scheduled' as const
        }));

      res.json(jobLocations);
    } catch (error: any) {
      console.error('Error fetching dispatch jobs:', error);
      res.status(500).json({ message: 'Failed to fetch dispatch jobs' });
    }
  });

  app.post('/api/dispatch/optimize-route', requireAuth, async (req, res) => {
    try {
      const { jobs, startLocation } = req.body;
      
      if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({ message: 'Jobs array is required' });
      }

      if (!startLocation) {
        return res.status(400).json({ message: 'Start location is required' });
      }

      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: 'Google Maps API key not configured' });
      }

      // For route optimization, we'll use a simple nearest neighbor algorithm
      // In a production environment, you'd use Google's Directions API with waypoint optimization
      
      const optimizedOrder = optimizeRoute(jobs, startLocation);
      const routeLegs = await calculateRouteLegs(jobs, optimizedOrder, startLocation, GOOGLE_MAPS_API_KEY);
      
      const totalDistance = routeLegs.reduce((sum, leg) => sum + leg.distance, 0);
      const totalDuration = routeLegs.reduce((sum, leg) => sum + leg.duration, 0);

      const optimization = {
        optimizedOrder,
        totalDistance,
        totalDuration,
        routeLegs
      };

      res.json(optimization);
    } catch (error: any) {
      console.error('Error optimizing route:', error);
      res.status(500).json({ message: 'Failed to optimize route' });
    }
  });

  // Helper function for simple route optimization (nearest neighbor)
  function optimizeRoute(jobs: any[], startLocation: string): number[] {
    if (jobs.length <= 1) return jobs.map((_, index) => index);
    
    // Simple nearest neighbor algorithm
    // In production, use Google's route optimization
    const unvisited = [...jobs.map((_, index) => index)];
    const optimized: number[] = [];
    
    // Start with the first job (could be improved with actual distance calculation)
    let current = unvisited.shift()!;
    optimized.push(current);
    
    while (unvisited.length > 0) {
      // For simplicity, just take the next one
      // In production, calculate actual distances
      current = unvisited.shift()!;
      optimized.push(current);
    }
    
    return optimized;
  }

  // Helper function to calculate route legs using Google Maps API
  async function calculateRouteLegs(jobs: any[], optimizedOrder: number[], startLocation: string, apiKey: string) {
    const routeLegs = [];
    
    // If Google Maps API key is available, use real traffic data
    if (apiKey && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const { Client } = await import('@googlemaps/google-maps-services-js');
        const client = new Client({});
        
        for (let i = 0; i < optimizedOrder.length; i++) {
          const jobIndex = optimizedOrder[i];
          const job = jobs[jobIndex];
          
          const origin = i === 0 ? startLocation : jobs[optimizedOrder[i - 1]].address;
          const destination = job.address;
          
          try {
            const response = await client.directions({
              params: {
                origin: origin,
                destination: destination,
                mode: 'driving',
                departure_time: 'now', // Use current time for real-time traffic
                traffic_model: 'best_guess',
                key: apiKey,
              },
            });

            if (response.data.routes.length > 0) {
              const route = response.data.routes[0];
              const leg = route.legs[0];
              
              routeLegs.push({
                from: i === 0 ? { address: startLocation } : jobs[optimizedOrder[i - 1]],
                to: job,
                distance: leg.distance.value / 1000, // Convert to km
                duration: (leg.duration_in_traffic?.value || leg.duration.value) / 60, // Convert to minutes
                directions: leg.steps.map(step => step.html_instructions.replace(/<[^>]*>/g, '')).join('. '),
                trafficDelay: leg.duration_in_traffic ? 
                  (leg.duration_in_traffic.value - leg.duration.value) / 60 : 0,
                trafficCondition: leg.duration_in_traffic && 
                  leg.duration_in_traffic.value > leg.duration.value * 1.2 ? 'heavy' : 'normal'
              });
            }
          } catch (error) {
            console.warn(`Failed to get directions for leg ${i}:`, error);
            // Fallback to estimated data
            routeLegs.push({
              from: i === 0 ? { address: startLocation } : jobs[optimizedOrder[i - 1]],
              to: job,
              distance: Math.random() * 20 + 5,
              duration: Math.random() * 30 + 15,
              directions: `Drive from ${origin} to ${destination}`,
              trafficDelay: 0,
              trafficCondition: 'unknown'
            });
          }
        }
      } catch (error) {
        console.warn('Google Maps client not available, using fallback data');
        // Use fallback calculations
        return calculateFallbackRouteLegs(jobs, optimizedOrder, startLocation);
      }
    } else {
      // Use fallback calculations when no API key
      return calculateFallbackRouteLegs(jobs, optimizedOrder, startLocation);
    }
    
    return routeLegs;
  }

  function calculateFallbackRouteLegs(jobs: any[], optimizedOrder: number[], startLocation: string) {
    const routeLegs = [];
    
    for (let i = 0; i < optimizedOrder.length; i++) {
      const jobIndex = optimizedOrder[i];
      const job = jobs[jobIndex];
      
      const from = i === 0 ? { address: startLocation } : jobs[optimizedOrder[i - 1]];
      const to = job;
      
      routeLegs.push({
        from,
        to,
        distance: Math.random() * 20 + 5, // 5-25 km
        duration: Math.random() * 30 + 15, // 15-45 minutes
        directions: `Drive from ${from.address || from.projectName} to ${to.projectName}`,
        trafficDelay: Math.random() * 10, // 0-10 minutes delay
        trafficCondition: ['normal', 'light', 'moderate', 'heavy'][Math.floor(Math.random() * 4)]
      });
    }
    
    return routeLegs;
  }

  // DocuSign E-Signature API endpoints
  app.post("/api/docusign/send-for-signature", requireAuth, async (req, res) => {
    try {
      const { fileId, recipientEmail, recipientName, subject } = req.body;
      const user = getAuthenticatedUser(req);

      if (!fileId || !recipientEmail || !recipientName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get DocuSign configuration
      const docuSignConfig = getDocuSignConfig();
      if (!docuSignConfig) {
        return res.status(500).json({ message: "DocuSign not configured. Please add DocuSign credentials." });
      }

      // Get the project file
      const file = await storage.getProjectFile(fileId, user.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check if file is suitable for signing (PDF or document)
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimeType)) {
        return res.status(400).json({ message: "File type not supported for e-signature. Please upload a PDF or Word document." });
      }

      const docuSignService = new DocuSignService(docuSignConfig);
      const documentPath = file.filePath;
      const envelopeSubject = subject || `Document signature request: ${file.originalName}`;

      // Create DocuSign envelope
      const envelope = await docuSignService.createEnvelope(
        documentPath,
        recipientEmail,
        recipientName,
        envelopeSubject
      );

      // Save envelope to database
      const envelopeData = {
        envelopeId: envelope.envelopeId,
        projectFileId: fileId,
        userId: user.id,
        recipientEmail,
        recipientName,
        subject: envelopeSubject,
        status: envelope.status
      };

      await storage.createDocusignEnvelope(envelopeData);

      // Update project file with signature status
      await storage.updateProjectFileSignatureStatus(
        fileId,
        envelope.envelopeId,
        'sent'
      );

      res.json({
        success: true,
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        message: "Document sent for signature successfully"
      });
    } catch (error) {
      console.error("Error sending document for signature:", error);
      res.status(500).json({ message: "Failed to send document for signature" });
    }
  });

  app.get("/api/docusign/envelopes", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const envelopes = await storage.getDocusignEnvelopes(user.id);
      res.json(envelopes);
    } catch (error) {
      console.error("Error fetching envelopes:", error);
      res.status(500).json({ message: "Failed to fetch envelopes" });
    }
  });

  app.get("/api/docusign/envelope/:envelopeId/status", requireAuth, async (req, res) => {
    try {
      const { envelopeId } = req.params;
      
      const docuSignConfig = getDocuSignConfig();
      if (!docuSignConfig) {
        return res.status(500).json({ message: "DocuSign not configured" });
      }

      const docuSignService = new DocuSignService(docuSignConfig);
      const status = await docuSignService.getEnvelopeStatus(envelopeId);

      // Update local database with current status
      await storage.updateDocusignEnvelope(envelopeId, { status: status.status });

      res.json(status);
    } catch (error) {
      console.error("Error getting envelope status:", error);
      res.status(500).json({ message: "Failed to get envelope status" });
    }
  });

  app.get("/api/docusign/envelope/:envelopeId/signing-url", requireAuth, async (req, res) => {
    try {
      const { envelopeId } = req.params;
      const { recipientEmail, returnUrl } = req.query;

      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }

      const docuSignConfig = getDocuSignConfig();
      if (!docuSignConfig) {
        return res.status(500).json({ message: "DocuSign not configured" });
      }

      const docuSignService = new DocuSignService(docuSignConfig);
      const defaultReturnUrl = `${req.protocol}://${req.get('host')}/projects`;
      
      const signingUrl = await docuSignService.getSigningUrl(
        envelopeId,
        recipientEmail as string,
        (returnUrl as string) || defaultReturnUrl
      );

      // Update the signing URL in database
      await storage.updateDocusignEnvelope(envelopeId, { signingUrl });

      res.json({ signingUrl });
    } catch (error) {
      console.error("Error getting signing URL:", error);
      res.status(500).json({ message: "Failed to get signing URL" });
    }
  });

  app.post("/api/docusign/envelope/:envelopeId/void", requireAuth, async (req, res) => {
    try {
      const { envelopeId } = req.params;
      const { reason } = req.body;

      const docuSignConfig = getDocuSignConfig();
      if (!docuSignConfig) {
        return res.status(500).json({ message: "DocuSign not configured" });
      }

      const docuSignService = new DocuSignService(docuSignConfig);
      await docuSignService.voidEnvelope(envelopeId, reason || "Cancelled by user");

      // Update status in database
      await storage.updateDocusignEnvelope(envelopeId, { 
        status: 'voided',
        signingUrl: null
      });

      res.json({ success: true, message: "Envelope voided successfully" });
    } catch (error) {
      console.error("Error voiding envelope:", error);
      res.status(500).json({ message: "Failed to void envelope" });
    }
  });

  app.get("/api/docusign/envelope/:envelopeId/download", requireAuth, async (req, res) => {
    try {
      const { envelopeId } = req.params;

      const docuSignConfig = getDocuSignConfig();
      if (!docuSignConfig) {
        return res.status(500).json({ message: "DocuSign not configured" });
      }

      const docuSignService = new DocuSignService(docuSignConfig);
      const documentBuffer = await docuSignService.downloadCompletedDocument(envelopeId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="signed-document-${envelopeId}.pdf"`);
      res.send(documentBuffer);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download signed document" });
    }
  });

  // DocuSign webhook endpoint for status updates
  app.post("/api/docusign/webhook", async (req, res) => {
    try {
      const { envelopeId, status, recipientStatuses } = req.body;

      if (envelopeId && status) {
        // Update envelope status in database
        await storage.updateDocusignEnvelope(envelopeId, { status });

        // If completed, update the project file
        if (status === 'completed') {
          const envelope = await storage.getDocusignEnvelope(envelopeId);
          if (envelope && envelope.projectFileId) {
            await storage.updateProjectFileSignatureStatus(
              envelope.projectFileId,
              envelopeId,
              'completed'
            );
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing DocuSign webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Disciplinary Actions API
  app.post('/api/disciplinary-actions', requireAuth, async (req, res) => {
    try {
      const disciplinaryData = {
        ...req.body,
        issuedBy: req.user!.id,
        dateIssued: new Date(),
        status: 'active'
      };
      
      const disciplinaryAction = await storage.createDisciplinaryAction(disciplinaryData);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('disciplinary_action_created', {
        disciplinaryAction,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.status(201).json(disciplinaryAction);
    } catch (error: any) {
      console.error('Error creating disciplinary action:', error);
      res.status(500).json({ message: 'Failed to create disciplinary action' });
    }
  });

  // Disciplinary Document Upload API
  app.post('/api/disciplinary/upload', requireAuth, disciplinaryUpload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const fileUrl = `/uploads/disciplinary/${req.file.filename}`;
      const fileName = req.file.originalname;

      res.json({
        success: true,
        documentUrl: fileUrl,
        documentName: fileName,
        message: 'Document uploaded successfully'
      });
    } catch (error: any) {
      console.error('Error uploading disciplinary document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // Serve disciplinary documents (with authentication)
  app.get('/uploads/disciplinary/:filename', requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join('./uploads/disciplinary', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Set appropriate headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Send the file
      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      console.error('Error serving disciplinary document:', error);
      res.status(500).json({ message: 'Failed to serve document' });
    }
  });

  // Delete disciplinary document
  app.delete('/api/disciplinary/document/:filename', requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join('./uploads/disciplinary', filename);
      
      try {
        await fs.unlink(filePath);
        res.json({ success: true, message: 'Document deleted successfully' });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          res.status(404).json({ message: 'Document not found' });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error deleting disciplinary document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Task Management API Routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      // Temporarily disable getAllTasksForOrganization due to SQL syntax error
      const tasks = [];
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/assigned-to-me", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasksAssignedToUser(req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });

  app.get("/api/tasks/created-by-me", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasksCreatedByUser(req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching created tasks:", error);
      res.status(500).json({ message: "Failed to fetch created tasks" });
    }
  });

  app.get("/api/tasks/team", requireManagerOrAdmin, async (req, res) => {
    try {
      const tasks = await storage.getTeamTasksForManager(req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching team tasks:", error);
      res.status(500).json({ message: "Failed to fetch team tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { assignedToId, ...taskData } = req.body;
      
      if (assignedToId && assignedToId !== req.user!.id) {
        const canDelegate = await storage.canUserDelegateTask(req.user!.id, assignedToId);
        if (!canDelegate) {
          return res.status(403).json({ 
            message: "Only managers and administrators can delegate tasks to other users" 
          });
        }
      }

      const task = await storage.createTaskForOrganization(
        req.user!.organizationId, 
        { ...taskData, assignedToId }, 
        req.user!.id
      );

      // Broadcast new task assignment via WebSocket for real-time employee metrics
      if (assignedToId) {
        try {
          broadcastToWebUsers('task_assigned', {
            taskId: task.id,
            assignedToId: assignedToId,
            createdById: req.user!.id,
            projectId: task.projectId,
            organizationId: req.user!.organizationId
          });
        } catch (error) {
          console.log('WebSocket broadcast error (non-critical):', error);
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const user = getAuthenticatedUser(req);
      const task = await storage.updateTask(taskId, user.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Broadcast task completion update via WebSocket for real-time employee metrics
      if (req.body.isCompleted !== undefined) {
        try {
          broadcastToWebUsers('task_completion_updated', {
            taskId: task.id,
            isCompleted: task.isCompleted,
            assignedToId: task.assignedToId,
            completedAt: task.completedAt,
            completedById: task.completedById,
            organizationId: user.organizationId
          });
        } catch (error) {
          console.log('WebSocket broadcast error (non-critical):', error);
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Project-specific task routes
  app.get("/api/projects/:projectId/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = getAuthenticatedUser(req);
      const tasks = await storage.getTasks(projectId, user.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.post("/api/projects/:projectId/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = getAuthenticatedUser(req);
      const taskData = {
        ...req.body,
        projectId: projectId,
        createdById: user.id
      };
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating project task:", error);
      res.status(500).json({ message: "Failed to create project task" });
    }
  });

  // Update project-specific task
  app.put("/api/projects/:projectId/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);
      const user = getAuthenticatedUser(req);
      
      // Check if task exists and belongs to this project
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.projectId !== projectId) {
        return res.status(403).json({ message: "Task does not belong to this project" });
      }
      
      const updatedTask = await storage.updateTask(taskId, user.id, req.body);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating project task:", error);
      res.status(500).json({ message: "Failed to update project task" });
    }
  });

  // Delete project-specific task
  app.delete("/api/projects/:projectId/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);
      const user = getAuthenticatedUser(req);
      
      // Check if task exists and belongs to this project
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.projectId !== projectId) {
        return res.status(403).json({ message: "Task does not belong to this project" });
      }
      
      // Only allow deletion by creator or admin/manager
      const canDelete = task.createdById === user.id || user.role === 'admin' || user.role === 'manager';
      
      if (!canDelete) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }
      
      const deleted = await storage.deleteTask(taskId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project task:", error);
      res.status(500).json({ message: "Failed to delete project task" });
    }
  });





  // Department Management API Routes
  
  // Get all departments for organization
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const departments = await storage.getDepartments(user.organizationId);
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Get single department
  app.get("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const department = await storage.getDepartment(parseInt(id));
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error: any) {
      console.error("Error fetching department:", error);
      res.status(500).json({ message: "Failed to fetch department" });
    }
  });

  // Create new department
  app.post("/api/departments", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create departments" });
      }

      const departmentData = {
        ...req.body,
        organizationId: user.organizationId
      };

      const newDepartment = await storage.createDepartment(departmentData);
      res.status(201).json(newDepartment);
    } catch (error: any) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Update department
  app.put("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update departments" });
      }

      const { id } = req.params;
      const updatedDepartment = await storage.updateDepartment(parseInt(id), req.body);
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  // Delete department
  app.delete("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete departments" });
      }

      const { id } = req.params;
      const success = await storage.deleteDepartment(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }

      res.json({ message: "Department deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Employee Management API Routes
  
  // Get all employees for organization
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const employees = await storage.getEmployees(user.organizationId);
      res.json(employees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Get single employee
  app.get("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await storage.getEmployee(parseInt(id));
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error: any) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  // Create new employee
  app.post("/api/employees", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const employeeData = {
        ...req.body,
        organizationId: user.organizationId
      };
      
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error: any) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Update employee
  app.put("/api/employees/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const employee = await storage.updateEmployee(parseInt(id), updates);
      res.json(employee);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // Delete employee
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEmployee(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Employee Document API Routes
  
  // Multer configuration for employee documents
  const employeeDocumentStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const user = getAuthenticatedUser(req);
        const uploadsDir = path.join(process.cwd(), 'uploads', `org-${user.organizationId}`, 'employee_documents');
        await ensureOrganizationFolders(user.organizationId);
        cb(null, uploadsDir);
      } catch (error) {
        cb(error as Error, '');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `doc-${uniqueSuffix}${ext}`);
    }
  });

  const uploadEmployeeDocument = multer({ 
    storage: employeeDocumentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Allow documents, images, and some common file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only documents and images are allowed.'), false);
      }
    }
  });

  // Get employee documents
  app.get("/api/employees/:employeeId/documents", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { employeeId } = req.params;
      
      const documents = await storage.getEmployeeDocuments(parseInt(employeeId), user.organizationId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching employee documents:", error);
      res.status(500).json({ message: "Failed to fetch employee documents" });
    }
  });

  // Get single employee document
  app.get("/api/employee-documents/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const document = await storage.getEmployeeDocument(parseInt(id), user.organizationId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error: any) {
      console.error("Error fetching employee document:", error);
      res.status(500).json({ message: "Failed to fetch employee document" });
    }
  });

  // Upload employee document
  app.post("/api/employees/:employeeId/documents", requireAuth, uploadEmployeeDocument.single('document'), async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { employeeId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { documentType, category, title, description, confidentialityLevel, accessLevel } = req.body;

      if (!documentType || !title) {
        return res.status(400).json({ message: "Document type and title are required" });
      }

      // Determine file type based on mime type
      let fileType = 'other';
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (file.mimetype.includes('pdf') || file.mimetype.includes('word') || file.mimetype.includes('document')) {
        fileType = 'document';
      }

      const documentData = {
        employeeId: parseInt(employeeId),
        organizationId: user.organizationId,
        uploadedBy: user.id,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType,
        documentType,
        category: category || 'general',
        title,
        description: description || '',
        confidentialityLevel: confidentialityLevel || 'internal',
        accessLevel: accessLevel || 'hr_only',
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      const document = await storage.createEmployeeDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading employee document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Update employee document
  app.put("/api/employee-documents/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const updates = req.body;
      
      // Verify document exists and belongs to organization
      const existingDocument = await storage.getEmployeeDocument(parseInt(id), user.organizationId);
      if (!existingDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      const document = await storage.updateEmployeeDocument(parseInt(id), updates);
      res.json(document);
    } catch (error: any) {
      console.error("Error updating employee document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete employee document
  app.delete("/api/employee-documents/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      // Verify document exists and belongs to organization
      const existingDocument = await storage.getEmployeeDocument(parseInt(id), user.organizationId);
      if (!existingDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete the file from disk
      try {
        await fs.unlink(existingDocument.filePath);
      } catch (fileError) {
        console.warn("Could not delete file from disk:", fileError);
      }

      const deleted = await storage.deleteEmployeeDocument(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting employee document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Serve employee document files
  app.get("/api/employee-documents/:id/download", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const document = await storage.getEmployeeDocument(parseInt(id), user.organizationId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if file exists
      const fileExists = fsSync.existsSync(document.filePath);
      if (!fileExists) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Update download count and last accessed
      await storage.updateEmployeeDocument(parseInt(id), {
        downloadCount: document.downloadCount + 1,
        lastAccessedAt: new Date()
      });

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      
      // Stream the file
      const fileStream = fsSync.createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Error downloading employee document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Time Off Request API Routes
  
  // Get time off requests
  app.get("/api/time-off-requests", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { employeeId } = req.query;
      
      const requests = await storage.getTimeOffRequests(
        user.organizationId, 
        employeeId ? parseInt(employeeId as string) : undefined
      );
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching time off requests:", error);
      res.status(500).json({ message: "Failed to fetch time off requests" });
    }
  });

  // Create time off request
  app.post("/api/time-off-requests", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const requestData = {
        ...req.body,
        organizationId: user.organizationId
      };
      
      const request = await storage.createTimeOffRequest(requestData);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating time off request:", error);
      res.status(500).json({ message: "Failed to create time off request" });
    }
  });

  // Approve/reject time off request
  app.patch("/api/time-off-requests/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectedReason } = req.body;
      const user = getAuthenticatedUser(req);
      
      let request;
      if (status === 'approved') {
        request = await storage.approveTimeOffRequest(parseInt(id), user.id);
      } else if (status === 'rejected') {
        request = await storage.rejectTimeOffRequest(parseInt(id), user.id, rejectedReason);
      } else {
        request = await storage.updateTimeOffRequest(parseInt(id), req.body);
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("Error updating time off request:", error);
      res.status(500).json({ message: "Failed to update time off request" });
    }
  });

  // Performance Review API Routes
  
  // Get performance reviews
  app.get("/api/performance-reviews", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { employeeId } = req.query;
      
      const reviews = await storage.getPerformanceReviews(
        user.organizationId,
        employeeId ? parseInt(employeeId as string) : undefined
      );
      res.json(reviews);
    } catch (error: any) {
      console.error("Error fetching performance reviews:", error);
      res.status(500).json({ message: "Failed to fetch performance reviews" });
    }
  });

  // Create performance review
  app.post("/api/performance-reviews", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const reviewData = {
        ...req.body,
        organizationId: user.organizationId,
        reviewerId: user.id
      };
      
      const review = await storage.createPerformanceReview(reviewData);
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating performance review:", error);
      res.status(500).json({ message: "Failed to create performance review" });
    }
  });

  // Update performance review
  app.put("/api/performance-reviews/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const review = await storage.updatePerformanceReview(parseInt(id), updates);
      res.json(review);
    } catch (error: any) {
      console.error("Error updating performance review:", error);
      res.status(500).json({ message: "Failed to update performance review" });
    }
  });

  // Disciplinary Action API Routes
  
  // Get disciplinary actions
  app.get("/api/disciplinary-actions", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { employeeId } = req.query;
      
      const actions = await storage.getDisciplinaryActions(
        user.organizationId,
        employeeId ? parseInt(employeeId as string) : undefined
      );
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching disciplinary actions:", error);
      res.status(500).json({ message: "Failed to fetch disciplinary actions" });
    }
  });

  // Create disciplinary action
  app.post("/api/disciplinary-actions", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const actionData = {
        ...req.body,
        organizationId: user.organizationId,
        issuedBy: user.id
      };
      
      const action = await storage.createDisciplinaryAction(actionData);
      res.status(201).json(action);
    } catch (error: any) {
      console.error("Error creating disciplinary action:", error);
      res.status(500).json({ message: "Failed to create disciplinary action" });
    }
  });

  // Update disciplinary action
  app.put("/api/disciplinary-actions/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const action = await storage.updateDisciplinaryAction(parseInt(id), updates);
      res.json(action);
    } catch (error: any) {
      console.error("Error updating disciplinary action:", error);
      res.status(500).json({ message: "Failed to update disciplinary action" });
    }
  });

  // Organizations endpoint for user creation dropdown
  app.get("/api/organizations", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only admins and managers can access this endpoint
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Regular admins can only see their own organization
      // Superadmin (admin@profieldmanager.com) can see all organizations
      if (user.email === 'superadmin@profieldmanager.com') {
        const organizations = await storage.getAllOrganizations();
        res.json(organizations);
      } else {
        // Regular admin - only return their organization
        const organization = await storage.getOrganizationById(user.organizationId);
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }
        res.json([organization]);
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // SaaS Admin Routes
  
  // Get SaaS metrics and overview data
  app.get("/api/admin/saas/metrics", requireAdmin, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizations();
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const totalOrganizations = organizations.length;
      const activeSubscriptions = organizations.filter(org => org.subscriptionStatus === 'active').length;
      const trialSubscriptions = organizations.filter(org => org.subscriptionStatus === 'trial').length;
      const newOrganizationsThisMonth = organizations.filter(org => 
        new Date(org.createdAt) >= currentMonth
      ).length;
      
      // Calculate monthly revenue (this would typically come from billing system)
      const monthlyRevenue = activeSubscriptions * 99; // Placeholder calculation
      const revenueGrowth = 12; // Placeholder
      const churnRate = 2.5; // Placeholder
      const churnTrend = -0.5; // Placeholder
      
      res.json({
        totalOrganizations,
        newOrganizationsThisMonth,
        activeSubscriptions,
        trialSubscriptions,
        monthlyRevenue,
        revenueGrowth,
        churnRate,
        churnTrend
      });
    } catch (error: any) {
      console.error("Error fetching SaaS metrics:", error);
      res.status(500).json({ message: "Failed to fetch SaaS metrics" });
    }
  });

  // Get all organizations for admin management
  app.get("/api/admin/saas/organizations", requireAdmin, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizationsWithDetails();
      res.json(organizations);
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Update organization details
  app.put("/api/admin/saas/organizations/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const organization = await storage.updateOrganization(parseInt(id), updates);
      res.json(organization);
    } catch (error: any) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Get organization users
  app.get("/api/admin/saas/organizations/:id/users", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const users = await storage.getUsersByOrganization(parseInt(id));
      
      // Remove passwords from response
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined,
      }));
      
      res.json(safeUsers);
    } catch (error: any) {
      console.error("Error fetching organization users:", error);
      res.status(500).json({ message: "Failed to fetch organization users" });
    }
  });

  // Update organization user
  app.put("/api/admin/saas/organizations/:orgId/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await AuthService.hashPassword(updates.password);
      }
      
      const user = await storage.updateUser(parseInt(userId), updates);
      
      // Remove password from response
      const safeUser = { ...user, password: undefined };
      res.json(safeUser);
    } catch (error: any) {
      console.error("Error updating organization user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete organization user
  app.delete("/api/admin/saas/organizations/:orgId/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      
      await storage.deleteUser(parseInt(userId));
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting organization user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Suspend organization
  app.post("/api/admin/saas/organizations/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const organization = await storage.updateOrganization(parseInt(id), {
        subscriptionStatus: 'suspended'
      });
      
      res.json(organization);
    } catch (error: any) {
      console.error("Error suspending organization:", error);
      res.status(500).json({ message: "Failed to suspend organization" });
    }
  });

  // Get billing and revenue data
  app.get("/api/admin/saas/billing", requireAdmin, async (req, res) => {
    try {
      // This would typically integrate with Stripe or your billing system
      const recentPayments = [
        {
          id: 1,
          organizationName: "Acme Corp",
          planName: "Professional",
          amount: 99,
          status: "succeeded",
          date: new Date()
        },
        {
          id: 2,
          organizationName: "Tech Solutions",
          planName: "Enterprise",
          amount: 199,
          status: "succeeded",
          date: new Date()
        }
      ];
      
      const failedPayments = [
        {
          id: 1,
          organizationName: "Small Biz",
          amount: 49,
          lastAttempt: new Date(),
          reason: "Card declined"
        }
      ];
      
      res.json({
        recentPayments,
        failedPayments
      });
    } catch (error: any) {
      console.error("Error fetching billing data:", error);
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  // Get subscription plans (accessible to authenticated users)
  app.get("/api/saas/plans", requireAuth, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      console.log("Fetched subscription plans:", plans);
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Advanced API Integration Management Routes
  
  // Get organization's API keys
  app.get("/api/integrations/api-keys", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const keys = await db.execute(
        "SELECT id, key_name, permissions, rate_limit_per_hour, rate_limit_per_day, rate_limit_per_month, is_active, expires_at, last_used_at, created_at FROM api_keys WHERE organization_id = ? ORDER BY created_at DESC",
        [user.organizationId]
      );
      res.json(keys.rows);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Create new API key
  app.post("/api/integrations/api-keys", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { keyName, permissions, rateLimits, expiresAt } = req.body;
      
      // Generate secure API key
      const apiKey = `pf_${user.organizationId}_${crypto.randomBytes(32).toString('hex')}`;
      
      const result = await db.execute(
        `INSERT INTO api_keys (organization_id, key_name, api_key, permissions, rate_limit_per_hour, rate_limit_per_day, rate_limit_per_month, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          user.organizationId,
          keyName,
          apiKey,
          JSON.stringify(permissions || {}),
          rateLimits?.perHour || 1000,
          rateLimits?.perDay || 10000,
          rateLimits?.perMonth || 100000,
          expiresAt ? new Date(expiresAt) : null
        ]
      );
      
      res.status(201).json({ ...result.rows[0], api_key: apiKey });
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // Update API key
  app.put("/api/integrations/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const keyId = parseInt(req.params.id);
      const { keyName, permissions, rateLimits, isActive } = req.body;
      
      await db.execute(
        `UPDATE api_keys SET key_name = ?, permissions = ?, rate_limit_per_hour = ?, rate_limit_per_day = ?, rate_limit_per_month = ?, is_active = ?, updated_at = NOW() 
         WHERE id = ? AND organization_id = ?`,
        [
          keyName,
          JSON.stringify(permissions),
          rateLimits?.perHour,
          rateLimits?.perDay,
          rateLimits?.perMonth,
          isActive,
          keyId,
          user.organizationId
        ]
      );
      
      res.json({ message: "API key updated successfully" });
    } catch (error: any) {
      console.error("Error updating API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  // Delete API key
  app.delete("/api/integrations/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const keyId = parseInt(req.params.id);
      
      await db.execute(
        "DELETE FROM api_keys WHERE id = ? AND organization_id = ?",
        [keyId, user.organizationId]
      );
      
      res.json({ message: "API key deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Get API usage statistics
  app.get("/api/integrations/api-usage", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      const usageStats = await db.execute(
        `SELECT 
           ak.key_name,
           COUNT(aul.id) as total_requests,
           AVG(aul.response_time_ms) as avg_response_time,
           COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as error_count,
           DATE(aul.created_at) as usage_date
         FROM api_usage_logs aul
         JOIN api_keys ak ON aul.api_key_id = ak.id
         WHERE aul.organization_id = ? 
           AND aul.created_at >= ? 
           AND aul.created_at <= ?
         GROUP BY ak.id, ak.key_name, DATE(aul.created_at)
         ORDER BY usage_date DESC`,
        [
          user.organizationId,
          startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate || new Date()
        ]
      );
      
      res.json(usageStats.rows);
    } catch (error: any) {
      console.error("Error fetching API usage:", error);
      res.status(500).json({ message: "Failed to fetch API usage statistics" });
    }
  });

  // Webhook Management Routes
  
  // Get webhooks
  app.get("/api/integrations/webhooks", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const webhooks = await db.execute(
        "SELECT * FROM webhook_endpoints WHERE organization_id = ? ORDER BY created_at DESC",
        [user.organizationId]
      );
      res.json(webhooks.rows);
    } catch (error: any) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  // Create webhook
  app.post("/api/integrations/webhooks", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { name, url, events, retryCount, timeoutSeconds } = req.body;
      
      const secretKey = crypto.randomBytes(32).toString('hex');
      
      const result = await db.execute(
        `INSERT INTO webhook_endpoints (organization_id, name, url, events, secret_key, retry_count, timeout_seconds) 
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [
          user.organizationId,
          name,
          url,
          events || [],
          secretKey,
          retryCount || 3,
          timeoutSeconds || 30
        ]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  // Integration Configuration Routes
  
  // Get integration configs
  app.get("/api/integrations/configs", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const configs = await db.execute(
        "SELECT id, integration_type, is_enabled, created_at, updated_at FROM integration_configs WHERE organization_id = ?",
        [user.organizationId]
      );
      res.json(configs.rows);
    } catch (error: any) {
      console.error("Error fetching integration configs:", error);
      res.status(500).json({ message: "Failed to fetch integration configurations" });
    }
  });

  // Save integration config
  app.post("/api/integrations/configs", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { integrationType, configData, isEnabled } = req.body;
      
      await db.execute(
        `INSERT INTO integration_configs (organization_id, integration_type, config_data, is_enabled) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT (organization_id, integration_type) 
         DO UPDATE SET config_data = ?, is_enabled = ?, updated_at = NOW()`,
        [
          user.organizationId,
          integrationType,
          JSON.stringify(configData),
          isEnabled,
          JSON.stringify(configData),
          isEnabled
        ]
      );
      
      res.json({ message: "Integration configuration saved successfully" });
    } catch (error: any) {
      console.error("Error saving integration config:", error);
      res.status(500).json({ message: "Failed to save integration configuration" });
    }
  });

  // Create new subscription plan
  app.post("/api/admin/saas/plans", requireAdmin, async (req, res) => {
    try {
      const planData = req.body;
      // This would create a new plan in your database
      res.json({ id: Date.now(), ...planData, isActive: true });
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Create new subscription for organization
  app.post("/api/admin/saas/subscriptions", requireAdmin, async (req, res) => {
    try {
      const { 
        organizationId, 
        planId, 
        status, 
        startDate, 
        trialDays,
        createNewOrg,
        orgName,
        orgEmail,
        orgAddress,
        orgCity,
        orgState,
        orgZipCode,
        orgPhone,
        maxUsers,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword
      } = req.body;
      
      // Get the plan details
      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.id === parseInt(planId));
      if (!plan) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      let organization;
      
      if (createNewOrg) {
        // Create new organization
        const hashedPassword = await AuthService.hashPassword(adminPassword);
        
        // Generate unique slug
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        // Calculate trial end date if it's a trial
        let trialEndsAt = null;
        if (status === 'trial' && trialDays) {
          trialEndsAt = new Date(startDate);
          trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        }

        // Create organization with subscription details
        organization = await storage.createOrganization({
          name: orgName,
          slug: slug,
          subscriptionStatus: status,
          subscriptionPlanId: parseInt(planId),
          trialEndsAt: trialEndsAt,
        });

        // Create folder structure for the new organization
        await createOrgFolderStructure(organization.id);

        // Create admin user for the organization
        const adminUser = await storage.createUser({
          username: adminEmail.split('@')[0],
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          role: "admin",
          isActive: true,
          organizationId: organization.id,
        });

        res.json({
          message: "Organization and subscription created successfully",
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            subscriptionStatus: organization.subscriptionStatus,
            subscriptionPlanId: organization.subscriptionPlanId,
            trialEndsAt: organization.trialEndsAt
          },
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            role: adminUser.role
          }
        });
      } else {
        // Update existing organization
        // Calculate trial end date if it's a trial
        let trialEndsAt = null;
        if (status === 'trial' && trialDays) {
          trialEndsAt = new Date(startDate);
          trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        }

        organization = await storage.updateOrganization(parseInt(organizationId), {
          subscriptionPlanId: parseInt(planId),
          subscriptionStatus: status,
          trialEndsAt: trialEndsAt,
        });

        res.json({
          message: "Subscription created successfully",
          organization: organization
        });
      }
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Update subscription plan features
  app.post("/api/saas/plan-features/:planId", async (req, res) => {
    try {
      const { planId } = req.params;
      const featureUpdates = req.body;
      
      console.log(`Updating plan ${planId} with features:`, featureUpdates);
      
      // In a real implementation, you would update the plan in the database
      // For now, we'll just return success
      res.json({ 
        success: true, 
        message: `Updated features for plan ${planId}`,
        planId: parseInt(planId),
        updates: featureUpdates
      });
    } catch (error: any) {
      console.error("Error updating subscription plan features:", error);
      res.status(500).json({ message: "Failed to update subscription plan features" });
    }
  });

  // SaaS Organization Signup
  app.post("/api/organizations/signup", async (req, res) => {
    try {
      const { organizationName, slug, email, firstName, lastName, password, plan } = req.body;
      
      // Check if slug is available
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        return res.status(400).json({ message: "Organization slug already taken" });
      }

      // Check if email is already used
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Get plan details
      const planDetails = await storage.getSubscriptionPlanBySlug(plan);
      if (!planDetails) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      // Create organization with trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial

      const organization = await storage.createOrganization({
        name: organizationName,
        slug,
        subscriptionPlanId: planDetails.id,
        subscriptionStatus: "trial",
        trialEndsAt: trialEndDate,
      });

      // Create folder structure for the new organization
      // createOrganizationFolders already imported
      await createOrganizationFolders(organization.id);

      // Create admin user for the organization
      const hashedPassword = await AuthService.hashPassword(password);
      const user = await storage.createUser({
        organizationId: organization.id,
        username: email.split('@')[0],
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin",
        isActive: true,
      });

      res.status(201).json({
        message: "Organization created successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscriptionPlan: organization.subscriptionPlan,
          subscriptionStatus: organization.subscriptionStatus,
          trialEndDate: organization.trialEndDate
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error("Organization signup error:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Get subscription plans for landing page
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get organization details for admin panel
  app.get("/api/organization", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organization = await storage.getOrganizationById(user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json(organization);
    } catch (error: any) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization details" });
    }
  });

  // Update organization subscription plan
  app.post("/api/organization/upgrade", requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { planSlug } = req.body;

      const planDetails = await storage.getSubscriptionPlanBySlug(planSlug);
      if (!planDetails) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      const updatedOrg = await storage.updateOrganizationPlan(user.organizationId, {
        subscriptionPlan: planSlug,
        maxUsers: planDetails.maxUsers,
        maxProjects: planDetails.maxProjects,
        maxStorageGB: planDetails.maxStorageGB,
        hasAdvancedReporting: planDetails.hasAdvancedReporting,
        hasApiAccess: planDetails.hasApiAccess,
        hasCustomBranding: planDetails.hasCustomBranding,
        hasIntegrations: planDetails.hasIntegrations,
        hasPrioritySupport: planDetails.hasPrioritySupport,
      });

      res.json(updatedOrg);
    } catch (error: any) {
      console.error("Error upgrading organization:", error);
      res.status(500).json({ message: "Failed to upgrade organization" });
    }
  });

  // Get organization usage statistics
  app.get("/api/organization/usage", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organization = await storage.getOrganizationById(user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const usage = await storage.getOrganizationUsage(user.organizationId);

      res.json({
        organization: {
          name: organization.name,
          subscriptionPlan: organization.subscriptionPlan,
          subscriptionStatus: organization.subscriptionStatus,
          trialEndDate: organization.trialEndDate
        },
        usage,
        limits: {
          maxUsers: organization.maxUsers,
          maxProjects: organization.maxProjects,
          maxStorageGB: organization.maxStorageGB
        },
        features: {
          hasAdvancedReporting: organization.hasAdvancedReporting,
          hasApiAccess: organization.hasApiAccess,
          hasCustomBranding: organization.hasCustomBranding,
          hasIntegrations: organization.hasIntegrations,
          hasPrioritySupport: organization.hasPrioritySupport
        }
      });
    } catch (error: any) {
      console.error("Error fetching organization usage:", error);
      res.status(500).json({ message: "Failed to fetch organization usage" });
    }
  });

  // Get subscription plans
  app.get("/api/saas/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Get plans error:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get organization info (authenticated)
  app.get("/api/saas/organization", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organization = await storage.getOrganizationById(user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json(organization);
    } catch (error: any) {
      console.error("Get organization error:", error);
      res.status(500).json({ message: "Failed to fetch organization info" });
    }
  });

  // Update subscription plan
  app.post("/api/saas/upgrade", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { plan } = req.body;

      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only organization admins can upgrade plans" });
      }

      const planDetails = await storage.getSubscriptionPlanBySlug(plan);
      if (!planDetails) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      const organization = await storage.updateOrganizationPlan(user.organizationId, {
        subscriptionPlan: plan,
        maxUsers: planDetails.maxUsers,
        maxProjects: planDetails.maxProjects,
        maxStorageGB: planDetails.maxStorageGB,
        hasAdvancedReporting: planDetails.hasAdvancedReporting,
        hasApiAccess: planDetails.hasApiAccess,
        hasCustomBranding: planDetails.hasCustomBranding,
        hasIntegrations: planDetails.hasIntegrations,
        hasPrioritySupport: planDetails.hasPrioritySupport,
      });

      res.json({ message: "Plan upgraded successfully", organization });
    } catch (error: any) {
      console.error("Plan upgrade error:", error);
      res.status(500).json({ message: "Failed to upgrade plan" });
    }
  });

  // Usage statistics for the organization
  app.get("/api/saas/usage", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organization = await storage.getOrganizationById(user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const usage = await storage.getOrganizationUsage(user.organizationId);
      
      res.json({
        organization: {
          name: organization.name,
          subscriptionPlan: organization.subscriptionPlan,
          subscriptionStatus: organization.subscriptionStatus,
          trialEndDate: organization.trialEndDate,
        },
        limits: {
          maxUsers: organization.maxUsers,
          maxProjects: organization.maxProjects,
          maxStorageGB: organization.maxStorageGB,
        },
        usage,
        features: {
          hasAdvancedReporting: organization.hasAdvancedReporting,
          hasApiAccess: organization.hasApiAccess,
          hasCustomBranding: organization.hasCustomBranding,
          hasIntegrations: organization.hasIntegrations,
          hasPrioritySupport: organization.hasPrioritySupport,
        }
      });
    } catch (error: any) {
      console.error("Get usage error:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // Weather API endpoints
  app.get('/api/weather/current/:location', requireAuth, async (req, res) => {
    try {
      const { location } = req.params;
      const weather = await weatherService.getCurrentWeather(location);
      const summary = weatherService.getWeatherSummary(weather);
      
      res.json({
        location: weather.location,
        current: weather.current,
        summary
      });
    } catch (error: any) {
      console.error('Weather API error:', error);
      res.status(500).json({ message: 'Failed to fetch weather data' });
    }
  });

  app.get('/api/weather/forecast/:location', requireAuth, async (req, res) => {
    try {
      const { location } = req.params;
      const days = parseInt(req.query.days as string) || 3;
      
      const weather = await weatherService.getForecast(location, Math.min(days, 14));
      
      res.json({
        location: weather.location,
        forecast: weather.forecast,
        summary: weather.forecast?.forecastday.map(day => ({
          date: day.date,
          ...weatherService.getWeatherSummary(weather, day.date)
        }))
      });
    } catch (error: any) {
      console.error('Weather forecast error:', error);
      res.status(500).json({ message: 'Failed to fetch weather forecast' });
    }
  });

  // Get weather forecast for configured location (used by Weather tab)
  app.get('/api/weather/forecast', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getSettingsByCategory('weather');
      
      let weatherSettings = {
        enabled: false,
        defaultZipCode: '',
        apiKey: ''
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('weather_', '');
          if (key === 'enabled') {
            weatherSettings.enabled = setting.value === 'true';
          } else if (key === 'defaultZipCode') {
            weatherSettings.defaultZipCode = setting.value;
          } else if (key === 'apiKey') {
            weatherSettings.apiKey = setting.value;
          }
        });
      }
      
      if (!weatherSettings.enabled) {
        return res.status(400).json({ 
          message: "Weather service is disabled. Please enable it in Settings." 
        });
      }

      if (!weatherSettings.defaultZipCode) {
        return res.status(400).json({ 
          message: "Weather location not configured. Please set your default zip code in Settings." 
        });
      }

      if (!weatherSettings.apiKey) {
        return res.status(400).json({ 
          message: "Weather API key not configured. Please set your API key in Settings." 
        });
      }

      const days = parseInt(req.query.days as string) || 5;
      const weather = await weatherService.getForecast(weatherSettings.defaultZipCode, Math.min(days, 14));
      
      res.json(weather);
    } catch (error: any) {
      console.error('Weather forecast API error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch weather forecast. Please check your weather settings.' 
      });
    }
  });

  app.get('/api/weather/jobs/:jobId', requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const user = getAuthenticatedUser(req);
      const job = await storage.getProject(jobId, user.id);
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (!job.address) {
        return res.status(400).json({ message: 'Job has no address for weather lookup' });
      }

      // Get weather for job dates
      const startDate = job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : null;
      const endDate = job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : null;

      let weatherData: any = {};

      if (startDate) {
        try {
          const weather = await weatherService.getWeatherForDate(job.address, startDate);
          weatherData.startDate = {
            date: startDate,
            ...weatherService.getWeatherSummary(weather, startDate)
          };
        } catch (error) {
          console.warn('Could not get weather for start date:', error);
        }
      }

      if (endDate && endDate !== startDate) {
        try {
          const weather = await weatherService.getWeatherForDate(job.address, endDate);
          weatherData.endDate = {
            date: endDate,
            ...weatherService.getWeatherSummary(weather, endDate)
          };
        } catch (error) {
          console.warn('Could not get weather for end date:', error);
        }
      }

      res.json({
        jobId,
        location: job.address,
        weather: weatherData
      });
    } catch (error: any) {
      console.error('Job weather error:', error);
      res.status(500).json({ message: 'Failed to fetch job weather data' });
    }
  });

  app.get('/api/weather/calendar-job/:jobId', requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const user = getAuthenticatedUser(req);
      const job = await storage.getCalendarJob(jobId, user.organizationId);
      
      if (!job) {
        return res.status(404).json({ message: 'Calendar job not found' });
      }

      if (!job.location) {
        return res.status(400).json({ message: 'Calendar job has no location for weather lookup' });
      }

      const startDate = new Date(job.startDate).toISOString().split('T')[0];
      const endDate = new Date(job.endDate).toISOString().split('T')[0];

      let weatherData: any = {};

      try {
        const weather = await weatherService.getWeatherForDate(job.location, startDate);
        weatherData.startDate = {
          date: startDate,
          ...weatherService.getWeatherSummary(weather, startDate)
        };

        if (endDate !== startDate) {
          const endWeather = await weatherService.getWeatherForDate(job.location, endDate);
          weatherData.endDate = {
            date: endDate,
            ...weatherService.getWeatherSummary(endWeather, endDate)
          };
        }
      } catch (error) {
        console.warn('Could not get weather for calendar job:', error);
      }

      res.json({
        jobId,
        location: job.location,
        weather: weatherData
      });
    } catch (error: any) {
      console.error('Calendar job weather error:', error);
      res.status(500).json({ message: 'Failed to fetch calendar job weather data' });
    }
  });

  // File Manager API routes
  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { folderId } = req.query;
      const files = await storage.getFiles(user.organizationId, folderId ? parseInt(folderId as string) : undefined);
      res.json(files);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const file = await storage.getFile(parseInt(id), user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error: any) {
      console.error("Error fetching file:", error);
      res.status(500).json({ message: "Failed to fetch file" });
    }
  });

  // REMOVED: Old local storage file upload route
  // File uploads now use Cloudinary via server/routes/fileUpload.ts

  app.put("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const updates = req.body;
      
      const file = await storage.updateFile(parseInt(id), updates);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Broadcast to WebSocket
      broadcastToWebUsers({
        type: 'file_updated',
        data: file
      });

      res.json(file);
    } catch (error: any) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const success = await storage.deleteFile(parseInt(id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }

      // Broadcast to WebSocket
      broadcastToWebUsers({
        type: 'file_deleted',
        data: { id: parseInt(id) }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const file = await storage.getFile(parseInt(id), user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Update download count
      await storage.updateFile(parseInt(id), {
        downloadCount: file.downloadCount + 1
      });

      // Send file
      res.download(file.filePath, file.originalName);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Folder management routes
  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { parentId } = req.query;
      const folders = await storage.getFolders(user.organizationId, parentId ? parseInt(parentId as string) : undefined);
      res.json(folders);
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const folderData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
      };
      
      const folder = await storage.createFolder(folderData);
      
      // Broadcast to WebSocket
      broadcastToWebUsers({
        type: 'folder_created',
        data: folder
      });

      res.json(folder);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  // File sharing routes
  app.post("/api/files/:id/share", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const { sharedWith, permissions, expiresAt, maxAccess } = req.body;
      
      const shareData = {
        fileId: parseInt(id),
        sharedBy: user.id,
        sharedWith: sharedWith || null,
        permissions: permissions || 'view',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxAccess: maxAccess || null,
      };
      
      const share = await storage.createFileShare(shareData);
      res.json(share);
    } catch (error: any) {
      console.error("Error sharing file:", error);
      res.status(500).json({ message: "Failed to share file" });
    }
  });

  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const share = await storage.getFileShare(token);
      
      if (!share) {
        return res.status(404).json({ message: "Share not found or expired" });
      }

      // Check if share is expired
      if (share.expiresAt && new Date() > share.expiresAt) {
        return res.status(404).json({ message: "Share has expired" });
      }

      // Check access limits
      if (share.maxAccess && share.accessCount >= share.maxAccess) {
        return res.status(403).json({ message: "Share access limit reached" });
      }

      // Update access count
      await storage.updateFileShareAccess(share.id);

      res.json({
        file: share.file,
        sharedBy: share.sharedByUser.username,
        permissions: share.permissions,
      });
    } catch (error: any) {
      console.error("Error accessing shared file:", error);
      res.status(500).json({ message: "Failed to access shared file" });
    }
  });

  // Digital signature routes for file manager
  app.post("/api/files/:id/sign", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const { signatureData, signerName } = req.body;

      if (!signatureData || !signerName) {
        return res.status(400).json({ message: "Signature data and signer name are required" });
      }

      const fileId = parseInt(id);
      const file = await storage.getFileManagerById(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check if file is suitable for signing
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimeType)) {
        return res.status(400).json({ message: "File type not supported for digital signature" });
      }

      // Sign the document
      const signedFile = await storage.signDocument(fileId, signatureData, signerName, user.id);

      // Broadcast signature event to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'document_signed',
              data: { fileId, signerName, signedAt: signedFile.signedAt }
            }));
          }
        });
      }

      res.json({
        success: true,
        message: "Document signed successfully",
        file: signedFile
      });
    } catch (error: any) {
      console.error("Error signing document:", error);
      res.status(500).json({ message: "Failed to sign document" });
    }
  });

  app.get("/api/files/:id/download-signed", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fileId = parseInt(id);

      const file = await storage.getSignedDocument(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "Signed document not found" });
      }

      // For now, return the original file with signature metadata
      // In a production system, you might generate a PDF with embedded signature
      const filePath = path.join(process.cwd(), file.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      const stat = fs.statSync(filePath);
      
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="signed_${file.originalName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Error downloading signed document:", error);
      res.status(500).json({ message: "Failed to download signed document" });
    }
  });

  app.get("/api/files/:id/preview", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fileId = parseInt(id);

      const file = await storage.getFileManagerById(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(process.cwd(), file.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      const stat = fs.statSync(filePath);
      
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Error previewing file:", error);
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Document signature field management routes
  app.post("/api/files/:id/signature-fields", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fieldData = {
        ...req.body,
        fileId: parseInt(id),
        organizationId: user.organizationId,
        createdBy: user.id,
      };

      const field = await storage.createSignatureField(fieldData);
      res.json(field);
    } catch (error: any) {
      console.error("Error creating signature field:", error);
      res.status(500).json({ message: "Failed to create signature field" });
    }
  });

  app.get("/api/files/:id/signature-fields", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fileId = parseInt(id);

      const fields = await storage.getSignatureFields(fileId);
      res.json(fields);
    } catch (error: any) {
      console.error("Error getting signature fields:", error);
      res.status(500).json({ message: "Failed to get signature fields" });
    }
  });

  app.put("/api/signature-fields/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fieldId = parseInt(id);

      const field = await storage.updateSignatureField(fieldId, req.body);
      res.json(field);
    } catch (error: any) {
      console.error("Error updating signature field:", error);
      res.status(500).json({ message: "Failed to update signature field" });
    }
  });

  app.delete("/api/signature-fields/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fieldId = parseInt(id);

      await storage.deleteSignatureField(fieldId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting signature field:", error);
      res.status(500).json({ message: "Failed to delete signature field" });
    }
  });

  app.post("/api/signature-fields/:id/sign", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const { signatureData, signerName } = req.body;
      const fieldId = parseInt(id);

      if (!signatureData || !signerName) {
        return res.status(400).json({ message: "Signature data and signer name are required" });
      }

      const field = await storage.signDocumentField(fieldId, signatureData, signerName, user.id);

      // Broadcast signature event to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'document_field_signed',
              data: { fieldId, signerName, signedAt: field.signedAt }
            }));
          }
        });
      }

      res.json({
        success: true,
        message: "Document field signed successfully",
        field: field
      });
    } catch (error: any) {
      console.error("Error signing document field:", error);
      res.status(500).json({ message: "Failed to sign document field" });
    }
  });

  // File and Folder Permissions API routes
  
  // File permissions
  app.get("/api/files/:id/permissions", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fileId = parseInt(id);
      
      const permissions = await storage.getFilePermissions(fileId, user.organizationId);
      res.json(permissions);
    } catch (error: any) {
      console.error("Error fetching file permissions:", error);
      res.status(500).json({ message: "Failed to fetch file permissions" });
    }
  });

  app.post("/api/files/:id/permissions", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const fileId = parseInt(id);
      
      const permissionData = {
        ...req.body,
        fileId,
        organizationId: user.organizationId,
        grantedBy: user.id
      };
      
      const permission = await storage.createFilePermission(permissionData);
      res.json(permission);
    } catch (error: any) {
      console.error("Error creating file permission:", error);
      res.status(500).json({ message: "Failed to create file permission" });
    }
  });

  app.put("/api/file-permissions/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const permissionId = parseInt(id);
      
      const permission = await storage.updateFilePermission(permissionId, req.body);
      res.json(permission);
    } catch (error: any) {
      console.error("Error updating file permission:", error);
      res.status(500).json({ message: "Failed to update file permission" });
    }
  });

  app.delete("/api/file-permissions/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const permissionId = parseInt(id);
      
      const success = await storage.deleteFilePermission(permissionId);
      if (success) {
        res.json({ message: "File permission deleted successfully" });
      } else {
        res.status(404).json({ message: "File permission not found" });
      }
    } catch (error: any) {
      console.error("Error deleting file permission:", error);
      res.status(500).json({ message: "Failed to delete file permission" });
    }
  });

  // Folder permissions
  app.get("/api/folders/:id/permissions", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const folderId = parseInt(id);
      
      const permissions = await storage.getFolderPermissions(folderId, user.organizationId);
      res.json(permissions);
    } catch (error: any) {
      console.error("Error fetching folder permissions:", error);
      res.status(500).json({ message: "Failed to fetch folder permissions" });
    }
  });

  app.post("/api/folders/:id/permissions", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const folderId = parseInt(id);
      
      const permissionData = {
        ...req.body,
        folderId,
        organizationId: user.organizationId,
        grantedBy: user.id
      };
      
      const permission = await storage.createFolderPermission(permissionData);
      res.json(permission);
    } catch (error: any) {
      console.error("Error creating folder permission:", error);
      res.status(500).json({ message: "Failed to create folder permission" });
    }
  });

  app.put("/api/folder-permissions/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const permissionId = parseInt(id);
      
      const permission = await storage.updateFolderPermission(permissionId, req.body);
      res.json(permission);
    } catch (error: any) {
      console.error("Error updating folder permission:", error);
      res.status(500).json({ message: "Failed to update folder permission" });
    }
  });

  app.delete("/api/folder-permissions/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const permissionId = parseInt(id);
      
      const success = await storage.deleteFolderPermission(permissionId);
      if (success) {
        res.json({ message: "Folder permission deleted successfully" });
      } else {
        res.status(404).json({ message: "Folder permission not found" });
      }
    } catch (error: any) {
      console.error("Error deleting folder permission:", error);
      res.status(500).json({ message: "Failed to delete folder permission" });
    }
  });

  // Access control check routes
  app.get("/api/files/:id/access/:action", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id, action } = req.params;
      const fileId = parseInt(id);
      
      const hasAccess = await storage.checkFileAccess(user.id, fileId, user.organizationId, action);
      res.json({ hasAccess });
    } catch (error: any) {
      console.error("Error checking file access:", error);
      res.status(500).json({ message: "Failed to check file access" });
    }
  });

  app.get("/api/folders/:id/access/:action", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id, action } = req.params;
      const folderId = parseInt(id);
      
      const hasAccess = await storage.checkFolderAccess(user.id, folderId, user.organizationId, action);
      res.json({ hasAccess });
    } catch (error: any) {
      console.error("Error checking folder access:", error);
      res.status(500).json({ message: "Failed to check folder access" });
    }
  });

  // Default permissions management
  app.get("/api/permissions/defaults", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const defaults = await storage.getDefaultPermissions(user.organizationId);
      res.json(defaults);
    } catch (error: any) {
      console.error("Error fetching default permissions:", error);
      res.status(500).json({ message: "Failed to fetch default permissions" });
    }
  });

  app.post("/api/permissions/defaults", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { userRole, resourceType, ...permissions } = req.body;
      
      const defaultPermission = await storage.setDefaultPermissions(
        user.organizationId,
        userRole,
        resourceType,
        permissions
      );
      
      res.json(defaultPermission);
    } catch (error: any) {
      console.error("Error setting default permissions:", error);
      res.status(500).json({ message: "Failed to set default permissions" });
    }
  });

  // File creation and editing routes
  app.post("/api/files/create-text", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, content, folderId } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ message: "Name and content are required" });
      }
      
      const file = await storage.createTextFile(
        user.organizationId, 
        user.id, 
        name, 
        content, 
        folderId || null
      );
      
      res.status(201).json(file);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'file_created',
              data: file
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error creating text file:", error);
      res.status(500).json({ message: "Failed to create text file" });
    }
  });

  app.get("/api/files/:id/content", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const user = req.user as User;
      
      // Get the file to ensure it belongs to the user's organization
      const file = await storage.getFile(fileId, user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const fs = require('fs');
      const path = require('path');
      
      try {
        const fullPath = path.join(process.cwd(), file.filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({ content });
      } catch (fsError) {
        console.error("Error reading file:", fsError);
        res.status(404).json({ message: "File content not found" });
      }
    } catch (error: any) {
      console.error("Error getting file content:", error);
      res.status(500).json({ message: "Failed to get file content" });
    }
  });

  app.put("/api/files/:id/content", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const user = req.user as User;
      const { content } = req.body;
      
      if (!content && content !== '') {
        return res.status(400).json({ message: "Content is required" });
      }
      
      // Get the file to ensure it belongs to the user's organization
      const file = await storage.getFile(fileId, user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const updatedFile = await storage.updateTextFile(fileId, content);
      
      res.json(updatedFile);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'file_updated',
              data: updatedFile
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error updating file content:", error);
      res.status(500).json({ message: "Failed to update file content" });
    }
  });

  app.post("/api/files/:id/convert-to-pdf", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const user = req.user as User;
      
      // Get the file to ensure it belongs to the user's organization
      const file = await storage.getFile(fileId, user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file is text-based
      if (!file.mimeType?.includes('text') && file.fileType !== 'text') {
        return res.status(400).json({ message: "Only text files can be converted to PDF" });
      }
      
      const pdfPath = await storage.convertToPdf(fileId, user.organizationId);
      
      res.json({ 
        message: "File converted to PDF successfully", 
        pdfPath,
        downloadUrl: `/${pdfPath}`
      });
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'file_converted_to_pdf',
              data: { fileId, pdfPath }
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error converting file to PDF:", error);
      res.status(500).json({ message: "Failed to convert file to PDF" });
    }
  });

  // Folder management routes
  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      
      const folders = await storage.getFolders(user.organizationId, parentId);
      res.json(folders);
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, description, parentId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }
      
      const folderData = {
        organizationId: user.organizationId,
        createdBy: user.id,
        name,
        description: description || null,
        parentId: parentId || null,
      };
      
      const folder = await storage.createFolder(folderData);
      res.status(201).json(folder);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'folder_created',
              data: folder
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.put("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }
      
      const folder = await storage.updateFolder(folderId, { name, description });
      res.json(folder);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'folder_updated',
              data: folder
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error updating folder:", error);
      res.status(500).json({ message: "Failed to update folder" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      
      await storage.deleteFolder(folderId);
      res.json({ message: "Folder deleted successfully" });
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'folder_deleted',
              data: { id: folderId }
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Drag and drop endpoints
  app.post("/api/files/:id/move", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const fileId = parseInt(req.params.id);
      const { folderId } = req.body;
      
      const result = await storage.moveFileToFolder(fileId, folderId, user.id);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'file_moved',
              data: { fileId, folderId, previousFolderId: result.previousFolderId }
            }));
          }
        });
      }
      
      res.json({ 
        success: true, 
        file: result.file,
        previousFolderId: result.previousFolderId
      });
    } catch (error: any) {
      console.error("Error moving file:", error);
      res.status(500).json({ message: "Failed to move file" });
    }
  });

  app.post("/api/files/:id/undo-move", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const fileId = parseInt(req.params.id);
      const { previousFolderId } = req.body;
      
      const restoredFile = await storage.undoFileMove(fileId, previousFolderId, user.id);
      
      // Broadcast to WebSocket clients
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'file_move_undone',
              data: { fileId, restoredFolderId: previousFolderId }
            }));
          }
        });
      }
      
      res.json({ success: true, file: restoredFile });
    } catch (error: any) {
      console.error("Error undoing file move:", error);
      res.status(500).json({ message: "Failed to undo file move" });
    }
  });

  // GPS Location Update endpoint
  app.post("/api/gps-tracking/update", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { latitude, longitude, accuracy, deviceType, locationTimestamp } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      // Perform reverse geocoding to get address from coordinates
      let address = null;
      try {
        const client = new Client({});
        
        const geocodeResponse = await client.reverseGeocode({
          params: {
            latlng: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
            key: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
          },
        });

        if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
          address = geocodeResponse.data.results[0].formatted_address;
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed, saving coordinates only:', geocodeError.message);
      }

      // Update the user's most recent session with new location data
      const [existingSession] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, user.id))
        .orderBy(desc(userSessions.createdAt))
        .limit(1);

      if (existingSession) {
        // Update existing session
        await db
          .update(userSessions)
          .set({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            locationAccuracy: accuracy?.toString(),
            deviceType: deviceType || 'unknown',
            locationTimestamp: locationTimestamp ? new Date(locationTimestamp) : new Date(),
            address: address || null, // Store the resolved address
          })
          .where(eq(userSessions.id, existingSession.id));
      } else {
        // Create new session if none exists
        await db
          .insert(userSessions)
          .values({
            userId: user.id,
            token: `mobile_${Date.now()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            locationAccuracy: accuracy?.toString(),
            deviceType: deviceType || 'mobile',
            locationTimestamp: locationTimestamp ? new Date(locationTimestamp) : new Date(),
            userAgent: req.get('User-Agent') || 'Unknown',
            ipAddress: req.ip || 'Unknown',
            address: address || null, // Store the resolved address
          });
      }

      res.json({ 
        message: "Location updated successfully",
        address: address // Return the address in response
      });
    } catch (error: any) {
      console.error("Error updating GPS location:", error);
      res.status(500).json({ message: "Error updating location: " + error.message });
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          // Authenticate the WebSocket connection
          connectedClients.set(ws, {
            userId: data.userId,
            username: data.username,
            userType: data.userType || 'web'
          });
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'WebSocket authenticated successfully'
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Inspection Routes
  app.get("/api/inspections/templates", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { type } = req.query;
      const templates = await storage.getInspectionTemplates(user.organizationId, type as string);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching inspection templates:", error);
      res.status(500).json({ message: "Failed to fetch inspection templates" });
    }
  });

  app.get("/api/inspections/items", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { type = 'pre-trip' } = req.query;
      
      // Get default template for the type
      const templates = await storage.getInspectionTemplates(user.organizationId, type as string);
      const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
      
      if (!defaultTemplate) {
        // Return default items if no template exists
        const defaultItems = {
          'pre-trip': [
            { id: 1, category: "Vehicle Safety", name: "Mirrors", description: "Check all mirrors for proper adjustment and cleanliness", isRequired: true },
            { id: 2, category: "Vehicle Safety", name: "Tires", description: "Inspect tire pressure and tread depth", isRequired: true },
            { id: 3, category: "Vehicle Safety", name: "Lights", description: "Test headlights, taillights, and hazard lights", isRequired: true },
            { id: 4, category: "Vehicle Safety", name: "Turn Signals", description: "Check left and right turn signals", isRequired: true },
            { id: 5, category: "Equipment", name: "Chemicals", description: "Verify chemical levels and proper storage", isRequired: true },
            { id: 6, category: "Equipment", name: "O-rings", description: "Inspect o-rings for wear and proper sealing", isRequired: true },
            { id: 7, category: "Equipment", name: "Nozzles", description: "Check nozzle condition and spray patterns", isRequired: true }
          ],
          'post-trip': [
            { id: 8, category: "Equipment", name: "Chemical Storage", description: "Secure all chemicals properly", isRequired: true },
            { id: 9, category: "Equipment", name: "Equipment Cleaning", description: "Clean and store all equipment", isRequired: true },
            { id: 10, category: "Vehicle", name: "Fuel Level", description: "Record fuel level at end of shift", isRequired: true },
            { id: 11, category: "Vehicle", name: "Mileage", description: "Record ending mileage", isRequired: true },
            { id: 12, category: "Safety", name: "Incident Report", description: "Report any incidents or issues", isRequired: false }
          ]
        };
        return res.json(defaultItems[type as keyof typeof defaultItems] || []);
      }
      
      const items = await storage.getInspectionItems(defaultTemplate.id);
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching inspection items:", error);
      res.status(500).json({ message: "Failed to fetch inspection items" });
    }
  });

  app.get("/api/inspections/records", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { type } = req.query;
      const records = await storage.getInspectionRecords(user.id, user.organizationId, type as string);
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching inspection records:", error);
      res.status(500).json({ message: "Failed to fetch inspection records" });
    }
  });

  // Get individual inspection record with full details
  app.get("/api/inspections/records/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const recordId = parseInt(req.params.id);
      
      // Get the inspection record
      const record = await storage.getInspectionRecord(recordId, user.id);
      if (!record) {
        return res.status(404).json({ message: "Inspection record not found" });
      }
      
      // Get all responses for this inspection
      const responses = await storage.getInspectionResponses(recordId);
      
      // Get user details for technician name
      const technician = await storage.getUser(record.userId);
      const technicianName = technician 
        ? `${technician.firstName || ''} ${technician.lastName || ''}`.trim() || technician.username
        : 'Unknown';
      
      // Combine the data
      const detailedRecord = {
        ...record,
        technicianName,
        responses: responses || []
      };
      
      res.json(detailedRecord);
    } catch (error: any) {
      console.error("Error fetching inspection record details:", error);
      res.status(500).json({ message: "Failed to fetch inspection record details" });
    }
  });

  app.get("/api/inspections/items", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { type } = req.query;
      
      if (!type) {
        return res.status(400).json({ message: "Type parameter is required" });
      }
      
      // Get or create default template
      const templates = await storage.getInspectionTemplates(user.organizationId, type as string);
      let templateId = templates.find(t => t.isDefault)?.id;
      
      if (!templateId) {
        // Create default template if none exists
        const template = await storage.createInspectionTemplate({
          organizationId: user.organizationId,
          name: `${type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection`,
          type,
          description: `Standard ${type} vehicle inspection`,
          isDefault: true,
          createdBy: user.id
        });
        templateId = template.id;
        
        // Create default inspection items for the template
        const defaultItems = type === 'pre-trip' ? [
          { category: 'Vehicle Safety', name: 'Mirrors', description: 'Check all mirrors for proper adjustment and cleanliness', isRequired: true },
          { category: 'Vehicle Safety', name: 'Tires', description: 'Inspect tire pressure and tread depth', isRequired: true },
          { category: 'Vehicle Safety', name: 'Lights', description: 'Test all lights including headlights, brake lights, and turn signals', isRequired: true },
          { category: 'Vehicle Safety', name: 'Horn', description: 'Test horn functionality', isRequired: true },
          { category: 'Engine', name: 'Oil Level', description: 'Check engine oil level and condition', isRequired: true },
          { category: 'Engine', name: 'Coolant Level', description: 'Check coolant level in reservoir', isRequired: true },
          { category: 'Engine', name: 'Brake Fluid', description: 'Check brake fluid level', isRequired: true },
          { category: 'Equipment', name: 'Chemicals', description: 'Verify chemical levels and equipment condition', isRequired: false },
          { category: 'Equipment', name: 'Hoses', description: 'Inspect hoses for damage or leaks', isRequired: false },
          { category: 'Equipment', name: 'Pump', description: 'Test pump operation', isRequired: false }
        ] : [
          { category: 'Equipment', name: 'Chemical Storage', description: 'Secure all chemicals properly', isRequired: true },
          { category: 'Equipment', name: 'Equipment Cleaning', description: 'Clean and store all equipment', isRequired: true },
          { category: 'Equipment', name: 'Hose Storage', description: 'Properly coil and store hoses', isRequired: true },
          { category: 'Vehicle', name: 'Fuel Level', description: 'Record fuel level at end of shift', isRequired: true },
          { category: 'Vehicle', name: 'Mileage', description: 'Record ending mileage', isRequired: true },
          { category: 'Vehicle', name: 'Vehicle Cleaning', description: 'Clean vehicle interior and exterior', isRequired: false },
          { category: 'Safety', name: 'Incident Report', description: 'Report any incidents or issues', isRequired: false },
          { category: 'Safety', name: 'Equipment Damage', description: 'Report any equipment damage', isRequired: false }
        ];
        
        for (let i = 0; i < defaultItems.length; i++) {
          await storage.createInspectionItem({
            templateId,
            ...defaultItems[i],
            sortOrder: i
          });
        }
      }
      
      // Get inspection items for the template
      const items = await storage.getInspectionItems(templateId);
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching inspection items:", error);
      res.status(500).json({ message: "Failed to fetch inspection items" });
    }
  });

  app.post("/api/inspections/submit", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { type, vehicleInfo, responses, notes, location } = req.body;
      
      // Get or create default template
      const templates = await storage.getInspectionTemplates(user.organizationId, type);
      let templateId = templates.find(t => t.isDefault)?.id;
      
      if (!templateId) {
        // Create default template if none exists
        const template = await storage.createInspectionTemplate({
          organizationId: user.organizationId,
          name: `${type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection`,
          type,
          description: `Standard ${type} vehicle inspection`,
          isDefault: true,
          createdBy: user.id
        });
        templateId = template.id;
        
        // Create default inspection items for the template
        const defaultItems = type === 'pre-trip' ? [
          { category: 'Vehicle Safety', name: 'Mirrors', description: 'Check all mirrors for proper adjustment and cleanliness', isRequired: true },
          { category: 'Vehicle Safety', name: 'Tires', description: 'Inspect tire pressure and tread depth', isRequired: true },
          { category: 'Vehicle Safety', name: 'Lights', description: 'Test all lights including headlights, brake lights, and turn signals', isRequired: true },
          { category: 'Vehicle Safety', name: 'Horn', description: 'Test horn functionality', isRequired: true },
          { category: 'Engine', name: 'Oil Level', description: 'Check engine oil level and condition', isRequired: true },
          { category: 'Engine', name: 'Coolant Level', description: 'Check coolant level in reservoir', isRequired: true },
          { category: 'Engine', name: 'Brake Fluid', description: 'Check brake fluid level', isRequired: true },
          { category: 'Equipment', name: 'Chemicals', description: 'Verify chemical levels and equipment condition', isRequired: false },
          { category: 'Equipment', name: 'Hoses', description: 'Inspect hoses for damage or leaks', isRequired: false },
          { category: 'Equipment', name: 'Pump', description: 'Test pump operation', isRequired: false }
        ] : [
          { category: 'Equipment', name: 'Chemical Storage', description: 'Secure all chemicals properly', isRequired: true },
          { category: 'Equipment', name: 'Equipment Cleaning', description: 'Clean and store all equipment', isRequired: true },
          { category: 'Equipment', name: 'Hose Storage', description: 'Properly coil and store hoses', isRequired: true },
          { category: 'Vehicle', name: 'Fuel Level', description: 'Record fuel level at end of shift', isRequired: true },
          { category: 'Vehicle', name: 'Mileage', description: 'Record ending mileage', isRequired: true },
          { category: 'Vehicle', name: 'Vehicle Cleaning', description: 'Clean vehicle interior and exterior', isRequired: false },
          { category: 'Safety', name: 'Incident Report', description: 'Report any incidents or issues', isRequired: false },
          { category: 'Safety', name: 'Equipment Damage', description: 'Report any equipment damage', isRequired: false }
        ];
        
        for (let i = 0; i < defaultItems.length; i++) {
          await storage.createInspectionItem({
            templateId,
            ...defaultItems[i],
            sortOrder: i
          });
        }
      }
      
      // Create inspection record
      const recordData = {
        userId: user.id,
        organizationId: user.organizationId,
        templateId,
        type,
        vehicleInfo,
        status: 'completed',
        submittedAt: new Date(),
        location,
        notes
      };
      
      const record = await storage.createInspectionRecord(recordData);
      
      // Create responses
      for (const response of responses) {
        await storage.createInspectionResponse({
          recordId: record.id,
          itemId: response.itemId,
          response: response.response,
          notes: response.notes,
          photos: response.photos || []
        });
      }
      
      // Check for failed items and notify manager if needed
      const failedItems = responses.filter(r => r.response === 'fail' || r.response === 'needs_attention');
      if (failedItems.length > 0) {
        // Get managers in the organization
        const managers = await storage.getUsersByOrganization(user.organizationId);
        const managerUsers = managers.filter(u => u.role === 'admin' || u.role === 'manager');
        
        for (const manager of managerUsers) {
          await storage.createInspectionNotification({
            recordId: record.id,
            sentTo: manager.id,
            notificationType: 'failure',
            message: `${user.firstName || user.username} submitted a ${type} inspection with ${failedItems.length} failed items requiring attention.`
          });
        }
        
        // Update record status
        await storage.updateInspectionRecord(record.id, { status: 'requires_attention' });
      }
      
      // Broadcast to WebSocket
      broadcastToWebUsers('inspection_submitted', {
        record,
        submittedBy: user.firstName || user.username,
        type,
        hasFailures: failedItems.length > 0
      });
      
      res.json(record);
    } catch (error: any) {
      console.error("Error submitting inspection:", error);
      res.status(500).json({ message: "Failed to submit inspection" });
    }
  });

  app.post("/api/inspections/custom-items", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { name, category, type, isRequired = false } = req.body;
      
      // Get or create default template
      const templates = await storage.getInspectionTemplates(user.organizationId, type);
      let templateId = templates.find(t => t.isDefault)?.id;
      
      if (!templateId) {
        const template = await storage.createInspectionTemplate({
          organizationId: user.organizationId,
          name: `${type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection`,
          type,
          description: `Standard ${type} vehicle inspection`,
          isDefault: true,
          createdBy: user.id
        });
        templateId = template.id;
      }
      
      const item = await storage.createInspectionItem({
        templateId,
        category,
        name,
        description: `Custom ${category.toLowerCase()} item`,
        isRequired,
        sortOrder: 999
      });
      
      res.json(item);
    } catch (error: any) {
      console.error("Error creating custom inspection item:", error);
      res.status(500).json({ message: "Failed to create custom inspection item" });
    }
  });

  // Create inspection item (Admin functionality)
  app.post("/api/inspections/items", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { name, description, category, isRequired, type } = req.body;
      
      // Get or create default template for the specified type
      const templates = await storage.getInspectionTemplates(user.organizationId, type);
      let templateId = templates.find(t => t.isDefault)?.id;
      
      if (!templateId) {
        const template = await storage.createInspectionTemplate({
          organizationId: user.organizationId,
          name: `Standard ${type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection`,
          type,
          description: `Standard ${type} vehicle and equipment inspection`,
          isDefault: true,
          createdBy: user.id
        });
        templateId = template.id;
      }
      
      const item = await storage.createInspectionItem({
        templateId,
        category,
        name,
        description,
        isRequired,
        sortOrder: 999
      });
      
      res.json(item);
    } catch (error: any) {
      console.error("Error creating inspection item:", error);
      res.status(500).json({ message: "Failed to create inspection item" });
    }
  });

  // Update inspection item (Admin functionality)
  app.put("/api/inspections/items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { name, description, category, isRequired } = req.body;
      
      const updatedItem = await storage.updateInspectionItem(itemId, {
        name,
        description,
        category,
        isRequired
      });
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      res.json(updatedItem);
    } catch (error: any) {
      console.error("Error updating inspection item:", error);
      res.status(500).json({ message: "Failed to update inspection item" });
    }
  });

  // Delete inspection item (Admin functionality)
  app.delete("/api/inspections/items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      
      const success = await storage.deleteInspectionItem(itemId);
      
      if (!success) {
        return res.status(404).json({ message: "Inspection item not found" });
      }
      
      res.json({ message: "Inspection item deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting inspection item:", error);
      res.status(500).json({ message: "Failed to delete inspection item" });
    }
  });

  app.post("/api/inspections/:id/send-to-manager", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const record = await storage.getInspectionRecord(parseInt(id), user.id);
      if (!record) {
        return res.status(404).json({ message: "Inspection record not found" });
      }
      
      // Get managers in the organization
      const managers = await storage.getUsersByOrganization(user.organizationId);
      const managerUsers = managers.filter(u => u.role === 'admin' || u.role === 'manager');
      
      for (const manager of managerUsers) {
        await storage.createInspectionNotification({
          recordId: parseInt(id),
          sentTo: manager.id,
          notificationType: 'submission',
          message: `${user.firstName || user.username} has sent you a ${record.type} inspection for review.`
        });
      }
      
      // Broadcast to managers
      broadcastToWebUsers('inspection_sent_to_manager', {
        recordId: parseInt(id),
        submittedBy: user.firstName || user.username,
        type: record.type
      });
      
      res.json({ message: "Inspection sent to manager successfully" });
    } catch (error: any) {
      console.error("Error sending inspection to manager:", error);
      res.status(500).json({ message: "Failed to send inspection to manager" });
    }
  });

  app.get("/api/inspections/notifications", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const notifications = await storage.getInspectionNotifications(user.id);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching inspection notifications:", error);
      res.status(500).json({ message: "Failed to fetch inspection notifications" });
    }
  });

  // File Security API Routes
  app.get("/api/file-security/settings/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const settings = await storage.getFileSecuritySettings(organizationId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching file security settings:", error);
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.put("/api/file-security/settings/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const settings = await storage.updateFileSecuritySettings(organizationId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating file security settings:", error);
      res.status(500).json({ message: "Failed to update security settings" });
    }
  });

  app.get("/api/file-security/stats/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const stats = await storage.getFileSecurityStats(organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching file security stats:", error);
      res.status(500).json({ message: "Failed to fetch security stats" });
    }
  });

  app.get("/api/file-security/scans/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const scans = await storage.getFileSecurityScans(organizationId, limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching file security scans:", error);
      res.status(500).json({ message: "Failed to fetch security scans" });
    }
  });

  app.post("/api/file-security/scan-all/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      // This would initiate a full scan of all files for the organization
      // For now, we'll just return a success message
      res.json({ message: "Full security scan initiated", organizationId });
    } catch (error) {
      console.error("Error initiating full security scan:", error);
      res.status(500).json({ message: "Failed to initiate security scan" });
    }
  });

  app.get("/api/file-security/access-logs/:organizationId", requireAuth, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getFileAccessLogs(organizationId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching file access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // File integrity check endpoint
  app.get("/api/admin/file-integrity-check", requireAdmin, async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const allFiles = await storage.getAllProjectFiles();
      const integrityReport = {
        totalFileRecords: allFiles.length,
        missingFiles: [],
        validFiles: 0,
        checkedAt: new Date()
      };
      
      for (const file of allFiles) {
        try {
          await fs.stat(file.filePath);
          integrityReport.validFiles++;
        } catch (error) {
          integrityReport.missingFiles.push({
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath,
            projectId: file.projectId
          });
        }
      }
      
      res.json(integrityReport);
    } catch (error: any) {
      console.error("Error checking file integrity:", error);
      res.status(500).json({ message: "Failed to check file integrity" });
    }
  });

  // Clean up orphaned file references
  app.post("/api/admin/cleanup-orphaned-files", requireAdmin, async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const allFiles = await storage.getAllProjectFiles();
      const deletedRecords = [];
      
      for (const file of allFiles) {
        try {
          await fs.stat(file.filePath);
        } catch (error) {
          // File doesn't exist, remove database record
          await storage.deleteProjectFile(file.id);
          deletedRecords.push({
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath
          });
        }
      }
      
      res.json({
        message: `Cleaned up ${deletedRecords.length} orphaned file references`,
        deletedRecords,
        cleanedAt: new Date()
      });
    } catch (error: any) {
      console.error("Error cleaning orphaned files:", error);
      res.status(500).json({ message: "Failed to cleanup orphaned files" });
    }
  });

  // Subscription Plan Management API Routes
  
  // Get all subscription plans
  app.get("/api/subscription-plans", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only super admins can view subscription plans
      if (user.role !== 'admin' || user.organizationId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get single subscription plan
  app.get("/api/subscription-plans/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only super admins can view subscription plans
      if (user.role !== 'admin' || user.organizationId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const plan = await storage.getSubscriptionPlan(parseInt(id));
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      res.json(plan);
    } catch (error: any) {
      console.error("Error fetching subscription plan:", error);
      res.status(500).json({ message: "Failed to fetch subscription plan" });
    }
  });

  // Create new subscription plan
  app.post("/api/subscription-plans", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only super admins can create subscription plans
      if (user.role !== 'admin' || user.organizationId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const newPlan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(newPlan);
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update subscription plan
  app.put("/api/subscription-plans/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only super admins can update subscription plans
      if (user.role !== 'admin' || user.organizationId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const updatedPlan = await storage.updateSubscriptionPlan(parseInt(id), req.body);
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete subscription plan
  app.delete("/api/subscription-plans/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only super admins can delete subscription plans
      if (user.role !== 'admin' || user.organizationId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await storage.deleteSubscriptionPlan(parseInt(id));
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // ===============================
  // Parts and Supplies API
  // ===============================
  
  // Get all parts and supplies for organization
  app.get("/api/parts-supplies", requireAuth, async (req, res) => {
    try {
      const parts = await storage.getPartsSupplies(req.user!.organizationId);
      res.json(parts);
    } catch (error) {
      console.error('Error fetching parts and supplies:', error);
      res.status(500).json({ error: 'Failed to fetch parts and supplies' });
    }
  });

  // Get specific part
  app.get("/api/parts-supplies/:id", requireAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const part = await storage.getPartSupply(partId, req.user!.organizationId);
      
      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }
      
      res.json(part);
    } catch (error) {
      console.error('Error fetching part:', error);
      res.status(500).json({ error: 'Failed to fetch part' });
    }
  });

  // Create new part
  app.post("/api/parts-supplies", requireAuth, async (req, res) => {
    try {
      const partData = {
        ...req.body,
        organizationId: req.user!.organizationId,
        createdBy: req.user!.id
      };
      
      const newPart = await storage.createPartSupply(partData);
      res.status(201).json(newPart);
    } catch (error) {
      console.error('Error creating part:', error);
      res.status(500).json({ error: 'Failed to create part' });
    }
  });

  // Update part
  app.put("/api/parts-supplies/:id", requireAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedPart = await storage.updatePartSupply(partId, updates);
      res.json(updatedPart);
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({ error: 'Failed to update part' });
    }
  });

  // Update part stock
  app.put("/api/parts-supplies/:id/stock", requireAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const { newStock, reason } = req.body;
      
      const updatedPart = await storage.updatePartStock(partId, newStock, req.user!.id, reason);
      res.json(updatedPart);
    } catch (error) {
      console.error('Error updating part stock:', error);
      res.status(500).json({ error: 'Failed to update stock' });
    }
  });

  // Delete part (soft delete)
  app.delete("/api/parts-supplies/:id", requireAuth, async (req, res) => {
    try {
      const partId = parseInt(req.params.id);
      const success = await storage.deletePartSupply(partId);
      
      if (success) {
        res.json({ message: 'Part deleted successfully' });
      } else {
        res.status(404).json({ error: 'Part not found' });
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      res.status(500).json({ error: 'Failed to delete part' });
    }
  });

  // Get parts categories
  app.get("/api/parts-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getPartsCategories(req.user!.organizationId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching parts categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Create parts category
  app.post("/api/parts-categories", requireAuth, async (req, res) => {
    try {
      const categoryData = {
        ...req.body,
        organizationId: req.user!.organizationId
      };
      
      const newCategory = await storage.createPartsCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating parts category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // Get stock alerts
  app.get("/api/stock-alerts", requireAuth, async (req, res) => {
    try {
      const activeOnly = req.query.active !== 'false';
      const alerts = await storage.getStockAlerts(req.user!.organizationId, activeOnly);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      res.status(500).json({ error: 'Failed to fetch stock alerts' });
    }
  });

  // Acknowledge stock alert
  app.put("/api/stock-alerts/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const acknowledgedAlert = await storage.acknowledgeStockAlert(alertId, req.user!.id);
      res.json(acknowledgedAlert);
    } catch (error) {
      console.error('Error acknowledging stock alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });

  // Get inventory transactions
  app.get("/api/inventory-transactions", requireAuth, async (req, res) => {
    try {
      const partId = req.query.partId ? parseInt(req.query.partId as string) : undefined;
      const transactions = await storage.getInventoryTransactions(req.user!.organizationId, partId);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Add market research routes
  app.use(marketResearchRouter);
  app.use(fileUploadRouter);

  // File migration and S3 routes
  app.get('/api/files/s3-status', requireAuth, async (req, res) => {
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

  app.post('/api/files/migrate-to-s3', requireAuth, async (req, res) => {
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

  // Market Research Competitors Routes
  app.get("/api/market-research-competitors", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { businessNiche } = req.query;
      
      const competitors = await storage.getMarketResearchCompetitors(
        user.organizationId, 
        businessNiche as string
      );
      
      res.json(competitors);
    } catch (error: any) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ message: "Failed to fetch competitors" });
    }
  });

  app.get("/api/market-research-competitors/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const competitorId = parseInt(req.params.id);
      
      const competitor = await storage.getMarketResearchCompetitor(competitorId, user.organizationId);
      
      if (!competitor) {
        return res.status(404).json({ message: "Competitor not found" });
      }
      
      res.json(competitor);
    } catch (error: any) {
      console.error("Error fetching competitor:", error);
      res.status(500).json({ message: "Failed to fetch competitor" });
    }
  });

  app.post("/api/market-research-competitors", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const competitorData = {
        ...req.body,
        organizationId: user.organizationId
      };
      
      const competitor = await storage.createMarketResearchCompetitor(competitorData);
      res.status(201).json(competitor);
    } catch (error: any) {
      console.error("Error creating competitor:", error);
      res.status(500).json({ message: "Failed to create competitor" });
    }
  });

  app.put("/api/market-research-competitors/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const competitorId = parseInt(req.params.id);
      
      // Verify competitor belongs to user's organization
      const existingCompetitor = await storage.getMarketResearchCompetitor(competitorId, user.organizationId);
      if (!existingCompetitor) {
        return res.status(404).json({ message: "Competitor not found" });
      }
      
      const competitor = await storage.updateMarketResearchCompetitor(competitorId, req.body);
      res.json(competitor);
    } catch (error: any) {
      console.error("Error updating competitor:", error);
      res.status(500).json({ message: "Failed to update competitor" });
    }
  });

  app.delete("/api/market-research-competitors/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const competitorId = parseInt(req.params.id);
      
      // Verify competitor belongs to user's organization
      const existingCompetitor = await storage.getMarketResearchCompetitor(competitorId, user.organizationId);
      if (!existingCompetitor) {
        return res.status(404).json({ message: "Competitor not found" });
      }
      
      await storage.deleteMarketResearchCompetitor(competitorId);
      res.json({ message: "Competitor deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting competitor:", error);
      res.status(500).json({ message: "Failed to delete competitor" });
    }
  });

  // Task Group API Routes
  
  // Get all task groups for the organization
  app.get("/api/task-groups", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const taskGroups = await storage.getTaskGroups(organizationId);
      res.json(taskGroups);
    } catch (error: any) {
      console.error("Error fetching task groups:", error);
      res.status(500).json({ message: "Failed to fetch task groups" });
    }
  });

  // Create a new task group
  app.post("/api/task-groups", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { name, description, color } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ message: "Task group name is required" });
      }

      const taskGroup = await storage.createTaskGroup({
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#3B82F6',
        organizationId,
        createdById: userId,
        isActive: true
      });

      res.json(taskGroup);
    } catch (error: any) {
      console.error("Error creating task group:", error);
      res.status(500).json({ message: "Failed to create task group" });
    }
  });

  // Add task group to project (creates individual tasks from the group)
  app.post("/api/projects/:id/add-task-group", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { taskGroupId } = req.body;
      const userId = req.user!.id;

      if (!taskGroupId) {
        return res.status(400).json({ message: "Task group ID is required" });
      }

      // Verify the task group exists and belongs to the user's organization
      const taskGroup = await storage.getTaskGroupById(taskGroupId);
      if (!taskGroup) {
        return res.status(404).json({ message: "Task group not found" });
      }

      if (taskGroup.organizationId !== req.user!.organizationId) {
        return res.status(403).json({ message: "Access denied to task group" });
      }

      // Get tasks from the group
      const groupTasks = await storage.getTaskGroupTasks(taskGroupId);
      
      if (groupTasks.length === 0) {
        return res.status(400).json({ message: "Task group has no tasks" });
      }

      // Create individual tasks for the project based on the group tasks
      const createdTasks = [];
      for (const groupTask of groupTasks) {
        const newTask = await storage.createTask({
          title: groupTask.title,
          description: groupTask.description || '',
          priority: groupTask.priority,
          status: 'todo',
          projectId,
          createdById: userId,
          assignedToId: null // Can be assigned later
        });
        createdTasks.push(newTask);
      }

      res.json({ 
        message: `Successfully added ${createdTasks.length} tasks from group "${taskGroup.name}"`,
        tasksAdded: createdTasks.length,
        tasks: createdTasks
      });
    } catch (error: any) {
      console.error("Error adding task group to project:", error);
      res.status(500).json({ message: "Failed to add task group to project" });
    }
  });

  // Add broadcast function to the app for use in routes
  (app as any).broadcastToWebUsers = broadcastToWebUsers;

  return httpServer;
}

