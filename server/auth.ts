import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { users, userSessions } from "@shared/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_EXPIRY_HOURS = 24;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async createSession(
    userId: number, 
    userAgent?: string, 
    ipAddress?: string,
    gpsData?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      deviceType?: string;
    }
  ) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        token,
        expiresAt,
        userAgent,
        ipAddress,
        latitude: gpsData?.latitude ? gpsData.latitude.toString() : null,
        longitude: gpsData?.longitude ? gpsData.longitude.toString() : null,
        locationAccuracy: gpsData?.accuracy ? gpsData.accuracy.toString() : null,
        deviceType: gpsData?.deviceType,
        locationTimestamp: gpsData?.latitude ? new Date() : null,
      })
      .returning();

    return session;
  }

  static async validateSession(token: string) {
    const [sessionWithUser] = await db
      .select({
        session: userSessions,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          organizationId: users.organizationId,
          role: users.role,
          firstName: users.firstName,
          lastName: users.lastName,
          isActive: users.isActive,
          isDemoAccount: users.isDemoAccount,
          demoExpiresAt: users.demoExpiresAt,
          // Include all permission fields
          canAccessDashboard: users.canAccessDashboard,
          canAccessCalendar: users.canAccessCalendar,
          canAccessTimeClock: users.canAccessTimeClock,
          canAccessJobs: users.canAccessJobs,
          canAccessMyTasks: users.canAccessMyTasks,
          canAccessLeads: users.canAccessLeads,
          canAccessExpenses: users.canAccessExpenses,
          canAccessQuotes: users.canAccessQuotes,
          canAccessInvoices: users.canAccessInvoices,
          canAccessCustomers: users.canAccessCustomers,
          canAccessPayments: users.canAccessPayments,
          canAccessFileManager: users.canAccessFileManager,
          canAccessPartsSupplies: users.canAccessPartsSupplies,
          canAccessMySchedule: users.canAccessMySchedule,
          canAccessTutorials: users.canAccessTutorials,
          canAccessFormBuilder: users.canAccessFormBuilder,
          canAccessInspections: users.canAccessInspections,
          canAccessInternalMessages: users.canAccessInternalMessages,
          canAccessTeamMessages: users.canAccessTeamMessages,
          canAccessImageGallery: users.canAccessImageGallery,
          canAccessSMS: users.canAccessSMS,
          canAccessMessages: users.canAccessMessages,
          canAccessGpsTracking: users.canAccessGpsTracking,
          canAccessWeather: users.canAccessWeather,
          canAccessReviews: users.canAccessReviews,
          canAccessMarketResearch: users.canAccessMarketResearch,
          canAccessHR: users.canAccessHR,
          canAccessUsers: users.canAccessUsers,
          canAccessSaasAdmin: users.canAccessSaasAdmin,
          canAccessAdminSettings: users.canAccessAdminSettings,
          canAccessReports: users.canAccessReports,
        },
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.token, token),
          gt(userSessions.expiresAt, sql`now()`),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    return sessionWithUser || null;
  }

  static async invalidateSession(token: string) {
    await db
      .delete(userSessions)
      .where(eq(userSessions.token, token));
  }

  static async invalidateAllUserSessions(userId: number) {
    await db
      .delete(userSessions)
      .where(eq(userSessions.userId, userId));
  }

  static async updateLastLogin(userId: number) {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  static async cleanExpiredSessions() {
    await db
      .delete(userSessions)
      .where(sql`${userSessions.expiresAt} < now()`);
  }
}

// Authentication middleware - CUSTOM DOMAIN CRITICAL DEBUG
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Set CORS headers for custom domain FIRST
  const isCustomDomain = req.headers.origin?.includes('profieldmanager.com') || req.headers.host?.includes('profieldmanager.com');
  
  if (isCustomDomain && req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.cookies?.auth_token;

  // Debug logging for authentication (reduced verbosity)
  if (!token) {
    console.log('🔍 Auth Debug:', {
      url: req.url,
      method: req.method,
      path: req.path,
      isCustomDomain,
      host: req.headers.host,
      origin: req.headers.origin,
      tokenSource: authHeader ? 'Authorization Header' : (req.cookies?.auth_token ? 'Cookie' : 'NONE')
    });
  }

  if (!token) {
    console.log('❌ AUTHENTICATION FAILED - No token provided');
    return res.status(401).json({ message: "Authentication required" });
  }

  AuthService.validateSession(token)
    .then((sessionData) => {
      if (!sessionData) {
        console.log('🚨 SESSION VALIDATION FAILED - Invalid session data', {
          url: req.url,
          tokenLength: token?.length,
          tokenStart: token?.substring(0, 20),
          hasAuthHeader: !!authHeader,
          hasCookie: !!req.cookies?.auth_token
        });
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      console.log('✅ SESSION VALIDATION SUCCESS for:', sessionData.user.username);
      
      // DEBUG: Log the actual sessionData.user object to see what fields are available
      console.log('🔍 SESSION DATA USER OBJECT:', JSON.stringify(sessionData.user, null, 2));
      console.log('🔍 USER ID:', sessionData.user.id);
      console.log('🔍 USER ORG ID:', sessionData.user.organizationId);

      // Attach user to request - include all permission fields from database
      req.user = {
        id: sessionData.user.id,
        username: sessionData.user.username,
        email: sessionData.user.email,
        role: sessionData.user.role || 'user',
        firstName: sessionData.user.firstName || undefined,
        lastName: sessionData.user.lastName || undefined,
        organizationId: sessionData.user.organizationId,
        isDemoAccount: sessionData.user.isDemoAccount || false,
        demoExpiresAt: sessionData.user.demoExpiresAt || undefined,
        // Include all permission fields (Drizzle returns them in camelCase format)
        can_access_dashboard: sessionData.user.canAccessDashboard,
        can_access_calendar: sessionData.user.canAccessCalendar,
        can_access_time_clock: sessionData.user.canAccessTimeClock,
        can_access_jobs: sessionData.user.canAccessJobs,
        can_access_my_tasks: sessionData.user.canAccessMyTasks,
        can_access_leads: sessionData.user.canAccessLeads,
        can_access_expenses: sessionData.user.canAccessExpenses,
        can_access_quotes: sessionData.user.canAccessQuotes,
        can_access_invoices: sessionData.user.canAccessInvoices,
        can_access_customers: sessionData.user.canAccessCustomers,
        can_access_payments: sessionData.user.canAccessPayments,
        can_access_file_manager: sessionData.user.canAccessFileManager,
        can_access_parts_supplies: sessionData.user.canAccessPartsSupplies,
        can_access_my_schedule: sessionData.user.canAccessMySchedule,
        can_access_tutorials: sessionData.user.canAccessTutorials,
        can_access_form_builder: sessionData.user.canAccessFormBuilder,
        can_access_inspections: sessionData.user.canAccessInspections,
        can_access_internal_messages: sessionData.user.canAccessInternalMessages,
        can_access_team_messages: sessionData.user.canAccessTeamMessages,
        can_access_image_gallery: sessionData.user.canAccessImageGallery,
        can_access_sms: sessionData.user.canAccessSMS,
        can_access_messages: sessionData.user.canAccessMessages,
        can_access_gps_tracking: sessionData.user.canAccessGpsTracking,
        can_access_weather: sessionData.user.canAccessWeather,
        can_access_reviews: sessionData.user.canAccessReviews,
        can_access_market_research: sessionData.user.canAccessMarketResearch,
        can_access_hr: sessionData.user.canAccessHR,
        can_access_users: sessionData.user.canAccessUsers,
        can_access_saas_admin: sessionData.user.canAccessSaasAdmin,
        can_access_admin_settings: sessionData.user.canAccessAdminSettings,
        can_access_reports: sessionData.user.canAccessReports,
      };

      console.log('🎯 AUTH MIDDLEWARE - About to call next() for:', req.url);
      next();
    })
    .catch((error) => {
      console.error("❌ Auth middleware error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

// Role-based access control
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

// Admin-only access
export const requireAdmin = requireRole(['admin']);

// Manager or admin access
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);

export function requireTaskDelegationPermission(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.sendStatus(401);
  }

  // Allow admins and managers to delegate tasks
  if (user.role === 'admin' || user.role === 'manager') {
    return next();
  }

  // Regular users can only create tasks for themselves or update their own tasks
  const taskId = req.params.id;
  if (req.method === 'POST' || !taskId) {
    // Allow creating tasks for yourself
    return next();
  }

  return res.status(403).json({ 
    message: "Only managers and administrators can delegate tasks to other users" 
  });
}

// Block write operations for demo accounts
export function blockDemoAccountWrites(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  
  // If user is not authenticated or not a demo account, allow the request
  if (!user || !user.isDemoAccount) {
    return next();
  }
  
  // Block mutating operations for demo accounts
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (writeMethods.includes(req.method)) {
    return res.status(403).json({ 
      message: "Demo accounts cannot save changes. Please sign up for a full account to save your data.",
      isDemoAccount: true
    });
  }
  
  // Allow read operations
  next();
}

// Type declarations are handled in routes.ts to avoid conflicts