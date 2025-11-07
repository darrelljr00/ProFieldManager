import { Express, Request, Response } from "express";
import { db } from "../db";
import { phoneSensorData, users, userSessions } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

type AuthenticatedRequest = Request & { user?: any };

// Middleware to get authenticated user
function getAuthenticatedUser(req: AuthenticatedRequest) {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
}

// Require authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export function registerPhoneSensorRoutes(app: Express) {
  
  // POST /api/phone-sensors - Receive sensor data from mobile devices
  app.post("/api/phone-sensors", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const sensorData = req.body;

      // Calculate productivity level based on activity
      let productivityLevel = 'medium';
      let idleTimeSeconds = sensorData.idleTimeSeconds || 0;

      if (sensorData.activityType === 'idle' || sensorData.activityType === 'sitting') {
        productivityLevel = 'low';
        idleTimeSeconds += 60; // assume 60s intervals
      } else if (sensorData.activityType === 'walking' || sensorData.activityType === 'in_vehicle') {
        productivityLevel = 'high';
      } else if (sensorData.activityType === 'standing' || sensorData.activityType === 'running') {
        productivityLevel = 'medium';
      }

      // Insert sensor data
      const dataToInsert: any = {
        organizationId: user.organizationId,
        userId: sensorData.userId || user.id,
        activityType: sensorData.activityType,
        timestamp: sensorData.timestamp ? new Date(sensorData.timestamp) : new Date(),
      };

      // Add optional fields
      if (sensorData.activityConfidence !== undefined) dataToInsert.activityConfidence = sensorData.activityConfidence;
      if (sensorData.latitude !== undefined) dataToInsert.latitude = sensorData.latitude;
      if (sensorData.longitude !== undefined) dataToInsert.longitude = sensorData.longitude;
      if (sensorData.accuracy !== undefined) dataToInsert.accuracy = sensorData.accuracy;
      if (sensorData.screenOn !== undefined) dataToInsert.screenOn = sensorData.screenOn;
      if (sensorData.screenTimeSeconds !== undefined) dataToInsert.screenTimeSeconds = sensorData.screenTimeSeconds;
      if (sensorData.stepCount !== undefined) dataToInsert.stepCount = sensorData.stepCount;
      if (sensorData.distanceMeters !== undefined) dataToInsert.distanceMeters = sensorData.distanceMeters;
      if (sensorData.batteryLevel !== undefined) dataToInsert.batteryLevel = sensorData.batteryLevel;
      if (sensorData.isCharging !== undefined) dataToInsert.isCharging = sensorData.isCharging;
      if (productivityLevel) dataToInsert.productivityLevel = productivityLevel;
      if (idleTimeSeconds) dataToInsert.idleTimeSeconds = idleTimeSeconds;
      if (sensorData.sessionId) dataToInsert.sessionId = sensorData.sessionId;
      if (sensorData.jobId) dataToInsert.jobId = sensorData.jobId;

      const inserted = await db.insert(phoneSensorData).values(dataToInsert).returning();

      res.json({ success: true, data: inserted[0] });
    } catch (error: any) {
      console.error("Error saving phone sensor data:", error);
      res.status(500).json({ message: "Error saving sensor data: " + error.message });
    }
  });

  // GET /api/phone-sensors/productivity - Get productivity analytics
  app.get("/api/phone-sensors/productivity", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const { startDate, endDate, userId } = req.query;

      // Default to last 30 days if no date range specified
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // First, get all currently logged-in users (active sessions)
      const activeSessionsQuery = await db
        .select({
          userId: userSessions.userId,
          ipAddress: userSessions.ipAddress,
          deviceType: userSessions.deviceType,
          userAgent: userSessions.userAgent,
          loginLatitude: userSessions.latitude,
          loginLongitude: userSessions.longitude,
          createdAt: userSessions.createdAt,
          expiresAt: userSessions.expiresAt,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName'),
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(userSessions)
        .leftJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            eq(users.organizationId, user.organizationId),
            gte(userSessions.expiresAt, new Date()) // Only active sessions
          )
        )
        .orderBy(desc(userSessions.createdAt));

      // Create a map of unique users (most recent session for each)
      const activeUsersMap = new Map<number, any>();
      activeSessionsQuery.forEach(session => {
        if (!activeUsersMap.has(session.userId)) {
          activeUsersMap.set(session.userId, session);
        }
      });

      // Build query conditions for sensor data
      const conditions = [
        eq(phoneSensorData.organizationId, user.organizationId),
        gte(phoneSensorData.timestamp, start),
      ];

      if (userId) {
        conditions.push(eq(phoneSensorData.userId, parseInt(userId as string)));
      }

      // Fetch sensor data with GPS coordinates
      const sensorRecords = await db
        .select({
          id: phoneSensorData.id,
          userId: phoneSensorData.userId,
          activityType: phoneSensorData.activityType,
          activityConfidence: phoneSensorData.activityConfidence,
          screenOn: phoneSensorData.screenOn,
          screenTimeSeconds: phoneSensorData.screenTimeSeconds,
          stepCount: phoneSensorData.stepCount,
          distanceMeters: phoneSensorData.distanceMeters,
          productivityLevel: phoneSensorData.productivityLevel,
          idleTimeSeconds: phoneSensorData.idleTimeSeconds,
          sessionId: phoneSensorData.sessionId,
          jobId: phoneSensorData.jobId,
          timestamp: phoneSensorData.timestamp,
          latitude: phoneSensorData.latitude,
          longitude: phoneSensorData.longitude,
          accuracy: phoneSensorData.accuracy,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName'),
          userEmail: users.email,
        })
        .from(phoneSensorData)
        .leftJoin(users, eq(phoneSensorData.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(phoneSensorData.timestamp))
        .limit(1000);

      // Start with all active users from sessions
      const userMetrics = new Map<number, any>();
      
      // Initialize all active users with their session data
      activeUsersMap.forEach((session, userId) => {
        userMetrics.set(userId, {
          userId: userId,
          userName: session.userName || 'Unknown',
          userEmail: session.userEmail || 'N/A',
          ipAddress: session.ipAddress || 'N/A',
          deviceType: session.deviceType || 'Unknown',
          userAgent: session.userAgent || 'Unknown',
          loginLatitude: session.loginLatitude || null,
          loginLongitude: session.loginLongitude || null,
          latestLatitude: null,
          latestLongitude: null,
          totalRecords: 0,
          activeTime: 0,
          idleTime: 0,
          screenTime: 0,
          totalSteps: 0,
          totalDistance: 0,
          activityBreakdown: {
            walking: 0,
            running: 0,
            sitting: 0,
            standing: 0,
            in_vehicle: 0,
            idle: 0,
          },
          productivityBreakdown: {
            high: 0,
            medium: 0,
            low: 0,
            idle: 0,
          },
        });
      });

      // Enhance with sensor data if available
      sensorRecords.forEach(record => {
        if (!userMetrics.has(record.userId)) {
          // User has sensor data but no active session - still show them
          userMetrics.set(record.userId, {
            userId: record.userId,
            userName: record.userName || 'Unknown',
            userEmail: record.userEmail || 'N/A',
            ipAddress: 'N/A',
            deviceType: 'Unknown',
            userAgent: 'Unknown',
            loginLatitude: null,
            loginLongitude: null,
            latestLatitude: null,
            latestLongitude: null,
            totalRecords: 0,
            activeTime: 0,
            idleTime: 0,
            screenTime: 0,
            totalSteps: 0,
            totalDistance: 0,
            activityBreakdown: {
              walking: 0,
              running: 0,
              sitting: 0,
              standing: 0,
              in_vehicle: 0,
              idle: 0,
            },
            productivityBreakdown: {
              high: 0,
              medium: 0,
              low: 0,
              idle: 0,
            },
          });
        }

        const metrics = userMetrics.get(record.userId)!;
        metrics.totalRecords++;
        
        // Update latest GPS coordinates from sensor data
        if (record.latitude && record.longitude && !metrics.latestLatitude) {
          metrics.latestLatitude = record.latitude;
          metrics.latestLongitude = record.longitude;
        }
        
        // Accumulate metrics
        if (record.productivityLevel !== 'idle' && record.productivityLevel !== 'low') {
          metrics.activeTime += 60; // assume 60s intervals
        }
        metrics.idleTime += record.idleTimeSeconds || 0;
        metrics.screenTime += record.screenTimeSeconds || 0;
        metrics.totalSteps += record.stepCount || 0;
        metrics.totalDistance += parseFloat(record.distanceMeters || '0');
        
        // Activity breakdown
        if (record.activityType && metrics.activityBreakdown[record.activityType] !== undefined) {
          metrics.activityBreakdown[record.activityType]++;
        }
        
        // Productivity breakdown
        if (record.productivityLevel && metrics.productivityBreakdown[record.productivityLevel] !== undefined) {
          metrics.productivityBreakdown[record.productivityLevel]++;
        }
      });

      // Convert map to array and calculate percentages
      const analytics = Array.from(userMetrics.values()).map(metrics => {
        const totalTime = metrics.activeTime + metrics.idleTime;
        return {
          ...metrics,
          productivityScore: totalTime > 0 ? Math.round((metrics.activeTime / totalTime) * 100) : 0,
          avgStepsPerDay: Math.round(metrics.totalSteps / 30), // assuming 30 day period
          avgDistancePerDay: Math.round(metrics.totalDistance / 30), // in meters
        };
      });

      console.log('📊 Pro Field Sense Analytics:', {
        totalActiveUsers: activeUsersMap.size,
        totalWithSensorData: sensorRecords.length,
        analyticsReturned: analytics.length,
        activeUsers: Array.from(activeUsersMap.values()).map(u => ({ 
          userId: u.userId, 
          userName: u.userName,
          email: u.userEmail,
          ip: u.ipAddress
        }))
      });

      res.json({ 
        success: true,
        analytics,
        dateRange: { start, end },
        totalRecords: sensorRecords.length,
      });
    } catch (error: any) {
      console.error("Error fetching productivity analytics:", error);
      res.status(500).json({ message: "Error fetching analytics: " + error.message });
    }
  });

  // GET /api/phone-sensors/activity - Get recent activity data
  app.get("/api/phone-sensors/activity", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const { userId, limit = 100 } = req.query;

      const conditions = [eq(phoneSensorData.organizationId, user.organizationId)];
      
      if (userId) {
        conditions.push(eq(phoneSensorData.userId, parseInt(userId as string)));
      }

      const activityData = await db
        .select({
          id: phoneSensorData.id,
          userId: phoneSensorData.userId,
          activityType: phoneSensorData.activityType,
          productivityLevel: phoneSensorData.productivityLevel,
          timestamp: phoneSensorData.timestamp,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName'),
        })
        .from(phoneSensorData)
        .leftJoin(users, eq(phoneSensorData.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(phoneSensorData.timestamp))
        .limit(parseInt(limit as string));

      res.json({ success: true, activity: activityData });
    } catch (error: any) {
      console.error("Error fetching activity data:", error);
      res.status(500).json({ message: "Error fetching activity: " + error.message });
    }
  });
}
