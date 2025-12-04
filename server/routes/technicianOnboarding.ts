import { Express } from 'express';
import { requireAuth } from '../auth';
import { db } from '../db';
import { technicianOnboardingProgress, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export function registerTechnicianOnboardingRoutes(app: Express) {
  // Get technician onboarding progress for current user
  app.get('/api/technician-onboarding/progress', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      let progress = await db.query.technicianOnboardingProgress.findFirst({
        where: eq(technicianOnboardingProgress.userId, user.id),
      });
      
      // If no progress record exists, create one
      if (!progress) {
        const [newProgress] = await db.insert(technicianOnboardingProgress)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
          })
          .returning();
        progress = newProgress;
      }
      
      // Calculate completed steps count
      const stepStatus = {
        welcomeComplete: progress.welcomeComplete,
        scheduleComplete: progress.scheduleComplete,
        jobDetailsComplete: progress.jobDetailsComplete,
        imageUploadsComplete: progress.imageUploadsComplete,
        timeClockComplete: progress.timeClockComplete,
        tasksComplete: progress.tasksComplete,
        gpsNavigationComplete: progress.gpsNavigationComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      
      res.json({
        ...progress,
        completedSteps,
        percentComplete: Math.round((completedSteps / 7) * 100),
      });
    } catch (error: any) {
      console.error('Error getting technician onboarding progress:', error);
      res.status(500).json({ message: error.message || 'Failed to get onboarding progress' });
    }
  });

  // Update a specific onboarding step
  app.post('/api/technician-onboarding/step/:stepName', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { stepName } = req.params;
      const { completed } = req.body;
      
      const validSteps = [
        'welcome',
        'schedule',
        'jobDetails',
        'imageUploads',
        'timeClock',
        'tasks',
        'gpsNavigation',
      ];
      
      if (!validSteps.includes(stepName)) {
        return res.status(400).json({ message: 'Invalid step name' });
      }
      
      const columnName = `${stepName}Complete` as keyof typeof technicianOnboardingProgress.$inferSelect;
      
      // Get or create progress record
      let progress = await db.query.technicianOnboardingProgress.findFirst({
        where: eq(technicianOnboardingProgress.userId, user.id),
      });
      
      if (!progress) {
        const [newProgress] = await db.insert(technicianOnboardingProgress)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
          })
          .returning();
        progress = newProgress;
      }
      
      // Determine the next step
      const stepIndex = validSteps.indexOf(stepName);
      const nextStep = stepIndex < validSteps.length - 1 ? stepIndex + 2 : stepIndex + 1;
      
      // Update the step
      const updateData: any = {
        [columnName]: completed,
        currentStep: nextStep,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      
      const [updated] = await db.update(technicianOnboardingProgress)
        .set(updateData)
        .where(eq(technicianOnboardingProgress.userId, user.id))
        .returning();
      
      // Recalculate completed steps
      const stepStatus = {
        welcomeComplete: updated.welcomeComplete,
        scheduleComplete: updated.scheduleComplete,
        jobDetailsComplete: updated.jobDetailsComplete,
        imageUploadsComplete: updated.imageUploadsComplete,
        timeClockComplete: updated.timeClockComplete,
        tasksComplete: updated.tasksComplete,
        gpsNavigationComplete: updated.gpsNavigationComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      const isComplete = completedSteps === 7;
      
      // Update completed steps count and check if all complete
      await db.update(technicianOnboardingProgress)
        .set({ 
          completedSteps,
          isComplete,
          completedAt: isComplete ? new Date() : null,
        })
        .where(eq(technicianOnboardingProgress.userId, user.id));
      
      res.json({
        ...updated,
        completedSteps,
        isComplete,
        percentComplete: Math.round((completedSteps / 7) * 100),
      });
    } catch (error: any) {
      console.error('Error updating technician onboarding step:', error);
      res.status(500).json({ message: error.message || 'Failed to update step' });
    }
  });

  // Complete all steps at once (for skip all)
  app.post('/api/technician-onboarding/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Get or create progress record
      let progress = await db.query.technicianOnboardingProgress.findFirst({
        where: eq(technicianOnboardingProgress.userId, user.id),
      });
      
      if (!progress) {
        const [newProgress] = await db.insert(technicianOnboardingProgress)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
          })
          .returning();
        progress = newProgress;
      }
      
      // Mark all steps complete
      const [updated] = await db.update(technicianOnboardingProgress)
        .set({
          welcomeComplete: true,
          scheduleComplete: true,
          jobDetailsComplete: true,
          imageUploadsComplete: true,
          timeClockComplete: true,
          tasksComplete: true,
          gpsNavigationComplete: true,
          isComplete: true,
          completedSteps: 7,
          currentStep: 8,
          completedAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(technicianOnboardingProgress.userId, user.id))
        .returning();
      
      res.json({
        ...updated,
        percentComplete: 100,
      });
    } catch (error: any) {
      console.error('Error completing technician onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to complete onboarding' });
    }
  });

  // Reset onboarding progress (for retaking training)
  app.post('/api/technician-onboarding/reset', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const [updated] = await db.update(technicianOnboardingProgress)
        .set({
          welcomeComplete: false,
          scheduleComplete: false,
          jobDetailsComplete: false,
          imageUploadsComplete: false,
          timeClockComplete: false,
          tasksComplete: false,
          gpsNavigationComplete: false,
          isComplete: false,
          completedSteps: 0,
          currentStep: 1,
          completedAt: null,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(technicianOnboardingProgress.userId, user.id))
        .returning();
      
      if (!updated) {
        // Create new record if none exists
        const [newProgress] = await db.insert(technicianOnboardingProgress)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
          })
          .returning();
        return res.json({ ...newProgress, percentComplete: 0 });
      }
      
      res.json({
        ...updated,
        percentComplete: 0,
      });
    } catch (error: any) {
      console.error('Error resetting technician onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to reset onboarding' });
    }
  });
}
