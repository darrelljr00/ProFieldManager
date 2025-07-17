import { db } from "./db";
import { leads } from "@shared/schema";

export async function seedLeadData() {
  console.log("🌱 Seeding lead data...");

  const sampleLeads = [
    {
      userId: 2, // admin user
      name: "John Smith",
      phone: "(555) 123-4567",
      email: "john.smith@email.com",
      address: "123 Main St, Austin, TX 78701",
      serviceDescription: "Pressure washing for commercial building",
      leadPrice: "2500.00",
      leadSource: "website",
      status: "new",
      priority: "high",
      grade: "hot",
      notes: "Large commercial job, needs quote ASAP"
    },
    {
      userId: 2,
      name: "Sarah Johnson",
      phone: "(555) 234-5678",
      email: "sarah.j@company.com",
      address: "456 Oak Ave, Austin, TX 78702",
      serviceDescription: "Residential driveway and sidewalk cleaning",
      leadPrice: "350.00",
      leadSource: "referral",
      status: "contacted",
      priority: "medium",
      grade: "warm",
      notes: "Referral from previous customer"
    },
    {
      userId: 2,
      name: "Mike Davis",
      phone: "(555) 345-6789",
      email: "mike.davis@gmail.com",
      address: "789 Pine St, Austin, TX 78703",
      serviceDescription: "House exterior cleaning before sale",
      leadPrice: "800.00",
      leadSource: "advertising",
      status: "qualified",
      priority: "high",
      grade: "hot",
      notes: "Quick turnaround needed for house sale"
    },
    {
      userId: 2,
      name: "Lisa Wilson",
      phone: "(555) 456-7890",
      email: "lisa.wilson@business.com",
      address: "321 Elm Dr, Austin, TX 78704",
      serviceDescription: "Monthly maintenance cleaning for office building",
      leadPrice: "1200.00",
      leadSource: "website",
      status: "proposal_sent",
      priority: "medium",
      grade: "warm",
      notes: "Interested in monthly service contract"
    },
    {
      userId: 2,
      name: "Robert Brown",
      phone: "(555) 567-8901",
      email: "rob.brown@email.com",
      address: "654 Cedar Ln, Austin, TX 78705",
      serviceDescription: "Parking lot cleaning for retail store",
      leadPrice: "450.00",
      leadSource: "cold_call",
      status: "new",
      priority: "low",
      grade: "cold",
      notes: "Initial contact made, follow up needed"
    },
    {
      userId: 2,
      name: "Jennifer Garcia",
      phone: "(555) 678-9012",
      email: "jen.garcia@home.com",
      address: "987 Maple Ct, Austin, TX 78706",
      serviceDescription: "Pool deck and patio cleaning",
      leadPrice: "275.00",
      leadSource: "social_media",
      status: "contacted",
      priority: "medium",
      grade: "warm",
      notes: "Found us on Facebook, interested in summer cleaning"
    },
    {
      userId: 2,
      name: "David Martinez",
      phone: "(555) 789-0123",
      email: "david.m@corp.com",
      address: "147 Birch St, Austin, TX 78707",
      serviceDescription: "Fleet vehicle washing service",
      leadPrice: "3200.00",
      leadSource: "trade_show",
      status: "qualified",
      priority: "high",
      grade: "hot",
      notes: "Met at trade show, large fleet of 20 vehicles"
    },
    {
      userId: 2,
      name: "Amy Thompson",
      phone: "(555) 890-1234",
      email: "amy.thompson@email.com",
      address: "258 Spruce Ave, Austin, TX 78708",
      serviceDescription: "Residential house washing",
      leadPrice: "425.00",
      leadSource: "website",
      status: "won",
      priority: "medium",
      grade: "hot",
      notes: "Job completed successfully, happy customer"
    },
    {
      userId: 2,
      name: "Chris Anderson",
      phone: "(555) 901-2345",
      email: "chris.anderson@business.net",
      address: "369 Willow Dr, Austin, TX 78709",
      serviceDescription: "Restaurant grease removal and cleaning",
      leadPrice: "650.00",
      leadSource: "referral",
      status: "contacted",
      priority: "high",
      grade: "warm",
      notes: "Restaurant owner, needs regular cleaning service"
    },
    {
      userId: 2,
      name: "Michelle White",
      phone: "(555) 012-3456",
      email: "michelle.white@home.com",
      address: "741 Ash St, Austin, TX 78710",
      serviceDescription: "Deck staining preparation cleaning",
      leadPrice: "320.00",
      leadSource: "website",
      status: "new",
      priority: "low",
      grade: "cold",
      notes: "Looking for deck cleaning before staining project"
    }
  ];

  try {
    // Insert sample leads
    for (const lead of sampleLeads) {
      await db.insert(leads).values(lead);
    }

    console.log(`✅ Successfully seeded ${sampleLeads.length} leads`);
  } catch (error) {
    console.error("❌ Error seeding lead data:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLeadData()
    .then(() => {
      console.log("Lead data seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Lead data seeding failed:", error);
      process.exit(1);
    });
}