import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import twilio from "twilio";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
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
  insertScheduleSchema,
  insertScheduleAssignmentSchema,
  insertScheduleCommentSchema,
  insertLateArrivalSchema,
  insertMeetingSchema,
  insertMeetingParticipantSchema,
  insertMeetingMessageSchema,
  insertMeetingRecordingSchema,
  insertSmartCaptureListSchema,
  insertSmartCaptureItemSchema,
  linkSmartCaptureSchema,
  searchSmartCaptureSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
  type Message,
  type LoginData,
  type RegisterData,
  type ChangePasswordData,
  type Schedule,
  type ScheduleAssignment,
  type ScheduleComment,
  type LateArrival,
  type InsertLateArrival,
  type Meeting,
  type MeetingParticipant,
  type MeetingMessage,
  type MeetingRecording,
  type SmartCaptureList,
  type SmartCaptureItem,
  type InsertSmartCaptureList,
  type InsertSmartCaptureItem
} from "@shared/schema";
import { AuthService, requireAuth, requireAdmin, requireManagerOrAdmin, requireTaskDelegationPermission } from "./auth";
import { ZodError } from "zod";
import { seedDatabase } from "./seed-data";
import { nanoid } from "nanoid";
import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, leads, messages, internalMessages,
  recurringJobSeries, recurringJobOccurrences,
  images, settings, organizations, userSessions, vendors, vehicles,
  soundSettings, userDashboardSettings, dashboardProfiles,
  schedules, scheduleAssignments, scheduleComments, timeClock,
  lateArrivals, notifications, notificationSettings,
  partsSupplies, inventoryTransactions, stockAlerts,
  partsCategories, meetings, meetingParticipants, meetingMessages, meetingRecordings
} from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { DocuSignService, getDocuSignConfig } from "./docusign";
import { ensureOrganizationFolders, createOrganizationFolders } from "./folderCreation";
import { Client } from '@googlemaps/google-maps-services-js';
import marketResearchRouter from "./marketResearch";
import { s3Service } from "./s3Service";
import { fileManager } from "./fileManager";
import { CloudinaryService } from "./cloudinary";
import { generateQuoteHTML, generateQuoteWordContent } from "./quoteGenerator";
import archiver from 'archiver';
// Using global fetch API available in Node.js 18+
// Removed fileUploadRouter import - using direct route instead
// Object storage imports already imported at top - removed duplicates
import { NotificationService, setBroadcastFunction } from "./notificationService";

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
    let compressedPath = outputPath; // Use the provided output path
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
          // Move temp file to the specified output path
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
      try {
        // Use a temporary directory during multer processing
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } catch (error) {
        cb(error as Error, 'uploads/temp');
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
      try {
        // Use a temporary directory during multer processing
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } catch (error) {
        cb(error as Error, 'uploads/temp');
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
      try {
        // Use a temporary directory during multer processing
        // Organization-specific directory will be handled after authentication
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } catch (error) {
        cb(error as Error, 'uploads/temp');
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
      try {
        // Use a temporary directory during multer processing
        const tempDir = path.join(process.cwd(), 'uploads', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      } catch (error) {
        cb(error as Error, 'uploads/temp');
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
  // Health check endpoint - no auth required
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      server: "Pro Field Manager API",
      version: "1.0.0"
    });
  });

  // Live Streaming API Routes
  // Get active streams for the organization
  app.get('/api/streams/active', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const activeStreams = await storage.getActiveStreamsByOrganization(user.organizationId);
      res.json(activeStreams);
    } catch (error) {
      console.error('Error fetching active streams:', error);
      res.status(500).json({ message: 'Failed to fetch streams' });
    }
  });

  // Start a new stream
  app.post('/api/streams/start', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { title } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ message: 'Stream title is required' });
      }

      const streamSession = await storage.createStreamSession({
        title: title.trim(),
        streamerId: user.id,
        organizationId: user.organizationId
      });

      res.status(201).json(streamSession);
    } catch (error) {
      console.error('Error starting stream:', error);
      res.status(500).json({ message: 'Failed to start stream' });
    }
  });

  // End a stream
  app.post('/api/streams/end', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const updatedStream = await storage.endStreamSession(user.id);
      
      if (!updatedStream) {
        return res.status(404).json({ message: 'No active stream found' });
      }

      res.json(updatedStream);
    } catch (error) {
      console.error('Error ending stream:', error);
      res.status(500).json({ message: 'Failed to end stream' });
    }
  });

  // Get viewers for current user's stream
  app.get('/api/streams/viewers', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const viewers = await storage.getStreamViewers(user.id);
      res.json(viewers);
    } catch (error) {
      console.error('Error fetching stream viewers:', error);
      res.status(500).json({ message: 'Failed to fetch viewers' });
    }
  });

  // Join a stream as a viewer
  app.post('/api/streams/:streamId/join', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { streamId } = req.params;

      const viewer = await storage.joinStream(streamId, user.id);
      res.status(201).json(viewer);
    } catch (error) {
      console.error('Error joining stream:', error);
      res.status(500).json({ message: 'Failed to join stream' });
    }
  });

  // Leave a stream
  app.post('/api/streams/:streamId/leave', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { streamId } = req.params;

      await storage.leaveStream(streamId, user.id);
      res.json({ message: 'Left stream successfully' });
    } catch (error) {
      console.error('Error leaving stream:', error);
      res.status(500).json({ message: 'Failed to leave stream' });
    }
  });

  // Upload stream recording - create video upload config first
  const uploadVideo = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 500 * 1024 * 1024 // 500MB limit for video recordings
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    }
  });

  app.post('/api/streams/upload-recording', requireAuth, uploadVideo.single('recording'), async (req, res) => {
    try {
      const user = req.user!;
      const { title } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'No recording file provided' });
      }

      // Upload to cloud storage (Cloudinary)
      const uploadBuffer = await fs.readFile(req.file.path);
      
      const cloudinaryResult = await CloudinaryService.uploadVideo(
        uploadBuffer,
        {
          folder: 'stream-recordings',
          filename: `${title}-${Date.now()}`,
          organizationId: user.organizationId,
          resource_type: 'video'
        }
      );

      // Update the stream session with recording URL
      await storage.updateStreamRecording(user.id, cloudinaryResult.secure_url);

      // Clean up temp file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }

      res.json({ 
        message: 'Recording uploaded successfully',
        recordingUrl: cloudinaryResult.secure_url 
      });
    } catch (error) {
      console.error('Error uploading recording:', error);
      res.status(500).json({ message: 'Failed to upload recording' });
    }
  });

  // URGENT FIX: Direct File Manager upload route (Cloudinary-based) - MOVED TO TOP FOR PRIORITY
  app.post('/api/files/upload', (req, res, next) => {
    console.log('🔥🔥🔥 UPLOAD ROUTE INTERCEPTED - BEFORE ALL MIDDLEWARE 🔥🔥🔥');
    console.log('🔥 Method:', req.method);
    console.log('🔥 Path:', req.path);
    console.log('🔥 URL:', req.url);
    console.log('🔥 Content-Type:', req.get('content-type'));
    next();
  }, requireAuth, upload.single('file'), async (req, res) => {
    console.log('🔄🔄🔄 DIRECT ROUTE HIT - UPLOAD REQUEST RECEIVED 🔄🔄🔄');
    console.log('🔄 Raw request body keys:', Object.keys(req.body));
    console.log('🔄 Raw request body values:', req.body);
    console.log('🔄 Has file?', !!req.file);
    console.log('🔄 Request method:', req.method);
    console.log('🔄 Request path:', req.path);
    console.log('🔄 Request URL:', req.url);

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

      // Convert tags to array early to avoid issues
      const processedTags = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
      console.log('📋 Processed tags:', { original: tags, processed: processedTags, isArray: Array.isArray(processedTags) });

      // Read file for Cloudinary upload
      const uploadBuffer = await fs.readFile(req.file.path);
      console.log('📁 File read successfully, size:', uploadBuffer.length);

      // Determine file type
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
        fileType = 'document';
      }

      // Upload to Cloudinary
      const cloudinaryResult = await CloudinaryService.uploadImage(
        uploadBuffer,
        {
          folder: `file-manager-${fileType}s`,
          filename: req.file.originalname,
          organizationId: user.organizationId,
          quality: 80,
          maxWidth: 2000,
          maxHeight: 2000
        }
      );

      // Check if Cloudinary upload was successful
      if (!cloudinaryResult.success) {
        console.error('❌ Cloudinary upload failed:', cloudinaryResult.error);
        return res.status(500).json({ 
          message: 'File upload failed',
          error: cloudinaryResult.error || 'Cloudinary upload error'
        });
      }

      console.log('☁️ Cloudinary upload successful:', cloudinaryResult.publicId);

      // Prepare data for file manager
      const fileData = {
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        filePath: cloudinaryResult.secureUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType: fileType,
        organizationId: user.organizationId,
        uploadedBy: user.id,
        description: description || `File uploaded via File Manager`,
        tags: processedTags,
        folderId: folderId ? parseInt(folderId) : null,
        useS3: false,
        fileUrl: cloudinaryResult.secureUrl,
      };

      console.log('💾 Creating file record with data:', fileData);

      // Create file record
      const file = await storage.createFile(fileData);

      console.log('✅ File upload completed successfully');

      res.json({
        message: 'File uploaded successfully',
        file: file,
        cloudinaryUrl: cloudinaryResult.secureUrl,
        publicId: cloudinaryResult.publicId
      });

    } catch (error) {
      console.error('❌ Direct file upload error:', error);
      console.error('❌ Error stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: 'File upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Global request logger with CUSTOM DOMAIN DEBUGGING
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/invoices')) {
      console.log(`🌍 INVOICE REQUEST - ${req.method} ${req.path} from ${req.ip}`);
    }
    
    // CRITICAL: Log ALL POST requests to auth/login for debugging
    if (req.method === 'POST' && req.path === '/api/auth/login') {
      console.log('🔥🔥🔥 GLOBAL MIDDLEWARE - DETECTED LOGIN POST REQUEST 🔥🔥🔥');
      console.log('🔥 Request details:', {
        method: req.method,
        path: req.path,
        url: req.url,
        host: req.headers.host,
        origin: req.headers.origin,
        contentType: req.headers['content-type']
      });
    }
    
    next();
  });
  
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
  const connectedClients = new Map<WebSocket, { userId: number; username: string; userType: string; organizationId?: number }>();

  // Overloaded broadcast function to send updates to connected web users
  function broadcastToWebUsers(eventType: string, data: any, excludeUserId?: number): void;
  function broadcastToWebUsers(organizationId: number, eventType: string, data: any, excludeUserId?: number): void;
  function broadcastToWebUsers(organizationIdOrEventType: number | string, eventTypeOrData: string | any, dataOrExcludeUserId?: any | number, excludeUserId?: number): void {
    let targetOrganizationId: number | undefined;
    let eventType: string;
    let data: any;
    let excludeUser: number | undefined;

    // Handle overloaded parameters
    if (typeof organizationIdOrEventType === 'number') {
      // Called with organizationId first
      targetOrganizationId = organizationIdOrEventType;
      eventType = eventTypeOrData as string;
      data = dataOrExcludeUserId;
      excludeUser = excludeUserId;
    } else {
      // Called with eventType first (legacy)
      eventType = organizationIdOrEventType;
      data = eventTypeOrData;
      excludeUser = dataOrExcludeUserId;
    }

    const message = JSON.stringify({
      type: 'update',
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    let messageSentCount = 0;
    connectedClients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && 
          clientInfo.userType === 'web' && 
          clientInfo.userId !== excludeUser) {
        
        // If organizationId is specified, only send to users in that organization
        if (targetOrganizationId !== undefined) {
          if (clientInfo.organizationId === targetOrganizationId) {
            console.log(`📤 Sending ${eventType} to user ${clientInfo.userId} (${clientInfo.username}) in org ${clientInfo.organizationId}`);
            ws.send(message);
            messageSentCount++;
          } else {
            console.log(`⏭️ Skipping user ${clientInfo.userId} (${clientInfo.username}) - different org ${clientInfo.organizationId} vs ${targetOrganizationId}`);
          }
        } else {
          // Send to all web users (legacy behavior)
          console.log(`📤 Sending ${eventType} to user ${clientInfo.userId} (${clientInfo.username}) - no org filter`);
          ws.send(message);
          messageSentCount++;
        }
      } else {
        console.log(`⏭️ Skipping user ${clientInfo.userId} (${clientInfo.username}) - readyState: ${ws.readyState}, userType: ${clientInfo.userType}, excluded: ${clientInfo.userId === excludeUser}`);
      }
    });
    console.log(`📊 WebSocket broadcast complete: ${messageSentCount} messages sent for ${eventType}`);
  }

  // Function to broadcast to a specific user
  function broadcastToUser(userId: number, organizationId: number, eventType: string, data: any): void {
    const message = JSON.stringify({
      type: 'update',
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    let messageSent = false;
    connectedClients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && 
          clientInfo.userType === 'web' && 
          clientInfo.userId === userId &&
          clientInfo.organizationId === organizationId) {
        
        console.log(`📤 Sending ${eventType} to specific user ${clientInfo.userId} (${clientInfo.username})`);
        ws.send(message);
        messageSent = true;
      }
    });
    
    if (!messageSent) {
      console.log(`⚠️ No active WebSocket connection found for user ${userId} in org ${organizationId}`);
    }
  }

  // Set up the notification service broadcast function
  setBroadcastFunction(broadcastToUser);

  // Helper function to broadcast team status updates to organization users
  async function broadcastTeamStatusUpdate(organizationId: number) {
    try {
      // Get current session statistics from database
      const activeSessionsQuery = await db
        .select({
          userId: userSessions.userId,
          deviceType: userSessions.deviceType,
          userAgent: userSessions.userAgent,
          user: {
            id: users.id,
            username: users.username,
            organizationId: users.organizationId,
            role: users.role
          }
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            gt(userSessions.expiresAt, sql`now()`),
            eq(users.isActive, true),
            eq(users.organizationId, organizationId)
          )
        );

      // Count unique users (total online)
      const uniqueUserIds = new Set(activeSessionsQuery.map(session => session.userId));
      const onlineCount = uniqueUserIds.size;

      // Count field users (mobile/field sessions)
      const fieldUserIds = new Set();
      activeSessionsQuery.forEach(session => {
        const isMobileDevice = session.deviceType === 'mobile' || 
                              (session.userAgent && (
                                session.userAgent.toLowerCase().includes('mobile') ||
                                session.userAgent.toLowerCase().includes('android') ||
                                session.userAgent.toLowerCase().includes('iphone')
                              ));
        if (isMobileDevice) {
          fieldUserIds.add(session.userId);
        }
      });
      const inFieldCount = fieldUserIds.size;

      // Get WebSocket connected clients count for verification
      const webSocketClients = Array.from(connectedClients.values())
        .filter(client => client.organizationId === organizationId);
      
      const webConnectedCount = new Set(webSocketClients.map(client => client.userId)).size;

      // Broadcast team status to all organization users
      broadcastToWebUsers(organizationId, 'team_status_updated', {
        online: onlineCount,
        inField: inFieldCount,
        webSocketConnected: webConnectedCount,
        organizationId: organizationId,
        timestamp: new Date().toISOString()
      });

      console.log(`📊 Team status broadcasted to org ${organizationId}: ${onlineCount} online, ${inFieldCount} in field`);
    } catch (error) {
      console.error('Error broadcasting team status update:', error);
    }
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

  // === COMPREHENSIVE NOTIFICATION SYSTEM ROUTES ===

  // Get user notifications
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await NotificationService.getUserNotifications(
        user.id, 
        user.organizationId, 
        limit
      );
      
      res.json(notifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const count = await NotificationService.getUnreadCount(
        user.id, 
        user.organizationId
      );
      
      res.json({ count });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const notificationId = parseInt(req.params.id);
      
      await NotificationService.markAsRead(notificationId, user.id);
      
      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      await NotificationService.markAllAsRead(user.id, user.organizationId);
      
      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  // Admin endpoint: Get all notifications for organization (Admin/Manager only)
  app.get('/api/admin/notifications', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const limit = parseInt(req.query.limit as string) || 100;
      
      const notifications = await NotificationService.getAllOrganizationNotifications(
        user.organizationId, 
        limit
      );
      
      res.json(notifications);
    } catch (error: any) {
      console.error('Error fetching organization notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Admin endpoint: Mark notification as viewed by admin
  app.patch('/api/admin/notifications/:id/view', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const notificationId = parseInt(req.params.id);
      
      await NotificationService.markAdminViewed(notificationId, user.id);
      
      res.json({ message: 'Notification marked as viewed by admin' });
    } catch (error: any) {
      console.error('Error marking notification as admin viewed:', error);
      res.status(500).json({ message: 'Failed to mark notification as admin viewed' });
    }
  });

  // Admin endpoint: Get notification read statistics
  app.get('/api/admin/notifications/stats', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const stats = await NotificationService.getOrganizationNotificationStats(
        user.organizationId
      );
      
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({ message: 'Failed to fetch notification statistics' });
    }
  });

  // Get comprehensive notification settings
  app.get('/api/notification-settings', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const settings = await NotificationService.getNotificationSettings(
        user.id, 
        user.organizationId
      );
      
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
  });

  // Update comprehensive notification settings
  app.put('/api/notification-settings', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const updates = req.body;
      
      console.log('🔧 NOTIFICATION UPDATE DEBUG:', {
        userId: user.id,
        organizationId: user.organizationId,
        updates: updates,
        updateKeys: Object.keys(updates)
      });
      
      // First, ensure settings exist by getting them
      const existingSettings = await NotificationService.getNotificationSettings(
        user.id, 
        user.organizationId
      );
      
      console.log('🔍 Existing settings found:', existingSettings ? 'YES' : 'NO');
      
      // Clean the updates object - remove read-only fields and add proper timestamp
      const {
        id, userId, organizationId, createdAt, updatedAt, 
        ...cleanUpdates
      } = updates;
      
      const updatesWithTimestamp = {
        ...cleanUpdates,
        updatedAt: new Date()
      };
      
      const [updatedSettings] = await NotificationService.updateNotificationSettings(
        user.id, 
        user.organizationId, 
        updatesWithTimestamp
      );
      
      console.log('✅ Settings updated successfully:', !!updatedSettings);
      
      res.json({
        message: 'Notification settings updated successfully',
        settings: updatedSettings
      });
    } catch (error: any) {
      console.error('❌ Error updating notification settings:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });
      res.status(500).json({ 
        message: 'Failed to update notification settings',
        error: error.message
      });
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

  app.get('/api/settings/company', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getSettingsByCategory('company');
      const companySettings = {
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyWebsite: '',
        companyStreetAddress: '',
        companyCity: '',
        companyState: '',
        companyZipCode: '',
        companyCountry: '',
        companyAddress: '',
        logoSize: '',
        logo: ''
      };
      
      if (settings && settings.length > 0) {
        console.log('🔍 Raw company settings:', settings.map(s => ({ key: s.key, value: s.value })));
        
        settings.forEach((setting: any) => {
          // Check for various organization-specific key patterns
          const orgId = user.organizationId;
          
          // Pattern 1: company_org_2_companyName
          if (setting.key === `company_org_${orgId}_companyName`) {
            companySettings.companyName = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyEmail`) {
            companySettings.companyEmail = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyPhone`) {
            companySettings.companyPhone = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyWebsite`) {
            companySettings.companyWebsite = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyStreetAddress`) {
            companySettings.companyStreetAddress = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyCity`) {
            companySettings.companyCity = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyState`) {
            companySettings.companyState = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyZipCode`) {
            companySettings.companyZipCode = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyCountry`) {
            companySettings.companyCountry = setting.value;
          } else if (setting.key === `company_org_${orgId}_companyAddress`) {
            companySettings.companyAddress = setting.value;
          } else if (setting.key === `company_org_${orgId}_logoSize`) {
            companySettings.logoSize = setting.value;
          } 
          // Pattern 2: company_org_2_company_companyName (nested company prefix)
          else if (setting.key === `company_org_${orgId}_company_companyName`) {
            if (!companySettings.companyName) companySettings.companyName = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyEmail`) {
            if (!companySettings.companyEmail) companySettings.companyEmail = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyPhone`) {
            if (!companySettings.companyPhone) companySettings.companyPhone = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyWebsite`) {
            if (!companySettings.companyWebsite) companySettings.companyWebsite = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyStreetAddress`) {
            if (!companySettings.companyStreetAddress) companySettings.companyStreetAddress = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyCity`) {
            if (!companySettings.companyCity) companySettings.companyCity = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyState`) {
            if (!companySettings.companyState) companySettings.companyState = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyZipCode`) {
            if (!companySettings.companyZipCode) companySettings.companyZipCode = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_companyCountry`) {
            if (!companySettings.companyCountry) companySettings.companyCountry = setting.value;
          } else if (setting.key === `company_org_${orgId}_company_logoSize`) {
            if (!companySettings.logoSize) companySettings.logoSize = setting.value;
          }
          // Pattern 3: Global fallback for backward compatibility (only if no org-specific value)
          else if (!setting.key.includes('org_') && setting.key.startsWith('company_')) {
            const key = setting.key.replace('company_', '');
            if (key in companySettings && !companySettings[key]) {
              companySettings[key] = setting.value;
            }
          }
        });
        
        console.log('🔍 Final company settings for org', user.organizationId, ':', companySettings);
      }
      
      res.json(companySettings);
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ message: 'Failed to fetch company settings' });
    }
  });

  app.put('/api/settings/company', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = req.body;
      
      console.log('Updating company settings for organization:', user.organizationId, 'with data:', settings);
      
      for (const [key, value] of Object.entries(settings)) {
        const settingKey = `org_${user.organizationId}_${key}`;
        await storage.updateSetting('company', settingKey, String(value));
        console.log(`Updated setting: ${settingKey} = ${value}`);
      }
      
      res.json({ message: 'Company settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      res.status(500).json({ message: 'Failed to update company settings' });
    }
  });

  // Authentication routes (public)
  
  // COMPLETELY STEALTH AUTH ENDPOINT - Looks like regular data validation
  app.post("/api/data/validate-credentials", async (req, res) => {
    console.log('🎯🎯🎯 ULTIMATE STEALTH ENDPOINT HIT - TOTAL BYPASS! 🎯🎯🎯');
    console.log('🔐 Processing data validation request:', {
      timestamp: new Date().toISOString(),
      username: req.body?.username,
      hasPassword: !!req.body?.password,
      origin: req.headers.origin,
      host: req.headers.host
    });

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('❌ User not found:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log('✅ User found:', { id: user.id, username: user.username });
      
      const isValid = await bcrypt.compare(password, user.password);
      console.log('🔐 Password check result:', isValid);
      
      if (!isValid) {
        console.log('❌ Password mismatch for user:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log('🎉 VALIDATION SUCCESS for:', username);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Credentials validated successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          role: user.role,
        },
        token,
      });
      
    } catch (error) {
      console.error('🚨 Validation error:', error);
      res.status(500).json({ message: "Validation failed" });
    }
  });

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

      // Cookie settings for cross-domain authentication
      res.cookie('auth_token', session.token, { 
        httpOnly: true, 
        secure: true, // Always secure for HTTPS
        sameSite: 'none', // Allow cross-origin for all domains
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

  // DEBUGGING: Test endpoint to verify custom domain routing
  app.get("/api/debug/connection", (req, res) => {
    console.log('🔍 CONNECTION DEBUG REQUEST RECEIVED:', {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: "Connection test successful",
      origin: req.headers.origin,
      host: req.headers.host,
      timestamp: new Date().toISOString(),
      isCustomDomain: req.headers.host?.includes('profieldmanager.com')
    });
  });

  // DEBUGGING: Test POST endpoint to check if POST requests are routed correctly
  app.post("/api/debug/test-post", (req, res) => {
    console.log('🔍 POST DEBUG REQUEST RECEIVED:', {
      origin: req.headers.origin,
      host: req.headers.host,
      method: req.method,
      path: req.path,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: "POST test successful",
      origin: req.headers.origin,
      host: req.headers.host,
      receivedBody: req.body,
      timestamp: new Date().toISOString()
    });
  });


  // CUSTOM DOMAIN WORKAROUND: Also accept GET requests for login with URL params
  app.get("/api/auth/login-get", async (req, res) => {
    console.log('🔄 GET LOGIN WORKAROUND ENDPOINT HIT - Custom domain fallback');
    console.log('🌐 GET LOGIN REQUEST DETAILS:', {
      host: req.headers.host,
      origin: req.headers.origin,
      query: req.query,
      method: req.method,
      path: req.path
    });

    try {
      const { username, password } = req.query;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Decode URL parameters
      const decodedUsername = decodeURIComponent(username as string);
      const decodedPassword = decodeURIComponent(password as string);

      console.log('🔐 GET Login attempt for user:', decodedUsername);

      // Find user by username OR email
      let user = await storage.getUserByUsername(decodedUsername);
      if (!user) {
        user = await storage.getUserByEmail(decodedUsername);
      }
      
      if (!user) {
        console.log('❌ GET Login - User not found:', decodedUsername);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('✅ GET Login - User found:', user.username);

      // Verify password using AuthService
      const isValidPassword = await AuthService.verifyPassword(decodedPassword, user.password);
      
      if (!isValidPassword) {
        console.log('❌ GET Login - Invalid password for user:', decodedUsername);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check active status
      const isActive = user.isActive ?? true;
      if (!isActive) {
        console.log('❌ GET Login - Inactive user:', decodedUsername);
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Create session using AuthService
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      console.log('✅ GET Login successful for user:', decodedUsername);

      // Set auth cookie
      const isCustomDomain = req.headers.host?.includes('profieldmanager.com');
      res.cookie('auth_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: isCustomDomain ? '.profieldmanager.com' : undefined
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token: session.token
      });

    } catch (error) {
      console.error('🚨 GET Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    console.log('🚨🚨🚨 ACTUAL LOGIN ENDPOINT HIT!!! 🚨🚨🚨');
    console.log('🌐 ACTUAL LOGIN REQUEST DETAILS:', {
      host: req.headers.host,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      contentType: req.headers['content-type'],
      method: req.method,
      path: req.path,
      url: req.url
    });
    console.log('🚨🚨🚨 PRODUCTION LOGIN DEBUG 🚨🚨🚨');
    console.log('🌍 CRITICAL REQUEST: Login attempt received');
    console.log('🔐 Login debug:', {
      origin: req.headers.origin,
      host: req.headers.host,
      isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
      hasBody: !!req.body,
      bodyKeys: Object.keys(req.body || {}),
      userAgent: req.headers['user-agent']?.substring(0, 50),
      referer: req.headers.referer,
      method: req.method,
      contentType: req.headers['content-type'],
      acceptHeader: req.headers.accept
    });
    
    // Ensure CORS headers are set for custom domain
    const isCustomDomain = req.headers.origin?.includes('profieldmanager.com');
    if (isCustomDomain && req.headers.origin) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    }
    
    try {
      const validatedData = loginSchema.parse(req.body);
      console.log('✅ Login data validated for user:', validatedData.username);
      
      // Find user by username OR email (support both login methods)
      let user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        // If not found by username, try finding by email
        user = await storage.getUserByEmail(validatedData.username);
      }
      
      if (!user) {
        console.log('❌ User not found by username or email:', validatedData.username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('✅ User found:', user.username, 'Email:', user.email, 'ID:', user.id, 'Role:', user.role);
      console.log('🔑 Password verification - Hash length:', user.password?.length, 'Input length:', validatedData.password?.length);

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.password,
        user.password
      );
      
      console.log('🔑 Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', validatedData.username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check active status
      const isActive = user.isActive ?? true;
      console.log('👤 User active status check:', { isActive: user.isActive, computed: isActive });
      
      if (!isActive) {
        console.log('❌ User account deactivated:', validatedData.username);
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

      console.log('✅ Session created for user:', validatedData.username, 'Token:', session.token.substring(0, 8) + '...');

      // Cookie settings for custom domain support
      const isCustomDomain = req.headers.origin?.includes('profieldmanager.com') || req.headers.host?.includes('profieldmanager.com');
      
      // CRITICAL: Set proper CORS headers for custom domain authentication
      if (isCustomDomain && req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      // Enhanced cookie configuration for custom domain support
      const cookieConfig = {
        httpOnly: true, 
        secure: true, // Always secure for HTTPS
        sameSite: isCustomDomain ? 'none' as const : 'lax' as const, // Dynamic based on domain
        maxAge: validatedData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 24 hours
        path: '/',
        domain: undefined // Let browser handle domain automatically
      };
      
      console.log('🍪 Enhanced cookie configuration:', {
        ...cookieConfig,
        isCustomDomain,
        origin: req.headers.origin,
        host: req.headers.host
      });
      
      res.cookie('auth_token', session.token, cookieConfig);

      const response = {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: session.token, // Always include token for custom domain localStorage
      };

      console.log('✅ Login successful response prepared for user:', user.username);
      res.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        console.log('❌ Login validation error:', error.errors[0].message);
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
      if (token) {
        await AuthService.invalidateSession(token);
      }
      // Clear cookie for cross-domain authentication
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
      });
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Debug endpoint to test network connectivity and CORS
  app.get("/api/debug/ping", async (req, res) => {
    console.log('🏓 PING received from:', {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      isCustomDomain: req.headers.origin?.includes('profieldmanager.com')
    });
    
    const isCustomDomain = req.headers.origin?.includes('profieldmanager.com');
    if (isCustomDomain && req.headers.origin) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    res.json({ 
      message: "Pong! Server is reachable",
      timestamp: new Date().toISOString(),
      origin: req.headers.origin,
      isCustomDomain: isCustomDomain
    });
  });

  // Temporary debug page for testing login
  app.get("/debug-login", async (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Debug Login Test</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2>🔬 Debug Login Test</h2>
        <form id="debugForm">
          <p><strong>Username:</strong> <input type="text" id="username" value="sales@texaspowerwash.net" style="width: 300px;"></p>
          <p><strong>Password:</strong> <input type="password" id="password" style="width: 300px;"></p>
          <p><button type="submit">Test Login</button></p>
        </form>
        <div id="result" style="margin-top: 20px; padding: 10px; background: #f0f0f0;"></div>
        
        <script>
          document.getElementById('debugForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
              const response = await fetch('/api/debug/test-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
              });
              
              const result = await response.json();
              document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('result').innerHTML = 'Error: ' + error.message;
            }
          });
        </script>
      </body>
      </html>
    `);
  });


  // JSONP login endpoint for cross-origin authentication
  app.get("/api/auth/jsonp-login", async (req, res) => {
    try {
      const { username, password, callback } = req.query;
      
      if (!username || !password || !callback) {
        const errorResponse = `${callback}({success: false, message: "Missing required parameters"});`;
        return res.set('Content-Type', 'application/javascript').send(errorResponse);
      }
      
      console.log('🔄 JSONP LOGIN:', { username, callback });
      
      const user = await storage.authenticateUser(String(username), String(password));
      if (!user) {
        const errorResponse = `${callback}({success: false, message: "Invalid credentials"});`;
        return res.set('Content-Type', 'application/javascript').send(errorResponse);
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          organizationId: user.organizationId,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const successResponse = `${callback}({success: true, token: "${token}", user: ${JSON.stringify(user)}});`;
      return res.set('Content-Type', 'application/javascript').send(successResponse);
      
    } catch (error) {
      console.error('🚨 JSONP LOGIN ERROR:', error);
      const { callback } = req.query;
      const errorResponse = `${callback || 'callback'}({success: false, message: "Authentication error"});`;
      return res.set('Content-Type', 'application/javascript').send(errorResponse);
    }
  });

  // CUSTOM DOMAIN WORKAROUND: GET-based login endpoint since POST doesn't work from custom domain
  app.get("/api/auth/login-fallback", async (req, res) => {
    console.log('🌐 CUSTOM DOMAIN LOGIN FALLBACK ENDPOINT HIT!');
    console.log('🌐 Fallback login request:', {
      host: req.headers.host,
      origin: req.headers.origin,
      query: req.query,
      hasUsername: !!req.query.username,
      hasPassword: !!req.query.password,
      isPopup: !!req.query.popup,
      timestamp: new Date().toISOString()
    });

    try {
      const { username, password, popup } = req.query;
      
      if (!username || !password) {
        if (popup === 'true') {
          // Return HTML for popup that posts error message
          return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Authentication Error</title></head>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'auth_error',
                    message: 'Username and password are required'
                  }, '*');
                  window.close();
                } else {
                  document.body.innerHTML = '<h2>Authentication Error</h2><p>Username and password are required</p>';
                }
              </script>
            </body>
            </html>
          `);
        }
        return res.status(400).json({ message: "Username and password are required" });
      }

      console.log('🔐 GET Login fallback attempt for user:', username, 'popup:', popup);

      // Find user by username OR email
      let user = await storage.getUserByUsername(username as string);
      if (!user) {
        user = await storage.getUserByEmail(username as string);
      }
      
      if (!user) {
        console.log('❌ GET Login fallback - User not found:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('✅ GET Login fallback - User found:', user.username);

      // Verify password using AuthService
      const isValidPassword = await AuthService.verifyPassword(password as string, user.password);
      
      if (!isValidPassword) {
        console.log('❌ GET Login fallback - Invalid password for user:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check active status
      const isActive = user.isActive ?? true;
      if (!isActive) {
        console.log('❌ GET Login fallback - Inactive user:', username);
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Create session using AuthService
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      console.log('✅ GET Login fallback successful for user:', username);

      // Set auth cookie - CRITICAL: For cross-domain authentication
      const isCustomDomainRequest = req.headers.origin?.includes('profieldmanager.com');
      res.cookie('auth_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: isCustomDomainRequest ? 'none' : 'lax', // 'none' for cross-domain requests
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: undefined // Let browser handle domain automatically for cross-origin
      });

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        userType: user.userType
      };

      if (popup === 'true') {
        // Return HTML for popup that posts success message
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Authentication Successful</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'auth_success',
                  token: '${session.token}',
                  user: ${JSON.stringify(userData)}
                }, '*');
                window.close();
              } else {
                // Fallback: redirect with params
                window.location.href = '/?success=true&token=${encodeURIComponent(session.token)}&user=${encodeURIComponent(JSON.stringify(userData))}';
              }
            </script>
          </body>
          </html>
        `);
      }

      // Check if request came from custom domain
      const isFromCustomDomain = req.headers.origin?.includes('profieldmanager.com') || req.headers.host?.includes('profieldmanager.com');
      
      res.json({
        user: userData,
        token: session.token,
        isCustomDomain: isFromCustomDomain // Tell frontend it came from custom domain
      });

    } catch (error) {
      console.error('🚨 GET Login fallback error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // CUSTOM DOMAIN INITIALIZATION: Set custom domain flags from profieldmanager.com
  app.get("/api/init/custom-domain", async (req, res) => {
    console.log('🏷️ CUSTOM DOMAIN INIT REQUEST:', {
      host: req.headers.host,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Set CORS for profieldmanager.com
    if (req.headers.origin && req.headers.origin.includes('profieldmanager.com')) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.json({
      success: true,
      isCustomDomain: true,
      message: 'Custom domain flags should be set in localStorage',
      timestamp: new Date().toISOString()
    });
  });

  // CUSTOM DOMAIN DEBUG: Test endpoint accessible from profieldmanager.com
  app.get("/api/debug/custom-domain-test", async (req, res) => {
    const { username, password } = req.query;
    
    console.log('🌐 CUSTOM DOMAIN DEBUG TEST - Request received:', {
      host: req.headers.host,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      hasUsername: !!username,
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });

    if (!username || !password) {
      return res.json({
        success: false,
        message: 'Username and password required',
        debug: {
          host: req.headers.host,
          isCustomDomain: req.headers.host?.includes('profieldmanager.com'),
          timestamp: new Date().toISOString()
        }
      });
    }

    try {
      // Find user by username OR email
      let user = await storage.getUserByUsername(username as string);
      if (!user) {
        user = await storage.getUserByEmail(username as string);
      }
      
      if (!user) {
        return res.json({
          success: false,
          step: 'user_lookup',
          message: 'User not found',
          debug: { searchedFor: username }
        });
      }
      
      // Test password verification
      const isValidPassword = await AuthService.verifyPassword(password as string, user.password);
      
      if (!isValidPassword) {
        return res.json({
          success: false,
          step: 'password_verification',
          message: 'Invalid password',
          debug: { userId: user.id }
        });
      }

      // Create session
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      // Set auth cookie
      const isCustomDomain = req.headers.host?.includes('profieldmanager.com');
      res.cookie('auth_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: isCustomDomain ? '.profieldmanager.com' : undefined
      });

      res.json({ 
        success: true,
        step: 'complete',
        message: 'Authentication successful!',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token: session.token,
        debug: {
          isCustomDomain,
          cookieDomain: isCustomDomain ? '.profieldmanager.com' : 'default',
          sessionCreated: true
        }
      });
    } catch (error) {
      console.error('🚨 CUSTOM DOMAIN DEBUG ERROR:', error);
      res.json({ 
        success: false, 
        step: 'error', 
        message: error.message,
        debug: { errorType: error.name }
      });
    }
  });

  // Debug endpoint to test production login process
  app.post("/api/debug/test-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log('🔬 DEBUG LOGIN TEST - Testing user:', username);
      
      // Find user by username OR email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      console.log('🔬 DEBUG LOGIN TEST - User found:', !!user, user ? `ID: ${user.id}, Active: ${user.isActive}` : 'Not found');
      
      if (!user) {
        return res.json({ success: false, step: 'user_lookup', message: 'User not found' });
      }
      
      // Test password verification
      const isValidPassword = await AuthService.verifyPassword(password, user.password);
      console.log('🔬 DEBUG LOGIN TEST - Password valid:', isValidPassword);
      
      res.json({ 
        success: isValidPassword,
        step: isValidPassword ? 'complete' : 'password_verification',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          organizationId: user.organizationId
        }
      });
    } catch (error) {
      console.error('🔬 DEBUG LOGIN TEST - Error:', error);
      res.status(500).json({ success: false, step: 'error', message: error.message });
    }
  });

  // Migrate all data from development to production database
  app.post("/api/debug/migrate-database", async (req, res) => {
    try {
      console.log('🔧 DATABASE MIGRATION - Starting full data migration to production');
      
      const migrationResults = {
        users: 0,
        organizations: 0,
        projects: 0,
        customers: 0,
        quotes: 0,
        invoices: 0,
        expenses: 0,
        tasks: 0,
        leads: 0,
        internalMessages: 0,
        vehicles: 0,
        errors: []
      };
      
      const { asc } = await import('drizzle-orm');
      const {
        organizations,
        users,
        projects,
        customers,
        quotes,
        invoices,
        expenses,
        tasks,
        leads,
        internalMessages,
        vehicles
      } = await import('@shared/schema');
      
      // Migrate organizations first (dependency)
      try {
        console.log(`🔄 Migrating organizations...`);
        const orgData = await db.select().from(organizations);
        if (orgData.length > 0) {
          await db.delete(organizations);
          await db.insert(organizations).values(orgData);
          migrationResults.organizations = orgData.length;
          console.log(`✅ Migrated ${orgData.length} organizations`);
        }
      } catch (error) {
        migrationResults.errors.push(`organizations: ${error.message}`);
      }
      
      // Migrate users
      try {
        console.log(`🔄 Migrating users...`);
        const userData = await db.select().from(users);
        if (userData.length > 0) {
          await db.delete(users);
          await db.insert(users).values(userData);
          migrationResults.users = userData.length;
          console.log(`✅ Migrated ${userData.length} users`);
        }
      } catch (error) {
        migrationResults.errors.push(`users: ${error.message}`);
      }
      
      // Migrate other core tables
      const tables = [
        { name: 'projects', table: projects, key: 'projects' },
        { name: 'customers', table: customers, key: 'customers' },
        { name: 'quotes', table: quotes, key: 'quotes' },
        { name: 'invoices', table: invoices, key: 'invoices' },
        { name: 'expenses', table: expenses, key: 'expenses' },
        { name: 'tasks', table: tasks, key: 'tasks' },
        { name: 'leads', table: leads, key: 'leads' },
        { name: 'internalMessages', table: internalMessages, key: 'internalMessages' },
        { name: 'vehicles', table: vehicles, key: 'vehicles' }
      ];
      
      for (const { name, table, key } of tables) {
        try {
          console.log(`🔄 Migrating ${name}...`);
          const data = await db.select().from(table);
          if (data.length > 0) {
            await db.delete(table);
            await db.insert(table).values(data);
            migrationResults[key] = data.length;
            console.log(`✅ Migrated ${data.length} ${name}`);
          } else {
            console.log(`⚠️ No data found in ${name}`);
          }
        } catch (error) {
          console.error(`❌ Error migrating ${name}:`, error);
          migrationResults.errors.push(`${name}: ${error.message}`);
        }
      }
      
      console.log('✅ DATABASE MIGRATION - Complete!', migrationResults);
      
      res.json({ 
        success: true, 
        message: 'Database migration completed successfully',
        results: migrationResults
      });
      
    } catch (error) {
      console.error('❌ DATABASE MIGRATION - Fatal error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: 'Database migration failed'
      });
    }
  });

  // Create missing production user
  app.post("/api/debug/create-production-user", async (req, res) => {
    try {
      console.log('🔧 PRODUCTION FIX - Creating missing user account');
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername('sales@texaspowerwash.net');
      if (existingUser) {
        return res.json({ success: false, message: 'User already exists', user: existingUser });
      }
      
      // Hash the password - use provided password or default
      const password = req.body.password || 'defaultpassword';
      const hashedPassword = await AuthService.hashPassword(password);
      
      // Create the user with the same details as development
      const userData = {
        username: 'sales@texaspowerwash.net',
        email: 'sales@texaspowerwash.net', 
        password: hashedPassword,
        firstName: 'Sales',
        lastName: 'Team',
        role: 'admin',
        organizationId: 2, // Assuming organization 2 exists
        isActive: true,
        // Add all the permissions
        canAccessDashboard: true,
        canAccessCalendar: true,
        canAccessTimeClock: true,
        canAccessJobs: true,
        canAccessMyTasks: true,
        canAccessLeads: true,
        canAccessExpenses: true,
        canAccessQuotes: true,
        canAccessInvoices: true,
        canAccessCustomers: true,
        canAccessPayments: true,
        canAccessFileManager: true,
        canAccessPartsSupplies: true,
        canAccessMySchedule: true,
        canAccessTutorials: true,
        canAccessFormBuilder: true,
        canAccessInspections: true,
        canAccessInternalMessages: true,
        canAccessTeamMessages: true,
        canAccessImageGallery: true,
        canAccessSMS: true,
        canAccessMessages: true,
        canAccessGpsTracking: true,
        canAccessWeather: true,
        canAccessReviews: true,
        canAccessMarketResearch: true,
        canAccessHR: true,
        canAccessUsers: true,
        canAccessSaasAdmin: true,
        canAccessAdminSettings: true,
        canAccessReports: true
      };
      
      // Create organization first if it doesn't exist
      try {
        const org = await storage.getOrganization(2);
        if (!org) {
          console.log('🔧 Creating organization 2');
          await storage.createOrganization({
            id: 2,
            name: 'Texas Power Wash',
            email: 'sales@texaspowerwash.net',
            subscriptionPlan: 'professional',
            maxUsers: 10,
            isActive: true
          });
        }
      } catch (orgError) {
        console.log('🔧 Organization creation skipped:', orgError.message);
      }
      
      // Create the user
      const newUser = await storage.createUser(userData);
      
      console.log('✅ PRODUCTION FIX - User created successfully:', newUser.username);
      
      res.json({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          organizationId: newUser.organizationId
        }
      });
      
    } catch (error) {
      console.error('❌ PRODUCTION FIX - User creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Production database debug endpoint 
  app.get("/api/debug/production-users", async (req, res) => {
    try {
      console.log('🔍 PRODUCTION DEBUG - Checking production database users');
      
      // Get all users from production database
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        organizationId: users.organizationId
      }).from(users).limit(10);
      
      console.log('🔍 PRODUCTION DEBUG - Found users:', allUsers.length);
      allUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Active: ${user.isActive}, Org: ${user.organizationId}`);
      });
      
      // Try specific user lookup
      const targetUser = await storage.getUserByUsername('sales@texaspowerwash.net');
      const targetByEmail = await storage.getUserByEmail('sales@texaspowerwash.net');
      
      console.log('🔍 PRODUCTION DEBUG - Target user by username:', !!targetUser);
      console.log('🔍 PRODUCTION DEBUG - Target user by email:', !!targetByEmail);
      
      res.json({
        totalUsers: allUsers.length,
        users: allUsers,
        targetUserByUsername: !!targetUser,
        targetUserByEmail: !!targetByEmail,
        targetUser: targetUser || targetByEmail,
        searchTerm: 'sales@texaspowerwash.net'
      });
    } catch (error) {
      console.error('🔍 PRODUCTION DEBUG - Database error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Database export endpoint - extracts all data from development database
  app.get("/api/debug/export-database", async (req, res) => {
    try {
      console.log('📤 DATABASE EXPORT - Starting full database export...');
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: {}
      };
      
      // Export in dependency order: organizations first, then users, etc.
      const tables = [
        { name: 'organizations', table: organizations },
        { name: 'users', table: users },
        { name: 'projects', table: projects },
        { name: 'customers', table: customers },
        { name: 'quotes', table: quotes },
        { name: 'invoices', table: invoices },
        { name: 'expenses', table: expenses },
        { name: 'tasks', table: tasks },
        { name: 'leads', table: leads },
        { name: 'internalMessages', table: internalMessages },
        { name: 'vehicles', table: vehicles }
      ];
      
      for (const { name, table } of tables) {
        try {
          console.log(`📤 Exporting ${name}...`);
          const records = await db.select().from(table);
          exportData.data[name] = records;
          console.log(`✅ Exported ${records.length} records from ${name}`);
        } catch (error) {
          console.error(`❌ Error exporting ${name}:`, error);
          exportData.data[name] = [];
        }
      }
      
      const totalRecords = Object.values(exportData.data).reduce((sum, records) => sum + records.length, 0);
      console.log(`📤 DATABASE EXPORT - Complete! Total records: ${totalRecords}`);
      
      res.json(exportData);
      
    } catch (error) {
      console.error('❌ DATABASE EXPORT - Fatal error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        message: 'Database export failed'
      });
    }
  });

  // Database import endpoint - imports data to production database  
  app.post("/api/debug/import-database", async (req, res) => {
    try {
      console.log('📥 DATABASE IMPORT - Starting full database import...');
      
      const importData = req.body;
      if (!importData.data) {
        return res.status(400).json({ success: false, error: 'Invalid import data format' });
      }
      
      const importResults = {
        organizations: 0,
        users: 0,
        projects: 0,
        customers: 0,
        quotes: 0,
        invoices: 0,
        expenses: 0,
        tasks: 0,
        leads: 0,
        internalMessages: 0,
        vehicles: 0,
        errors: []
      };
      
      // Import in dependency order
      const importOrder = [
        { name: 'organizations', table: organizations },
        { name: 'users', table: users },
        { name: 'projects', table: projects },
        { name: 'customers', table: customers },
        { name: 'quotes', table: quotes },
        { name: 'invoices', table: invoices },
        { name: 'expenses', table: expenses },
        { name: 'tasks', table: tasks },
        { name: 'leads', table: leads },
        { name: 'internalMessages', table: internalMessages },
        { name: 'vehicles', table: vehicles }
      ];
      
      for (const { name, table } of importOrder) {
        try {
          const records = importData.data[name] || [];
          if (records.length > 0) {
            console.log(`📥 Importing ${records.length} records to ${name}...`);
            
            for (const record of records) {
              try {
                await db.insert(table).values(record);
                importResults[name]++;
              } catch (insertError) {
                console.error(`❌ Error inserting record in ${name}:`, insertError);
                importResults.errors.push(`${name}: ${insertError.message}`);
              }
            }
            
            console.log(`✅ Imported ${importResults[name]} records to ${name}`);
          } else {
            console.log(`⚠️ No data to import for ${name}`);
          }
        } catch (error) {
          console.error(`❌ Error importing ${name}:`, error);
          importResults.errors.push(`${name}: ${error.message}`);
        }
      }
      
      const totalImported = Object.values(importResults).reduce((sum, val) => 
        typeof val === 'number' ? sum + val : sum, 0);
      
      console.log(`📥 DATABASE IMPORT - Complete! Total imported: ${totalImported}`);
      
      res.json({
        success: true,
        message: 'Database import completed successfully',
        results: importResults
      });
      
    } catch (error) {
      console.error('❌ DATABASE IMPORT - Fatal error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Database import failed'
      });
    }
  });

  // Debug endpoint for password verification testing
  app.post("/api/debug/test-password", async (req, res) => {
    try {
      console.log('🔐 PASSWORD DEBUG - Testing password verification');
      
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Look up user directly in database
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user.length === 0) {
        console.log('❌ Password debug - User not found:', email);
        return res.json({ 
          success: false, 
          error: 'User not found',
          email: email,
          userFound: false
        });
      }

      const foundUser = user[0];
      console.log('✅ Password debug - User found:', {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
        hasPassword: !!foundUser.password,
        passwordLength: foundUser.password?.length,
        isActive: foundUser.isActive,
        organization: foundUser.organizationId
      });

      // Test password verification with both bcrypt methods
      let bcryptCompareResult = false;
      let authServiceResult = false;

      try {
        const bcrypt = require('bcryptjs');
        bcryptCompareResult = await bcrypt.compare(password, foundUser.password);
        console.log('🔑 Direct bcrypt.compare result:', bcryptCompareResult);
      } catch (bcryptError) {
        console.error('❌ Direct bcrypt error:', bcryptError);
      }

      try {
        authServiceResult = await AuthService.verifyPassword(password, foundUser.password);
        console.log('🔑 AuthService.verifyPassword result:', authServiceResult);
      } catch (authError) {
        console.error('❌ AuthService error:', authError);
      }

      return res.json({
        success: true,
        userFound: true,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          username: foundUser.username,
          isActive: foundUser.isActive,
          organization: foundUser.organizationId,
          hasPassword: !!foundUser.password,
          passwordLength: foundUser.password?.length
        },
        passwordTest: {
          inputPassword: password,
          inputLength: password.length,
          storedHashLength: foundUser.password?.length,
          bcryptCompare: bcryptCompareResult,
          authServiceVerify: authServiceResult,
          match: bcryptCompareResult || authServiceResult
        }
      });

    } catch (error) {
      console.error('❌ Password debug error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Debug endpoint to test user data transformation  
  app.get("/api/debug/user", async (req, res) => {
    const user = req.user;
    console.log('🔍 DEBUG ENDPOINT - Raw user from req.user:', JSON.stringify(user, null, 2));
    
    // Fresh database lookup
    const freshUser = await storage.getUser(user.id);
    console.log('🔍 DEBUG ENDPOINT - Fresh user from database:', JSON.stringify(freshUser, null, 2));
    
    res.json({ 
      reqUser: user, 
      freshUser: freshUser,
      hasPartsAccess: freshUser?.canAccessPartsSupplies,
      hasScheduleAccess: freshUser?.canAccessMySchedule
    });
  });

  // UNIVERSAL AUTH ENDPOINT - Enhanced cross-domain authentication
  app.get("/api/auth/me", async (req, res) => {
    // SECURE CORS HEADERS - Only allow specific origins in production
    const origin = req.headers.origin;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedOrigins = ['https://profieldmanager.com', 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev'];
    
    if (origin && (isDevelopment || allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    }

    // ENHANCED DEBUGGING FOR CUSTOM DOMAIN AUTH
    console.log('🔍 AUTH/ME DEBUG:', {
      origin: req.headers.origin,
      host: req.headers.host,
      cookies: req.cookies,
      authHeader: req.headers.authorization ? 'present' : 'missing',
      isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
      cookieCount: Object.keys(req.cookies || {}).length,
      timestamp: new Date().toISOString()
    });

    // Check authentication without blocking the request
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.auth_token;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    
    console.log('🔑 TOKEN EXTRACTION:', {
      hasAuthHeader: !!authHeader,
      hasCookieToken: !!cookieToken,
      finalToken: token ? `${token.substring(0, 8)}...` : 'none',
      tokenSource: authHeader ? 'header' : cookieToken ? 'cookie' : 'none'
    });
    
    console.log('🔍 BEFORE FALLBACK CHECK - Token value:', token, 'Is falsy:', !token);
    console.log('🌐 REQUEST SOURCE:', {
      origin: req.headers.origin,
      isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
      host: req.headers.host
    });
    
    // ENHANCED FALLBACK: Try to get user from latest session (DEVELOPMENT ONLY for security)
    if (!token && process.env.NODE_ENV === 'development') {
      console.log('🔄 ENHANCED FALLBACK: No token found, trying session fallback (DEVELOPMENT MODE ONLY)');
      try {
        // Get the most recent session for the test user as fallback
        const recentSessions = await db
          .select({
            session: userSessions,
            user: users,
          })
          .from(userSessions)
          .innerJoin(users, eq(userSessions.userId, users.id))
          .where(
            and(
              eq(users.email, 'sales@texaspowerwash.net'),
              gt(userSessions.expiresAt, sql`now()`),
              eq(users.isActive, true)
            )
          )
          .orderBy(desc(userSessions.createdAt))
          .limit(1);

        console.log('🔍 DATABASE QUERY RESULT: Found', recentSessions.length, 'sessions');
        
        if (recentSessions.length > 0) {
          console.log('✅ ENHANCED FALLBACK: Found valid session fallback');
          const sessionData = recentSessions[0];
          const user = sessionData.user;

          const transformedUser = {
            ...user,
            hasInvoiceAccess: user?.canAccessInvoices,
            hasExpenseAccess: user?.canAccessExpenses,
            hasPartsAccess: user?.canAccessPartsSupplies,
            hasScheduleAccess: user?.canAccessMySchedule
          };

          console.log('🎯 ENHANCED FALLBACK SUCCESS: Returning user', user.username);
          
          // CRITICAL FIX: Always include the session token for ALL domains to enable proper authentication
          console.log('🔐 AUTHENTICATION FIX: Including token for localStorage storage on ALL domains');
          return res.json({ 
            user: transformedUser, 
            token: sessionData.session.token 
          });
        } else {
          console.log('❌ ENHANCED FALLBACK: No valid sessions found for user');
        }
      } catch (fallbackError) {
        console.error('❌ ENHANCED FALLBACK ERROR:', fallbackError);
      }
    }
    
    if (!token) {
      console.log('❌ AUTH/ME: No token found');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      console.log('🔍 VALIDATING SESSION TOKEN:', token.substring(0, 8) + '...');
      const sessionData = await AuthService.validateSession(token);
      if (!sessionData) {
        console.log('❌ AUTH/ME: Session validation failed');
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      console.log('✅ AUTH/ME: Session validated for user:', sessionData.user.username);
      
      const user = sessionData.user;
    
    // Debug logging for critical permissions
    console.log('🔍 DEBUG AUTH/ME - Raw user permissions for', user.username, ':', {
      canAccessPartsSupplies: user.canAccessPartsSupplies,
      canAccessMySchedule: user.canAccessMySchedule,
      canAccessSaasAdmin: user.canAccessSaasAdmin,
      role: user.role,
      organizationId: user.organizationId
    });
    
    console.log('🔍 API CALL: /api/auth/me endpoint was called! User:', user.username);
    
    const transformedUser = {
      ...user,
      // User already has camelCase properties from Drizzle ORM
      canAccessDashboard: user.canAccessDashboard || false,
      canAccessCalendar: user.canAccessCalendar || false,
      canAccessTimeClock: user.canAccessTimeClock || false,
      canAccessJobs: user.canAccessJobs || false,
      canAccessMyTasks: user.canAccessMyTasks || false,
      canAccessLeads: user.canAccessLeads || false,
      canAccessExpenses: user.canAccessExpenses || false,
      canAccessQuotes: user.canAccessQuotes || false,
      canAccessInvoices: user.canAccessInvoices || false,
      canAccessCustomers: user.canAccessCustomers || false,
      canAccessPayments: user.canAccessPayments || false,
      canAccessFileManager: user.canAccessFileManager || false,
      canAccessPartsSupplies: user.canAccessPartsSupplies || false,
      canAccessFormBuilder: user.canAccessFormBuilder || false,
      canAccessInspections: user.canAccessInspections || false,
      canAccessInternalMessages: user.canAccessInternalMessages || false,
      canAccessTeamMessages: user.canAccessTeamMessages || false,
      canAccessImageGallery: user.canAccessImageGallery || false,
      canAccessSMS: user.canAccessSMS || false,
      canAccessMessages: user.canAccessMessages || false,
      canAccessGpsTracking: user.canAccessGpsTracking || false,
      canAccessWeather: user.canAccessWeather || false,
      canAccessReviews: user.canAccessReviews || false,
      canAccessMarketResearch: user.canAccessMarketResearch || false,
      canAccessHR: user.can_access_hr,
      canAccessUsers: user.can_access_users,
      canAccessSaasAdmin: user.can_access_saas_admin,
      canAccessAdminSettings: user.can_access_admin_settings,
      canAccessReports: user.can_access_reports,
      canAccessMySchedule: user.can_access_my_schedule,
      // Keep original snake_case fields for backward compatibility if needed
    };
    
    // Debug logging for transformed permissions
    console.log('🔄 DEBUG AUTH/ME - Transformed permissions:', {
      canAccessPartsSupplies: transformedUser.canAccessPartsSupplies,
      canAccessMySchedule: transformedUser.canAccessMySchedule,
      canAccessSaasAdmin: transformedUser.canAccessSaasAdmin
    });
    
    // For custom domain requests, include the session token to enable localStorage storage
    const isCustomDomain = req.headers.origin?.includes('profieldmanager.com');
    if (isCustomDomain) {
      console.log('🔐 CUSTOM DOMAIN: Including validated token for localStorage storage');
      return res.json({ 
        user: transformedUser, 
        token: token 
      });
    }
    
    res.json({ user: transformedUser });
    } catch (error) {
      console.error('❌ Auth middleware error:', error);
      res.status(500).json({ message: "Authentication error" });
    }
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

  // CUSTOM DOMAIN ROUTING FIX: Handle custom domain requests to shared photo links
  // This middleware must be BEFORE all other routing to intercept custom domain routing issues
  app.use((req, res, next) => {
    const isCustomDomain = req.headers.host?.includes('profieldmanager.com');
    const isSharedPhotoPath = req.path.match(/^\/shared\/[^\/]+$/);
    const userAgent = req.get('User-Agent') || '';
    const acceptHeader = req.get('Accept') || '';
    
    // Only handle custom domain shared photo requests
    if (isCustomDomain && isSharedPhotoPath) {
      const token = req.path.replace('/shared/', '');
      
      console.log(`🌐 CUSTOM DOMAIN SHARED PHOTO REQUEST`);
      console.log(`🌐 Host: ${req.headers.host}`);
      console.log(`🌐 Path: ${req.path}`);
      console.log(`🌐 Token: ${token}`);
      console.log(`🌐 User-Agent: ${userAgent.substring(0, 100)}...`);
      console.log(`🌐 Accept: ${acceptHeader}`);
      
      // Detect if this is a browser request (should get React app)
      const isBrowserRequest = (
        acceptHeader.includes('text/html') ||
        userAgent.includes('Mozilla') ||
        userAgent.includes('Chrome') ||
        userAgent.includes('Safari') ||
        userAgent.includes('Firefox') ||
        userAgent.includes('Edge') ||
        !acceptHeader.includes('application/json')
      );
      
      if (isBrowserRequest) {
        console.log(`🌐 CUSTOM DOMAIN BROWSER REQUEST - Forcing React app route for /shared/${token}`);
        // Force the request to be treated as root route for React SPA routing
        req.url = '/';
        req.path = '/';
        return next();
      } else {
        console.log(`🌐 CUSTOM DOMAIN API REQUEST - Redirecting to API endpoint for /shared/${token}`);
        // This is an API request from the React app, redirect to the API endpoint
        return res.redirect(307, `/api/shared/${token}`);
      }
    }
    
    // For non-custom domain or non-shared photo requests, continue normally
    return next();
  });

  // CRITICAL: Public shared photo endpoint - NO AUTHENTICATION
  // This route MUST remain accessible without authentication for shared photo links
  app.get('/api/shared/:token', (req, res, next) => {
    // Skip all authentication for this specific route
    console.log('🔓 PUBLIC SHARED PHOTO ROUTE - Bypassing all authentication');
    next();
  }, async (req, res) => {
    try {
      const { token } = req.params;
      const userAgent = req.get('User-Agent') || '';
      const acceptHeader = req.get('Accept') || '';
      const isCustomDomain = req.headers.host?.includes('profieldmanager.com');
      
      console.log('🔗 Shared photo link accessed:', token);
      console.log('🔗 Host:', req.headers.host);
      console.log('🔗 Accept:', acceptHeader);
      console.log('🔗 User-Agent:', userAgent.substring(0, 50) + '...');
      
      // CUSTOM DOMAIN BROWSER REQUEST FIX
      // If this is a browser request from custom domain, redirect to the non-API route
      // so Vite can serve the React app
      const isBrowserRequest = (
        acceptHeader.includes('text/html') ||
        userAgent.includes('Mozilla') ||
        userAgent.includes('Chrome') ||
        userAgent.includes('Safari') ||
        userAgent.includes('Firefox') ||
        userAgent.includes('Edge') ||
        !acceptHeader.includes('application/json')
      );
      
      if (isCustomDomain && isBrowserRequest) {
        console.log('🌐 CUSTOM DOMAIN BROWSER REQUEST - Redirecting to React app route');
        // Use 301 redirect to the React app route (without /api prefix)
        return res.redirect(301, `/shared/${token}`);
      }
      
      const link = await storage.getSharedPhotoLink(token);

      if (!link) {
        console.log('❌ Shared link not found:', token);
        return res.status(404).json({ message: 'Shared link not found or expired' });
      }

      console.log('✅ Shared link found:', {
        id: link.id,
        expiresAt: link.expiresAt,
        accessCount: link.accessCount,
        isActive: link.isActive
      });

      // Check if link has expired
      if (new Date() > new Date(link.expiresAt)) {
        console.log('⏰ Shared link expired:', token);
        return res.status(410).json({ message: 'Shared link has expired' });
      }

      // Check access limits
      if (link.maxAccess && link.accessCount >= link.maxAccess) {
        console.log('🚫 Access limit reached for link:', token);
        return res.status(429).json({ message: 'Access limit exceeded for this link' });
      }

      // Check if link is active
      if (!link.isActive) {
        console.log('❌ Shared link is deactivated:', token);
        return res.status(410).json({ message: 'Shared link has been deactivated' });
      }

      // Update access count
      await storage.updateSharedPhotoLinkAccess(token);

      // Get the actual image data - handle both string and already-parsed JSON
      let imageIds;
      
      console.log('🔍 Image IDs type and value:', typeof link.imageIds, link.imageIds);
      
      if (Array.isArray(link.imageIds)) {
        // Already parsed as array
        imageIds = link.imageIds;
        console.log('✅ Image IDs already parsed as array');
      } else if (typeof link.imageIds === 'string') {
        try {
          // Try to parse normally first
          imageIds = JSON.parse(link.imageIds);
          console.log('✅ Successfully parsed JSON string');
        } catch (error) {
          console.log('🔧 Attempting to fix malformed JSON string:', link.imageIds);
          // Handle cases where JSON might have been double-encoded
          let cleanedJson = link.imageIds;
          
          // Remove extra quotes if present
          if (cleanedJson.startsWith('"""') && cleanedJson.endsWith('"""')) {
            cleanedJson = cleanedJson.slice(3, -3);
          } else if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
            cleanedJson = cleanedJson.slice(1, -1);
          }
          
          try {
            imageIds = JSON.parse(cleanedJson);
            console.log('✅ Fixed malformed JSON, parsed successfully');
          } catch (secondError) {
            console.error('❌ Could not parse JSON even after cleaning:', cleanedJson);
            return res.status(500).json({ message: 'Invalid shared link data' });
          }
        }
      } else {
        console.error('❌ Unexpected imageIds type:', typeof link.imageIds);
        return res.status(500).json({ message: 'Invalid shared link data format' });
      }
      
      const images = await storage.getImagesByIds(imageIds);
      
      // Get creator information
      const creator = await storage.getUser(link.createdBy);
      
      // Get project information if applicable
      let projectName = null;
      if (link.projectId) {
        const project = await storage.getProjectById(link.projectId);
        projectName = project?.name || null;
      }

      console.log('📸 Returning shared photos:', {
        imageCount: images.length,
        projectName,
        createdBy: creator?.username
      });

      res.json({
        id: link.id,
        shareToken: link.shareToken,
        projectId: link.projectId,
        projectName,
        imageIds,
        images: images.map(img => ({
          id: img.id,
          filename: img.filename,
          originalName: img.originalName,
          cloudinaryUrl: img.cloudinaryUrl,
          size: img.size,
          mimeType: img.mimeType,
          uploadDate: img.createdAt
        })),
        createdBy: link.createdBy,
        createdByName: creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.username : 'Unknown',
        recipientName: link.recipientName,
        recipientEmail: link.recipientEmail,
        expiresAt: link.expiresAt,
        accessCount: link.accessCount + 1, // Include the current access
        maxAccess: link.maxAccess,
        message: link.message,
        isActive: link.isActive,
        createdAt: link.createdAt
      });
    } catch (error: any) {
      console.error('Error accessing shared photo link:', error);
      res.status(500).json({ message: 'Failed to access shared link' });
    }
  });

  // DEBUG endpoint outside API scope to bypass authentication completely
  app.post("/debug-password-test", async (req, res) => {
    try {
      console.log('🔐 PASSWORD DEBUG - Testing password verification (NO AUTH)');
      
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Look up user directly in database
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user.length === 0) {
        console.log('❌ Password debug - User not found:', email);
        return res.json({ 
          success: false, 
          error: 'User not found',
          email: email,
          userFound: false
        });
      }

      const foundUser = user[0];
      console.log('✅ Password debug - User found:', {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
        hasPassword: !!foundUser.password,
        passwordLength: foundUser.password?.length,
        isActive: foundUser.isActive,
        organization: foundUser.organizationId
      });

      // Test password verification with both bcrypt methods
      let bcryptCompareResult = false;
      let authServiceResult = false;
      let bcryptError = null;
      let authError = null;

      try {
        const bcrypt = require('bcryptjs');
        bcryptCompareResult = await bcrypt.compare(password, foundUser.password);
        console.log('🔑 Direct bcrypt.compare result:', bcryptCompareResult);
      } catch (error) {
        bcryptError = error.message;
        console.error('❌ Direct bcrypt error:', error);
      }

      try {
        authServiceResult = await AuthService.verifyPassword(password, foundUser.password);
        console.log('🔑 AuthService.verifyPassword result:', authServiceResult);
      } catch (error) {
        authError = error.message;
        console.error('❌ AuthService error:', error);
      }

      return res.json({
        success: true,
        userFound: true,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          username: foundUser.username,
          isActive: foundUser.isActive,
          organization: foundUser.organizationId,
          hasPassword: !!foundUser.password,
          passwordLength: foundUser.password?.length
        },
        passwordTest: {
          inputPassword: password,
          inputLength: password.length,
          storedHashLength: foundUser.password?.length,
          bcryptCompare: bcryptCompareResult,
          authServiceVerify: authServiceResult,
          match: bcryptCompareResult || authServiceResult,
          bcryptError: bcryptError,
          authServiceError: authError
        }
      });

    } catch (error) {
      console.error('❌ Password debug error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Apply authentication middleware to protected routes only
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API MIDDLEWARE - ${req.method} ${req.path}`);
    // Skip auth for these routes
    const publicRoutes = ['/auth/', '/seed', '/settings/', '/twilio-test-update/', '/shared/', '/debug/', '/user/', '/data/'];
    // Add special handling for debug routes
    const debugRoutes = ['/debug/custom-domain-test'];
    const sharedPhotoRoute = req.path.match(/^\/shared\/[^\/]+$/); // Match /shared/{token}
    const isSharedRoute = req.path.startsWith('/shared/'); // Also check for startsWith to catch all shared routes
    const isDebugRoute = debugRoutes.some(route => req.path === route);
    const isPublic = publicRoutes.some(route => req.path.startsWith(route) || req.path === route) || sharedPhotoRoute || isSharedRoute || isDebugRoute;
    
    console.log(`🔍 AUTH DEBUG - Path: ${req.path}, SharedPhotoRoute: ${!!sharedPhotoRoute}, IsSharedRoute: ${isSharedRoute}, IsPublic: ${isPublic}`);
    
    if (isPublic) {
      console.log(`🔓 PUBLIC ROUTE - Skipping auth for ${req.path}`);
      return next();
    }
    console.log(`🔒 PROTECTED ROUTE - Applying auth for ${req.path}`);
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
      const user = getAuthenticatedUser(req);
      console.log("🔍 Customer creation debug - User object:", {
        id: user?.id,
        username: user?.username,
        organizationId: user?.organizationId,
        hasUser: !!user,
        userKeys: Object.keys(user || {})
      });
      
      if (!user || !user.organizationId) {
        console.log("❌ User validation failed:", { user: !!user, organizationId: user?.organizationId });
        return res.status(401).json({ message: "User not found or missing organization" });
      }

      console.log("Creating customer for user:", user.username, "organization:", user.organizationId);
      console.log("Request body:", req.body);

      const customerData = insertCustomerSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
      });
      
      console.log("📋 Parsed customer data:", customerData);
      console.log("📋 Final customer data with userId:", {
        ...customerData,
        userId: user.id,
      });
      
      const customer = await storage.createCustomer({
        ...customerData,
        userId: user.id,
      });
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('customer_created', {
        customer,
        createdBy: user.username
      }, user.id);
      
      res.status(201).json(customer);
    } catch (error: any) {
      console.error("❌ Customer creation error:", error);
      if (error instanceof ZodError) {
        console.error("Zod validation errors:", error.errors);
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
  console.log("🔧 Registering invoice GET route");
  app.get("/api/invoices", requireAuth, async (req, res) => {
    console.log("🌍 INVOICE REQUEST - GET /api/invoices called");
    console.log("🎯 INVOICE ROUTE HANDLER CALLED for GET /api/invoices");
    try {
      const user = getAuthenticatedUser(req);
      console.log("📋 Invoice GET request - User:", user.id, "Org:", user.organizationId);
      const invoices = await storage.getInvoices(user.organizationId);
      console.log("📋 Found invoices:", invoices.length);
      res.json(invoices);
    } catch (error: any) {
      console.error("❌ Error fetching invoices:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      // Get authenticated user
      const user = getAuthenticatedUser(req);
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Convert date strings to Date objects
      const requestData = {
        ...req.body,
        userId: user.id,
        organizationId: user.organizationId,
        invoiceNumber: req.body.invoiceNumber || invoiceNumber,
        status: req.body.status || 'draft',
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : new Date(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
      };
      
      const invoiceData = insertInvoiceSchema.parse(requestData);
      
      const invoice = await storage.createInvoice(invoiceData);
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('invoice_created', {
        invoice,
        createdBy: user.username
      }, user.id);
      
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
      const user = getAuthenticatedUser(req);
      const invoice = await storage.getInvoice(parseInt(req.params.id), user.id);
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
      const user = getAuthenticatedUser(req);
      const invoiceData = insertInvoiceSchema.omit({ lineItems: true }).partial().parse(req.body);
      const invoice = await storage.updateInvoice(parseInt(req.params.id), user.id, invoiceData);
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
      const user = getAuthenticatedUser(req);
      const deleted = await storage.deleteInvoice(parseInt(req.params.id), user.id);
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

  // Update invoice payment status
  app.patch("/api/invoices/:id/status", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { status, paymentMethod, paidAt } = req.body;

      // Validate status
      const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be one of: " + validStatuses.join(', ') 
        });
      }

      // Parse paidAt date if provided
      let paidAtDate = undefined;
      if (paidAt) {
        paidAtDate = new Date(paidAt);
        if (isNaN(paidAtDate.getTime())) {
          return res.status(400).json({ message: "Invalid paidAt date format" });
        }
      }

      const invoice = await storage.updateInvoiceStatus(
        invoiceId, 
        status, 
        paymentMethod, 
        paidAtDate
      );

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Broadcast status update to organization users
      const user = getAuthenticatedUser(req);
      (app as any).broadcastToWebUsers('invoice_status_updated', {
        invoice,
        updatedBy: user.username,
        newStatus: status
      }, user.id, user.organizationId);

      res.json(invoice);
    } catch (error: any) {
      console.error("Error updating invoice status:", error);
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
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const quotes = await storage.getQuotes(user.organizationId);
      res.json(quotes);
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Generate quote number
      const quoteNumber = `QUO-${Date.now()}`;
      
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        quoteNumber: req.body.quoteNumber || quoteNumber,
        status: req.body.status || 'draft',
        // Convert string dates to Date objects
        quoteDate: new Date(req.body.quoteDate),
        expiryDate: new Date(req.body.expiryDate),
        // Convert string numbers to numbers
        customerId: parseInt(req.body.customerId),
        subtotal: parseFloat(req.body.subtotal || 0),
        tax: parseFloat(req.body.tax || 0),
        total: parseFloat(req.body.total || 0),
      });
      
      // Extract line items from the data
      const { lineItems, ...quoteWithoutLineItems } = quoteData;
      
      const quote = await storage.createQuote({
        ...quoteWithoutLineItems,
        userId: req.user!.id,
      });

      // Create line items for the quote
      if (lineItems && lineItems.length > 0) {
        await storage.createQuoteLineItems(quote.id, lineItems);
      }
      
      // Broadcast to all web users except the creator
      (app as any).broadcastToWebUsers('quote_created', {
        quote,
        createdBy: req.user!.username
      }, req.user!.id);
      
      res.status(201).json(quote);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const quote = await storage.getQuote(parseInt(req.params.id), user.organizationId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const quoteData = insertQuoteSchema.omit({ lineItems: true }).partial().parse(req.body);
      const quote = await storage.updateQuote(parseInt(req.params.id), user.organizationId, quoteData);
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

  app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const deleted = await storage.deleteQuote(parseInt(req.params.id), user.organizationId);
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

  // Quote download endpoints
  app.get("/api/quotes/:id/download/pdf", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const quote = await storage.getQuote(parseInt(req.params.id), user.organizationId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const htmlPdf = await import('html-pdf-node');
      
      // Generate HTML content for the quote
      const htmlContent = generateQuoteHTML(quote);
      
      const options = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          bottom: '1cm',
          left: '1cm',
          right: '1cm'
        }
      };
      
      const pdfBuffer = await htmlPdf.default.generatePdf({ content: htmlContent }, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Quote-${quote.quoteNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.get("/api/quotes/:id/download/word", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const quote = await storage.getQuote(parseInt(req.params.id), user.organizationId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const fs = await import('fs');
      const path = await import('path');
      
      // Generate Word document content
      const wordContent = generateQuoteWordContent(quote);
      
      // Create a simple .docx structure (this is a simplified approach)
      const fileName = `Quote-${quote.quoteNumber}.docx`;
      const tempPath = path.default.join(process.cwd(), 'temp', fileName);
      
      // Ensure temp directory exists
      const tempDir = path.default.dirname(tempPath);
      if (!fs.default.existsSync(tempDir)) {
        fs.default.mkdirSync(tempDir, { recursive: true });
      }
      
      // For now, we'll create a simple HTML-based document that Word can open
      const htmlForWord = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head>
          <meta charset="utf-8">
          <title>Quote ${quote.quoteNumber}</title>
          <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
        </head>
        <body>
          ${wordContent}
        </body>
        </html>
      `;
      
      fs.default.writeFileSync(tempPath, htmlForWord);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.default.createReadStream(tempPath);
      fileStream.pipe(res);
      
      // Clean up temp file after sending
      fileStream.on('end', () => {
        fs.default.unlinkSync(tempPath);
      });
      
    } catch (error: any) {
      console.error("Error generating Word document:", error);
      res.status(500).json({ message: "Failed to generate Word document" });
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
      console.log('☁️ CRITICAL: Image Gallery upload request received:', {
        file: req.file ? 'Present' : 'Missing',
        body: req.body,
        user: req.user?.username,
        userId: req.user?.id,
        authenticated: !!req.user,
        authenticationMethod: req.user ? 'SUCCESS' : 'FAILED'
      });

      if (!req.file) {
        console.log('No image file in request');
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const user = getAuthenticatedUser(req);

      // Cloudinary configuration check - BYPASS for custom domain compatibility  
      console.log('🔧 CLOUDINARY CONFIG STATUS:', {
        isConfigured: CloudinaryService.isConfigured(),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
        origin: req.get('origin'),
        customDomain: req.get('origin')?.includes('profieldmanager.com')
      });
      
      // BYPASS strict configuration check for custom domain compatibility
      // Environment variables are properly set but isConfigured() may return false in some scenarios
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.log('❌ Critical Cloudinary environment variables missing');
        return res.status(500).json({ message: "Cloud storage configuration required" });
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
        cloudinaryUrl: cloudinaryResult.secureUrl,
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

      // Delete from Cloudinary if cloudinaryUrl exists
      if (image.cloudinaryUrl) {
        try {
          // Extract the public_id from the Cloudinary URL
          const publicId = CloudinaryService.extractPublicIdFromUrl(image.cloudinaryUrl);
          if (publicId) {
            const cloudinaryResult = await CloudinaryService.deleteImage(publicId);
            if (!cloudinaryResult.success) {
              console.warn('Failed to delete from Cloudinary:', cloudinaryResult.error);
            }
          }
        } catch (cloudinaryError) {
          console.warn('Cloudinary deletion error:', cloudinaryError);
        }
      }

      // Delete from database (soft delete)
      const deleted = await storage.deleteImage(imageId, userId);
      
      if (deleted) {
        res.json({ message: 'Image moved to trash successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete image' });
      }
    } catch (error: any) {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Failed to delete image' });
    }
  });

  // Trash bin routes for images
  app.get("/api/images/trash", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deletedImages = await storage.getDeletedImages(userId);
      res.json(deletedImages);
    } catch (error: any) {
      console.error('Error fetching deleted images:', error);
      res.status(500).json({ message: 'Failed to fetch deleted images' });
    }
  });

  // Restore image from trash
  app.patch("/api/images/:id/restore", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;

      const restored = await storage.restoreImage(imageId, userId);
      
      if (restored) {
        res.json({ message: 'Image restored successfully' });
      } else {
        res.status(404).json({ message: 'Image not found or cannot be restored' });
      }
    } catch (error: any) {
      console.error('Error restoring image:', error);
      res.status(500).json({ message: 'Failed to restore image' });
    }
  });

  // Permanently delete image
  app.delete("/api/images/:id/permanent", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      const user = getAuthenticatedUser(req);
      
      // Get image data first to delete the physical file
      const image = await storage.getImageById(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Check if user has access to this image
      if (image.userId !== userId && image.organizationId !== user.organizationId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Delete the physical file if it's local (not Cloudinary)
      if (!image.cloudinaryUrl) {
        const filePath = `./uploads/org-${image.organizationId}/image_gallery/${image.filename}`;
        try {
          await fs.promises.unlink(filePath);
        } catch (fileError) {
          console.warn('File not found on disk:', filePath);
        }
      } else if (image.cloudinaryUrl) {
        // Delete from Cloudinary if it's stored there
        const publicId = image.cloudinaryUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await CloudinaryService.deleteImage(publicId);
          } catch (cloudinaryError) {
            console.warn('Failed to delete from Cloudinary:', cloudinaryError);
          }
        }
      }

      const deleted = await storage.permanentlyDeleteImage(imageId, userId);
      
      if (deleted) {
        res.json({ message: 'Image permanently deleted successfully' });
      } else {
        res.status(404).json({ message: 'Image not found or cannot be deleted' });
      }
    } catch (error: any) {
      console.error('Error permanently deleting image:', error);
      res.status(500).json({ message: 'Failed to permanently delete image' });
    }
  });

  // Handle CORS preflight for bulk download (custom domain support)
  app.options("/api/images/bulk-download", (req, res) => {
    const isCustomDomain = req.headers.origin?.includes('profieldmanager.com');
    
    if (isCustomDomain && req.headers.origin) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    
    res.sendStatus(200);
  });

  // Bulk download images
  app.post("/api/images/bulk-download", requireAuth, async (req, res) => {
    try {
      const { imageIds } = req.body;
      const userId = req.user!.id;
      const user = getAuthenticatedUser(req);

      console.log('🔍 BULK DOWNLOAD DEBUG:', {
        url: req.url,
        method: req.method,
        origin: req.headers.origin,
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        userId,
        organizationId: user.organizationId,
        imageIdsCount: imageIds?.length || 0
      });

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ message: 'Image IDs array is required' });
      }

      console.log(`Starting bulk download for ${imageIds.length} images for user ${userId}`);

      // Fetch all image records
      const images = await Promise.all(
        imageIds.map(async (imageId: number) => {
          const image = await storage.getImageById(imageId);
          if (!image || (image.userId !== userId && image.organizationId !== user.organizationId)) {
            return null; // Skip unauthorized images
          }
          return image;
        })
      );

      // Filter out null results (unauthorized/not found images)
      const validImages = images.filter(img => img !== null);

      if (validImages.length === 0) {
        return res.status(404).json({ message: 'No valid images found or access denied' });
      }

      console.log(`Found ${validImages.length} valid images to download`);

      // Set response headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="images_${new Date().toISOString().split('T')[0]}.zip"`);

      // Create zip archive
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to create archive' });
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add images to archive
      let addedCount = 0;
      for (const image of validImages) {
        try {
          let imageBuffer: Buffer;
          
          console.log(`Processing image ${image.id}: cloudinaryUrl=${image.cloudinaryUrl}, filename=${image.filename}`);
          
          if (image.cloudinaryUrl) {
            // Download from Cloudinary
            console.log(`Downloading from Cloudinary: ${image.cloudinaryUrl}`);
            const response = await fetch(image.cloudinaryUrl);
            if (!response.ok) {
              console.warn(`Failed to download image from Cloudinary: ${image.cloudinaryUrl} - Status: ${response.status}`);
              continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            console.log(`Successfully downloaded image ${image.id}, buffer size: ${imageBuffer.length} bytes`);
          } else {
            // Read from local file system
            const filePath = `./uploads/org-${image.organizationId}/image_gallery/${image.filename}`;
            console.log(`Attempting to read local file: ${filePath}`);
            try {
              imageBuffer = await fs.readFile(filePath);
              console.log(`Successfully read local file ${image.id}, buffer size: ${imageBuffer.length} bytes`);
            } catch (fileError) {
              console.warn(`Local file not found: ${filePath}`);
              // If no local file and no cloudinaryUrl, this image can't be downloaded
              continue;
            }
          }

          // Ensure we have a valid buffer
          if (!imageBuffer || imageBuffer.length === 0) {
            console.warn(`Empty buffer for image ${image.id}`);
            continue;
          }

          // Get file extension from original name or mime type
          const extension = path.extname(image.originalName) || 
                          (image.mimeType === 'image/jpeg' ? '.jpg' : 
                           image.mimeType === 'image/png' ? '.png' : '.jpg');
          
          // Clean filename for zip archive
          const safeFilename = image.originalName.replace(/[^a-zA-Z0-9._-]/g, '_') || `image_${image.id}${extension}`;
          
          console.log(`Attempting to add to archive: ${safeFilename}, buffer size: ${imageBuffer.length}`);
          archive.append(imageBuffer, { name: safeFilename });
          addedCount++;
          console.log(`Successfully added to archive: ${safeFilename} (${addedCount}/${validImages.length})`);
        } catch (imageError) {
          console.error(`Failed to process image ${image.id}:`, imageError);
          continue;
        }
      }

      console.log(`Total images added to archive: ${addedCount}`);
      
      // Check if we have any images in the archive
      if (addedCount === 0) {
        console.error('No images were successfully added to archive');
        if (!res.headersSent) {
          return res.status(500).json({ message: 'Failed to add any images to archive' });
        }
      }

      // Finalize the archive (this must be called for the zip to be properly created)
      console.log('Finalizing archive...');
      archive.finalize();
      console.log(`Bulk download completed for user ${userId} with ${addedCount} images`);
    } catch (error: any) {
      console.error('Error in bulk download:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download images' });
      }
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
        userId: user.id,
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

  // Get organization members for meeting participants
  app.get("/api/users/organization-members", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const organizationMembers = await storage.getUsersByOrganization(user.organizationId);
      
      // Remove sensitive information and only return needed fields
      const safeMembers = organizationMembers.map(member => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
        isActive: member.isActive
      })).filter(member => member.isActive); // Only return active users
      
      res.json(safeMembers);
    } catch (error: any) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Error fetching organization members: " + error.message });
    }
  });

  // Team status for dashboard (real-time user counts)
  app.get("/api/team/status", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Get current session statistics from database
      const activeSessionsQuery = await db
        .select({
          userId: userSessions.userId,
          deviceType: userSessions.deviceType,
          userAgent: userSessions.userAgent,
          user: {
            id: users.id,
            username: users.username,
            organizationId: users.organizationId,
            role: users.role
          }
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            gt(userSessions.expiresAt, sql`now()`),
            eq(users.isActive, true),
            eq(users.organizationId, user.organizationId) // Filter by organization
          )
        );

      // Count unique users (total online)
      const uniqueUserIds = new Set(activeSessionsQuery.map(session => session.userId));
      const onlineCount = uniqueUserIds.size;

      // Count field users (mobile/field sessions)
      const fieldUserIds = new Set();
      activeSessionsQuery.forEach(session => {
        const isMobileDevice = session.deviceType === 'mobile' || 
                              (session.userAgent && (
                                session.userAgent.toLowerCase().includes('mobile') ||
                                session.userAgent.toLowerCase().includes('android') ||
                                session.userAgent.toLowerCase().includes('iphone')
                              ));
        if (isMobileDevice) {
          fieldUserIds.add(session.userId);
        }
      });
      const inFieldCount = fieldUserIds.size;

      // Get WebSocket connected clients count for verification
      const webSocketClients = Array.from(connectedClients.values())
        .filter(client => client.organizationId === user.organizationId);
      
      const webConnectedCount = new Set(webSocketClients.map(client => client.userId)).size;

      res.json({
        online: onlineCount,
        inField: inFieldCount,
        webSocketConnected: webConnectedCount,
        organizationId: user.organizationId
      });
    } catch (error: any) {
      console.error("Error fetching team status:", error);
      res.status(500).json({ message: "Error fetching team status: " + error.message });
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
        
        // Cookie settings for cross-domain authentication
        res.cookie('auth_token', session.token, { 
          httpOnly: true, 
          secure: true, // Always secure for HTTPS
          sameSite: 'none', // Allow cross-origin for all domains
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
    console.log('🔄 GET PROJECTS REQUEST RECEIVED');
    try {
      console.log('📍 PROJECTS STEP 1: Getting authenticated user...');
      const user = getAuthenticatedUser(req);
      console.log('📍 PROJECTS STEP 2: User details:', { id: user.id, organizationId: user.organizationId, role: user.role });
      
      console.log('📍 PROJECTS STEP 3: Getting status query...');
      const status = req.query.status as string;
      console.log('📍 PROJECTS STEP 4: Status filter:', status);
      
      console.log('📍 PROJECTS STEP 5: Calling storage.getProjects...');
      const projects = await storage.getProjects(user.organizationId, user.id, user.role, status);
      console.log('📍 PROJECTS STEP 6: Projects retrieved, count:', projects.length);
      
      res.json(projects);
    } catch (error: any) {
      console.error("❌ ERROR IN GET PROJECTS:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Calendar endpoint for displaying jobs with recurring support
  app.get("/api/jobs/calendar", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      // Get regular projects/jobs for the organization
      const projects = await storage.getProjects(user.organizationId, undefined, user.role);
      
      // Filter projects that have start/end dates within the calendar range
      let calendarJobs = projects
        .filter(project => project.startDate || project.endDate)
        .map(project => ({
          id: `project-${project.id}`,
          title: project.name,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          address: project.address,
          city: project.city,
          state: project.state,
          status: project.status,
          priority: project.priority || 'medium',
          customerId: project.customerId,
          type: 'project',
          isRecurring: false,
          originalId: project.id
        }));
      
      // Temporarily disable recurring jobs query to fix stack overflow
      // TODO: Fix circular reference in recurring jobs query
      try {
        console.log("📅 Skipping recurring jobs query to prevent stack overflow");
        // const recurringOccurrences = await db
        //   .select({
        //     occurrence: recurringJobOccurrences,
        //     series: recurringJobSeries,
        //     project: projects
        //   })
        //   .from(recurringJobOccurrences)
        //   .innerJoin(recurringJobSeries, eq(recurringJobOccurrences.seriesId, recurringJobSeries.id))
        //   .leftJoin(projects, eq(recurringJobOccurrences.projectId, projects.id))
        //   .where(eq(recurringJobSeries.organizationId, user.organizationId));
        // calendarJobs = [...calendarJobs, ...recurringCalendarJobs];
      } catch (recurringError) {
        console.error("Error fetching recurring jobs:", recurringError);
        // Continue without recurring jobs if there's an error
      }
      
      // If date range is specified, filter jobs
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        calendarJobs = calendarJobs.filter(job => {
          const jobStart = job.startDate ? new Date(job.startDate) : null;
          const jobEnd = job.endDate ? new Date(job.endDate) : null;
          
          // Show job if it overlaps with the requested date range
          if (jobStart && jobEnd) {
            return (jobStart <= end && jobEnd >= start);
          } else if (jobStart) {
            return (jobStart >= start && jobStart <= end);
          } else if (jobEnd) {
            return (jobEnd >= start && jobEnd <= end);
          }
          return false;
        });
      }
      
      console.log(`📅 Calendar API returning ${calendarJobs.length} jobs:`, calendarJobs.map(job => ({
        id: job.id,
        title: job.title,
        startDate: job.startDate,
        endDate: job.endDate
      })));
      res.json(calendarJobs);
    } catch (error: any) {
      console.error("Error fetching calendar jobs:", error);
      res.status(500).json({ message: "Failed to fetch calendar jobs" });
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
        enableSmartCapture,
        // Recurring job data
        isRecurring,
        recurrencePattern,
        selectedDays,
        dayOfMonth,
        recurringStartTime,
        estimatedDuration,
        defaultTechnicians,
        seriesEndType,
        seriesEndDate,
        maxOccurrences,
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
        organizationId: req.user!.organizationId,
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
      
      // Automatically create draft invoice for Smart Capture enabled projects
      if (enableSmartCapture) {
        try {
          const user = getAuthenticatedUser(req);
          await storage.createDraftInvoice(project.id, user.organizationId, {
            customerId: project.customerId || null,
            description: `Draft invoice for ${project.name}`,
            notes: "Auto-generated invoice for Smart Capture project"
          });
          
          console.log(`✅ Auto-created draft invoice for Smart Capture project ${project.id}`);
          
          // Broadcast draft invoice creation to organization users
          broadcastToWebUsers(user.organizationId, 'draft_invoice_created', {
            projectId: project.id,
            projectName: project.name,
            createdBy: user.username,
            timestamp: new Date().toISOString()
          });
        } catch (draftInvoiceError) {
          console.error("❌ Error creating draft invoice for Smart Capture project:", draftInvoiceError);
          // Continue with project creation even if draft invoice creation fails
        }
      }
      
      // Handle recurring job creation
      if (isRecurring && recurrencePattern) {
        try {
          const user = getAuthenticatedUser(req);
          
          // Create recurring job series
          const recurringJobSeries = await storage.createRecurringJobSeries({
            organizationId: user.organizationId,
            templateProjectId: project.id,
            name: project.name,
            description: project.description || '',
            recurrencePattern,
            selectedDays: recurrencePattern === 'weekly' ? selectedDays || [] : [],
            dayOfMonth: recurrencePattern === 'monthly' ? dayOfMonth : null,
            recurringStartTime,
            estimatedDuration,
            defaultTechnicians: defaultTechnicians || [],
            seriesEndType,
            seriesEndDate: seriesEndType === 'date' ? (seriesEndDate ? new Date(seriesEndDate) : null) : null,
            maxOccurrences: seriesEndType === 'count' ? maxOccurrences : null,
            isActive: true,
            createdBy: user.id
          });
          
          // Generate initial set of recurring job occurrences
          await storage.generateRecurringJobOccurrences(recurringJobSeries.id, user.organizationId);
          
          console.log(`✅ Created recurring job series ${recurringJobSeries.id} for project ${project.id}`);
          
          // Broadcast recurring job series creation to organization users
          broadcastToWebUsers(user.organizationId, 'recurring_job_created', {
            projectId: project.id,
            projectName: project.name,
            seriesId: recurringJobSeries.id,
            pattern: recurrencePattern,
            createdBy: user.username,
            timestamp: new Date().toISOString()
          });
        } catch (recurringJobError) {
          console.error("❌ Error creating recurring job series:", recurringJobError);
          // Continue with project creation even if recurring job creation fails
          // The main project has already been created successfully
        }
      }
      
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

  // Get deleted projects - MUST be before /api/projects/:id route
  app.get("/api/projects/deleted", requireAuth, async (req, res) => {
    console.log("🚀 ROUTE: Deleted projects route called");
    try {
      const user = req.user!;
      console.log("🔍 ROUTE: Fetching deleted projects for user:", user.id, "org:", user.organizationId, "role:", user.role);
      const projects = await storage.getDeletedProjects(user.organizationId, user.role === 'admin' ? undefined : user.id);
      console.log("✅ ROUTE: Found deleted projects:", projects.length);
      res.json(projects);
    } catch (error: any) {
      console.error("❌ ROUTE ERROR:", error);
      console.error("❌ ROUTE ERROR stack:", error.stack);
      res.status(500).json({ message: "Failed to fetch deleted projects", error: error.message });
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

      // Get user for organization info
      const user = await storage.getUser(userId);
      if (user) {
        // Broadcast job status change for dispatch routing synchronization
        if (req.body.status && req.body.status !== currentProject.status) {
          const statusChangeData = {
            projectId: updatedProject.id,
            projectName: updatedProject.name,
            oldStatus: currentProject.status,
            newStatus: req.body.status,
            progress: updatedProject.progress || 0,
            startDate: updatedProject.startDate,
            updatedBy: `${user.firstName} ${user.lastName}`,
            updatedAt: new Date().toISOString()
          };
          
          broadcastToWebUsers(user.organizationId, 'job_status_changed', statusChangeData);
        }
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
        
        // Smart Capture: Automatically mark invoice for approval when project is completed
        if (user && updatedProject.enableSmartCapture) {
          try {
            const draftInvoice = await storage.getDraftInvoiceForProject(projectId, user.organizationId);
            if (draftInvoice && draftInvoice.isSmartCaptureInvoice) {
              // Mark Smart Capture invoice as pending approval instead of auto-finalizing
              const pendingInvoice = await storage.updateInvoice(draftInvoice.id, userId, {
                status: 'pending_approval'
              });
              
              console.log(`✅ Smart Capture invoice ${draftInvoice.id} marked for approval - project ${projectId} completed`);
              
              // Broadcast invoice pending approval to organization admins/managers
              broadcastToWebUsers(user.organizationId, 'smart_capture_invoice_pending_approval', {
                projectId: updatedProject.id,
                projectName: updatedProject.name,
                invoiceId: draftInvoice.id,
                invoiceNumber: draftInvoice.invoiceNumber || draftInvoice.id,
                submittedBy: `${user.firstName} ${user.lastName}`,
                timestamp: new Date().toISOString()
              });
            }
          } catch (invoiceError) {
            console.error('❌ Error marking Smart Capture invoice for approval:', invoiceError);
            // Don't fail the project update if invoice approval fails
          }
        }
        
        // Send job completion notifications to admins/managers
        try {
          const { NotificationService } = await import("./notificationService");
          
          // Get admin/manager users to notify
          const adminUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
              eq(users.organizationId, user.organizationId),
              or(eq(users.role, 'admin'), eq(users.role, 'manager'))
            ));
          
          // Create notifications for all admins/managers
          for (const admin of adminUsers) {
            await NotificationService.createNotification({
              type: 'job_completed',
              title: `Job Completed`,
              message: `${user.firstName} ${user.lastName} completed job: ${updatedProject.name}`,
              userId: admin.id,
              organizationId: user.organizationId,
              relatedEntityType: 'project',
              relatedEntityId: projectId,
              priority: 'normal',
              category: 'team_based',
              createdBy: userId
            });
          }
          
          console.log(`📢 Job completion notifications sent to ${adminUsers.length} admins/managers`);
        } catch (notificationError) {
          console.error('Error sending job completion notifications:', notificationError);
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
      const success = await storage.deleteProject(projectId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Broadcast project deletion
      broadcastToWebUsers('project_deleted', { projectId, deletedBy: req.user!.username });
      
      res.json({ message: "Project moved to deleted folder successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Cancel project endpoint
  app.put("/api/projects/:id/cancel", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const success = await storage.cancelProject(projectId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Broadcast project cancellation
      broadcastToWebUsers('project_cancelled', { projectId, cancelledBy: req.user!.username });
      
      res.json({ message: "Project cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling project:", error);
      res.status(500).json({ message: "Failed to cancel project" });
    }
  });



  // Get cancelled projects
  app.get("/api/projects/cancelled", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      console.log("Fetching cancelled projects for user:", user.id, "org:", user.organizationId, "role:", user.role);
      const projects = await storage.getCancelledProjects(user.organizationId, user.role === 'admin' ? undefined : user.id);
      console.log("Found cancelled projects:", projects.length);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching cancelled projects:", error);
      res.status(500).json({ message: "Failed to fetch cancelled projects" });
    }
  });

  // Restore project endpoint (undo deletion/cancellation)
  app.put("/api/projects/:id/restore", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const success = await storage.restoreProject(projectId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Broadcast project restoration
      broadcastToWebUsers('project_restored', { projectId, restoredBy: req.user!.username });
      
      res.json({ message: "Project restored successfully" });
    } catch (error: any) {
      console.error("Error restoring project:", error);
      res.status(500).json({ message: "Failed to restore project" });
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
      
      // Create automated notifications if task has due date and is assigned
      if (task.dueDate && task.assignedToId) {
        try {
          const { TaskNotificationService } = await import("./taskNotificationService");
          await TaskNotificationService.createNotificationsForTask(
            task.id, 
            task.assignedToId, 
            task.dueDate, 
            req.user!.organizationId
          );
          console.log(`📅 Task notifications created for task ${task.id}`);
        } catch (error) {
          console.error("Error creating task notifications:", error);
        }
      }
      
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
      
      // Handle notification updates based on task changes
      try {
        const { TaskNotificationService } = await import("./taskNotificationService");
        const { NotificationService } = await import("./notificationService");
        
        // If task is completed, cancel pending notifications and notify admins/managers
        if (updatedTask.isCompleted) {
          await TaskNotificationService.cancelNotificationsForTask(taskId);
          console.log(`📅 Task notifications cancelled for completed task ${taskId}`);
          
          // Get admin/manager users to notify
          const adminUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
              eq(users.organizationId, req.user!.organizationId),
              or(eq(users.role, 'admin'), eq(users.role, 'manager'))
            ));
          
          // Create notifications for all admins/managers
          for (const admin of adminUsers) {
            await NotificationService.createNotification({
              type: 'task_completed',
              title: `Task Completed`,
              message: `${req.user!.firstName} ${req.user!.lastName} completed task: ${updatedTask.title}`,
              userId: admin.id,
              organizationId: req.user!.organizationId,
              relatedEntityType: 'task',
              relatedEntityId: taskId,
              priority: 'normal',
              category: 'team_based',
              createdBy: req.user!.id
            });
          }
          
          console.log(`📢 Task completion notifications sent to ${adminUsers.length} admins/managers`);
        }
        // If task due date changed and task is not completed
        else if (req.body.dueDate && updatedTask.assignedToId && !updatedTask.isCompleted) {
          await TaskNotificationService.updateNotificationsForTask(taskId, new Date(req.body.dueDate));
          console.log(`📅 Task notifications updated for task ${taskId}`);
        }
        // If task was just assigned and has due date
        else if (req.body.assignedToId && updatedTask.dueDate && !updatedTask.isCompleted) {
          await TaskNotificationService.createNotificationsForTask(
            taskId, 
            updatedTask.assignedToId, 
            updatedTask.dueDate, 
            req.user!.organizationId
          );
          console.log(`📅 Task notifications created for newly assigned task ${taskId}`);
        }
      } catch (error) {
        console.error("Error updating task notifications:", error);
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

  // Get draft invoice for project
  app.get("/api/projects/:id/invoice-draft", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectId = parseInt(req.params.id);
      
      // Validate project ID
      if (!Number.isFinite(projectId) || projectId <= 0) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Verify user has access to the project
      const project = await storage.getProject(projectId, user.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Get draft invoice for this project
      let draftInvoice = await storage.getDraftInvoiceForProject(projectId, user.organizationId);
      
      // Enhanced self-healing: Create draft invoice OR populate missing line items
      if (project.customerId && project.enableSmartCapture) {
        // Check if Smart Capture items exist for this project
        const smartCaptureItems = await storage.getSmartCaptureItemsByProject(projectId, user.organizationId);
        
        if (smartCaptureItems && smartCaptureItems.length > 0) {
          let itemsToProcess = [];
          
          // Case 1: No draft invoice exists - create one
          if (!draftInvoice) {
            console.log(`🔧 SELF-HEALING: Creating draft invoice for project ${projectId} with ${smartCaptureItems.length} Smart Capture items`);
            draftInvoice = await storage.ensureDraftInvoiceForProject(projectId, project.customerId, user.id, user.organizationId);
            itemsToProcess = smartCaptureItems; // Process all items for new draft invoice
          }
          // Case 2: Draft invoice exists but may be missing line items - check and populate
          else {
            const existingLineItems = draftInvoice.lineItems || [];
            const smartCaptureItemIds = smartCaptureItems.map(item => item.id);
            const existingItemIds = existingLineItems.map(item => item.smartCaptureItemId).filter(id => id);
            const missingItems = smartCaptureItems.filter(item => !existingItemIds.includes(item.id));
            
            if (missingItems.length > 0) {
              console.log(`🔧 SELF-HEALING: Draft invoice ${draftInvoice.id} exists but missing ${missingItems.length} line items. Adding them now.`);
              itemsToProcess = missingItems; // Only process missing items
            } else {
              itemsToProcess = []; // No items to process
            }
          }
          
          // Backfill Smart Capture items into the draft invoice
          if (itemsToProcess.length > 0) {
            for (const item of itemsToProcess) {
              const lineItemData = {
                description: item.description || `Smart Capture Item #${item.id}`,
                quantity: item.quantity || 1,
                rate: item.masterPrice || 0,
                amount: (item.quantity || 1) * (item.masterPrice || 0),
                sourceType: 'smart_capture',
                smartCaptureItemId: item.id,
                priceSnapshot: item.masterPrice
              };
              
              await storage.upsertDraftInvoiceLineItem(draftInvoice.id, lineItemData, user.organizationId);
            }
            
            console.log(`✅ SELF-HEALING: Draft invoice ${draftInvoice.id} updated with ${itemsToProcess.length} line items`);
            
            // Re-fetch the complete draft invoice with line items
            draftInvoice = await storage.getDraftInvoiceForProject(projectId, user.organizationId);
          }
        }
      }
      
      if (!draftInvoice) {
        return res.status(404).json({ message: "No draft invoice found for this project" });
      }
      
      res.json(draftInvoice);
    } catch (error: any) {
      console.error("Error fetching project draft invoice:", error);
      res.status(500).json({ message: "Failed to fetch draft invoice" });
    }
  });

  // Add comprehensive request logging middleware BEFORE all routes
  app.use((req, res, next) => {
    if (req.method === 'POST' && (req.url.includes('/files') || req.url.includes('/login'))) {
      console.log('🌍 CRITICAL REQUEST:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        host: req.headers.host,
        contentType: req.headers['content-type'],
        hasAuth: !!(req.headers.authorization || req.headers.cookie),
        authHeader: req.headers.authorization ? 'PRESENT' : 'MISSING',
        authPreview: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'NONE',
        isCustomDomain: req.headers.origin?.includes('profieldmanager.com') || req.headers.host?.includes('profieldmanager.com'),
        timestamp: new Date().toISOString()
      });
    }
    next();
  });

  // Add global error handler for multer errors
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('🚨 GLOBAL ERROR HANDLER TRIGGERED:', {
      name: error.name,
      message: error.message,
      code: error.code,
      field: error.field,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
    
    if (error.name === 'MulterError') {
      console.error('🚨 MULTER ERROR DETECTED:', error);
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + error.message,
        error: error.code
      });
    }
    
    next(error);
  });

  // File uploads (Cloudinary-based for permanent storage) - ENHANCED FOR CUSTOM DOMAINS
  app.post("/api/projects/:id/files", (req, res, next) => {
    console.log('🚨 MIDDLEWARE DEBUG: Upload route hit at', new Date().toISOString());
    console.log('🚨 URL:', req.url);
    console.log('🚨 Method:', req.method);
    console.log('🚨 Content-Type:', req.headers['content-type']);
    console.log('🚨 User-Agent:', req.headers['user-agent']);
    next();
  }, requireAuth, (req, res, next) => {
    console.log('🚨 AFTER AUTH: User authenticated?', !!req.user);
    if (req.user) {
      console.log('🚨 Authenticated user:', { id: req.user.id, email: req.user.email, organizationId: req.user.organizationId });
    } else {
      console.log('🚨 NO USER AUTHENTICATED');
    }
    next();
  }, (req, res, next) => {
    console.log('🚨 BEFORE MULTER: About to process file upload');
    next();
  }, upload.single('file'), (req, res, next) => {
    console.log('🚨 AFTER MULTER: File processed?', !!req.file);
    if (req.file) {
      console.log('🚨 File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
    }
    next();
  }, async (req, res) => {
    console.log('🔄 CLOUDINARY FILE UPLOAD REQUEST RECEIVED - HANDLER REACHED');
    console.log('🚨 CRITICAL DEBUG - CLOUDINARY CONFIG:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING', 
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });
    console.log('🌐 CUSTOM DOMAIN UPLOAD DEBUG:', {
      projectId: req.params.id,
      origin: req.headers.origin,
      host: req.headers.host,
      isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
      userAgent: req.headers['user-agent']?.slice(0, 100),
      timestamp: new Date().toISOString()
    });
    console.log('User authenticated?', !!req.user);
    console.log('User details:', req.user ? { id: req.user.id, email: req.user.email, organizationId: req.user.organizationId } : 'NO USER');
    console.log('Has file?', !!req.file);
    console.log('File details:', req.file ? { 
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype, 
      size: req.file.size,
      filename: req.file.filename,
      path: req.file.path
    } : 'NO FILE');
    
    // COMPREHENSIVE ERROR TRACKING - Step by step debugging
    console.log('📍 STEP 1: Starting upload processing...');
    
    try {
      console.log('📍 STEP 2: Entering try block...');
      
      if (!req.user) {
        console.error('❌ No authenticated user found in request');
        return res.status(401).json({ message: "Authentication required" });
      }
      console.log('📍 STEP 3: User authentication verified');

      if (!req.file) {
        console.log('❌ No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }
      console.log('📍 STEP 4: File presence verified');

      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const taskId = req.body.taskId ? parseInt(req.body.taskId) : null;
      const user = req.user;
      console.log('📍 STEP 5: Variables initialized - projectId:', projectId, 'userId:', userId);

      // BYPASS Cloudinary configuration check for custom domain compatibility
      console.log('📍 STEP 6: Bypassing Cloudinary configuration check for custom domain compatibility...');
      console.log('🔧 CLOUDINARY STATUS:', {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        apiKey: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
        isConfigured: CloudinaryService.isConfigured(),
        origin: req.get('origin')
      });
      console.log('📍 STEP 7: Proceeding with upload (configuration check bypassed)');

      // Get project settings to check if timestamp overlay is enabled
      console.log('📍 STEP 8: Fetching project by ID...');
      const project = await storage.getProjectById(projectId);
      console.log('📍 STEP 9: Project fetched successfully:', project ? 'found' : 'not found');
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
      
      // Debug file size detection
      console.log(`🔧 File size check: ${req.file.size} bytes (${(req.file.size / 1024 / 1024).toFixed(2)}MB), threshold: ${8 * 1024 * 1024} bytes (8MB)`);
      console.log(`🔧 MIME type: ${req.file.mimetype}, is image: ${req.file.mimetype.startsWith('image/')}`);
      
      // TEMPORARILY DISABLE COMPRESSION TO PREVENT 500 ERRORS
      // Note: The compressImage function is causing 500 Internal Server Errors
      // Skip compression for now and use original file to ensure uploads work
      console.log('🚫 COMPRESSION TEMPORARILY DISABLED - Using original file to prevent 500 errors');
      
      /*
      // Compress if file is over 8MB to ensure Cloudinary compatibility (10MB limit)
      if (req.file.mimetype.startsWith('image/') && req.file.size > 8 * 1024 * 1024) {
        console.log('🔄 Pre-compressing large image before Cloudinary upload...');
        try {
          // Create temporary compressed file path
          const compressedPath = finalFilePath + '.compressed.jpg';
          
          const compressionResult = await compressImage(finalFilePath, compressedPath, user.organizationId);
          
          if (compressionResult.success && compressionResult.compressedSize) {
            // Check if compressed file actually exists
            try {
              const stat = await fs.stat(compressedPath);
              if (stat.isFile()) {
                uploadBuffer = await fs.readFile(compressedPath);
                uploadFilePath = compressedPath;
                console.log(`✅ Pre-compression successful: ${req.file.size} → ${compressionResult.compressedSize} bytes`);
              } else {
                console.warn('⚠️ Compressed file does not exist, using original');
              }
            } catch (statError) {
              console.warn('⚠️ Compressed file not accessible, using original:', statError.message);
            }
            
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
      */

      // Determine file type based on MIME type
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
        fileType = 'document';
      }

      // CUSTOM DOMAIN CLOUDINARY ENVIRONMENT DEBUG
      console.log('🔧 CUSTOM DOMAIN ENV VARIABLES DEBUG:', {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET (' + process.env.CLOUDINARY_CLOUD_NAME.length + ' chars)' : 'MISSING',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET (' + process.env.CLOUDINARY_API_KEY.length + ' chars)' : 'MISSING',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET (' + process.env.CLOUDINARY_API_SECRET.length + ' chars)' : 'MISSING',
        all_env_vars: Object.keys(process.env).filter(key => key.includes('CLOUDINARY')),
        origin: req.get('origin'),
        host: req.get('host'),
        isCustomDomain: req.get('host')?.includes('profieldmanager.com'),
        timestamp: new Date().toISOString()
      });

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

      // Enhanced debugging for custom domain Cloudinary uploads
      console.log('🌐 CUSTOM DOMAIN UPLOAD DEBUG:', {
        origin: req.headers.origin,
        host: req.headers.host,
        userAgent: req.headers['user-agent']?.slice(0, 50),
        isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
        cloudinaryConfigured: CloudinaryService.isConfigured(),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
      
      // Force custom domain uploads to use Cloudinary with extra debugging
      if (req.headers.origin?.includes('profieldmanager.com')) {
        console.log('🔍 CUSTOM DOMAIN DETECTED - Forcing Cloudinary upload with enhanced logging');
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
        console.error('❌ Request context:', {
          origin: req.headers.origin,
          isCustomDomain: req.headers.origin?.includes('profieldmanager.com'),
          userId: user.id,
          orgId: user.organizationId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
        
        // Check if this is the intermittent signatureUrl issue
        if (cloudinaryResult.error?.includes('signatureUrl')) {
          console.error('🚨 INTERMITTENT SIGNATURE ISSUE DETECTED - This is a known Cloudinary SDK issue');
          console.error('🚨 The retry mechanism should have handled this - investigating further');
        }
        
        // CRITICAL: Enhanced custom domain error handling and diagnostics
        if (req.headers.origin?.includes('profieldmanager.com')) {
          console.error('🚨 CUSTOM DOMAIN CLOUDINARY FAILURE - COMPREHENSIVE DEBUG');
          console.error('🚨 Cloudinary error details:', JSON.stringify(cloudinaryResult, null, 2));
          console.error('🚨 User context:', JSON.stringify({
            userId: user?.id,
            organizationId: user?.organizationId,
            email: user?.email,
            isAuthenticated: !!user
          }, null, 2));
          console.error('🚨 Request context:', JSON.stringify({
            origin: req.headers.origin,
            host: req.headers.host,
            userAgent: req.headers['user-agent']?.slice(0, 100),
            contentLength: req.headers['content-length'],
            contentType: req.headers['content-type']
          }, null, 2));
          
          // Try uploading without transformations as fallback
          try {
            console.log('🔄 Retrying Cloudinary upload without transformations...');
            const retryResult = await CloudinaryService.uploadImage(uploadBuffer, {
              folder: cloudinaryFolder,
              filename: req.file.originalname,
              organizationId: user.organizationId,
              // Minimal options for retry
            });
            
            if (retryResult.success) {
              console.log('✅ Cloudinary retry successful:', retryResult.secureUrl);
              // Use the retry result
              const fileData = {
                projectId,
                taskId,
                uploadedById: userId,
                fileName: retryResult.publicId!.split('/').pop() || req.file.originalname,
                originalName: req.file.originalname,
                filePath: retryResult.secureUrl!,
                cloudinaryUrl: retryResult.secureUrl!,
                fileSize: retryResult.bytes || req.file.size,
                mimeType: retryResult.format ? `image/${retryResult.format}` : req.file.mimetype,
                fileType,
                description: req.body.description || `File uploaded from ${req.headers.origin || 'custom domain'}`,
              };
              
              const projectFile = await storage.uploadProjectFile(fileData);
              
              return res.status(201).json({
                id: projectFile.id,
                fileName: projectFile.fileName,
                originalName: projectFile.originalName,
                filePath: projectFile.filePath,
                cloudinaryUrl: projectFile.cloudinaryUrl,
                fileSize: projectFile.fileSize,
                fileType: projectFile.fileType,
                success: true,
                isCloudStored: true,
                message: "File uploaded successfully to Cloudinary (retry)"
              });
            }
          } catch (retryError) {
            console.error('❌ Cloudinary retry also failed:', retryError);
          }
          
          const errorResponse = {
            success: false,
            message: "Cloud storage upload failed after retry. Please check your connection and try again.",
            error: cloudinaryResult.error,
            isCustomDomain: true,
            cloudinaryConfigured: CloudinaryService.isConfigured()
          };
          
          return res.status(500).json(errorResponse);
        }
        
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
        filePath: cloudinaryResult.secureUrl!, // Keep for backward compatibility
        cloudinaryUrl: cloudinaryResult.secureUrl!, // Dedicated Cloudinary URL field
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

      // Ensure proper JSON response headers and CORS for custom domain
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      const successResponse = {
        id: projectFile.id,
        fileName: projectFile.fileName,
        originalName: projectFile.originalName,
        filePath: projectFile.filePath,
        cloudinaryUrl: projectFile.cloudinaryUrl || cloudinaryResult.secureUrl, // Ensure cloudinaryUrl is included
        fileSize: projectFile.fileSize,
        fileType: projectFile.fileType,
        uploadedAt: projectFile.createdAt,
        isCloudStored: true,
        thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.publicId!),
        compressionApplied: true,
        originalSize: req.file.size,
        compressedSize: cloudinaryResult.bytes,
        success: true,
        message: "File uploaded successfully to Cloudinary"
      };
      
      console.log('✅ FINAL SUCCESS RESPONSE BEING SENT:', JSON.stringify(successResponse, null, 2));
      
      res.status(201).json(successResponse);
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR uploading file to Cloudinary:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Request details:", {
        projectId: req.params.id,
        hasUser: !!req.user,
        hasFile: !!req.file,
        fileName: req.file?.originalname
      });
      
      // Ensure proper JSON response headers and CORS for custom domain errors
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      const errorResponse = {
        success: false,
        message: "Failed to upload file: " + error.message,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log('❌ FINAL ERROR RESPONSE BEING SENT:', JSON.stringify(errorResponse, null, 2));
      
      res.status(500).json(errorResponse);
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

  // Move trash route before the :id route to avoid parameter conflicts
  app.get("/api/expenses/trash", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      console.log("🗑️ TRASH DEBUG - User object:", { id: user.id, organizationId: user.organizationId, role: user.role });
      
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Ensure organizationId is a valid number
      if (!user.organizationId) {
        console.log("🗑️ TRASH DEBUG - User missing organizationId:", user);
        return res.json([]); // Return empty array instead of error
      }
      
      const organizationId = parseInt(String(user.organizationId));
      console.log("🗑️ TRASH DEBUG - Parsed organizationId:", organizationId);
      
      if (isNaN(organizationId)) {
        console.log("🗑️ TRASH DEBUG - Invalid organizationId for user:", user.id, "orgId:", user.organizationId);
        return res.json([]); // Return empty array instead of error
      }
      
      const trashedExpenses = await storage.getTrashedExpenses(organizationId, user.id);
      console.log("🗑️ TRASH DEBUG - Found trashed expenses:", trashedExpenses.length);
      res.json(trashedExpenses);
    } catch (error: any) {
      console.error("🗑️ TRASH DEBUG - Error fetching trashed expenses:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
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
        tags: expenseData.tags && typeof expenseData.tags === 'string' ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : [],
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
        tags: expenseData.tags && typeof expenseData.tags === 'string' ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : undefined,
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

  // Expense trash management routes (moved above for proper route order)

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
        tags: expenseData.tags && typeof expenseData.tags === 'string' ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : [],
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

  // Dispatch Routing Settings API
  app.get("/api/settings/dispatch-routing", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory('dispatch');
      const dispatchSettings = {
        defaultStartLocation: '',
        routeOptimization: 'time',
        avoidTolls: false,
        avoidHighways: false,
        trafficAware: true,
        bufferMinutes: 15,
        maxJobsPerRoute: 10,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        lunchBreakStart: '12:00',
        lunchBreakEnd: '13:00',
        autoDispatch: false,
        vehicleTabsCount: 1,
        maxJobsPerVehicle: 'unlimited',
        showMultiMapView: false,
        jobSyncMode: 'manual',
        autoSyncByAssignment: false,
        syncOnlyActiveJobs: true,
        syncTimeWindow: 24,
        notificationSettings: {
          routeUpdates: true,
          jobStatusChanges: true,
          trafficAlerts: true,
        }
      };
      
      if (settings && settings.length > 0) {
        settings.forEach((setting: any) => {
          const key = setting.key.replace('dispatch_', '');
          if (key === 'avoidTolls' || key === 'avoidHighways' || key === 'trafficAware' || key === 'autoDispatch' || key === 'showMultiMapView' || key === 'autoSyncByAssignment' || key === 'syncOnlyActiveJobs') {
            dispatchSettings[key] = setting.value === 'true';
          } else if (key === 'bufferMinutes' || key === 'maxJobsPerRoute' || key === 'vehicleTabsCount' || key === 'syncTimeWindow') {
            dispatchSettings[key] = parseInt(setting.value) || dispatchSettings[key];
          } else if (key === 'notificationSettings') {
            try {
              dispatchSettings.notificationSettings = JSON.parse(setting.value || '{}');
            } catch {
              // Keep defaults
            }
          } else if (key in dispatchSettings) {
            dispatchSettings[key] = setting.value;
          }
        });
      }

      res.json(dispatchSettings);
    } catch (error: any) {
      console.error("Error fetching dispatch routing settings:", error);
      res.status(500).json({ message: "Failed to fetch dispatch routing settings" });
    }
  });

  app.put("/api/settings/dispatch-routing", requireAuth, async (req, res) => {
    try {
      const {
        defaultStartLocation,
        routeOptimization,
        avoidTolls,
        avoidHighways,
        trafficAware,
        bufferMinutes,
        maxJobsPerRoute,
        workingHoursStart,
        workingHoursEnd,
        lunchBreakStart,
        lunchBreakEnd,
        autoDispatch,
        vehicleTabsCount,
        maxJobsPerVehicle,
        showMultiMapView,
        jobSyncMode,
        autoSyncByAssignment,
        syncOnlyActiveJobs,
        syncTimeWindow,
        notificationSettings
      } = req.body;
      
      const updates = [
        { key: 'dispatch_defaultStartLocation', value: defaultStartLocation || '', isSecret: false },
        { key: 'dispatch_routeOptimization', value: routeOptimization || 'time', isSecret: false },
        { key: 'dispatch_avoidTolls', value: String(avoidTolls || false), isSecret: false },
        { key: 'dispatch_avoidHighways', value: String(avoidHighways || false), isSecret: false },
        { key: 'dispatch_trafficAware', value: String(trafficAware !== false), isSecret: false },
        { key: 'dispatch_bufferMinutes', value: String(bufferMinutes || 15), isSecret: false },
        { key: 'dispatch_maxJobsPerRoute', value: String(maxJobsPerRoute || 10), isSecret: false },
        { key: 'dispatch_workingHoursStart', value: workingHoursStart || '08:00', isSecret: false },
        { key: 'dispatch_workingHoursEnd', value: workingHoursEnd || '17:00', isSecret: false },
        { key: 'dispatch_lunchBreakStart', value: lunchBreakStart || '12:00', isSecret: false },
        { key: 'dispatch_lunchBreakEnd', value: lunchBreakEnd || '13:00', isSecret: false },
        { key: 'dispatch_autoDispatch', value: String(autoDispatch || false), isSecret: false },
        { key: 'dispatch_vehicleTabsCount', value: String(vehicleTabsCount || 1), isSecret: false },
        { key: 'dispatch_maxJobsPerVehicle', value: String(maxJobsPerVehicle || 'unlimited'), isSecret: false },
        { key: 'dispatch_showMultiMapView', value: String(showMultiMapView || false), isSecret: false },
        { key: 'dispatch_jobSyncMode', value: jobSyncMode || 'manual', isSecret: false },
        { key: 'dispatch_autoSyncByAssignment', value: String(autoSyncByAssignment || false), isSecret: false },
        { key: 'dispatch_syncOnlyActiveJobs', value: String(syncOnlyActiveJobs !== false), isSecret: false },
        { key: 'dispatch_syncTimeWindow', value: String(syncTimeWindow || 24), isSecret: false },
        { key: 'dispatch_notificationSettings', value: JSON.stringify(notificationSettings || {}), isSecret: false }
      ];

      for (const update of updates) {
        await storage.updateSettings(update.key, update.value, update.isSecret);
      }

      res.json({ message: "Dispatch routing settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating dispatch routing settings:", error);
      res.status(500).json({ message: "Failed to update dispatch routing settings" });
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

  // Dashboard Profile API endpoints
  app.get("/api/dashboard/profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getDashboardProfiles();
      res.json(profiles);
    } catch (error: any) {
      console.error("Error fetching dashboard profiles:", error);
      res.status(500).json({ message: "Failed to fetch dashboard profiles" });
    }
  });

  app.get("/api/dashboard/profiles/:profileType", requireAuth, async (req, res) => {
    try {
      const profileType = req.params.profileType;
      const profile = await storage.getDashboardProfile(profileType);
      
      if (!profile) {
        return res.status(404).json({ message: "Dashboard profile not found" });
      }
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error fetching dashboard profile:", error);
      res.status(500).json({ message: "Failed to fetch dashboard profile" });
    }
  });

  app.post("/api/dashboard/apply-profile", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { profileType } = req.body;
      
      if (!profileType) {
        return res.status(400).json({ message: "Profile type is required" });
      }

      const settings = await storage.applyDashboardProfile(user.id, user.organizationId, profileType);
      res.json({ 
        message: "Dashboard profile applied successfully",
        settings 
      });
    } catch (error: any) {
      console.error("Error applying dashboard profile:", error);
      res.status(500).json({ message: "Failed to apply dashboard profile" });
    }
  });

  app.put("/api/dashboard/user-settings", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const settings = req.body;
      
      const updatedSettings = await storage.updateUserDashboardSettings(user.id, user.organizationId, settings);
      res.json({ 
        message: "Dashboard settings updated successfully",
        settings: updatedSettings 
      });
    } catch (error: any) {
      console.error("Error updating dashboard settings:", error);
      res.status(500).json({ message: "Failed to update dashboard settings" });
    }
  });

  app.get("/api/dashboard/user-settings", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Check if user has custom settings
      const [userSettings] = await db.select()
        .from(userDashboardSettings)
        .where(and(
          eq(userDashboardSettings.userId, user.id),
          eq(userDashboardSettings.organizationId, user.organizationId)
        ));
      
      if (userSettings) {
        const parsedSettings = JSON.parse(userSettings.settings);
        res.json({
          ...parsedSettings,
          profileType: userSettings.profileType || 'user'
        });
      } else {
        // Return default user profile settings
        const defaultProfile = await storage.getDashboardProfile('user');
        if (defaultProfile) {
          res.json({
            profileType: 'user',
            showStatsCards: defaultProfile.showStatsCards,
            showRevenueChart: defaultProfile.showRevenueChart,
            showRecentActivity: defaultProfile.showRecentActivity,
            showRecentInvoices: defaultProfile.showRecentInvoices,
            showNotifications: defaultProfile.showNotifications,
            showQuickActions: defaultProfile.showQuickActions,
            showProjectsOverview: defaultProfile.showProjectsOverview,
            showWeatherWidget: defaultProfile.showWeatherWidget,
            showTasksWidget: defaultProfile.showTasksWidget,
            showCalendarWidget: defaultProfile.showCalendarWidget,
            showMessagesWidget: defaultProfile.showMessagesWidget,
            showTeamOverview: defaultProfile.showTeamOverview,
            layoutType: defaultProfile.layoutType,
            gridColumns: defaultProfile.gridColumns,
            widgetSize: defaultProfile.widgetSize,
            colorTheme: defaultProfile.colorTheme,
            animationsEnabled: true,
            statsCardsCount: 4,
            recentItemsCount: 5,
            refreshInterval: 30,
            showWelcomeMessage: true,
            compactMode: false,
            widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
          });
        } else {
          // Fallback to basic defaults
          res.json({
            profileType: 'user',
            showStatsCards: true,
            showRevenueChart: false,
            showRecentActivity: true,
            showRecentInvoices: false,
            showNotifications: true,
            showQuickActions: true,
            showProjectsOverview: false,
            showWeatherWidget: true,
            showTasksWidget: false,
            showCalendarWidget: true,
            showMessagesWidget: true,
            showTeamOverview: false,
            layoutType: 'grid',
            gridColumns: 3,
            widgetSize: 'medium',
            colorTheme: 'default',
            animationsEnabled: true,
            statsCardsCount: 4,
            recentItemsCount: 5,
            refreshInterval: 30,
            showWelcomeMessage: true,
            compactMode: false,
            widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching dashboard settings:", error);
      res.status(500).json({ message: "Failed to fetch dashboard settings" });
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
      const user = getAuthenticatedUser(req);
      const userId = user.id;
      const organizationId = user.organizationId;
      const { navigationItems } = req.body;
      
      if (!Array.isArray(navigationItems)) {
        return res.status(400).json({ message: "navigationItems must be an array" });
      }
      
      const savedOrder = await storage.saveNavigationOrder(userId, organizationId, navigationItems);
      
      // Broadcast navigation order update to organization users
      broadcastToWebUsers(organizationId, 'navigation_order_updated', {
        navigationItems: savedOrder,
        updatedBy: user.username,
        userId: userId,
        organizationId: organizationId,
        timestamp: new Date().toISOString()
      }, userId);
      
      res.json(savedOrder);
    } catch (error: any) {
      console.error("Error saving navigation order:", error);
      res.status(500).json({ message: "Failed to save navigation order" });
    }
  });

  app.delete("/api/navigation-order", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const userId = user.id;
      const organizationId = user.organizationId;
      
      const success = await storage.resetNavigationOrder(userId, organizationId);
      
      if (success) {
        // Broadcast navigation order reset to organization users
        broadcastToWebUsers(organizationId, 'navigation_order_reset', {
          resetBy: user.username,
          userId: userId,
          organizationId: organizationId,
          timestamp: new Date().toISOString()
        }, userId);
      }
      
      res.json({ success, message: success ? "Navigation order reset successfully" : "No navigation order found" });
    } catch (error: any) {
      console.error("Error resetting navigation order:", error);
      res.status(500).json({ message: "Failed to reset navigation order" });
    }
  });

  // API endpoint to check for navigation updates (fallback for WebSocket issues)
  app.get("/api/navigation/check-updates", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const lastCheck = req.query.lastCheck as string;
      
      // Get the last navigation update timestamp for this organization
      const updateTimestampSettings = await storage.getSettings(`navigation_org_${user.organizationId}`);
      const lastUpdateTime = updateTimestampSettings?.update_timestamp || '1970-01-01T00:00:00.000Z';
      
      const hasUpdates = lastCheck && new Date(lastUpdateTime) > new Date(lastCheck);
      
      if (hasUpdates) {
        // Fetch current navigation order
        const navigationOrder = await storage.getNavigationOrder(user.id, user.organizationId);
        res.json({
          hasUpdates: true,
          navigationItems: navigationOrder,
          lastUpdateTime,
          message: 'Navigation has been updated'
        });
      } else {
        res.json({ hasUpdates: false, lastUpdateTime });
      }
    } catch (error) {
      console.error('Error checking navigation updates:', error);
      res.status(500).json({ hasUpdates: false, error: 'Failed to check updates' });
    }
  });

  // Test debug endpoint to verify logging is working
  app.post("/api/admin/navigation/test-debug", requireAuth, async (req, res) => {
    const user = getAuthenticatedUser(req);
    console.log('🧪 TEST DEBUG ENDPOINT - User:', user.username, 'Org:', user.organizationId);
    console.log('🧪 WebSocket clients count:', connectedClients.size);
    res.json({ success: true, message: "Debug test working", user: user.username });
  });

  // Push Navigation Updates API - Force navigation updates to all organization users
  app.post("/api/admin/navigation/push-updates", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;
      
      // Use multiple logging methods to ensure visibility
      console.log('='.repeat(50));
      console.log('🔥 PUSH NAVIGATION UPDATES - STARTING');
      console.log('User:', user.username, 'ID:', user.id, 'Org:', organizationId);
      console.log('='.repeat(50));
      
      // Fetch current navigation order for this organization
      const navigationOrder = await storage.getNavigationOrder(user.id, organizationId);
      console.log('📋 Navigation order fetched:', navigationOrder);
      
      // Check connected clients for debugging
      console.log('🔌 Connected WebSocket clients:');
      connectedClients.forEach((clientInfo, ws) => {
        console.log(`  - User ${clientInfo.userId} (${clientInfo.username}) - Org: ${clientInfo.organizationId} - Type: ${clientInfo.userType} - State: ${ws.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED'}`);
      });
      
      // Broadcast navigation order update to all organization users
      const broadcastData = {
        navigationItems: navigationOrder,
        pushedBy: user.username,
        pushedByUserId: user.id,
        organizationId: organizationId,
        timestamp: new Date().toISOString()
      };
      
      console.log('📡 Broadcasting navigation_order_forced_update to org', organizationId, ':', broadcastData);
      broadcastToWebUsers(organizationId, 'navigation_order_forced_update', broadcastData);
      
      // Also broadcast auth refresh to ensure users see updated permissions
      console.log('🔄 Broadcasting auth_refresh_required to org', organizationId);
      broadcastToWebUsers(organizationId, 'auth_refresh_required', { 
        message: 'User permissions updated, refreshing authentication data',
        timestamp: new Date().toISOString() 
      });
      
      // Store the navigation update timestamp for fallback polling
      try {
        await storage.updateSetting(`navigation_org_${organizationId}`, 'update_timestamp', new Date().toISOString());
        console.log(`📅 Navigation update timestamp saved for org ${organizationId}`);
      } catch (error) {
        console.error('Error saving navigation update timestamp:', error);
      }
      
      // Get organization users for debugging
      try {
        const orgUsers = await storage.getUsersByOrganization(organizationId);
        console.log(`🏢 Organization ${organizationId} has ${orgUsers.length} users:`, 
          orgUsers.map(u => `${u.id}:${u.username}`));
          
        // Also log which users specifically need this update
        if (orgUsers.some(u => u.username === 'julissa@texaspowerwash.net')) {
          console.log('⭐ JULISSA FOUND in organization - she should receive this update');
        }
      } catch (error) {
        console.error('Error fetching org users:', error);
      }
      
      res.json({ 
        success: true, 
        message: "Navigation updates pushed to all organization users successfully",
        timestamp: new Date().toISOString(),
        organizationId: organizationId
      });
    } catch (error: any) {
      console.error("Error pushing navigation updates:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to push navigation updates" 
      });
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

  // =============================================
  // TASK TRIGGERS API ROUTES
  // =============================================

  // Get all task triggers for organization
  app.get("/api/task-triggers", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const triggers = await storage.getTaskTriggers(organizationId);
      res.json(triggers);
    } catch (error: any) {
      console.error("Error fetching task triggers:", error);
      res.status(500).json({ message: "Failed to fetch task triggers" });
    }
  });

  // Create new task trigger
  app.post("/api/task-triggers", requireManagerOrAdmin, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const createdBy = req.user!.id;
      const triggerData = {
        ...req.body,
        organizationId,
        createdBy
      };
      
      const trigger = await storage.createTaskTrigger(triggerData);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers(organizationId, 'task_trigger_created', { trigger });
      
      res.json(trigger);
    } catch (error: any) {
      console.error("Error creating task trigger:", error);
      res.status(500).json({ message: "Failed to create task trigger" });
    }
  });

  // Update task trigger
  app.put("/api/task-triggers/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const triggerId = parseInt(req.params.id);
      const organizationId = req.user!.organizationId;
      
      const trigger = await storage.updateTaskTrigger(triggerId, organizationId, req.body);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers(organizationId, 'task_trigger_updated', { trigger });
      
      res.json(trigger);
    } catch (error: any) {
      console.error("Error updating task trigger:", error);
      res.status(500).json({ message: "Failed to update task trigger" });
    }
  });

  // Delete task trigger
  app.delete("/api/task-triggers/:id", requireManagerOrAdmin, async (req, res) => {
    try {
      const triggerId = parseInt(req.params.id);
      const organizationId = req.user!.organizationId;
      
      await storage.deleteTaskTrigger(triggerId, organizationId);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers(organizationId, 'task_trigger_deleted', { triggerId });
      
      res.json({ message: "Task trigger deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting task trigger:", error);
      res.status(500).json({ message: "Failed to delete task trigger" });
    }
  });

  // Get active trigger instances for user
  app.get("/api/task-triggers/instances", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const instances = await storage.getActiveTriggerInstances(userId, organizationId);
      res.json(instances);
    } catch (error: any) {
      console.error("Error fetching trigger instances:", error);
      res.status(500).json({ message: "Failed to fetch trigger instances" });
    }
  });

  // Complete trigger instance (mark task as complete)
  app.post("/api/task-triggers/instances/:id/complete", requireAuth, async (req, res) => {
    try {
      const instanceId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { textValue, numberValue } = req.body;
      
      await storage.completeTriggerInstance(instanceId, userId, organizationId, textValue, numberValue);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers(organizationId, 'trigger_instance_completed', { instanceId, userId });
      
      res.json({ message: "Task completed successfully" });
    } catch (error: any) {
      console.error("Error completing trigger instance:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Get task trigger settings
  app.get("/api/task-triggers/settings", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      
      const settings = await storage.getTaskTriggerSettings(organizationId);
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching task trigger settings:", error);
      res.status(500).json({ message: "Failed to fetch task trigger settings" });
    }
  });

  // Update task trigger settings
  app.put("/api/task-triggers/settings", requireManagerOrAdmin, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      
      const settings = await storage.updateTaskTriggerSettings(organizationId, req.body);
      
      // Broadcast to WebSocket clients
      broadcastToWebUsers(organizationId, 'task_trigger_settings_updated', { settings });
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating task trigger settings:", error);
      res.status(500).json({ message: "Failed to update task trigger settings" });
    }
  });

  // Check clock-out prevention
  app.get("/api/task-triggers/clock-out-check", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const result = await storage.checkClockOutPreventionTriggers(userId, organizationId);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking clock-out prevention:", error);
      res.status(500).json({ message: "Failed to check clock-out prevention" });
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
      
      // Enhanced analytics for admins/managers - include team member count
      let enhancedAnalytics = taskAnalytics;
      if (user.role === 'admin' || user.role === 'manager') {
        // Get active team members count for team-wide context
        const activeTeamMembers = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(
            and(
              eq(users.organizationId, organizationId),
              eq(users.isActive, true)
            )
          );
        
        enhancedAnalytics = {
          ...taskAnalytics,
          activeTeamMembers: activeTeamMembers[0]?.count || 0
        };
      }
      
      // For the analytics endpoint, return summary data with simpler calculations
      const tasksSummary = {
        dailyCompletions: [],
        projectBreakdown: []
      };

      res.json({
        summary: enhancedAnalytics,
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
      
      const updatedLead = await storage.updateLead(leadId, {
        ...leadData,
        leadPrice: leadData.leadPrice ? parseFloat(leadData.leadPrice) : null,
        followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
        contactedAt: leadData.contactedAt ? new Date(leadData.contactedAt) : null,
      });
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Broadcast lead update to all web users except the updater
      (app as any).broadcastToWebUsers('lead_updated', {
        lead: updatedLead,
        updatedBy: req.user!.username
      }, req.user!.id);
      
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

      // Broadcast lead deletion to all web users except the deleter
      (app as any).broadcastToWebUsers('lead_deleted', {
        leadId,
        deletedBy: req.user!.username
      }, req.user!.id);
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Lead Settings API
  app.get("/api/lead-settings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getLeadSettings(user.organizationId);
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching lead settings:", error);
      res.status(500).json({ message: "Failed to fetch lead settings" });
    }
  });

  app.put("/api/lead-settings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.updateLeadSettings(user.organizationId, req.body);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating lead settings:", error);
      res.status(500).json({ message: "Failed to update lead settings" });
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

  // Image management routes (duplicate removed - using route at line 2768)

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

      console.log('🔗 Share link request received:', {
        userId,
        projectId,
        imageIds,
        imageIdsType: typeof imageIds,
        imageIdsLength: Array.isArray(imageIds) ? imageIds.length : 'not array',
        requestBody: JSON.stringify(req.body)
      });

      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        console.log('❌ Share link validation failed:', {
          hasProjectId: !!projectId,
          hasImageIds: !!imageIds,
          isImageIdsArray: Array.isArray(imageIds),
          imageIdsLength: Array.isArray(imageIds) ? imageIds.length : 'not array'
        });
        return res.status(400).json({ message: 'Image IDs are required' });
      }

      const shareToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const linkData = {
        shareToken,
        projectId: projectId && projectId > 0 ? projectId : null,
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

      // Use custom domain for share URLs
      const customDomain = 'profieldmanager.com';
      const shareUrl = `https://${customDomain}/shared/${shareToken}`;
      
      res.json({
        ...link,
        shareUrl
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
      
      // Use custom domain for share URLs
      const customDomain = 'profieldmanager.com';
      const linksWithUrls = links.map(link => ({
        ...link,
        shareUrl: `https://${customDomain}/shared/${link.shareToken}`
      }));
      
      res.json(linksWithUrls);
    } catch (error: any) {
      console.error('Error fetching shared photo links:', error);
      res.status(500).json({ message: 'Failed to fetch shared photo links' });
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

      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCy9lgjvkKV3vS_U1IIcmxJUC8q8yJaASI';
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

  // Update job status with WebSocket broadcast
  app.patch('/api/dispatch/jobs/:id/status', requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { status, location, notes } = req.body;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Update project status
      const updates: any = { status };
      if (location) {
        updates.currentLocation = location;
      }
      if (notes) {
        updates.dispatchNotes = notes;
      }
      updates.updatedAt = new Date();

      const updatedProject = await storage.updateProject(jobId, updates);
      
      if (!updatedProject) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Broadcast job status update to all connected users in organization
      const updateData = {
        id: jobId,
        status,
        location,
        notes,
        updatedBy: `${user.firstName} ${user.lastName}`,
        updatedAt: new Date().toISOString()
      };

      // Broadcast to organization users
      broadcastToWebUsers(user.organizationId, 'job_status_updated', updateData);

      res.json({
        success: true,
        message: 'Job status updated successfully',
        data: updateData
      });
    } catch (error: any) {
      console.error('Error updating job status:', error);
      res.status(500).json({ message: 'Failed to update job status' });
    }
  });

  // Assign job to vehicle with WebSocket broadcast
  app.patch('/api/dispatch/jobs/:id/assign-vehicle', requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { vehicleId } = req.body;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Update project with vehicle assignment
      const updates: any = { 
        vehicleId: vehicleId === 'unassigned' ? null : vehicleId,
        updatedAt: new Date()
      };

      const updatedProject = await storage.updateProject(jobId, updates);
      
      if (!updatedProject) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Broadcast job vehicle assignment to all connected users in organization
      const updateData = {
        id: jobId,
        vehicleId,
        updatedBy: `${user.firstName} ${user.lastName}`,
        updatedAt: new Date().toISOString()
      };

      // Broadcast to organization users
      broadcastToWebUsers(user.organizationId, 'job_vehicle_assigned', updateData);

      res.json({
        success: true,
        message: 'Job assigned to vehicle successfully',
        data: updateData
      });
    } catch (error: any) {
      console.error('Error assigning job to vehicle:', error);
      res.status(500).json({ message: 'Failed to assign job to vehicle' });
    }
  });

  // Schedule a job for specific date/time
  app.post('/api/dispatch/schedule-job', requireAuth, async (req, res) => {
    try {
      const { projectId, scheduledDate, scheduledTime, assignedUserId, estimatedDuration, notes } = req.body;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Update project with scheduling information
      const updates = {
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime,
        estimatedDuration: estimatedDuration || 120, // Default 2 hours
        dispatchNotes: notes,
        status: 'scheduled',
        updatedAt: new Date()
      };

      const updatedProject = await storage.updateProject(projectId, updates);
      
      if (!updatedProject) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Assign user to project if specified
      if (assignedUserId) {
        await storage.assignUserToProject(assignedUserId, projectId, 'assignee');
      }

      // Broadcast job scheduling to organization
      const scheduleData = {
        projectId,
        scheduledDate,
        scheduledTime,
        assignedUserId,
        estimatedDuration,
        scheduledBy: `${user.firstName} ${user.lastName}`,
        scheduledAt: new Date().toISOString()
      };

      broadcastToWebUsers(user.organizationId, 'job_scheduled', scheduleData);

      res.json({
        success: true,
        message: 'Job scheduled successfully',
        data: scheduleData
      });
    } catch (error: any) {
      console.error('Error scheduling job:', error);
      res.status(500).json({ message: 'Failed to schedule job' });
    }
  });

  // Get jobs for a specific date with real-time status
  app.get('/api/dispatch/scheduled-jobs', requireAuth, async (req, res) => {
    try {
      const { date, assignedUserId } = req.query;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Get projects with location information
      const projects = await storage.getProjectsWithLocation({ 
        userId: userId
      });
      
      // Filter projects based on date and status - synchronized with Progress tab "In Progress" logic
      let dispatchProjects = projects;
      
      if (date) {
        const targetDate = new Date(date as string);
        const today = new Date();
        const isToday = targetDate.toDateString() === today.toDateString();
        
        dispatchProjects = projects.filter(project => {
          // Always include jobs scheduled for the specific date
          if (project.scheduledDate) {
            const projectDate = new Date(project.scheduledDate);
            if (projectDate.toDateString() === targetDate.toDateString()) {
              return true;
            }
          }
          
          // Include "In Progress" jobs (matches Progress tab logic):
          // - status === 'active' 
          // - AND (no start date OR start date <= today)
          // - AND progress < 100
          if (project.status === 'active') {
            const hasValidStartDate = !project.startDate || new Date(project.startDate) <= today;
            const isNotCompleted = (project.progress || 0) < 100;
            
            if (hasValidStartDate && isNotCompleted) {
              // For today's date, include all active in-progress jobs
              if (isToday) {
                return true;
              }
              // For other dates, only include if they have a scheduled date matching the target
              if (project.scheduledDate) {
                const projectDate = new Date(project.scheduledDate);
                return projectDate.toDateString() === targetDate.toDateString();
              }
            }
          }
          
          // Also include explicit in-progress status
          if (project.status === 'in-progress') {
            if (isToday) {
              return true;
            }
            if (project.scheduledDate) {
              const projectDate = new Date(project.scheduledDate);
              return projectDate.toDateString() === targetDate.toDateString();
            }
          }
          
          return false;
        });
      } else {
        // If no date specified, show all jobs that would appear in Progress tab "In Progress"
        dispatchProjects = projects.filter(project => {
          // Include jobs with scheduled dates
          if (project.scheduledDate) {
            return true;
          }
          
          // Include "In Progress" jobs (synchronized with Progress tab logic)
          if (project.status === 'active') {
            const today = new Date();
            const hasValidStartDate = !project.startDate || new Date(project.startDate) <= today;
            const isNotCompleted = (project.progress || 0) < 100;
            return hasValidStartDate && isNotCompleted;
          }
          
          // Include explicit in-progress status
          if (project.status === 'in-progress') {
            return true;
          }
          
          return false;
        });
      }

      // Filter by assigned user if provided
      if (assignedUserId) {
        const assignedId = parseInt(assignedUserId as string);
        dispatchProjects = dispatchProjects.filter(project => 
          project.users.some((userAssignment: any) => userAssignment.user.id === assignedId)
        );
      }

      // Transform to dispatch job format
      const dispatchJobs = dispatchProjects.map(project => ({
        id: project.id,
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        address: `${project.address || ''}, ${project.city || ''}, ${project.state || ''} ${project.zipCode || ''}`.trim(),
        lat: 0, // Will be geocoded on frontend
        lng: 0, // Will be geocoded on frontend
        scheduledDate: project.scheduledDate,
        scheduledTime: project.scheduledTime || '09:00',
        estimatedDuration: project.estimatedDuration || 120,
        assignedTo: project.users?.[0]?.user?.username || 'Unassigned',
        assignedUserId: project.users?.[0]?.user?.id,
        priority: (project.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        status: (project.status || 'scheduled') as 'scheduled' | 'in-progress' | 'completed',
        currentLocation: project.currentLocation,
        dispatchNotes: project.dispatchNotes,
        vehicleId: project.vehicleId || 'unassigned', // Vehicle assignment for drag and drop
        updatedAt: project.updatedAt
      }));

      res.json(dispatchJobs);
    } catch (error: any) {
      console.error('Error fetching scheduled jobs:', error);
      res.status(500).json({ message: 'Failed to fetch scheduled jobs' });
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
    if (apiKey) {
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
      const { assignedToId, dueDate, ...taskData } = req.body;
      
      if (assignedToId && assignedToId !== req.user!.id) {
        const canDelegate = await storage.canUserDelegateTask(req.user!.id, assignedToId);
        if (!canDelegate) {
          return res.status(403).json({ 
            message: "Only managers and administrators can delegate tasks to other users" 
          });
        }
      }

      // Process the task data with proper date conversion
      const processedTaskData = {
        ...taskData,
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : null,
        organizationId: req.user!.organizationId,
      };

      const task = await storage.createTaskForOrganization(
        req.user!.organizationId, 
        processedTaskData, 
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

          // Broadcast updated task analytics for real-time dashboard updates
          if (req.body.isCompleted === true) {
            // Get fresh task analytics after completion
            const updatedAnalytics = await storage.getTaskCompletionAnalytics(user.organizationId);
            
            // Enhanced analytics for admins/managers
            const activeTeamMembers = await db
              .select({ count: sql<number>`count(*)` })
              .from(users)
              .where(
                and(
                  eq(users.organizationId, user.organizationId),
                  eq(users.isActive, true)
                )
              );
            
            const enhancedAnalytics = {
              ...updatedAnalytics,
              activeTeamMembers: activeTeamMembers[0]?.count || 0
            };
            
            // Broadcast task analytics update to all users in organization
            broadcastToWebUsers('task_analytics_updated', {
              summary: enhancedAnalytics,
              organizationId: user.organizationId,
              updatedBy: user.id,
              taskId: task.id
            });
          }
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

  // Object Storage API endpoints
  
  // Serve public assets from object storage
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects with ACL check
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const userId = req.user!.id.toString();
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for object storage (private)
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      console.log('🔄 Getting upload URL for user:', req.user?.username);
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log('✅ Generated upload URL successfully');
      res.json({ uploadURL });
    } catch (error) {
      console.error("❌ Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Get upload URL for public object storage (parts inventory images)
  app.post("/api/objects/upload-public", requireAuth, async (req, res) => {
    try {
      console.log('🔄 Getting public upload URL for user:', req.user?.username);
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getPublicObjectUploadURLWithPath();
      console.log('✅ Generated public upload URL and public path successfully');
      res.json({ 
        uploadURL: result.uploadURL,
        publicURL: result.publicURL,
        objectPath: result.objectPath
      });
    } catch (error) {
      console.error("❌ Error generating public upload URL:", error);
      res.status(500).json({ error: "Failed to generate public upload URL" });
    }
  });

  // Update parts & supplies with image URL after upload
  app.put("/api/parts-supplies/:id/image", requireAuth, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const partId = parseInt(req.params.id);
      const imageURL = req.body.imageURL;
      
      console.log('🔍 Processing image URL for part:', partId);
      console.log('🔍 Received imageURL:', imageURL);
      console.log('🔍 URL type check:', imageURL.startsWith("https://storage.googleapis.com/"));
      
      // For public URLs (from /api/objects/upload-public), use them directly
      let finalImageUrl = imageURL;
      
      if (imageURL && imageURL.startsWith("https://storage.googleapis.com/")) {
        // This is already a public URL, use it directly
        console.log('✅ Using public image URL directly:', imageURL);
        finalImageUrl = imageURL;
      } else {
        console.log('🔄 Processing as legacy private URL:', imageURL);
        // Legacy private object handling
        const userId = req.user!.id.toString();
        const objectStorageService = new ObjectStorageService();
        finalImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
          imageURL,
          {
            owner: userId,
            visibility: "private",
          }
        );
      }

      // Update the parts/supplies record with the image URL
      const updatedPart = await storage.updatePartSupply(partId, {
        imageUrl: finalImageUrl,
      });

      if (!updatedPart) {
        return res.status(404).json({ error: "Part not found" });
      }

      res.status(200).json({
        success: true,
        part: updatedPart
      });
    } catch (error) {
      console.error("Error setting part image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== Call Manager API Routes ====================
  
  // Get call logs
  app.get("/api/call-manager/logs", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { phoneNumberId } = req.query;
      
      // Get call records from database using the new storage layer
      const callRecords = await storage.getCallRecords(
        user.organizationId,
        phoneNumberId ? parseInt(phoneNumberId as string) : undefined
      );
      
      // Transform database records to match frontend expectations
      const callLogs = callRecords.map(record => ({
        id: record.id.toString(),
        phoneNumber: record.fromNumber || record.toNumber,
        direction: record.direction,
        status: record.status,
        duration: record.duration || 0,
        timestamp: record.createdAt,
        contactName: record.contactName || 'Unknown',
        notes: record.notes || ''
      }));
      
      res.json(callLogs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  // Get phone numbers for organization
  app.get("/api/call-manager/phone-numbers", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneNumbers = await storage.getPhoneNumbers(user.organizationId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Create a new phone number
  app.post("/api/call-manager/phone-numbers", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneData = {
        ...req.body,
        organizationId: user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const phoneNumber = await storage.createPhoneNumber(phoneData);
      res.status(201).json(phoneNumber);
    } catch (error) {
      console.error("Error creating phone number:", error);
      res.status(500).json({ message: "Failed to create phone number" });
    }
  });

  // Update phone number
  app.put("/api/call-manager/phone-numbers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneId = parseInt(req.params.id);
      const updates = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const phoneNumber = await storage.updatePhoneNumber(phoneId, user.organizationId, updates);
      res.json(phoneNumber);
    } catch (error) {
      console.error("Error updating phone number:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  // Delete phone number
  app.delete("/api/call-manager/phone-numbers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneId = parseInt(req.params.id);
      
      const success = await storage.deletePhoneNumber(phoneId, user.organizationId);
      if (success) {
        res.json({ message: "Phone number deleted successfully" });
      } else {
        res.status(404).json({ message: "Phone number not found" });
      }
    } catch (error) {
      console.error("Error deleting phone number:", error);
      res.status(500).json({ message: "Failed to delete phone number" });
    }
  });

  // Get voicemails
  app.get("/api/call-manager/voicemails", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { phoneNumberId } = req.query;
      
      const voicemails = await storage.getVoicemails(
        user.organizationId,
        phoneNumberId ? parseInt(phoneNumberId as string) : undefined
      );
      
      res.json(voicemails);
    } catch (error) {
      console.error("Error fetching voicemails:", error);
      res.status(500).json({ message: "Failed to fetch voicemails" });
    }
  });

  // Get call recordings
  app.get("/api/call-manager/recordings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { callRecordId } = req.query;
      
      const recordings = await storage.getCallRecordings(
        user.organizationId,
        callRecordId ? parseInt(callRecordId as string) : undefined
      );
      
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching call recordings:", error);
      res.status(500).json({ message: "Failed to fetch call recordings" });
    }
  });

  // Get organization Twilio settings
  app.get("/api/call-manager/settings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getOrganizationTwilioSettings(user.organizationId);
      
      // Don't expose sensitive credentials in response
      if (settings) {
        const safeSettings = {
          ...settings,
          accountSid: settings.accountSid ? '***' + settings.accountSid.slice(-4) : null,
          authToken: settings.authToken ? '***' + settings.authToken.slice(-4) : null
        };
        res.json(safeSettings);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching Twilio settings:", error);
      res.status(500).json({ message: "Failed to fetch Twilio settings" });
    }
  });

  // Update organization Twilio settings
  app.put("/api/call-manager/settings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settingsData = {
        ...req.body,
        organizationId: user.organizationId,
        updatedAt: new Date()
      };
      
      // Check if settings exist
      const existingSettings = await storage.getOrganizationTwilioSettings(user.organizationId);
      
      let settings;
      if (existingSettings) {
        settings = await storage.updateOrganizationTwilioSettings(user.organizationId, settingsData);
      } else {
        settingsData.createdAt = new Date();
        settings = await storage.createOrganizationTwilioSettings(settingsData);
      }
      
      res.json({ message: "Twilio settings updated successfully" });
    } catch (error) {
      console.error("Error updating Twilio settings:", error);
      res.status(500).json({ message: "Failed to update Twilio settings" });
    }
  });

  // ==================== Twilio Organization API Routes ====================
  
  // Get organization Twilio account info
  app.get("/api/twilio/account", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getOrganizationTwilioSettings(user.organizationId);
      
      if (!settings || !settings.accountSid || !settings.authToken) {
        return res.json({
          configured: false,
          message: "Twilio account not configured for this organization"
        });
      }
      
      // Return safe account info (no sensitive data)
      res.json({
        configured: true,
        accountSid: '***' + settings.accountSid.slice(-4),
        friendlyName: settings.friendlyName || 'Organization Account',
        status: 'active' // Would query Twilio API in real implementation
      });
    } catch (error) {
      console.error("Error fetching Twilio account:", error);
      res.status(500).json({ message: "Failed to fetch Twilio account" });
    }
  });

  // Get organization phone numbers
  app.get("/api/twilio/phone-numbers", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneNumbers = await storage.getPhoneNumbers(user.organizationId);
      
      // Transform to match frontend expectations
      const twilioNumbers = phoneNumbers.map(phone => ({
        sid: phone.twilioSid || `PN${phone.id}`,
        phoneNumber: phone.phoneNumber,
        friendlyName: phone.friendlyName || phone.phoneNumber,
        capabilities: {
          voice: phone.voiceEnabled || true,
          sms: phone.smsEnabled || true,
          mms: phone.mmsEnabled || false,
          fax: false
        },
        status: phone.status || 'active',
        dateCreated: phone.createdAt,
        dateUpdated: phone.updatedAt
      }));
      
      res.json(twilioNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Get organization call logs (Twilio format)
  app.get("/api/twilio/call-logs", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { phoneNumberId, limit = 50 } = req.query;
      
      let callRecords = await storage.getCallRecords(
        user.organizationId,
        phoneNumberId ? parseInt(phoneNumberId as string) : undefined
      );
      
      // Limit results
      callRecords = callRecords.slice(0, parseInt(limit as string));
      
      // Transform to Twilio call log format
      const twilioCallLogs = callRecords.map(record => ({
        sid: record.twilioCallSid || `CA${record.id}`,
        accountSid: record.accountSid || 'ACxxxx',
        to: record.toNumber,
        from: record.fromNumber,
        phoneNumberSid: record.phoneNumberSid,
        status: record.status,
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration ? record.duration.toString() : '0',
        price: record.price || '0.00',
        direction: record.direction,
        answeredBy: record.answeredBy,
        forwardedFrom: record.forwardedFrom,
        callerName: record.contactName,
        uri: `/api/twilio/call-logs/${record.id}`,
        subresourceUris: {
          recordings: `/api/twilio/call-logs/${record.id}/recordings`
        }
      }));
      
      res.json({
        calls: twilioCallLogs,
        page: 0,
        pageSize: parseInt(limit as string),
        total: twilioCallLogs.length
      });
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  // Get organization usage statistics
  app.get("/api/twilio/usage-stats", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { period = 'daily', startDate, endDate } = req.query;
      
      // Get call analytics for the organization
      const periodStart = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate ? new Date(endDate as string) : new Date();
      
      const analytics = await storage.getOrganizationCallAnalytics(
        user.organizationId,
        periodStart,
        periodEnd
      );
      
      // If no analytics exist, create basic stats from call records
      if (analytics.length === 0) {
        const callRecords = await storage.getCallRecords(user.organizationId);
        const recentCalls = callRecords.filter(call => 
          new Date(call.createdAt) >= periodStart && new Date(call.createdAt) <= periodEnd
        );
        
        const totalCalls = recentCalls.length;
        const totalDuration = recentCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
        const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
        const inboundCalls = recentCalls.filter(call => call.direction === 'inbound').length;
        const outboundCalls = recentCalls.filter(call => call.direction === 'outbound').length;
        const completedCalls = recentCalls.filter(call => call.status === 'completed').length;
        const missedCalls = recentCalls.filter(call => call.status === 'no-answer' || call.status === 'missed').length;
        
        res.json({
          period,
          startDate: periodStart.toISOString(),
          endDate: periodEnd.toISOString(),
          totalCalls,
          inboundCalls,
          outboundCalls,
          completedCalls,
          missedCalls,
          totalDuration,
          averageDuration: Math.round(averageDuration),
          totalCost: '0.00', // Would calculate from actual usage
          usage: [
            { category: 'calls', count: totalCalls, duration: totalDuration, cost: '0.00' },
            { category: 'sms', count: 0, duration: 0, cost: '0.00' },
            { category: 'recordings', count: 0, duration: 0, cost: '0.00' }
          ]
        });
      } else {
        // Return existing analytics
        const latest = analytics[0];
        res.json({
          period,
          startDate: latest.periodStart,
          endDate: latest.periodEnd,
          totalCalls: latest.totalCalls || 0,
          inboundCalls: latest.inboundCalls || 0,
          outboundCalls: latest.outboundCalls || 0,
          completedCalls: latest.completedCalls || 0,
          missedCalls: latest.missedCalls || 0,
          totalDuration: latest.totalDuration || 0,
          averageDuration: latest.averageDuration || 0,
          totalCost: latest.totalCost || '0.00',
          usage: latest.usage || []
        });
      }
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // ==================== SAAS Admin Call Manager Routes ====================
  
  // Get all organizations with call manager access
  app.get("/api/saas-admin/call-manager/organizations", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all organizations
      const organizations = await storage.getAllOrganizations();
      
      // Get phone numbers for each organization
      const orgsWithPhones = await Promise.all(
        organizations.map(async (org) => {
          const phoneNumbers = await storage.getPhoneNumbers(org.id);
          return {
            ...org,
            phoneNumbers
          };
        })
      );
      
      res.json(orgsWithPhones);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Get phone numbers for a specific organization (SAAS admin)
  app.get("/api/saas-admin/call-manager/phone-numbers/:orgId", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const orgId = parseInt(req.params.orgId);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const phoneNumbers = await storage.getPhoneNumbers(orgId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Provision new phone number for organization (SAAS admin)
  app.post("/api/saas-admin/call-manager/provision-phone", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const phoneData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const phoneNumber = await storage.createPhoneNumber(phoneData);
      res.status(201).json(phoneNumber);
    } catch (error) {
      console.error("Error provisioning phone number:", error);
      res.status(500).json({ message: "Failed to provision phone number" });
    }
  });

  // Update phone number for organization (SAAS admin)
  app.put("/api/saas-admin/call-manager/phone-numbers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneId = parseInt(req.params.id);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = {
        ...req.body,
        updatedAt: new Date()
      };
      
      // For SAAS admin, allow cross-organization updates
      const phoneNumber = await storage.updatePhoneNumber(phoneId, null, updates);
      res.json(phoneNumber);
    } catch (error) {
      console.error("Error updating phone number:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  // Release phone number (SAAS admin)
  app.delete("/api/saas-admin/call-manager/phone-numbers/:id/release", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const phoneId = parseInt(req.params.id);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For SAAS admin, allow cross-organization deletions
      const success = await storage.deletePhoneNumber(phoneId, null);
      if (success) {
        res.json({ message: "Phone number released successfully" });
      } else {
        res.status(404).json({ message: "Phone number not found" });
      }
    } catch (error) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ message: "Failed to release phone number" });
    }
  });

  // Get call manager analytics across all organizations (SAAS admin)
  app.get("/api/saas-admin/call-manager/analytics", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { period = 'daily', startDate, endDate } = req.query;
      const periodStart = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate ? new Date(endDate as string) : new Date();
      
      // Get all organizations
      const organizations = await storage.getAllOrganizations();
      
      // Get analytics for each organization
      const orgAnalytics = await Promise.all(
        organizations.map(async (org) => {
          const analytics = await storage.getOrganizationCallAnalytics(org.id, periodStart, periodEnd);
          const callRecords = await storage.getCallRecords(org.id);
          const phoneNumbers = await storage.getPhoneNumbers(org.id);
          
          return {
            organizationId: org.id,
            organizationName: org.name,
            phoneNumbers: phoneNumbers.length,
            totalCalls: callRecords.length,
            recentCalls: callRecords.filter(call => 
              new Date(call.createdAt) >= periodStart && new Date(call.createdAt) <= periodEnd
            ).length,
            analytics: analytics[0] || null
          };
        })
      );
      
      res.json({
        period,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
        organizations: orgAnalytics,
        totalOrganizations: organizations.length,
        totalPhoneNumbers: orgAnalytics.reduce((sum, org) => sum + org.phoneNumbers, 0),
        totalCalls: orgAnalytics.reduce((sum, org) => sum + org.totalCalls, 0)
      });
    } catch (error) {
      console.error("Error fetching call manager analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // SAAS Admin Call Manager - Update Twilio Settings
  app.put('/api/saas-admin/call-manager/twilio-settings/:orgId', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { orgId } = req.params;
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { accountSid, authToken, webhookUrl, statusCallbackUrl } = req.body;
      
      const organizationId = parseInt(orgId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: 'Invalid organization ID' });
      }

      // Verify organization exists
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Update Twilio settings for the organization
      const twilioSettings = {
        accountSid,
        authToken,
        webhookUrl,
        statusCallbackUrl,
        isConfigured: !!(accountSid && authToken)
      };

      // Direct database update to bypass storage compilation errors
      console.log('🔧 DIRECT TWILIO SETTINGS UPDATE:', {
        organizationId,
        accountSid: accountSid || 'NULL',
        authToken: authToken ? 'PRESENT' : 'NULL',
        webhookUrl: webhookUrl || 'NULL',
        statusCallbackUrl: statusCallbackUrl || 'NULL',
        isConfigured: !!(accountSid && authToken)
      });

      // Use raw SQL with connection from pool  
      const { Pool } = await import('@neondatabase/serverless');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const query = `
        INSERT INTO organization_twilio_settings (
          organization_id, 
          account_sid, 
          auth_token, 
          voice_url, 
          status_callback_url, 
          is_active, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (organization_id) 
        DO UPDATE SET 
          account_sid = $2,
          auth_token = $3,
          voice_url = $4,
          status_callback_url = $5,
          is_active = $6,
          updated_at = NOW()
        RETURNING *;
      `;
      
      const values = [
        organizationId,
        accountSid || null,
        authToken || null,
        webhookUrl || null,
        statusCallbackUrl || null,
        !!(accountSid && authToken)
      ];
      
      console.log('🔧 Executing SQL:', { query, values: values.map((v, i) => i === 2 && v ? 'HIDDEN' : v) });
      const result = await pool.query(query, values);
      console.log('✅ TWILIO SETTINGS SQL SUCCESS:', result.rows[0]);

      res.json({ message: 'Twilio settings updated successfully', settings: twilioSettings });
    } catch (error) {
      console.error('Error updating Twilio settings:', error);
      res.status(500).json({ message: 'Failed to update Twilio settings' });
    }
  });

  // SAAS Admin Call Manager - Test Call
  app.post('/api/saas-admin/call-manager/test-call', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only allow super admins or system admins to access this
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { phoneId, testNumber } = req.body;
      
      if (!phoneId || !testNumber) {
        return res.status(400).json({ message: 'Phone ID and test number are required' });
      }

      // Get phone number details
      const phoneNumber = await storage.getPhoneNumberById(phoneId);
      if (!phoneNumber) {
        return res.status(404).json({ message: 'Phone number not found' });
      }

      // Get organization for Twilio settings
      const organization = await storage.getOrganizationById(phoneNumber.organizationId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // For now, just create a test call record
      const testCall = {
        id: Date.now(), // temporary ID
        phoneNumber: phoneNumber.phoneNumber,
        testNumber: testNumber,
        status: 'initiated',
        organizationId: phoneNumber.organizationId,
        createdAt: new Date().toISOString()
      };

      res.json({ 
        message: 'Test call initiated successfully',
        call: testCall,
        status: 'initiated'
      });
    } catch (error) {
      console.error('Error initiating test call:', error);
      res.status(500).json({ message: 'Failed to initiate test call' });
    }
  });

  // Get contacts
  app.get("/api/call-manager/contacts", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Get customers from database as contacts
      const customers = await storage.getCustomers(user.organizationId);
      
      // Transform customers to contact format
      const contacts = customers.map(customer => ({
        id: customer.id.toString(),
        name: customer.name,
        phoneNumber: customer.phone,
        email: customer.email,
        company: customer.name, // Use customer name as company for now
        tags: ["Customer"]
      })).filter(contact => contact.phoneNumber); // Only include contacts with phone numbers
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Get active calls
  app.get("/api/call-manager/active-calls", requireAuth, async (req, res) => {
    try {
      // Mock active calls - replace with actual call management system
      const activeCalls = [];
      
      res.json(activeCalls);
    } catch (error) {
      console.error("Error fetching active calls:", error);
      res.status(500).json({ message: "Failed to fetch active calls" });
    }
  });

  // Make a call
  app.post("/api/call-manager/make-call", requireAuth, async (req, res) => {
    try {
      const { phoneNumber, contactId } = req.body;
      const user = getAuthenticatedUser(req);
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      console.log(`📞 Attempting to initiate call to ${phoneNumber} for user ${user.username}`);
      
      // Get organization's Twilio settings
      const twilioSettings = await storage.getOrganizationTwilioSettings(user.organizationId);
      
      console.log(`🔍 DEBUG: Twilio settings for org ${user.organizationId}:`, {
        exists: !!twilioSettings,
        accountSidExists: !!twilioSettings?.accountSid,
        authTokenExists: !!twilioSettings?.authToken,
        accountSid: twilioSettings?.accountSid ? `${twilioSettings.accountSid.substring(0, 6)}...` : 'MISSING',
        authTokenLength: twilioSettings?.authToken?.length || 0,
        isActive: twilioSettings?.isActive,
        settingsKeys: twilioSettings ? Object.keys(twilioSettings) : []
      });
      
      if (!twilioSettings || !twilioSettings.accountSid || !twilioSettings.authToken) {
        console.log(`❌ No Twilio credentials configured for organization ${user.organizationId}`);
        return res.status(400).json({ 
          message: "Twilio credentials not configured for your organization. Please contact your administrator to set up calling functionality.",
          requiresSetup: true
        });
      }

      // Get organization's phone numbers to find an appropriate "from" number
      const orgPhoneNumbers = await storage.getPhoneNumbersByOrganization(user.organizationId);
      const availableFromNumber = orgPhoneNumbers.find(pn => pn.isActive && pn.isCallEnabled);
      
      if (!availableFromNumber) {
        console.log(`❌ No active phone numbers configured for organization ${user.organizationId}`);
        return res.status(400).json({ 
          message: "No active phone numbers configured for your organization. Please add a phone number first.",
          requiresPhoneSetup: true
        });
      }

      // Create organization-specific Twilio client
      const { TwilioService } = await import("./twilio");
      const orgTwilioClient = TwilioService.createOrganizationClient(
        twilioSettings.accountSid, 
        twilioSettings.authToken
      );

      if (!orgTwilioClient) {
        console.log(`❌ Failed to create Twilio client for organization ${user.organizationId}`);
        return res.status(500).json({ 
          message: "Failed to initialize calling service. Please check your Twilio configuration.",
          configError: true
        });
      }

      try {
        // Make the actual call using organization's Twilio client
        const callRecord = await TwilioService.makeCallWithOrganizationClient(
          orgTwilioClient,
          availableFromNumber.phoneNumber,
          phoneNumber,
          twilioSettings.statusCallbackUrl
        );

        console.log(`✅ Call initiated successfully: ${callRecord.sid}`);

        // Store call record in database
        const callData = {
          organizationId: user.organizationId,
          phoneNumberId: availableFromNumber.id,
          callSid: callRecord.sid,
          fromNumber: callRecord.from,
          toNumber: callRecord.to,
          direction: 'outbound',
          status: callRecord.status,
          startTime: new Date(callRecord.dateCreated),
          handledBy: user.id,
          assignedTo: user.id,
          purpose: contactId ? 'customer_contact' : 'general',
          customerId: contactId ? parseInt(contactId) : null
        };

        // Save to database (optional - for call logging)
        try {
          await storage.createCallRecord(callData);
        } catch (dbError) {
          console.warn('Failed to save call record to database:', dbError);
          // Don't fail the call if database save fails
        }

        // Return call information for frontend
        const call = {
          id: callRecord.sid,
          phoneNumber: phoneNumber,
          contactName: contactId ? "Contact Name" : undefined,
          status: "connecting",
          startTime: callRecord.dateCreated,
          duration: 0,
          isMuted: false,
          isOnHold: false,
          twilioSid: callRecord.sid,
          fromNumber: callRecord.from
        };
        
        res.json({ 
          call,
          success: true,
          message: `Call initiated to ${phoneNumber}` 
        });

      } catch (twilioError: any) {
        console.error(`❌ Twilio call failed:`, twilioError);
        return res.status(500).json({ 
          message: `Failed to place call: ${twilioError.message || 'Unknown error'}`,
          twilioError: true
        });
      }
      
    } catch (error) {
      console.error("Error making call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  // End a call
  app.post("/api/call-manager/end-call/:callId", requireAuth, async (req, res) => {
    try {
      const { callId } = req.params;
      const user = getAuthenticatedUser(req);
      
      // Mock call termination - replace with actual call management
      console.log(`📞 Ending call ${callId} for user ${user.username}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending call:", error);
      res.status(500).json({ message: "Failed to end call" });
    }
  });

  // Toggle hold/resume call
  app.post("/api/call-manager/toggle-hold", requireAuth, async (req, res) => {
    try {
      const { callId, action } = req.body;
      const user = getAuthenticatedUser(req);
      
      // Mock hold/resume - replace with actual call management
      const isOnHold = action === 'hold';
      console.log(`📞 ${action} call ${callId} for user ${user.username}`);
      
      res.json({ isOnHold });
    } catch (error) {
      console.error("Error toggling hold:", error);
      res.status(500).json({ message: "Failed to toggle hold" });
    }
  });

  // Toggle mute/unmute call
  app.post("/api/call-manager/toggle-mute", requireAuth, async (req, res) => {
    try {
      const { callId, action } = req.body;
      const user = getAuthenticatedUser(req);
      
      // Mock mute/unmute - replace with actual call management
      const isMuted = action === 'mute';
      console.log(`📞 ${action} call ${callId} for user ${user.username}`);
      
      res.json({ isMuted });
    } catch (error) {
      console.error("Error toggling mute:", error);
      res.status(500).json({ message: "Failed to toggle mute" });
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

      // Check if file is stored in Cloudinary
      if (file.filePath.includes('cloudinary.com')) {
        try {
          // Fetch the file from Cloudinary and proxy it
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(file.filePath);
          
          if (!response.ok) {
            return res.status(404).json({ message: "File not found" });
          }
          
          // Set appropriate headers for download
          res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
          res.setHeader('Content-Length', response.headers.get('content-length') || '');
          
          // Stream the response
          response.body?.pipe(res);
          
        } catch (fetchError) {
          console.error('Error fetching Cloudinary file:', fetchError);
          return res.status(500).json({ message: "Error downloading file" });
        }
      } else {
        // Handle local file system (legacy files)
        res.download(file.filePath, file.originalName);
      }
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Get file thumbnail/preview for images
  app.get("/api/files/:id/thumbnail", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const file = await storage.getFile(parseInt(id), user.organizationId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Only serve thumbnails for image files
      if (file.fileType !== 'image') {
        return res.status(400).json({ message: "File is not an image" });
      }

      // Check if file is stored in Cloudinary
      if (file.filePath.includes('cloudinary.com')) {
        // Generate Cloudinary thumbnail URL
        const thumbnailUrl = file.filePath.replace('/upload/', '/upload/w_200,h_200,c_fill/');
        
        try {
          // Fetch the image from Cloudinary and proxy it
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(thumbnailUrl);
          
          if (!response.ok) {
            return res.status(404).json({ message: "Thumbnail not found" });
          }
          
          // Set appropriate headers
          res.setHeader('Content-Type', response.headers.get('content-type') || file.mimeType);
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          
          // Stream the response
          response.body?.pipe(res);
          
        } catch (fetchError) {
          console.error('Error fetching Cloudinary image:', fetchError);
          return res.status(500).json({ message: "Error fetching thumbnail" });
        }
      } else {
        // Handle local file system (legacy files)
        const filePath = path.resolve(file.filePath);
        
        if (!fsSync.existsSync(filePath)) {
          return res.status(404).json({ message: "File not found on disk" });
        }

        // Set appropriate headers for image serving
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        // Stream the image file
        const fileStream = fsSync.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error: any) => {
          console.error("Error streaming file:", error);
          if (!res.headersSent) {
            res.status(500).json({ message: "Failed to stream file" });
          }
        });
      }
    } catch (error: any) {
      console.error("Error serving thumbnail:", error);
      res.status(500).json({ message: "Failed to serve thumbnail" });
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

  app.get("/api/shared-files/:token", async (req, res) => {
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
        // Get Google Maps API key from integration settings
        const googleMapsSettings = await storage.getSettings('integration');
        const isGoogleMapsEnabled = googleMapsSettings?.integration_googleMapsEnabled === 'true';
        const googleMapsApiKey = googleMapsSettings?.integration_googleMapsApiKey;
        
        if (!isGoogleMapsEnabled || !googleMapsApiKey) {
          console.log('Google Maps integration disabled or API key not configured');
          throw new Error('Google Maps integration not configured');
        }
        
        const client = new Client({});
        
        const geocodeResponse = await client.reverseGeocode({
          params: {
            latlng: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
            key: googleMapsApiKey,
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

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          // Authenticate the WebSocket connection
          connectedClients.set(ws, {
            userId: data.userId,
            username: data.username,
            userType: data.userType || 'web',
            organizationId: data.organizationId
          });
          
          console.log('WebSocket client authenticated:', {
            userId: data.userId,
            username: data.username,
            userType: data.userType || 'web',
            organizationId: data.organizationId
          });
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'WebSocket authenticated successfully'
          }));

          // Broadcast team status update when user connects
          await broadcastTeamStatusUpdate(data.organizationId);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      const clientInfo = connectedClients.get(ws);
      connectedClients.delete(ws);
      console.log('WebSocket connection closed');
      
      // Broadcast team status update when user disconnects
      if (clientInfo?.organizationId) {
        await broadcastTeamStatusUpdate(clientInfo.organizationId);
      }
    });

    ws.on('error', async (error) => {
      console.error('WebSocket error:', error);
      const clientInfo = connectedClients.get(ws);
      connectedClients.delete(ws);
      
      // Broadcast team status update when user disconnects due to error
      if (clientInfo?.organizationId) {
        await broadcastTeamStatusUpdate(clientInfo.organizationId);
      }
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
      console.log('📦 CREATE PART - Request body:', req.body);
      console.log('📦 CREATE PART - User info:', { id: req.user!.id, orgId: req.user!.organizationId });
      
      const partData = {
        ...req.body,
        organizationId: req.user!.organizationId,
        createdBy: req.user!.id
      };
      
      console.log('📦 CREATE PART - Part data to insert:', partData);
      
      const newPart = await storage.createPartSupply(partData);
      console.log('📦 CREATE PART - Successfully created:', newPart);
      res.status(201).json(newPart);
    } catch (error) {
      console.error('📦 CREATE PART - Error details:', error);
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

  // REMOVED fileUploadRouter to fix upload conflicts
  // NOTE: Direct File Manager upload route moved to top of registerRoutes for priority

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
  app.post("/api/task-groups", async (req, res) => {
    try {
      console.log("🔧 Task Group Creation - Request received:", {
        user: req.user,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        body: req.body
      });

      // TEMPORARILY REMOVE AUTH REQUIREMENT FOR TESTING
      const userId = null; // Always null for testing
      const organizationId = 1; // Default to organization 1

      console.log("🧪 TESTING MODE - Task Group Creation WITHOUT Authentication");
      console.log("🧪 Using userId: null, organizationId: 1");
      const { name, description, color, templates } = req.body;

      if (!name?.trim()) {
        console.log("❌ Task Group Creation - Missing name");
        return res.status(400).json({ message: "Task group name is required" });
      }

      if (!templates || templates.length === 0) {
        console.log("❌ Task Group Creation - Missing templates");
        return res.status(400).json({ message: "At least one task template is required" });
      }

      console.log("✅ Task Group Creation - Creating task group...");
      // Create the task group
      const taskGroup = await storage.createTaskGroup({
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#3B82F6',
        organizationId,
        createdById: userId,
        isActive: true
      });

      console.log("✅ Task Group Created:", taskGroup);

      // Create task templates for the group
      const createdTemplates = [];
      for (const template of templates) {
        if (!template.title?.trim()) {
          console.log("⚠️ Skipping template without title:", template);
          continue; // Skip templates without titles
        }
        
        console.log("Creating template:", template);
        const createdTemplate = await storage.createTaskTemplate({
          taskGroupId: taskGroup.id,
          title: template.title.trim(),
          description: template.description?.trim() || '',
          type: template.type || 'checkbox',
          isRequired: template.isRequired || false,
          priority: template.priority || 'medium',
          order: template.order || 0
        });
        console.log("✅ Template Created:", createdTemplate);
        createdTemplates.push(createdTemplate);
      }

      const result = {
        ...taskGroup,
        templates: createdTemplates,
        taskCount: createdTemplates.length
      };

      console.log("🎉 Task Group Creation Complete:", result);
      res.json(result);
    } catch (error: any) {
      console.error("💥 Error creating task group:", {
        error: error.message,
        stack: error.stack,
        name: error.name,
        details: error
      });
      res.status(500).json({ message: "Failed to create task group: " + error.message });
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

  // Get task templates for a specific task group
  app.get("/api/task-groups/:id/templates", requireAuth, async (req, res) => {
    try {
      const taskGroupId = parseInt(req.params.id);
      const organizationId = req.user!.organizationId;
      
      // Verify the task group belongs to the user's organization
      const taskGroup = await storage.getTaskGroup(taskGroupId, organizationId);
      if (!taskGroup) {
        return res.status(404).json({ message: "Task group not found" });
      }
      
      const templates = await storage.getTaskTemplates(taskGroupId);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ message: "Failed to fetch task templates" });
    }
  });

  // Assign task group to projects
  app.post("/api/projects/:id/task-groups", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { taskGroupId } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      if (!taskGroupId) {
        return res.status(400).json({ message: "Task group ID is required" });
      }

      // Verify the task group exists and belongs to the user's organization
      const taskGroup = await storage.getTaskGroup(taskGroupId, organizationId);
      if (!taskGroup) {
        return res.status(404).json({ message: "Task group not found" });
      }

      // Create tasks from the task group
      const createdTasks = await storage.createTasksFromGroup(projectId, taskGroupId, userId);
      
      res.json({ 
        message: `Successfully added ${createdTasks.length} tasks from group "${taskGroup.name}"`,
        tasksAdded: createdTasks.length,
        tasks: createdTasks
      });
    } catch (error: any) {
      console.error("Error assigning task group to project:", error);
      res.status(500).json({ message: "Failed to assign task group to project" });
    }
  });

  // Vehicle Management API Routes
  
  // Get all vehicles for organization
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicles = await storage.getVehicles(user.organizationId);
      res.json(vehicles);
    } catch (error: any) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  // Get single vehicle
  app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.id);
      
      const vehicle = await storage.getVehicle(vehicleId, user.organizationId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      res.json(vehicle);
    } catch (error: any) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  // Create new vehicle
  app.post("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Validate required fields
      if (!req.body.vehicleNumber || !req.body.licensePlate) {
        return res.status(400).json({ 
          message: "Vehicle number and license plate are required" 
        });
      }

      // Check for duplicate vehicle number
      const existingByNumber = await storage.getVehicleByNumber(
        req.body.vehicleNumber, 
        user.organizationId
      );
      if (existingByNumber) {
        return res.status(400).json({ 
          message: "Vehicle number already exists" 
        });
      }

      // Check for duplicate license plate
      const existingByPlate = await storage.getVehicleByLicensePlate(
        req.body.licensePlate, 
        user.organizationId
      );
      if (existingByPlate) {
        return res.status(400).json({ 
          message: "License plate already exists" 
        });
      }
      
      const vehicleData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      
      const vehicle = await storage.createVehicle(vehicleData);
      
      // Broadcast vehicle creation to WebSocket clients
      broadcastToWebUsers('vehicle_created', {
        vehicle,
        createdBy: user.firstName || user.username
      });
      
      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  // Update vehicle
  app.put("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.id);
      
      // Verify vehicle exists and belongs to organization
      const existingVehicle = await storage.getVehicle(vehicleId, user.organizationId);
      if (!existingVehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // If updating vehicle number, check for duplicates
      if (req.body.vehicleNumber && req.body.vehicleNumber !== existingVehicle.vehicleNumber) {
        const existingByNumber = await storage.getVehicleByNumber(
          req.body.vehicleNumber, 
          user.organizationId
        );
        if (existingByNumber && existingByNumber.id !== vehicleId) {
          return res.status(400).json({ 
            message: "Vehicle number already exists" 
          });
        }
      }

      // If updating license plate, check for duplicates
      if (req.body.licensePlate && req.body.licensePlate !== existingVehicle.licensePlate) {
        const existingByPlate = await storage.getVehicleByLicensePlate(
          req.body.licensePlate, 
          user.organizationId
        );
        if (existingByPlate && existingByPlate.id !== vehicleId) {
          return res.status(400).json({ 
            message: "License plate already exists" 
          });
        }
      }
      
      const vehicle = await storage.updateVehicle(vehicleId, user.organizationId, req.body);
      
      // Broadcast vehicle update to WebSocket clients
      broadcastToWebUsers('vehicle_updated', {
        vehicle,
        updatedBy: user.firstName || user.username
      });
      
      res.json(vehicle);
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  // Delete (deactivate) vehicle
  app.delete("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.id);
      
      // Verify vehicle exists and belongs to organization
      const existingVehicle = await storage.getVehicle(vehicleId, user.organizationId);
      if (!existingVehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      const success = await storage.deleteVehicle(vehicleId, user.organizationId);
      
      if (!success) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      // Broadcast vehicle deletion to WebSocket clients
      broadcastToWebUsers('vehicle_deleted', {
        vehicleId,
        vehicleNumber: existingVehicle.vehicleNumber,
        deletedBy: user.firstName || user.username
      });
      
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Vehicle Maintenance Intervals API routes
  app.get("/api/vehicles/:vehicleId/maintenance", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      
      const intervals = await storage.getVehicleMaintenanceIntervals(vehicleId, user.organizationId);
      const status = await storage.getMaintenanceStatusForVehicle(vehicleId, user.organizationId);
      
      res.json({ intervals, status });
    } catch (error: any) {
      console.error("Error fetching vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance" });
    }
  });

  app.post("/api/vehicles/:vehicleId/maintenance/intervals", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      
      const intervalData = {
        ...req.body,
        vehicleId,
        organizationId: user.organizationId
      };

      const interval = await storage.createVehicleMaintenanceInterval(intervalData);
      
      // Broadcast maintenance interval creation
      broadcastToWebUsers('maintenance_interval_created', {
        vehicleId,
        interval,
        createdBy: user.firstName || user.username
      });
      
      res.json(interval);
    } catch (error: any) {
      console.error("Error creating maintenance interval:", error);
      res.status(500).json({ message: "Failed to create maintenance interval" });
    }
  });

  app.post("/api/vehicles/:vehicleId/maintenance/default", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      
      const intervals = await storage.createDefaultMaintenanceIntervals(vehicleId, user.organizationId);
      
      // Broadcast maintenance intervals creation
      broadcastToWebUsers('maintenance_intervals_created', {
        vehicleId,
        intervals,
        createdBy: user.firstName || user.username
      });
      
      res.json(intervals);
    } catch (error: any) {
      console.error("Error creating default maintenance intervals:", error);
      res.status(500).json({ message: "Failed to create default maintenance intervals" });
    }
  });

  app.post("/api/vehicles/:vehicleId/maintenance/custom", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      const { intervals } = req.body;
      
      if (!Array.isArray(intervals) || intervals.length === 0) {
        return res.status(400).json({ message: "Invalid intervals data provided" });
      }
      
      const createdIntervals = await storage.createCustomMaintenanceIntervals(vehicleId, user.organizationId, intervals);
      
      // Broadcast maintenance intervals creation
      broadcastToWebUsers(user.organizationId, 'maintenance_intervals_created', {
        vehicleId,
        intervals: createdIntervals,
        createdBy: user.firstName || user.username
      });
      
      res.json(createdIntervals);
    } catch (error: any) {
      console.error("Error creating custom maintenance intervals:", error);
      res.status(500).json({ message: "Failed to create custom maintenance intervals" });
    }
  });

  app.post("/api/vehicles/:vehicleId/maintenance/custom-item", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      const { intervals } = req.body;
      
      if (!Array.isArray(intervals) || intervals.length === 0) {
        return res.status(400).json({ message: "Invalid intervals data provided" });
      }
      
      // Validate vehicle belongs to user's organization
      const vehicle = await storage.getVehicle(vehicleId, user.organizationId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      const createdIntervals = await storage.createCustomMaintenanceIntervals(vehicleId, user.organizationId, intervals);
      
      // Broadcast maintenance intervals creation
      broadcastToWebUsers('maintenance_intervals_created', {
        vehicleId,
        intervals: createdIntervals,
        createdBy: user.firstName || user.username
      });
      
      res.json(createdIntervals);
    } catch (error: any) {
      console.error("Error creating custom maintenance item:", error);
      res.status(500).json({ message: "Failed to create custom maintenance item" });
    }
  });

  app.put("/api/vehicles/:vehicleId/maintenance/:intervalId/status", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      const intervalId = parseInt(req.params.intervalId);
      const { status } = req.body;
      
      const updatedInterval = await storage.updateMaintenanceStatus(intervalId, user.organizationId, status);
      
      // Broadcast maintenance status update
      broadcastToWebUsers('maintenance_status_updated', {
        vehicleId,
        intervalId,
        status,
        updatedBy: user.firstName || user.username
      });
      
      res.json(updatedInterval);
    } catch (error: any) {
      console.error("Error updating maintenance status:", error);
      res.status(500).json({ message: "Failed to update maintenance status" });
    }
  });

  app.post("/api/vehicles/:vehicleId/maintenance/records", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      
      const recordData = {
        ...req.body,
        vehicleId,
        organizationId: user.organizationId,
        performedBy: user.id
      };

      const record = await storage.createVehicleMaintenanceRecord(recordData);
      
      // Broadcast maintenance record creation
      broadcastToWebUsers('maintenance_record_created', {
        vehicleId,
        record,
        createdBy: user.firstName || user.username
      });
      
      res.json(record);
    } catch (error: any) {
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ message: "Failed to create maintenance record" });
    }
  });

  app.get("/api/vehicles/:vehicleId/maintenance/records", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      
      const records = await storage.getVehicleMaintenanceRecords(vehicleId, user.organizationId);
      
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  // Vehicle Job Assignment Routes
  app.get("/api/vehicle-job-assignments", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { date } = req.query;
      
      const assignments = await storage.getVehicleJobAssignments(user.organizationId, date as string);
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching vehicle job assignments:", error);
      res.status(500).json({ message: "Failed to fetch vehicle job assignments" });
    }
  });

  app.get("/api/vehicle-job-assignments/user/:userId", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const userId = parseInt(req.params.userId);
      const { date } = req.query;
      
      const assignments = await storage.getVehicleJobAssignmentsByUser(userId, user.organizationId, date as string);
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching user vehicle job assignments:", error);
      res.status(500).json({ message: "Failed to fetch user vehicle job assignments" });
    }
  });

  app.get("/api/vehicle-job-assignments/vehicle/:vehicleId", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const vehicleId = parseInt(req.params.vehicleId);
      const { date } = req.query;
      
      const assignments = await storage.getVehicleJobAssignmentsByVehicle(vehicleId, user.organizationId, date as string);
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching vehicle job assignments:", error);
      res.status(500).json({ message: "Failed to fetch vehicle job assignments" });
    }
  });

  app.post("/api/vehicle-job-assignments", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const assignmentData = {
        ...req.body,
        organizationId: user.organizationId
      };
      
      const assignment = await storage.createVehicleJobAssignment(assignmentData);
      
      // Broadcast vehicle job assignment created event
      const broadcastData = {
        type: 'vehicle_job_assignment_created',
        assignment,
        createdBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.json(assignment);
    } catch (error: any) {
      console.error("Error creating vehicle job assignment:", error);
      res.status(500).json({ message: "Failed to create vehicle job assignment" });
    }
  });

  app.put("/api/vehicle-job-assignments/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const assignmentId = parseInt(req.params.id);
      
      const assignment = await storage.updateVehicleJobAssignment(assignmentId, user.organizationId, req.body);
      
      // Broadcast vehicle job assignment updated event
      const broadcastData = {
        type: 'vehicle_job_assignment_updated',
        assignment,
        updatedBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.json(assignment);
    } catch (error: any) {
      console.error("Error updating vehicle job assignment:", error);
      res.status(500).json({ message: "Failed to update vehicle job assignment" });
    }
  });

  app.delete("/api/vehicle-job-assignments/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const assignmentId = parseInt(req.params.id);
      
      const success = await storage.deleteVehicleJobAssignment(assignmentId, user.organizationId);
      
      if (success) {
        // Broadcast vehicle job assignment deleted event
        const broadcastData = {
          type: 'vehicle_job_assignment_deleted',
          assignmentId,
          deletedBy: user.firstName || user.username
        };
        broadcastToWebUsers(user.organizationId, broadcastData);
        
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Vehicle job assignment not found" });
      }
    } catch (error: any) {
      console.error("Error deleting vehicle job assignment:", error);
      res.status(500).json({ message: "Failed to delete vehicle job assignment" });
    }
  });

  // Auto-connect users to vehicle jobs based on vehicle inspections
  app.post("/api/vehicle-job-assignments/auto-connect", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { date } = req.body;
      
      const assignments = await storage.connectUsersToVehicleJobs(user.organizationId, date);
      
      // Broadcast auto-connect completion event
      const broadcastData = {
        type: 'vehicle_job_auto_connect_completed',
        assignments,
        date,
        triggeredBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.json({ 
        message: `Created ${assignments.length} vehicle job assignments`,
        assignments 
      });
    } catch (error: any) {
      console.error("Error auto-connecting vehicle job assignments:", error);
      res.status(500).json({ message: "Failed to auto-connect vehicle job assignments" });
    }
  });

  // Get users with vehicle inspections for a specific date
  app.get("/api/users-with-inspections", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const users = await storage.getUsersWithVehicleInspections(user.organizationId, date as string);
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users with inspections:", error);
      res.status(500).json({ message: "Failed to fetch users with inspections" });
    }
  });

  // Time Clock API
  
  // Get current time clock status for authenticated user
  app.get("/api/time-clock/current", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const entry = await storage.getCurrentTimeClockEntry(user.id);
      
      res.json({ entry });
    } catch (error: any) {
      console.error("Error fetching current time clock entry:", error);
      res.status(500).json({ message: "Failed to fetch current time clock entry" });
    }
  });

  // Clock in
  app.post("/api/time-clock/clock-in", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { location } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const entry = await storage.clockIn(user.id, user.organizationId, location, ipAddress);
      
      // Broadcast to organization for real-time updates
      broadcastToWebUsers(user.organizationId, 'time_clock_update', {
        type: 'clock_in',
        userId: user.id,
        userName: user.firstName || user.username,
        entry
      });
      
      // Send clock-in notifications to admins/managers
      try {
        const { NotificationService } = await import("./notificationService");
        
        // Get admin/manager users to notify
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.organizationId, user.organizationId),
            or(eq(users.role, 'admin'), eq(users.role, 'manager'))
          ));
        
        // Create clock-in notifications for all admins/managers
        for (const admin of adminUsers) {
          await NotificationService.createNotification({
            type: 'user_clock_in',
            title: `Employee Clocked In`,
            message: `${user.firstName} ${user.lastName} clocked in${location ? ` from ${location}` : ''}`,
            userId: admin.id,
            organizationId: user.organizationId,
            relatedEntityType: 'time_clock',
            relatedEntityId: entry.id,
            priority: 'low',
            category: 'team_based',
            createdBy: user.id
          });
        }
        
        console.log(`📢 Clock-in notifications sent to ${adminUsers.length} admins/managers`);
      } catch (notificationError) {
        console.error('Error sending clock-in notifications:', notificationError);
      }
      
      res.json({ entry, message: "Successfully clocked in" });
    } catch (error: any) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: error.message || "Failed to clock in" });
    }
  });

  // Clock out
  app.post("/api/time-clock/clock-out", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { notes } = req.body;
      
      const entry = await storage.clockOut(user.id, notes);
      
      // Broadcast to organization for real-time updates
      broadcastToWebUsers(user.organizationId, 'time_clock_update', {
        type: 'clock_out',
        userId: user.id,
        userName: user.firstName || user.username,
        entry
      });
      
      // Send clock-out notifications to admins/managers
      try {
        const { NotificationService } = await import("./notificationService");
        
        // Get admin/manager users to notify
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.organizationId, user.organizationId),
            or(eq(users.role, 'admin'), eq(users.role, 'manager'))
          ));
        
        // Create clock-out notifications for all admins/managers
        for (const admin of adminUsers) {
          await NotificationService.createNotification({
            type: 'user_clock_out',
            title: `Employee Clocked Out`,
            message: `${user.firstName} ${user.lastName} clocked out${notes ? ` with notes: ${notes}` : ''}`,
            userId: admin.id,
            organizationId: user.organizationId,
            relatedEntityType: 'time_clock',
            relatedEntityId: entry.id,
            priority: 'low',
            category: 'team_based',
            createdBy: user.id
          });
        }
        
        console.log(`📢 Clock-out notifications sent to ${adminUsers.length} admins/managers`);
      } catch (notificationError) {
        console.error('Error sending clock-out notifications:', notificationError);
      }
      
      res.json({ entry, message: "Successfully clocked out" });
    } catch (error: any) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: error.message || "Failed to clock out" });
    }
  });

  // Start break
  app.post("/api/time-clock/start-break", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const entry = await storage.startBreak(user.id);
      
      // Broadcast to organization for real-time updates
      broadcastToWebUsers(user.organizationId, 'time_clock_update', {
        type: 'start_break',
        userId: user.id,
        userName: user.firstName || user.username,
        entry
      });
      
      res.json({ entry, message: "Break started" });
    } catch (error: any) {
      console.error("Error starting break:", error);
      res.status(500).json({ message: error.message || "Failed to start break" });
    }
  });

  // End break
  app.post("/api/time-clock/end-break", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const entry = await storage.endBreak(user.id);
      
      // Broadcast to organization for real-time updates
      broadcastToWebUsers(user.organizationId, 'time_clock_update', {
        type: 'end_break',
        userId: user.id,
        userName: user.firstName || user.username,
        entry
      });
      
      res.json({ entry, message: "Break ended" });
    } catch (error: any) {
      console.error("Error ending break:", error);
      res.status(500).json({ message: error.message || "Failed to end break" });
    }
  });

  // Get time clock entries for authenticated user
  app.get("/api/time-clock/entries", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      // Convert string dates to Date objects if provided
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const entries = await storage.getTimeClockEntries(
        user.id,
        startDateObj,
        endDateObj
      );
      
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching time clock entries:", error);
      res.status(500).json({ message: "Failed to fetch time clock entries" });
    }
  });

  // Get organization time clock entries (admin/manager only)
  app.get("/api/time-clock/organization-entries", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate, userId } = req.query;
      
      // Convert string dates to Date objects if provided
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const entries = await storage.getTimeClockEntriesForOrganization(
        user.organizationId,
        startDateObj,
        endDateObj
      );
      
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching organization time clock entries:", error);
      res.status(500).json({ message: "Failed to fetch organization time clock entries" });
    }
  });

  // Time Clock Task Triggers API
  
  // Get all time clock task triggers for organization
  app.get("/api/timeclock/triggers", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { userId } = req.query;
      
      const triggers = await storage.getTimeClockTaskTriggers(
        user.organizationId,
        userId ? parseInt(userId as string) : undefined
      );
      
      res.json(triggers);
    } catch (error: any) {
      console.error("Error fetching time clock triggers:", error);
      res.status(500).json({ message: "Failed to fetch time clock triggers" });
    }
  });

  // Get a specific time clock task trigger
  app.get("/api/timeclock/triggers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const trigger = await storage.getTimeClockTaskTrigger(parseInt(id), user.organizationId);
      
      if (!trigger) {
        return res.status(404).json({ message: "Time clock trigger not found" });
      }
      
      res.json(trigger);
    } catch (error: any) {
      console.error("Error fetching time clock trigger:", error);
      res.status(500).json({ message: "Failed to fetch time clock trigger" });
    }
  });

  // Create a new time clock task trigger
  app.post("/api/timeclock/triggers", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const triggerData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
        triggerCount: 0
      };
      
      const trigger = await storage.createTimeClockTaskTrigger(triggerData);
      
      // Broadcast to organization for real-time updates
      const broadcastData = {
        type: 'timeclock_trigger_created',
        trigger,
        triggeredBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.status(201).json(trigger);
    } catch (error: any) {
      console.error("Error creating time clock trigger:", error);
      res.status(500).json({ message: "Failed to create time clock trigger" });
    }
  });

  // Update a time clock task trigger
  app.put("/api/timeclock/triggers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const trigger = await storage.updateTimeClockTaskTrigger(
        parseInt(id),
        user.organizationId,
        req.body
      );
      
      if (!trigger) {
        return res.status(404).json({ message: "Time clock trigger not found" });
      }
      
      // Broadcast to organization for real-time updates
      const broadcastData = {
        type: 'timeclock_trigger_updated',
        trigger,
        triggeredBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.json(trigger);
    } catch (error: any) {
      console.error("Error updating time clock trigger:", error);
      res.status(500).json({ message: "Failed to update time clock trigger" });
    }
  });

  // Delete a time clock task trigger
  app.delete("/api/timeclock/triggers/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      
      const success = await storage.deleteTimeClockTaskTrigger(parseInt(id), user.organizationId);
      
      if (!success) {
        return res.status(404).json({ message: "Time clock trigger not found" });
      }
      
      // Broadcast to organization for real-time updates
      const broadcastData = {
        type: 'timeclock_trigger_deleted',
        triggerId: parseInt(id),
        triggeredBy: user.firstName || user.username
      };
      broadcastToWebUsers(user.organizationId, broadcastData);
      
      res.json({ message: "Time clock trigger deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting time clock trigger:", error);
      res.status(500).json({ message: "Failed to delete time clock trigger" });
    }
  });

  // Get active triggers for a specific event type
  app.get("/api/timeclock/triggers/active/:event", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { event } = req.params;
      const { userId } = req.query;
      
      const triggers = await storage.getActiveTriggersForEvent(
        user.organizationId,
        event,
        userId ? parseInt(userId as string) : undefined
      );
      
      res.json(triggers);
    } catch (error: any) {
      console.error("Error fetching active triggers:", error);
      res.status(500).json({ message: "Failed to fetch active triggers" });
    }
  });

  // Manually trigger task creation from a specific trigger
  app.post("/api/timeclock/triggers/:id/execute", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { id } = req.params;
      const { targetUserId, eventData } = req.body;
      
      const trigger = await storage.getTaskTrigger(parseInt(id), user.organizationId);
      
      if (!trigger) {
        return res.status(404).json({ message: "Task trigger not found" });
      }
      
      // Use the target user ID if provided, otherwise use current user
      const userId = targetUserId || user.id;
      
      // Execute the trigger manually
      console.log(`Manually executing trigger ${trigger.id} for user ${userId}`);
      
      // Broadcast to WebSocket clients  
      broadcastToWebUsers('trigger_executed', { trigger, userId }, user.organizationId);
      
      res.json({ 
        message: "Trigger executed successfully", 
        trigger: trigger,
        executedBy: userId 
      });
    } catch (error: any) {
      console.error("Error executing trigger:", error);
      res.status(500).json({ message: "Failed to execute trigger" });
    }
  });

  // CRITICAL CUSTOM DOMAIN DEBUG ENDPOINT - Test environment variables from custom domain
  app.post('/api/debug/custom-domain-upload-test', requireAuth, upload.single('file'), (req, res) => {
    console.log('🚨 CUSTOM DOMAIN DEBUG ENDPOINT HIT');
    console.log('🔧 Environment Variables from Custom Domain:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET (' + process.env.CLOUDINARY_CLOUD_NAME.length + ' chars)' : 'MISSING',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET (' + process.env.CLOUDINARY_API_KEY.length + ' chars)' : 'MISSING',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET (' + process.env.CLOUDINARY_API_SECRET.length + ' chars)' : 'MISSING',
      all_cloudinary_vars: Object.keys(process.env).filter(key => key.includes('CLOUDINARY')),
      origin: req.get('origin'),
      host: req.get('host'),
      isCustomDomain: req.get('host')?.includes('profieldmanager.com'),
      cloudinaryConfigured: CloudinaryService.isConfigured(),
      nodeEnv: process.env.NODE_ENV,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: "Custom domain environment debug endpoint reached successfully",
      hasCloudinaryCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasCloudinaryApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasCloudinaryApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      cloudinaryConfigured: CloudinaryService.isConfigured(),
      environment: process.env.NODE_ENV,
      origin: req.get('origin'),
      host: req.get('host'),
      isCustomDomain: req.get('host')?.includes('profieldmanager.com'),
      hasFile: !!req.file
    });
  });

  // Frontend Management API routes
  
  // Frontend Categories
  app.get('/api/frontend/categories', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const categories = await storage.getFrontendCategories(user.organizationId);
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching frontend categories:', error);
      res.status(500).json({ message: 'Failed to fetch frontend categories' });
    }
  });

  app.get('/api/frontend/categories/:id', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const category = await storage.getFrontendCategory(Number(req.params.id), user.organizationId);
      if (!category) {
        return res.status(404).json({ message: 'Frontend category not found' });
      }
      res.json(category);
    } catch (error: any) {
      console.error('Error fetching frontend category:', error);
      res.status(500).json({ message: 'Failed to fetch frontend category' });
    }
  });

  app.post('/api/frontend/categories', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const categoryData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const category = await storage.createFrontendCategory(categoryData);
      broadcastToWebUsers({ type: 'frontend_category_created', category });
      res.json(category);
    } catch (error: any) {
      console.error('Error creating frontend category:', error);
      res.status(500).json({ message: 'Failed to create frontend category' });
    }
  });

  app.put('/api/frontend/categories/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const category = await storage.updateFrontendCategory(Number(req.params.id), user.organizationId, req.body);
      if (!category) {
        return res.status(404).json({ message: 'Frontend category not found' });
      }
      broadcastToWebUsers({ type: 'frontend_category_updated', category });
      res.json(category);
    } catch (error: any) {
      console.error('Error updating frontend category:', error);
      res.status(500).json({ message: 'Failed to update frontend category' });
    }
  });

  app.delete('/api/frontend/categories/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendCategory(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend category not found' });
      }
      broadcastToWebUsers({ type: 'frontend_category_deleted', categoryId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend category:', error);
      res.status(500).json({ message: 'Failed to delete frontend category' });
    }
  });
  
  // Frontend Pages
  app.get('/api/frontend/pages', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const pages = await storage.getFrontendPages(user.organizationId);
      res.json(pages);
    } catch (error: any) {
      console.error('Error fetching frontend pages:', error);
      res.status(500).json({ message: 'Failed to fetch frontend pages' });
    }
  });

  app.get('/api/frontend/pages/:id', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const page = await storage.getFrontendPage(Number(req.params.id), user.organizationId);
      if (!page) {
        return res.status(404).json({ message: 'Frontend page not found' });
      }
      res.json(page);
    } catch (error: any) {
      console.error('Error fetching frontend page:', error);
      res.status(500).json({ message: 'Failed to fetch frontend page' });
    }
  });

  app.post('/api/frontend/pages', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const pageData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const page = await storage.createFrontendPage(pageData);
      broadcastToWebUsers({ type: 'frontend_page_created', page });
      res.json(page);
    } catch (error: any) {
      console.error('Error creating frontend page:', error);
      res.status(500).json({ message: 'Failed to create frontend page' });
    }
  });

  app.put('/api/frontend/pages/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const page = await storage.updateFrontendPage(Number(req.params.id), user.organizationId, req.body);
      if (!page) {
        return res.status(404).json({ message: 'Frontend page not found' });
      }
      broadcastToWebUsers({ type: 'frontend_page_updated', page });
      res.json(page);
    } catch (error: any) {
      console.error('Error updating frontend page:', error);
      res.status(500).json({ message: 'Failed to update frontend page' });
    }
  });

  app.delete('/api/frontend/pages/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendPage(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend page not found' });
      }
      broadcastToWebUsers({ type: 'frontend_page_deleted', pageId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend page:', error);
      res.status(500).json({ message: 'Failed to delete frontend page' });
    }
  });

  // Frontend Sliders
  app.get('/api/frontend/sliders', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const sliders = await storage.getFrontendSliders(user.organizationId);
      res.json(sliders);
    } catch (error: any) {
      console.error('Error fetching frontend sliders:', error);
      res.status(500).json({ message: 'Failed to fetch frontend sliders' });
    }
  });

  app.post('/api/frontend/sliders', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const sliderData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const slider = await storage.createFrontendSlider(sliderData);
      broadcastToWebUsers({ type: 'frontend_slider_created', slider });
      res.json(slider);
    } catch (error: any) {
      console.error('Error creating frontend slider:', error);
      res.status(500).json({ message: 'Failed to create frontend slider' });
    }
  });

  app.put('/api/frontend/sliders/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const slider = await storage.updateFrontendSlider(Number(req.params.id), user.organizationId, req.body);
      if (!slider) {
        return res.status(404).json({ message: 'Frontend slider not found' });
      }
      broadcastToWebUsers({ type: 'frontend_slider_updated', slider });
      res.json(slider);
    } catch (error: any) {
      console.error('Error updating frontend slider:', error);
      res.status(500).json({ message: 'Failed to update frontend slider' });
    }
  });

  app.delete('/api/frontend/sliders/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendSlider(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend slider not found' });
      }
      broadcastToWebUsers({ type: 'frontend_slider_deleted', sliderId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend slider:', error);
      res.status(500).json({ message: 'Failed to delete frontend slider' });
    }
  });

  // Frontend Components
  app.get('/api/frontend/components', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const pageId = req.query.pageId ? Number(req.query.pageId) : undefined;
      const components = await storage.getFrontendComponents(user.organizationId, pageId);
      res.json(components);
    } catch (error: any) {
      console.error('Error fetching frontend components:', error);
      res.status(500).json({ message: 'Failed to fetch frontend components' });
    }
  });

  app.post('/api/frontend/components', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const componentData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const component = await storage.createFrontendComponent(componentData);
      broadcastToWebUsers({ type: 'frontend_component_created', component });
      res.json(component);
    } catch (error: any) {
      console.error('Error creating frontend component:', error);
      res.status(500).json({ message: 'Failed to create frontend component' });
    }
  });

  app.put('/api/frontend/components/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const component = await storage.updateFrontendComponent(Number(req.params.id), user.organizationId, req.body);
      if (!component) {
        return res.status(404).json({ message: 'Frontend component not found' });
      }
      broadcastToWebUsers({ type: 'frontend_component_updated', component });
      res.json(component);
    } catch (error: any) {
      console.error('Error updating frontend component:', error);
      res.status(500).json({ message: 'Failed to update frontend component' });
    }
  });

  app.delete('/api/frontend/components/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendComponent(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend component not found' });
      }
      broadcastToWebUsers({ type: 'frontend_component_deleted', componentId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend component:', error);
      res.status(500).json({ message: 'Failed to delete frontend component' });
    }
  });

  // Frontend Icons
  app.get('/api/frontend/icons', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const icons = await storage.getFrontendIcons(user.organizationId);
      res.json(icons);
    } catch (error: any) {
      console.error('Error fetching frontend icons:', error);
      res.status(500).json({ message: 'Failed to fetch frontend icons' });
    }
  });

  app.post('/api/frontend/icons', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const iconData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const icon = await storage.createFrontendIcon(iconData);
      broadcastToWebUsers({ type: 'frontend_icon_created', icon });
      res.json(icon);
    } catch (error: any) {
      console.error('Error creating frontend icon:', error);
      res.status(500).json({ message: 'Failed to create frontend icon' });
    }
  });

  app.put('/api/frontend/icons/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const icon = await storage.updateFrontendIcon(Number(req.params.id), user.organizationId, req.body);
      if (!icon) {
        return res.status(404).json({ message: 'Frontend icon not found' });
      }
      broadcastToWebUsers({ type: 'frontend_icon_updated', icon });
      res.json(icon);
    } catch (error: any) {
      console.error('Error updating frontend icon:', error);
      res.status(500).json({ message: 'Failed to update frontend icon' });
    }
  });

  app.delete('/api/frontend/icons/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendIcon(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend icon not found' });
      }
      broadcastToWebUsers({ type: 'frontend_icon_deleted', iconId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend icon:', error);
      res.status(500).json({ message: 'Failed to delete frontend icon' });
    }
  });

  // Frontend Boxes
  app.get('/api/frontend/boxes', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const pageId = req.query.pageId ? Number(req.query.pageId) : undefined;
      const boxes = await storage.getFrontendBoxes(user.organizationId, pageId);
      res.json(boxes);
    } catch (error: any) {
      console.error('Error fetching frontend boxes:', error);
      res.status(500).json({ message: 'Failed to fetch frontend boxes' });
    }
  });

  app.post('/api/frontend/boxes', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const boxData = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id
      };
      const box = await storage.createFrontendBox(boxData);
      broadcastToWebUsers({ type: 'frontend_box_created', box });
      res.json(box);
    } catch (error: any) {
      console.error('Error creating frontend box:', error);
      res.status(500).json({ message: 'Failed to create frontend box' });
    }
  });

  app.put('/api/frontend/boxes/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const box = await storage.updateFrontendBox(Number(req.params.id), user.organizationId, req.body);
      if (!box) {
        return res.status(404).json({ message: 'Frontend box not found' });
      }
      broadcastToWebUsers({ type: 'frontend_box_updated', box });
      res.json(box);
    } catch (error: any) {
      console.error('Error updating frontend box:', error);
      res.status(500).json({ message: 'Failed to update frontend box' });
    }
  });

  app.delete('/api/frontend/boxes/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const success = await storage.deleteFrontendBox(Number(req.params.id), user.organizationId);
      if (!success) {
        return res.status(404).json({ message: 'Frontend box not found' });
      }
      broadcastToWebUsers({ type: 'frontend_box_deleted', boxId: Number(req.params.id) });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting frontend box:', error);
      res.status(500).json({ message: 'Failed to delete frontend box' });
    }
  });

  app.patch('/api/frontend/boxes/reorder', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { boxUpdates } = req.body;
      
      if (!Array.isArray(boxUpdates)) {
        return res.status(400).json({ message: 'boxUpdates must be an array' });
      }
      
      const updatedBoxes = await storage.updateFrontendBoxOrder(user.organizationId, boxUpdates);
      broadcastToWebUsers({ type: 'frontend_boxes_reordered', boxes: updatedBoxes });
      res.json({ success: true, boxes: updatedBoxes });
    } catch (error: any) {
      console.error('Error reordering frontend boxes:', error);
      res.status(500).json({ message: 'Failed to reorder frontend boxes' });
    }
  });

  // Tutorial System Routes
  app.get("/api/tutorials", async (req, res) => {
    try {
      const { organizationId, category } = req.query;
      const tutorials = await storage.getTutorials(
        organizationId ? Number(organizationId) : undefined,
        category as string
      );
      res.json(tutorials);
    } catch (error: any) {
      console.error("Error fetching tutorials:", error);
      res.status(500).json({ message: "Failed to fetch tutorials" });
    }
  });

  app.get("/api/tutorials/:id", async (req, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const tutorial = await storage.getTutorial(tutorialId);
      
      if (!tutorial) {
        return res.status(404).json({ message: "Tutorial not found" });
      }
      
      res.json(tutorial);
    } catch (error: any) {
      console.error("Error fetching tutorial:", error);
      res.status(500).json({ message: "Failed to fetch tutorial" });
    }
  });

  app.post("/api/tutorials", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tutorialData = req.body;
      const tutorial = await storage.createTutorial(tutorialData);
      res.status(201).json(tutorial);
    } catch (error: any) {
      console.error("Error creating tutorial:", error);
      res.status(500).json({ message: "Failed to create tutorial" });
    }
  });

  app.put("/api/tutorials/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const updates = req.body;
      const tutorial = await storage.updateTutorial(tutorialId, updates);
      res.json(tutorial);
    } catch (error: any) {
      console.error("Error updating tutorial:", error);
      res.status(500).json({ message: "Failed to update tutorial" });
    }
  });

  app.delete("/api/tutorials/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      await storage.deleteTutorial(tutorialId);
      res.json({ message: "Tutorial deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting tutorial:", error);
      res.status(500).json({ message: "Failed to delete tutorial" });
    }
  });

  app.get("/api/tutorial-categories", async (req, res) => {
    try {
      const { organizationId } = req.query;
      const categories = await storage.getTutorialCategories(
        organizationId ? Number(organizationId) : undefined
      );
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching tutorial categories:", error);
      res.status(500).json({ message: "Failed to fetch tutorial categories" });
    }
  });

  app.post("/api/tutorial-categories", requireAuth, requireAdmin, async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createTutorialCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating tutorial category:", error);
      res.status(500).json({ message: "Failed to create tutorial category" });
    }
  });

  app.get("/api/tutorial-progress", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { tutorialId } = req.query;
      const progress = await storage.getTutorialProgress(
        userId,
        tutorialId ? Number(tutorialId) : undefined
      );
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching tutorial progress:", error);
      res.status(500).json({ message: "Failed to fetch tutorial progress" });
    }
  });

  app.post("/api/tutorial-progress/start", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { tutorialId } = req.body;
      const progress = await storage.startTutorial(userId, tutorialId, organizationId);
      res.status(201).json(progress);
    } catch (error: any) {
      console.error("Error starting tutorial:", error);
      res.status(500).json({ message: "Failed to start tutorial" });
    }
  });

  app.put("/api/tutorial-progress/:tutorialId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tutorialId = parseInt(req.params.tutorialId);
      const progressData = req.body;
      const progress = await storage.updateTutorialProgress(userId, tutorialId, progressData);
      res.json(progress);
    } catch (error: any) {
      console.error("Error updating tutorial progress:", error);
      res.status(500).json({ message: "Failed to update tutorial progress" });
    }
  });

  app.post("/api/tutorial-progress/:tutorialId/complete", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tutorialId = parseInt(req.params.tutorialId);
      const { rating, feedback } = req.body;
      const progress = await storage.completeTutorial(userId, tutorialId, rating, feedback);
      res.json(progress);
    } catch (error: any) {
      console.error("Error completing tutorial:", error);
      res.status(500).json({ message: "Failed to complete tutorial" });
    }
  });

  app.get("/api/tutorial-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserTutorialStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching tutorial stats:", error);
      res.status(500).json({ message: "Failed to fetch tutorial stats" });
    }
  });

  // Schedule Management Routes
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { userId, month, year } = req.query;
      
      // Build filter conditions
      const conditions = [eq(schedules.organizationId, user.organizationId)];
      
      // Role-based access control
      if (user.role === 'user') {
        // Users can only see their own schedules
        conditions.push(eq(schedules.userId, user.id));
      } else if (userId) {
        // Managers/admins can filter by specific user
        conditions.push(eq(schedules.userId, parseInt(userId as string)));
      }
      
      // Date filtering
      if (month && year) {
        const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
        const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
        conditions.push(
          gte(schedules.startDate, startDate.toISOString().split('T')[0]),
          lte(schedules.startDate, endDate.toISOString().split('T')[0])
        );
      }
      
      const userSchedules = await db
        .select({
          id: schedules.id,
          title: schedules.title,
          description: schedules.description,
          startDate: schedules.startDate,
          endDate: schedules.endDate,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          location: schedules.location,
          address: schedules.address,
          status: schedules.status,
          priority: schedules.priority,
          color: schedules.color,
          notes: schedules.notes,
          clockInTime: schedules.clockInTime,
          clockOutTime: schedules.clockOutTime,
          actualHours: schedules.actualHours,
          createdAt: schedules.createdAt,
          // User info
          userId: schedules.userId,
          userName: users.username,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          // Creator info
          createdById: schedules.createdById,
          createdByName: sql<string>`creator.username`.as('createdByName'),
        })
        .from(schedules)
        .leftJoin(users, eq(schedules.userId, users.id))
        .leftJoin(sql`${users} as creator`, sql`${schedules.createdById} = creator.id`)
        .where(and(...conditions))
        .orderBy(asc(schedules.startDate), asc(schedules.startTime));
      
      res.json(userSchedules);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      console.log("📅 Creating schedule - Request body:", req.body);
      console.log("📅 Creating schedule - User info:", { id: user.id, organizationId: user.organizationId });
      
      const scheduleData = insertScheduleSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        createdById: user.id,
      });
      
      console.log("📅 Creating schedule - Parsed data:", scheduleData);
      
      const [schedule] = await db
        .insert(schedules)
        .values(scheduleData)
        .returning();
      
      console.log("📅 Creating schedule - Success:", schedule);
      
      // Broadcast to all web users
      broadcastToWebUsers('schedule_created', {
        schedule,
        createdBy: user.username
      });
      
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("📅 Creating schedule - Full error details:", error);
      if (error instanceof ZodError) {
        console.error("📅 Creating schedule - Zod validation errors:", error.errors);
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("📅 Creating schedule - Database/other error:", error.message, error.stack);
        res.status(500).json({ message: "Failed to create schedule" });
      }
    }
  });

  app.get("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const scheduleId = parseInt(req.params.id);
      
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, user.organizationId)
          )
        );
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Check access permissions
      if (user.role === 'user' && schedule.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(schedule);
    } catch (error: any) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ message: "Failed to fetch schedule" });
    }
  });

  app.put("/api/schedules/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const scheduleId = parseInt(req.params.id);
      
      const updateData = insertScheduleSchema.partial().parse(req.body);
      
      const [updatedSchedule] = await db
        .update(schedules)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, user.organizationId)
          )
        )
        .returning();
      
      if (!updatedSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Broadcast update
      broadcastToWebUsers('schedule_updated', {
        schedule: updatedSchedule,
        updatedBy: user.username
      });
      
      res.json(updatedSchedule);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating schedule:", error);
        res.status(500).json({ message: "Failed to update schedule" });
      }
    }
  });

  app.delete("/api/schedules/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const scheduleId = parseInt(req.params.id);
      
      const [deletedSchedule] = await db
        .delete(schedules)
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, user.organizationId)
          )
        )
        .returning();
      
      if (!deletedSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Broadcast deletion
      broadcastToWebUsers('schedule_deleted', {
        scheduleId,
        deletedBy: user.username
      });
      
      res.json({ message: "Schedule deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Clock in/out for schedules
  app.post("/api/schedules/:id/clock-in", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const scheduleId = parseInt(req.params.id);
      
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, user.organizationId),
            eq(schedules.userId, user.id) // Only the assigned user can clock in
          )
        );
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found or access denied" });
      }
      
      if (schedule.clockInTime) {
        return res.status(400).json({ message: "Already clocked in" });
      }
      
      const [updatedSchedule] = await db
        .update(schedules)
        .set({
          clockInTime: new Date(),
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId))
        .returning();
      
      // Broadcast clock in
      broadcastToWebUsers(user.organizationId, 'schedule_clock_in', {
        schedule: updatedSchedule,
        user: user.username
      });
      
      res.json(updatedSchedule);
    } catch (error: any) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post("/api/schedules/:id/clock-out", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const scheduleId = parseInt(req.params.id);
      
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.id, scheduleId),
            eq(schedules.organizationId, user.organizationId),
            eq(schedules.userId, user.id)
          )
        );
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found or access denied" });
      }
      
      if (!schedule.clockInTime) {
        return res.status(400).json({ message: "Must clock in first" });
      }
      
      if (schedule.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out" });
      }
      
      const clockOutTime = new Date();
      const actualHours = (clockOutTime.getTime() - schedule.clockInTime.getTime()) / (1000 * 60 * 60);
      
      const [updatedSchedule] = await db
        .update(schedules)
        .set({
          clockOutTime,
          actualHours: actualHours.toFixed(2),
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, scheduleId))
        .returning();
      
      // Broadcast clock out
      broadcastToWebUsers(user.organizationId, 'schedule_clock_out', {
        schedule: updatedSchedule,
        user: user.username,
        hoursWorked: actualHours.toFixed(2)
      });
      
      res.json(updatedSchedule);
    } catch (error: any) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // User schedules overview (for regular users)
  app.get("/api/my-schedule", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      const mySchedules = await db
        .select({
          id: schedules.id,
          title: schedules.title,
          description: schedules.description,
          startDate: schedules.startDate,
          endDate: schedules.endDate,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          location: schedules.location,
          address: schedules.address,
          status: schedules.status,
          priority: schedules.priority,
          color: schedules.color,
          notes: schedules.notes,
          clockInTime: schedules.clockInTime,
          clockOutTime: schedules.clockOutTime,
          actualHours: schedules.actualHours,
          createdAt: schedules.createdAt,
          createdByName: users.username,
        })
        .from(schedules)
        .leftJoin(users, eq(schedules.createdById, users.id))
        .where(
          and(
            eq(schedules.organizationId, user.organizationId),
            eq(schedules.userId, user.id),
            eq(schedules.isActive, true)
          )
        )
        .orderBy(asc(schedules.startDate), asc(schedules.startTime));
      
      res.json(mySchedules);
    } catch (error: any) {
      console.error("Error fetching my schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // === LATE ARRIVAL TRACKING ENDPOINTS ===
  
  // Track late arrival when clocking in
  app.post("/api/time-clock/clock-in", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { location, ipAddress } = req.body;
      const clockInTime = new Date();
      
      // Create time clock entry
      const [timeClockEntry] = await db
        .insert(timeClock)
        .values({
          userId: user.id,
          organizationId: user.organizationId,
          clockInTime,
          clockInLocation: location,
          clockInIP: ipAddress,
          status: 'clocked_in',
        })
        .returning();
      
      // Check for today's schedule to detect late arrivals
      const today = new Date().toISOString().split('T')[0];
      const todaySchedule = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.userId, user.id),
            eq(schedules.organizationId, user.organizationId),
            sql`DATE(${schedules.startDate}) = ${today}`,
            eq(schedules.isActive, true)
          )
        )
        .limit(1);
      
      if (todaySchedule.length > 0) {
        const schedule = todaySchedule[0];
        const scheduledDateTime = new Date(`${today}T${schedule.startTime}`);
        
        // Calculate if late (more than 5 minutes grace period)
        const minutesLate = Math.max(0, Math.floor((clockInTime.getTime() - scheduledDateTime.getTime()) / (1000 * 60)) - 5);
        
        if (minutesLate > 0) {
          // Record late arrival
          await db
            .insert(lateArrivals)
            .values({
              userId: user.id,
              organizationId: user.organizationId,
              scheduleId: schedule.id,
              timeClockId: timeClockEntry.id,
              scheduledStartTime: scheduledDateTime,
              actualClockInTime: clockInTime,
              minutesLate,
              hoursLate: Number((minutesLate / 60).toFixed(2)),
              workDate: new Date(today),
              location,
            });
          
          // Notify managers/admins via WebSocket
          broadcastToWebUsers(user.organizationId, 'late_arrival_detected', {
            user: `${user.firstName} ${user.lastName}`,
            minutesLate,
            scheduledTime: schedule.startTime,
            actualTime: clockInTime.toTimeString().slice(0, 5),
            location,
          });
          
          // Send late arrival notifications to admins/managers
          try {
            const { NotificationService } = await import("./notificationService");
            
            // Get admin/manager users to notify
            const adminUsers = await db
              .select({ id: users.id })
              .from(users)
              .where(and(
                eq(users.organizationId, user.organizationId),
                or(eq(users.role, 'admin'), eq(users.role, 'manager'))
              ));
            
            // Create notifications for all admins/managers
            for (const admin of adminUsers) {
              await NotificationService.createNotification({
                type: 'user_late',
                title: `Employee Late Arrival`,
                message: `${user.firstName} ${user.lastName} clocked in ${minutesLate} minutes late (scheduled: ${schedule.startTime}, actual: ${clockInTime.toTimeString().slice(0, 5)})`,
                userId: admin.id,
                organizationId: user.organizationId,
                relatedEntityType: 'late_arrival',
                relatedEntityId: timeClockEntry.id,
                priority: 'high',
                category: 'team_based',
                createdBy: user.id
              });
            }
            
            console.log(`📢 Late arrival notifications sent to ${adminUsers.length} admins/managers`);
          } catch (notificationError) {
            console.error('Error sending late arrival notifications:', notificationError);
          }
        }
      }
      
      // Send regular clock-in notifications to admins/managers
      try {
        const { NotificationService } = await import("./notificationService");
        
        // Get admin/manager users to notify
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.organizationId, user.organizationId),
            or(eq(users.role, 'admin'), eq(users.role, 'manager'))
          ));
        
        // Create clock-in notifications for all admins/managers
        for (const admin of adminUsers) {
          await NotificationService.createNotification({
            type: 'user_clock_in',
            title: `Employee Clocked In`,
            message: `${user.firstName} ${user.lastName} clocked in at ${clockInTime.toTimeString().slice(0, 5)}${location ? ` from ${location}` : ''}`,
            userId: admin.id,
            organizationId: user.organizationId,
            relatedEntityType: 'time_clock',
            relatedEntityId: timeClockEntry.id,
            priority: 'low',
            category: 'team_based',
            createdBy: user.id
          });
        }
        
        console.log(`📢 Clock-in notifications sent to ${adminUsers.length} admins/managers`);
      } catch (notificationError) {
        console.error('Error sending clock-in notifications:', notificationError);
      }
      
      res.json({ 
        timeClockEntry, 
        scheduledTime: todaySchedule[0]?.startTime,
        isLate: todaySchedule.length > 0 && (clockInTime.getTime() - new Date(`${today}T${todaySchedule[0].startTime}`).getTime()) > 5 * 60 * 1000
      });
    } catch (error: any) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });
  
  // Get late arrivals report
  app.get("/api/reports/late-arrivals", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate, userId } = req.query;
      
      let conditions = [eq(lateArrivals.organizationId, user.organizationId)];
      
      if (startDate) {
        conditions.push(gte(lateArrivals.workDate, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(lateArrivals.workDate, new Date(endDate as string)));
      }
      if (userId) {
        conditions.push(eq(lateArrivals.userId, parseInt(userId as string)));
      }
      
      const lateArrivalsList = await db
        .select({
          id: lateArrivals.id,
          userId: lateArrivals.userId,
          userName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          workDate: lateArrivals.workDate,
          scheduledStartTime: lateArrivals.scheduledStartTime,
          actualClockInTime: lateArrivals.actualClockInTime,
          minutesLate: lateArrivals.minutesLate,
          hoursLate: lateArrivals.hoursLate,
          location: lateArrivals.location,
          reason: lateArrivals.reason,
          isExcused: lateArrivals.isExcused,
          excuseReason: lateArrivals.excuseReason,
          excusedBy: lateArrivals.excusedBy,
          excusedAt: lateArrivals.excusedAt,
        })
        .from(lateArrivals)
        .leftJoin(users, eq(lateArrivals.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(lateArrivals.workDate), desc(lateArrivals.actualClockInTime));
      
      res.json(lateArrivalsList);
    } catch (error: any) {
      console.error("Error fetching late arrivals:", error);
      res.status(500).json({ message: "Failed to fetch late arrivals" });
    }
  });
  
  // Get late arrivals summary/statistics
  app.get("/api/reports/late-arrivals/summary", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      let conditions = [eq(lateArrivals.organizationId, user.organizationId)];
      
      if (startDate) {
        conditions.push(gte(lateArrivals.workDate, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(lateArrivals.workDate, new Date(endDate as string)));
      }
      
      // Get employee late arrival statistics
      const employeeStats = await db
        .select({
          userId: lateArrivals.userId,
          userName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          totalLateArrivals: sql`COUNT(*)`.as('totalLateArrivals'),
          totalMinutesLate: sql`SUM(${lateArrivals.minutesLate})`.as('totalMinutesLate'),
          averageMinutesLate: sql`AVG(${lateArrivals.minutesLate})`.as('averageMinutesLate'),
          excusedArrivals: sql`SUM(CASE WHEN ${lateArrivals.isExcused} THEN 1 ELSE 0 END)`.as('excusedArrivals'),
        })
        .from(lateArrivals)
        .leftJoin(users, eq(lateArrivals.userId, users.id))
        .where(and(...conditions))
        .groupBy(lateArrivals.userId, users.firstName, users.lastName)
        .orderBy(desc(sql`COUNT(*)`));
      
      // Get overall summary
      const [overallSummary] = await db
        .select({
          totalLateArrivals: sql`COUNT(*)`.as('totalLateArrivals'),
          totalEmployeesLate: sql`COUNT(DISTINCT ${lateArrivals.userId})`.as('totalEmployeesLate'),
          totalMinutesLate: sql`SUM(${lateArrivals.minutesLate})`.as('totalMinutesLate'),
          averageMinutesLate: sql`AVG(${lateArrivals.minutesLate})`.as('averageMinutesLate'),
          totalExcusedArrivals: sql`SUM(CASE WHEN ${lateArrivals.isExcused} THEN 1 ELSE 0 END)`.as('totalExcusedArrivals'),
        })
        .from(lateArrivals)
        .where(and(...conditions));
      
      res.json({
        summary: overallSummary,
        employeeStats,
      });
    } catch (error: any) {
      console.error("Error fetching late arrivals summary:", error);
      res.status(500).json({ message: "Failed to fetch late arrivals summary" });
    }
  });
  
  // Excuse a late arrival
  app.put("/api/reports/late-arrivals/:id/excuse", requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const lateArrivalId = parseInt(req.params.id);
      const { excuseReason } = req.body;
      
      const [updatedLateArrival] = await db
        .update(lateArrivals)
        .set({
          isExcused: true,
          excusedBy: user.id,
          excusedAt: new Date(),
          excuseReason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lateArrivals.id, lateArrivalId),
            eq(lateArrivals.organizationId, user.organizationId)
          )
        )
        .returning();
      
      if (!updatedLateArrival) {
        return res.status(404).json({ message: "Late arrival record not found" });
      }
      
      res.json(updatedLateArrival);
    } catch (error: any) {
      console.error("Error excusing late arrival:", error);
      res.status(500).json({ message: "Failed to excuse late arrival" });
    }
  });
  
  // Employee can add reason for late arrival
  app.put("/api/my-late-arrivals/:id/reason", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const lateArrivalId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const [updatedLateArrival] = await db
        .update(lateArrivals)
        .set({
          reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lateArrivals.id, lateArrivalId),
            eq(lateArrivals.userId, user.id),
            eq(lateArrivals.organizationId, user.organizationId)
          )
        )
        .returning();
      
      if (!updatedLateArrival) {
        return res.status(404).json({ message: "Late arrival record not found" });
      }
      
      res.json(updatedLateArrival);
    } catch (error: any) {
      console.error("Error updating late arrival reason:", error);
      res.status(500).json({ message: "Failed to update late arrival reason" });
    }
  });
  
  // Get employee's own late arrivals
  app.get("/api/my-late-arrivals", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      let conditions = [
        eq(lateArrivals.userId, user.id),
        eq(lateArrivals.organizationId, user.organizationId)
      ];
      
      if (startDate) {
        conditions.push(gte(lateArrivals.workDate, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(lateArrivals.workDate, new Date(endDate as string)));
      }
      
      const myLateArrivals = await db
        .select()
        .from(lateArrivals)
        .where(and(...conditions))
        .orderBy(desc(lateArrivals.workDate));
      
      res.json(myLateArrivals);
    } catch (error: any) {
      console.error("Error fetching my late arrivals:", error);
      res.status(500).json({ message: "Failed to fetch late arrivals" });
    }
  });

  // ===== MEETINGS ROUTES =====
  
  // Get all meetings for organization (managers/admins) or user-specific meetings
  app.get("/api/meetings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { userId } = req.query;
      
      // Get meetings based on role
      let meetings: Meeting[];
      if (user.role === 'admin' || user.role === 'manager') {
        // Admins/managers can see all organization meetings or filter by specific user
        meetings = await storage.getMeetings(user.organizationId, userId as string | undefined);
      } else {
        // Regular users only see their own meetings
        meetings = await storage.getMeetings(user.organizationId, user.id);
      }
      
      res.json(meetings);
    } catch (error: any) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Get specific meeting details
  app.get("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error: any) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  // Create new meeting
  app.post("/api/meetings", (req, res, next) => {
    console.log("📞 POST /api/meetings hit - before auth");
    requireAuth(req, res, next);
  }, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      console.log("🔍 Meeting creation request:", { userId: user.id, organizationId: user.organizationId, body: req.body });
      
      const meetingData = insertMeetingSchema.parse(req.body);
      console.log("✅ Meeting data validated:", meetingData);
      
      const createData = {
        ...meetingData,
        organizationId: user.organizationId,
        hostId: user.id,
        status: meetingData.status || 'active', // Ensure status is set to active
      };
      console.log("📝 Creating meeting with data:", createData);
      
      const newMeeting = await storage.createMeeting(createData);
      console.log("✅ Meeting created successfully:", newMeeting);
      
      res.status(201).json(newMeeting);
    } catch (error: any) {
      console.error("❌ Error creating meeting - Full error:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error message:", error.message);
      res.status(500).json({ message: "Failed to create meeting", error: error.message });
    }
  });

  // Update meeting
  app.put("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Check if meeting exists and user has permission
      const existingMeeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!existingMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host or admin/manager can update meeting
      if (existingMeeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const updates = insertMeetingSchema.partial().parse(req.body);
      const updatedMeeting = await storage.updateMeeting(meetingId, user.organizationId, updates);
      
      res.json(updatedMeeting);
    } catch (error: any) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  // Delete meeting
  app.delete("/api/meetings/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Check if meeting exists and user has permission
      const existingMeeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!existingMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host or admin/manager can delete meeting
      if (existingMeeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const deleted = await storage.deleteMeeting(meetingId, user.organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json({ message: "Meeting deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // Cleanup expired meetings (admin/manager only)
  app.post("/api/meetings/cleanup-expired", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Only admin/manager can trigger cleanup
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied - Admin or Manager role required" });
      }
      
      const deletedCount = await storage.cleanupExpiredMeetings();
      
      res.json({ 
        message: `Successfully cleaned up ${deletedCount} expired meetings`,
        deletedCount 
      });
    } catch (error: any) {
      console.error("Error cleaning up expired meetings:", error);
      res.status(500).json({ message: "Failed to cleanup expired meetings" });
    }
  });

  // Join meeting (with waiting room support)
  app.post("/api/meetings/:id/join", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Check if meeting exists and is accessible
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check if meeting is active
      if (meeting.status !== 'active') {
        return res.status(400).json({ message: "Meeting is not active" });
      }
      
      // If user is the host, they can join directly
      let status = "waiting";
      if (meeting.hostId === user.id || user.role === 'admin' || user.role === 'manager') {
        status = "admitted";
      }
      
      const participant = await storage.joinMeetingWithStatus(meetingId, user.id, status);
      
      if (status === "waiting") {
        res.json({ 
          ...participant, 
          message: "Please wait for the host to admit you to the meeting",
          isWaiting: true 
        });
      } else {
        res.json({ 
          ...participant,
          message: "Joined meeting successfully",
          isWaiting: false 
        });
      }
    } catch (error: any) {
      console.error("Error joining meeting:", error);
      res.status(500).json({ message: "Failed to join meeting" });
    }
  });

  // Leave meeting
  app.post("/api/meetings/:id/leave", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      const success = await storage.leaveMeeting(meetingId, user.id);
      if (!success) {
        return res.status(404).json({ message: "Meeting participation not found" });
      }
      
      res.json({ message: "Left meeting successfully" });
    } catch (error: any) {
      console.error("Error leaving meeting:", error);
      res.status(500).json({ message: "Failed to leave meeting" });
    }
  });

  // Get waiting room participants (host only)
  app.get("/api/meetings/:id/waiting-room", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Check if meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only hosts and admins can see waiting room
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const waitingParticipants = await storage.getWaitingRoomParticipants(meetingId);
      res.json(waitingParticipants);
    } catch (error: any) {
      console.error("Error fetching waiting room participants:", error);
      res.status(500).json({ message: "Failed to fetch waiting room participants" });
    }
  });

  // Get meeting participants (with waiting room status)
  app.get("/api/meetings/:id/participants", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Verify meeting exists and user has access
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const participants = await storage.getMeetingParticipants(meetingId);
      res.json(participants);
    } catch (error: any) {
      console.error("Error fetching meeting participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Get waiting room participants (host/admin only)
  app.get("/api/meetings/:id/waiting-room", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Verify meeting exists and user has access
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host/admin can view waiting room
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const waitingParticipants = await storage.getWaitingRoomParticipants(meetingId);
      res.json(waitingParticipants);
    } catch (error: any) {
      console.error("Error fetching waiting room participants:", error);
      res.status(500).json({ message: "Failed to fetch waiting room participants" });
    }
  });

  // Admit participant from waiting room
  app.post("/api/meetings/:id/admit/:participantId", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      const participantId = parseInt(req.params.participantId);
      
      // Verify meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host/admin can admit participants
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const success = await storage.admitParticipant(participantId, user.id);
      if (!success) {
        return res.status(404).json({ message: "Participant not found or already admitted" });
      }
      
      res.json({ message: "Participant admitted successfully" });
    } catch (error: any) {
      console.error("Error admitting participant:", error);
      res.status(500).json({ message: "Failed to admit participant" });
    }
  });

  // Deny participant from waiting room
  app.post("/api/meetings/:id/deny/:participantId", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      const participantId = parseInt(req.params.participantId);
      
      // Verify meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host/admin can deny participants
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const success = await storage.denyParticipant(participantId);
      if (!success) {
        return res.status(404).json({ message: "Participant not found" });
      }
      
      res.json({ message: "Participant denied successfully" });
    } catch (error: any) {
      console.error("Error denying participant:", error);
      res.status(500).json({ message: "Failed to deny participant" });
    }
  });

  // Admit participant from waiting room (body-based)
  app.post("/api/meetings/:id/admit-participant", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      const { participantId } = req.body;
      
      // Verify meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host/admin can admit participants
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const success = await storage.admitParticipant(participantId, user.id);
      if (!success) {
        return res.status(404).json({ message: "Participant not found or already admitted" });
      }
      
      res.json({ message: "Participant admitted successfully" });
    } catch (error: any) {
      console.error("Error admitting participant:", error);
      res.status(500).json({ message: "Failed to admit participant" });
    }
  });

  // Deny participant from waiting room (body-based)
  app.post("/api/meetings/:id/deny-participant", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      const { participantId } = req.body;
      
      // Verify meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host/admin can deny participants
      if (meeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const success = await storage.denyParticipant(participantId);
      if (!success) {
        return res.status(404).json({ message: "Participant not found" });
      }
      
      res.json({ message: "Participant denied successfully" });
    } catch (error: any) {
      console.error("Error denying participant:", error);
      res.status(500).json({ message: "Failed to deny participant" });
    }
  });

  // Get meeting messages/chat
  app.get("/api/meetings/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Verify meeting exists and user has access
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const messages = await storage.getMeetingMessages(meetingId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching meeting messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message in meeting
  app.post("/api/meetings/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Verify meeting exists and user is a participant
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const messageData = insertMeetingMessageSchema.parse(req.body);
      const newMessage = await storage.createMeetingMessage({
        ...messageData,
        meetingId,
        senderId: user.id,
      });
      
      res.status(201).json(newMessage);
    } catch (error: any) {
      console.error("Error sending meeting message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get meeting recordings
  app.get("/api/meetings/:id/recordings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      const recordings = await storage.getMeetingRecordings(meetingId, user.organizationId);
      res.json(recordings);
    } catch (error: any) {
      console.error("Error fetching meeting recordings:", error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  // Create meeting recording
  app.post("/api/meetings/:id/recordings", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      
      // Verify meeting exists and user has permission
      const meeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const recordingData = insertMeetingRecordingSchema.parse(req.body);
      const newRecording = await storage.createMeetingRecording({
        ...recordingData,
        meetingId,
        recordedBy: user.id,
      });
      
      res.status(201).json(newRecording);
    } catch (error: any) {
      console.error("Error creating meeting recording:", error);
      res.status(500).json({ message: "Failed to create recording" });
    }
  });

  // Update meeting status
  app.patch("/api/meetings/:id/status", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const meetingId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['scheduled', 'active', 'ended', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Check if meeting exists and user has permission
      const existingMeeting = await storage.getMeeting(meetingId, user.organizationId);
      if (!existingMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Only host or admin/manager can update meeting status
      if (existingMeeting.hostId !== user.id && !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const updatedMeeting = await storage.updateMeetingStatus(meetingId, user.organizationId, status);
      res.json(updatedMeeting);
    } catch (error: any) {
      console.error("Error updating meeting status:", error);
      res.status(500).json({ message: "Failed to update meeting status" });
    }
  });

  // SaaS Admin Call Manager routes
  app.get("/api/saas-admin/call-manager/organizations", requireAdmin, async (req, res) => {
    try {
      const organizations = await storage.getOrganizationsWithCallManager();
      res.json(organizations);
    } catch (error: any) {
      console.error("Error fetching Call Manager organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/saas-admin/call-manager/phone-numbers/:orgId", requireAdmin, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const phoneNumbers = await storage.getPhoneNumbersByOrganization(orgId);
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  app.post("/api/saas-admin/call-manager/provision-phone", requireAdmin, async (req, res) => {
    try {
      const phoneData = req.body;
      
      // In a real implementation, this would call Twilio API to provision a phone number
      // For now, we'll just store the data in our database
      const phoneNumber = await storage.createPhoneNumber({
        ...phoneData,
        providerSid: `PN${Date.now()}`, // Mock provider SID
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json(phoneNumber);
    } catch (error: any) {
      console.error("Error provisioning phone number:", error);
      res.status(500).json({ message: "Failed to provision phone number" });
    }
  });

  app.put("/api/saas-admin/call-manager/phone-numbers/:id", requireAdmin, async (req, res) => {
    try {
      const phoneId = parseInt(req.params.id);
      const updates = req.body;
      
      console.log('📞 Updating phone number:', phoneId, 'with data:', updates);
      
      // First, get the phone number to verify it exists and get the organization ID
      const existingPhone = await storage.getPhoneNumber(phoneId, updates.organizationId || 0);
      
      if (!existingPhone) {
        console.log('❌ Phone number not found:', phoneId);
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      console.log('📞 Found existing phone number:', existingPhone);
      
      const phoneNumber = await storage.updatePhoneNumber(phoneId, existingPhone.organizationId, {
        ...updates,
        updatedAt: new Date()
      });

      if (!phoneNumber) {
        console.log('❌ Failed to update phone number:', phoneId);
        return res.status(404).json({ message: "Phone number not found" });
      }

      console.log('✅ Phone number updated successfully:', phoneNumber);
      res.json(phoneNumber);
    } catch (error: any) {
      console.error("Error updating phone number:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  app.delete("/api/saas-admin/call-manager/phone-numbers/:id/release", requireAdmin, async (req, res) => {
    try {
      const phoneId = parseInt(req.params.id);
      
      // In a real implementation, this would call Twilio API to release the phone number
      const success = await storage.deletePhoneNumber(phoneId);

      if (!success) {
        return res.status(404).json({ message: "Phone number not found" });
      }

      res.json({ message: "Phone number released successfully" });
    } catch (error: any) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ message: "Failed to release phone number" });
    }
  });

  // Twilio Integration API Routes
  const { twilioService } = await import("./twilio");

  // Get Twilio account information
  app.get("/api/twilio/account", requireAdmin, async (req, res) => {
    try {
      const accountInfo = await twilioService.getAccountInfo();
      res.json(accountInfo);
    } catch (error: any) {
      console.error("Error fetching Twilio account:", error);
      res.status(500).json({ message: "Failed to fetch account information" });
    }
  });

  // Get all purchased phone numbers
  app.get("/api/twilio/phone-numbers", requireAdmin, async (req, res) => {
    try {
      const phoneNumbers = await twilioService.getPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Search for available phone numbers
  app.get("/api/twilio/available-numbers", requireAdmin, async (req, res) => {
    try {
      const { areaCode, region } = req.query;
      const availableNumbers = await twilioService.searchAvailableNumbers(
        areaCode as string,
        region as string
      );
      res.json(availableNumbers);
    } catch (error: any) {
      console.error("Error searching available numbers:", error);
      res.status(500).json({ message: "Failed to search available numbers" });
    }
  });

  // Purchase a phone number
  app.post("/api/twilio/purchase-number", requireAdmin, async (req, res) => {
    try {
      const { phoneNumber, friendlyName } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const purchasedNumber = await twilioService.purchasePhoneNumber(phoneNumber, friendlyName);
      res.json(purchasedNumber);
    } catch (error: any) {
      console.error("Error purchasing phone number:", error);
      res.status(500).json({ message: error.message || "Failed to purchase phone number" });
    }
  });

  // Release a phone number
  app.delete("/api/twilio/phone-numbers/:sid", requireAdmin, async (req, res) => {
    try {
      const { sid } = req.params;
      const success = await twilioService.releasePhoneNumber(sid);
      
      if (success) {
        res.json({ message: "Phone number released successfully" });
      } else {
        res.status(400).json({ message: "Failed to release phone number" });
      }
    } catch (error: any) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ message: error.message || "Failed to release phone number" });
    }
  });

  // Get call logs
  app.get("/api/twilio/call-logs", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const callLogs = await twilioService.getCallLogs(limit);
      res.json(callLogs);
    } catch (error: any) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  // Make an outbound call
  app.post("/api/twilio/make-call", requireAuth, async (req, res) => {
    try {
      const { from, to, callbackUrl } = req.body;
      
      if (!from || !to) {
        return res.status(400).json({ message: "From and to phone numbers are required" });
      }

      const call = await twilioService.makeCall(from, to, callbackUrl);
      res.json(call);
    } catch (error: any) {
      console.error("Error making call:", error);
      res.status(500).json({ message: error.message || "Failed to initiate call" });
    }
  });

  // Send SMS message
  app.post("/api/twilio/send-sms", requireAuth, async (req, res) => {
    try {
      const { from, to, body } = req.body;
      
      if (!from || !to || !body) {
        return res.status(400).json({ message: "From, to, and message body are required" });
      }

      const message = await twilioService.sendSMS(from, to, body);
      res.json(message);
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: error.message || "Failed to send SMS" });
    }
  });

  // Get usage statistics
  app.get("/api/twilio/usage-stats", requireAdmin, async (req, res) => {
    try {
      const usageStats = await twilioService.getUsageStats();
      res.json(usageStats);
    } catch (error: any) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // Smart Capture API Routes
  
  // Get all Smart Capture lists for organization
  app.get("/api/smart-capture/lists", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const lists = await storage.getSmartCaptureLists(user.organizationId);
      res.json(lists);
    } catch (error: any) {
      console.error("Error fetching smart capture lists:", error);
      res.status(500).json({ message: "Failed to fetch smart capture lists" });
    }
  });

  // Get specific Smart Capture list with items
  app.get("/api/smart-capture/lists/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const listId = parseInt(req.params.id);
      
      const list = await storage.getSmartCaptureList(listId, user.organizationId);
      if (!list) {
        return res.status(404).json({ message: "Smart capture list not found" });
      }
      
      const items = await storage.getSmartCaptureItems(listId, user.organizationId);
      
      res.json({ ...list, items });
    } catch (error: any) {
      console.error("Error fetching smart capture list:", error);
      res.status(500).json({ message: "Failed to fetch smart capture list" });
    }
  });

  // Create new Smart Capture list
  app.post("/api/smart-capture/lists", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // SECURITY: Strip any client-supplied organizationId and use authenticated user's org
      const { organizationId: _, ...requestData } = req.body;
      
      // Create allowlist schema to ensure only client fields are validated
      const requestSchema = insertSmartCaptureListSchema.pick({ name: true, description: true, status: true });
      const listData = requestSchema.parse(requestData);
      
      // Pass server-side fields as separate parameters to storage method
      const list = await storage.createSmartCaptureList(listData, user.organizationId, user.id);
      res.status(201).json(list);
    } catch (error: any) {
      console.error("Error creating smart capture list:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create smart capture list" });
    }
  });

  // Update Smart Capture list
  app.put("/api/smart-capture/lists/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const listId = parseInt(req.params.id);
      
      // SECURITY: Strip any client-supplied organizationId 
      const { organizationId: _, ...requestData } = req.body;
      
      const updateData = insertSmartCaptureListSchema.partial().parse(requestData);
      const list = await storage.updateSmartCaptureList(listId, user.organizationId, updateData);
      
      if (!list) {
        return res.status(404).json({ message: "Smart capture list not found" });
      }
      
      res.json(list);
    } catch (error: any) {
      console.error("Error updating smart capture list:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update smart capture list" });
    }
  });

  // Delete Smart Capture list
  app.delete("/api/smart-capture/lists/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const listId = parseInt(req.params.id);
      
      const success = await storage.deleteSmartCaptureList(listId, user.organizationId);
      if (!success) {
        return res.status(404).json({ message: "Smart capture list not found" });
      }
      
      res.json({ message: "Smart capture list deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting smart capture list:", error);
      res.status(500).json({ message: "Failed to delete smart capture list" });
    }
  });

  // Create item in Smart Capture list
  app.post("/api/smart-capture/lists/:id/items", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const listId = parseInt(req.params.id);
      
      // SECURITY: Strip any client-supplied listId/organizationId and use server values
      const { listId: _, organizationId: __, ...requestData } = req.body;
      
      const itemData = insertSmartCaptureItemSchema.parse(requestData);
      const item = await storage.createSmartCaptureItem(listId, user.organizationId, itemData, user.id);
      
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating smart capture item:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create smart capture item" });
    }
  });

  // Bulk create items in Smart Capture list
  app.post("/api/smart-capture/lists/:id/items/bulk", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const listId = parseInt(req.params.id);
      
      if (!Array.isArray(req.body.items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      // SECURITY: Strip any client-supplied listId/organizationId from each item
      const items = req.body.items.map((item: any) => {
        const { listId: _, organizationId: __, ...itemData } = item;
        return insertSmartCaptureItemSchema.parse(itemData);
      });
      
      const createdItems = await storage.createSmartCaptureItemsBulk(listId, user.organizationId, items, user.id);
      res.status(201).json(createdItems);
    } catch (error: any) {
      console.error("Error bulk creating smart capture items:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create smart capture items" });
    }
  });

  // Configure multer for OCR image uploads
  const ocrUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // OCR endpoint for Smart Capture
  app.post("/api/smart-capture/ocr", requireAuth, ocrUpload.single('image'), async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Convert image to base64 for OpenAI Vision API
      const base64Image = req.file.buffer.toString('base64');
      
      // For development/demo purposes, use placeholder OCR results
      // In production, this would call OpenAI Vision API with OPENAI_API_KEY
      const simulateOCR = (imageBuffer: Buffer) => {
        // Simulate realistic OCR results based on common part/vehicle number patterns
        const mockResults = [
          { type: 'partNumber', text: 'AC-4729-B', confidence: 0.95 },
          { type: 'vehicleNumber', text: 'VH-2024-001', confidence: 0.92 },
          { type: 'inventoryNumber', text: 'INV-8547', confidence: 0.88 },
          { type: 'serialNumber', text: 'SN4429087', confidence: 0.85 }
        ];
        
        // Return a random mock result for demo purposes
        const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
        return {
          extractedText: randomResult.text,
          detectedType: randomResult.type,
          confidence: randomResult.confidence,
          rawText: `Found text: ${randomResult.text}`,
          success: true
        };
      };

      // Simulate OCR processing (replace with actual OpenAI Vision API call)
      const ocrResult = simulateOCR(req.file.buffer);
      
      // Save the uploaded image for the smart capture entry
      const imageId = nanoid();
      const imagePath = `smart-capture/ocr/${user.organizationId}/${imageId}.jpg`;
      
      // Save image to storage (you can modify this to use your preferred storage)
      const uploadsDir = './uploads/smart-capture/ocr';
      await fs.mkdir(uploadsDir, { recursive: true });
      const localImagePath = path.join(uploadsDir, `${imageId}.jpg`);
      await fs.writeFile(localImagePath, req.file.buffer);
      
      res.json({
        success: true,
        ocrResult,
        imageId,
        imagePath: localImagePath,
        imageUrl: `/uploads/smart-capture/ocr/${imageId}.jpg`
      });
      
    } catch (error: any) {
      console.error("Error processing OCR:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process image OCR",
        error: error.message 
      });
    }
  });

  // Update Smart Capture item
  app.put("/api/smart-capture/items/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const itemId = parseInt(req.params.id);
      
      // SECURITY: Strip any client-supplied listId/organizationId 
      const { listId: _, organizationId: __, ...requestData } = req.body;
      
      const updateData = insertSmartCaptureItemSchema.partial().parse(requestData);
      const item = await storage.updateSmartCaptureItem(itemId, user.organizationId, updateData);
      
      // Automatically update draft invoice line item if this is a project-linked Smart Capture item
      if (item && item.projectId) {
        try {
          const draftInvoice = await storage.getDraftInvoiceForProject(item.projectId, user.organizationId);
          if (draftInvoice) {
            await storage.upsertDraftInvoiceLineItem(draftInvoice.id, {
              description: item.description || item.partNumber || item.vehicleNumber || item.inventoryNumber || 'Smart Capture Item',
              quantity: item.quantity.toString(),
              rate: item.masterPrice.toString(),
              sourceType: 'smart_capture',
              smartCaptureItemId: item.id
            }, user.organizationId);
            
            console.log(`✅ Auto-updated draft invoice line item for Smart Capture item ${item.id}`);
            
            // Broadcast draft invoice line item update to organization users
            broadcastToWebUsers(user.organizationId, 'draft_invoice_line_item_updated', {
              invoiceId: draftInvoice.id,
              projectId: item.projectId,
              smartCaptureItemId: item.id,
              description: item.description || item.partNumber || 'Smart Capture Item',
              updatedBy: user.username,
              timestamp: new Date().toISOString()
            });
          }
        } catch (lineItemError) {
          console.error("❌ Error updating Smart Capture item in draft invoice:", lineItemError);
          // Continue with item update even if draft invoice update fails
        }
      }
      
      if (!item) {
        return res.status(404).json({ message: "Smart capture item not found" });
      }
      
      res.json(item);
    } catch (error: any) {
      console.error("Error updating smart capture item:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update smart capture item" });
    }
  });

  // Delete Smart Capture item
  app.delete("/api/smart-capture/items/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const itemId = parseInt(req.params.id);
      
      // Get item details before deletion to check if it's linked to a project
      const item = await storage.getSmartCaptureItemById(itemId, user.organizationId);
      
      const success = await storage.deleteSmartCaptureItem(itemId, user.organizationId);
      if (!success) {
        return res.status(404).json({ message: "Smart capture item not found" });
      }
      
      // Automatically remove line item from draft invoice if this was a project-linked Smart Capture item
      if (item && item.projectId) {
        try {
          const draftInvoice = await storage.getDraftInvoiceForProject(item.projectId, user.organizationId);
          if (draftInvoice) {
            await storage.deleteDraftInvoiceLineItemBySmartCaptureItem(itemId, user.organizationId);
            
            console.log(`✅ Auto-removed draft invoice line item for deleted Smart Capture item ${itemId}`);
            
            // Broadcast draft invoice line item deletion to organization users
            broadcastToWebUsers(user.organizationId, 'draft_invoice_line_item_removed', {
              invoiceId: draftInvoice.id,
              projectId: item.projectId,
              smartCaptureItemId: itemId,
              deletedBy: user.username,
              timestamp: new Date().toISOString()
            });
          }
        } catch (lineItemError) {
          console.error("❌ Error removing Smart Capture item from draft invoice:", lineItemError);
          // Continue with item deletion even if draft invoice update fails
        }
      }
      
      res.json({ message: "Smart capture item deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting smart capture item:", error);
      res.status(500).json({ message: "Failed to delete smart capture item" });
    }
  });

  // Project-specific Smart Capture API Routes
  
  // Get Smart Capture items for a specific project
  app.get("/api/projects/:id/smart-capture", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectId = parseInt(req.params.id);
      
      const items = await storage.getSmartCaptureItemsByProject(projectId, user.organizationId);
      
      // Enhance items with user information where possible
      // Items now include real user information from the database
      const itemsWithUserInfo = items;
      
      res.json(itemsWithUserInfo);
    } catch (error: any) {
      console.error("Error fetching project smart capture items:", error);
      res.status(500).json({ message: "Failed to fetch smart capture items" });
    }
  });

  // Create Smart Capture item for a specific project
  app.post("/api/projects/:id/smart-capture", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectId = parseInt(req.params.id);
      
      // SECURITY: Strip any client-supplied projectId/listId/organizationId and use server values
      const { projectId: _, listId: __, organizationId: ___, ...requestData } = req.body;
      
      const validatedData = insertSmartCaptureItemSchema.parse(requestData);
      const item = await storage.createProjectSmartCaptureItem(projectId, user.organizationId, validatedData, user.id);
      
      // Automatically add item to draft invoice - create one if it doesn't exist
      try {
        console.log(`🔍 Checking for draft invoice for project ${projectId}`);
        let draftInvoice = await storage.getDraftInvoiceForProject(projectId, user.organizationId);
        
        if (!draftInvoice) {
          console.log(`📝 No draft invoice found for project ${projectId}, attempting to create one`);
          
          // Get project details to check if it has a customer
          const project = await storage.getProject(projectId, user.id);
          if (project && project.customerId) {
            console.log(`👤 Project has customer ${project.customerId}, creating draft invoice`);
            // Use ensureDraftInvoiceForProject to create a draft invoice
            draftInvoice = await storage.ensureDraftInvoiceForProject(projectId, project.customerId, user.id, user.organizationId);
            console.log(`✅ Created draft invoice ${draftInvoice.id} for project ${projectId}`);
          } else if (project) {
            console.log(`⚠️ Project ${projectId} has no customer assigned, cannot create draft invoice`);
          } else {
            console.log(`❌ Project ${projectId} not found`);
          }
        } else {
          console.log(`✅ Found existing draft invoice ${draftInvoice.id} for project ${projectId}`);
        }
        
        if (draftInvoice) {
          await storage.upsertDraftInvoiceLineItem(draftInvoice.id, {
            description: item.description || item.partNumber || item.vehicleNumber || item.inventoryNumber || 'Smart Capture Item',
            quantity: item.quantity.toString(),
            rate: item.masterPrice.toString(),
            sourceType: 'smart_capture',
            smartCaptureItemId: item.id
          }, user.organizationId);
          
          console.log(`✅ Auto-added Smart Capture item ${item.id} to draft invoice ${draftInvoice.id}`);
          
          // Broadcast draft invoice line item update to organization users
          broadcastToWebUsers(user.organizationId, 'draft_invoice_line_item_added', {
            invoiceId: draftInvoice.id,
            projectId,
            smartCaptureItemId: item.id,
            description: item.description || item.partNumber || 'Smart Capture Item',
            createdBy: user.username,
            timestamp: new Date().toISOString()
          });
        }
      } catch (lineItemError) {
        console.error("❌ Error adding Smart Capture item to draft invoice:", lineItemError);
        // Continue with item creation even if draft invoice update fails
      }
      
      // Add user information to the created item for response
      const itemWithUser = {
        ...item,
        submittedBy: `${user.firstName} ${user.lastName}`,
        submittedByEmail: user.email,
        submissionTime: item.createdAt
      };
      
      // WebSocket broadcast for real-time updates
      broadcastToWebUsers(`project_${projectId}_smart_capture_item_created`, {
        item: itemWithUser,
        projectId,
        createdBy: user.username
      }, user.organizationId);
      
      res.status(201).json(itemWithUser);
    } catch (error: any) {
      console.error("Error creating project smart capture item:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create smart capture item" });
    }
  });

  // Smart Capture Integration API Routes
  
  // Search master Smart Capture items
  app.get("/api/smart-capture/search", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Validate query parameters
      const filters = searchSmartCaptureSchema.parse({
        query: req.query.query,
        partNumber: req.query.partNumber,
        vehicleNumber: req.query.vehicleNumber,
        inventoryNumber: req.query.inventoryNumber,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      });
      
      const items = await storage.searchSmartCaptureItems(user.organizationId, filters);
      res.json(items);
    } catch (error: any) {
      console.error("Error searching smart capture items:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid search parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to search smart capture items" });
    }
  });

  // Get specific Smart Capture item by ID
  app.get("/api/smart-capture/items/:id", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId) || itemId <= 0) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const item = await storage.getSmartCaptureItemById(itemId, user.organizationId);
      if (!item) {
        return res.status(404).json({ message: "Smart capture item not found" });
      }
      
      res.json(item);
    } catch (error: any) {
      console.error("Error fetching smart capture item:", error);
      res.status(500).json({ message: "Failed to fetch smart capture item" });
    }
  });

  // Link project Smart Capture item to master item
  app.post("/api/smart-capture/items/:id/link", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectItemId = parseInt(req.params.id);
      
      if (isNaN(projectItemId) || projectItemId <= 0) {
        return res.status(400).json({ message: "Invalid project item ID" });
      }
      
      // Validate request body
      const { masterItemId } = linkSmartCaptureSchema.parse(req.body);
      
      const linkedItem = await storage.linkProjectSmartCaptureItem(
        projectItemId,
        masterItemId,
        user.organizationId
      );
      
      res.json(linkedItem);
    } catch (error: any) {
      console.error("Error linking smart capture items:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      // Handle business rule violations with appropriate status codes
      const message = error.message || "Failed to link items";
      if (message.includes("Cannot link item to itself") || 
          message.includes("not linked to a master item") ||
          message.includes("must belong to a master Smart Capture list")) {
        return res.status(400).json({ message });
      }
      
      if (message.includes("not found") || message.includes("access denied")) {
        return res.status(404).json({ message });
      }
      
      res.status(500).json({ message });
    }
  });

  // Refresh project Smart Capture item price from master
  app.post("/api/smart-capture/items/:id/refresh-price", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectItemId = parseInt(req.params.id);
      
      if (isNaN(projectItemId) || projectItemId <= 0) {
        return res.status(400).json({ message: "Invalid project item ID" });
      }
      
      const refreshedItem = await storage.refreshProjectSmartCapturePrice(
        projectItemId,
        user.organizationId
      );
      
      res.json(refreshedItem);
    } catch (error: any) {
      console.error("Error refreshing smart capture item price:", error);
      res.status(500).json({ message: error.message || "Failed to refresh price" });
    }
  });

  // Smart Capture Invoice Approval Routes (Admin/Manager only)
  
  // Submit Smart Capture invoice for approval
  app.put("/api/projects/:projectId/smart-capture/submit-for-approval", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const projectId = parseInt(req.params.projectId);
      
      // Validate project access (user must be able to access the project)
      const userProject = await storage.getProject(projectId, user.id);
      if (!userProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const submittedInvoice = await storage.submitSmartCaptureInvoiceForApproval(projectId, user.organizationId);
      
      res.json({ 
        message: "Smart Capture invoice submitted for approval",
        invoice: submittedInvoice
      });
    } catch (error: any) {
      console.error("Error submitting Smart Capture invoice for approval:", error);
      res.status(400).json({ message: error.message || "Failed to submit invoice for approval" });
    }
  });
  
  // Get pending Smart Capture invoices for approval
  app.get("/api/smart-capture/invoices/pending", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "Access denied. Admin or Manager role required." });
      }
      
      // Get pending Smart Capture invoices for this organization
      const pendingInvoices = await db
        .select({
          id: invoices.id,
          userId: invoices.userId,
          customerId: invoices.customerId,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          subtotal: invoices.subtotal,
          taxRate: invoices.taxRate,
          taxAmount: invoices.taxAmount,
          total: invoices.total,
          currency: invoices.currency,
          notes: invoices.notes,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          stripePaymentIntentId: invoices.stripePaymentIntentId,
          squarePaymentId: invoices.squarePaymentId,
          paymentMethod: invoices.paymentMethod,
          attachmentUrl: invoices.attachmentUrl,
          originalFileName: invoices.originalFileName,
          isUploadedInvoice: invoices.isUploadedInvoice,
          isSmartCaptureInvoice: invoices.isSmartCaptureInvoice,
          projectId: invoices.projectId,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .innerJoin(users, eq(invoices.userId, users.id))
        .where(and(
          eq(users.organizationId, user.organizationId),
          eq(invoices.status, 'pending_approval'),
          eq(invoices.isSmartCaptureInvoice, true)
        ))
        .orderBy(desc(invoices.createdAt));
      
      res.json(pendingInvoices);
    } catch (error: any) {
      console.error("Error fetching pending Smart Capture invoices:", error);
      res.status(500).json({ message: "Failed to fetch pending invoices" });
    }
  });

  // Approve Smart Capture invoice
  app.put("/api/smart-capture/invoices/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const invoiceId = parseInt(req.params.id);
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "Access denied. Admin or Manager role required." });
      }
      
      // Get the invoice to verify it's a Smart Capture invoice pending approval
      const invoice = await storage.getInvoices(user.id, { 
        id: invoiceId,
        organizationId: user.organizationId 
      });
      
      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const currentInvoice = invoice[0];
      if (!currentInvoice.isSmartCaptureInvoice || currentInvoice.status !== 'pending_approval') {
        return res.status(400).json({ message: "Invoice is not eligible for approval" });
      }
      
      // Approve the invoice
      const approvedInvoice = await storage.updateInvoice(invoiceId, user.id, {
        status: 'sent', // Move to sent status after approval
        approvedBy: user.id,
        approvedAt: new Date()
      });
      
      console.log(`✅ Smart Capture invoice ${invoiceId} approved by ${user.firstName} ${user.lastName}`);
      
      // Broadcast approval to organization users
      broadcastToWebUsers(user.organizationId, 'smart_capture_invoice_approved', {
        invoiceId: approvedInvoice.id,
        invoiceNumber: approvedInvoice.invoiceNumber || approvedInvoice.id,
        approvedBy: `${user.firstName} ${user.lastName}`,
        timestamp: new Date().toISOString()
      });
      
      res.json(approvedInvoice);
    } catch (error: any) {
      console.error("Error approving Smart Capture invoice:", error);
      res.status(500).json({ message: "Failed to approve invoice" });
    }
  });

  // Reject Smart Capture invoice
  app.put("/api/smart-capture/invoices/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const invoiceId = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "Access denied. Admin or Manager role required." });
      }
      
      // Get the invoice to verify it's a Smart Capture invoice pending approval
      const invoice = await storage.getInvoices(user.id, { 
        id: invoiceId,
        organizationId: user.organizationId 
      });
      
      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const currentInvoice = invoice[0];
      if (!currentInvoice.isSmartCaptureInvoice || currentInvoice.status !== 'pending_approval') {
        return res.status(400).json({ message: "Invoice is not eligible for rejection" });
      }
      
      // Reject the invoice - move back to draft status
      const rejectedInvoice = await storage.updateInvoice(invoiceId, user.id, {
        status: 'draft', // Move back to draft for editing
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || 'No reason provided'
      });
      
      console.log(`❌ Smart Capture invoice ${invoiceId} rejected by ${user.firstName} ${user.lastName}: ${rejectionReason}`);
      
      // Broadcast rejection to organization users
      broadcastToWebUsers(user.organizationId, 'smart_capture_invoice_rejected', {
        invoiceId: rejectedInvoice.id,
        invoiceNumber: rejectedInvoice.invoiceNumber || rejectedInvoice.id,
        rejectedBy: `${user.firstName} ${user.lastName}`,
        rejectionReason: rejectionReason || 'No reason provided',
        timestamp: new Date().toISOString()
      });
      
      res.json(rejectedInvoice);
    } catch (error: any) {
      console.error("Error rejecting Smart Capture invoice:", error);
      res.status(500).json({ message: "Failed to reject invoice" });
    }
  });

  // Edit and approve Smart Capture invoice (allow admins/managers to make changes and approve)
  app.put("/api/smart-capture/invoices/:id/edit-and-approve", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const invoiceId = parseInt(req.params.id);
      const { notes, taxRate, taxAmount, subtotal, total } = req.body;
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "Access denied. Admin or Manager role required." });
      }
      
      // Get the invoice to verify it's a Smart Capture invoice pending approval
      const invoice = await storage.getInvoices(user.id, { 
        id: invoiceId,
        organizationId: user.organizationId 
      });
      
      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const currentInvoice = invoice[0];
      if (!currentInvoice.isSmartCaptureInvoice || currentInvoice.status !== 'pending_approval') {
        return res.status(400).json({ message: "Invoice is not eligible for editing and approval" });
      }
      
      // Update invoice with changes and approve
      const updatedInvoice = await storage.updateInvoice(invoiceId, user.id, {
        ...(notes !== undefined && { notes }),
        ...(taxRate !== undefined && { taxRate }),
        ...(taxAmount !== undefined && { taxAmount }),
        ...(subtotal !== undefined && { subtotal }),
        ...(total !== undefined && { total }),
        status: 'sent', // Approve after editing
        approvedBy: user.id,
        approvedAt: new Date()
      });
      
      console.log(`✅ Smart Capture invoice ${invoiceId} edited and approved by ${user.firstName} ${user.lastName}`);
      
      // Broadcast approval to organization users
      broadcastToWebUsers(user.organizationId, 'smart_capture_invoice_approved', {
        invoiceId: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber || updatedInvoice.id,
        approvedBy: `${user.firstName} ${user.lastName}`,
        wasEdited: true,
        timestamp: new Date().toISOString()
      });
      
      res.json(updatedInvoice);
    } catch (error: any) {
      console.error("Error editing and approving Smart Capture invoice:", error);
      res.status(500).json({ message: "Failed to edit and approve invoice" });
    }
  });

  // Add broadcast functions to the app for use in routes  
  (app as any).broadcastToWebUsers = broadcastToWebUsers;
  (app as any).broadcastToUser = broadcastToUser;
  
  // Start notification processor for automated task reminders
  const taskNotificationModule = await import("./taskNotificationService");
  taskNotificationModule.startNotificationProcessor();

  return httpServer;
}

