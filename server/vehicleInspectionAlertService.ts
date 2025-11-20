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
  // Track scheduled timers so they can be canceled
  private static scheduledTimers: Map<number, NodeJS.Timeout> = new Map();

  static async start() {
    // Service is now event-driven, triggered on clock-in
    // On startup, rebuild timers for any existing clock-ins without inspections
    try {
      await this.rebuildPendingAlerts();
      console.log("✅ Vehicle inspection alert service ready (event-driven)");
    } catch (error) {
      console.error("❌ Error starting vehicle inspection alert service:", error);
      throw error; // Propagate error so server startup can handle it
    }
  }

  static stop() {
    // Cancel all scheduled timers
    for (const [clockInId, timer] of this.scheduledTimers.entries()) {
      clearTimeout(timer);
    }
    this.scheduledTimers.clear();
    console.log("🛑 Vehicle inspection alert service stopped");
  }

  /**
   * Cancel a scheduled alert for a specific clock-in
   * Called when technician clocks out or submits an inspection
   */
  static cancelAlert(clockInId: number) {
    const timer = this.scheduledTimers.get(clockInId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(clockInId);
      console.log(`🚫 Canceled vehicle inspection alert for clock-in ${clockInId}`);
    }
  }

  /**
   * Rebuild timers for clock-ins that happened before server started
   * This ensures alerts are sent even after server restarts
   */
  private static async rebuildPendingAlerts() {
    try {
      // Get all organizations that have alerts enabled (or use defaults)
      const allSettings = await db
        .select()
        .from(vehicleInspectionAlertSettings)
        .execute();

      // Build a map of organization settings
      const settingsMap = new Map();
      for (const setting of allSettings) {
        settingsMap.set(setting.organizationId, setting);
      }

      // Get all clock-ins from today that are still open (no clock-out)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const openClockIns = await db
        .select({
          id: timeClock.id,
          userId: timeClock.userId,
          organizationId: timeClock.organizationId,
          clockInTime: timeClock.clockInTime,
        })
        .from(timeClock)
        .where(
          and(
            gte(timeClock.clockInTime, today),
            isNull(timeClock.clockOutTime)
          )
        )
        .execute();

      let rebuiltCount = 0;
      const now = new Date();

      for (const clockIn of openClockIns) {
        // Get settings for this organization (or use defaults)
        const settings = settingsMap.get(clockIn.organizationId) || {
          organizationId: clockIn.organizationId,
          enabled: true,
          alertDelayMinutes: 15,
          alertMessage: "Reminder: Please complete your vehicle inspection. You clocked in {minutes} minutes ago and haven't submitted an inspection yet.",
          sendReminderNotifications: true,
          notifyManagers: false,
        };

        // Skip if alerts are disabled for this org
        if (settings.enabled === false) {
          continue;
        }

        // Check if inspection already exists
        const [existingInspection] = await db
          .select()
          .from(inspectionRecords)
          .where(
            and(
              eq(inspectionRecords.userId, clockIn.userId),
              gte(inspectionRecords.submittedAt, clockIn.clockInTime)
            )
          )
          .limit(1)
          .execute();

        // Skip if inspection already completed
        if (existingInspection) {
          continue;
        }

        // Check if alert was already sent
        const [existingAlert] = await db
          .select()
          .from(vehicleInspectionAlerts)
          .where(eq(vehicleInspectionAlerts.timeClockId, clockIn.id))
          .limit(1)
          .execute();

        // Skip if alert already sent
        if (existingAlert) {
          continue;
        }

        // Calculate when alert should be sent
        const alertTime = new Date(clockIn.clockInTime.getTime() + settings.alertDelayMinutes * 60 * 1000);
        const msUntilAlert = alertTime.getTime() - now.getTime();

        // Cancel any existing timer for this clock-in
        this.cancelAlert(clockIn.id);

        // If alert time has passed, send immediately
        // If alert time is in the future, schedule it
        if (msUntilAlert <= 0) {
          // Alert should have been sent already, send it now
          await this.performInspectionCheck(
            clockIn.userId,
            clockIn.organizationId,
            clockIn.id,
            clockIn.clockInTime,
            settings.alertDelayMinutes,
            settings.alertMessage,
            settings.sendReminderNotifications,
            settings.notifyManagers
          );
          rebuiltCount++;
        } else {
          // Alert should be sent in the future, schedule it
          const timer = setTimeout(async () => {
            this.scheduledTimers.delete(clockIn.id); // Remove from tracking once executed
            await this.performInspectionCheck(
              clockIn.userId,
              clockIn.organizationId,
              clockIn.id,
              clockIn.clockInTime,
              settings.alertDelayMinutes,
              settings.alertMessage,
              settings.sendReminderNotifications,
              settings.notifyManagers
            );
          }, msUntilAlert);
          
          // Track the timer so it can be canceled later
          this.scheduledTimers.set(clockIn.id, timer);
          rebuiltCount++;
        }
      }

      if (rebuiltCount > 0) {
        console.log(`🔄 Rebuilt ${rebuiltCount} pending vehicle inspection alert(s)`);
      }
    } catch (error) {
      console.error("Error rebuilding pending alerts:", error);
    }
  }

  /**
   * Check vehicle inspection for a specific user after clock-in
   * This is called when a technician clocks in
   */
  static async checkOnClockIn(
    userId: number,
    organizationId: number,
    clockInId: number,
    clockInTime: Date
  ) {
    try {
      // Get settings for this organization
      const [settings] = await db
        .select()
        .from(vehicleInspectionAlertSettings)
        .where(eq(vehicleInspectionAlertSettings.organizationId, organizationId))
        .limit(1);

      // Use defaults if no settings exist
      const config = settings || {
        organizationId,
        enabled: true,
        alertDelayMinutes: 15,
        alertMessage: "Reminder: Please complete your vehicle inspection. You clocked in {minutes} minutes ago and haven't submitted an inspection yet.",
        sendReminderNotifications: true,
        notifyManagers: false,
      };

      // Skip if disabled
      if (config.enabled === false) {
        return;
      }

      // Cancel any existing timer for this clock-in (shouldn't happen, but be safe)
      this.cancelAlert(clockInId);

      // Schedule the check after the configured delay
      const timer = setTimeout(async () => {
        this.scheduledTimers.delete(clockInId); // Remove from tracking once executed
        await this.performInspectionCheck(
          userId,
          organizationId,
          clockInId,
          clockInTime,
          config.alertDelayMinutes,
          config.alertMessage,
          config.sendReminderNotifications,
          config.notifyManagers
        );
      }, config.alertDelayMinutes * 60 * 1000); // Convert minutes to milliseconds

      // Track the timer so it can be canceled later
      this.scheduledTimers.set(clockInId, timer);

      console.log(`🚗 Vehicle inspection check scheduled for user ${userId} in ${config.alertDelayMinutes} minutes`);
    } catch (error) {
      console.error("Error scheduling vehicle inspection check:", error);
    }
  }

  private static async performInspectionCheck(
    userId: number,
    organizationId: number,
    clockInId: number,
    clockInTime: Date,
    alertDelayMinutes: number,
    alertMessage: string,
    sendReminderNotifications: boolean,
    notifyManagers: boolean
  ) {
    try {
      // Get user info
      const [user] = await db
        .select({
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`.as('userName'),
          userEmail: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return;
      }

      await this.checkUserInspection(
        {
          clockId: clockInId,
          userId,
          clockInTime,
          userName: user.userName,
          userEmail: user.userEmail,
        },
        organizationId,
        alertDelayMinutes,
        alertMessage,
        sendReminderNotifications,
        notifyManagers
      );
    } catch (error) {
      console.error("Error performing vehicle inspection check:", error);
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
      // First check if technician has already clocked out
      const [timeClockEntry] = await db
        .select()
        .from(timeClock)
        .where(eq(timeClock.id, clockId))
        .limit(1);

      if (!timeClockEntry || timeClockEntry.clockOutTime) {
        // Technician has clocked out, cancel this alert
        console.log(`  ℹ️  User ${userName} (ID: ${userId}) has already clocked out, skipping inspection alert`);
        return;
      }

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

      // Record the alert FIRST to prevent duplicate notifications (race condition protection)
      try {
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
      } catch (insertError: any) {
        // Handle duplicate key error (another timer already inserted the alert)
        if (insertError?.code === '23505') { // PostgreSQL duplicate key error code
          console.log(`  ℹ️  Alert already sent for user ${userName}, skipping duplicate`);
          return;
        }
        throw insertError; // Re-throw if it's a different error
      }

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

      // Cancel any scheduled alert for this clock-in
      this.cancelAlert(activeClockIn.id);

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
