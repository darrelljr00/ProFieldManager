import { db } from "./db";
import { tasks, taskNotifications, users, organizations } from "@shared/schema";
import { eq, and, lt, gte, isNull, or } from "drizzle-orm";
import type { InsertTaskNotification, SelectTaskNotification } from "@shared/schema";

export class TaskNotificationService {
  private static readonly NOTIFICATION_INTERVALS = [24, 12, 6, 3, 1]; // hours before due date

  /**
   * Creates task notifications for a newly assigned task
   */
  static async createNotificationsForTask(taskId: number, assignedUserId: number, dueDate: Date, organizationId: number): Promise<void> {
    console.log(`📅 Creating notifications for task ${taskId}, due: ${dueDate.toISOString()}`);
    
    const notifications: InsertTaskNotification[] = [];
    const now = new Date();

    for (const hoursBeforeDue of this.NOTIFICATION_INTERVALS) {
      const scheduledFor = new Date(dueDate.getTime() - (hoursBeforeDue * 60 * 60 * 1000));
      
      // Only create notifications for future times
      if (scheduledFor > now) {
        const notificationType = `${hoursBeforeDue}h`;
        const subject = `Task Due in ${hoursBeforeDue} Hour${hoursBeforeDue > 1 ? 's' : ''}`;
        const message = `Your task is due in ${hoursBeforeDue} hour${hoursBeforeDue > 1 ? 's' : ''}. Please complete it on time.`;

        notifications.push({
          taskId,
          userId: assignedUserId,
          organizationId,
          notificationType,
          hoursBeforeDue,
          subject,
          message,
          scheduledFor,
          status: "pending",
          isEmailSent: false,
          isSmsSent: false,
          isWebSocketSent: false,
        });
      }
    }

    if (notifications.length > 0) {
      await db.insert(taskNotifications).values(notifications);
      console.log(`✅ Created ${notifications.length} notifications for task ${taskId}`);
    } else {
      console.log(`⚠️ No future notifications created for task ${taskId} (due date too close)`);
    }
  }

  /**
   * Processes and sends pending notifications that are due
   */
  static async processPendingNotifications(): Promise<void> {
    console.log("🔔 Processing pending task notifications...");
    
    const now = new Date();
    
    // Get all pending notifications that are due
    const pendingNotifications = await db
      .select({
        notification: taskNotifications,
        task: tasks,
        user: users,
        organization: organizations,
      })
      .from(taskNotifications)
      .innerJoin(tasks, eq(taskNotifications.taskId, tasks.id))
      .innerJoin(users, eq(taskNotifications.userId, users.id))
      .innerJoin(organizations, eq(taskNotifications.organizationId, organizations.id))
      .where(
        and(
          eq(taskNotifications.status, "pending"),
          lt(taskNotifications.scheduledFor, now),
          // Only send notifications for tasks that are not completed
          eq(tasks.isCompleted, false)
        )
      );

    console.log(`📨 Found ${pendingNotifications.length} pending notifications to process`);

    for (const { notification, task, user, organization } of pendingNotifications) {
      try {
        await this.sendNotification(notification, task, user, organization);
        
        // Mark notification as sent
        await db
          .update(taskNotifications)
          .set({
            status: "sent",
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(taskNotifications.id, notification.id));

        console.log(`✅ Notification sent for task ${task.id} to user ${user.username}`);
      } catch (error) {
        console.error(`❌ Failed to send notification ${notification.id}:`, error);
        
        // Mark notification as failed
        await db
          .update(taskNotifications)
          .set({
            status: "failed",
            failureReason: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(taskNotifications.id, notification.id));
      }
    }
  }

  /**
   * Sends a notification through available channels
   */
  private static async sendNotification(
    notification: SelectTaskNotification,
    task: any,
    user: any,
    organization: any
  ): Promise<void> {
    const notificationData = {
      type: "task_reminder",
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
      hoursBeforeDue: notification.hoursBeforeDue,
      userId: user.id,
      organizationId: organization.id,
      subject: notification.subject,
      message: notification.message,
    };

    // Send WebSocket notification (real-time)
    try {
      const { broadcastToUser } = await import("./routes");
      broadcastToUser(user.id, organization.id, "task_reminder", notificationData);
      
      await db
        .update(taskNotifications)
        .set({ isWebSocketSent: true })
        .where(eq(taskNotifications.id, notification.id));
      
      console.log(`📡 WebSocket notification sent to user ${user.username}`);
    } catch (error) {
      console.error("Failed to send WebSocket notification:", error);
    }

    // TODO: Send email notification if user has email
    if (user.email) {
      try {
        // Email notification logic would go here
        console.log(`📧 Email notification would be sent to ${user.email}`);
        
        await db
          .update(taskNotifications)
          .set({ isEmailSent: true })
          .where(eq(taskNotifications.id, notification.id));
      } catch (error) {
        console.error("Failed to send email notification:", error);
      }
    }

    // TODO: Send SMS notification if user has phone
    if (user.phone) {
      try {
        // SMS notification logic would go here
        console.log(`📱 SMS notification would be sent to ${user.phone}`);
        
        await db
          .update(taskNotifications)
          .set({ isSmsSent: true })
          .where(eq(taskNotifications.id, notification.id));
      } catch (error) {
        console.error("Failed to send SMS notification:", error);
      }
    }
  }

  /**
   * Cancels all notifications for a task (when task is completed or deleted)
   */
  static async cancelNotificationsForTask(taskId: number): Promise<void> {
    console.log(`🚫 Cancelling notifications for task ${taskId}`);
    
    await db
      .update(taskNotifications)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(taskNotifications.taskId, taskId),
          eq(taskNotifications.status, "pending")
        )
      );
  }

  /**
   * Updates notification schedules when task due date changes
   */
  static async updateNotificationsForTask(taskId: number, newDueDate: Date): Promise<void> {
    console.log(`📅 Updating notifications for task ${taskId}, new due date: ${newDueDate.toISOString()}`);
    
    // Cancel existing pending notifications
    await this.cancelNotificationsForTask(taskId);
    
    // Get task details to recreate notifications
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (task && task.assignedToId && !task.isCompleted) {
      // Create new notifications with updated schedule
      await this.createNotificationsForTask(taskId, task.assignedToId, newDueDate, task.projectId);
    }
  }

  /**
   * Gets notification history for a task
   */
  static async getNotificationsForTask(taskId: number): Promise<SelectTaskNotification[]> {
    return await db
      .select()
      .from(taskNotifications)
      .where(eq(taskNotifications.taskId, taskId))
      .orderBy(taskNotifications.scheduledFor);
  }

  /**
   * Gets notification statistics for an organization
   */
  static async getNotificationStats(organizationId: number): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
  }> {
    const stats = await db
      .select({
        status: taskNotifications.status,
        count: taskNotifications.id,
      })
      .from(taskNotifications)
      .where(eq(taskNotifications.organizationId, organizationId));

    return {
      total: stats.length,
      pending: stats.filter(s => s.status === "pending").length,
      sent: stats.filter(s => s.status === "sent").length,
      failed: stats.filter(s => s.status === "failed").length,
    };
  }
}

// Start the notification processor (runs every minute)
export function startNotificationProcessor(): void {
  console.log("🚀 Starting task notification processor...");
  
  // Process immediately on startup
  TaskNotificationService.processPendingNotifications().catch(console.error);
  
  // Then process every minute
  setInterval(() => {
    TaskNotificationService.processPendingNotifications().catch(console.error);
  }, 60 * 1000); // 1 minute interval
  
  console.log("✅ Task notification processor started");
}