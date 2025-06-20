import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, expenseReports, gasCards, 
  gasCardAssignments, leads, calendarJobs, messages,
  images, settings, organizations, userSessions, subscriptionPlans,
  projectFiles, fileManager
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
  getSettings(category: string): Promise<any>;
  getSettingsByCategory(category: string): Promise<any[]>;
  updateSetting(category: string, key: string, value: string): Promise<void>;
  updateSettings(category: string, settings: any): Promise<void>;
  getAllOrganizationsWithDetails(): Promise<any[]>;
  
  // File methods
  getFiles(organizationId: number): Promise<any[]>;
  createFile(fileData: any): Promise<any>;
  updateFile(id: number, updates: any): Promise<any>;
  deleteFile(id: number): Promise<void>;
  uploadProjectFile(fileData: any): Promise<any>;
  getProjectFiles(projectId: number, userId: number): Promise<any[]>;
  getProjectFile(fileId: number, userId: number): Promise<any>;
  deleteProjectFile(fileId: number, userId: number): Promise<boolean>;
  
  // Calendar jobs methods
  getCalendarJobs(organizationId: number): Promise<any[]>;
  getCalendarJob(id: number, organizationId: number): Promise<any>;
  createCalendarJob(jobData: any): Promise<any>;
  updateCalendarJob(id: number, updates: any): Promise<any>;
  deleteCalendarJob(id: number): Promise<void>;
  
  // Task management methods
  getTeamTasksForManager(userId: number): Promise<any[]>;
  getTasksCreatedByUser(userId: number): Promise<any[]>;
  getTasksAssignedToUser(userId: number): Promise<any[]>;
  getTasks(projectId: number, userId: number): Promise<any[]>;
  getAllTasksForOrganization(organizationId: number): Promise<any[]>;
  createTask(taskData: any): Promise<any>;
  createTaskForOrganization(organizationId: number, taskData: any, userId: number): Promise<any>;
  canUserDelegateTask(userId: number, assignedToId: number): Promise<boolean>;
  updateTask(id: number, userId: number, updates: any): Promise<any>;
  deleteTask(id: number): Promise<void>;
  
  // GPS tracking methods
  createGPSSession(sessionData: any): Promise<any>;
  getGPSSessions(organizationId: number): Promise<any[]>;
  getGPSStats(organizationId: number): Promise<any>;
  
  // SMS and Review methods
  getSmsMessages(organizationId: number): Promise<any[]>;
  getSmsTemplates(organizationId: number): Promise<any[]>;
  getReviewRequests(organizationId: number): Promise<any[]>;
  getReviewAnalytics(organizationId: number): Promise<any>;
  createReviewRequest(requestData: any): Promise<any>;
  getGoogleMyBusinessSettings(userId: number): Promise<any>;
  
  // Gas card methods
  getGasCards(organizationId: number): Promise<any[]>;
  getGasCardAssignments(organizationId: number): Promise<any[]>;
  getActiveGasCardAssignments(organizationId: number): Promise<any[]>;
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
      userId: customerData.userId || customerData.organizationId, // Handle both userId and organizationId
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
    const insertData = {
      ...projectData,
      userId: projectData.userId || projectData.organizationId // Handle both userId and organizationId
    };
    
    const [project] = await db
      .insert(projects)
      .values(insertData)
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
    const insertData = {
      ...expenseData,
      userId: expenseData.userId || expenseData.organizationId // Handle both userId and organizationId
    };
    
    const [expense] = await db
      .insert(expenses)
      .values(insertData)
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

  async getSettings(category: string): Promise<any> {
    try {
      const settingsArray = await db
        .select()
        .from(settings)
        .where(like(settings.key, `${category}_%`));
      
      const settingsObj: any = {};
      settingsArray.forEach(setting => {
        const key = setting.key.replace(`${category}_`, '');
        settingsObj[key] = setting.value;
      });
      
      return settingsObj;
    } catch (error) {
      console.error(`Error fetching settings for ${category}:`, error);
      return {}; // Return empty object if settings table doesn't exist
    }
  }

  async getSettingsByCategory(category: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(settings)
        .where(like(settings.key, `${category}_%`));
    } catch (error) {
      console.error(`Error fetching settings by category ${category}:`, error);
      return []; // Return empty array if settings table doesn't exist
    }
  }

  async updateSetting(category: string, key: string, value: string): Promise<void> {
    const fullKey = key.startsWith(`${category}_`) ? key : `${category}_${key}`;
    
    try {
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, fullKey))
        .limit(1);

      if (existingSetting.length > 0) {
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.key, fullKey));
      } else {
        await db
          .insert(settings)
          .values({
            key: fullKey,
            value,
            category,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error(`Error updating setting ${fullKey}:`, error);
      // Fallback for missing settings table - store in memory for now
    }
  }

  async updateSettings(category: string, settingsData: any): Promise<void> {
    for (const [key, value] of Object.entries(settingsData)) {
      if (value !== undefined && value !== null) {
        await this.updateSetting(category, key, String(value));
      }
    }
  }

  async getAllOrganizationsWithDetails(): Promise<any[]> {
    return await db
      .select({
        id: organizations.id,
        name: organizations.name,
        subscriptionPlan: organizations.subscriptionPlan,
        subscriptionStatus: organizations.subscriptionStatus,
        trialEndDate: organizations.trialEndDate,
        maxUsers: organizations.maxUsers,
        maxProjects: organizations.maxProjects,
        maxStorageGB: organizations.maxStorageGB,
        hasAdvancedReporting: organizations.hasAdvancedReporting,
        hasApiAccess: organizations.hasApiAccess,
        hasCustomBranding: organizations.hasCustomBranding,
        hasIntegrations: organizations.hasIntegrations,
        hasPrioritySupport: organizations.hasPrioritySupport,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));
  }

  // File methods
  async getFiles(organizationId: number): Promise<any[]> {
    const results = await db
      .select({
        id: fileManager.id,
        organizationId: fileManager.organizationId,
        uploadedBy: fileManager.uploadedBy,
        fileName: fileManager.fileName,
        originalName: fileManager.originalName,
        filePath: fileManager.filePath,
        fileSize: fileManager.fileSize,
        mimeType: fileManager.mimeType,
        fileType: fileManager.fileType,
        description: fileManager.description,
        tags: fileManager.tags,
        folderId: fileManager.folderId,
        isPublic: fileManager.isPublic,
        downloadCount: fileManager.downloadCount,
        shareableToken: fileManager.shareableToken,
        shareExpiresAt: fileManager.shareExpiresAt,
        createdAt: fileManager.createdAt,
        updatedAt: fileManager.updatedAt,
        uploadedByUser: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(fileManager)
      .leftJoin(users, eq(fileManager.uploadedBy, users.id))
      .where(eq(fileManager.organizationId, organizationId))
      .orderBy(desc(fileManager.createdAt));
    
    return results.map(row => ({
      ...row,
      uploadedByUser: row.uploadedByUser.username ? row.uploadedByUser : null
    }));
  }

  async createFile(fileData: any): Promise<any> {
    const [file] = await db
      .insert(fileManager)
      .values(fileData)
      .returning();
    return file;
  }

  async updateFile(id: number, updates: any): Promise<any> {
    const [file] = await db
      .update(fileManager)
      .set(updates)
      .where(eq(fileManager.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(fileManager).where(eq(fileManager.id, id));
  }

  async uploadProjectFile(fileData: any): Promise<any> {
    const [file] = await db
      .insert(projectFiles)
      .values(fileData)
      .returning();
    return file;
  }

  async getProjectFiles(projectId: number, userId: number): Promise<any[]> {
    return await db
      .select({
        id: projectFiles.id,
        projectId: projectFiles.projectId,
        taskId: projectFiles.taskId,
        fileName: projectFiles.fileName,
        originalName: projectFiles.originalName,
        filePath: projectFiles.filePath,
        fileSize: projectFiles.fileSize,
        mimeType: projectFiles.mimeType,
        fileType: projectFiles.fileType,
        description: projectFiles.description,
        uploadedById: projectFiles.uploadedById,
        createdAt: projectFiles.createdAt,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(projectFiles)
      .leftJoin(users, eq(projectFiles.uploadedById, users.id))
      .where(eq(projectFiles.projectId, projectId));
  }

  async getProjectFile(fileId: number, userId: number): Promise<any> {
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.id, fileId));
    return file;
  }

  async deleteProjectFile(fileId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(projectFiles)
      .where(eq(projectFiles.id, fileId))
      .returning();
    return result.length > 0;
  }

  // Calendar jobs methods
  async getCalendarJobs(organizationId: number): Promise<any[]> {
    const results = await db
      .select()
      .from(calendarJobs)
      .innerJoin(users, eq(calendarJobs.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(calendarJobs.createdAt));
    
    return results.map(row => row.calendar_jobs);
  }

  async getCalendarJob(id: number, organizationId: number): Promise<any> {
    const results = await db
      .select()
      .from(calendarJobs)
      .innerJoin(users, eq(calendarJobs.userId, users.id))
      .where(and(eq(calendarJobs.id, id), eq(users.organizationId, organizationId)))
      .limit(1);
    
    return results.length > 0 ? results[0].calendar_jobs : null;
  }

  async createCalendarJob(jobData: any): Promise<any> {
    // Handle date parsing and field mapping properly
    const processedData = { ...jobData };
    
    // Map scheduledDate to startDate if provided
    if (processedData.scheduledDate) {
      processedData.startDate = new Date(processedData.scheduledDate);
      delete processedData.scheduledDate;
    }
    
    // Ensure endDate is set - if not provided, set to same as startDate + 1 hour
    if (!processedData.endDate && processedData.startDate) {
      const endDate = new Date(processedData.startDate);
      endDate.setHours(endDate.getHours() + 1);
      processedData.endDate = endDate;
    } else if (processedData.endDate && typeof processedData.endDate === 'string') {
      processedData.endDate = new Date(processedData.endDate);
    }
    
    // Parse startDate if it's a string
    if (processedData.startDate && typeof processedData.startDate === 'string') {
      processedData.startDate = new Date(processedData.startDate);
    }
    
    const [job] = await db
      .insert(calendarJobs)
      .values(processedData)
      .returning();
    return job;
  }

  async updateCalendarJob(id: number, updates: any): Promise<any> {
    const [job] = await db
      .update(calendarJobs)
      .set(updates)
      .where(eq(calendarJobs.id, id))
      .returning();
    return job;
  }

  async deleteCalendarJob(id: number): Promise<void> {
    await db.delete(calendarJobs).where(eq(calendarJobs.id, id));
  }

  // Task management methods
  async getTeamTasksForManager(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(tasks)
      .innerJoin(users, eq(tasks.assignedToId, users.id))
      .where(eq(tasks.createdById, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksCreatedByUser(userId: number): Promise<any[]> {
    const results = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.createdById, userId))
      .orderBy(desc(tasks.createdAt));
    
    return results.map(row => ({
      ...row.tasks,
      assignedTo: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        username: row.users.username
      } : null,
      project: row.projects ? {
        id: row.projects.id,
        name: row.projects.name
      } : null
    }));
  }

  async getTasksAssignedToUser(userId: number): Promise<any[]> {
    const results = await db
      .select()
      .from(tasks)
      .leftJoin(users, eq(tasks.createdById, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.assignedToId, userId))
      .orderBy(desc(tasks.createdAt));
    
    return results.map(row => ({
      ...row.tasks,
      assignedBy: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        username: row.users.username
      } : null,
      project: row.projects ? {
        id: row.projects.id,
        name: row.projects.name
      } : null
    }));
  }

  async createTask(taskData: any): Promise<any> {
    // Ensure required fields are provided
    const processedData = { ...taskData };
    if (!processedData.projectId) {
      processedData.projectId = 8; // Use the default tasks project ID
    }
    
    // Map createdById field properly
    if (processedData.createdById) {
      processedData.createdById = processedData.createdById;
    } else if (processedData.userId) {
      processedData.createdById = processedData.userId;
    }
    
    const [task] = await db
      .insert(tasks)
      .values(processedData)
      .returning();
    return task;
  }

  async createTaskForOrganization(organizationId: number, taskData: any, userId: number): Promise<any> {
    const processedData = { ...taskData };
    if (!processedData.projectId) {
      processedData.projectId = 8; // Use the default tasks project ID
    }
    
    // Set the createdById field properly
    processedData.createdById = userId;
    
    const [task] = await db
      .insert(tasks)
      .values(processedData)
      .returning();
    return task;
  }

  async canUserDelegateTask(userId: number, assignedToId: number): Promise<boolean> {
    // Get user's role to check delegation permissions
    const user = await this.getUser(userId);
    return user?.role === 'admin' || user?.role === 'manager';
  }

  async getTasks(projectId: number, userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdById: tasks.createdById,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignedTo: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.projectId, projectId));
    
    return result;
  }

  async getAllTasksForOrganization(organizationId: number): Promise<any[]> {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdById: tasks.createdById,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignedTo: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(userProjects, eq(projects.id, userProjects.projectId))
      .innerJoin(orgUsers, eq(userProjects.userId, orgUsers.id))
      .where(eq(orgUsers.organizationId, organizationId));
    
    return result;
  }

  async updateTask(id: number, userId: number, updates: any): Promise<any> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
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

  // SMS and Review methods
  async getSmsMessages(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(users.organizationId, organizationId))
        .orderBy(desc(messages.createdAt));
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
      return [];
    }
  }

  async getSmsTemplates(organizationId: number): Promise<any[]> {
    try {
      // Return default templates for now
      return [
        {
          id: 1,
          name: 'Job Reminder',
          content: 'Hi {customerName}, this is a reminder about your scheduled service on {date}.',
          variables: ['customerName', 'date']
        },
        {
          id: 2,
          name: 'Job Complete',
          content: 'Hi {customerName}, your service has been completed. Thank you for choosing us!',
          variables: ['customerName']
        }
      ];
    } catch (error) {
      console.error('Error fetching SMS templates:', error);
      return [];
    }
  }

  async getReviewRequests(organizationId: number): Promise<any[]> {
    try {
      // Return empty array for now as reviewRequests table may not exist
      return [];
    } catch (error) {
      console.error('Error fetching review requests:', error);
      return [];
    }
  }

  async getReviewAnalytics(organizationId: number): Promise<any> {
    try {
      return {
        totalRequests: 0,
        sentRequests: 0,
        clickedRequests: 0,
        completedReviews: 0,
        averageRating: 0,
        clickRate: 0,
        conversionRate: 0
      };
    } catch (error) {
      console.error('Error fetching review analytics:', error);
      return {
        totalRequests: 0,
        sentRequests: 0,
        clickedRequests: 0,
        completedReviews: 0,
        averageRating: 0,
        clickRate: 0,
        conversionRate: 0
      };
    }
  }

  async createReviewRequest(requestData: any): Promise<any> {
    try {
      // For now, return the request data as if it was created
      return {
        id: Date.now(),
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating review request:', error);
      throw error;
    }
  }

  async getGoogleMyBusinessSettings(userId: number): Promise<any> {
    try {
      // Return default settings for now
      return {
        id: 1,
        userId,
        businessName: 'Your Business',
        reviewUrl: 'https://g.page/yourbusiness/review',
        isActive: true
      };
    } catch (error) {
      console.error('Error fetching Google My Business settings:', error);
      return null;
    }
  }

  // Gas card methods
  async getGasCards(organizationId: number): Promise<any[]> {
    try {
      // Return empty array for now as gas card tables may not exist
      return [];
    } catch (error) {
      console.error('Error fetching gas cards:', error);
      return [];
    }
  }

  async getGasCardAssignments(organizationId: number): Promise<any[]> {
    try {
      // Return empty array for now as gas card assignment tables may not exist
      return [];
    } catch (error) {
      console.error('Error fetching gas card assignments:', error);
      return [];
    }
  }

  async getActiveGasCardAssignments(organizationId: number): Promise<any[]> {
    try {
      // Return empty array for now as gas card assignment tables may not exist
      return [];
    } catch (error) {
      console.error('Error fetching active gas card assignments:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();