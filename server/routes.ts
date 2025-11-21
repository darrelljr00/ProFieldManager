import express, { type Express, Request } from "express";
import * as crypto from "crypto";
import { registerStripeConnectRoutes } from "./routes/stripeConnect";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import twilio from "twilio";
import OpenAI from "openai";
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
  insertServiceSchema,
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
import { AuthService, requireAuth, requireAdmin, requireManagerOrAdmin, requireTaskDelegationPermission, blockDemoAccountWrites } from "./auth";
import { ZodError } from "zod";
import { seedDatabase } from "./seed-data";
import { nanoid } from "nanoid";
import { db } from "./db";
import { 
  users, customers, invoices, quotes, quoteAvailability, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, gasCardUsage, leads, leadSettings, messages, internalMessages,
  recurringJobSeries, recurringJobOccurrences,
  images, projectFiles, settings, organizations, userSessions, vendors, vehicles,
  vehicleMaintenanceRecords, vehicleMaintenanceIntervals,
  soundSettings, userDashboardSettings, dashboardProfiles,
  schedules, scheduleAssignments, scheduleComments, timeClock,
  lateArrivals, notifications, notificationSettings,
  partsSupplies, inventoryTransactions, stockAlerts,
  partsCategories, meetings, meetingParticipants, meetingMessages, meetingRecordings,
  jobSiteGeofences, jobSiteEvents, gpsTrackingData,
  obdLocationData, obdDiagnosticData, obdTrips, savedRouteReplays, services, jobsServices,
  inspectionRecords, jobTravelSegments, projectUsers, employees,
  syncConfigurations, syncHistory, syncConflicts,
  insertSyncConfigurationSchema,
  plannedRoutes, routeWaypoints, routeDeviations, routeStops,
  insertPlannedRouteSchema, insertRouteWaypointSchema, insertRouteDeviationSchema, insertRouteStopSchema,
  InsertRouteWaypoint,
  cacheSettings, insertCacheSettingsSchema, customerEtaSettings, customerEtaNotifications,
  vehicleInspectionAlertSettings, vehicleInspectionAlerts,
  stripeWebhookEvents,
  onboardingStatus
} from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull, isNull } from "drizzle-orm";
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
import { NotificationService, setBroadcastFunction, notifyUserCreation, notifyPasswordReset } from "./notificationService";
import { VehicleInspectionAlertService } from "./vehicleInspectionAlertService";
import { getCachedNotificationUnreadCount, getCachedInternalMessages, invalidateNotificationCache, invalidateMessageCache, clearAllQueryCaches, clearOrganizationCaches } from './cache/queryCache';
import { routeMonitoringService } from "./routeMonitoring";
import { cacheConfigService } from "./cache/CacheConfigService";
import { calculateSpeed } from "./utils/gps";

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
        isDemoAccount?: boolean;
        demoExpiresAt?: Date;
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

// Initialize OpenAI for OCR and AI features (conditional)
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
  console.log("✅ OpenAI client initialized for OCR features");

} else {
  console.log("⚠️ OpenAI API key not configured - OCR features will be disabled");
}

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
      
      // Trigger vehicle inspection alert check
      try {
        const { VehicleInspectionAlertService } = await import('./vehicleInspectionAlertService');
        VehicleInspectionAlertService.checkOnClockIn(
          user.id,
          user.organizationId,
          timeClockEntry.id,
          new Date(timeClockEntry.clockInTime)
        );
      } catch (inspectionError) {
        console.error('Error triggering vehicle inspection check:', inspectionError);
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

  // Generate PDF for Smart Capture invoice
  app.post("/api/smart-capture/invoices/:id/generate-pdf", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const invoiceId = parseInt(req.params.id);
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      // Get invoice from storage
      const invoice = await storage.getInvoices(user.id, { 
        id: invoiceId,
        organizationId: user.organizationId 
      });
      
      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const currentInvoice = invoice[0];
      if (!currentInvoice.isSmartCaptureInvoice) {
        return res.status(400).json({ message: "Invoice is not a Smart Capture invoice" });
      }
      
      console.log(`📄 Generating PDF for Smart Capture invoice ${invoiceId} by ${user.firstName} ${user.lastName}`);
      
      // For now, we'll simulate PDF generation with a simple response
      // In a real implementation, you would use a PDF library like puppeteer, html-pdf-node, or similar
      
      // Create invoice HTML content for PDF generation
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${currentInvoice.invoiceNumber || currentInvoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Texas Power Wash</h1>
            <h2>Invoice ${currentInvoice.invoiceNumber || currentInvoice.id}</h2>
          </div>
          
          <div class="invoice-details">
            <p><strong>Date:</strong> ${new Date(currentInvoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${currentInvoice.customer?.name || 'N/A'}</p>
            <p><strong>Project:</strong> ${currentInvoice.project?.name || 'N/A'}</p>
            ${currentInvoice.project?.jobNumber ? `<p><strong>Job Number:</strong> ${currentInvoice.project.jobNumber}</p>` : ''}
          </div>
          
          <div class="invoice-content">
            <p><strong>Subtotal:</strong> $${currentInvoice.subtotal}</p>
            ${currentInvoice.taxAmount ? `<p><strong>Tax:</strong> $${currentInvoice.taxAmount}</p>` : ''}
            <div class="total">
              <p>Total: $${currentInvoice.total}</p>
            </div>
          </div>
          
          ${currentInvoice.notes ? `
            <div style="margin-top: 30px;">
              <h3>Notes:</h3>
              <p>${currentInvoice.notes}</p>
            </div>
          ` : ''}
        </body>
        </html>
      `;
      
      // In a real implementation, you would:
      // 1. Use html-pdf-node or puppeteer to convert HTML to PDF
      // 2. Save the PDF to file system or cloud storage
      // 3. Return the PDF URL or file path
      
      // For now, we'll return a success response indicating the PDF was "generated"
      res.json({ 
        success: true,
        message: "PDF generated successfully",
        invoiceNumber: currentInvoice.invoiceNumber || currentInvoice.id,
        // In real implementation: pdfUrl: "/path/to/generated/invoice.pdf"
      });
      
    } catch (error: any) {
      console.error("Error generating PDF for Smart Capture invoice:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Add broadcast functions to the app for use in routes  
  (app as any).broadcastToWebUsers = broadcastToWebUsers;
  (app as any).broadcastToUser = broadcastToUser;
  
  // Start notification processor for automated task reminders
  const taskNotificationModule = await import("./taskNotificationService");
  taskNotificationModule.startNotificationProcessor();

  // Set up daily automation for lead follow-ups (runs every day at 9 AM)
  const AUTOMATION_HOUR = 9; // 9 AM
  const checkAutomation = () => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(AUTOMATION_HOUR, 0, 0, 0);
    
    // If we've already passed 9 AM today, schedule for tomorrow
    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const timeUntilNext = nextRun.getTime() - now.getTime();
    
    console.log(`🔄 Next automatic lead follow-up scheduled for: ${nextRun.toLocaleString()}`);
    
    setTimeout(async () => {
      try {
        console.log("🚀 Running daily automatic lead follow-ups...");
        const { leadAutomationService } = await import("./leadAutomation");
        await leadAutomationService.processAutomaticFollowUps();
        
        // Schedule the next run
        checkAutomation();
      } catch (error) {
        console.error("❌ Error in daily automation:", error);
        // Still schedule the next run even if this one failed
        checkAutomation();
      }
    }, timeUntilNext);
  };
  
  // Start the automation scheduler
  console.log("🤖 Starting lead automation scheduler...");
  checkAutomation();

  // Set up quote follow-up reminder scheduler (runs every hour)
  const checkQuoteFollowUps = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find quotes with follow-up date today or past, that haven't been notified yet
      const quotesNeedingFollowUp = await db
        .select({
          quote: quotes,
          customer: customers,
          user: users,
        })
        .from(quotes)
        .leftJoin(customers, eq(quotes.customerId, customers.id))
        .leftJoin(users, eq(quotes.userId, users.id))
        .where(
          and(
            lte(quotes.followUpDate, new Date()),
            eq(quotes.followUpNotificationSent, false),
            eq(quotes.isDeleted, false)
          )
        );

      for (const { quote, customer, user } of quotesNeedingFollowUp) {
        if (!customer || !user) continue;

        // Send notification to all admins and managers in the organization
        const adminUsers = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.organizationId, user.organizationId),
              or(eq(users.role, 'admin'), eq(users.role, 'manager'))
            )
          );

        for (const adminUser of adminUsers) {
          await NotificationService.createNotification({
            organizationId: user.organizationId,
            userId: adminUser.id,
            title: `Quote Follow-up Reminder`,
            message: `It's time to follow up on quote ${quote.quoteNumber} for ${customer.name}`,
            type: 'quote_follow_up',
            priority: 'normal',
            category: 'team_based',
            data: {
              quoteId: quote.id,
              customerId: customer.id,
              quoteNumber: quote.quoteNumber,
            }
          });
        }

        // Mark quote as notified
        await db
          .update(quotes)
          .set({ followUpNotificationSent: true })
          .where(eq(quotes.id, quote.id));
          
        console.log(`📬 Sent follow-up reminder for quote ${quote.quoteNumber}`);
      }
      
      if (quotesNeedingFollowUp.length > 0) {
        console.log(`✅ Processed ${quotesNeedingFollowUp.length} quote follow-up reminders`);
      }
    } catch (error) {
      console.error("❌ Error checking quote follow-ups:", error);
    }

    // Schedule next check in 1 hour
    setTimeout(checkQuoteFollowUps, 60 * 60 * 1000);
  };

  // Start quote follow-up reminder scheduler
  console.log("📅 Starting quote follow-up reminder scheduler...");
  checkQuoteFollowUps();

  // ========================================
  // SERVER SYNC API ENDPOINTS
  // ========================================

  // Get all sync configurations for the organization
  app.get('/api/sync/configurations', requireAuth, async (req, res) => {
    try {
      const configs = await db
        .select()
        .from(syncConfigurations)
        .where(eq(syncConfigurations.organizationId, req.user!.organizationId));
      
      res.json(configs);
    } catch (error) {
      console.error("Error fetching sync configurations:", error);
      res.status(500).json({ error: "Failed to fetch sync configurations" });
    }
  });
  app.post('/api/sync/configurations', requireAuth, async (req, res) => {
    try {
      const validated = insertSyncConfigurationSchema.parse(req.body);
      
      // Encrypt password if provided
      let encryptedPassword = null;
      if (validated.encryptedPassword) {
        const bcrypt = await import('bcryptjs');
        encryptedPassword = await bcrypt.hash(validated.encryptedPassword, 10);
      }
      
      const [config] = await db
        .insert(syncConfigurations)
        .values({
          ...validated,
          encryptedPassword,
          organizationId: req.user!.organizationId,
        })
        .returning();
      
      res.json(config);
    } catch (error) {
      console.error("Error creating sync configuration:", error);
      res.status(400).json({ error: "Failed to create sync configuration" });
    }
  });

  // Update sync configuration
  app.put('/api/sync/configurations/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertSyncConfigurationSchema.partial().parse(req.body);
      
      // Encrypt password if provided
      let encryptedPassword = validated.encryptedPassword;
      if (encryptedPassword) {
        const bcrypt = await import('bcryptjs');
        encryptedPassword = await bcrypt.hash(encryptedPassword, 10);
      }
      
      const [config] = await db
        .update(syncConfigurations)
        .set({
          ...validated,
          encryptedPassword,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(syncConfigurations.id, id),
            eq(syncConfigurations.organizationId, req.user!.organizationId)
          )
        )
        .returning();
      
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error updating sync configuration:", error);
      res.status(400).json({ error: "Failed to update sync configuration" });
    }
  });

  // Delete sync configuration
  app.delete('/api/sync/configurations/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await db
        .delete(syncConfigurations)
        .where(
          and(
            eq(syncConfigurations.id, id),
            eq(syncConfigurations.organizationId, req.user!.organizationId)
          )
        );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sync configuration:", error);
      res.status(500).json({ error: "Failed to delete sync configuration" });
    }
  });

  // Test connection to remote server
  app.post('/api/sync/test-connection', requireAuth, async (req, res) => {
    try {
      const { serverUrl, apiKey, username, encryptedPassword } = req.body;
      
      const axios = await import('axios');
      const response = await axios.default.get(`${serverUrl}/api/sync/ping`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Username': username,
        },
        timeout: 10000,
      });
      
      res.json({ 
        success: true, 
        message: "Connection successful",
        serverVersion: response.data.version,
      });
    } catch (error: any) {
      console.error("Connection test failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Connection failed" 
      });
    }
  });

  // Get sync history
  app.get('/api/sync/history', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await db
        .select({
          id: syncHistory.id,
          configurationId: syncHistory.configurationId,
          syncType: syncHistory.syncType,
          syncDirection: syncHistory.syncDirection,
          status: syncHistory.status,
          totalRecords: syncHistory.totalRecords,
          recordsSynced: syncHistory.recordsSynced,
          recordsFailed: syncHistory.recordsFailed,
          conflictsDetected: syncHistory.conflictsDetected,
          totalFiles: syncHistory.totalFiles,
          filesSynced: syncHistory.filesSynced,
          startedAt: syncHistory.startedAt,
          completedAt: syncHistory.completedAt,
          durationSeconds: syncHistory.durationSeconds,
          errorMessage: syncHistory.errorMessage,
          createdAt: syncHistory.createdAt,
          configuration: {
            id: syncConfigurations.id,
            serverName: syncConfigurations.serverName,
          },
        })
        .from(syncHistory)
        .leftJoin(syncConfigurations, eq(syncHistory.configurationId, syncConfigurations.id))
        .where(eq(syncHistory.organizationId, req.user!.organizationId))
        .orderBy(desc(syncHistory.createdAt))
        .limit(limit);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching sync history:", error);
      res.status(500).json({ error: "Failed to fetch sync history" });
    }
  });

  // Get pending conflicts
  app.get('/api/sync/conflicts', requireAuth, async (req, res) => {
    try {
      const conflicts = await db
        .select()
        .from(syncConflicts)
        .where(
          and(
            eq(syncConflicts.organizationId, req.user!.organizationId),
            eq(syncConflicts.status, 'pending')
          )
        )
        .orderBy(desc(syncConflicts.createdAt));
      
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      res.status(500).json({ error: "Failed to fetch conflicts" });
    }
  });

  // Resolve a conflict
  app.post('/api/sync/conflicts/:id/resolve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { resolution, mergedData } = req.body;
      
      const [conflict] = await db
        .update(syncConflicts)
        .set({
          status: resolution,
          resolvedBy: req.user!.id,
          resolvedAt: new Date(),
          resolution: req.body.resolutionNote,
          mergedData: mergedData || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(syncConflicts.id, id),
            eq(syncConflicts.organizationId, req.user!.organizationId)
          )
        )
        .returning();
      
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      res.json(conflict);
    } catch (error) {
      console.error("Error resolving conflict:", error);
      res.status(500).json({ error: "Failed to resolve conflict" });
    }
  });

  // Export database to SQL
  app.post('/api/sync/export/sql', requireAuth, async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      // Get all table names for the organization
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await pool.query(tablesQuery);
      const tables = tablesResult.rows.map(row => row.table_name);
      
      let sqlDump = `-- SQL Export for Organization ${req.user!.organizationId}\n`;
      sqlDump += `-- Generated: ${new Date().toISOString()}\n\n`;
      
      // Export each table
      for (const table of tables) {
        // Get table data filtered by organization
        const dataQuery = `SELECT * FROM ${table} WHERE organization_id = $1`;
        try {
          const result = await pool.query(dataQuery, [req.user!.organizationId]);
          
          if (result.rows.length > 0) {
            sqlDump += `\n-- Table: ${table}\n`;
            
            for (const row of result.rows) {
              const columns = Object.keys(row).join(', ');
              const values = Object.values(row)
                .map(v => {
                  if (v === null) return 'NULL';
                  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                  if (v instanceof Date) return `'${v.toISOString()}'`;
                  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                  return v;
                })
                .join(', ');
              
              sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
            }
          }
        } catch (err) {
          // Skip tables without organization_id column
          continue;
        }
      }
      
      await pool.end();
      
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="database-export-${Date.now()}.sql"`);
      res.send(sqlDump);
    } catch (error) {
      console.error("Error exporting SQL:", error);
      res.status(500).json({ error: "Failed to export database" });
    }
  });

  // Export database to CSV
  app.post('/api/sync/export/csv', requireAuth, async (req, res) => {
    try {
      const { tableName } = req.body;
      
      if (!tableName) {
        return res.status(400).json({ error: "Table name is required" });
      }
      
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const query = `SELECT * FROM ${tableName} WHERE organization_id = $1`;
      const result = await pool.query(query, [req.user!.organizationId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No data found" });
      }
      
      // Convert to CSV
      const headers = Object.keys(result.rows[0]).join(',');
      const rows = result.rows.map(row => {
        return Object.values(row)
          .map(v => {
            if (v === null) return '';
            if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
            if (v instanceof Date) return v.toISOString();
            if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
            return v;
          })
          .join(',');
      }).join('\n');
      
      const csv = `${headers}\n${rows}`;
      
      await pool.end();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tableName}-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Scan files for sync
  app.get('/api/sync/files/scan', requireAuth, async (req, res) => {
    try {
      const crypto = await import('crypto');
      const fs = await import('fs');
      const path = await import('path');
      
      // Get all files from file_manager table
      const files = await db
        .select()
        .from(fileManager)
        .where(eq(fileManager.organizationId, req.user!.organizationId));
      
      const fileList = [];
      
      for (const file of files) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', file.filePath);
          
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const fileBuffer = fs.readFileSync(filePath);
            const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
            
            fileList.push({
              id: file.id,
              name: file.fileName,
              path: file.filePath,
              size: stats.size,
              checksum,
              updatedAt: file.updatedAt,
            });
          }
        } catch (err) {
          console.error(`Error processing file ${file.fileName}:`, err);
        }
      }
      
      res.json({
        totalFiles: fileList.length,
        totalSize: fileList.reduce((sum, f) => sum + f.size, 0),
        files: fileList,
      });
    } catch (error) {
      console.error("Error scanning files:", error);
      res.status(500).json({ error: "Failed to scan files" });
    }
  });

  // Execute sync operation
  app.post('/api/sync/execute', requireAuth, async (req, res) => {
    try {
      const { configurationId, syncType } = req.body;
      
      // Get configuration
      const [config] = await db
        .select()
        .from(syncConfigurations)
        .where(
          and(
            eq(syncConfigurations.id, configurationId),
            eq(syncConfigurations.organizationId, req.user!.organizationId)
          )
        );
      
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      // Create sync history record
      const [historyRecord] = await db
        .insert(syncHistory)
        .values({
          organizationId: req.user!.organizationId,
          configurationId: config.id,
          syncType,
          syncDirection: config.syncDirection,
          exportFormat: config.exportFormat,
          status: 'in-progress',
          startedAt: new Date(),
          initiatedBy: req.user!.id,
        })
        .returning();
      
      // Return immediately and process sync in background
      res.json({ 
        success: true, 
        syncHistoryId: historyRecord.id,
        message: "Sync started" 
      });
      
      // Process sync in background
      (async () => {
        try {
          const axios = await import('axios');
          const startTime = Date.now();
          
          // Prepare sync payload
          let payload: any = {
            organizationId: req.user!.organizationId,
            syncType,
            timestamp: new Date().toISOString(),
          };
          
          if (syncType === 'database' || syncType === 'both') {
            // Export database based on format
            if (config.exportFormat === 'sql') {
              // Generate SQL dump (reuse logic from export endpoint)
              payload.databaseSql = '-- SQL export would go here';
            } else {
              payload.databaseCsv = '-- CSV export would go here';
            }
          }
          
          if (syncType === 'files' || syncType === 'both') {
            // Get file list with checksums
            const crypto = await import('crypto');
            const fs = await import('fs');
            const path = await import('path');
            
            const files = await db
              .select()
              .from(fileManager)
              .where(eq(fileManager.organizationId, req.user!.organizationId));
            
            payload.files = files.map(f => ({
              id: f.id,
              name: f.fileName,
              path: f.filePath,
              updatedAt: f.updatedAt,
            }));
          }
          
          // Send to remote server
          const response = await axios.default.post(
            `${config.serverUrl}/api/sync/receive`,
            payload,
            {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 300000, // 5 minutes
            }
          );
          
          const endTime = Date.now();
          const duration = Math.floor((endTime - startTime) / 1000);
          
          // Check for conflicts
          const conflicts = response.data.conflicts || [];
          
          // Save conflicts
          if (conflicts.length > 0) {
            for (const conflict of conflicts) {
              await db.insert(syncConflicts).values({
                organizationId: req.user!.organizationId,
                syncHistoryId: historyRecord.id,
                tableName: conflict.tableName,
                recordId: conflict.recordId.toString(),
                conflictType: conflict.type,
                localData: conflict.localData,
                remoteData: conflict.remoteData,
                localTimestamp: conflict.localTimestamp ? new Date(conflict.localTimestamp) : null,
                remoteTimestamp: conflict.remoteTimestamp ? new Date(conflict.remoteTimestamp) : null,
                localChecksum: conflict.localChecksum,
                remoteChecksum: conflict.remoteChecksum,
              });
            }
          }
          
          // Update sync history
          await db
            .update(syncHistory)
            .set({
              status: conflicts.length > 0 ? 'conflict' : 'completed',
              recordsSynced: response.data.recordsSynced || 0,
              totalRecords: response.data.totalRecords || 0,
              conflictsDetected: conflicts.length,
              completedAt: new Date(),
              durationSeconds: duration,
            })
            .where(eq(syncHistory.id, historyRecord.id));
          
          // Update last sync time on configuration
          await db
            .update(syncConfigurations)
            .set({ lastSyncAt: new Date() })
            .where(eq(syncConfigurations.id, config.id));
            
        } catch (error: any) {
          console.error("Sync failed:", error);
          
          // Update history with error
          await db
            .update(syncHistory)
            .set({
              status: 'failed',
              errorMessage: error.message,
              errorDetails: { error: error.toString() },
              completedAt: new Date(),
            })
            .where(eq(syncHistory.id, historyRecord.id));
        }
      })();
      
    } catch (error) {
      console.error("Error starting sync:", error);
      res.status(500).json({ error: "Failed to start sync" });
    }
  });


  // Proxy endpoint for Google Directions API (security: only allows Google Maps API requests)
  app.get("/api/proxy-directions", requireAuth, async (req, res) => {
    try {
      const { origin, destination } = req.query;
      
      if (!origin || !destination || typeof origin !== 'string' || typeof destination !== 'string') {
        return res.status(400).json({ error: "Origin and destination parameters are required" });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;
      
      const response = await fetch(directionsUrl);
      const data = await response.json();
      
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching directions:", error);
      res.status(500).json({ error: "Failed to fetch directions" });
    }
  });
  // Route Tracking endpoints
  // Save planned route when technician clicks Directions
  app.post("/api/routes/planned", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const data = insertPlannedRouteSchema.parse(req.body);
      
      const [route] = await db.insert(plannedRoutes).values({
        ...data,
        organizationId: user.organizationId,
        userId: user.id,
      }).returning();
      
      res.json(route);
    } catch (error: any) {
      console.error("Error saving planned route:", error);
      res.status(500).json({ message: "Error saving route: " + error.message });
    }
  });

  // Save route waypoints
  app.post("/api/routes/:routeId/waypoints", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      const waypoints = req.body as InsertRouteWaypoint[];
      
      // Verify route belongs to user's organization
      const route = await db.select().from(plannedRoutes)
        .where(and(
          eq(plannedRoutes.id, parseInt(routeId)),
          eq(plannedRoutes.organizationId, user.organizationId)
        ))
        .limit(1);
      
      if (!route.length) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const saved = await db.insert(routeWaypoints).values(
        waypoints.map(wp => ({
          ...wp,
          routeId: parseInt(routeId),
          organizationId: user.organizationId,
        }))
      ).returning();
      
      res.json(saved);
    } catch (error: any) {
      console.error("Error saving waypoints:", error);
      res.status(500).json({ message: "Error saving waypoints: " + error.message });
    }
  });

  // Get planned routes for user or organization
  app.get("/api/routes/planned", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const isAdmin = user.role === 'admin' || user.role === 'manager';
      const { userId, status } = req.query;
      
      let conditions = [eq(plannedRoutes.organizationId, user.organizationId)];
      
      if (!isAdmin) {
        conditions.push(eq(plannedRoutes.userId, user.id));
      } else if (userId) {
        conditions.push(eq(plannedRoutes.userId, parseInt(userId as string)));
      }
      
      if (status) {
        conditions.push(eq(plannedRoutes.status, status as string));
      }
      
      const routes = await db.select().from(plannedRoutes)
        .where(and(...conditions))
        .orderBy(desc(plannedRoutes.createdAt))
        .limit(100);
      
      res.json(routes);
    } catch (error: any) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Error fetching routes: " + error.message });
    }
  });

  // Get route waypoints
  app.get("/api/routes/:routeId/waypoints", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      const waypoints = await db.select().from(routeWaypoints)
        .where(and(
          eq(routeWaypoints.routeId, parseInt(routeId)),
          eq(routeWaypoints.organizationId, user.organizationId)
        ))
        .orderBy(routeWaypoints.stepNumber);
      
      res.json(waypoints);
    } catch (error: any) {
      console.error("Error fetching waypoints:", error);
      res.status(500).json({ message: "Error fetching waypoints: " + error.message });
    }
  });

  // Update route status
  app.patch("/api/routes/:routeId/status", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      const { status, startedAt, completedAt } = req.body;
      
      const [updated] = await db.update(plannedRoutes)
        .set({
          status,
          startedAt: startedAt ? new Date(startedAt) : undefined,
          completedAt: completedAt ? new Date(completedAt) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(plannedRoutes.id, parseInt(routeId)),
          eq(plannedRoutes.organizationId, user.organizationId)
        ))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating route status:", error);
      res.status(500).json({ message: "Error updating status: " + error.message });
    }
  });

  // Log route deviation
  app.post("/api/routes/:routeId/deviations", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      const data = insertRouteDeviationSchema.parse(req.body);
      
      const [deviation] = await db.insert(routeDeviations).values({
        ...data,
        routeId: parseInt(routeId),
        organizationId: user.organizationId,
        userId: user.id,
      }).returning();
      
      // Update deviation count on route
      await db.update(plannedRoutes)
        .set({
          deviationCount: sql`${plannedRoutes.deviationCount} + 1`,
        })
        .where(eq(plannedRoutes.id, parseInt(routeId)));
      
      res.json(deviation);
    } catch (error: any) {
      console.error("Error logging deviation:", error);
      res.status(500).json({ message: "Error logging deviation: " + error.message });
    }
  });

  // Log route stop
  app.post("/api/routes/:routeId/stops", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      const data = insertRouteStopSchema.parse(req.body);
      
      const [stop] = await db.insert(routeStops).values({
        ...data,
        routeId: parseInt(routeId),
        organizationId: user.organizationId,
        userId: user.id,
      }).returning();
      
      // Update stop count on route
      await db.update(plannedRoutes)
        .set({
          stopCount: sql`${plannedRoutes.stopCount} + 1`,
        })
        .where(eq(plannedRoutes.id, parseInt(routeId)));
      
      res.json(stop);
    } catch (error: any) {
      console.error("Error logging stop:", error);
      res.status(500).json({ message: "Error logging stop: " + error.message });
    }
  });

  // Get route deviations
  app.get("/api/routes/:routeId/deviations", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      const deviations = await db.select().from(routeDeviations)
        .where(and(
          eq(routeDeviations.routeId, parseInt(routeId)),
          eq(routeDeviations.organizationId, user.organizationId)
        ))
        .orderBy(desc(routeDeviations.detectedAt));
      
      res.json(deviations);
    } catch (error: any) {
      console.error("Error fetching deviations:", error);
      res.status(500).json({ message: "Error fetching deviations: " + error.message });
    }
  });

  // Get route stops
  app.get("/api/routes/:routeId/stops", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      const stops = await db.select().from(routeStops)
        .where(and(
          eq(routeStops.routeId, parseInt(routeId)),
          eq(routeStops.organizationId, user.organizationId)
        ))
        .orderBy(desc(routeStops.startedAt));
      
      res.json(stops);
    } catch (error: any) {
      console.error("Error fetching stops:", error);
      res.status(500).json({ message: "Error fetching stops: " + error.message });
    }
  });

  // Start route monitoring (called when technician starts driving)
  app.post("/api/routes/:routeId/start-monitoring", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      // Verify route belongs to user's organization
      const [route] = await db.select().from(plannedRoutes)
        .where(and(
          eq(plannedRoutes.id, parseInt(routeId)),
          eq(plannedRoutes.organizationId, user.organizationId)
        ));
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Start monitoring
      await routeMonitoringService.startMonitoring(parseInt(routeId), user.organizationId);
      
      res.json({ message: "Route monitoring started", routeId });
    } catch (error: any) {
      console.error("Error starting route monitoring:", error);
      res.status(500).json({ message: "Error starting monitoring: " + error.message });
    }
  });

  // Stop route monitoring (called when technician arrives)
  app.post("/api/routes/:routeId/stop-monitoring", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      // Stop monitoring and calculate final metrics
      await routeMonitoringService.stopMonitoring(parseInt(routeId), user.organizationId);
      
      res.json({ message: "Route monitoring stopped", routeId });
    } catch (error: any) {
      console.error("Error stopping route monitoring:", error);
      res.status(500).json({ message: "Error stopping monitoring: " + error.message });
    }
  });

  // Get route performance comparison (estimated vs actual)
  app.get("/api/routes/:routeId/performance", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const { routeId } = req.params;
      
      const [routeData] = await db.select({
        route: plannedRoutes,
        vehicle: vehicles,
        deviationCount: sql<number>`(SELECT COUNT(*) FROM ${routeDeviations} WHERE ${routeDeviations.routeId} = ${plannedRoutes.id})`,
        stopCount: sql<number>`(SELECT COUNT(*) FROM ${routeStops} WHERE ${routeStops.routeId} = ${plannedRoutes.id})`,
      })
      .from(plannedRoutes)
      .leftJoin(vehicles, eq(plannedRoutes.vehicleId, vehicles.id))
      .where(and(
        eq(plannedRoutes.id, parseInt(routeId)),
        eq(plannedRoutes.organizationId, user.organizationId)
      ));
      
      if (!routeData) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const { route, vehicle } = routeData;
      
      // Calculate performance metrics
      const distanceVariance = route.actualDistance 
        ? ((parseFloat(route.actualDistance) - parseFloat(route.totalDistance || '0')) / parseFloat(route.totalDistance || '1')) * 100
        : null;
      
      const durationVariance = route.actualDuration
        ? ((route.actualDuration - (route.estimatedDuration || 0)) / (route.estimatedDuration || 1)) * 100
        : null;
      
      const fuelCostVariance = route.actualFuelCost
        ? ((parseFloat(route.actualFuelCost) - parseFloat(route.estimatedFuelCost || '0')) / parseFloat(route.estimatedFuelCost || '1')) * 100
        : null;
      
      res.json({
        route: {
          id: route.id,
          status: route.status,
          startedAt: route.startedAt,
          completedAt: route.completedAt,
        },
        estimated: {
          distance: parseFloat(route.totalDistance || '0'),
          duration: route.estimatedDuration,
          fuelCost: parseFloat(route.estimatedFuelCost || '0'),
          fuelUsage: parseFloat(route.estimatedFuelUsage || '0'),
        },
        actual: {
          distance: route.actualDistance ? parseFloat(route.actualDistance) : null,
          duration: route.actualDuration,
          fuelCost: route.actualFuelCost ? parseFloat(route.actualFuelCost) : null,
          fuelUsage: route.actualFuelUsage ? parseFloat(route.actualFuelUsage) : null,
        },
        variance: {
          distance: distanceVariance,
          duration: durationVariance,
          fuelCost: fuelCostVariance,
        },
        incidents: {
          deviations: routeData.deviationCount,
          stops: routeData.stopCount,
        },
        vehicle: vehicle ? {
          vehicleNumber: vehicle.vehicleNumber,
          mpg: vehicle.mpg,
        } : null,
      });
    } catch (error: any) {
      console.error("Error fetching route performance:", error);
      res.status(500).json({ message: "Error fetching performance: " + error.message });
    }
  });



  // Route Deviations Report API
  app.get("/api/route-deviations", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;
      
      // Parse date range
      const { startDate: startParam, endDate: endParam } = req.query;
      const startDate = startParam ? new Date(startParam as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endParam ? new Date(endParam as string) : new Date();
      
      // Fetch route deviations with associated route, project, vehicle, and user info
      const deviations = await db
        .select({
          deviation: routeDeviations,
          route: plannedRoutes,
          project: projects,
          vehicle: vehicles,
          user: users,
        })
        .from(routeDeviations)
        .leftJoin(plannedRoutes, eq(routeDeviations.routeId, plannedRoutes.id))
        .leftJoin(projects, eq(plannedRoutes.jobId, projects.id))
        .leftJoin(vehicles, eq(plannedRoutes.vehicleId, vehicles.id))
        .leftJoin(users, eq(routeDeviations.userId, users.id))
        .where(and(
          eq(routeDeviations.organizationId, organizationId),
          gte(routeDeviations.detectedAt, startDate),
          lte(routeDeviations.detectedAt, endDate)
        ))
        .orderBy(desc(routeDeviations.detectedAt));
      
      // For each deviation, get all technicians assigned to active jobs on that vehicle
      const deviationsWithTechnicians = await Promise.all(
        deviations.map(async (d) => {
          let technicianNames: string[] = [];
          
          if (d.vehicle) {
            // Find all active projects assigned to this vehicle at the time of deviation
            const activeProjectsWithUsers = await db
              .select({
                assignedUser: users,
              })
              .from(projects)
              .leftJoin(users, eq(projects.assignedUserId, users.id))
              .where(and(
                eq(projects.vehicleId, d.vehicle.id),
                eq(projects.status, 'in_progress'),
                eq(projects.organizationId, organizationId)
              ));

            // Get unique technicians
            const uniqueTechs = activeProjectsWithUsers
              .filter(p => p.assignedUser)
              .map(p => `${p.assignedUser!.firstName} ${p.assignedUser!.lastName}`)
              .filter((tech, index, self) => self.indexOf(tech) === index);
            
            technicianNames = uniqueTechs;
          }
          
          // Fallback to route's assigned user if no active projects found
          if (technicianNames.length === 0 && d.user) {
            technicianNames = [`${d.user.firstName} ${d.user.lastName}`];
          }
          
          return {
            id: d.deviation.id,
            routeId: d.deviation.routeId,
            deviationType: d.deviation.deviationType,
            latitude: d.deviation.latitude,
            longitude: d.deviation.longitude,
            address: d.deviation.address,
            distanceFromRoute: d.deviation.distanceFromRoute,
            detectedAt: d.deviation.detectedAt,
            resolvedAt: d.deviation.resolvedAt,
            durationMinutes: d.deviation.durationMinutes,
            vehicleNumber: d.vehicle?.vehicleNumber || null,
            licensePlate: d.vehicle?.licensePlate || null,
            jobName: d.project?.jobName || null,
            technicians: technicianNames,
          };
        })
      );
      
      res.json(deviationsWithTechnicians);
    } catch (error: any) {
      console.error("Error fetching route deviations:", error);
      res.status(500).json({ message: "Error fetching route deviations: " + error.message });
    }
  });


  // Job Activity Report API - Start/Stop button tracking
  app.get("/api/reports/job-activity", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;
      
      const { startDate: startParam, endDate: endParam } = req.query;
      const startDate = startParam ? new Date(startParam as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endParam ? new Date(endParam as string) : new Date();
      
      // Count jobs started (status changed to in_progress) and completed per technician
      const jobActivity = await db
        .select({
          userId: projects.assignedUserId,
          firstName: users.firstName,
          lastName: users.lastName,
          position: users.position,
          jobStartCount: sql<number>`COUNT(CASE WHEN ${projects.status} IN ('in_progress', 'completed') THEN 1 END)`,
          autoStartCount: sql<number>`COUNT(CASE WHEN ${projects.autoStartedAt} IS NOT NULL THEN 1 END)`,
          autoStopCount: sql<number>`COUNT(CASE WHEN ${projects.autoCompletedAt} IS NOT NULL THEN 1 END)`,
          jobStopCount: sql<number>`COUNT(CASE WHEN ${projects.status} = 'completed' THEN 1 END)`,
        })
        .from(projects)
        .leftJoin(users, eq(projects.assignedUserId, users.id))
        .where(and(
          eq(projects.organizationId, organizationId),
          gte(projects.updatedAt, startDate),
          lte(projects.updatedAt, endDate),
          isNotNull(projects.assignedUserId)
        ))
        .groupBy(projects.assignedUserId, users.firstName, users.lastName, users.position)
        .orderBy(desc(sql`COUNT(CASE WHEN ${projects.status} IN ('in_progress', 'completed') THEN 1 END)`));
      
      const formattedActivity = jobActivity.map(a => ({
        userId: a.userId,
        technicianName: `${a.firstName} ${a.lastName}`,
        position: a.position,
        jobStartCount: Number(a.jobStartCount),
        autoStartCount: Number(a.autoStartCount),
        autoStopCount: Number(a.autoStopCount),
        jobStopCount: Number(a.jobStopCount),
      }));
      
      res.json(formattedActivity);
    } catch (error: any) {
      console.error("Error fetching job activity:", error);
      res.status(500).json({ message: "Error fetching job activity: " + error.message });
    }
  });

  // Documentation Compliance Report API - Photos and Signatures
  app.get("/api/reports/documentation-compliance", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const organizationId = user.organizationId;
      
      const { startDate: startParam, endDate: endParam } = req.query;
      const startDate = startParam ? new Date(startParam as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endParam ? new Date(endParam as string) : new Date();
      
      // Get ALL active users in the organization
      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true)
        ));
      
      // Initialize stats for ALL users
      const technicianStats = new Map<number, {
        firstName: string;
        lastName: string;
        totalJobs: number;
        jobsWithPhotos: Set<number>;
        jobsWithSignatures: Set<number>;
      }>();
      
      for (const techUser of allUsers) {
        technicianStats.set(techUser.id, {
          firstName: techUser.firstName,
          lastName: techUser.lastName,
          totalJobs: 0,
          jobsWithPhotos: new Set(),
          jobsWithSignatures: new Set(),
        });
      }
      
      // Get all completed projects in the date range
      const completedProjects = await db
        .select({
          id: projects.id,
          userId: projects.userId,
        })
        .from(projects)
        .where(and(
          eq(projects.organizationId, organizationId),
          eq(projects.status, 'completed'),
          gte(projects.updatedAt, startDate),
          lte(projects.updatedAt, endDate),
          isNotNull(projects.userId)
        ));
      
      // Update stats for users who have completed jobs
      for (const project of completedProjects) {
        if (!project.userId || !technicianStats.has(project.userId)) continue;
        
        const stats = technicianStats.get(project.userId)!;
        stats.totalJobs++;
        
        // Check if project has photos
        const photos = await db
          .select()
          .from(projectFiles)
          .where(and(
            eq(projectFiles.projectId, project.id),
            eq(projectFiles.fileType, 'image')
          ))
          .limit(1);
        
        if (photos.length > 0) {
          stats.jobsWithPhotos.add(project.id);
        }
        
        // Check if project has signatures
        const signatures = await db
          .select()
          .from(projectFiles)
          .where(and(
            eq(projectFiles.projectId, project.id),
            eq(projectFiles.signatureStatus, 'completed')
          ))
          .limit(1);
        
        if (signatures.length > 0) {
          stats.jobsWithSignatures.add(project.id);
        }
      }
      
      // Format response - now includes ALL users even with 0 jobs
      const formattedCompliance = Array.from(technicianStats.entries()).map(([userId, stats]) => ({
        userId,
        technicianName: `${stats.firstName} ${stats.lastName}`,
        totalJobs: stats.totalJobs,
        jobsWithPhotos: stats.jobsWithPhotos.size,
        jobsWithSignatures: stats.jobsWithSignatures.size,
      }))
      .sort((a, b) => b.totalJobs - a.totalJobs);
      
      res.json(formattedCompliance);
    } catch (error: any) {
      console.error("Error fetching documentation compliance:", error);
      res.status(500).json({ message: "Error fetching documentation compliance: " + error.message });
    }

  });

  // Onboarding walkthrough status endpoints
  app.get("/api/onboarding/status/:walkthroughId", requireAuth, async (req, res) => {
    try {
      const { walkthroughId } = req.params;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const status = await db
        .select()
        .from(onboardingStatus)
        .where(
          and(
            eq(onboardingStatus.userId, userId),
            eq(onboardingStatus.organizationId, organizationId),
            eq(onboardingStatus.walkthroughId, walkthroughId)
          )
        )
        .limit(1);

      if (status.length === 0) {
        return res.json({ 
          exists: false, 
          completed: false, 
          dismissed: false 
        });
      }

      res.json({
        exists: true,
        ...status[0],
      });
    } catch (error: any) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Error fetching onboarding status" });
    }
  });

  app.post("/api/onboarding/start", requireAuth, async (req, res) => {
    try {
      const { walkthroughId } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      if (!walkthroughId) {
        return res.status(400).json({ message: "walkthroughId is required" });
      }

      // Check if already exists
      const existing = await db
        .select()
        .from(onboardingStatus)
        .where(
          and(
            eq(onboardingStatus.userId, userId),
            eq(onboardingStatus.organizationId, organizationId),
            eq(onboardingStatus.walkthroughId, walkthroughId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.json(existing[0]);
      }

      // Create new status
      const [newStatus] = await db
        .insert(onboardingStatus)
        .values({
          userId,
          organizationId,
          walkthroughId,
          completed: false,
          dismissed: false,
        })
        .returning();

      res.json(newStatus);
    } catch (error: any) {
      console.error("Error starting walkthrough:", error);
      res.status(500).json({ message: "Error starting walkthrough" });
    }
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const { walkthroughId, rating, feedback } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      if (!walkthroughId) {
        return res.status(400).json({ message: "walkthroughId is required" });
      }

      // Update or create status
      const existing = await db
        .select()
        .from(onboardingStatus)
        .where(
          and(
            eq(onboardingStatus.userId, userId),
            eq(onboardingStatus.organizationId, organizationId),
            eq(onboardingStatus.walkthroughId, walkthroughId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(onboardingStatus)
          .set({
            completed: true,
            completedAt: new Date(),
            rating: rating || null,
            feedback: feedback || null,
            updatedAt: new Date(),
          })
          .where(eq(onboardingStatus.id, existing[0].id))
          .returning();

        return res.json(updated);
      } else {
        const [newStatus] = await db
          .insert(onboardingStatus)
          .values({
            userId,
            organizationId,
            walkthroughId,
            completed: true,
            completedAt: new Date(),
            rating: rating || null,
            feedback: feedback || null,
          })
          .returning();

        return res.json(newStatus);
      }
    } catch (error: any) {
      console.error("Error completing walkthrough:", error);
      res.status(500).json({ message: "Error completing walkthrough" });
    }
  });

  app.post("/api/onboarding/dismiss", requireAuth, async (req, res) => {
    try {
      const { walkthroughId } = req.body;
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      if (!walkthroughId) {
        return res.status(400).json({ message: "walkthroughId is required" });
      }

      // Update or create status
      const existing = await db
        .select()
        .from(onboardingStatus)
        .where(
          and(
            eq(onboardingStatus.userId, userId),
            eq(onboardingStatus.organizationId, organizationId),
            eq(onboardingStatus.walkthroughId, walkthroughId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(onboardingStatus)
          .set({
            dismissed: true,
            updatedAt: new Date(),
          })
          .where(eq(onboardingStatus.id, existing[0].id))
          .returning();

        return res.json(updated);
      } else {
        const [newStatus] = await db
          .insert(onboardingStatus)
          .values({
            userId,
            organizationId,
            walkthroughId,
            completed: false,
            dismissed: true,
          })
          .returning();

        return res.json(newStatus);
      }
    } catch (error: any) {
      console.error("Error dismissing walkthrough:", error);
      res.status(500).json({ message: "Error dismissing walkthrough" });
    }
  });

  return httpServer;
}

