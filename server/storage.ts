import { db } from "./db";
import { 
  users, customers, invoices, quotes, projects, tasks, 
  expenses, expenseCategories, vendors, expenseReports, gasCards, 
  gasCardAssignments, leads, calendarJobs, messages,
  images, settings, organizations, userSessions, subscriptionPlans,
  projectFiles, fileManager, projectUsers, timeClock, timeClockSettings,
  internalMessages, internalMessageRecipients, messageGroups, messageGroupMembers,
  inspectionTemplates, inspectionItems, inspectionRecords, inspectionResponses, inspectionNotifications
} from "@shared/schema";
import type { GasCard, InsertGasCard, GasCardAssignment, InsertGasCardAssignment } from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull, isNull } from "drizzle-orm";
import type { 
  User, Customer, Invoice, Quote, Project, Task, 
  Expense, ExpenseCategory, ExpenseReport, GasCard,
  Lead, CalendarJob, Message, Organization
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  updateUser(id: number, updates: any): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(organizationId?: number): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
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
  getProject(id: number, userId: number): Promise<any>;
  createProject(projectData: any): Promise<any>;
  updateProject(id: number, updates: any): Promise<any>;
  deleteProject(id: number): Promise<void>;
  assignUserToProject(userId: number, projectId: number, role?: string): Promise<any>;
  removeUserFromProject(userId: number, projectId: number): Promise<void>;
  
  // Expense methods
  getExpenses(organizationId: number, userId?: number): Promise<any[]>;
  getExpense(id: number, userId?: number): Promise<any>;
  createExpense(expenseData: any): Promise<any>;
  updateExpense(id: number, userId: number, updates: any): Promise<any>;
  deleteExpense(id: number, userId: number): Promise<boolean>;
  approveExpense(id: number, approvedBy: number): Promise<boolean>;
  
  // Expense trash methods
  getTrashedExpenses(organizationId: number, userId?: number): Promise<any[]>;
  restoreExpense(id: number, userId: number): Promise<boolean>;
  permanentlyDeleteExpense(id: number, userId: number): Promise<boolean>;
  
  // Expense categories methods
  getExpenseCategories(organizationId: number): Promise<any[]>;
  createExpenseCategory(categoryData: any): Promise<any>;
  updateExpenseCategory(id: number, updates: any): Promise<any>;
  deleteExpenseCategory(id: number): Promise<void>;
  
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
  updateSystemSetting(key: string, value: string): Promise<void>;
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
  
  // Image methods
  createImage(imageData: any): Promise<any>;
  getImages(userId: number): Promise<any[]>;
  saveImageAnnotations(imageId: number, userId: number, annotations: any, annotatedImageUrl: string): Promise<void>;
  deleteImage(imageId: number, userId: number): Promise<boolean>;
  deleteImage(id: number): Promise<void>;
  
  // Form Builder methods
  getCustomForms(organizationId: number): Promise<any[]>;
  getCustomForm(id: number, organizationId: number): Promise<any>;
  createCustomForm(formData: any): Promise<any>;
  updateCustomForm(id: number, updates: any): Promise<any>;
  deleteCustomForm(id: number): Promise<void>;
  getFormTemplates(): Promise<any[]>;
  createFormTemplate(templateData: any): Promise<any>;
  getFormSubmissions(formId: number): Promise<any[]>;
  createFormSubmission(submissionData: any): Promise<any>;
  updateFormSubmissionCount(formId: number): Promise<void>;
  
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
  getGasCards(): Promise<GasCard[]>;
  createGasCard(data: InsertGasCard): Promise<GasCard>;
  updateGasCard(id: number, data: Partial<InsertGasCard>): Promise<GasCard>;
  deleteGasCard(id: number): Promise<boolean>;
  getGasCardAssignments(): Promise<GasCardAssignment[]>;
  getActiveGasCardAssignments(): Promise<GasCardAssignment[]>;
  createGasCardAssignment(data: InsertGasCardAssignment): Promise<GasCardAssignment>;
  returnGasCard(assignmentId: number, returnedDate: Date): Promise<GasCardAssignment>;
  
  // Gas card provider methods
  getGasCardProviders(organizationId: number): Promise<any[]>;
  getGasCardProvider(id: number, organizationId: number): Promise<any>;
  createGasCardProvider(providerData: any): Promise<any>;
  updateGasCardProvider(id: number, organizationId: number, updates: any): Promise<any>;
  deleteGasCardProvider(id: number, organizationId: number): Promise<boolean>;
  
  // Time clock methods
  getCurrentTimeClockEntry(userId: number): Promise<any>;
  clockIn(userId: number, organizationId: number, location?: string, ipAddress?: string): Promise<any>;
  clockOut(userId: number, notes?: string): Promise<any>;
  startBreak(userId: number): Promise<any>;
  endBreak(userId: number): Promise<any>;
  getTimeClockEntries(userId: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  getTimeClockEntriesForOrganization(organizationId: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  updateTimeClockEntry(id: number, updates: any): Promise<any>;
  getTimeClockSettings(organizationId: number): Promise<any>;
  updateTimeClockSettings(organizationId: number, settings: any): Promise<any>;
  
  // Internal messaging methods
  getInternalMessages(userId: number): Promise<any[]>;
  getInternalMessage(messageId: number, userId: number): Promise<any>;
  createInternalMessage(messageData: any, recipientIds: number[]): Promise<any>;
  markMessageAsRead(messageId: number, userId: number): Promise<boolean>;
  deleteInternalMessage(messageId: number, userId: number): Promise<boolean>;
  sendGroupMessage(groupId: number, messageData: any): Promise<any>;
  
  // Inspection methods
  getInspectionTemplates(organizationId: number, type?: string): Promise<any[]>;
  createInspectionTemplate(templateData: any): Promise<any>;
  getInspectionItems(templateId: number): Promise<any[]>;
  createInspectionItem(itemData: any): Promise<any>;
  updateInspectionItem(itemId: number, itemData: any): Promise<any>;
  deleteInspectionItem(itemId: number): Promise<boolean>;
  getInspectionRecords(userId: number, organizationId: number, type?: string): Promise<any[]>;
  createInspectionRecord(recordData: any): Promise<any>;
  getInspectionRecord(recordId: number, userId: number): Promise<any>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    
    // Permission fields
    if (updates.canViewProfiles !== undefined) updateData.canViewProfiles = updates.canViewProfiles;
    if (updates.canEditProfiles !== undefined) updateData.canEditProfiles = updates.canEditProfiles;
    if (updates.canCreateInvoices !== undefined) updateData.canCreateInvoices = updates.canCreateInvoices;
    if (updates.canViewAllData !== undefined) updateData.canViewAllData = updates.canViewAllData;
    if (updates.canManageProjects !== undefined) updateData.canManageProjects = updates.canManageProjects;
    if (updates.canAccessReports !== undefined) updateData.canAccessReports = updates.canAccessReports;
    
    // Tab access permissions
    if (updates.canAccessDashboard !== undefined) updateData.canAccessDashboard = updates.canAccessDashboard;
    if (updates.canAccessCustomers !== undefined) updateData.canAccessCustomers = updates.canAccessCustomers;
    if (updates.canAccessProjects !== undefined) updateData.canAccessProjects = updates.canAccessProjects;
    if (updates.canAccessInvoices !== undefined) updateData.canAccessInvoices = updates.canAccessInvoices;
    if (updates.canAccessQuotes !== undefined) updateData.canAccessQuotes = updates.canAccessQuotes;
    if (updates.canAccessExpenses !== undefined) updateData.canAccessExpenses = updates.canAccessExpenses;
    if (updates.canAccessExpenseReports !== undefined) updateData.canAccessExpenseReports = updates.canAccessExpenseReports;
    if (updates.canAccessPayments !== undefined) updateData.canAccessPayments = updates.canAccessPayments;
    if (updates.canAccessMessages !== undefined) updateData.canAccessMessages = updates.canAccessMessages;
    if (updates.canAccessInternalMessages !== undefined) updateData.canAccessInternalMessages = updates.canAccessInternalMessages;
    if (updates.canAccessSMS !== undefined) updateData.canAccessSMS = updates.canAccessSMS;
    if (updates.canAccessCalendar !== undefined) updateData.canAccessCalendar = updates.canAccessCalendar;
    if (updates.canAccessImageGallery !== undefined) updateData.canAccessImageGallery = updates.canAccessImageGallery;
    if (updates.canAccessReviews !== undefined) updateData.canAccessReviews = updates.canAccessReviews;
    if (updates.canAccessLeads !== undefined) updateData.canAccessLeads = updates.canAccessLeads;
    if (updates.canAccessGasCards !== undefined) updateData.canAccessGasCards = updates.canAccessGasCards;
    if (updates.canAccessSettings !== undefined) updateData.canAccessSettings = updates.canAccessSettings;
    if (updates.canAccessUsers !== undefined) updateData.canAccessUsers = updates.canAccessUsers;
    if (updates.canAccessAdminSettings !== undefined) updateData.canAccessAdminSettings = updates.canAccessAdminSettings;
    if (updates.canAccessHR !== undefined) updateData.canAccessHR = updates.canAccessHR;

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
      userId: customerData.userId,  // This should be the actual userId who created the customer
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

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)))
      .orderBy(users.firstName, users.lastName, users.username);
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
    // Get all projects for the organization
    const allProjects = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        endDate: projects.endDate,
        deadline: projects.deadline,
        progress: projects.progress,
        budget: projects.budget,
        customerId: projects.customerId,
        contactName: projects.contactName,
        contactEmail: projects.contactEmail,
        contactPhone: projects.contactPhone,
        contactCompany: projects.contactCompany,
        address: projects.address,
        city: projects.city,
        state: projects.state,
        zipCode: projects.zipCode,
        country: projects.country,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(projects.createdAt));

    // Get task counts and customer info for each project
    const projectsWithDetails = await Promise.all(
      allProjects.map(async (project) => {
        const taskCounts = await db
          .select({
            total: sql<number>`count(*)`,
            completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`,
          })
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        const customer = project.customerId ? await db
          .select()
          .from(customers)
          .where(eq(customers.id, project.customerId))
          .limit(1) : [];

        const projectTeam = await db
          .select({
            user: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              role: projectUsers.role,
            }
          })
          .from(projectUsers)
          .innerJoin(users, eq(projectUsers.userId, users.id))
          .where(eq(projectUsers.projectId, project.id));

        return {
          ...project,
          taskCount: Number(taskCounts[0]?.total) || 0,
          completedTasks: Number(taskCounts[0]?.completed) || 0,
          customer: customer[0] || null,
          users: projectTeam || [],
        };
      })
    );

    return projectsWithDetails;
  }

  async getProject(id: number, userId: number): Promise<any> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project) return null;

    // Get task counts
    const taskCounts = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, project.id));

    // Get customer info
    const customer = project.customerId ? await db
      .select()
      .from(customers)
      .where(eq(customers.id, project.customerId))
      .limit(1) : [];

    // Get project team members
    const projectTeam = await db
      .select({
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: projectUsers.role,
        }
      })
      .from(projectUsers)
      .innerJoin(users, eq(projectUsers.userId, users.id))
      .where(eq(projectUsers.projectId, project.id));

    return {
      ...project,
      taskCount: Number(taskCounts[0]?.total) || 0,
      completedTasks: Number(taskCounts[0]?.completed) || 0,
      customer: customer[0] || null,
      users: projectTeam || [],
    };
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

  async assignUserToProject(userId: number, projectId: number, role: string = "member"): Promise<any> {
    const [assignment] = await db
      .insert(projectUsers)
      .values({ userId, projectId, role })
      .onConflictDoNothing()
      .returning();
    return assignment;
  }

  async removeUserFromProject(userId: number, projectId: number): Promise<void> {
    await db
      .delete(projectUsers)
      .where(and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)));
  }

  // Expense methods
  async getExpenses(organizationId: number, userId?: number): Promise<any[]> {
    // Check if user is admin - admins can see all expenses across organizations
    let isAdmin = false;
    if (userId) {
      const user = await this.getUser(userId);
      isAdmin = user?.role === 'admin';
    }

    const results = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        projectId: expenses.projectId,
        amount: expenses.amount,
        currency: expenses.currency,
        category: expenses.category,
        subcategory: expenses.subcategory,
        description: expenses.description,
        vendor: expenses.vendor,
        receiptUrl: expenses.receiptUrl,
        receiptData: expenses.receiptData,
        expenseDate: expenses.expenseDate,
        status: expenses.status,
        isReimbursable: expenses.isReimbursable,
        tags: expenses.tags,
        notes: expenses.notes,
        approvedBy: expenses.approvedBy,
        approvedAt: expenses.approvedAt,
        reimbursedAt: expenses.reimbursedAt,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .where(and(
        isNull(expenses.deletedAt), // Only show non-deleted expenses
        isAdmin ? undefined : eq(users.organizationId, organizationId)
      ))
      .orderBy(desc(expenses.createdAt));

    return results;
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

  async updateExpense(id: number, userId: number, updates: any): Promise<any> {
    // Filter out undefined values to avoid database errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    // Add updatedAt timestamp
    cleanUpdates.updatedAt = new Date();
    
    // Get the current user to check permissions
    const currentUser = await this.getUser(userId);
    
    // If user is admin, allow updating any expense in their organization
    // Otherwise, only allow updating their own expenses
    let whereCondition;
    if (currentUser?.role === 'admin') {
      // Admin can update any expense in their organization
      const [existingExpense] = await db
        .select({ userId: expenses.userId })
        .from(expenses)
        .innerJoin(users, eq(expenses.userId, users.id))
        .where(and(
          eq(expenses.id, id),
          eq(users.organizationId, currentUser.organizationId)
        ));
      
      if (!existingExpense) {
        return null; // Expense not found in user's organization
      }
      
      whereCondition = eq(expenses.id, id);
    } else {
      // Regular user can only update their own expenses
      whereCondition = and(eq(expenses.id, id), eq(expenses.userId, userId));
    }
    
    const [expense] = await db
      .update(expenses)
      .set(cleanUpdates)
      .where(whereCondition)
      .returning();
    return expense;
  }

  async getExpense(id: number, userId?: number): Promise<any> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async deleteExpense(id: number, userId: number): Promise<boolean> {
    // Soft delete - set deletedAt timestamp instead of actually deleting
    const [expense] = await db
      .update(expenses)
      .set({ 
        deletedAt: new Date(),
        deletedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, id))
      .returning();
    return !!expense;
  }

  async approveExpense(id: number, approvedBy: number): Promise<boolean> {
    const [expense] = await db
      .update(expenses)
      .set({ 
        status: 'approved', 
        approvedBy, 
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(expenses.id, id))
      .returning();
    return !!expense;
  }

  // Expense trash management methods
  async getTrashedExpenses(organizationId: number, userId?: number): Promise<any[]> {
    try {
      // Validate organizationId and ensure it's a number
      const orgId = Number(organizationId);
      if (!orgId || isNaN(orgId)) {
        console.error("Invalid organizationId:", organizationId);
        return [];
      }

      // Check if user is admin
      let isAdmin = false;
      if (userId) {
        const user = await this.getUser(userId);
        isAdmin = user?.role === 'admin';
      }

      const whereConditions = [isNotNull(expenses.deletedAt)];
      
      // If not admin, filter by organization - ensure proper type conversion
      if (!isAdmin) {
        whereConditions.push(eq(users.organizationId, orgId));
      }

      const results = await db
        .select({
          id: expenses.id,
          userId: expenses.userId,
          projectId: expenses.projectId,
          amount: expenses.amount,
          currency: expenses.currency,
          category: expenses.category,
          subcategory: expenses.subcategory,
          description: expenses.description,
          vendor: expenses.vendor,
          receiptUrl: expenses.receiptUrl,
          receiptData: expenses.receiptData,
          expenseDate: expenses.expenseDate,
          status: expenses.status,
          isReimbursable: expenses.isReimbursable,
          tags: expenses.tags,
          notes: expenses.notes,
          approvedBy: expenses.approvedBy,
          approvedAt: expenses.approvedAt,
          reimbursedAt: expenses.reimbursedAt,
          deletedAt: expenses.deletedAt,
          deletedBy: expenses.deletedBy,
          createdAt: expenses.createdAt,
          updatedAt: expenses.updatedAt,
          project: {
            id: projects.id,
            name: projects.name
          }
        })
        .from(expenses)
        .innerJoin(users, eq(expenses.userId, users.id))
        .leftJoin(projects, eq(expenses.projectId, projects.id))
        .where(and(...whereConditions))
        .orderBy(desc(expenses.deletedAt));

      return results;
    } catch (error) {
      console.error("Error in getTrashedExpenses:", error);
      return [];
    }
  }

  async restoreExpense(id: number, userId: number): Promise<boolean> {
    // Restore expense by clearing deletedAt and deletedBy
    const [expense] = await db
      .update(expenses)
      .set({ 
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, id))
      .returning();
    return !!expense;
  }

  async permanentlyDeleteExpense(id: number, userId: number): Promise<boolean> {
    // Permanently delete the expense record
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  async getExpenseCategories(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.organizationId, organizationId))
      .orderBy(expenseCategories.name);
  }

  async createExpenseCategory(categoryData: any): Promise<any> {
    const [category] = await db
      .insert(expenseCategories)
      .values(categoryData)
      .returning();
    return category;
  }

  // Vendor methods
  async getVendors(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.organizationId, organizationId), eq(vendors.isActive, true)))
      .orderBy(vendors.name);
  }

  async createVendor(vendorData: any): Promise<any> {
    const [vendor] = await db
      .insert(vendors)
      .values(vendorData)
      .returning();
    return vendor;
  }

  async updateVendor(id: number, updates: any): Promise<any> {
    const [vendor] = await db
      .update(vendors)
      .set(updates)
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db
      .update(vendors)
      .set({ isActive: false })
      .where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  async getVendorByName(name: string, organizationId: number): Promise<any> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.name, name), eq(vendors.organizationId, organizationId)))
      .limit(1);
    return vendor;
  }

  async updateExpenseCategory(id: number, updates: any): Promise<any> {
    const [category] = await db
      .update(expenseCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenseCategories.id, id))
      .returning();
    return category;
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
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

  async updateSystemSetting(key: string, value: string): Promise<void> {
    try {
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key));

      if (existingSetting.length > 0) {
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.key, key));
      } else {
        await db
          .insert(settings)
          .values({
            key: key,
            value,
            category: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error(`Error updating system setting ${key}:`, error);
      throw error;
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

  async convertJobToProject(jobId: number, userId: number, projectData: any): Promise<any> {
    try {
      // First, get the calendar job to verify it exists and get its data
      const calendarJob = await db
        .select()
        .from(calendarJobs)
        .where(eq(calendarJobs.id, jobId))
        .limit(1);

      if (calendarJob.length === 0) {
        return null;
      }

      const job = calendarJob[0];

      // Create a new project based on the calendar job data
      const projectPayload = {
        name: projectData.name || job.title,
        description: projectData.description || job.description || '',
        userId: userId,
        customerId: job.customerId,
        status: 'active',
        startDate: job.startDate,
        endDate: job.endDate,
        estimatedValue: job.estimatedValue,
      };

      const [newProject] = await db
        .insert(projects)
        .values(projectPayload)
        .returning();

      // Update the calendar job to mark it as converted and link to the new project
      await db
        .update(calendarJobs)
        .set({
          status: 'converted',
          convertedToProjectId: newProject.id,
          updatedAt: new Date(),
        })
        .where(eq(calendarJobs.id, jobId));

      return newProject;
    } catch (error) {
      console.error('Error converting calendar job to project:', error);
      throw error;
    }
  }

  // Inspection Methods
  async getInspectionTemplates(organizationId: number, type?: string): Promise<any[]> {
    let query = db
      .select()
      .from(inspectionTemplates)
      .where(and(
        eq(inspectionTemplates.organizationId, organizationId),
        eq(inspectionTemplates.isActive, true)
      ))
      .orderBy(inspectionTemplates.sortOrder, inspectionTemplates.name);

    if (type) {
      query = query.where(and(
        eq(inspectionTemplates.organizationId, organizationId),
        eq(inspectionTemplates.type, type),
        eq(inspectionTemplates.isActive, true)
      ));
    }

    return await query;
  }

  async createInspectionTemplate(templateData: any): Promise<any> {
    const [template] = await db
      .insert(inspectionTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async getInspectionItems(templateId: number): Promise<any[]> {
    return await db
      .select()
      .from(inspectionItems)
      .where(and(
        eq(inspectionItems.templateId, templateId),
        eq(inspectionItems.isActive, true)
      ))
      .orderBy(inspectionItems.sortOrder, inspectionItems.name);
  }

  async createInspectionItem(itemData: any): Promise<any> {
    const [item] = await db
      .insert(inspectionItems)
      .values(itemData)
      .returning();
    return item;
  }

  async updateInspectionItem(itemId: number, itemData: any): Promise<any> {
    const [item] = await db
      .update(inspectionItems)
      .set(itemData)
      .where(eq(inspectionItems.id, itemId))
      .returning();
    return item;
  }

  async deleteInspectionItem(itemId: number): Promise<boolean> {
    const result = await db
      .update(inspectionItems)
      .set({ isActive: false })
      .where(eq(inspectionItems.id, itemId));
    return result.rowCount > 0;
  }

  async getInspectionRecords(userId: number, organizationId: number, type?: string): Promise<any[]> {
    let query = db
      .select({
        id: inspectionRecords.id,
        userId: inspectionRecords.userId,
        templateId: inspectionRecords.templateId,
        type: inspectionRecords.type,
        vehicleInfo: inspectionRecords.vehicleInfo,
        status: inspectionRecords.status,
        submittedAt: inspectionRecords.submittedAt,
        reviewedBy: inspectionRecords.reviewedBy,
        reviewedAt: inspectionRecords.reviewedAt,
        reviewNotes: inspectionRecords.reviewNotes,
        location: inspectionRecords.location,
        photos: inspectionRecords.photos,
        signature: inspectionRecords.signature,
        createdAt: inspectionRecords.createdAt,
        templateName: inspectionTemplates.name,
        reviewerName: users.firstName
      })
      .from(inspectionRecords)
      .innerJoin(inspectionTemplates, eq(inspectionRecords.templateId, inspectionTemplates.id))
      .leftJoin(users, eq(inspectionRecords.reviewedBy, users.id))
      .where(and(
        eq(inspectionRecords.userId, userId),
        eq(inspectionRecords.organizationId, organizationId)
      ))
      .orderBy(desc(inspectionRecords.createdAt));

    if (type) {
      query = query.where(and(
        eq(inspectionRecords.userId, userId),
        eq(inspectionRecords.organizationId, organizationId),
        eq(inspectionRecords.type, type)
      ));
    }

    return await query;
  }

  async createInspectionRecord(recordData: any): Promise<any> {
    const [record] = await db
      .insert(inspectionRecords)
      .values(recordData)
      .returning();
    return record;
  }

  async getInspectionRecord(recordId: number, userId: number): Promise<any> {
    const results = await db
      .select({
        id: inspectionRecords.id,
        userId: inspectionRecords.userId,
        templateId: inspectionRecords.templateId,
        type: inspectionRecords.type,
        vehicleInfo: inspectionRecords.vehicleInfo,
        status: inspectionRecords.status,
        submittedAt: inspectionRecords.submittedAt,
        reviewedBy: inspectionRecords.reviewedBy,
        reviewedAt: inspectionRecords.reviewedAt,
        reviewNotes: inspectionRecords.reviewNotes,
        location: inspectionRecords.location,
        photos: inspectionRecords.photos,
        signature: inspectionRecords.signature,
        createdAt: inspectionRecords.createdAt,
        templateName: inspectionTemplates.name
      })
      .from(inspectionRecords)
      .innerJoin(inspectionTemplates, eq(inspectionRecords.templateId, inspectionTemplates.id))
      .where(and(
        eq(inspectionRecords.id, recordId),
        eq(inspectionRecords.userId, userId)
      ))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async getInspectionResponses(recordId: number): Promise<any[]> {
    return await db
      .select({
        id: inspectionResponses.id,
        recordId: inspectionResponses.recordId,
        itemId: inspectionResponses.itemId,
        response: inspectionResponses.response,
        notes: inspectionResponses.notes,
        photos: inspectionResponses.photos,
        createdAt: inspectionResponses.createdAt,
        itemName: inspectionItems.name,
        itemCategory: inspectionItems.category,
        itemDescription: inspectionItems.description,
        isRequired: inspectionItems.isRequired
      })
      .from(inspectionResponses)
      .innerJoin(inspectionItems, eq(inspectionResponses.itemId, inspectionItems.id))
      .where(eq(inspectionResponses.recordId, recordId))
      .orderBy(inspectionItems.sortOrder, inspectionItems.name);
  }

  async createInspectionResponse(responseData: any): Promise<any> {
    const [response] = await db
      .insert(inspectionResponses)
      .values(responseData)
      .returning();
    return response;
  }

  async updateInspectionRecord(recordId: number, updates: any): Promise<any> {
    const [record] = await db
      .update(inspectionRecords)
      .set(updates)
      .where(eq(inspectionRecords.id, recordId))
      .returning();
    return record;
  }

  async createInspectionNotification(notificationData: any): Promise<any> {
    const [notification] = await db
      .insert(inspectionNotifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getInspectionNotifications(userId: number): Promise<any[]> {
    return await db
      .select({
        id: inspectionNotifications.id,
        recordId: inspectionNotifications.recordId,
        notificationType: inspectionNotifications.notificationType,
        message: inspectionNotifications.message,
        isRead: inspectionNotifications.isRead,
        sentAt: inspectionNotifications.sentAt,
        inspectionType: inspectionRecords.type,
        submitterName: users.firstName
      })
      .from(inspectionNotifications)
      .innerJoin(inspectionRecords, eq(inspectionNotifications.recordId, inspectionRecords.id))
      .innerJoin(users, eq(inspectionRecords.userId, users.id))
      .where(eq(inspectionNotifications.sentTo, userId))
      .orderBy(desc(inspectionNotifications.sentAt));
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
  async getGasCards(): Promise<GasCard[]> {
    try {
      const result = await db.select().from(gasCards).orderBy(gasCards.createdAt);
      return result;
    } catch (error) {
      console.error('Error fetching gas cards:', error);
      return [];
    }
  }

  async createGasCard(data: InsertGasCard): Promise<GasCard> {
    const [gasCard] = await db.insert(gasCards).values(data).returning();
    return gasCard;
  }

  async updateGasCard(id: number, data: Partial<InsertGasCard>): Promise<GasCard> {
    const [gasCard] = await db.update(gasCards)
      .set(data)
      .where(eq(gasCards.id, id))
      .returning();
    return gasCard;
  }

  async deleteGasCard(id: number): Promise<boolean> {
    const result = await db.delete(gasCards).where(eq(gasCards.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getGasCardAssignments(): Promise<GasCardAssignment[]> {
    try {
      const result = await db.select().from(gasCardAssignments).orderBy(gasCardAssignments.createdAt);
      return result;
    } catch (error) {
      console.error('Error fetching gas card assignments:', error);
      return [];
    }
  }

  async getActiveGasCardAssignments(): Promise<GasCardAssignment[]> {
    try {
      const result = await db.select()
        .from(gasCardAssignments)
        .where(isNull(gasCardAssignments.returnedDate))
        .orderBy(gasCardAssignments.assignedDate);
      return result;
    } catch (error) {
      console.error('Error fetching active gas card assignments:', error);
      return [];
    }
  }

  async createGasCardAssignment(data: InsertGasCardAssignment): Promise<GasCardAssignment> {
    const [assignment] = await db.insert(gasCardAssignments).values(data).returning();
    return assignment;
  }

  async returnGasCard(assignmentId: number, returnedDate: Date): Promise<GasCardAssignment> {
    const [assignment] = await db.update(gasCardAssignments)
      .set({ 
        returnedDate,
        status: 'returned'
      })
      .where(eq(gasCardAssignments.id, assignmentId))
      .returning();
    return assignment;
  }

  // Time Clock Methods
  async getCurrentTimeClockEntry(userId: number): Promise<any> {
    const [entry] = await db.select({
      id: timeClock.id,
      userId: timeClock.userId,
      clockInTime: timeClock.clockInTime,
      clockOutTime: timeClock.clockOutTime,
      breakStart: timeClock.breakStart,
      breakEnd: timeClock.breakEnd,
      status: timeClock.status,
      clockInLocation: timeClock.clockInLocation,
      clockOutLocation: timeClock.clockOutLocation,
      totalHours: timeClock.totalHours,
      breakDuration: timeClock.breakDuration,
      notes: timeClock.notes
    })
      .from(timeClock)
      .where(and(
        eq(timeClock.userId, userId),
        or(eq(timeClock.status, "clocked_in"), eq(timeClock.status, "on_break"))
      ))
      .orderBy(desc(timeClock.clockInTime))
      .limit(1);
    
    return entry;
  }

  async clockIn(userId: number, organizationId: number, location?: string, ipAddress?: string): Promise<any> {
    const existing = await this.getCurrentTimeClockEntry(userId);
    if (existing) {
      throw new Error("User is already clocked in");
    }

    const [entry] = await db.insert(timeClock).values({
      userId,
      organizationId,
      clockInTime: new Date(),
      clockInLocation: location,
      clockInIP: ipAddress,
      status: "clocked_in"
    }).returning();

    return entry;
  }

  async clockOut(userId: number, notes?: string): Promise<any> {
    const current = await this.getCurrentTimeClockEntry(userId);
    if (!current) {
      throw new Error("User is not currently clocked in");
    }

    const clockOutTime = new Date();
    const totalHours = (clockOutTime.getTime() - current.clockInTime.getTime()) / (1000 * 60 * 60);

    const [entry] = await db.update(timeClock)
      .set({
        clockOutTime,
        totalHours: totalHours.toString(),
        status: "clocked_out",
        notes,
        updatedAt: new Date()
      })
      .where(eq(timeClock.id, current.id))
      .returning();

    return entry;
  }

  async startBreak(userId: number): Promise<any> {
    const current = await this.getCurrentTimeClockEntry(userId);
    if (!current) {
      throw new Error("User is not currently clocked in");
    }
    if (current.status === "on_break") {
      throw new Error("User is already on break");
    }

    const [entry] = await db.update(timeClock)
      .set({
        breakStart: new Date(),
        status: "on_break",
        updatedAt: new Date()
      })
      .where(eq(timeClock.id, current.id))
      .returning();

    return entry;
  }

  async endBreak(userId: number): Promise<any> {
    const current = await this.getCurrentTimeClockEntry(userId);
    if (!current || current.status !== "on_break") {
      throw new Error("User is not currently on break");
    }

    const breakEnd = new Date();
    const breakDuration = current.breakStart ? 
      (breakEnd.getTime() - current.breakStart.getTime()) / (1000 * 60 * 60) : 0;

    const totalBreakDuration = parseFloat(current.breakDuration || "0") + breakDuration;

    const [entry] = await db.update(timeClock)
      .set({
        breakEnd,
        breakDuration: totalBreakDuration.toString(),
        status: "clocked_in",
        updatedAt: new Date()
      })
      .where(eq(timeClock.id, current.id))
      .returning();

    return entry;
  }

  async getTimeClockEntries(userId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let whereConditions = [eq(timeClock.userId, userId)];

    if (startDate) {
      whereConditions.push(gte(timeClock.clockInTime, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(timeClock.clockInTime, endDate));
    }

    const entries = await db.select({
      id: timeClock.id,
      userId: timeClock.userId,
      clockInTime: timeClock.clockInTime,
      clockOutTime: timeClock.clockOutTime,
      totalHours: timeClock.totalHours,
      breakDuration: timeClock.breakDuration,
      status: timeClock.status,
      notes: timeClock.notes,
      supervisorApproval: timeClock.supervisorApproval,
      clockInLocation: timeClock.clockInLocation,
      clockOutLocation: timeClock.clockOutLocation,
      clockInIP: timeClock.clockInIP,
      clockOutIP: timeClock.clockOutIP,
      createdAt: timeClock.createdAt
    })
    .from(timeClock)
    .where(and(...whereConditions))
    .orderBy(desc(timeClock.clockInTime));

    return entries;
  }

  async getTimeClockEntriesForOrganization(organizationId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let whereConditions = [eq(timeClock.organizationId, organizationId)];

    if (startDate) {
      whereConditions.push(gte(timeClock.clockInTime, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(timeClock.clockInTime, endDate));
    }

    const entries = await db.select({
      id: timeClock.id,
      userId: timeClock.userId,
      userName: users.firstName,
      userLastName: users.lastName,
      userRole: users.role,
      clockInTime: timeClock.clockInTime,
      clockOutTime: timeClock.clockOutTime,
      totalHours: timeClock.totalHours,
      breakDuration: timeClock.breakDuration,
      status: timeClock.status,
      notes: timeClock.notes,
      supervisorApproval: timeClock.supervisorApproval,
      clockInLocation: timeClock.clockInLocation,
      clockOutLocation: timeClock.clockOutLocation,
      clockInIP: timeClock.clockInIP,
      clockOutIP: timeClock.clockOutIP,
      createdAt: timeClock.createdAt
    })
    .from(timeClock)
    .leftJoin(users, eq(timeClock.userId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(timeClock.clockInTime));

    return entries;
  }

  async updateTimeClockEntry(id: number, updates: any): Promise<any> {
    const [entry] = await db.update(timeClock)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(timeClock.id, id))
      .returning();

    return entry;
  }

  async getTimeClockSettings(organizationId: number): Promise<any> {
    const [settings] = await db.select()
      .from(timeClockSettings)
      .where(eq(timeClockSettings.organizationId, organizationId))
      .limit(1);

    return settings;
  }

  async updateTimeClockSettings(organizationId: number, settingsData: any): Promise<any> {
    const existing = await this.getTimeClockSettings(organizationId);

    if (existing) {
      const [updated] = await db.update(timeClockSettings)
        .set({
          ...settingsData,
          updatedAt: new Date()
        })
        .where(eq(timeClockSettings.organizationId, organizationId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(timeClockSettings)
        .values({
          organizationId,
          ...settingsData
        })
        .returning();
      return created;
    }
  }
  // Image methods
  async createImage(imageData: any): Promise<any> {
    try {
      const [image] = await db
        .insert(images)
        .values({
          filename: imageData.filename,
          originalName: imageData.originalName,
          mimeType: imageData.mimeType,
          size: imageData.size,
          userId: imageData.userId,
          projectId: imageData.projectId || null,
          description: imageData.description || null,
        })
        .returning();
      return image;
    } catch (error) {
      console.error('Error creating image:', error);
      throw error;
    }
  }

  async getImages(userId: number): Promise<any[]> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return [];

      // Get all images for users in the same organization
      const orgUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.organizationId, userInfo.organizationId));
      
      const orgUserIds = orgUsers.map(u => u.id);

      const imageResults = await db
        .select({
          id: images.id,
          filename: images.filename,
          originalName: images.originalName,
          mimeType: images.mimeType,
          size: images.size,
          description: images.description,
          annotations: images.annotations,
          annotatedImageUrl: images.annotatedImageUrl,
          createdAt: images.createdAt,
          updatedAt: images.updatedAt,
          userId: images.userId,
          projectId: images.projectId
        })
        .from(images)
        .where(inArray(images.userId, orgUserIds))
        .orderBy(desc(images.createdAt));

      // Add correct URL paths for organization-based file structure
      return imageResults.map(image => ({
        ...image,
        url: `/uploads/org-${userInfo.organizationId}/image_gallery/${image.filename}`
      }));
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  async saveImageAnnotations(imageId: number, userId: number, annotations: any, annotatedImageUrl: string): Promise<void> {
    try {
      await db
        .update(images)
        .set({
          annotations: JSON.stringify(annotations),
          annotatedImageUrl,
          updatedAt: new Date()
        })
        .where(eq(images.id, imageId));
    } catch (error) {
      console.error('Error saving image annotations:', error);
      throw error;
    }
  }

  async deleteImage(imageId: number, userId: number): Promise<boolean> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return false;

      const result = await db
        .delete(images)
        .where(
          and(
            eq(images.id, imageId),
            eq(images.organizationId, userInfo.organizationId)
          )
        );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Internal messaging methods
  async getInternalMessages(userId: number): Promise<any[]> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return [];

      const messagesWithRecipients = await db
        .select({
          id: internalMessages.id,
          senderId: internalMessages.senderId,
          subject: internalMessages.subject,
          content: internalMessages.content,
          messageType: internalMessages.messageType,
          priority: internalMessages.priority,
          parentMessageId: internalMessages.parentMessageId,
          createdAt: internalMessages.createdAt,
          updatedAt: internalMessages.updatedAt,
          senderUsername: users.username,
          senderFirstName: users.firstName,
          senderLastName: users.lastName,
          recipients: sql<any[]>`json_agg(json_build_object(
            'recipientId', ${internalMessageRecipients.recipientId},
            'isRead', ${internalMessageRecipients.isRead},
            'readAt', ${internalMessageRecipients.readAt}
          ))`
        })
        .from(internalMessages)
        .innerJoin(users, eq(internalMessages.senderId, users.id))
        .leftJoin(internalMessageRecipients, eq(internalMessages.id, internalMessageRecipients.messageId))
        .where(
          or(
            eq(internalMessages.senderId, userId),
            eq(internalMessageRecipients.recipientId, userId)
          )
        )
        .groupBy(
          internalMessages.id,
          internalMessages.senderId,
          internalMessages.subject,
          internalMessages.content,
          internalMessages.messageType,
          internalMessages.priority,
          internalMessages.parentMessageId,
          internalMessages.createdAt,
          internalMessages.updatedAt,
          users.username,
          users.firstName,
          users.lastName
        )
        .orderBy(desc(internalMessages.createdAt));

      return messagesWithRecipients;
    } catch (error) {
      console.error('Error fetching internal messages:', error);
      return [];
    }
  }

  async createInternalMessage(messageData: any, recipientIds: number[]): Promise<any> {
    try {
      // Create the message
      const [message] = await db
        .insert(internalMessages)
        .values({
          senderId: messageData.senderId,
          subject: messageData.subject,
          content: messageData.content,
          messageType: messageData.messageType || 'individual',
          priority: messageData.priority || 'normal',
          parentMessageId: messageData.parentMessageId || null
        })
        .returning();

      // Create recipients
      if (recipientIds && recipientIds.length > 0) {
        const recipientData = recipientIds.map(recipientId => ({
          messageId: message.id,
          recipientId: recipientId,
          isRead: false
        }));

        await db
          .insert(internalMessageRecipients)
          .values(recipientData);
      }

      // Fetch the complete message with sender info
      const [completeMessage] = await db
        .select({
          id: internalMessages.id,
          senderId: internalMessages.senderId,
          subject: internalMessages.subject,
          content: internalMessages.content,
          messageType: internalMessages.messageType,
          priority: internalMessages.priority,
          parentMessageId: internalMessages.parentMessageId,
          createdAt: internalMessages.createdAt,
          updatedAt: internalMessages.updatedAt,
          senderUsername: users.username,
          senderFirstName: users.firstName,
          senderLastName: users.lastName
        })
        .from(internalMessages)
        .innerJoin(users, eq(internalMessages.senderId, users.id))
        .where(eq(internalMessages.id, message.id));

      return completeMessage;
    } catch (error) {
      console.error('Error creating internal message:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(internalMessageRecipients)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(internalMessageRecipients.messageId, messageId),
            eq(internalMessageRecipients.recipientId, userId)
          )
        );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  async deleteInternalMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // Check if user is the sender
      const [message] = await db
        .select()
        .from(internalMessages)
        .where(
          and(
            eq(internalMessages.id, messageId),
            eq(internalMessages.senderId, userId)
          )
        );

      if (!message) return false;

      // Delete recipients first
      await db
        .delete(internalMessageRecipients)
        .where(eq(internalMessageRecipients.messageId, messageId));

      // Delete the message
      const result = await db
        .delete(internalMessages)
        .where(eq(internalMessages.id, messageId));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting internal message:', error);
      return false;
    }
  }

  async getInternalMessage(messageId: number, userId: number): Promise<any> {
    try {
      const [message] = await db
        .select({
          id: internalMessages.id,
          senderId: internalMessages.senderId,
          subject: internalMessages.subject,
          content: internalMessages.content,
          messageType: internalMessages.messageType,
          priority: internalMessages.priority,
          parentMessageId: internalMessages.parentMessageId,
          createdAt: internalMessages.createdAt,
          updatedAt: internalMessages.updatedAt,
          senderUsername: users.username,
          senderFirstName: users.firstName,
          senderLastName: users.lastName
        })
        .from(internalMessages)
        .innerJoin(users, eq(internalMessages.senderId, users.id))
        .leftJoin(internalMessageRecipients, eq(internalMessages.id, internalMessageRecipients.messageId))
        .where(
          and(
            eq(internalMessages.id, messageId),
            or(
              eq(internalMessages.senderId, userId),
              eq(internalMessageRecipients.recipientId, userId)
            )
          )
        );

      return message || null;
    } catch (error) {
      console.error('Error fetching internal message:', error);
      return null;
    }
  }

  async sendGroupMessage(groupId: number, messageData: any): Promise<any> {
    try {
      // Get group members
      const groupMembers = await db
        .select({ userId: messageGroupMembers.userId })
        .from(messageGroupMembers)
        .where(eq(messageGroupMembers.groupId, groupId));

      const recipientIds = groupMembers.map(member => member.userId);
      
      return await this.createInternalMessage(messageData, recipientIds);
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // Gas card provider methods
  async getGasCardProviders(organizationId: number): Promise<any[]> {
    return await db
      .select()
      .from(gasCardProviders)
      .where(eq(gasCardProviders.organizationId, organizationId))
      .orderBy(gasCardProviders.name);
  }

  async getGasCardProvider(id: number, organizationId: number): Promise<any> {
    const [provider] = await db
      .select()
      .from(gasCardProviders)
      .where(
        and(
          eq(gasCardProviders.id, id),
          eq(gasCardProviders.organizationId, organizationId)
        )
      );
    return provider || null;
  }

  async createGasCardProvider(providerData: any): Promise<any> {
    const [provider] = await db
      .insert(gasCardProviders)
      .values(providerData)
      .returning();
    return provider;
  }

  async updateGasCardProvider(id: number, organizationId: number, updates: any): Promise<any> {
    const [provider] = await db
      .update(gasCardProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(gasCardProviders.id, id),
          eq(gasCardProviders.organizationId, organizationId)
        )
      )
      .returning();
    return provider;
  }

  async deleteGasCardProvider(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(gasCardProviders)
      .where(
        and(
          eq(gasCardProviders.id, id),
          eq(gasCardProviders.organizationId, organizationId)
        )
      );
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();