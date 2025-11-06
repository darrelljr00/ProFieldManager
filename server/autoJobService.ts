import { db } from "./db";
import { projects, users, obdLocationData } from "@shared/schema";
import { eq, and, isNull, isNotNull, lt, gte, sql } from "drizzle-orm";
import { NotificationService } from "./notificationService";
import { haversineDistance } from "./utils/gps";

const AUTO_START_DELAY_MINUTES = 10;
const AUTO_COMPLETE_DELAY_MINUTES = 10;
const PROXIMITY_THRESHOLD_METERS = 100;
const CHECK_INTERVAL_SECONDS = 60;

export class AutoJobService {
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  start(): void {
    if (this.checkInterval) {
      console.log("AutoJobService already running");
      return;
    }

    console.log("⚠️ AutoJobService: TEMPORARILY DISABLED until database schema is fully migrated");
    console.log("⚠️ Required columns: departed_at, auto_started_at, auto_completed_at, assigned_user_id");
    
    // TEMPORARILY DISABLED - uncomment after running db:push --force
    // console.log("Starting AutoJobService...");
    // this.checkInterval = setInterval(() => {
    //   this.checkJobsForAutoActions();
    // }, CHECK_INTERVAL_SECONDS * 1000);
    // this.checkJobsForAutoActions();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("AutoJobService stopped");
    }
  }

  private async checkJobsForAutoActions(): Promise<void> {
    try {
      await this.checkAutoStart();
      await this.checkAutoComplete();
    } catch (error) {
      console.error("Error in AutoJobService check:", error);
    }
  }

  private async checkAutoStart(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - AUTO_START_DELAY_MINUTES * 60 * 1000);

    const jobsToAutoStart = await db
      .select({
        id: projects.id,
        name: projects.name,
        jobNumber: projects.jobNumber,
        arrivedAt: projects.arrivedAt,
        organizationId: projects.organizationId,
        assignedUserId: projects.assignedUserId,
        vehicleId: projects.vehicleId,
        address: projects.address,
        startDate: projects.startDate,
      })
      .from(projects)
      .where(and(
        isNotNull(projects.arrivedAt),
        isNull(projects.autoStartedAt),
        isNull(projects.startDate),
        sql`${projects.status} != 'in_progress'`,
        sql`${projects.status} != 'completed'`,
        lt(projects.arrivedAt, tenMinutesAgo),
        isNotNull(projects.vehicleId)
      ));

    for (const job of jobsToAutoStart) {
      await this.autoStartJob(job);
    }
  }

  private async checkAutoComplete(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - AUTO_COMPLETE_DELAY_MINUTES * 60 * 1000);

    const jobsToAutoComplete = await db
      .select({
        id: projects.id,
        name: projects.name,
        jobNumber: projects.jobNumber,
        departedAt: projects.departedAt,
        organizationId: projects.organizationId,
        assignedUserId: projects.assignedUserId,
        vehicleId: projects.vehicleId,
        address: projects.address,
      })
      .from(projects)
      .where(and(
        isNotNull(projects.departedAt),
        isNull(projects.autoCompletedAt),
        eq(projects.status, 'in_progress'),
        lt(projects.departedAt, tenMinutesAgo)
      ));

    for (const job of jobsToAutoComplete) {
      await this.autoCompleteJob(job);
    }
  }

  private async autoStartJob(job: any): Promise<void> {
    try {
      const now = new Date();

      await db.update(projects)
        .set({
          status: 'in-progress',
          autoStartedAt: now,
          startDate: now,
          updatedAt: now,
        })
        .where(eq(projects.id, job.id));

      let technicianName = "Unknown";
      if (job.assignedUserId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, job.assignedUserId));
        if (user) {
          technicianName = `${user.firstName} ${user.lastName}`;
        }
      }

      await this.notificationService.sendNotification({
        organizationId: job.organizationId,
        userId: null,
        type: 'job_auto_started',
        title: 'Job Auto-Started',
        message: `Job "${job.name}" (${job.jobNumber || 'N/A'}) was automatically started after ${AUTO_START_DELAY_MINUTES} minutes at location. Technician: ${technicianName}`,
        data: {
          jobId: job.id,
          jobName: job.name,
          technicianName,
          autoStartedAt: now.toISOString(),
        },
        priority: 'high',
      });

      console.log(`✅ Auto-started job ${job.id} (${job.name}) for technician ${technicianName}`);
    } catch (error) {
      console.error(`❌ Error auto-starting job ${job.id}:`, error);
    }
  }

  private async autoCompleteJob(job: any): Promise<void> {
    try {
      const now = new Date();

      await db.update(projects)
        .set({
          status: 'completed',
          autoCompletedAt: now,
          endDate: now,
          progress: 100,
          updatedAt: now,
        })
        .where(eq(projects.id, job.id));

      let technicianName = "Unknown";
      if (job.assignedUserId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, job.assignedUserId));
        if (user) {
          technicianName = `${user.firstName} ${user.lastName}`;
        }
      }

      await this.notificationService.sendNotification({
        organizationId: job.organizationId,
        userId: null,
        type: 'job_auto_completed',
        title: 'Job Auto-Completed',
        message: `Job "${job.name}" (${job.jobNumber || 'N/A'}) was automatically completed after ${AUTO_COMPLETE_DELAY_MINUTES} minutes of departure. Technician: ${technicianName}`,
        data: {
          jobId: job.id,
          jobName: job.name,
          technicianName,
          autoCompletedAt: now.toISOString(),
        },
        priority: 'high',
      });

      console.log(`✅ Auto-completed job ${job.id} (${job.name}) for technician ${technicianName}`);
    } catch (error) {
      console.error(`❌ Error auto-completing job ${job.id}:`, error);
    }
  }

  async checkVehicleDeparture(vehicleId: string, organizationId: number): Promise<void> {
    try {
      const activeJobs = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.vehicleId, vehicleId),
          eq(projects.organizationId, organizationId),
          eq(projects.status, 'in_progress'),
          isNotNull(projects.arrivedAt),
          isNull(projects.departedAt)
        ));

      if (activeJobs.length === 0) return;

      const latestLocation = await db
        .select()
        .from(obdLocationData)
        .where(and(
          eq(obdLocationData.deviceId, vehicleId),
          eq(obdLocationData.organizationId, organizationId)
        ))
        .orderBy(sql`${obdLocationData.timestamp} DESC`)
        .limit(1);

      if (latestLocation.length === 0) return;

      const vehicleLat = parseFloat(latestLocation[0].latitude);
      const vehicleLng = parseFloat(latestLocation[0].longitude);

      for (const job of activeJobs) {
        if (!job.address) continue;

        const jobCoords = await this.getJobCoordinates(job);
        if (!jobCoords) continue;

        const distance = haversineDistance(
          vehicleLat,
          vehicleLng,
          jobCoords.lat,
          jobCoords.lng
        );

        if (distance > PROXIMITY_THRESHOLD_METERS && !job.departedAt) {
          await db.update(projects)
            .set({
              departedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(projects.id, job.id));

          console.log(`Marked job ${job.id} as departed (distance: ${distance.toFixed(0)}m)`);
        }
      }
    } catch (error) {
      console.error("Error checking vehicle departure:", error);
    }
  }

  private async getJobCoordinates(job: any): Promise<{ lat: number; lng: number } | null> {
    try {
      if (!job.address) return null;

      const fullAddress = `${job.address}${job.city ? ', ' + job.city : ''}${job.state ? ', ' + job.state : ''}${job.zipCode ? ' ' + job.zipCode : ''}`;
      
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        };
      }

      return null;
    } catch (error) {
      console.error("Error geocoding job address:", error);
      return null;
    }
  }
}

let autoJobServiceInstance: AutoJobService | null = null;

export function getAutoJobService(): AutoJobService {
  if (!autoJobServiceInstance) {
    autoJobServiceInstance = new AutoJobService();
  }
  return autoJobServiceInstance;
}
