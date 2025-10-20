import { db } from "../db";
import { obdTrips, onestepSyncState, vehicles, settings } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import axios, { AxiosInstance } from "axios";

interface OneStepTrip {
  id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  start_address?: string;
  end_address?: string;
  distance_miles: number;
  duration_minutes: number;
  avg_speed_mph: number;
  max_speed_mph: number;
  status: string;
}

interface OneStepApiResponse {
  data: OneStepTrip[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

export class OneStepGPSService {
  private client: AxiosInstance;
  private apiKey: string;
  private organizationId: number;

  constructor(apiKey: string, organizationId: number) {
    this.apiKey = apiKey;
    this.organizationId = organizationId;

    this.client = axios.create({
      baseURL: "https://track.onestepgps.com/v3",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  static async fromOrganization(organizationId: number): Promise<OneStepGPSService | null> {
    const settingsRecord = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.organizationId, organizationId),
          eq(settings.key, "oneStepGpsApiKey")
        )
      )
      .limit(1);

    if (!settingsRecord.length || !settingsRecord[0].value) {
      return null;
    }

    return new OneStepGPSService(settingsRecord[0].value, organizationId);
  }

  async fetchTrips(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OneStepTrip[]> {
    try {
      const response = await this.client.get<OneStepApiResponse>("/trips", {
        params: {
          device_id: deviceId,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          per_page: 200,
        },
      });

      return response.data.data || [];
    } catch (error: any) {
      if (error.response?.status === 429) {
        await this.sleep(5000);
        return this.fetchTrips(deviceId, startDate, endDate);
      }
      throw error;
    }
  }

  async syncVehicleTrips(vehicleId: number, daysBack: number = 30): Promise<number> {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, this.organizationId)))
      .limit(1);

    if (!vehicle.length || !vehicle[0].oneStepGpsDeviceId || !vehicle[0].oneStepGpsEnabled) {
      throw new Error("Vehicle not configured for OneStep GPS");
    }

    const deviceId = vehicle[0].oneStepGpsDeviceId;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    await this.updateSyncState(vehicleId, "syncing");

    try {
      const trips = await this.fetchTrips(deviceId, startDate, endDate);
      let imported = 0;

      for (const trip of trips) {
        const mapped = this.mapTrip(trip, vehicleId);
        
        const existing = await db
          .select()
          .from(obdTrips)
          .where(
            and(
              eq(obdTrips.provider, "onestep"),
              eq(obdTrips.externalTripId, trip.id)
            )
          )
          .limit(1);

        if (!existing.length) {
          await db.insert(obdTrips).values(mapped);
          imported++;
        }
      }

      await this.updateSyncState(vehicleId, "idle", imported);
      return imported;
    } catch (error: any) {
      await this.updateSyncState(vehicleId, "error", 0, error.message);
      throw error;
    }
  }

  private mapTrip(trip: OneStepTrip, vehicleId: number) {
    return {
      organizationId: this.organizationId,
      vehicleId,
      deviceId: trip.device_id,
      externalTripId: trip.id,
      provider: "onestep" as const,
      startTime: new Date(trip.start_time),
      endTime: trip.end_time ? new Date(trip.end_time) : undefined,
      startLatitude: trip.start_lat?.toString(),
      startLongitude: trip.start_lng?.toString(),
      endLatitude: trip.end_lat?.toString(),
      endLongitude: trip.end_lng?.toString(),
      startLocation: trip.start_address,
      endLocation: trip.end_address,
      distanceMiles: trip.distance_miles?.toString(),
      durationMinutes: trip.duration_minutes,
      averageSpeed: trip.avg_speed_mph?.toString(),
      maxSpeed: trip.max_speed_mph?.toString(),
      status: trip.status === "completed" ? "completed" : "active",
    };
  }

  private async updateSyncState(
    vehicleId: number,
    status: string,
    tripsImported?: number,
    errorMessage?: string
  ) {
    const existing = await db
      .select()
      .from(onestepSyncState)
      .where(
        and(
          eq(onestepSyncState.vehicleId, vehicleId),
          eq(onestepSyncState.organizationId, this.organizationId)
        )
      )
      .limit(1);

    const updateData: any = {
      syncStatus: status,
      lastSyncTimestamp: new Date(),
      updatedAt: new Date(),
    };

    if (status === "idle" && tripsImported !== undefined) {
      updateData.lastSuccessfulSync = new Date();
      updateData.tripsImported = sql`${onestepSyncState.tripsImported} + ${tripsImported}`;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (existing.length) {
      await db
        .update(onestepSyncState)
        .set(updateData)
        .where(eq(onestepSyncState.id, existing[0].id));
    } else {
      await db.insert(onestepSyncState).values({
        organizationId: this.organizationId,
        vehicleId,
        ...updateData,
        tripsImported: tripsImported || 0,
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
