import { storage } from "./storage";

export async function seedDemoAccountData(userId: number, organizationId: number) {
  try {
    console.log(`🎬 Seeding demo data for user ${userId}, org ${organizationId}`);

    const customers = await Promise.all([
      storage.createCustomer({
        userId,
        organizationId,
        name: "Sunrise Properties LLC",
        email: "contact@sunrise-properties.com",
        phone: "(555) 123-4567",
        address: "1250 Oak Street",
        city: "Springfield",
        state: "IL",
        zipCode: "62701",
        country: "United States"
      }),
      storage.createCustomer({
        userId,
        organizationId,
        name: "Green Valley Mall",
        email: "facilities@greenvalleymall.com",
        phone: "(555) 234-5678",
        address: "4500 Valley View Drive",
        city: "Portland",
        state: "OR",
        zipCode: "97201",
        country: "United States"
      }),
      storage.createCustomer({
        userId,
        organizationId,
        name: "Riverside Apartments",
        email: "maintenance@riversideapts.com",
        phone: "(555) 345-6789",
        address: "890 River Road",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "United States"
      })
    ]);

    const projects = await Promise.all([
      storage.createProject({
        userId,
        organizationId,
        customerId: customers[0].id,
        name: "Parking Lot Pressure Washing",
        description: "Complete pressure washing of parking lot and walkways",
        status: "completed",
        priority: "high",
        startDate: new Date("2024-11-01"),
        endDate: new Date("2024-11-02"),
        address: customers[0].address,
        city: customers[0].city,
        state: customers[0].state,
        zipCode: customers[0].zipCode,
        estimatedValue: "2500.00"
      }),
      storage.createProject({
        userId,
        organizationId,
        customerId: customers[1].id,
        name: "Exterior Building Cleaning",
        description: "Power washing exterior walls and windows",
        status: "in-progress",
        priority: "medium",
        startDate: new Date(),
        address: customers[1].address,
        city: customers[1].city,
        state: customers[1].state,
        zipCode: customers[1].zipCode,
        estimatedValue: "4200.00"
      }),
      storage.createProject({
        userId,
        organizationId,
        customerId: customers[2].id,
        name: "Deck & Patio Cleaning",
        description: "Pressure wash all unit decks and common area patios",
        status: "pending",
        priority: "low",
        startDate: new Date("2024-12-01"),
        address: customers[2].address,
        city: customers[2].city,
        state: customers[2].state,
        zipCode: customers[2].zipCode,
        estimatedValue: "3800.00"
      })
    ]);

    await Promise.all([
      storage.createInvoice({
        userId,
        organizationId,
        customerId: customers[0].id,
        invoiceNumber: "INV-DEMO-001",
        invoiceDate: new Date("2024-11-05"),
        dueDate: new Date("2024-12-05"),
        status: "paid",
        subtotal: "2500.00",
        taxRate: "7.00",
        taxAmount: "175.00",
        total: "2675.00",
        currency: "USD",
        notes: "Thank you for your business!",
        paymentMethod: "stripe",
        paidAt: new Date("2024-11-10"),
        lineItems: [
          {
            description: "Parking lot pressure washing",
            quantity: 5000,
            rate: 0.40,
            amount: 2000.00
          },
          {
            description: "Walkway cleaning",
            quantity: 1,
            rate: 500.00,
            amount: 500.00
          }
        ]
      }),
      storage.createInvoice({
        userId,
        organizationId,
        customerId: customers[1].id,
        invoiceNumber: "INV-DEMO-002",
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "sent",
        subtotal: "4200.00",
        taxRate: "7.00",
        taxAmount: "294.00",
        total: "4494.00",
        currency: "USD",
        notes: "Payment terms: Net 30 days",
        lineItems: [
          {
            description: "Exterior building cleaning - 3 stories",
            quantity: 12000,
            rate: 0.35,
            amount: 4200.00
          }
        ]
      })
    ]);

    await Promise.all([
      storage.createQuote({
        userId,
        organizationId,
        customerId: customers[2].id,
        quoteNumber: "QUO-DEMO-001",
        quoteDate: new Date(),
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "pending",
        subtotal: "3800.00",
        taxRate: "7.00",
        taxAmount: "266.00",
        total: "4066.00",
        currency: "USD",
        notes: "Quote valid for 14 days. Includes all materials and labor.",
        lineItems: [
          {
            description: "Deck pressure washing (24 units)",
            quantity: 24,
            rate: 125.00,
            amount: 3000.00
          },
          {
            description: "Common area patio cleaning",
            quantity: 1,
            rate: 800.00,
            amount: 800.00
          }
        ]
      }),
      storage.createQuote({
        userId,
        organizationId,
        customerId: customers[0].id,
        quoteNumber: "QUO-DEMO-002",
        quoteDate: new Date("2024-11-15"),
        expiryDate: new Date("2024-11-29"),
        status: "accepted",
        subtotal: "1500.00",
        taxRate: "7.00",
        taxAmount: "105.00",
        total: "1605.00",
        currency: "USD",
        notes: "Monthly maintenance package",
        lineItems: [
          {
            description: "Monthly walkway maintenance",
            quantity: 4,
            rate: 375.00,
            amount: 1500.00
          }
        ]
      })
    ]);

    // Create expense categories first
    const expenseCategories = await Promise.all([
      storage.createExpenseCategory({
        organizationId,
        name: "Equipment & Supplies",
        description: "Tools, equipment, and maintenance supplies"
      }),
      storage.createExpenseCategory({
        organizationId,
        name: "Fuel & Transportation",
        description: "Vehicle fuel and transportation costs"
      })
    ]);

    await Promise.all([
      storage.createExpense({
        userId,
        organizationId,
        categoryId: expenseCategories[0].id,
        category: "equipment",
        amount: "125.50",
        currency: "USD",
        expenseDate: new Date("2024-11-01"),
        vendor: "Power Clean Supply",
        description: "Pressure washer nozzles and hoses",
        paymentMethod: "credit_card",
        status: "approved",
        notes: "Equipment maintenance supplies"
      }),
      storage.createExpense({
        userId,
        organizationId,
        categoryId: expenseCategories[1].id,
        category: "travel",
        amount: "85.00",
        currency: "USD",
        expenseDate: new Date("2024-11-05"),
        vendor: "Sunoco",
        description: "Fuel for company truck",
        paymentMethod: "gas_card",
        status: "approved",
        notes: "Work truck refuel"
      }),
      storage.createExpense({
        userId,
        organizationId,
        categoryId: expenseCategories[0].id,
        category: "equipment",
        amount: "450.00",
        currency: "USD",
        expenseDate: new Date("2024-11-10"),
        vendor: "Equipment Depot",
        description: "Surface cleaner attachment",
        paymentMethod: "credit_card",
        status: "pending",
        notes: "New equipment for larger jobs"
      })
    ]);

    await Promise.all([
      storage.createLead({
        userId,
        organizationId,
        name: "Michael Johnson",
        serviceDescription: "Commercial pressure washing for shopping center",
        email: "mjohnson@email.com",
        phone: "(555) 456-7890",
        leadSource: "website",
        status: "new",
        priority: "high",
        estimatedValue: "5000.00",
        notes: "Interested in commercial pressure washing for shopping center",
        address: "750 Commerce Boulevard",
        city: "Denver",
        state: "CO",
        zipCode: "80202"
      }),
      storage.createLead({
        userId,
        organizationId,
        name: "Sarah Williams",
        serviceDescription: "Driveway and patio cleaning",
        email: "swilliams@example.com",
        phone: "(555) 567-8901",
        leadSource: "referral",
        status: "contacted",
        priority: "medium",
        estimatedValue: "2200.00",
        notes: "Needs driveway and patio cleaning - referred by existing client",
        address: "321 Maple Lane",
        city: "Seattle",
        state: "WA",
        zipCode: "98101"
      })
    ]);

    console.log("✅ Demo account data seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding demo account data:", error);
    throw error;
  }
}
