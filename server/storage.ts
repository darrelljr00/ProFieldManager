import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, leads, calendarJobs, messages,
  images, settings, organizations, userSessions, subscriptionPlans,
  projectFiles
} from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull } from "drizzle-orm";
import type { 
  User, Customer, Invoice, Quote, Project, Task, 
  Expense, ExpenseCategory, ExpenseReport, GasCard,
  Lead, CalendarJob, Message, Organization
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  updateUser(id: number, updates: any): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(organizationId?: number): Promise<User[]>;
  getUserStats(organizationId?: number): Promise<any>;
  
  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(orgData: any): Promise<Organization>;
  updateOrganization(id: number, updates: any): Promise<Organization>;
  getAllOrganizations(): Promise<Organization[]>;
  
  // Customer methods
  getCustomers(organizationId: number): Promise<Customer[]>;
  createCustomer(customerData: any): Promise<Customer>;
  updateCustomer(id: number, updates: any): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  
  // Invoice methods
  getInvoices(organizationId: number): Promise<any[]>;
  createInvoice(invoiceData: any): Promise<any>;
  updateInvoice(id: number, updates: any): Promise<any>;
  deleteInvoice(id: number): Promise<void>;
  getInvoiceStats(organizationId: number): Promise<any>;
  
  // Quote methods
  getQuotes(organizationId: number): Promise<any[]>;
  createQuote(quoteData: any): Promise<any>;
  updateQuote(id: number, updates: any): Promise<any>;
  deleteQuote(id: number): Promise<void>;
  
  // Project/Job methods
  getProjects(organizationId: number): Promise<any[]>;
  createProject(projectData: any): Promise<any>;
  updateProject(id: number, updates: any): Promise<any>;
  deleteProject(id: number): Promise<void>;
  
  // Expense methods
  getExpenses(organizationId: number): Promise<any[]>;
  createExpense(expenseData: any): Promise<any>;
  updateExpense(id: number, updates: any): Promise<any>;
  deleteExpense(id: number): Promise<void>;
  
  // Lead methods
  getLeads(organizationId: number): Promise<any[]>;
  createLead(leadData: any): Promise<any>;
  updateLead(id: number, updates: any): Promise<any>;
  deleteLead(id: number): Promise<void>;
  
  // Settings methods
  getSystemSettings(): Promise<any[]>;
  getSubscriptionPlans(): Promise<any[]>;
  
  // File methods
  getFiles(organizationId: number): Promise<any[]>;
  createFile(fileData: any): Promise<any>;
  updateFile(id: number, updates: any): Promise<any>;
  deleteFile(id: number): Promise<void>;
  
  // GPS tracking methods
  createGPSSession(sessionData: any): Promise<any>;
  getGPSSessions(organizationId: number): Promise<any[]>;
  getGPSStats(organizationId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: any): Promise<User> {
    const insertData: any = {
      organizationId: userData.organizationId,
      username: userData.username,
      password: userData.password,
      email: userData.email,
      role: userData.role || 'user',
      isActive: userData.isActive ?? true
    };
    
    if (userData.firstName) insertData.firstName = userData.firstName;
    if (userData.lastName) insertData.lastName = userData.lastName;
    if (userData.lastLoginAt) insertData.lastLoginAt = userData.lastLoginAt;

    const [user] = await db
      .insert(users)
      .values(insertData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: any): Promise<User> {
    const updateData: any = {};
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.lastLoginAt !== undefined) updateData.lastLoginAt = updates.lastLoginAt;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User> {
    const updateData: any = { stripeCustomerId: customerId };
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Organization methods
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(orgData: any): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values({
        name: orgData.name,
        slug: orgData.slug
      })
      .returning();
    return org;
  }

  async updateOrganization(id: number, updates: any): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({
        name: updates.name,
        slug: updates.slug
      })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // Customer methods
  async getCustomers(organizationId: number): Promise<Customer[]> {
    const results = await db
      .select({
        id: customers.id,
        userId: customers.userId,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        city: customers.city,
        state: customers.state,
        zipCode: customers.zipCode,
        country: customers.country,
        createdAt: customers.createdAt
      })
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .where(eq(users.organizationId, organizationId));
    
    return results;
  }

  async createCustomer(customerData: any): Promise<Customer> {
    const insertData: any = {
      userId: customerData.userId,
      name: customerData.name,
      email: customerData.email
    };
    
    if (customerData.phone) insertData.phone = customerData.phone;
    if (customerData.address) insertData.address = customerData.address;
    if (customerData.city) insertData.city = customerData.city;
    if (customerData.state) insertData.state = customerData.state;
    if (customerData.zipCode) insertData.zipCode = customerData.zipCode;

    const [customer] = await db
      .insert(customers)
      .values(insertData)
      .returning();
    return customer;
  }

  async updateCustomer(id: number, updates: any): Promise<Customer> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.zipCode !== undefined) updateData.zipCode = updates.zipCode;

    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // User methods for admin
  async getAllUsers(organizationId?: number): Promise<User[]> {
    let query = db.select().from(users);
    if (organizationId) {
      query = query.where(eq(users.organizationId, organizationId)) as any;
    }
    return await query;
  }

  async getUserStats(organizationId?: number): Promise<any> {
    let whereCondition = organizationId ? eq(users.organizationId, organizationId) : undefined;
    
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereCondition);

    const [activeUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(whereCondition, eq(users.isActive, true)));

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      inactiveUsers: totalUsers.count - activeUsers.count
    };
  }

  // Organization methods
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  // Invoice methods
  async getInvoices(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoiceData: any): Promise<any> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: any): Promise<any> {
    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceStats(organizationId: number): Promise<any> {
    const [totalInvoices] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(eq(users.organizationId, organizationId));

    const [paidInvoices] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(and(
        eq(users.organizationId, organizationId),
        eq(invoices.status, 'paid')
      ));

    return {
      totalInvoices: totalInvoices.count,
      paidInvoices: paidInvoices.count,
      pendingInvoices: totalInvoices.count - paidInvoices.count
    };
  }

  // Quote methods
  async getQuotes(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(quotes)
      .innerJoin(users, eq(quotes.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(quotes.createdAt));
  }

  async createQuote(quoteData: any): Promise<any> {
    const [quote] = await db
      .insert(quotes)
      .values(quoteData)
      .returning();
    return quote;
  }

  async updateQuote(id: number, updates: any): Promise<any> {
    const [quote] = await db
      .update(quotes)
      .set(updates)
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async deleteQuote(id: number): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Project/Job methods
  async getProjects(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(projectData: any): Promise<any> {
    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async updateProject(id: number, updates: any): Promise<any> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Expense methods
  async getExpenses(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(expenseData: any): Promise<any> {
    const [expense] = await db
      .insert(expenses)
      .values(expenseData)
      .returning();
    return expense;
  }

  async updateExpense(id: number, updates: any): Promise<any> {
    const [expense] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Lead methods
  async getLeads(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(leads)
      .innerJoin(users, eq(leads.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(leads.createdAt));
  }

  async createLead(leadData: any): Promise<any> {
    const [lead] = await db
      .insert(leads)
      .values(leadData)
      .returning();
    return lead;
  }

  async updateLead(id: number, updates: any): Promise<any> {
    const [lead] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Settings methods
  async getSystemSettings(): Promise<any[]> {
    return await db.select().from(settings);
  }

  async getSubscriptionPlans(): Promise<any[]> {
    return await db.select().from(subscriptionPlans);
  }

  // File methods
  async getFiles(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(projectFiles)
      .innerJoin(users, eq(projectFiles.uploadedById, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(projectFiles.createdAt));
  }

  async createFile(fileData: any): Promise<any> {
    const [file] = await db
      .insert(projectFiles)
      .values(fileData)
      .returning();
    return file;
  }

  async updateFile(id: number, updates: any): Promise<any> {
    const [file] = await db
      .update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // GPS tracking methods
  async createGPSSession(sessionData: any): Promise<any> {
    const insertData: any = {
      userId: sessionData.userId,
      token: sessionData.token,
      expiresAt: sessionData.expiresAt,
      userAgent: sessionData.userAgent,
      ipAddress: sessionData.ipAddress
    };
    
    if (sessionData.latitude) insertData.latitude = sessionData.latitude;
    if (sessionData.longitude) insertData.longitude = sessionData.longitude;
    if (sessionData.locationAccuracy) insertData.locationAccuracy = sessionData.locationAccuracy;
    if (sessionData.deviceType) insertData.deviceType = sessionData.deviceType;
    if (sessionData.locationTimestamp) insertData.locationTimestamp = sessionData.locationTimestamp;

    const [session] = await db
      .insert(userSessions)
      .values(insertData)
      .returning();
    return session;
  }

  async getGPSSessions(organizationId: number): Promise<any[]> {
    const sessions = await db
      .select({
        id: userSessions.id,
        userId: userSessions.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: userSessions.createdAt,
        latitude: userSessions.latitude,
        longitude: userSessions.longitude,
        locationAccuracy: userSessions.locationAccuracy,
        deviceType: userSessions.deviceType,
        locationTimestamp: userSessions.locationTimestamp,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(users.organizationId, organizationId),
          isNotNull(userSessions.latitude),
          isNotNull(userSessions.longitude)
        )
      )
      .orderBy(desc(userSessions.createdAt));
    
    return sessions;
  }

  async getGPSStats(organizationId: number): Promise<any> {
    const stats = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        mobileSessions: sql<number>`count(*) filter (where ${userSessions.deviceType} = 'mobile')`,
        recentSessions: sql<number>`count(*) filter (where ${userSessions.createdAt} >= now() - interval '24 hours')`
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(users.organizationId, organizationId),
          isNotNull(userSessions.latitude),
          isNotNull(userSessions.longitude)
        )
      );

    const result = stats[0];
    return {
      totalSessions: result.totalSessions || 0,
      mobileSessions: result.mobileSessions || 0,
      recentSessions: result.recentSessions || 0,
      mobilePercentage: result.totalSessions > 0 ? Math.round((result.mobileSessions / result.totalSessions) * 100) : 0
    };
  }
}

export const storage = new DatabaseStorage();