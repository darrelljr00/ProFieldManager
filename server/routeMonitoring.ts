import { db } from "./db";
import { 
  plannedRoutes, 
  routeDeviations, 
  routeStops,
  obdLocationData,
  obdTrips,
  vehicles,
  users,
  projects
} from "@shared/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";
import { NotificationService } from "./notificationService";

interface RouteMonitoringConfig {
  deviationThresholdMeters: number; // How far off route before alerting
  stopThresholdMinutes: number; // How long stopped before alerting
  updateIntervalSeconds: number; // How often to check GPS positions
}

const DEFAULT_CONFIG: RouteMonitoringConfig = {
  deviationThresholdMeters: 500, // 500 meters (about 1/3 mile)
  stopThresholdMinutes: 15, // 15 minutes
  updateIntervalSeconds: 60, // Check every minute
};

export class RouteMonitoringService {
  private config: RouteMonitoringConfig;
  private monitoringIntervals: Map<number, NodeJS.Timeout> = new Map();
  
  constructor(config?: Partial<RouteMonitoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring a route using OneStep GPS data
   */
  async startMonitoring(routeId: number, organizationId: number): Promise<void> {
    // Get route details
    const [route] = await db
      .select()
      .from(plannedRoutes)
      .where(and(
        eq(plannedRoutes.id, routeId),
        eq(plannedRoutes.organizationId, organizationId)
      ));

    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }
    
    if (!route.oneStepDeviceId) {
      throw new Error(`Route ${routeId} has no OneStep GPS device ID configured`);
    }
    
    if (route.status === 'completed' || route.status === 'cancelled') {
      throw new Error(`Route ${routeId} is already ${route.status}`);
    }

    // Update route status to in_progress
    await db.update(plannedRoutes)
      .set({ 
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plannedRoutes.id, routeId));
    
    await db.update(plannedRoutes)
      .set({ status: 'in_progress' })
      .where(eq(plannedRoutes.id, routeId));

    // Start monitoring interval
    const interval = setInterval(async () => {
      await this.checkRouteProgress(routeId, organizationId);
    }, this.config.updateIntervalSeconds * 1000);

    this.monitoringIntervals.set(routeId, interval);
    
    console.log(`Started monitoring route ${routeId} with device ${route.oneStepDeviceId}`);
  }

  /**
   * Stop monitoring a route
   */
  async stopMonitoring(routeId: number, organizationId: number): Promise<void> {
    const interval = this.monitoringIntervals.get(routeId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(routeId);
    }

    // Update route status to completed and calculate final metrics
    await this.completeRoute(routeId, organizationId);
    
    console.log(`Stopped monitoring route ${routeId}`);
  }

  /**
   * Check current GPS position against planned route
   */
  private async checkRouteProgress(routeId: number, organizationId: number): Promise<void> {
    try {
      // Get route details
      const [route] = await db
        .select()
        .from(plannedRoutes)
        .where(and(
          eq(plannedRoutes.id, routeId),
          eq(plannedRoutes.organizationId, organizationId)
        ));

      if (!route || route.status !== 'in_progress') {
        this.stopMonitoring(routeId, organizationId);
        return;
      }

      // Get latest GPS position from OneStep GPS (OBD location data)
      const latestPositions = await db
        .select()
        .from(obdLocationData)
        .where(and(
          eq(obdLocationData.organizationId, organizationId),
          eq(obdLocationData.deviceId, route.oneStepDeviceId || '')
        ))
        .orderBy(sql`${obdLocationData.timestamp} DESC`)
        .limit(5);

      if (latestPositions.length === 0) {
        return; // No GPS data yet
      }

      const currentPosition = latestPositions[0];
      
      // Check if vehicle is stopped (speed near zero for multiple readings)
      const avgSpeed = latestPositions.reduce((sum, pos) => 
        sum + parseFloat(pos.speed || '0'), 0) / latestPositions.length;
      
      if (avgSpeed < 1) { // Less than 1 mph = stopped
        await this.handleVehicleStop(routeId, organizationId, currentPosition);
      }

      // Check for route deviation
      const distanceFromRoute = this.calculateDistanceFromPlannedRoute(
        parseFloat(currentPosition.latitude || '0'),
        parseFloat(currentPosition.longitude || '0'),
        route
      );

      if (distanceFromRoute > this.config.deviationThresholdMeters) {
        await this.handleRouteDeviation(routeId, organizationId, currentPosition, distanceFromRoute);
      }

    } catch (error) {
      console.error(`Error checking route ${routeId} progress:`, error);
    }
  }

  /**
   * Calculate distance from current position to planned route
   * Returns minimum distance to any point on the route (origin -> destination line)
   */
  private calculateDistanceFromPlannedRoute(
    currentLat: number,
    currentLng: number,
    route: any
  ): number {
    const originLat = parseFloat(route.originLat);
    const originLng = parseFloat(route.originLng);
    const destLat = parseFloat(route.destinationLat);
    const destLng = parseFloat(route.destinationLng);
    
    // Calculate distance to origin
    const distToOrigin = this.haversineDistance(currentLat, currentLng, originLat, originLng);
    
    // Calculate distance to destination
    const distToDest = this.haversineDistance(currentLat, currentLng, destLat, destLng);
    
    // Calculate perpendicular distance to the line segment
    // This is a simplified approach - in production, use route waypoints/polyline
    const perpDistance = this.perpendicularDistanceToLine(
      currentLat, currentLng,
      originLat, originLng,
      destLat, destLng
    );
    
    // Return minimum of: distance to origin, distance to dest, perpendicular distance
    return Math.min(distToOrigin, distToDest, perpDistance);
  }
  
  /**
   * Calculate perpendicular distance from point to line segment
   */
  private perpendicularDistanceToLine(
    pointLat: number, pointLng: number,
    line1Lat: number, line1Lng: number,
    line2Lat: number, line2Lng: number
  ): number {
    // Convert to meters using approximate conversion
    const toMeters = 111139; // 1 degree latitude ≈ 111.139 km
    
    const px = pointLng * toMeters * Math.cos(pointLat * Math.PI / 180);
    const py = pointLat * toMeters;
    const l1x = line1Lng * toMeters * Math.cos(line1Lat * Math.PI / 180);
    const l1y = line1Lat * toMeters;
    const l2x = line2Lng * toMeters * Math.cos(line2Lat * Math.PI / 180);
    const l2y = line2Lat * toMeters;
    
    // Calculate perpendicular distance using cross product
    const dx = l2x - l1x;
    const dy = l2y - l1y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    
    if (lineLength === 0) {
      // Line has zero length, return distance to point
      return Math.sqrt((px - l1x) ** 2 + (py - l1y) ** 2);
    }
    
    const perpDist = Math.abs(dx * (l1y - py) - (l1x - px) * dy) / lineLength;
    return perpDist;
  }

  /**
   * Haversine distance formula (returns meters)
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Handle vehicle stop detection
   */
  private async handleVehicleStop(
    routeId: number,
    organizationId: number,
    position: any
  ): Promise<void> {
    // Check if there's already an active stop
    const existingStops = await db
      .select()
      .from(routeStops)
      .where(and(
        eq(routeStops.routeId, routeId),
        isNull(routeStops.endedAt)
      ));

    if (existingStops.length > 0) {
      // Update existing stop duration
      const stop = existingStops[0];
      const durationMinutes = Math.floor(
        (new Date().getTime() - new Date(stop.startedAt).getTime()) / 60000
      );

      // Duration is calculated, can't be updated directly

      // Send notification if stop exceeds threshold and not already notified
      if (durationMinutes >= this.config.stopThresholdMinutes && !stop.notificationSent) {
        await this.sendStopNotification(routeId, organizationId, durationMinutes);
        
        // Mark notification as sent to prevent spam
        await db.execute(sql`
          UPDATE route_stops 
          SET notification_sent = true, notified_at = NOW()
          WHERE id = ${stop.id}
        `);
      }
    } else {
      // Create new stop record
      const [route] = await db.select().from(plannedRoutes).where(eq(plannedRoutes.id, routeId));
      
      await db.insert(routeStops).values({
        routeId,
        organizationId,
        userId: route.userId,
        stopType: 'unplanned',
        latitude: position.latitude,
        longitude: position.longitude,
        address: position.address,
        startedAt: new Date(),
      });
    }
  }

  /**
   * Handle route deviation detection
   */
  private async handleRouteDeviation(
    routeId: number,
    organizationId: number,
    position: any,
    distanceFromRoute: number
  ): Promise<void> {
    // Check if deviation already logged recently
    const recentDeviations = await db
      .select()
      .from(routeDeviations)
      .where(and(
        eq(routeDeviations.routeId, routeId),
        gte(routeDeviations.detectedAt, new Date(Date.now() - 5 * 60000)) // Last 5 minutes
      ));

    if (recentDeviations.length > 0) {
      return; // Don't spam notifications
    }

    const [route] = await db.select().from(plannedRoutes).where(eq(plannedRoutes.id, routeId));

    // Log deviation
    await db.insert(routeDeviations).values({
      routeId,
      organizationId,
      userId: route.userId,
      deviationType: 'off_route',
      latitude: position.latitude,
      longitude: position.longitude,
      address: position.address,
      distanceFromRoute: distanceFromRoute.toFixed(2),
      detectedAt: new Date(),
    });

    // Send notification
    await this.sendDeviationNotification(routeId, organizationId, distanceFromRoute);
  }

  /**
   * Complete route and calculate final metrics
   */
  private async completeRoute(routeId: number, organizationId: number): Promise<void> {
    const [route] = await db
      .select({
        route: plannedRoutes,
        vehicle: vehicles,
        user: users,
      })
      .from(plannedRoutes)
      .leftJoin(vehicles, eq(plannedRoutes.vehicleId, vehicles.id))
      .leftJoin(users, eq(plannedRoutes.userId, users.id))
      .where(and(
        eq(plannedRoutes.id, routeId),
        eq(plannedRoutes.organizationId, organizationId)
      ));

    if (!route || !route.route.startedAt) {
      return;
    }

    // Find matching OBD trip
    const matchingTrips = await db
      .select()
      .from(obdTrips)
      .where(and(
        eq(obdTrips.organizationId, organizationId),
        eq(obdTrips.vehicleId, route.route.vehicleId || 0),
        gte(obdTrips.startTime, route.route.startedAt),
        lte(obdTrips.startTime, new Date(route.route.startedAt.getTime() + 30 * 60000)) // Within 30 min
      ))
      .orderBy(obdTrips.startTime)
      .limit(1);

    let actualDistance = 0;
    let actualDuration = 0;
    let actualFuelCost = 0;
    let actualFuelUsage = 0;
    let actualLaborCost = 0;

    if (matchingTrips.length > 0) {
      const trip = matchingTrips[0];
      actualDistance = parseFloat(trip.distanceMiles || '0') * 1609.34; // Miles to meters
      
      if (trip.endTime) {
        actualDuration = Math.floor(
          (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 1000
        ); // seconds
      }
    } else {
      // Calculate from start/end times
      const endTime = new Date();
      actualDuration = Math.floor(
        (endTime.getTime() - route.route.startedAt.getTime()) / 1000
      );
    }

    // Calculate fuel costs using vehicle MPG (or default 15 MPG)
    const vehicleMpg = parseFloat(route.vehicle?.fuelEconomyMpg || '15');
    const distanceInMiles = actualDistance / 1609.34;
    actualFuelUsage = distanceInMiles / vehicleMpg;
    actualFuelCost = actualFuelUsage * 2.50; // $2.50/gallon

    // Calculate labor costs using technician hourly rate
    const hourlyRate = parseFloat(route.user?.hourlyRate || '0');
    const hours = actualDuration / 3600;
    actualLaborCost = hours * hourlyRate;

    // Update route with actual metrics
    await db.update(plannedRoutes)
      .set({
        completedAt: new Date(),
        actualDistance: actualDistance.toFixed(2),
        actualDuration,
        actualFuelCost: actualFuelCost.toFixed(2),
        actualFuelUsage: actualFuelUsage.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(plannedRoutes.id, routeId));
    
    await db.update(plannedRoutes)
      .set({ status: 'completed' })
      .where(eq(plannedRoutes.id, routeId));

    console.log(`Route ${routeId} completed with actual metrics:`, {
      distance: actualDistance,
      duration: actualDuration,
      fuelCost: actualFuelCost,
      laborCost: actualLaborCost,
    });
  }

  /**
   * Send deviation notification to managers/admins
   */
  private async sendDeviationNotification(
    routeId: number,
    organizationId: number,
    distanceMeters: number
  ): Promise<void> {
    const [routeData] = await db
      .select({
        route: plannedRoutes,
        user: users,
        project: projects,
      })
      .from(plannedRoutes)
      .leftJoin(users, eq(plannedRoutes.userId, users.id))
      .leftJoin(projects, eq(plannedRoutes.jobId, projects.id))
      .where(eq(plannedRoutes.id, routeId));

    if (!routeData) return;

    const distanceMiles = (distanceMeters / 1609.34).toFixed(2);
    const message = `${routeData.user?.firstName} ${routeData.user?.lastName} has deviated ${distanceMiles} miles from planned route${routeData.project ? ` for job: ${routeData.project.jobName}` : ''}`;

    await NotificationService.createNotification({
      organizationId,
      type: 'route_deviation',
      title: 'Route Deviation Alert',
      message,
      relatedEntityType: 'route',
      relatedEntityId: routeId,
      userId: routeData.route.userId,
    });
  }

  /**
   * Send stop notification to managers/admins
   */
  private async sendStopNotification(
    routeId: number,
    organizationId: number,
    durationMinutes: number
  ): Promise<void> {
    const [routeData] = await db
      .select({
        route: plannedRoutes,
        user: users,
        project: projects,
      })
      .from(plannedRoutes)
      .leftJoin(users, eq(plannedRoutes.userId, users.id))
      .leftJoin(projects, eq(plannedRoutes.jobId, projects.id))
      .where(eq(plannedRoutes.id, routeId));

    if (!routeData) return;

    const message = `${routeData.user?.firstName} ${routeData.user?.lastName} has been stopped for ${durationMinutes} minutes${routeData.project ? ` while traveling to: ${routeData.project.jobName}` : ''}`;

    await NotificationService.createNotification({
      organizationId,
      type: 'route_stop',
      title: 'Extended Stop Alert',
      message,
      relatedEntityType: 'route',
      relatedEntityId: routeId,
      userId: routeData.route.userId,
    });
  }

  /**
   * Get active monitored routes
   */
  getActiveRoutes(): number[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  /**
   * Stop all monitoring (cleanup on server shutdown)
   */
  stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals.clear();
    console.log('Stopped all route monitoring');
  }
}

// Export singleton instance
export const routeMonitoringService = new RouteMonitoringService();
