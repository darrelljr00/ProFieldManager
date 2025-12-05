import { Express } from 'express';
import { requireAuth, requireManagerOrAdmin } from '../auth';
import { db } from '../db';
import { 
  technicianInventory, 
  technicianInventoryTransactions,
  dailyInventoryVerifications,
  partsSupplies, 
  vehicles, 
  users,
  technicianDailyFlowSessions
} from '@shared/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function registerTechnicianInventoryRoutes(app: Express) {
  
  // ========== TECHNICIAN INVENTORY ROUTES ==========
  
  // Get technician's own inventory
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
        orderBy: [desc(technicianInventory.updatedAt)],
      });
      
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching technician inventory:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  // Get transactions for a specific inventory item
  app.get('/api/technician-inventory/:id/transactions', requireAuth, async (req, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      
      const transactions = await db.query.technicianInventoryTransactions.findMany({
        where: eq(technicianInventoryTransactions.technicianInventoryId, inventoryId),
        orderBy: [desc(technicianInventoryTransactions.createdAt)],
      });
      
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // Update inventory (use, restock, etc.)
  app.patch('/api/technician-inventory/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const inventoryId = parseInt(req.params.id);
      const { type, quantity, notes } = req.body;
      
      // Get current inventory item
      const item = await db.query.technicianInventory.findFirst({
        where: eq(technicianInventory.id, inventoryId),
      });
      
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      
      // Calculate new quantity based on transaction type
      let newQuantity = item.currentQuantity;
      if (type === 'use') {
        newQuantity = Math.max(0, item.currentQuantity - quantity);
      } else if (type === 'restock' || type === 'return') {
        newQuantity = item.currentQuantity + quantity;
      } else if (type === 'adjustment') {
        newQuantity = quantity;
      }
      
      // Check if low stock
      const isLowStock = item.minQuantity ? newQuantity <= item.minQuantity : false;
      
      // Update inventory
      const [updated] = await db.update(technicianInventory)
        .set({
          currentQuantity: newQuantity,
          isLowStock,
          lastUsedAt: type === 'use' ? new Date() : item.lastUsedAt,
          lastRestockedAt: type === 'restock' ? new Date() : item.lastRestockedAt,
          updatedAt: new Date(),
        })
        .where(eq(technicianInventory.id, inventoryId))
        .returning();
      
      // Create transaction record
      await db.insert(technicianInventoryTransactions).values({
        technicianInventoryId: inventoryId,
        userId: user.id,
        organizationId: user.organizationId,
        type,
        quantity,
        previousQuantity: item.currentQuantity,
        newQuantity,
        notes,
        performedBy: user.id,
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ message: 'Failed to update inventory' });
    }
  });

  // ========== ADMIN INVENTORY ASSIGNMENT ROUTES ==========
  
  // Get all technician inventory assignments (admin/manager)
  app.get('/api/admin/technician-inventory', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      
      const inventory = await db.query.technicianInventory.findMany({
        where: eq(technicianInventory.organizationId, user.organizationId),
        with: {
          part: true,
          vehicle: true,
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: [desc(technicianInventory.updatedAt)],
      });
      
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching admin technician inventory:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  // Get technicians list for assignment
  app.get('/api/admin/technicians', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      
      const technicians = await db.query.users.findMany({
        where: and(
          eq(users.organizationId, user.organizationId),
          eq(users.isActive, true),
          or(
            eq(users.role, 'technician'),
            eq(users.role, 'user')
          )
        ),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          role: true,
        },
      });
      
      res.json(technicians);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      res.status(500).json({ message: 'Failed to fetch technicians' });
    }
  });

  // Assign inventory to technician or vehicle
  app.post('/api/admin/technician-inventory', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      const { userId, partId, vehicleId, assignedQuantity, minQuantity, location, notes } = req.body;
      
      // Check if assignment already exists
      const existing = await db.query.technicianInventory.findFirst({
        where: and(
          eq(technicianInventory.userId, userId),
          eq(technicianInventory.partId, partId)
        ),
      });
      
      if (existing) {
        // Update existing assignment
        const [updated] = await db.update(technicianInventory)
          .set({
            assignedQuantity: assignedQuantity,
            currentQuantity: assignedQuantity,
            minQuantity: minQuantity || 0,
            vehicleId: vehicleId || null,
            location: location || null,
            notes: notes || null,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(technicianInventory.id, existing.id))
          .returning();
        
        return res.json(updated);
      }
      
      // Create new assignment
      const [newAssignment] = await db.insert(technicianInventory)
        .values({
          userId,
          organizationId: user.organizationId,
          partId,
          vehicleId: vehicleId || null,
          assignedQuantity: assignedQuantity || 0,
          currentQuantity: assignedQuantity || 0,
          minQuantity: minQuantity || 0,
          location: location || null,
          notes: notes || null,
          isActive: true,
        })
        .returning();
      
      res.json(newAssignment);
    } catch (error) {
      console.error('Error assigning inventory:', error);
      res.status(500).json({ message: 'Failed to assign inventory' });
    }
  });

  // Update inventory assignment
  app.put('/api/admin/technician-inventory/:id', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { assignedQuantity, currentQuantity, minQuantity, vehicleId, location, notes, isActive } = req.body;
      
      const [updated] = await db.update(technicianInventory)
        .set({
          assignedQuantity,
          currentQuantity,
          minQuantity,
          vehicleId: vehicleId || null,
          location: location || null,
          notes: notes || null,
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(technicianInventory.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating inventory assignment:', error);
      res.status(500).json({ message: 'Failed to update assignment' });
    }
  });

  // Delete inventory assignment
  app.delete('/api/admin/technician-inventory/:id', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await db.delete(technicianInventory)
        .where(eq(technicianInventory.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting inventory assignment:', error);
      res.status(500).json({ message: 'Failed to delete assignment' });
    }
  });

  // Bulk assign inventory to multiple technicians
  app.post('/api/admin/technician-inventory/bulk-assign', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      const { partId, userIds, vehicleId, assignedQuantity, minQuantity } = req.body;
      
      const results = [];
      
      for (const userId of userIds) {
        const existing = await db.query.technicianInventory.findFirst({
          where: and(
            eq(technicianInventory.userId, userId),
            eq(technicianInventory.partId, partId)
          ),
        });
        
        if (existing) {
          const [updated] = await db.update(technicianInventory)
            .set({
              assignedQuantity,
              currentQuantity: assignedQuantity,
              minQuantity: minQuantity || 0,
              vehicleId: vehicleId || null,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(technicianInventory.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [newAssignment] = await db.insert(technicianInventory)
            .values({
              userId,
              organizationId: user.organizationId,
              partId,
              vehicleId: vehicleId || null,
              assignedQuantity: assignedQuantity || 0,
              currentQuantity: assignedQuantity || 0,
              minQuantity: minQuantity || 0,
              isActive: true,
            })
            .returning();
          results.push(newAssignment);
        }
      }
      
      res.json({ success: true, count: results.length, assignments: results });
    } catch (error) {
      console.error('Error bulk assigning inventory:', error);
      res.status(500).json({ message: 'Failed to bulk assign inventory' });
    }
  });

  // ========== DAILY INVENTORY VERIFICATION ROUTES ==========
  
  // Get today's inventory verification status
  app.get('/api/daily-inventory-verification', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      let verification = await db.query.dailyInventoryVerifications.findFirst({
        where: and(
          eq(dailyInventoryVerifications.userId, user.id),
          eq(dailyInventoryVerifications.verificationDate, today)
        ),
      });
      
      // Get user's inventory for verification
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
      
      res.json({
        verification,
        inventory,
        totalItems: inventory.length,
        isComplete: verification?.isComplete || false,
      });
    } catch (error) {
      console.error('Error fetching daily inventory verification:', error);
      res.status(500).json({ message: 'Failed to fetch verification status' });
    }
  });

  // Submit daily inventory verification
  app.post('/api/daily-inventory-verification', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      const { verificationDetails, notes, photoUrls, vehicleId } = req.body;
      
      // Calculate verification stats
      const details = verificationDetails || [];
      const itemsChecked = details.length;
      const discrepancyCount = details.filter((d: any) => d.expectedQty !== d.actualQty).length;
      const status = discrepancyCount > 0 ? 'discrepancy' : 'verified';
      
      // Get user's total inventory count
      const inventory = await db.query.technicianInventory.findMany({
        where: and(
          eq(technicianInventory.userId, user.id),
          eq(technicianInventory.isActive, true)
        ),
      });
      
      // Check if verification exists for today
      const existing = await db.query.dailyInventoryVerifications.findFirst({
        where: and(
          eq(dailyInventoryVerifications.userId, user.id),
          eq(dailyInventoryVerifications.verificationDate, today)
        ),
      });
      
      let verification;
      
      if (existing) {
        [verification] = await db.update(dailyInventoryVerifications)
          .set({
            status,
            isComplete: true,
            completedAt: new Date(),
            itemsChecked,
            totalItems: inventory.length,
            discrepancyCount,
            verificationDetails: details,
            photoUrls: photoUrls || null,
            notes: notes || null,
            vehicleId: vehicleId || null,
            updatedAt: new Date(),
          })
          .where(eq(dailyInventoryVerifications.id, existing.id))
          .returning();
      } else {
        [verification] = await db.insert(dailyInventoryVerifications)
          .values({
            userId: user.id,
            organizationId: user.organizationId,
            verificationDate: today,
            status,
            isComplete: true,
            completedAt: new Date(),
            itemsChecked,
            totalItems: inventory.length,
            discrepancyCount,
            verificationDetails: details,
            photoUrls: photoUrls || null,
            notes: notes || null,
            vehicleId: vehicleId || null,
          })
          .returning();
      }
      
      // Update daily flow session if exists
      const dailyFlowSession = await db.query.technicianDailyFlowSessions.findFirst({
        where: and(
          eq(technicianDailyFlowSessions.userId, user.id),
          eq(technicianDailyFlowSessions.workDate, today)
        ),
      });
      
      if (dailyFlowSession && !dailyFlowSession.inventoryChecked) {
        await db.update(technicianDailyFlowSessions)
          .set({
            inventoryChecked: true,
            inventoryCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(technicianDailyFlowSessions.id, dailyFlowSession.id));
        
        // Also update the verification with the daily flow session ID
        await db.update(dailyInventoryVerifications)
          .set({
            dailyFlowSessionId: dailyFlowSession.id,
          })
          .where(eq(dailyInventoryVerifications.id, verification.id));
      }
      
      // Update actual inventory quantities based on verification if there are discrepancies
      for (const detail of details) {
        if (detail.expectedQty !== detail.actualQty && detail.partId) {
          const inventoryItem = await db.query.technicianInventory.findFirst({
            where: and(
              eq(technicianInventory.userId, user.id),
              eq(technicianInventory.partId, detail.partId)
            ),
          });
          
          if (inventoryItem) {
            await db.update(technicianInventory)
              .set({
                currentQuantity: detail.actualQty,
                updatedAt: new Date(),
              })
              .where(eq(technicianInventory.id, inventoryItem.id));
            
            // Create adjustment transaction
            await db.insert(technicianInventoryTransactions).values({
              technicianInventoryId: inventoryItem.id,
              userId: user.id,
              organizationId: user.organizationId,
              type: 'adjustment',
              quantity: Math.abs(detail.actualQty - detail.expectedQty),
              previousQuantity: inventoryItem.currentQuantity,
              newQuantity: detail.actualQty,
              notes: `Daily verification adjustment: ${detail.notes || 'No notes'}`,
              performedBy: user.id,
            });
          }
        }
      }
      
      res.json(verification);
    } catch (error) {
      console.error('Error submitting inventory verification:', error);
      res.status(500).json({ message: 'Failed to submit verification' });
    }
  });

  // Admin: Get all daily verifications
  app.get('/api/admin/daily-inventory-verifications', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      const { date, userId } = req.query;
      
      let whereClause = eq(dailyInventoryVerifications.organizationId, user.organizationId);
      
      if (date) {
        whereClause = and(
          whereClause,
          eq(dailyInventoryVerifications.verificationDate, date as string)
        ) as any;
      }
      
      if (userId) {
        whereClause = and(
          whereClause,
          eq(dailyInventoryVerifications.userId, parseInt(userId as string))
        ) as any;
      }
      
      const verifications = await db.query.dailyInventoryVerifications.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          vehicle: true,
        },
        orderBy: [desc(dailyInventoryVerifications.verificationDate)],
      });
      
      res.json(verifications);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      res.status(500).json({ message: 'Failed to fetch verifications' });
    }
  });

  // Admin: Get verification summary for today
  app.get('/api/admin/daily-inventory-summary', requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const user = req.user!;
      const today = getTodayDate();
      
      // Get all technicians with inventory
      const techniciansWithInventory = await db.query.technicianInventory.findMany({
        where: eq(technicianInventory.organizationId, user.organizationId),
        columns: {
          userId: true,
        },
      });
      
      const uniqueUserIds = [...new Set(techniciansWithInventory.map(t => t.userId))];
      
      // Get today's verifications
      const verifications = await db.query.dailyInventoryVerifications.findMany({
        where: and(
          eq(dailyInventoryVerifications.organizationId, user.organizationId),
          eq(dailyInventoryVerifications.verificationDate, today)
        ),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      
      const completedUserIds = verifications.filter(v => v.isComplete).map(v => v.userId);
      const pendingUserIds = uniqueUserIds.filter(id => !completedUserIds.includes(id));
      
      res.json({
        date: today,
        totalTechnicians: uniqueUserIds.length,
        completed: completedUserIds.length,
        pending: pendingUserIds.length,
        discrepancies: verifications.filter(v => v.status === 'discrepancy').length,
        verifications,
      });
    } catch (error) {
      console.error('Error fetching verification summary:', error);
      res.status(500).json({ message: 'Failed to fetch summary' });
    }
  });
}
