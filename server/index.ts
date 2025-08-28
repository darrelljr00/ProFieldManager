import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerTwilioAdminRoutes } from "./twilio-admin";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

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
  
  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // For debugging: Allow all origins temporarily and log unauthorized origins
    console.log('🚨 Unauthorized origin detected:', origin);
    res.header('Access-Control-Allow-Origin', origin); // Temporary fix for custom domain
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

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    setupMeetingCleanup();
  });
})();
