import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerTwilioAdminRoutes } from "./twilio-admin";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

// Enable trust proxy for Replit infrastructure
app.set('trust proxy', 1);

// Disable ETags to prevent 304 caching issues with live GPS data
app.set('etag', false);

// CORS configuration to support custom domain profieldmanager.com
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests from both Replit domain and custom domain
  const allowedOrigins = [
    'https://profieldmanager.com',
    'https://www.profieldmanager.com',
    /^https:\/\/.*\.replit\.dev$/,
    /^https:\/\/.*\.repl\.co$/
  ];
  
  // Check if origin matches allowed patterns
  const isAllowedOrigin = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    } else {
      return allowed.test(origin || '');
    }
  });
  
  if (isAllowedOrigin || !origin) {
    // Always allow requests from allowed origins or same-origin requests
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // For debugging: Log unauthorized origins but still allow (for development)
    console.log('🚨 Unauthorized origin detected:', origin);
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// FORCE remove ETags AND If-None-Match to prevent 304 caching
app.use((req, res, next) => {
  // Remove If-None-Match header to prevent Express from returning 304
  delete req.headers['if-none-match'];
  
  // Override setHeader to block ETags
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: any) {
    if (name.toLowerCase() === 'etag') {
      return res; // Block ETag headers
    }
    return originalSetHeader(name, value);
  };
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register clean Twilio admin routes FIRST to override broken ones
  registerTwilioAdminRoutes(app);
  
  const server = await registerRoutes(app);



  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment port for production deployment or default to 5000
  // this serves both the API and the client.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  // Setup automatic meeting cleanup scheduler
  const setupMeetingCleanup = () => {
    const cleanupExpiredMeetings = async () => {
      try {
        const deletedCount = await storage.cleanupExpiredMeetings();
        if (deletedCount > 0) {
          log(`🧹 Automatically cleaned up ${deletedCount} expired meetings`);
        }
      } catch (error) {
        console.error('❌ Error during automatic meeting cleanup:', error);
      }
    };

    // Run cleanup every 24 hours (24 * 60 * 60 * 1000 = 86400000ms)
    const cleanupInterval = 24 * 60 * 60 * 1000;
    
    // Run initial cleanup after 5 minutes to avoid server startup conflicts
    setTimeout(cleanupExpiredMeetings, 5 * 60 * 1000);
    
    // Then run every 24 hours
    setInterval(cleanupExpiredMeetings, cleanupInterval);
    
    log('📅 Meeting cleanup scheduler initialized - runs every 24 hours');
  };

  // Setup automatic job time exceeded checker
  const setupJobTimeChecker = () => {
    const checkJobsExceededTime = async () => {
      try {
        const { db } = await import("./db");
        const { projects, users, notifications } = await import("../shared/schema");
        const { eq, and, isNotNull, inArray } = await import("drizzle-orm");

        // Get all in-progress jobs with start dates and estimated durations
        const inProgressJobs = await db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.status, 'in-progress'),
              isNotNull(projects.startDate),
              isNotNull(projects.estimatedDuration)
            )
          );

        const { NotificationService } = await import("./notificationService");

        for (const job of inProgressJobs) {
          if (!job.startDate || !job.estimatedDuration) continue;

          const startTime = new Date(job.startDate).getTime();
          const currentTime = Date.now();
          const elapsedMinutes = (currentTime - startTime) / (1000 * 60);

          // Check if job has exceeded estimated time
          if (elapsedMinutes > job.estimatedDuration) {
            // Check if we've already sent this notification in the last 2 hours
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const [recentNotification] = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.type, 'job_exceeded_time'),
                  eq(notifications.relatedEntityId, job.id),
                  isNotNull(notifications.createdAt)
                )
              )
              .orderBy(notifications.createdAt)
              .limit(1);

            const shouldNotify = !recentNotification || 
                               (recentNotification.createdAt && 
                                new Date(recentNotification.createdAt) < twoHoursAgo);

            if (shouldNotify) {
              // Get admin/manager users
              const adminUsers = await db
                .select()
                .from(users)
                .where(
                  and(
                    eq(users.organizationId, job.organizationId),
                    inArray(users.role, ['admin', 'manager']),
                    eq(users.isActive, true)
                  )
                );

              const exceededBy = Math.round(elapsedMinutes - job.estimatedDuration);

              for (const admin of adminUsers) {
                await NotificationService.createNotification({
                  type: 'job_exceeded_time',
                  title: 'Job Exceeded Estimated Time',
                  message: `Job "${job.name}" has exceeded its estimated time by ${exceededBy} minutes`,
                  userId: admin.id,
                  organizationId: job.organizationId,
                  relatedEntityType: 'project',
                  relatedEntityId: job.id,
                  priority: 'high',
                  category: 'team_based',
                  createdBy: job.assignedUserId || undefined
                });
              }

              log(`⏰ Time exceeded notification sent for job ${job.name} to ${adminUsers.length} admins/managers`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking jobs for time exceeded:', error);
      }
    };

    // Check every 15 minutes (15 * 60 * 1000 = 900000ms)
    const checkInterval = 15 * 60 * 1000;
    
    // Run initial check after 2 minutes
    setTimeout(checkJobsExceededTime, 2 * 60 * 1000);
    
    // Then run every 15 minutes
    setInterval(checkJobsExceededTime, checkInterval);
    
    log('⏰ Job time exceeded checker initialized - runs every 15 minutes');
  };

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    setupMeetingCleanup();
    setupJobTimeChecker();
  });
})();
