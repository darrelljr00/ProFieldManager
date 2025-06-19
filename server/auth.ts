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

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  AuthService.validateSession(token)
    .then((sessionData) => {
      if (!sessionData) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      // Attach user to request
      req.user = {
        id: sessionData.user.id,
        username: sessionData.user.username,
        email: sessionData.user.email,
        role: sessionData.user.role || 'user',
        firstName: sessionData.user.firstName || undefined,
        lastName: sessionData.user.lastName || undefined,
        organizationId: sessionData.user.organizationId,
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