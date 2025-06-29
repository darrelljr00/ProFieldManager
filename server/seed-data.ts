import { storage } from "./storage";
import { seedFormTemplates } from "./seed-form-templates";

async function seedImageCompressionSettings() {
  try {
    // Check if compression settings already exist
    const existingQuality = await storage.getSetting('inspection', 'image_quality');
    
    if (!existingQuality) {
      // Create default compression settings
      await storage.updateSetting('inspection', 'image_quality', '80');
      await storage.updateSetting('inspection', 'max_width', '1920');
      await storage.updateSetting('inspection', 'max_height', '1080');
      console.log('Default image compression settings created');
    }
  } catch (error) {
    console.error('Error seeding compression settings:', error);
  }
}

export async function seedDatabase() {
  // Seed form templates first
  await seedFormTemplates();
  try {
    // Create sample customers
    const customer1 = await storage.createCustomer({
      userId: 1,
      name: "Acme Corporation",
      email: "billing@acme.com",
      phone: "+1-555-0123",
      address: "123 Business Ave, Suite 100",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "United States"
    });

    const customer2 = await storage.createCustomer({
      userId: 1,
      name: "TechStart Inc",
      email: "finance@techstart.io",
      phone: "+1-555-0456",
      address: "456 Innovation Blvd",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "United States"
    });

    const customer3 = await storage.createCustomer({
      userId: 1,
      name: "Global Solutions Ltd",
      email: "accounts@global-solutions.com",
      phone: "+44-20-7123-4567",
      address: "789 Enterprise Road",
      city: "London",
      state: "England",
      zipCode: "SW1A 1AA",
      country: "United Kingdom"
    });

    // Create sample invoices
    await storage.createInvoice({
      userId: 1,
      customerId: customer1.id,
      invoiceNumber: "INV-2024-001",
      invoiceDate: new Date("2024-01-15"),
      dueDate: new Date("2024-02-15"),
      status: "paid",
      subtotal: "2500.00",
      taxRate: "8.25",
      taxAmount: "206.25",
      total: "2706.25",
      currency: "USD",
      notes: "Thank you for your business!",
      paymentMethod: "stripe",
      paidAt: new Date("2024-01-20"),
      lineItems: [
        {
          description: "Web Development Services",
          quantity: 50,
          rate: 75.00,
          amount: 3750.00
        },
        {
          description: "UI/UX Design",
          quantity: 25,
          rate: 85.00,
          amount: 2125.00
        }
      ]
    });

    await storage.createInvoice({
      userId: 1,
      customerId: customer2.id,
      invoiceNumber: "INV-2024-002",
      invoiceDate: new Date("2024-02-01"),
      dueDate: new Date("2024-03-01"),
      status: "sent",
      subtotal: "4200.00",
      taxRate: "8.25",
      taxAmount: "346.50",
      total: "4546.50",
      currency: "USD",
      notes: "Mobile app development project - Phase 1",
      lineItems: [
        {
          description: "Mobile App Development",
          quantity: 60,
          rate: 95.00,
          amount: 5700.00
        },
        {
          description: "API Integration",
          quantity: 20,
          rate: 120.00,
          amount: 2400.00
        }
      ]
    });

    await storage.createInvoice({
      userId: 1,
      customerId: customer3.id,
      invoiceNumber: "INV-2024-003",
      invoiceDate: new Date("2024-01-10"),
      dueDate: new Date("2024-01-25"),
      status: "overdue",
      subtotal: "1800.00",
      taxRate: "20.00",
      taxAmount: "360.00",
      total: "2160.00",
      currency: "USD",
      notes: "Consulting services for Q4 2023",
      lineItems: [
        {
          description: "Business Consulting",
          quantity: 24,
          rate: 150.00,
          amount: 3600.00
        }
      ]
    });

    await storage.createInvoice({
      userId: 1,
      customerId: customer1.id,
      invoiceNumber: "INV-2024-004",
      invoiceDate: new Date("2024-02-10"),
      dueDate: new Date("2024-03-10"),
      status: "draft",
      subtotal: "3200.00",
      taxRate: "8.25",
      taxAmount: "264.00",
      total: "3464.00",
      currency: "USD",
      notes: "Monthly maintenance and support",
      lineItems: [
        {
          description: "Website Maintenance",
          quantity: 40,
          rate: 65.00,
          amount: 2600.00
        },
        {
          description: "Technical Support",
          quantity: 15,
          rate: 90.00,
          amount: 1350.00
        }
      ]
    });

    // Create sample payments for paid invoices
    await storage.createPayment({
      invoiceId: 1, // Assuming first invoice has ID 1
      amount: "2706.25",
      currency: "USD",
      method: "stripe",
      status: "completed",
      externalId: "pi_1234567890"
    });

    // Seed default image compression settings
    await seedImageCompressionSettings();

    console.log("✅ Sample data seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}