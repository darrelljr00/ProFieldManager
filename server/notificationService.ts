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
      'user_created': 'userCreated',
      'password_reset': 'passwordReset',
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

  // Send email notification using SendGrid
  private static async sendEmailNotification(notification: any): Promise<void> {
    try {
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      if (!sendgridApiKey) {
        console.log(`📧 SendGrid not configured, skipping email for: ${notification.title}`);
        return;
      }

      // Get user details for email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, notification.userId));

      if (!user || !user.email) {
        console.log(`📧 No email address for user ${notification.userId}`);
        return;
      }

      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(sendgridApiKey);

      await sgMail.send({
        to: user.email,
        from: {
          email: 'notifications@profieldmanager.com',
          name: 'Pro Field Manager'
        },
        subject: notification.title,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">${notification.title}</h2>
              <p>${notification.message}</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p>This is an automated notification from Pro Field Manager.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      console.log(`📧 Email sent to ${user.email}: ${notification.title}`);
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

// User Creation Notification
export const createUserCreatedNotification = async (
  userId: number,
  organizationId: number,
  newUserName: string,
  newUserId: number,
  createdBy: number
) => {
  await NotificationService.createNotification({
    type: 'user_created',
    title: 'New User Created',
    message: `A new user account has been created for ${newUserName}`,
    userId,
    organizationId,
    relatedEntityType: 'user',
    relatedEntityId: newUserId,
    priority: 'normal',
    category: 'team_based',
    createdBy,
  });
};

// Password Reset Notification
export const createPasswordResetNotification = async (
  userId: number,
  organizationId: number,
  userName: string,
  targetUserId: number,
  resetBy: number
) => {
  await NotificationService.createNotification({
    type: 'password_reset',
    title: 'Password Reset',
    message: `Password has been reset for ${userName}`,
    userId,
    organizationId,
    relatedEntityType: 'user',
    relatedEntityId: targetUserId,
    priority: 'high',
    category: 'team_based',
    createdBy: resetBy,
  });
};

// Helper to send notifications to multiple recipients (admins + user)
export const notifyUserCreation = async (
  newUser: { id: number; firstName: string; lastName: string | null; email: string },
  organizationId: number,
  createdBy: number,
  setupToken: string,
  adminUsers: Array<{ id: number; email: string; firstName: string; lastName: string | null }>
) => {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  // Get base URL for password setup link (production-ready)
  const baseUrl = process.env.BASE_URL || 
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '');
  const setupUrl = baseUrl ? `${baseUrl}/setup-password?token=${setupToken}` : '';
  const userName = `${newUser.firstName} ${newUser.lastName || ''}`.trim();

  // Send emails only if SendGrid is configured
  let emailsSent = false;
  if (sendgridApiKey && baseUrl) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);

    // Email to new user with setup link
    try {
      await sgMail.send({
        to: newUser.email,
        from: {
          email: 'notifications@profieldmanager.com',
          name: 'Pro Field Manager'
        },
        subject: 'Welcome to Pro Field Manager - Set Your Password',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">Welcome to Pro Field Manager!</h2>
              <p>Hello ${newUser.firstName},</p>
              <p>An account has been created for you. To get started, please set your password by clicking the link below:</p>
              <div style="margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
              <p style="color: #6b7280; font-size: 14px;">If you did not expect this email, please contact your administrator.</p>
            </div>
          </body>
          </html>
        `
      });
      console.log(`📧 Setup email sent to new user: ${newUser.email}`);
      emailsSent = true;
    } catch (error) {
      console.error('Error sending setup email to new user:', error);
    }
  } else {
    console.log('📧 SendGrid or BASE_URL not configured, skipping user creation email');
  }

  // Create in-app notification for new user
  await NotificationService.createNotification({
    type: 'user_created',
    title: 'Welcome to Pro Field Manager',
    message: 'Your account has been created. Please check your email to set your password.',
    userId: newUser.id,
    organizationId,
    priority: 'high',
    category: 'user_based',
    createdBy,
  });

  // Notify all admins/managers
  for (const admin of adminUsers) {
    // Send email notification to admin (only if SendGrid is configured)
    if (emailsSent && sendgridApiKey) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(sendgridApiKey);
      
      try {
        await sgMail.send({
          to: admin.email,
          from: {
            email: 'notifications@profieldmanager.com',
            name: 'Pro Field Manager'
          },
          subject: 'New User Created',
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10b981;">New User Created</h2>
                <p>Hello ${admin.firstName},</p>
                <p>A new user account has been created in your organization:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${userName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${newUser.email}</p>
                </div>
                <p>The user has been sent an email to set their password.</p>
              </div>
            </body>
            </html>
          `
        });
      } catch (error) {
        console.error(`Error sending admin notification email to ${admin.email}:`, error);
      }
    }

    // Create in-app notification for admin
    await createUserCreatedNotification(
      admin.id,
      organizationId,
      userName,
      newUser.id,
      createdBy
    );
  }
};

// Helper to send password reset notifications
export const notifyPasswordReset = async (
  targetUser: { id: number; firstName: string; lastName: string | null; email: string },
  organizationId: number,
  resetBy: number,
  resetToken: string,
  adminUsers: Array<{ id: number; email: string; firstName: string; lastName: string | null }>
) => {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  // Get base URL for password reset link (production-ready)
  const baseUrl = process.env.BASE_URL || 
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '');
  const resetUrl = baseUrl ? `${baseUrl}/reset-password?token=${resetToken}` : '';
  const userName = `${targetUser.firstName} ${targetUser.lastName || ''}`.trim();

  // Send emails only if SendGrid is configured
  let emailsSent = false;
  if (sendgridApiKey && baseUrl) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);

    // Email to user whose password was reset
    try {
      await sgMail.send({
        to: targetUser.email,
        from: {
          email: 'notifications@profieldmanager.com',
          name: 'Pro Field Manager'
        },
        subject: 'Password Reset - Pro Field Manager',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">Password Reset Request</h2>
              <p>Hello ${targetUser.firstName},</p>
              <p>A password reset has been requested for your account. Click the link below to set a new password:</p>
              <div style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Your Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
              <p style="color: #6b7280; font-size: 14px;">If you did not request this reset, please contact your administrator immediately.</p>
            </div>
          </body>
          </html>
        `
      });
      console.log(`📧 Password reset email sent to: ${targetUser.email}`);
      emailsSent = true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  } else {
    console.log('📧 SendGrid or BASE_URL not configured, skipping password reset email');
  }

  // Create in-app notification for user
  await NotificationService.createNotification({
    type: 'password_reset',
    title: 'Password Reset',
    message: 'A password reset has been requested for your account. Please check your email.',
    userId: targetUser.id,
    organizationId,
    priority: 'high',
    category: 'user_based',
    createdBy: resetBy,
  });

  // Notify all admins/managers
  for (const admin of adminUsers) {
    // Send email notification to admin (only if SendGrid is configured)
    if (emailsSent && sendgridApiKey) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(sendgridApiKey);
      
      try {
        await sgMail.send({
          to: admin.email,
          from: {
            email: 'notifications@profieldmanager.com',
            name: 'Pro Field Manager'
          },
          subject: 'Password Reset Notification',
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10b981;">Password Reset Notification</h2>
                <p>Hello ${admin.firstName},</p>
                <p>A password reset has been initiated for a user in your organization:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>User:</strong> ${userName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${targetUser.email}</p>
                </div>
                <p>The user has been sent a secure link to reset their password.</p>
              </div>
            </body>
            </html>
          `
        });
      } catch (error) {
        console.error(`Error sending admin notification email to ${admin.email}:`, error);
      }
    }

    // Create in-app notification for admin
    await createPasswordResetNotification(
      admin.id,
      organizationId,
      userName,
      targetUser.id,
      resetBy
    );
  }
};