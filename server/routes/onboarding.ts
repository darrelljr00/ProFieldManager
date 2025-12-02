import { Express } from 'express';
import { requireAuth, isSuperAdmin } from '../auth';
import { db } from '../db';
import { onboardingProgress, organizations, users, services, customers } from '@shared/schema';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';

export function registerOnboardingRoutes(app: Express) {
  // Get onboarding progress for current organization
  app.get('/api/onboarding/progress', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      let progress = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.organizationId, user.organizationId),
      });
      
      // If no progress record exists, create one
      if (!progress) {
        const [newProgress] = await db.insert(onboardingProgress)
          .values({ organizationId: user.organizationId })
          .returning();
        progress = newProgress;
      }
      
      // Also fetch organization data to check current setup status
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, user.organizationId),
      });
      
      // Check if steps are actually complete based on org data
      const stepStatus = {
        companyProfileComplete: progress.companyProfileComplete || !!(org?.name && org?.address && org?.phone),
        teamMembersComplete: progress.teamMembersComplete,
        stripeConnectComplete: progress.stripeConnectComplete || !!org?.stripeConnectOnboardingComplete,
        servicesComplete: progress.servicesComplete,
        brandingComplete: progress.brandingComplete || !!org?.logo,
        firstCustomerComplete: progress.firstCustomerComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      
      res.json({
        ...progress,
        ...stepStatus,
        completedSteps,
        percentComplete: Math.round((completedSteps / 6) * 100),
        organization: org,
      });
    } catch (error: any) {
      console.error('Error getting onboarding progress:', error);
      res.status(500).json({ message: error.message || 'Failed to get onboarding progress' });
    }
  });

  // Update a specific onboarding step
  app.post('/api/onboarding/step/:stepName', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { stepName } = req.params;
      const { completed, skipped } = req.body;
      
      const validSteps = [
        'companyProfile',
        'teamMembers', 
        'stripeConnect',
        'services',
        'branding',
        'firstCustomer',
      ];
      
      if (!validSteps.includes(stepName)) {
        return res.status(400).json({ message: 'Invalid step name' });
      }
      
      const columnName = `${stepName}Complete` as keyof typeof onboardingProgress.$inferSelect;
      
      // Get or create progress record
      let progress = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.organizationId, user.organizationId),
      });
      
      if (!progress) {
        const [newProgress] = await db.insert(onboardingProgress)
          .values({ organizationId: user.organizationId })
          .returning();
        progress = newProgress;
      }
      
      // Determine the next step
      const stepIndex = validSteps.indexOf(stepName);
      const nextStep = stepIndex < validSteps.length - 1 ? stepIndex + 2 : stepIndex + 1;
      
      // Update the step
      const updateData: any = {
        [columnName]: completed || skipped,
        currentStep: nextStep,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      
      const [updated] = await db.update(onboardingProgress)
        .set(updateData)
        .where(eq(onboardingProgress.organizationId, user.organizationId))
        .returning();
      
      // Recalculate completed steps
      const stepStatus = {
        companyProfileComplete: updated.companyProfileComplete,
        teamMembersComplete: updated.teamMembersComplete,
        stripeConnectComplete: updated.stripeConnectComplete,
        servicesComplete: updated.servicesComplete,
        brandingComplete: updated.brandingComplete,
        firstCustomerComplete: updated.firstCustomerComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      
      // Update completed steps count
      await db.update(onboardingProgress)
        .set({ completedSteps })
        .where(eq(onboardingProgress.organizationId, user.organizationId));
      
      res.json({
        ...updated,
        completedSteps,
        percentComplete: Math.round((completedSteps / 6) * 100),
      });
    } catch (error: any) {
      console.error('Error updating onboarding step:', error);
      res.status(500).json({ message: error.message || 'Failed to update onboarding step' });
    }
  });

  // Mark onboarding as complete
  app.post('/api/onboarding/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const [updated] = await db.update(onboardingProgress)
        .set({
          isComplete: true,
          completedAt: new Date(),
          completedSteps: 6,
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.organizationId, user.organizationId))
        .returning();
      
      res.json({ success: true, progress: updated });
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to complete onboarding' });
    }
  });

  // Skip onboarding entirely
  app.post('/api/onboarding/skip', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Get or create progress record
      let progress = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.organizationId, user.organizationId),
      });
      
      if (!progress) {
        const [newProgress] = await db.insert(onboardingProgress)
          .values({ 
            organizationId: user.organizationId,
            isComplete: true,
            completedAt: new Date(),
          })
          .returning();
        progress = newProgress;
      } else {
        const [updated] = await db.update(onboardingProgress)
          .set({
            isComplete: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(onboardingProgress.organizationId, user.organizationId))
          .returning();
        progress = updated;
      }
      
      res.json({ success: true, progress });
    } catch (error: any) {
      console.error('Error skipping onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to skip onboarding' });
    }
  });

  // Reset onboarding (for testing or redo)
  app.post('/api/onboarding/reset', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const [updated] = await db.update(onboardingProgress)
        .set({
          companyProfileComplete: false,
          teamMembersComplete: false,
          stripeConnectComplete: false,
          servicesComplete: false,
          brandingComplete: false,
          firstCustomerComplete: false,
          isComplete: false,
          currentStep: 1,
          completedSteps: 0,
          completedAt: null,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.organizationId, user.organizationId))
        .returning();
      
      res.json({ success: true, progress: updated });
    } catch (error: any) {
      console.error('Error resetting onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to reset onboarding' });
    }
  });

  // Admin: Get all organizations' onboarding status
  app.get('/api/admin/onboarding/all', requireAuth, isSuperAdmin, async (req, res) => {
    try {
      const allProgress = await db
        .select({
          organizationId: onboardingProgress.organizationId,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
          isComplete: onboardingProgress.isComplete,
          completedSteps: onboardingProgress.completedSteps,
          totalSteps: onboardingProgress.totalSteps,
          currentStep: onboardingProgress.currentStep,
          companyProfileComplete: onboardingProgress.companyProfileComplete,
          teamMembersComplete: onboardingProgress.teamMembersComplete,
          stripeConnectComplete: onboardingProgress.stripeConnectComplete,
          servicesComplete: onboardingProgress.servicesComplete,
          brandingComplete: onboardingProgress.brandingComplete,
          firstCustomerComplete: onboardingProgress.firstCustomerComplete,
          startedAt: onboardingProgress.startedAt,
          completedAt: onboardingProgress.completedAt,
          lastActivityAt: onboardingProgress.lastActivityAt,
          welcomeEmailSentAt: onboardingProgress.welcomeEmailSentAt,
          reminderEmailSentAt: onboardingProgress.reminderEmailSentAt,
        })
        .from(onboardingProgress)
        .leftJoin(organizations, eq(onboardingProgress.organizationId, organizations.id))
        .orderBy(onboardingProgress.startedAt);
      
      // Also get organizations without onboarding progress
      const orgsWithProgress = new Set(allProgress.map(p => p.organizationId));
      const allOrgs = await db.query.organizations.findMany();
      
      const orgsWithoutProgress = allOrgs
        .filter(org => !orgsWithProgress.has(org.id))
        .map(org => ({
          organizationId: org.id,
          organizationName: org.name,
          organizationSlug: org.slug,
          isComplete: false,
          completedSteps: 0,
          totalSteps: 6,
          currentStep: 1,
          companyProfileComplete: false,
          teamMembersComplete: false,
          stripeConnectComplete: false,
          servicesComplete: false,
          brandingComplete: false,
          firstCustomerComplete: false,
          startedAt: null,
          completedAt: null,
          lastActivityAt: null,
          welcomeEmailSentAt: null,
          reminderEmailSentAt: null,
        }));
      
      res.json([...allProgress, ...orgsWithoutProgress]);
    } catch (error: any) {
      console.error('Error getting all onboarding status:', error);
      res.status(500).json({ message: error.message || 'Failed to get onboarding status' });
    }
  });

  // Admin: Send onboarding reminder to specific organization
  app.post('/api/admin/onboarding/:orgId/send-reminder', requireAuth, isSuperAdmin, async (req, res) => {
    try {
      const { orgId } = req.params;
      const organizationId = parseInt(orgId);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: 'Invalid organization ID' });
      }
      
      // Get organization and admin user
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });
      
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      const adminUser = await db.query.users.findFirst({
        where: and(
          eq(users.organizationId, organizationId),
          eq(users.role, 'admin'),
        ),
      });
      
      if (!adminUser?.email) {
        return res.status(400).json({ message: 'No admin user with email found' });
      }
      
      // Import email service and send reminder
      const { sendOnboardingReminderEmail } = await import('../services/onboardingEmails');
      await sendOnboardingReminderEmail(adminUser.email, org.name || 'Your Organization');
      
      // Update reminder sent timestamp
      await db.update(onboardingProgress)
        .set({ reminderEmailSentAt: new Date() })
        .where(eq(onboardingProgress.organizationId, organizationId));
      
      res.json({ success: true, message: 'Reminder email sent' });
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to send reminder' });
    }
  });

  // Cron job endpoint: Send reminders to incomplete onboarding after 24 hours
  app.post('/api/cron/onboarding-reminders', async (req, res) => {
    try {
      // Find organizations that:
      // 1. Haven't completed onboarding
      // 2. Started more than 24 hours ago
      // 3. Haven't received a reminder yet
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const incompleteOrgs = await db
        .select({
          organizationId: onboardingProgress.organizationId,
          orgName: organizations.name,
        })
        .from(onboardingProgress)
        .leftJoin(organizations, eq(onboardingProgress.organizationId, organizations.id))
        .where(
          and(
            eq(onboardingProgress.isComplete, false),
            lt(onboardingProgress.startedAt, twentyFourHoursAgo),
            isNull(onboardingProgress.reminderEmailSentAt),
          )
        );
      
      const { sendOnboardingReminderEmail } = await import('../services/onboardingEmails');
      let sentCount = 0;
      
      for (const org of incompleteOrgs) {
        const adminUser = await db.query.users.findFirst({
          where: and(
            eq(users.organizationId, org.organizationId),
            eq(users.role, 'admin'),
          ),
        });
        
        if (adminUser?.email) {
          try {
            await sendOnboardingReminderEmail(adminUser.email, org.orgName || 'Your Organization');
            await db.update(onboardingProgress)
              .set({ reminderEmailSentAt: new Date() })
              .where(eq(onboardingProgress.organizationId, org.organizationId));
            sentCount++;
          } catch (e) {
            console.error(`Failed to send reminder to org ${org.organizationId}:`, e);
          }
        }
      }
      
      res.json({ success: true, remindersSent: sentCount });
    } catch (error: any) {
      console.error('Error in onboarding reminders cron:', error);
      res.status(500).json({ message: error.message || 'Failed to process reminders' });
    }
  });
}
