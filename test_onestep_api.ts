import { db } from "./server/db";
import { settings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function testAPI() {
  const organizationId = 2;
  
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
    console.error("API key not found");
    return;
  }
  
  const apiKey = apiKeySetting[0].value;
  
  const response = await fetch(
    `https://track.onestepgps.com/v3/api/public/device-info?lat_lng=1&api-key=${apiKey}`
  );
  
  if (!response.ok) {
    console.error("API error:", response.statusText);
    return;
  }
  
  const devices = await response.json();
  console.log("Full device data:", JSON.stringify(devices[0], null, 2));
  console.log("\nAll device IDs:", devices.map((d: any) => ({ name: d.display_name, id: d.device_id })));
  process.exit(0);
}

testAPI();
