import { db } from "./db";
import { notifications, notificationSettings, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertNotification } from "@shared/schema";
import { invalidateNotificationCache } from './cache/queryCache';

// We'll set the WebSocket broadcast function later from routes.ts
let broadcastToUserFunction: ((userId: number, organizationId: number, eventType: string, data: any) => void) | null = null;

export function setBroadcastFunction(fn: (userId: number, organizationId: number, eventType: string, data: any) => void) {
  broadcastToUserFunction = fn;
}

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  userId: number;
  organizationId: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category: 'user_based' | 'team_based';
  createdBy?: number;
}

export class NotificationService {
  // Create a new notification
  static async createNotification(data: NotificationData): Promise<void> {
    try {
      // Get user's notification settings
      const [userSettings] = await db
        .select()
        .from(notificationSettings)
        .where(
          and(
            eq(notificationSettings.userId, data.userId),
            eq(notificationSettings.organizationId, data.organizationId)
          )
        );

      // Create default settings if none exist
      if (!userSettings) {
        await db.insert(notificationSettings).values({
          userId: data.userId,
          organizationId: data.organizationId,
        });
      }

      // Check if user wants this type of notification
      const shouldSend = await this.shouldSendNotification(data.type, userSettings);
      
      if (!shouldSend.inApp && !shouldSend.email && !shouldSend.sms) {
        return; // User has disabled all notifications for this type
      }

      // Create the notification record
      const notificationData: InsertNotification = {
        organizationId: data.organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        priority: data.priority || 'normal',
        category: data.category,
        createdBy: data.createdBy,
      };

      const [notification] = await db
        .insert(notifications)
        .values(notificationData)
        .returning();

      // Invalidate cache for the recipient
      invalidateNotificationCache(data.userId, data.organizationId);

      // Send real-time notification via WebSocket if enabled
      if (shouldSend.inApp) {
        await this.sendInAppNotification(notification);
      }

      // Send email notification if enabled
      if (shouldSend.email) {
        await this.sendEmailNotification(notification);
      }

      // Send SMS notification if enabled
      if (shouldSend.sms) {
        await this.sendSmsNotification(notification);
      }

      console.log(`✅ Notification sent to user ${data.userId}: ${data.title}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Check notification preferences
  private static async shouldSendNotification(type: string, settings: any) {
    const result = {
      inApp: true,
      email: false,
      sms: false
    };

    if (!settings) return result;

    // Map notification types to settings
    const typeMap: Record<string, string> = {
      'job_assigned': 'jobAssigned',
      'job_completed': 'jobCompleted',
      'task_assigned': 'taskAssigned',
      'task_completed': 'taskCompleted',
      'task_triggered': 'taskTriggered',
      'lead_new': 'leadNew',
      'invoice_paid': 'invoicePaid',
      'stock_alert': 'stockAlert',
      'schedule_reminder': 'scheduleReminder',
    };

    const settingPrefix = typeMap[type];
    if (settingPrefix) {
      result.inApp = settings[`${settingPrefix}InApp`] ?? true;
      result.email = settings[`${settingPrefix}Email`] ?? false;
      result.sms = settings[`${settingPrefix}Sms`] ?? false;
    }

    // Apply global settings
    if (!settings.globalInApp) result.inApp = false;
    if (!settings.globalEmail) result.email = false;
    if (!settings.globalSms) result.sms = false;

    return result;
  }

  // Send in-app notification via WebSocket
  private static async sendInAppNotification(notification: any): Promise<void> {
    try {
      // Get user details for WebSocket targeting
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, notification.userId));

      if (user && broadcastToUserFunction) {
        // Broadcast to user via WebSocket
        broadcastToUserFunction(user.id, notification.organizationId, 'new_notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          category: notification.category,
          createdAt: notification.createdAt,
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId,
        });
      }
    } catch (error) {
      console.error('Error sending in-app notification:', error);
    }
  }

  // Send email notification (placeholder for email service integration)
  private static async sendEmailNotification(notification: any): Promise<void> {
    try {
      // TODO: Integrate with SendGrid or other email service
      console.log(`📧 Email notification would be sent: ${notification.title}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Send SMS notification (placeholder for SMS service integration)
  private static async sendSmsNotification(notification: any): Promise<void> {
    try {
      // TODO: Integrate with Twilio SMS service
      console.log(`📱 SMS notification would be sent: ${notification.title}`);
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: number, organizationId: number, limit = 50) {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  // Mark notification as read
  static async markAsRead(notificationId: number, userId: number) {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: number, organizationId: number) {
    return await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, false)
        )
      );
  }

  // Get unread count
  static async getUnreadCount(userId: number, organizationId: number) {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, false)
        )
      );
    
    return result.length;
  }

  // Get or create notification settings for a user
  static async getNotificationSettings(userId: number, organizationId: number) {
    let [settings] = await db
      .select()
      .from(notificationSettings)
      .where(
        and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.organizationId, organizationId)
        )
      );

    if (!settings) {
      [settings] = await db
        .insert(notificationSettings)
        .values({
          userId,
          organizationId,
        })
        .returning();
    }

    return settings;
  }

  // Update notification settings
  static async updateNotificationSettings(
    userId: number,
    organizationId: number,
    updates: Partial<any>
  ) {
    return await db
      .update(notificationSettings)
      .set(updates)
      .where(
        and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.organizationId, organizationId)
        )
      )
      .returning();
  }

  // Admin methods for notification tracking

  // Get all notifications for organization (Admin/Manager only)
  static async getAllOrganizationNotifications(organizationId: number, limit: number = 100) {
    return await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        category: notifications.category,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        adminViewedBy: notifications.adminViewedBy,
        adminViewedAt: notifications.adminViewedAt,
        createdAt: notifications.createdAt,
        userId: notifications.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .where(eq(notifications.organizationId, organizationId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  // Mark notification as viewed by admin/manager
  static async markAdminViewed(notificationId: number, adminId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        adminViewedBy: adminId,
        adminViewedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));
  }

  // Get notification statistics for organization
  static async getOrganizationNotificationStats(organizationId: number) {
    const [totalNotifications] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(eq(notifications.organizationId, organizationId));

    const [unreadNotifications] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, false)
        )
      );

    const [adminViewedNotifications] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, true)
        )
      );

    const [urgentUnread] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, false),
          eq(notifications.priority, 'urgent')
        )
      );

    return {
      total: totalNotifications?.count || 0,
      unread: unreadNotifications?.count || 0,
      adminViewed: adminViewedNotifications?.count || 0,
      urgentUnread: urgentUnread?.count || 0,
      readPercentage: totalNotifications?.count ? 
        Math.round(((totalNotifications.count - (unreadNotifications?.count || 0)) / totalNotifications.count) * 100) : 0
    };
  }
}

// Helper functions for creating specific notification types
export const createJobAssignedNotification = async (
  userId: number,
  organizationId: number,
  jobTitle: string,
  projectId: number,
  assignedBy: number
) => {
  await NotificationService.createNotification({
    type: 'job_assigned',
    title: 'New Job Assignment',
    message: `You have been assigned to job: ${jobTitle}`,
    userId,
    organizationId,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    priority: 'high',
    category: 'user_based',
    createdBy: assignedBy,
  });
};

export const createJobCompletedNotification = async (
  userId: number,
  organizationId: number,
  jobTitle: string,
  projectId: number,
  completedBy: number
) => {
  await NotificationService.createNotification({
    type: 'job_completed',
    title: 'Job Completed',
    message: `Job completed: ${jobTitle}`,
    userId,
    organizationId,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    priority: 'normal',
    category: 'team_based',
    createdBy: completedBy,
  });
};

export const createTaskAssignedNotification = async (
  userId: number,
  organizationId: number,
  taskTitle: string,
  taskId: number,
  assignedBy: number
) => {
  await NotificationService.createNotification({
    type: 'task_assigned',
    title: 'New Task Assignment',
    message: `You have been assigned a new task: ${taskTitle}`,
    userId,
    organizationId,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    priority: 'high',
    category: 'user_based',
    createdBy: assignedBy,
  });
};

export const createTaskCompletedNotification = async (
  userId: number,
  organizationId: number,
  taskTitle: string,
  taskId: number,
  completedBy: number
) => {
  await NotificationService.createNotification({
    type: 'task_completed',
    title: 'Task Completed',
    message: `Task completed: ${taskTitle}`,
    userId,
    organizationId,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    priority: 'normal',
    category: 'team_based',
    createdBy: completedBy,
  });
};

export const createTaskTriggeredNotification = async (
  userId: number,
  organizationId: number,
  taskTitle: string,
  taskId: number,
  triggeredBy: number
) => {
  await NotificationService.createNotification({
    type: 'task_triggered',
    title: 'Task Triggered',
    message: `Task trigger activated: ${taskTitle}`,
    userId,
    organizationId,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    priority: 'urgent',
    category: 'user_based',
    createdBy: triggeredBy,
  });
};

export const createNewLeadNotification = async (
  userId: number,
  organizationId: number,
  leadName: string,
  leadId: number
) => {
  await NotificationService.createNotification({
    type: 'lead_new',
    title: 'New Lead',
    message: `New lead received: ${leadName}`,
    userId,
    organizationId,
    relatedEntityType: 'lead',
    relatedEntityId: leadId,
    priority: 'high',
    category: 'team_based',
  });
};

export const createInvoicePaidNotification = async (
  userId: number,
  organizationId: number,
  invoiceNumber: string,
  amount: number,
  invoiceId: number
) => {
  await NotificationService.createNotification({
    type: 'invoice_paid',
    title: 'Invoice Paid',
    message: `Invoice ${invoiceNumber} has been paid - $${amount}`,
    userId,
    organizationId,
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId,
    priority: 'normal',
    category: 'team_based',
  });
};