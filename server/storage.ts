import { 
  users, customers, invoices, invoiceLineItems, payments, quotes, quoteLineItems, settings, messages,
  userSessions, userPermissions, projects, projectUsers, tasks, taskComments, projectFiles, timeEntries,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Invoice, type InsertInvoice, type InvoiceLineItem, type InsertInvoiceLineItem,
  type Payment, type InsertPayment, type Quote, type InsertQuote, type QuoteLineItem,
  type Setting, type InsertSetting, type Message, type InsertMessage,
  type UserSession, type InsertUserSession, type UserPermission, type InsertUserPermission,
  type Project, type InsertProject, type ProjectUser, type InsertProjectUser,
  type Task, type InsertTask, type TaskComment, type InsertTaskComment,
  type ProjectFile, type InsertProjectFile, type TimeEntry, type InsertTimeEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or, inArray } from "drizzle-orm";

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

  // Quote methods
  getQuotes(userId: number): Promise<(Quote & { customer: Customer, lineItems: QuoteLineItem[] })[]>;
  getQuote(id: number, userId: number): Promise<(Quote & { customer: Customer, lineItems: QuoteLineItem[] }) | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, userId: number, quote: Partial<Omit<InsertQuote, 'lineItems'>>): Promise<Quote | undefined>;
  deleteQuote(id: number, userId: number): Promise<boolean>;
  convertQuoteToInvoice(quoteId: number, userId: number): Promise<Invoice | undefined>;

  // Payment methods
  getPayments(userId: number): Promise<(Payment & { invoice: Invoice & { customer: Customer } })[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByInvoice(invoiceId: number): Promise<Payment[]>;

  // Settings methods
  getSettings(category: string): Promise<Record<string, string>>;
  updateSettings(category: string, settings: Record<string, string>): Promise<void>;

  // Message methods
  getMessages(userId: number): Promise<(Message & { customerName?: string })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(twilioSid: string, status: string, errorCode?: string, errorMessage?: string): Promise<void>;

  // User management methods
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserAccount(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;
  deactivateUser(id: number): Promise<void>;
  activateUser(id: number): Promise<void>;
  deleteUser(id: number): Promise<boolean>;

  // Project management methods
  getProjects(userId: number): Promise<(Project & { users: (ProjectUser & { user: User })[], taskCount: number, completedTasks: number })[]>;
  getProject(id: number, userId: number): Promise<(Project & { users: (ProjectUser & { user: User })[], customer?: Customer }) | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, userId: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number, userId: number): Promise<boolean>;
  addUserToProject(projectUser: InsertProjectUser): Promise<ProjectUser>;
  removeUserFromProject(projectId: number, userId: number): Promise<boolean>;
  updateProjectProgress(projectId: number, progress: number): Promise<void>;

  // Task management methods
  getTasks(projectId: number, userId: number): Promise<Task[]>;
  getTask(id: number, userId: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number, userId: number): Promise<boolean>;
  addTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  
  // File management methods
  uploadProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFiles(projectId: number, userId: number): Promise<ProjectFile[]>;
  deleteProjectFile(id: number, userId: number): Promise<boolean>;
  
  // Time tracking methods
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntries(projectId: number, userId: number): Promise<(TimeEntry & { user: User, task?: Task })[]>;
  updateTimeEntry(id: number, userId: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number, userId: number): Promise<boolean>;
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
      const total = parseFloat(stat.total.toString()) || 0;
      const count = parseInt(stat.count.toString()) || 0;
      
      switch (stat.status) {
        case 'paid':
          result.paidInvoices = count;
          result.paidValue = total;
          result.totalRevenue += total;
          break;
        case 'sent':
          result.pendingInvoices = count;
          result.pendingValue = total;
          break;
        case 'overdue':
          result.overdueInvoices = count;
          result.overdueValue = total;
          break;
      }
    });

    return result;
  }

  async getQuotes(userId: number): Promise<(Quote & { customer: Customer, lineItems: QuoteLineItem[] })[]> {
    const quotesWithCustomers = await db
      .select()
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));

    const result = [];
    for (const row of quotesWithCustomers) {
      if (row.quotes && row.customers) {
        const lineItems = await db
          .select()
          .from(quoteLineItems)
          .where(eq(quoteLineItems.quoteId, row.quotes.id));

        result.push({
          ...row.quotes,
          customer: row.customers,
          lineItems: lineItems
        });
      }
    }

    return result;
  }

  async getQuote(id: number, userId: number): Promise<(Quote & { customer: Customer, lineItems: QuoteLineItem[] }) | undefined> {
    const [quoteWithCustomer] = await db
      .select()
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)));

    if (!quoteWithCustomer?.quotes || !quoteWithCustomer?.customers) {
      return undefined;
    }

    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, id));

    return {
      ...quoteWithCustomer.quotes,
      customer: quoteWithCustomer.customers,
      lineItems: lineItems
    };
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const { lineItems, ...quoteData } = quote;
    
    const [newQuote] = await db
      .insert(quotes)
      .values(quoteData)
      .returning();

    // Insert line items
    if (lineItems.length > 0) {
      await db
        .insert(quoteLineItems)
        .values(lineItems.map(item => ({
          quoteId: newQuote.id,
          description: item.description,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          amount: item.amount.toString(),
        })));
    }

    return newQuote;
  }

  async updateQuote(id: number, userId: number, quote: Partial<Omit<InsertQuote, 'lineItems'>>): Promise<Quote | undefined> {
    const [updated] = await db
      .update(quotes)
      .set(quote)
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)))
      .returning();
    
    return updated || undefined;
  }

  async deleteQuote(id: number, userId: number): Promise<boolean> {
    // Delete line items first
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id));
    
    // Delete quote
    const result = await db
      .delete(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async convertQuoteToInvoice(quoteId: number, userId: number): Promise<Invoice | undefined> {
    const quote = await this.getQuote(quoteId, userId);
    if (!quote || quote.status !== 'accepted') {
      return undefined;
    }

    // Create invoice from quote
    const invoiceData: InsertInvoice = {
      userId: quote.userId,
      customerId: quote.customerId,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'draft',
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      currency: quote.currency,
      notes: quote.notes,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lineItems: quote.lineItems.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount)
      }))
    };

    const newInvoice = await this.createInvoice(invoiceData);

    // Update quote to mark as converted
    await this.updateQuote(quoteId, userId, {
      convertedInvoiceId: newInvoice.id
    });

    return newInvoice;
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

  async getSettings(category: string): Promise<Record<string, string>> {
    const settingsRows = await db
      .select()
      .from(settings)
      .where(eq(settings.category, category));
    
    const result: Record<string, string> = {};
    for (const row of settingsRows) {
      result[row.key] = row.value || '';
    }
    return result;
  }

  async updateSettings(category: string, settingsData: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settingsData)) {
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.category, category), eq(settings.key, key)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(and(eq(settings.category, category), eq(settings.key, key)));
      } else {
        await db
          .insert(settings)
          .values({
            category,
            key,
            value,
            isSecret: key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password')
          });
      }
    }
  }

  async getMessages(userId: number): Promise<(Message & { customerName?: string })[]> {
    const messagesWithCustomers = await db
      .select({
        message: messages,
        customerName: customers.name,
      })
      .from(messages)
      .leftJoin(customers, eq(messages.customerId, customers.id))
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt));

    return messagesWithCustomers.map(row => ({
      ...row.message,
      customerName: row.customerName || undefined,
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async updateMessageStatus(twilioSid: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await db
      .update(messages)
      .set({ 
        status, 
        errorCode, 
        errorMessage 
      })
      .where(eq(messages.twilioSid, twilioSid));
  }

  // User management implementations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUserAccount(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deactivateUser(id: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async activateUser(id: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Project management methods
  async getProjects(userId: number): Promise<(Project & { users: (ProjectUser & { user: User })[], taskCount: number, completedTasks: number })[]> {
    const userProjects = await db
      .select({
        project: projects,
        projectUser: projectUsers,
        user: users,
      })
      .from(projects)
      .leftJoin(projectUsers, eq(projects.id, projectUsers.projectId))
      .leftJoin(users, eq(projectUsers.userId, users.id))
      .where(or(
        eq(projects.userId, userId),
        eq(projectUsers.userId, userId)
      ))
      .orderBy(desc(projects.createdAt));

    // Get task counts for each project
    const projectTaskCounts = await db
      .select({
        projectId: tasks.projectId,
        totalTasks: sql<number>`count(*)`,
        completedTasks: sql<number>`count(case when ${tasks.status} = 'completed' then 1 end)`,
      })
      .from(tasks)
      .groupBy(tasks.projectId);

    const projectMap = new Map<number, Project & { users: (ProjectUser & { user: User })[], taskCount: number, completedTasks: number }>();

    userProjects.forEach(row => {
      if (!projectMap.has(row.project.id)) {
        const taskData = projectTaskCounts.find(tc => tc.projectId === row.project.id);
        projectMap.set(row.project.id, {
          ...row.project,
          users: [],
          taskCount: taskData?.totalTasks || 0,
          completedTasks: taskData?.completedTasks || 0,
        });
      }
      
      if (row.projectUser && row.user) {
        projectMap.get(row.project.id)!.users.push({
          ...row.projectUser,
          user: row.user,
        });
      }
    });

    return Array.from(projectMap.values());
  }

  async getProject(id: number, userId: number): Promise<(Project & { users: (ProjectUser & { user: User })[], customer?: Customer }) | undefined> {
    const projectData = await db
      .select({
        project: projects,
        customer: customers,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.id, id))
      .limit(1);

    if (projectData.length === 0) return undefined;

    // Check if user has access to this project
    const hasAccess = await db
      .select()
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, id), eq(projectUsers.userId, userId)))
      .limit(1);

    if (hasAccess.length === 0 && projectData[0].project.userId !== userId) {
      return undefined;
    }

    const projectUsersData = await db
      .select({
        projectUser: projectUsers,
        user: users,
      })
      .from(projectUsers)
      .innerJoin(users, eq(projectUsers.userId, users.id))
      .where(eq(projectUsers.projectId, id));

    return {
      ...projectData[0].project,
      users: projectUsersData.map(row => ({
        ...row.projectUser,
        user: row.user,
      })),
      customer: projectData[0].customer || undefined,
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();

    // Add the project creator as owner
    await db
      .insert(projectUsers)
      .values({
        projectId: newProject.id,
        userId: project.userId,
        role: 'owner',
      });

    return newProject;
  }

  async updateProject(id: number, userId: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    // Check if user has permission to update
    const hasAccess = await db
      .select()
      .from(projectUsers)
      .where(and(
        eq(projectUsers.projectId, id),
        eq(projectUsers.userId, userId),
        inArray(projectUsers.role, ['owner', 'manager'])
      ))
      .limit(1);

    if (hasAccess.length === 0) return undefined;

    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return updatedProject;
  }

  async deleteProject(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));

    return result.rowCount > 0;
  }

  async addUserToProject(projectUser: InsertProjectUser): Promise<ProjectUser> {
    const [newProjectUser] = await db
      .insert(projectUsers)
      .values(projectUser)
      .returning();

    return newProjectUser;
  }

  async removeUserFromProject(projectId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)));

    return result.rowCount > 0;
  }

  async updateProjectProgress(projectId: number, progress: number): Promise<void> {
    await db
      .update(projects)
      .set({ progress, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  // Task management methods
  async getTasks(projectId: number, userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number, userId: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();

    return newTask;
  }

  async updateTask(id: number, userId: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    return updatedTask;
  }

  async deleteTask(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, id));

    return result.rowCount > 0;
  }

  async addTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [newComment] = await db
      .insert(taskComments)
      .values(comment)
      .returning();

    return newComment;
  }

  // File management methods
  async uploadProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db
      .insert(projectFiles)
      .values(file)
      .returning();

    return newFile;
  }

  async getProjectFiles(projectId: number, userId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
  }

  async deleteProjectFile(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(projectFiles)
      .where(eq(projectFiles.id, id));

    return result.rowCount > 0;
  }

  // Time tracking methods
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newTimeEntry] = await db
      .insert(timeEntries)
      .values(timeEntry)
      .returning();

    return newTimeEntry;
  }

  async getTimeEntries(projectId: number, userId: number): Promise<(TimeEntry & { user: User, task?: Task })[]> {
    const timeEntriesData = await db
      .select({
        timeEntry: timeEntries,
        user: users,
        task: tasks,
      })
      .from(timeEntries)
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.date));

    return timeEntriesData.map(row => ({
      ...row.timeEntry,
      user: row.user,
      task: row.task || undefined,
    }));
  }

  async updateTimeEntry(id: number, userId: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set(timeEntry)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)))
      .returning();

    return updatedTimeEntry;
  }

  async deleteTimeEntry(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)));

    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
