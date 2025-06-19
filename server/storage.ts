import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, leads, calendarJobs, messages,
  images, settings, organizations, userSessions
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
  
  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(orgData: any): Promise<Organization>;
  updateOrganization(id: number, updates: any): Promise<Organization>;
  
  // Customer methods
  getCustomers(organizationId: number): Promise<Customer[]>;
  createCustomer(customerData: any): Promise<Customer>;
  updateCustomer(id: number, updates: any): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  
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
    const [user] = await db
      .insert(users)
      .values({
        organizationId: userData.organizationId,
        username: userData.username,
        password: userData.password,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        isActive: userData.isActive ?? true,
        lastLoginAt: userData.lastLoginAt
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        username: updates.username,
        email: updates.email,
        firstName: updates.firstName,
        lastName: updates.lastName,
        role: updates.role,
        isActive: updates.isActive,
        lastLoginAt: updates.lastLoginAt
      })
      .where(eq(users.id, id))
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
    const [customer] = await db
      .insert(customers)
      .values({
        userId: customerData.userId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zipCode: customerData.zipCode
      })
      .returning();
    return customer;
  }

  async updateCustomer(id: number, updates: any): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zipCode: updates.zipCode
      })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // GPS tracking methods
  async createGPSSession(sessionData: any): Promise<any> {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId: sessionData.userId,
        token: sessionData.token,
        expiresAt: sessionData.expiresAt,
        latitude: sessionData.latitude,
        longitude: sessionData.longitude,
        locationAccuracy: sessionData.locationAccuracy,
        deviceType: sessionData.deviceType,
        locationTimestamp: sessionData.locationTimestamp,
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress
      })
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