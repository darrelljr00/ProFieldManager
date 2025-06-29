import { db } from "./db";
import { inspectionTemplates, inspectionItems } from "@shared/schema";

export async function seedInspectionData() {
  console.log("Seeding inspection data...");

  try {
    // Create default pre-trip inspection template
    const [preTripTemplate] = await db
      .insert(inspectionTemplates)
      .values({
        organizationId: 1,
        name: "Standard Pre-Trip Inspection",
        type: "pre-trip",
        description: "Standard pre-trip vehicle and equipment inspection",
        isDefault: true,
        createdBy: 1
      })
      .returning();

    // Create default post-trip inspection template
    const [postTripTemplate] = await db
      .insert(inspectionTemplates)
      .values({
        organizationId: 1,
        name: "Standard Post-Trip Inspection",
        type: "post-trip",
        description: "Standard post-trip vehicle and equipment inspection",
        isDefault: true,
        createdBy: 1
      })
      .returning();

    // Pre-trip inspection items
    const preTripItems = [
      { category: "Vehicle Safety", name: "Mirrors", description: "Check all mirrors for proper adjustment and cleanliness", isRequired: true, sortOrder: 1 },
      { category: "Vehicle Safety", name: "Tires", description: "Inspect tire pressure and tread depth", isRequired: true, sortOrder: 2 },
      { category: "Vehicle Safety", name: "Lights", description: "Test headlights, taillights, and hazard lights", isRequired: true, sortOrder: 3 },
      { category: "Vehicle Safety", name: "Turn Signals", description: "Check left and right turn signals", isRequired: true, sortOrder: 4 },
      { category: "Vehicle Safety", name: "Brakes", description: "Test brake functionality and feel", isRequired: true, sortOrder: 5 },
      { category: "Equipment", name: "Chemicals", description: "Verify chemical levels and proper storage", isRequired: true, sortOrder: 6 },
      { category: "Equipment", name: "O-rings", description: "Inspect o-rings for wear and proper sealing", isRequired: true, sortOrder: 7 },
      { category: "Equipment", name: "Nozzles", description: "Check nozzle condition and spray patterns", isRequired: true, sortOrder: 8 },
      { category: "Equipment", name: "Hoses", description: "Inspect hoses for damage or wear", isRequired: true, sortOrder: 9 },
      { category: "Equipment", name: "Pressure Washer", description: "Test pressure washer operation", isRequired: true, sortOrder: 10 }
    ];

    // Post-trip inspection items
    const postTripItems = [
      { category: "Equipment", name: "Chemical Storage", description: "Secure all chemicals properly", isRequired: true, sortOrder: 1 },
      { category: "Equipment", name: "Equipment Cleaning", description: "Clean and store all equipment", isRequired: true, sortOrder: 2 },
      { category: "Equipment", name: "Hose Storage", description: "Properly coil and store hoses", isRequired: true, sortOrder: 3 },
      { category: "Vehicle", name: "Fuel Level", description: "Record fuel level at end of shift", isRequired: true, sortOrder: 4 },
      { category: "Vehicle", name: "Mileage", description: "Record ending mileage", isRequired: true, sortOrder: 5 },
      { category: "Vehicle", name: "Vehicle Cleaning", description: "Clean vehicle interior and exterior", isRequired: false, sortOrder: 6 },
      { category: "Safety", name: "Incident Report", description: "Report any incidents or issues", isRequired: false, sortOrder: 7 },
      { category: "Safety", name: "Equipment Damage", description: "Report any equipment damage", isRequired: false, sortOrder: 8 }
    ];

    // Insert pre-trip items
    for (const item of preTripItems) {
      await db.insert(inspectionItems).values({
        templateId: preTripTemplate.id,
        ...item
      });
    }

    // Insert post-trip items
    for (const item of postTripItems) {
      await db.insert(inspectionItems).values({
        templateId: postTripTemplate.id,
        ...item
      });
    }

    console.log("✅ Inspection data seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding inspection data:", error);
  }
}