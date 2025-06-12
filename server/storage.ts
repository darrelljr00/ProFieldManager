import { 
  users, customers, invoices, invoiceLineItems, payments,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Invoice, type InsertInvoice, type InvoiceLineItem, type InsertInvoiceLineItem,
  type Payment, type InsertPayment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;

  // Customer methods
  getCustomers(userId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, userId: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number, userId: number): Promise<boolean>;

  // Invoice methods
  getInvoices(userId: number): Promise<(Invoice & { customer: Customer, lineItems: InvoiceLineItem[] })[]>;
  getInvoice(id: number, userId: number): Promise<(Invoice & { customer: Customer, lineItems: InvoiceLineItem[] }) | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, userId: number, invoice: Partial<Omit<InsertInvoice, 'lineItems'>>): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId: number): Promise<boolean>;
  getInvoiceStats(userId: number): Promise<{
    totalRevenue: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    pendingValue: number;
    paidValue: number;
    overdueValue: number;
  }>;

  // Payment methods
  getPayments(userId: number): Promise<(Payment & { invoice: Invoice & { customer: Customer } })[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByInvoice(invoiceId: number): Promise<Payment[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId })
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getCustomers(userId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number, userId: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: number, userId: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(customer)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getInvoices(userId: number): Promise<(Invoice & { customer: Customer, lineItems: InvoiceLineItem[] })[]> {
    const invoicesWithCustomers = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));

    const result = [];
    for (const row of invoicesWithCustomers) {
      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, row.invoices.id));
      
      result.push({
        ...row.invoices,
        customer: row.customers!,
        lineItems,
      });
    }

    return result;
  }

  async getInvoice(id: number, userId: number): Promise<(Invoice & { customer: Customer, lineItems: InvoiceLineItem[] }) | undefined> {
    const [invoiceWithCustomer] = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

    if (!invoiceWithCustomer) return undefined;

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id));

    return {
      ...invoiceWithCustomer.invoices,
      customer: invoiceWithCustomer.customers!,
      lineItems,
    };
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const { lineItems, ...invoiceData } = invoice;
    
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();

    // Insert line items
    if (lineItems.length > 0) {
      await db
        .insert(invoiceLineItems)
        .values(lineItems.map(item => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          amount: item.amount.toString(),
        })));
    }

    return newInvoice;
  }

  async updateInvoice(id: number, userId: number, invoice: Partial<Omit<InsertInvoice, 'lineItems'>>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({
        ...invoice,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteInvoice(id: number, userId: number): Promise<boolean> {
    // Delete line items first
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    
    // Delete invoice
    const result = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getInvoiceStats(userId: number): Promise<{
    totalRevenue: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    pendingValue: number;
    paidValue: number;
    overdueValue: number;
  }> {
    const stats = await db
      .select({
        status: invoices.status,
        total: sql<number>`SUM(CAST(${invoices.total} AS DECIMAL))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .groupBy(invoices.status);

    const result = {
      totalRevenue: 0,
      pendingInvoices: 0,
      paidInvoices: 0,
      overdueInvoices: 0,
      pendingValue: 0,
      paidValue: 0,
      overdueValue: 0,
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case 'paid':
          result.paidInvoices = stat.count;
          result.paidValue = stat.total;
          result.totalRevenue += stat.total;
          break;
        case 'sent':
          result.pendingInvoices = stat.count;
          result.pendingValue = stat.total;
          break;
        case 'overdue':
          result.overdueInvoices = stat.count;
          result.overdueValue = stat.total;
          break;
      }
    });

    return result;
  }

  async getPayments(userId: number): Promise<(Payment & { invoice: Invoice & { customer: Customer } })[]> {
    const paymentsWithInvoices = await db
      .select()
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(payments.createdAt));

    return paymentsWithInvoices.map(row => ({
      ...row.payments,
      invoice: {
        ...row.invoices!,
        customer: row.customers!,
      },
    }));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getPaymentsByInvoice(invoiceId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  }
}

export const storage = new DatabaseStorage();
