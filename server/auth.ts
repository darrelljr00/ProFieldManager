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
        user: users,
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
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.cookies?.auth_token;

  // CRITICAL: Comprehensive debug logging for custom domain authentication issues
  console.log('🚨 CRITICAL AUTH DEBUG - CUSTOM DOMAIN:', {
    url: req.url,
    method: req.method,
    origin: req.headers.origin,
    host: req.headers.host,
    isCustomDomain: req.headers.origin === 'https://profieldmanager.com',
    authHeader: authHeader ? 'PRESENT (' + authHeader.length + ' chars)' : 'MISSING',
    authHeaderRaw: authHeader ? authHeader.substring(0, 50) + '...' : 'NONE',
    cookies: Object.keys(req.cookies || {}),
    cookieAuth: req.cookies?.auth_token ? 'PRESENT (' + req.cookies.auth_token.length + ' chars)' : 'MISSING',
    hasAnyToken: !!token,
    tokenLength: token?.length || 0,
    tokenSource: authHeader ? 'Authorization Header' : (req.cookies?.auth_token ? 'Cookie' : 'NONE'),
    userAgent: req.headers['user-agent']?.slice(0, 100),
    contentType: req.headers['content-type'],
    allHeaders: Object.keys(req.headers)
  });

  if (!token) {
    console.log('🚨 CRITICAL: No auth token found in request');
    console.log('🚨 CUSTOM DOMAIN AUTH FAILURE - Full request context:', JSON.stringify({
      url: req.url,
      method: req.method,
      origin: req.headers.origin,
      host: req.headers.host,
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.slice(0, 100),
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      isCustomDomain: req.headers.origin === 'https://profieldmanager.com'
    }, null, 2));
    console.log('🚨 All available cookie keys:', Object.keys(req.cookies || {}));
    return res.status(401).json({ message: "Authentication required" });
  }

  AuthService.validateSession(token)
    .then((sessionData) => {
      if (!sessionData) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      // Attach user to request - include all permission fields from database
      req.user = {
        id: sessionData.user.id,
        username: sessionData.user.username,
        email: sessionData.user.email,
        role: sessionData.user.role || 'user',
        firstName: sessionData.user.firstName || undefined,
        lastName: sessionData.user.lastName || undefined,
        organizationId: sessionData.user.organizationId,
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

      next();
    })
    .catch((error) => {
      console.error("Auth middleware error:", error);
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
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }

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

// Type declarations are handled in routes.ts to avoid conflicts