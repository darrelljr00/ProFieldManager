// Customer ETA Settings API Routes
import { Router } from 'express';
import { db } from './db';
import { customerEtaSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from './auth';

const router = Router();

// Get customer ETA settings
router.get("/api/settings/customer-eta", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = req.user!;
    const [settings] = await db
      .select()
      .from(customerEtaSettings)
      .where(eq(customerEtaSettings.organizationId, user.organizationId))
      .limit(1);
    
    // Return default settings if none exist
    res.json(settings || {
      enabled: false,
      notifyMinutesBeforeArrival: 15,
      trackingEnabled: true,
      smsTemplate: "Hi {customerName}, {technicianName} from {companyName} is about {estimatedMinutes} minutes away from your location at {address}. Track their arrival: {trackingLink}"
    });
  } catch (error: any) {
    console.error("Error fetching customer ETA settings:", error);
    res.status(500).json({ message: "Failed to fetch customer ETA settings" });
  }
});

// Update customer ETA settings
router.put("/api/settings/customer-eta", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = req.user!;
    const { enabled, notifyMinutesBeforeArrival, trackingEnabled, smsTemplate } = req.body;

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(customerEtaSettings)
      .where(eq(customerEtaSettings.organizationId, user.organizationId))
      .limit(1);

    if (existing) {
      // Update existing settings
      await db
        .update(customerEtaSettings)
        .set({
          enabled,
          notifyMinutesBeforeArrival,
          trackingEnabled,
          smsTemplate,
          updatedAt: new Date(),
        })
        .where(eq(customerEtaSettings.organizationId, user.organizationId));
    } else {
      // Create new settings
      await db.insert(customerEtaSettings).values({
        organizationId: user.organizationId,
        enabled,
        notifyMinutesBeforeArrival,
        trackingEnabled,
        smsTemplate,
      });
    }

    res.json({ message: "Customer ETA settings updated successfully" });
  } catch (error: any) {
    console.error("Error updating customer ETA settings:", error);
    res.status(500).json({ message: "Failed to update customer ETA settings" });
  }
});

export default router;
