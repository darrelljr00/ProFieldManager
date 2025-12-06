import { Express } from 'express';
import { requireAuth } from '../auth';
import { db } from '../db';
import { technicianEndOfDaySessions, users } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { NotificationService } from '../notificationService';

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function notifyManagersAndAdmins(
  organizationId: number,
  technicianId: number,
  technicianName: string
) {
  try {
    const managersAndAdmins = await db.query.users.findMany({
      where: and(
        eq(users.organizationId, organizationId),
        or(
          eq(users.role, 'admin'),
          eq(users.role, 'manager')
        ),
        eq(users.isActive, true)
      ),
    });

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    for (const recipient of managersAndAdmins) {
      await NotificationService.createNotification({
        type: 'end_of_day_completed',
        title: 'End of Day Completed',
        message: `${technicianName} has completed their end-of-day checklist for ${today}.`,
        userId: recipient.id,
        organizationId: organizationId,
        relatedEntityType: 'technician_end_of_day',
        relatedEntityId: technicianId,
        priority: 'normal',
        category: 'team_based',
        createdBy: technicianId,
      });
    }

    console.log(`✅ End of day completion notifications sent to ${managersAndAdmins.length} managers/admins`);
  } catch (error) {
    console.error('Error sending end of day completion notifications:', error);
  }
}

export function registerTechnicianEndOfDayRoutes(app: Express) {
  app.get('/api/technician-end-of-day', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      let session = await db.query.technicianEndOfDaySessions.findFirst({
        where: and(
          eq(technicianEndOfDaySessions.userId, user.id),
          eq(technicianEndOfDaySessions.workDate, today)
        ),
      });
      
      if (!session) {
        const [newSession] = await db.insert(technicianEndOfDaySessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        session = newSession;
      }
      
      const stepStatus = {
        vehicleCleanedComplete: session.vehicleCleanedComplete,
        toolsStoredComplete: session.toolsStoredComplete,
        postInspectionComplete: session.postInspectionComplete,
        gasCardReturnedComplete: session.gasCardReturnedComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      
      res.json({
        ...session,
        completedSteps,
        percentComplete: Math.round((completedSteps / 4) * 100),
      });
    } catch (error: any) {
      console.error('Error getting end of day session:', error);
      res.status(500).json({ message: error.message || 'Failed to get end of day session' });
    }
  });

  app.patch('/api/technician-end-of-day/step/:stepName', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { stepName } = req.params;
      const { completed, skipReason, inspectionId } = req.body;
      const today = getTodayDate();
      
      const validSteps = ['vehicleCleaned', 'toolsStored', 'postInspection', 'gasCardReturned'];
      
      if (!validSteps.includes(stepName)) {
        return res.status(400).json({ message: 'Invalid step name' });
      }
      
      let session = await db.query.technicianEndOfDaySessions.findFirst({
        where: and(
          eq(technicianEndOfDaySessions.userId, user.id),
          eq(technicianEndOfDaySessions.workDate, today)
        ),
      });
      
      if (!session) {
        const [newSession] = await db.insert(technicianEndOfDaySessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        session = newSession;
      }
      
      const stepIndex = validSteps.indexOf(stepName);
      const nextStep = stepIndex < validSteps.length - 1 ? stepIndex + 2 : stepIndex + 1;
      
      const updateData: any = {
        currentStep: nextStep,
        updatedAt: new Date(),
      };
      
      if (skipReason) {
        const currentSkipReasons = (session.skipReasons as any) || {};
        updateData.skipReasons = { ...currentSkipReasons, [stepName]: skipReason };
        const currentSkippedSteps = session.skippedSteps || [];
        if (!currentSkippedSteps.includes(stepName)) {
          updateData.skippedSteps = [...currentSkippedSteps, stepName];
        }
      }
      
      switch (stepName) {
        case 'vehicleCleaned':
          updateData.vehicleCleanedComplete = completed;
          if (completed) updateData.vehicleCleanedAt = new Date();
          break;
        case 'toolsStored':
          updateData.toolsStoredComplete = completed;
          if (completed) updateData.toolsStoredAt = new Date();
          break;
        case 'postInspection':
          updateData.postInspectionComplete = completed;
          if (completed) {
            updateData.postInspectionCompletedAt = new Date();
            if (inspectionId) updateData.postInspectionId = inspectionId;
          }
          break;
        case 'gasCardReturned':
          updateData.gasCardReturnedComplete = completed;
          if (completed) updateData.gasCardReturnedAt = new Date();
          break;
      }
      
      const [updated] = await db.update(technicianEndOfDaySessions)
        .set(updateData)
        .where(eq(technicianEndOfDaySessions.id, session.id))
        .returning();
      
      const stepStatus = {
        vehicleCleanedComplete: updated.vehicleCleanedComplete,
        toolsStoredComplete: updated.toolsStoredComplete,
        postInspectionComplete: updated.postInspectionComplete,
        gasCardReturnedComplete: updated.gasCardReturnedComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      const isComplete = completedSteps === 4;
      
      await db.update(technicianEndOfDaySessions)
        .set({ 
          completedSteps,
          isComplete,
          status: isComplete ? 'completed' : 'in_progress',
          completedAt: isComplete ? new Date() : null,
        })
        .where(eq(technicianEndOfDaySessions.id, session.id));
      
      if (isComplete) {
        const technicianName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username;
        await notifyManagersAndAdmins(user.organizationId, user.id, technicianName);
      }
      
      res.json({
        ...updated,
        completedSteps,
        isComplete,
        percentComplete: Math.round((completedSteps / 4) * 100),
      });
    } catch (error: any) {
      console.error('Error updating end of day step:', error);
      res.status(500).json({ message: error.message || 'Failed to update step' });
    }
  });

  app.post('/api/technician-end-of-day/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      let session = await db.query.technicianEndOfDaySessions.findFirst({
        where: and(
          eq(technicianEndOfDaySessions.userId, user.id),
          eq(technicianEndOfDaySessions.workDate, today)
        ),
      });
      
      if (!session) {
        const [newSession] = await db.insert(technicianEndOfDaySessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        session = newSession;
      }
      
      const [updated] = await db.update(technicianEndOfDaySessions)
        .set({
          vehicleCleanedComplete: true,
          vehicleCleanedAt: new Date(),
          toolsStoredComplete: true,
          toolsStoredAt: new Date(),
          postInspectionComplete: true,
          postInspectionCompletedAt: new Date(),
          gasCardReturnedComplete: true,
          gasCardReturnedAt: new Date(),
          isComplete: true,
          status: 'completed',
          completedSteps: 4,
          currentStep: 5,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(technicianEndOfDaySessions.id, session.id))
        .returning();
      
      const technicianName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username;
      await notifyManagersAndAdmins(user.organizationId, user.id, technicianName);
      
      res.json({
        ...updated,
        percentComplete: 100,
      });
    } catch (error: any) {
      console.error('Error completing end of day:', error);
      res.status(500).json({ message: error.message || 'Failed to complete end of day' });
    }
  });

  app.post('/api/technician-end-of-day/reset', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      const [updated] = await db.update(technicianEndOfDaySessions)
        .set({
          vehicleCleanedComplete: false,
          vehicleCleanedAt: null,
          toolsStoredComplete: false,
          toolsStoredAt: null,
          postInspectionComplete: false,
          postInspectionId: null,
          postInspectionCompletedAt: null,
          gasCardReturnedComplete: false,
          gasCardReturnedAt: null,
          isComplete: false,
          status: 'in_progress',
          completedSteps: 0,
          currentStep: 1,
          completedAt: null,
          skippedSteps: [],
          skipReasons: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(technicianEndOfDaySessions.userId, user.id),
          eq(technicianEndOfDaySessions.workDate, today)
        ))
        .returning();
      
      if (!updated) {
        const [newSession] = await db.insert(technicianEndOfDaySessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        return res.json({ ...newSession, percentComplete: 0 });
      }
      
      res.json({
        ...updated,
        percentComplete: 0,
      });
    } catch (error: any) {
      console.error('Error resetting end of day:', error);
      res.status(500).json({ message: error.message || 'Failed to reset end of day' });
    }
  });
}
