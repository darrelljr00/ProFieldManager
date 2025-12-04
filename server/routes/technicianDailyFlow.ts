import { Express } from 'express';
import { requireAuth } from '../auth';
import { db } from '../db';
import { technicianDailyFlowSessions, timeClock, projects, technicianInventory, technicianInventoryTransactions, partsSupplies, vehicles, inspectionRecords, users } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function registerTechnicianDailyFlowRoutes(app: Express) {
  // Get or create today's daily flow session
  app.get('/api/technician-daily-flow', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      let session = await db.query.technicianDailyFlowSessions.findFirst({
        where: and(
          eq(technicianDailyFlowSessions.userId, user.id),
          eq(technicianDailyFlowSessions.workDate, today)
        ),
      });
      
      // If no session exists for today, create one
      if (!session) {
        const [newSession] = await db.insert(technicianDailyFlowSessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        session = newSession;
      }
      
      // Calculate completed steps count
      const stepStatus = {
        checkInComplete: session.checkInComplete,
        dailyJobsReviewed: session.dailyJobsReviewed,
        inventoryChecked: session.inventoryChecked,
        vehicleInspectionComplete: session.vehicleInspectionComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      
      // Check if user is already clocked in today
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const clockEntry = await db.query.timeClock.findFirst({
        where: and(
          eq(timeClock.userId, user.id),
          sql`${timeClock.clockInTime} >= ${todayStart}`,
          sql`${timeClock.clockInTime} <= ${todayEnd}`
        ),
      });
      
      // Auto-update check-in status if clocked in but not marked
      if (clockEntry && !session.checkInComplete) {
        const [updated] = await db.update(technicianDailyFlowSessions)
          .set({
            checkInComplete: true,
            checkInTime: clockEntry.clockInTime,
            currentStep: 2,
            completedSteps: 1,
            updatedAt: new Date(),
          })
          .where(eq(technicianDailyFlowSessions.id, session.id))
          .returning();
        session = updated;
      }
      
      res.json({
        ...session,
        completedSteps: Object.values({
          checkInComplete: session.checkInComplete,
          dailyJobsReviewed: session.dailyJobsReviewed,
          inventoryChecked: session.inventoryChecked,
          vehicleInspectionComplete: session.vehicleInspectionComplete,
        }).filter(Boolean).length,
        percentComplete: Math.round((completedSteps / 4) * 100),
        isClockedIn: !!clockEntry,
      });
    } catch (error: any) {
      console.error('Error getting daily flow session:', error);
      res.status(500).json({ message: error.message || 'Failed to get daily flow session' });
    }
  });

  // Update a specific daily flow step
  app.patch('/api/technician-daily-flow/step/:stepName', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { stepName } = req.params;
      const { completed, skipReason, inspectionId } = req.body;
      const today = getTodayDate();
      
      const validSteps = ['checkIn', 'dailyJobs', 'inventory', 'vehicleInspection'];
      
      if (!validSteps.includes(stepName)) {
        return res.status(400).json({ message: 'Invalid step name' });
      }
      
      // Get or create session
      let session = await db.query.technicianDailyFlowSessions.findFirst({
        where: and(
          eq(technicianDailyFlowSessions.userId, user.id),
          eq(technicianDailyFlowSessions.workDate, today)
        ),
      });
      
      if (!session) {
        const [newSession] = await db.insert(technicianDailyFlowSessions)
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
      
      // Build update data based on step
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
        case 'checkIn':
          updateData.checkInComplete = completed;
          if (completed) updateData.checkInTime = new Date();
          break;
        case 'dailyJobs':
          updateData.dailyJobsReviewed = completed;
          if (completed) updateData.dailyJobsReviewedAt = new Date();
          break;
        case 'inventory':
          updateData.inventoryChecked = completed;
          if (completed) updateData.inventoryCheckedAt = new Date();
          break;
        case 'vehicleInspection':
          updateData.vehicleInspectionComplete = completed;
          if (completed) {
            updateData.vehicleInspectionCompletedAt = new Date();
            if (inspectionId) updateData.vehicleInspectionId = inspectionId;
          }
          break;
      }
      
      const [updated] = await db.update(technicianDailyFlowSessions)
        .set(updateData)
        .where(eq(technicianDailyFlowSessions.id, session.id))
        .returning();
      
      // Calculate completed steps
      const stepStatus = {
        checkInComplete: updated.checkInComplete,
        dailyJobsReviewed: updated.dailyJobsReviewed,
        inventoryChecked: updated.inventoryChecked,
        vehicleInspectionComplete: updated.vehicleInspectionComplete,
      };
      
      const completedSteps = Object.values(stepStatus).filter(Boolean).length;
      const isComplete = completedSteps === 4;
      
      // Update completed status
      await db.update(technicianDailyFlowSessions)
        .set({ 
          completedSteps,
          isComplete,
          status: isComplete ? 'completed' : 'in_progress',
          completedAt: isComplete ? new Date() : null,
        })
        .where(eq(technicianDailyFlowSessions.id, session.id));
      
      res.json({
        ...updated,
        completedSteps,
        isComplete,
        percentComplete: Math.round((completedSteps / 4) * 100),
      });
    } catch (error: any) {
      console.error('Error updating daily flow step:', error);
      res.status(500).json({ message: error.message || 'Failed to update step' });
    }
  });

  // Complete all steps at once
  app.post('/api/technician-daily-flow/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      let session = await db.query.technicianDailyFlowSessions.findFirst({
        where: and(
          eq(technicianDailyFlowSessions.userId, user.id),
          eq(technicianDailyFlowSessions.workDate, today)
        ),
      });
      
      if (!session) {
        const [newSession] = await db.insert(technicianDailyFlowSessions)
          .values({ 
            userId: user.id,
            organizationId: user.organizationId,
            workDate: today,
          })
          .returning();
        session = newSession;
      }
      
      const [updated] = await db.update(technicianDailyFlowSessions)
        .set({
          checkInComplete: true,
          checkInTime: new Date(),
          dailyJobsReviewed: true,
          dailyJobsReviewedAt: new Date(),
          inventoryChecked: true,
          inventoryCheckedAt: new Date(),
          vehicleInspectionComplete: true,
          vehicleInspectionCompletedAt: new Date(),
          isComplete: true,
          status: 'completed',
          completedSteps: 4,
          currentStep: 5,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(technicianDailyFlowSessions.id, session.id))
        .returning();
      
      res.json({
        ...updated,
        percentComplete: 100,
      });
    } catch (error: any) {
      console.error('Error completing daily flow:', error);
      res.status(500).json({ message: error.message || 'Failed to complete daily flow' });
    }
  });

  // Reset today's daily flow (rare use case)
  app.post('/api/technician-daily-flow/reset', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      const [updated] = await db.update(technicianDailyFlowSessions)
        .set({
          checkInComplete: false,
          checkInTime: null,
          dailyJobsReviewed: false,
          dailyJobsReviewedAt: null,
          inventoryChecked: false,
          inventoryCheckedAt: null,
          vehicleInspectionComplete: false,
          vehicleInspectionId: null,
          vehicleInspectionCompletedAt: null,
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
          eq(technicianDailyFlowSessions.userId, user.id),
          eq(technicianDailyFlowSessions.workDate, today)
        ))
        .returning();
      
      if (!updated) {
        const [newSession] = await db.insert(technicianDailyFlowSessions)
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
      console.error('Error resetting daily flow:', error);
      res.status(500).json({ message: error.message || 'Failed to reset daily flow' });
    }
  });

  // Get today's assigned jobs for the technician
  app.get('/api/technician-daily-flow/jobs', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      // Get jobs where this user is assigned and scheduled for today
      const jobs = await db.query.projects.findMany({
        where: and(
          eq(projects.organizationId, user.organizationId),
          sql`${projects.assignedTo}::text LIKE ${'%' + user.id + '%'}`,
          sql`DATE(${projects.scheduledDate}) = ${today}`
        ),
        orderBy: [projects.scheduledDate],
      });
      
      res.json(jobs);
    } catch (error: any) {
      console.error('Error getting daily jobs:', error);
      res.status(500).json({ message: error.message || 'Failed to get daily jobs' });
    }
  });

  // ============ TECHNICIAN INVENTORY ROUTES ============

  // Get technician's inventory
  app.get('/api/technician-inventory', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const inventory = await db.query.technicianInventory.findMany({
        where: and(
          eq(technicianInventory.userId, user.id),
          eq(technicianInventory.isActive, true)
        ),
        with: {
          part: true,
          vehicle: true,
        },
      });
      
      res.json(inventory);
    } catch (error: any) {
      console.error('Error getting technician inventory:', error);
      res.status(500).json({ message: error.message || 'Failed to get inventory' });
    }
  });

  // Get all technician inventory for an organization (admin view)
  app.get('/api/technician-inventory/all', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const inventory = await db.query.technicianInventory.findMany({
        where: eq(technicianInventory.organizationId, user.organizationId),
        with: {
          part: true,
          vehicle: true,
          user: {
            columns: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      
      res.json(inventory);
    } catch (error: any) {
      console.error('Error getting all technician inventory:', error);
      res.status(500).json({ message: error.message || 'Failed to get inventory' });
    }
  });

  // Assign inventory item to technician
  app.post('/api/technician-inventory', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, partId, assignedQuantity, location, vehicleId, notes } = req.body;
      
      // Only admins/managers can assign to others; technicians can only manage their own
      const targetUserId = (user.role === 'admin' || user.role === 'manager') ? (userId || user.id) : user.id;
      
      // Check if this item is already assigned to this technician
      const existing = await db.query.technicianInventory.findFirst({
        where: and(
          eq(technicianInventory.userId, targetUserId),
          eq(technicianInventory.partId, partId)
        ),
      });
      
      if (existing) {
        // Update existing
        const [updated] = await db.update(technicianInventory)
          .set({
            assignedQuantity: (existing.assignedQuantity || 0) + (assignedQuantity || 0),
            currentQuantity: (existing.currentQuantity || 0) + (assignedQuantity || 0),
            location: location || existing.location,
            vehicleId: vehicleId || existing.vehicleId,
            notes: notes || existing.notes,
            lastRestockedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(technicianInventory.id, existing.id))
          .returning();
        
        return res.json(updated);
      }
      
      // Create new
      const [newItem] = await db.insert(technicianInventory)
        .values({
          userId: targetUserId,
          organizationId: user.organizationId,
          partId,
          assignedQuantity: assignedQuantity || 0,
          currentQuantity: assignedQuantity || 0,
          location,
          vehicleId,
          notes,
          lastRestockedAt: new Date(),
        })
        .returning();
      
      res.json(newItem);
    } catch (error: any) {
      console.error('Error assigning inventory:', error);
      res.status(500).json({ message: error.message || 'Failed to assign inventory' });
    }
  });

  // Update inventory quantity (use/restock)
  app.patch('/api/technician-inventory/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { quantity, type, projectId, notes } = req.body;
      
      const item = await db.query.technicianInventory.findFirst({
        where: eq(technicianInventory.id, parseInt(id)),
      });
      
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      
      // Only owner or admin can modify
      if (item.userId !== user.id && user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const previousQuantity = item.currentQuantity || 0;
      let newQuantity = previousQuantity;
      
      if (type === 'use') {
        newQuantity = Math.max(0, previousQuantity - quantity);
      } else if (type === 'restock') {
        newQuantity = previousQuantity + quantity;
      } else if (type === 'adjustment') {
        newQuantity = quantity;
      }
      
      const isLowStock = item.minQuantity ? newQuantity < item.minQuantity : false;
      
      const [updated] = await db.update(technicianInventory)
        .set({
          currentQuantity: newQuantity,
          isLowStock,
          lastUsedAt: type === 'use' ? new Date() : item.lastUsedAt,
          lastRestockedAt: type === 'restock' ? new Date() : item.lastRestockedAt,
          updatedAt: new Date(),
        })
        .where(eq(technicianInventory.id, item.id))
        .returning();
      
      // Record transaction
      await db.insert(technicianInventoryTransactions)
        .values({
          technicianInventoryId: item.id,
          userId: item.userId,
          organizationId: item.organizationId,
          type,
          quantity,
          previousQuantity,
          newQuantity,
          projectId,
          notes,
          performedBy: user.id,
        });
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ message: error.message || 'Failed to update inventory' });
    }
  });

  // Delete inventory assignment
  app.delete('/api/technician-inventory/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      const item = await db.query.technicianInventory.findFirst({
        where: eq(technicianInventory.id, parseInt(id)),
      });
      
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      
      // Only admin can delete
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete inventory assignments' });
      }
      
      await db.update(technicianInventory)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(technicianInventory.id, item.id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting inventory:', error);
      res.status(500).json({ message: error.message || 'Failed to delete inventory' });
    }
  });

  // Get inventory transactions history
  app.get('/api/technician-inventory/:id/transactions', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      
      const transactions = await db.query.technicianInventoryTransactions.findMany({
        where: eq(technicianInventoryTransactions.technicianInventoryId, parseInt(id)),
        orderBy: [desc(technicianInventoryTransactions.createdAt)],
        limit: 50,
      });
      
      res.json(transactions);
    } catch (error: any) {
      console.error('Error getting inventory transactions:', error);
      res.status(500).json({ message: error.message || 'Failed to get transactions' });
    }
  });
}
