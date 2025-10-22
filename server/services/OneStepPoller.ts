import { db } from "../db";
import { vehicles, settings, obdLocationData, onestepSyncState } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface OneStepDevice {
  display_name: string; // This IS the device identifier in the API
  lat: number;
  lng: number;
  latest_accurate_dt_tracker?: string;
  device_speed?: number;
  direction?: number;
}

export class OneStepPoller {
  private pollingIntervals: Map<number, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;

  async start() {
    console.log("🚀 Starting OneStep GPS Poller...");
    
    const orgsWithGPS = await db
      .select({ organizationId: settings.organizationId })
      .from(settings)
      .where(
        and(
          eq(settings.key, "oneStepGpsApiKey"),
          sql`${settings.value} IS NOT NULL AND ${settings.value} != ''`
        )
      )
      .groupBy(settings.organizationId);

    for (const org of orgsWithGPS) {
      if (org.organizationId) {
        await this.startPollingForOrganization(org.organizationId);
      }
    }

    console.log(`✅ Poller started for ${orgsWithGPS.length} organizations`);
  }

  async startPollingForOrganization(organizationId: number) {
    if (this.pollingIntervals.has(organizationId)) {
      console.log(`⚠️  Org ${organizationId} already polling`);
      return;
    }

    const jitter = Math.random() * 10000;
    const interval = 30000 + jitter;

    const pollInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.pollOrganization(organizationId);
      }
    }, interval);

    this.pollingIntervals.set(organizationId, pollInterval);
    
    await this.pollOrganization(organizationId);
    
    console.log(`🔄 Polling started for org ${organizationId} (${Math.round(interval/1000)}s interval)`);
  }

  private async pollOrganization(organizationId: number) {
    try {
      const canPoll = await this.acquireLock(organizationId);
      if (!canPoll) {
        return;
      }

      const apiKeySetting = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.organizationId, organizationId),
            eq(settings.key, "oneStepGpsApiKey")
          )
        )
        .limit(1);

      if (!apiKeySetting.length || !apiKeySetting[0].value) {
        await this.releaseLock(organizationId, "error", "API key not configured");
        return;
      }

      const apiKey = apiKeySetting[0].value;
      
      const response = await fetch(
        `https://track.onestepgps.com/v3/api/public/device-info?lat_lng=1&device_speed=1&direction=1&api-key=${apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        await this.releaseLock(organizationId, "error", `API error: ${response.statusText}`);
        return;
      }

      const devices: OneStepDevice[] = await response.json();
      console.log(`📡 OneStep API returned ${devices.length} devices for org ${organizationId}`);
      
      const mappedVehicles = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.oneStepGpsEnabled, true),
            sql`${vehicles.oneStepGpsDeviceId} IS NOT NULL`
          )
        );

      let pingsStored = 0;

      for (const vehicle of mappedVehicles) {
        const device = devices.find(
          (d) => d.display_name === vehicle.oneStepGpsDeviceId
        );

        if (!device) {
          console.log(`⚠️  No device found for vehicle ${vehicle.id} with device ID: ${vehicle.oneStepGpsDeviceId}`);
          continue;
        }

        if (!device.lat || !device.lng) {
          console.log(`⚠️  Device ${device.display_name} has no location data`);
          continue;
        }

        try {
          const timestamp = device.latest_accurate_dt_tracker 
            ? new Date(device.latest_accurate_dt_tracker)
            : new Date();

          await db.insert(obdLocationData).values({
            organizationId,
            vehicleId: vehicle.id,
            deviceId: device.display_name,
            latitude: device.lat.toString(),
            longitude: device.lng.toString(),
            speed: device.device_speed?.toString() ?? "0",
            heading: device.direction?.toString() ?? "0",
            timestamp,
          } as any).onConflictDoNothing();

          pingsStored++;
        } catch (error: any) {
          console.error(`Error storing ping for vehicle ${vehicle.id}:`, error.message);
        }
      }

      await this.releaseLock(organizationId, "idle", null, pingsStored);

    } catch (error: any) {
      console.error(`Poll error for org ${organizationId}:`, error.message);
      await this.releaseLock(organizationId, "error", error.message);
    }
  }

  private async acquireLock(organizationId: number): Promise<boolean> {
    try {
      const existing = await db
        .select()
        .from(onestepSyncState)
        .where(eq(onestepSyncState.organizationId, organizationId))
        .limit(1);

      const now = new Date();
      
      if (existing.length) {
        const lastUpdate = existing[0].updatedAt;
        const lockTimeout = 2 * 60 * 1000;
        
        if (
          existing[0].syncStatus === "syncing" &&
          lastUpdate &&
          now.getTime() - new Date(lastUpdate).getTime() < lockTimeout
        ) {
          return false;
        }

        await db
          .update(onestepSyncState)
          .set({
            syncStatus: "syncing" as any,
            updatedAt: now,
            lastSyncTimestamp: now,
          } as any)
          .where(eq(onestepSyncState.id, existing[0].id));
      } else {
        await db.insert(onestepSyncState).values({
          organizationId,
          vehicleId: null,
          syncStatus: "syncing" as any,
          lastSyncTimestamp: now,
          tripsImported: 0,
        } as any);
      }

      return true;
    } catch (error) {
      console.error("Lock acquisition error:", error);
      return false;
    }
  }

  private async releaseLock(
    organizationId: number,
    status: string,
    errorMessage: string | null,
    pingsStored?: number
  ) {
    try {
      const updateData: any = {
        syncStatus: status,
        updatedAt: new Date(),
      };

      if (status === "idle") {
        updateData.lastSuccessfulSync = new Date();
        updateData.errorMessage = null;
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await db
        .update(onestepSyncState)
        .set(updateData)
        .where(eq(onestepSyncState.organizationId, organizationId));

      if (pingsStored && pingsStored > 0) {
        console.log(`📍 Stored ${pingsStored} GPS pings for org ${organizationId}`);
      }
    } catch (error) {
      console.error("Lock release error:", error);
    }
  }

  stop() {
    console.log("🛑 Stopping OneStep GPS Poller...");
    this.isShuttingDown = true;
    
    Array.from(this.pollingIntervals.entries()).forEach(([orgId, interval]) => {
      clearInterval(interval);
      console.log(`   Stopped polling for org ${orgId}`);
    });
    
    this.pollingIntervals.clear();
    console.log("✅ Poller stopped");
  }
}
