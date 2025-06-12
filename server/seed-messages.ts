import { db } from "./db";
import { messages, customers } from "@shared/schema";

export async function seedSampleMessages() {
  try {
    // Get existing customer to link messages to
    const existingCustomers = await db.select().from(customers).limit(2);
    
    if (existingCustomers.length === 0) {
      console.log("No customers found, skipping message seeding");
      return;
    }

    // Check if messages already exist
    const existingMessages = await db.select().from(messages).limit(1);
    if (existingMessages.length > 0) {
      console.log("Messages already exist, skipping seeding");
      return;
    }

    const customer = existingCustomers[0];

    // Create sample SMS conversations
    const sampleMessages = [
      {
        userId: 1,
        customerId: customer.id,
        to: customer.phone || "+15551234567",
        from: "+15559876543",
        body: "Hi! Thanks for your quote request. We'll have it ready for you tomorrow.",
        status: "delivered",
        direction: "outbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef12",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: 1,
        customerId: customer.id,
        to: "+15559876543",
        from: customer.phone || "+15551234567",
        body: "Perfect! Looking forward to it. What time should I expect it?",
        status: "received",
        direction: "inbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef13",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000), // 2 days ago + 10 min
      },
      {
        userId: 1,
        customerId: customer.id,
        to: customer.phone || "+15551234567",
        from: "+15559876543",
        body: "We'll have it ready by 2 PM tomorrow. Does that work for you?",
        status: "delivered",
        direction: "outbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef14",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 2 days ago + 15 min
      },
      {
        userId: 1,
        customerId: customer.id,
        to: "+15559876543",
        from: customer.phone || "+15551234567",
        body: "Yes, that's perfect! Thank you so much.",
        status: "received",
        direction: "inbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef15",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000), // 2 days ago + 20 min
      },
      {
        userId: 1,
        customerId: null, // Unknown contact
        to: "+15559876543",
        from: "+15552468135",
        body: "Hello, I'm interested in your services. Could you send me a quote?",
        status: "received",
        direction: "inbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef16",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        userId: 1,
        customerId: null,
        to: "+15552468135",
        from: "+15559876543",
        body: "Hi! Thanks for your interest. I'd be happy to prepare a quote for you. What type of project are you looking at?",
        status: "delivered",
        direction: "outbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef17",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 1 day ago + 30 min
      },
      {
        userId: 1,
        customerId: null,
        to: "+15559876543",
        from: "+15552468135",
        body: "I need help with a kitchen renovation. About 200 sq ft space.",
        status: "received",
        direction: "inbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef18",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 1 day ago + 45 min
      },
      {
        userId: 1,
        customerId: null,
        to: "+15552468135",
        from: "+15559876543",
        body: "Great! I'll prepare a detailed quote and send it over by email tomorrow. Could you share your email address?",
        status: "delivered",
        direction: "outbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef19",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 day ago + 1 hour
      },
      {
        userId: 1,
        customerId: null,
        to: "+15559876543",
        from: "+15552468135",
        body: "Sure! It's john.doe@email.com. Thanks!",
        status: "received",
        direction: "inbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef20",
        createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
      },
      {
        userId: 1,
        customerId: customer.id,
        to: customer.phone || "+15551234567",
        from: "+15559876543",
        body: "Your invoice #INV-2024-001 is ready for payment. You can view it at: https://app.com/invoice/123",
        status: "delivered",
        direction: "outbound" as const,
        twilioSid: "SM123456789abcdef123456789abcdef21",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      }
    ];

    // Insert sample messages
    for (const message of sampleMessages) {
      await db.insert(messages).values(message);
    }

    console.log(`Seeded ${sampleMessages.length} sample SMS messages`);
  } catch (error) {
    console.error("Error seeding messages:", error);
  }
}