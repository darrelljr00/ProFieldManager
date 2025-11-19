import { db } from "../db";
import { obdLocationData, obdTrips, vehicles } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { haversineDistance, calculateSpeed, isSignificantMovement } from "../utils/gps";

interface LocationPoint {
  id: number;
  vehicleId: number;
  deviceId: string;
  latitude: string;
  longitude: string;
  speed: number;
  heading: number;
  timestamp: Date;
}

export class TripBuilder {
  private readonly TRIP_START_SPEED_MPH = 3;
  private readonly TRIP_START_MIN_DISTANCE_MILES = 0.093; // 150 meters (~490 feet)
  private readonly TRIP_END_IDLE_MINUTES = 10;
  private readonly MIN_CONSECUTIVE_POINTS = 2;

  async processLocationPings(organizationId: number) {
    try {
      const enabledVehicles = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.oneStepGpsEnabled, true)
          )
        );

      for (const vehicle of enabledVehicles) {
        await this.processVehiclePings(organizationId, vehicle.id);
      }
    } catch (error: any) {
      console.error(`Error processing trips for org ${organizationId}:`, error.message);
    }
  }

  private async processVehiclePings(organizationId: number, vehicleId: number) {
    const BATCH_SIZE = 100;
    let processedCount = 0;

    while (true) {
      const activeTrip = await db
        .select()
        .from(obdTrips)
        .where(
          and(
            eq(obdTrips.organizationId, organizationId),
            eq(obdTrips.vehicleId, vehicleId),
            eq(obdTrips.status, "active")
          )
        )
        .orderBy(desc(obdTrips.startTime))
        .limit(1);

      const lastProcessedTime = activeTrip.length
        ? new Date(activeTrip[0].endTime || activeTrip[0].startTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const newPings = await db
        .select()
        .from(obdLocationData)
        .where(
          and(
            eq(obdLocationData.organizationId, organizationId),
            eq(obdLocationData.vehicleId, vehicleId),
            sql`${obdLocationData.timestamp} > ${lastProcessedTime}`
          )
        )
        .orderBy(obdLocationData.timestamp)
        .limit(BATCH_SIZE);

      if (newPings.length === 0) break;

      if (activeTrip.length > 0) {
        await this.updateActiveTrip(activeTrip[0], newPings as any[]);
      } else {
        await this.detectAndCreateTrip(organizationId, vehicleId, newPings as any[]);
      }

      processedCount += newPings.length;

      // If we got fewer pings than the batch size, we're done
      if (newPings.length < BATCH_SIZE) break;
    }

    if (processedCount > 0) {
      console.log(`📊 Processed ${processedCount} pings for vehicle ${vehicleId}`);
    }
  }

  private async updateActiveTrip(trip: any, newPings: LocationPoint[]) {
    let totalDistance = parseFloat(trip.distanceMiles || "0");
    let lastLat = parseFloat(trip.endLatitude);
    let lastLng = parseFloat(trip.endLongitude);
    let lastTimestamp = new Date(trip.endTime || trip.startTime);
    let maxSpeed = parseFloat(trip.maxSpeed || "0");
    let movingPoints = 0;

    for (const ping of newPings) {
      const lat = parseFloat(ping.latitude);
      const lng = parseFloat(ping.longitude);
      const timestamp = new Date(ping.timestamp);

      const distance = haversineDistance(lastLat, lastLng, lat, lng);
      const speed = calculateSpeed(lastLat, lastLng, lastTimestamp, lat, lng, timestamp);

      if (isSignificantMovement(distance, speed)) {
        totalDistance += distance;
        movingPoints++;
        
        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
        
        lastLat = lat;
        lastLng = lng;
        lastTimestamp = timestamp;
      }

      const timeSinceLastMove = (timestamp.getTime() - lastTimestamp.getTime()) / (1000 * 60);
      
      if (timeSinceLastMove > this.TRIP_END_IDLE_MINUTES) {
        const duration = Math.round(
          (lastTimestamp.getTime() - new Date(trip.startTime).getTime()) / (1000 * 60)
        );
        const avgSpeed = duration > 0 ? (totalDistance / (duration / 60)) : 0;

        await db
          .update(obdTrips)
          .set({
            endTime: lastTimestamp,
            endLatitude: lastLat.toString(),
            endLongitude: lastLng.toString(),
            distanceMiles: totalDistance.toFixed(2),
            durationMinutes: duration,
            averageSpeed: avgSpeed.toFixed(2),
            maxSpeed: maxSpeed.toFixed(2),
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(obdTrips.id, trip.id));

        console.log(`🏁 Trip completed: ${totalDistance.toFixed(2)} miles, ${duration} min`);
        
        await this.detectAndCreateTrip(
          trip.organizationId,
          trip.vehicleId,
          newPings.slice(newPings.indexOf(ping) + 1)
        );
        return;
      }
    }

    if (movingPoints > 0) {
      const duration = Math.round(
        (lastTimestamp.getTime() - new Date(trip.startTime).getTime()) / (1000 * 60)
      );
      const avgSpeed = duration > 0 ? (totalDistance / (duration / 60)) : 0;

      await db
        .update(obdTrips)
        .set({
          endTime: lastTimestamp,
          endLatitude: lastLat.toString(),
          endLongitude: lastLng.toString(),
          distanceMiles: totalDistance.toFixed(2),
          durationMinutes: duration,
          averageSpeed: avgSpeed.toFixed(2),
          maxSpeed: maxSpeed.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(obdTrips.id, trip.id));
    }
  }

  private async detectAndCreateTrip(
    organizationId: number,
    vehicleId: number,
    pings: LocationPoint[]
  ) {
    if (pings.length < this.MIN_CONSECUTIVE_POINTS) return;

    for (let i = 0; i < pings.length - 1; i++) {
      const ping1 = pings[i];
      const ping2 = pings[i + 1];

      const lat1 = parseFloat(ping1.latitude);
      const lng1 = parseFloat(ping1.longitude);
      const lat2 = parseFloat(ping2.latitude);
      const lng2 = parseFloat(ping2.longitude);

      const distance = haversineDistance(lat1, lng1, lat2, lng2);
      const speed = calculateSpeed(
        lat1,
        lng1,
        new Date(ping1.timestamp),
        lat2,
        lng2,
        new Date(ping2.timestamp)
      );

      if (
        distance >= this.TRIP_START_MIN_DISTANCE_MILES &&
        speed >= this.TRIP_START_SPEED_MPH
      ) {
        const existingTrip = await db
          .select()
          .from(obdTrips)
          .where(
            and(
              eq(obdTrips.vehicleId, vehicleId),
              eq(obdTrips.startTime, new Date(ping1.timestamp))
            )
          )
          .limit(1);

        if (existingTrip.length > 0) {
          console.log(`⏭️  Skipping duplicate trip for vehicle ${vehicleId}`);
          return;
        }

        await db.insert(obdTrips).values({
          organizationId,
          vehicleId,
          deviceId: ping1.deviceId,
          provider: "onestep",
          startTime: new Date(ping1.timestamp),
          endTime: new Date(ping2.timestamp),
          startLatitude: lat1.toString(),
          startLongitude: lng1.toString(),
          endLatitude: lat2.toString(),
          endLongitude: lng2.toString(),
          distanceMiles: distance.toFixed(2),
          durationMinutes: Math.round(
            (new Date(ping2.timestamp).getTime() - new Date(ping1.timestamp).getTime()) / (1000 * 60)
          ),
          averageSpeed: speed.toFixed(2),
          maxSpeed: speed.toFixed(2),
          status: "active",
        });

        console.log(`🚗 New trip started for vehicle ${vehicleId}: ${speed.toFixed(1)} mph`);
        
        await this.updateActiveTrip(
          await db
            .select()
            .from(obdTrips)
            .where(
              and(
                eq(obdTrips.vehicleId, vehicleId),
                eq(obdTrips.status, "active")
              )
            )
            .orderBy(desc(obdTrips.startTime))
            .limit(1)
            .then(trips => trips[0]),
          pings.slice(i + 2)
        );
        return;
      }
    }
  }

  async runTripBuilder() {
    const orgsWithEnabledVehicles = await db
      .select({ organizationId: vehicles.organizationId })
      .from(vehicles)
      .where(eq(vehicles.oneStepGpsEnabled, true))
      .groupBy(vehicles.organizationId);

    for (const org of orgsWithEnabledVehicles) {
      await this.processLocationPings(org.organizationId);
    }
  }
}
