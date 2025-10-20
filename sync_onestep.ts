import { db } from "./server/db";
import { vehicles, settings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { OneStepGPSService } from "./server/integrations/onestep";

async function syncOneStepGPS() {
  try {
    console.log("🚗 Starting OneStep GPS sync...");
    
    // Get Texas Power Wash organization (ID 2)
    const organizationId = 2;
    
    // Create service
    const service = await OneStepGPSService.fromOrganization(organizationId);
    if (!service) {
      console.error("❌ OneStep GPS API key not found");
      return;
    }
    
    console.log("✅ OneStep GPS service initialized");
    
    // Fetch devices from OneStep GPS
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
    
    if (!apiKeySetting.length) {
      console.error("❌ API key not found");
      return;
    }
    
    const apiKey = apiKeySetting[0].value;
    console.log("🔑 API key retrieved");
    
    // Fetch device data from OneStep GPS API
    const response = await fetch(
      `https://track.onestepgps.com/v3/api/public/device-info?lat_lng=1&api-key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error(`❌ OneStep GPS API error: ${response.statusText}`);
      return;
    }
    
    const devices = await response.json();
    console.log(`📱 Found ${devices.length} devices:`, devices.map((d: any) => ({
      id: d.device_id,
      name: d.display_name
    })));
    
    // Get Isuzu vehicles
    const isuzuVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.organizationId, organizationId)
        )
      );
    
    console.log(`🚚 Found ${isuzuVehicles.length} vehicles in system`);
    
    // Auto-map first two devices to Isuzu vehicles
    if (devices.length >= 2 && isuzuVehicles.length >= 2) {
      const boxTruck = isuzuVehicles.find(v => v.id === 11);
      const flatbed = isuzuVehicles.find(v => v.id === 12);
      
      if (boxTruck && devices[0]) {
        console.log(`🔗 Mapping ${devices[0].display_name} (${devices[0].device_id}) to ${boxTruck.vehicleNumber}`);
        await db
          .update(vehicles)
          .set({ 
            oneStepGpsDeviceId: devices[0].device_id,
            oneStepGpsEnabled: true 
          })
          .where(eq(vehicles.id, boxTruck.id));
        
        console.log(`🔄 Syncing trips for ${boxTruck.vehicleNumber}...`);
        const imported = await service.syncVehicleTrips(boxTruck.id, 30);
        console.log(`✅ Imported ${imported} trips for ${boxTruck.vehicleNumber}`);
      }
      
      if (flatbed && devices[1]) {
        console.log(`🔗 Mapping ${devices[1].display_name} (${devices[1].device_id}) to ${flatbed.vehicleNumber}`);
        await db
          .update(vehicles)
          .set({ 
            oneStepGpsDeviceId: devices[1].device_id,
            oneStepGpsEnabled: true 
          })
          .where(eq(vehicles.id, flatbed.id));
        
        console.log(`🔄 Syncing trips for ${flatbed.vehicleNumber}...`);
        const imported = await service.syncVehicleTrips(flatbed.id, 30);
        console.log(`✅ Imported ${imported} trips for ${flatbed.vehicleNumber}`);
      }
    }
    
    console.log("✅ OneStep GPS sync complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

syncOneStepGPS();
