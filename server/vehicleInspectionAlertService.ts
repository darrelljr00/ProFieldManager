import { db } from "./db";
import { 
  timeClock, 
  inspectionRecords, 
  vehicleInspectionAlertSettings, 
  vehicleInspectionAlerts,
  users,
  organizations
} from "@shared/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";
import { NotificationService } from "./notificationService";

export class VehicleInspectionAlertService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static checkIntervalMs = 60000; // Check every 1 minute

  static start() {
    if (this.isRunning) {
      console.log("⚠️  Vehicle inspection alert service is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚗 Starting vehicle inspection alert service...");
    
    // Run immediately on start
    this.checkForMissingInspections();
    
    // Then run at interval
    this.intervalId = setInterval(() => {
      this.checkForMissingInspections();
    }, this.checkIntervalMs);
    
    console.log(`✅ Vehicle inspection alert service started (checking every ${this.checkIntervalMs / 1000}s)`);
  }

  static stop() {
    if (!this.isRunning) {
      console.log("⚠️  Vehicle inspection alert service is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("🛑 Vehicle inspection alert service stopped");
  }

  static async checkForMissingInspections() {
    try {
      // Get all organizations
      const allOrgs = await db
        .select({ id: organizations.id })
        .from(organizations);

      if (allOrgs.length === 0) {
        return;
      }

      // Get settings for all organizations (may not exist for some)
      const orgSettings = await db
        .select()
        .from(vehicleInspectionAlertSettings);

      // Create a map of org settings
      const settingsMap = new Map(orgSettings.map(s => [s.organizationId, s]));

      console.log(`🔍 Checking vehicle inspections for ${allOrgs.length} organization(s)...`);

      // Check each organization with their settings or defaults
      for (const org of allOrgs) {
        const setting = settingsMap.get(org.id) || {
          organizationId: org.id,
          enabled: true, // Default: enabled
          alertDelayMinutes: 15, // Default: 15 minutes
          alertMessage: "Reminder: Please complete your vehicle inspection. You clocked in {minutes} minutes ago and haven't submitted an inspection yet.",
          sendReminderNotifications: true,
          notifyManagers: false,
        };

        // Skip if explicitly disabled
        if (setting.enabled === false) {
          continue;
        }

        await this.checkOrganization(setting);
      }
    } catch (error) {
      console.error("Error in vehicle inspection alert service:", error);
    }
  }

  private static async checkOrganization(setting: any) {
    const { organizationId, alertDelayMinutes, alertMessage, sendReminderNotifications, notifyManagers } = setting;

    try {
      // Calculate cutoff time (current time - alert delay minutes)
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - alertDelayMinutes);

      // Find all clock-ins OLDER than the cutoff (clocked in more than alertDelayMinutes ago)
      const recentClockIns = await db
        .select({
          clockId: timeClock.id,
          userId: timeClock.userId,
          clockInTime: timeClock.clockInTime,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`.as('userName'),
          userEmail: users.email,
        })
        .from(timeClock)
        .innerJoin(users, eq(timeClock.userId, users.id))
        .where(
          and(
            eq(timeClock.organizationId, organizationId),
            isNull(timeClock.clockOutTime), // Still clocked in
            lte(timeClock.clockInTime, cutoffTime) // Clocked in BEFORE cutoff (more than alertDelayMinutes ago)
          )
        );

      console.log(`  👷 Found ${recentClockIns.length} active clock-ins for org ${organizationId}`);

      for (const clockIn of recentClockIns) {
        await this.checkUserInspection(
          clockIn,
          organizationId,
          alertDelayMinutes,
          alertMessage,
          sendReminderNotifications,
          notifyManagers
        );
      }
    } catch (error) {
      console.error(`Error checking organization ${organizationId}:`, error);
    }
  }

  private static async checkUserInspection(
    clockIn: any,
    organizationId: number,
    alertDelayMinutes: number,
    alertMessage: string,
    sendReminderNotifications: boolean,
    notifyManagers: boolean
  ) {
    const { clockId, userId, clockInTime, userName, userEmail } = clockIn;

    try {
      // Check if we already sent an alert for this clock-in
      const existingAlert = await db
        .select()
        .from(vehicleInspectionAlerts)
        .where(
          and(
            eq(vehicleInspectionAlerts.timeClockId, clockId),
            eq(vehicleInspectionAlerts.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existingAlert.length > 0) {
        // Already sent alert for this clock-in
        return;
      }

      // Calculate how many minutes since clock-in
      const minutesSinceClockIn = Math.floor(
        (Date.now() - new Date(clockInTime).getTime()) / (1000 * 60)
      );

      // Only alert if enough time has passed
      if (minutesSinceClockIn < alertDelayMinutes) {
        return;
      }

      // Check if user has completed an inspection since clocking in
      const inspection = await db
        .select()
        .from(inspectionRecords)
        .where(
          and(
            eq(inspectionRecords.userId, userId),
            eq(inspectionRecords.organizationId, organizationId),
            gte(inspectionRecords.createdAt, clockInTime),
            eq(inspectionRecords.status, "completed")
          )
        )
        .limit(1);

      if (inspection.length > 0) {
        // User has completed an inspection, no need to alert
        console.log(`  ✅ User ${userName} (ID: ${userId}) completed inspection after clocking in`);
        return;
      }

      // No inspection found - send alert!
      console.log(`  ⚠️  User ${userName} (ID: ${userId}) clocked in ${minutesSinceClockIn} minutes ago without completing inspection`);

      // Personalize the alert message
      const personalizedMessage = alertMessage.replace("{minutes}", minutesSinceClockIn.toString());

      // Record the alert
      const [alert] = await db
        .insert(vehicleInspectionAlerts)
        .values({
          organizationId,
          userId,
          timeClockId: clockId,
          clockInTime,
          alertSentAt: new Date(),
          minutesAfterClockIn: minutesSinceClockIn,
          alertMessage: personalizedMessage,
          notificationSent: sendReminderNotifications,
        })
        .returning();

      // Send notification to the technician
      if (sendReminderNotifications) {
        await NotificationService.createNotification({
          type: "vehicle_inspection_reminder",
          title: "Vehicle Inspection Required",
          message: personalizedMessage,
          userId,
          organizationId,
          relatedEntityType: "time_clock",
          relatedEntityId: clockId,
          priority: "high",
          category: "user_based",
        });

        console.log(`  📧 Alert notification sent to user ${userName} (${userEmail})`);
      }

      // Optionally notify managers
      if (notifyManagers) {
        await this.notifyManagers(organizationId, userName, personalizedMessage, clockId);
      }
    } catch (error) {
      console.error(`Error checking user ${userId} inspection:`, error);
    }
  }

  private static async notifyManagers(
    organizationId: number,
    technicianName: string,
    message: string,
    timeClockId: number
  ) {
    try {
      // Find all managers/admins in the organization
      const managers = await db
        .select({
          id: users.id,
          name: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`.as('name'),
          email: users.email,
        })
        .from(users)
        .where(
          and(
            eq(users.organizationId, organizationId),
            sql`${users.role} IN ('admin', 'manager')`
          )
        );

      for (const manager of managers) {
        await NotificationService.createNotification({
          type: "vehicle_inspection_missing",
          title: "Technician Missing Vehicle Inspection",
          message: `${technicianName} ${message}`,
          userId: manager.id,
          organizationId,
          relatedEntityType: "time_clock",
          relatedEntityId: timeClockId,
          priority: "normal",
          category: "team_based",
        });
      }

      console.log(`  📧 Manager notifications sent to ${managers.length} manager(s)`);
    } catch (error) {
      console.error("Error notifying managers:", error);
    }
  }

  // Method to mark inspection as completed (called when inspection is submitted)
  static async markInspectionCompleted(
    userId: number,
    organizationId: number,
    inspectionRecordId: number
  ) {
    try {
      // Find active clock-in for this user
      const [activeClockIn] = await db
        .select()
        .from(timeClock)
        .where(
          and(
            eq(timeClock.userId, userId),
            eq(timeClock.organizationId, organizationId),
            isNull(timeClock.clockOutTime)
          )
        )
        .orderBy(sql`${timeClock.clockInTime} DESC`)
        .limit(1);

      if (!activeClockIn) {
        return;
      }

      // Update any pending alerts for this clock-in
      await db
        .update(vehicleInspectionAlerts)
        .set({
          inspectionCompletedAt: new Date(),
          inspectionRecordId,
        })
        .where(
          and(
            eq(vehicleInspectionAlerts.timeClockId, activeClockIn.id),
            isNull(vehicleInspectionAlerts.inspectionCompletedAt)
          )
        );

      console.log(`✅ Marked vehicle inspection as completed for user ${userId}`);
    } catch (error) {
      console.error("Error marking inspection as completed:", error);
    }
  }
}
