import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  analyticsPageViews, 
  analyticsVisitorSessions, 
  analyticsSettings,
  insertAnalyticsPageViewSchema,
  insertAnalyticsSettingsSchema
} from "@shared/schema";
import { eq, and, desc, sql, gte, count } from "drizzle-orm";
import { requireAuth } from "../auth";

const router = Router();

// Platform organization ID for profieldmanager.com analytics
const PLATFORM_ORG_ID = 4;

// Track page view (public endpoint for tracking script)
router.post("/track-pageview", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data.organizationId || !data.pagePath || !data.visitorId || !data.sessionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get client IP (for location detection later)
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                      req.socket.remoteAddress || 
                      'unknown';

    // Insert page view
    await db.insert(analyticsPageViews).values({
      organizationId: data.organizationId,
      pagePath: data.pagePath,
      pageTitle: data.pageTitle,
      referrer: data.referrer,
      visitorId: data.visitorId,
      sessionId: data.sessionId,
      userAgent: data.userAgent,
      ipAddress: ipAddress,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
      utmSource: data.source,
      utmMedium: data.medium,
      utmCampaign: data.campaign,
      utmTerm: data.term,
      utmContent: data.content,
      timeOnPage: data.timeOnPage || 0,
    });

    // Update or create visitor session
    const existingSession = await db.query.analyticsVisitorSessions.findFirst({
      where: eq(analyticsVisitorSessions.sessionId, data.sessionId),
    });

    if (existingSession) {
      await db.update(analyticsVisitorSessions)
        .set({
          lastActivityAt: new Date(),
          exitPage: data.pagePath,
          pageViewCount: sql`${analyticsVisitorSessions.pageViewCount} + 1`,
          totalDuration: sql`${analyticsVisitorSessions.totalDuration} + ${data.timeOnPage || 0}`,
          updatedAt: new Date(),
        })
        .where(eq(analyticsVisitorSessions.sessionId, data.sessionId));
    } else {
      await db.insert(analyticsVisitorSessions).values({
        organizationId: data.organizationId,
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        landingPage: data.pagePath,
        userAgent: data.userAgent,
        ipAddress: ipAddress,
        deviceType: data.deviceType,
        browser: data.browser,
        os: data.os,
        utmSource: data.source,
        utmMedium: data.medium,
        utmCampaign: data.campaign,
        pageViewCount: 1,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking page view:", error);
    res.status(500).json({ error: "Failed to track page view" });
  }
});

// Get analytics settings
router.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await db.query.analyticsSettings.findFirst({
      where: eq(analyticsSettings.organizationId, user.organizationId),
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        enableInternalTracking: true,
        trackPageViews: true,
        trackVisitorSessions: true,
        enableGoogleAnalytics: false,
        googleAnalyticsMeasurementId: null,
        enableFacebookPixel: false,
        facebookPixelId: null,
        anonymizeIp: true,
        respectDoNotTrack: true,
        cookieConsentRequired: false,
        dataRetentionDays: 365,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching analytics settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update analytics settings
router.post("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = req.body;

    const existing = await db.query.analyticsSettings.findFirst({
      where: eq(analyticsSettings.organizationId, user.organizationId),
    });

    if (existing) {
      await db.update(analyticsSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(analyticsSettings.organizationId, user.organizationId));
    } else {
      await db.insert(analyticsSettings).values({
        organizationId: user.organizationId,
        ...data,
      });
    }

    const updated = await db.query.analyticsSettings.findFirst({
      where: eq(analyticsSettings.organizationId, user.organizationId),
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating analytics settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get current active visitors
router.get("/current-visitors", requireAuth, async (req: Request, res: Response) => {
  try {
    // Consider sessions active if last activity was within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeSessions = await db
      .select({
        sessionId: analyticsVisitorSessions.sessionId,
        visitorId: analyticsVisitorSessions.visitorId,
        landingPage: analyticsVisitorSessions.landingPage,
        exitPage: analyticsVisitorSessions.exitPage,
        deviceType: analyticsVisitorSessions.deviceType,
        browser: analyticsVisitorSessions.browser,
        os: analyticsVisitorSessions.os,
        country: analyticsVisitorSessions.country,
        city: analyticsVisitorSessions.city,
        pageViewCount: analyticsVisitorSessions.pageViewCount,
        startTime: analyticsVisitorSessions.startTime,
        lastActivityAt: analyticsVisitorSessions.lastActivityAt,
        utmSource: analyticsVisitorSessions.utmSource,
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.lastActivityAt, fiveMinutesAgo)
        )
      )
      .orderBy(desc(analyticsVisitorSessions.lastActivityAt))
      .limit(100);

    res.json({
      activeCount: activeSessions.length,
      visitors: activeSessions,
    });
  } catch (error) {
    console.error("Error fetching current visitors:", error);
    res.status(500).json({ error: "Failed to fetch current visitors" });
  }
});

// Get traffic overview stats
router.get("/traffic-overview", requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || '7d';
    
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get page view count
    const pageViewResult = await db
      .select({ count: count() })
      .from(analyticsPageViews)
      .where(
        and(
          eq(analyticsPageViews.organizationId, PLATFORM_ORG_ID),
          gte(analyticsPageViews.createdAt, startDate)
        )
      );

    // Get unique visitors count
    const visitorsResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${analyticsPageViews.visitorId})` })
      .from(analyticsPageViews)
      .where(
        and(
          eq(analyticsPageViews.organizationId, PLATFORM_ORG_ID),
          gte(analyticsPageViews.createdAt, startDate)
        )
      );

    // Get session count
    const sessionsResult = await db
      .select({ count: count() })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      );

    // Get average session duration
    const avgDurationResult = await db
      .select({ 
        avg: sql<number>`COALESCE(AVG(${analyticsVisitorSessions.totalDuration}), 0)` 
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      );

    // Get bounce rate (sessions with only 1 page view)
    const bounceResult = await db
      .select({ 
        bounced: sql<number>`COUNT(CASE WHEN ${analyticsVisitorSessions.pageViewCount} = 1 THEN 1 END)`,
        total: count()
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      );

    const totalSessions = bounceResult[0]?.total || 0;
    const bouncedSessions = bounceResult[0]?.bounced || 0;
    const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

    res.json({
      pageViews: pageViewResult[0]?.count || 0,
      uniqueVisitors: Number(visitorsResult[0]?.count) || 0,
      sessions: sessionsResult[0]?.count || 0,
      avgSessionDuration: Math.round(Number(avgDurationResult[0]?.avg) || 0),
      bounceRate: Math.round(bounceRate * 10) / 10,
      period,
    });
  } catch (error) {
    console.error("Error fetching traffic overview:", error);
    res.status(500).json({ error: "Failed to fetch traffic overview" });
  }
});

// Get top pages
router.get("/top-pages", requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || '7d';
    const limit = parseInt(req.query.limit as string) || 10;
    
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const topPages = await db
      .select({
        pagePath: analyticsPageViews.pagePath,
        pageTitle: analyticsPageViews.pageTitle,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsPageViews.visitorId})`,
        avgTimeOnPage: sql<number>`COALESCE(AVG(${analyticsPageViews.timeOnPage}), 0)`,
      })
      .from(analyticsPageViews)
      .where(
        and(
          eq(analyticsPageViews.organizationId, PLATFORM_ORG_ID),
          gte(analyticsPageViews.createdAt, startDate)
        )
      )
      .groupBy(analyticsPageViews.pagePath, analyticsPageViews.pageTitle)
      .orderBy(desc(count()))
      .limit(limit);

    res.json(topPages);
  } catch (error) {
    console.error("Error fetching top pages:", error);
    res.status(500).json({ error: "Failed to fetch top pages" });
  }
});

// Get traffic sources
router.get("/traffic-sources", requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || '7d';
    
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const sources = await db
      .select({
        source: sql<string>`COALESCE(${analyticsVisitorSessions.utmSource}, 'Direct')`,
        sessions: count(),
        visitors: sql<number>`COUNT(DISTINCT ${analyticsVisitorSessions.visitorId})`,
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      )
      .groupBy(analyticsVisitorSessions.utmSource)
      .orderBy(desc(count()))
      .limit(10);

    res.json(sources);
  } catch (error) {
    console.error("Error fetching traffic sources:", error);
    res.status(500).json({ error: "Failed to fetch traffic sources" });
  }
});

// Get device breakdown
router.get("/device-breakdown", requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || '7d';
    
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const devices = await db
      .select({
        deviceType: sql<string>`COALESCE(${analyticsVisitorSessions.deviceType}, 'Unknown')`,
        count: count(),
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      )
      .groupBy(analyticsVisitorSessions.deviceType)
      .orderBy(desc(count()));

    const browsers = await db
      .select({
        browser: sql<string>`COALESCE(${analyticsVisitorSessions.browser}, 'Unknown')`,
        count: count(),
      })
      .from(analyticsVisitorSessions)
      .where(
        and(
          eq(analyticsVisitorSessions.organizationId, PLATFORM_ORG_ID),
          gte(analyticsVisitorSessions.startTime, startDate)
        )
      )
      .groupBy(analyticsVisitorSessions.browser)
      .orderBy(desc(count()))
      .limit(10);

    res.json({ devices, browsers });
  } catch (error) {
    console.error("Error fetching device breakdown:", error);
    res.status(500).json({ error: "Failed to fetch device breakdown" });
  }
});

// Get page views over time (for charts)
router.get("/pageviews-timeline", requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || '7d';
    
    let startDate: Date;
    let interval: string;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        interval = 'hour';
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
    }

    const timeline = await db
      .select({
        date: sql<string>`DATE_TRUNC('${sql.raw(interval)}', ${analyticsPageViews.createdAt})`,
        pageViews: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${analyticsPageViews.visitorId})`,
      })
      .from(analyticsPageViews)
      .where(
        and(
          eq(analyticsPageViews.organizationId, PLATFORM_ORG_ID),
          gte(analyticsPageViews.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE_TRUNC('${sql.raw(interval)}', ${analyticsPageViews.createdAt})`)
      .orderBy(sql`DATE_TRUNC('${sql.raw(interval)}', ${analyticsPageViews.createdAt})`);

    res.json(timeline);
  } catch (error) {
    console.error("Error fetching pageviews timeline:", error);
    res.status(500).json({ error: "Failed to fetch pageviews timeline" });
  }
});

export default router;
