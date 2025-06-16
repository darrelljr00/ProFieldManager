import { 
  users, customers, invoices, invoiceLineItems, payments, quotes, quoteLineItems, settings, messages,
  userSessions, userPermissions, projects, projectUsers, tasks, taskComments, projectFiles, timeEntries,
  expenses, expenseCategories, expenseReports, expenseReportItems, expenseLineItems, gasCards, gasCardAssignments, leads, calendarJobs,
  internalMessages, internalMessageRecipients, messageGroups, messageGroupMembers, images, imageAnnotations, sharedPhotoLinks,
  reviewRequests, googleMyBusinessSettings, docusignEnvelopes,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Invoice, type InsertInvoice, type InvoiceLineItem, type InsertInvoiceLineItem,
  type Payment, type InsertPayment, type Quote, type InsertQuote, type QuoteLineItem,
  type Setting, type InsertSetting, type Message, type InsertMessage,
  type UserSession, type InsertUserSession, type UserPermission, type InsertUserPermission,
  type Project, type InsertProject, type ProjectUser, type InsertProjectUser,
  type Task, type InsertTask, type TaskComment, type InsertTaskComment,
  type ProjectFile, type InsertProjectFile, type TimeEntry, type InsertTimeEntry,
  type Expense, type InsertExpense, type ExpenseCategory, type InsertExpenseCategory,
  type ExpenseReport, type InsertExpenseReport, type ExpenseReportItem, type InsertExpenseReportItem,
  type ExpenseLineItem, type InsertExpenseLineItem,
  type GasCard, type InsertGasCard, type GasCardAssignment, type InsertGasCardAssignment,
  type Lead, type InsertLead, type CalendarJob, type InsertCalendarJob,
  type InternalMessage, type InsertInternalMessage, type InternalMessageRecipient, type InsertInternalMessageRecipient,
  type MessageGroup, type InsertMessageGroup, type MessageGroupMember, type InsertMessageGroupMember,
  type SharedPhotoLink, type InsertSharedPhotoLink, type ReviewRequest, type InsertReviewRequest,
  type GoogleMyBusinessSettings, type InsertGoogleMyBusinessSettings, type DocusignEnvelope, type InsertDocusignEnvelope
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, sql, or, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;
  
  // Admin user management methods
  getAllUsers(): Promise<User[]>;
  createUserAccount(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;
  activateUser(id: number): Promise<void>;
  deactivateUser(id: number): Promise<void>;
  deleteUser(id: number): Promise<boolean>;
  getUserStats(): Promise<any>;
  bulkActivateUsers(userIds: number[]): Promise<number>;
  bulkDeactivateUsers(userIds: number[]): Promise<number>;
  bulkChangeUserRole(userIds: number[], role: string): Promise<number>;

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
  getSettingsByCategory(category: string): Promise<Setting[]>;
  updateSetting(category: string, key: string, value: string): Promise<void>;

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
  getProjectFile(id: number, userId: number): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number, userId: number): Promise<boolean>;
  saveFileAnnotations(fileId: number, userId: number, annotations: any[], annotatedImageUrl: string): Promise<any | null>;
  
  // Time tracking methods
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntries(projectId: number, userId: number): Promise<(TimeEntry & { user: User, task?: Task })[]>;
  updateTimeEntry(id: number, userId: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number, userId: number): Promise<boolean>;

  // Expense management methods
  getExpenses(userId: number): Promise<(Expense & { project?: Project, lineItems?: ExpenseLineItem[] })[]>;
  getExpense(id: number, userId: number): Promise<(Expense & { lineItems?: ExpenseLineItem[] }) | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, userId: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number, userId: number): Promise<boolean>;
  approveExpense(id: number, approvedBy: number): Promise<boolean>;
  
  // Expense line items methods
  getExpenseLineItems(expenseId: number): Promise<ExpenseLineItem[]>;
  createExpenseLineItem(lineItem: InsertExpenseLineItem): Promise<ExpenseLineItem>;
  updateExpenseLineItem(id: number, lineItem: Partial<InsertExpenseLineItem>): Promise<ExpenseLineItem | undefined>;
  deleteExpenseLineItem(id: number): Promise<boolean>;
  createExpenseWithLineItems(expense: InsertExpense, lineItems: InsertExpenseLineItem[]): Promise<Expense & { lineItems: ExpenseLineItem[] }>;
  
  // Expense categories
  getExpenseCategories(userId: number): Promise<ExpenseCategory[]>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, userId: number, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: number, userId: number): Promise<boolean>;
  
  // Expense reports
  getExpenseReports(userId: number): Promise<(ExpenseReport & { expenses?: Expense[] })[]>;
  getExpenseReport(id: number, userId: number): Promise<(ExpenseReport & { expenses: Expense[] }) | undefined>;
  createExpenseReport(report: InsertExpenseReport): Promise<ExpenseReport>;
  updateExpenseReport(id: number, userId: number, report: Partial<InsertExpenseReport>): Promise<ExpenseReport | undefined>;
  submitExpenseReport(id: number, userId: number): Promise<boolean>;
  approveExpenseReport(id: number, approvedBy: number): Promise<boolean>;
  addExpenseToReport(reportId: number, expenseId: number): Promise<boolean>;
  removeExpenseFromReport(reportId: number, expenseId: number): Promise<boolean>;
  
  // OCR settings
  getOcrSettings(): Promise<any>;
  updateOcrSettings(settings: any): Promise<void>;
  
  // Calendar settings
  getCalendarSettings(): Promise<any>;
  updateCalendarSettings(settings: any): Promise<void>;
  
  // Leads management
  getLeads(userId: number): Promise<Lead[]>;
  getLead(id: number, userId: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, userId: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number, userId: number): Promise<boolean>;
  
  // Calendar Jobs management
  getCalendarJobs(userId: number): Promise<(CalendarJob & { customer?: Customer, lead?: Lead })[]>;
  getCalendarJob(id: number, userId: number): Promise<(CalendarJob & { customer?: Customer, lead?: Lead }) | undefined>;
  createCalendarJob(job: InsertCalendarJob): Promise<CalendarJob>;
  updateCalendarJob(id: number, userId: number, job: Partial<InsertCalendarJob>): Promise<CalendarJob | undefined>;
  deleteCalendarJob(id: number, userId: number): Promise<boolean>;
  convertJobToProject(jobId: number, userId: number, projectData: Partial<InsertProject>): Promise<Project | undefined>;

  // Internal messaging system
  getInternalMessages(userId: number): Promise<(InternalMessage & { sender: User, recipients: (InternalMessageRecipient & { user: User })[] })[]>;
  getInternalMessage(id: number, userId: number): Promise<(InternalMessage & { sender: User, recipients: (InternalMessageRecipient & { user: User })[] }) | undefined>;
  createInternalMessage(message: InsertInternalMessage, recipientIds: number[]): Promise<InternalMessage>;
  markMessageAsRead(messageId: number, userId: number): Promise<boolean>;
  deleteInternalMessage(id: number, userId: number): Promise<boolean>;
  
  // Message groups
  getMessageGroups(userId: number): Promise<(MessageGroup & { members: (MessageGroupMember & { user: User })[] })[]>;
  createMessageGroup(group: InsertMessageGroup): Promise<MessageGroup>;
  addUserToGroup(groupId: number, userId: number, role?: string): Promise<MessageGroupMember>;
  removeUserFromGroup(groupId: number, userId: number): Promise<boolean>;
  sendGroupMessage(groupId: number, message: InsertInternalMessage): Promise<InternalMessage>;

  // Image management
  getImages(userId: number): Promise<any[]>;
  createImage(imageData: any): Promise<any>;
  saveImageAnnotations(imageId: number, userId: number, annotations: any[], annotatedImageUrl: string): Promise<any | null>;
  deleteImage(imageId: number, userId: number): Promise<boolean>;

  // Shared photo links
  createSharedPhotoLink(linkData: InsertSharedPhotoLink): Promise<SharedPhotoLink>;
  getSharedPhotoLink(shareToken: string): Promise<(SharedPhotoLink & { project: Project, images: any[] }) | undefined>;
  getSharedPhotoLinks(userId: number): Promise<(SharedPhotoLink & { project: Project })[]>;
  updateSharedPhotoLinkAccess(shareToken: string): Promise<boolean>;
  deactivateSharedPhotoLink(id: number, userId: number): Promise<boolean>;
  deleteSharedPhotoLink(id: number, userId: number): Promise<boolean>;

  // SMS functionality (placeholder methods)
  getSmsMessages(): Promise<any[]>;
  createSmsMessage(data: any): Promise<any>;
  getSmsTemplates(): Promise<any[]>;
  createSmsTemplate(data: any): Promise<any>;

  // Review management
  createReviewRequest(reviewData: InsertReviewRequest): Promise<ReviewRequest>;
  getReviewRequests(userId: number): Promise<ReviewRequest[]>;
  getReviewRequest(id: number, userId: number): Promise<ReviewRequest | undefined>;
  updateReviewRequest(id: number, userId: number, updates: Partial<ReviewRequest>): Promise<ReviewRequest | undefined>;
  getReviewAnalytics(userId: number): Promise<any>;
  resendReviewRequest(userId: number, requestId: number): Promise<ReviewRequest | undefined>;
  
  // Google My Business settings
  getGoogleMyBusinessSettings(userId: number): Promise<GoogleMyBusinessSettings | undefined>;
  createGoogleMyBusinessSettings(settings: InsertGoogleMyBusinessSettings): Promise<GoogleMyBusinessSettings>;
  updateGoogleMyBusinessSettings(userId: number, settings: Partial<InsertGoogleMyBusinessSettings>): Promise<GoogleMyBusinessSettings | undefined>;
  
  // DocuSign functionality
  createDocusignEnvelope(envelopeData: InsertDocusignEnvelope): Promise<DocusignEnvelope>;
  getDocusignEnvelopes(userId: number): Promise<DocusignEnvelope[]>;
  getDocusignEnvelope(envelopeId: string): Promise<DocusignEnvelope | undefined>;
  updateDocusignEnvelope(envelopeId: string, updates: Partial<DocusignEnvelope>): Promise<DocusignEnvelope | undefined>;
  updateProjectFileSignatureStatus(fileId: number, envelopeId: string, status: string, signingUrl?: string, signedDocUrl?: string): Promise<ProjectFile | undefined>;
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
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getCustomers(userId: number): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number, userId: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
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
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getInvoices(userId: number): Promise<(Invoice & { customer: Customer, lineItems: InvoiceLineItem[] })[]> {
    const invoicesWithCustomers = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
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
      .where(eq(invoices.id, id));

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
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInvoice(id: number, userId: number): Promise<boolean> {
    // Delete line items first
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    
    // Delete invoice
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));
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
      .where(eq(quotes.id, id));

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
      .where(eq(quotes.id, id));
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
            isSecret: key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'),
            updatedAt: new Date()
          });
      }
    }
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    return await db
      .select()
      .from(settings)
      .where(eq(settings.category, category));
  }

  async updateSetting(category: string, key: string, value: string): Promise<void> {
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
          isSecret: key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'),
        });
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
        ...(errorCode && { errorCode }), 
        ...(errorMessage && { errorMessage })
      })
      .where(eq(messages.twilioSid, twilioSid));
  }

  // User management implementations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUserAccount(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
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

  async updateUserPermissions(id: number, permissions: {
    canViewProfiles?: boolean;
    canEditProfiles?: boolean;
    canCreateInvoices?: boolean;
    canViewAllData?: boolean;
    canManageProjects?: boolean;
    canAccessReports?: boolean;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...permissions,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
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

  async getUserStats(): Promise<any> {
    const allUsers = await this.getAllUsers();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: allUsers.length,
      active: allUsers.filter(u => u.isActive).length,
      inactive: allUsers.filter(u => !u.isActive).length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      managers: allUsers.filter(u => u.role === 'manager').length,
      users: allUsers.filter(u => u.role === 'user').length,
      verified: allUsers.filter(u => u.emailVerified).length,
      recentLogins: allUsers.filter(u => u.lastLoginAt && 
        new Date(u.lastLoginAt) > sevenDaysAgo).length
    };
  }

  async bulkActivateUsers(userIds: number[]): Promise<number> {
    const result = await db
      .update(users)
      .set({ 
        isActive: true,
        updatedAt: new Date(),
      })
      .where(sql`${users.id} = ANY(${userIds})`);
    return result.rowCount || 0;
  }

  async bulkDeactivateUsers(userIds: number[]): Promise<number> {
    const result = await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(sql`${users.id} = ANY(${userIds})`);
    return result.rowCount || 0;
  }

  async bulkChangeUserRole(userIds: number[], role: string): Promise<number> {
    const result = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date(),
      })
      .where(sql`${users.id} = ANY(${userIds})`);
    return result.rowCount || 0;
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

    // Allow access to all projects for global data sharing

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
    try {
      await db
        .insert(projectUsers)
        .values({
          projectId: newProject.id,
          userId: project.userId,
          role: 'owner',
        });
    } catch (error) {
      console.error("Error adding project owner:", error);
      // Continue without failing the project creation
    }

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
      .where(eq(projects.id, id));

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

  async getProjectsWithLocation(userId: number): Promise<(Project & { users: (ProjectUser & { user: User })[] })[]> {
    const userProjects = await db
      .select({
        project: projects,
        projectUser: projectUsers,
        user: users,
      })
      .from(projects)
      .leftJoin(projectUsers, eq(projects.id, projectUsers.projectId))
      .leftJoin(users, eq(projectUsers.userId, users.id))
      .where(
        and(
          isNotNull(projects.address),
          isNotNull(projects.city)
        )
      );

    // Group by project
    const projectMap = new Map<number, Project & { users: (ProjectUser & { user: User })[] }>();
    
    for (const row of userProjects) {
      if (!projectMap.has(row.project.id)) {
        projectMap.set(row.project.id, {
          ...row.project,
          users: [],
        });
      }
      
      if (row.projectUser && row.user) {
        projectMap.get(row.project.id)!.users.push({
          ...row.projectUser,
          user: row.user,
        });
      }
    }

    return Array.from(projectMap.values());
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

  async getProjectFile(id: number, userId: number): Promise<ProjectFile | undefined> {
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.id, id))
      .limit(1);

    return file;
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

  // Expense management methods
  async getExpenses(userId: number): Promise<(Expense & { project?: Project, lineItems?: ExpenseLineItem[] })[]> {
    const expenseList = await db
      .select({
        expense: expenses,
        project: projects,
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .orderBy(desc(expenses.expenseDate));

    // Get line items for all expenses
    const expenseIds = expenseList.map(row => row.expense.id);
    const lineItemsMap = new Map<number, ExpenseLineItem[]>();
    
    if (expenseIds.length > 0) {
      const lineItemsData = await db
        .select()
        .from(expenseLineItems)
        .where(inArray(expenseLineItems.expenseId, expenseIds))
        .orderBy(expenseLineItems.createdAt);
      
      lineItemsData.forEach(item => {
        if (!lineItemsMap.has(item.expenseId)) {
          lineItemsMap.set(item.expenseId, []);
        }
        lineItemsMap.get(item.expenseId)!.push(item);
      });
    }

    return expenseList.map(row => ({
      ...row.expense,
      project: row.project || undefined,
      lineItems: lineItemsMap.get(row.expense.id) || [],
    }));
  }

  async getExpense(id: number, userId: number): Promise<(Expense & { lineItems?: ExpenseLineItem[] }) | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));

    if (!expense) return undefined;

    // Get line items for this expense
    const lineItems = await this.getExpenseLineItems(id);

    return {
      ...expense,
      lineItems,
    };
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();

    return newExpense;
  }

  async updateExpense(id: number, userId: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    return updatedExpense;
  }

  async deleteExpense(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id));

    return result.rowCount > 0;
  }

  async approveExpense(id: number, approvedBy: number): Promise<boolean> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    return !!updatedExpense;
  }

  // Expense categories
  async getExpenseCategories(userId: number): Promise<ExpenseCategory[]> {
    return await db
      .select()
      .from(expenseCategories)
      .orderBy(expenseCategories.name);
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [newCategory] = await db
      .insert(expenseCategories)
      .values(category)
      .returning();

    return newCategory;
  }

  async updateExpenseCategory(id: number, userId: number, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [updatedCategory] = await db
      .update(expenseCategories)
      .set(category)
      .where(eq(expenseCategories.id, id))
      .returning();

    return updatedCategory;
  }

  async deleteExpenseCategory(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, id));

    return result.rowCount > 0;
  }

  // Expense line items methods
  async getExpenseLineItems(expenseId: number): Promise<ExpenseLineItem[]> {
    return await db
      .select()
      .from(expenseLineItems)
      .where(eq(expenseLineItems.expenseId, expenseId))
      .orderBy(expenseLineItems.createdAt);
  }

  async createExpenseLineItem(lineItem: InsertExpenseLineItem): Promise<ExpenseLineItem> {
    const [newLineItem] = await db
      .insert(expenseLineItems)
      .values(lineItem)
      .returning();

    return newLineItem;
  }

  async updateExpenseLineItem(id: number, lineItem: Partial<InsertExpenseLineItem>): Promise<ExpenseLineItem | undefined> {
    const [updatedLineItem] = await db
      .update(expenseLineItems)
      .set({ ...lineItem, updatedAt: new Date() })
      .where(eq(expenseLineItems.id, id))
      .returning();

    return updatedLineItem;
  }

  async deleteExpenseLineItem(id: number): Promise<boolean> {
    const result = await db
      .delete(expenseLineItems)
      .where(eq(expenseLineItems.id, id));

    return result.rowCount > 0;
  }

  async createExpenseWithLineItems(expense: InsertExpense, lineItems: InsertExpenseLineItem[]): Promise<Expense & { lineItems: ExpenseLineItem[] }> {
    // Use a transaction to ensure both expense and line items are created together
    const result = await db.transaction(async (tx) => {
      // Create the expense
      const [newExpense] = await tx
        .insert(expenses)
        .values(expense)
        .returning();

      // Create line items if provided
      const createdLineItems: ExpenseLineItem[] = [];
      if (lineItems.length > 0) {
        const lineItemsWithExpenseId = lineItems.map(item => ({
          ...item,
          expenseId: newExpense.id,
        }));

        const insertedLineItems = await tx
          .insert(expenseLineItems)
          .values(lineItemsWithExpenseId)
          .returning();

        createdLineItems.push(...insertedLineItems);
      }

      return {
        ...newExpense,
        lineItems: createdLineItems,
      };
    });

    return result;
  }

  // Expense reports
  async getExpenseReports(userId: number): Promise<(ExpenseReport & { expenses?: Expense[] })[]> {
    const reports = await db
      .select()
      .from(expenseReports)
      .orderBy(desc(expenseReports.createdAt));

    // Get expenses for each report
    const reportsWithExpenses = await Promise.all(
      reports.map(async (report) => {
        const reportExpenses = await db
          .select({ expense: expenses })
          .from(expenseReportItems)
          .leftJoin(expenses, eq(expenseReportItems.expenseId, expenses.id))
          .where(eq(expenseReportItems.reportId, report.id));

        return {
          ...report,
          expenses: reportExpenses.map(item => item.expense).filter(Boolean) as Expense[],
        };
      })
    );

    return reportsWithExpenses;
  }

  async getExpenseReport(id: number, userId: number): Promise<(ExpenseReport & { expenses: Expense[] }) | undefined> {
    const [report] = await db
      .select()
      .from(expenseReports)
      .where(eq(expenseReports.id, id));

    if (!report) return undefined;

    const reportExpenses = await db
      .select({ expense: expenses })
      .from(expenseReportItems)
      .leftJoin(expenses, eq(expenseReportItems.expenseId, expenses.id))
      .where(eq(expenseReportItems.reportId, id));

    return {
      ...report,
      expenses: reportExpenses.map(item => item.expense).filter(Boolean) as Expense[],
    };
  }

  async createExpenseReport(report: InsertExpenseReport): Promise<ExpenseReport> {
    const [newReport] = await db
      .insert(expenseReports)
      .values(report)
      .returning();

    return newReport;
  }

  async updateExpenseReport(id: number, userId: number, report: Partial<InsertExpenseReport>): Promise<ExpenseReport | undefined> {
    const [updatedReport] = await db
      .update(expenseReports)
      .set({ ...report, updatedAt: new Date() })
      .where(eq(expenseReports.id, id))
      .returning();

    return updatedReport;
  }

  async submitExpenseReport(id: number, userId: number): Promise<boolean> {
    const [updatedReport] = await db
      .update(expenseReports)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(expenseReports.id, id))
      .returning();

    return !!updatedReport;
  }

  async approveExpenseReport(id: number, approvedBy: number): Promise<boolean> {
    const [updatedReport] = await db
      .update(expenseReports)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(expenseReports.id, id))
      .returning();

    return !!updatedReport;
  }

  async addExpenseToReport(reportId: number, expenseId: number): Promise<boolean> {
    try {
      await db
        .insert(expenseReportItems)
        .values({ reportId, expenseId });

      // Update report total
      const reportExpenses = await db
        .select({ amount: expenses.amount })
        .from(expenseReportItems)
        .leftJoin(expenses, eq(expenseReportItems.expenseId, expenses.id))
        .where(eq(expenseReportItems.reportId, reportId));

      const totalAmount = reportExpenses.reduce((sum, item) => {
        return sum + parseFloat(item.amount || "0");
      }, 0);

      await db
        .update(expenseReports)
        .set({ totalAmount: totalAmount.toString(), updatedAt: new Date() })
        .where(eq(expenseReports.id, reportId));

      return true;
    } catch {
      return false;
    }
  }

  async removeExpenseFromReport(reportId: number, expenseId: number): Promise<boolean> {
    const result = await db
      .delete(expenseReportItems)
      .where(and(eq(expenseReportItems.reportId, reportId), eq(expenseReportItems.expenseId, expenseId)));

    if (result.rowCount > 0) {
      // Update report total
      const reportExpenses = await db
        .select({ amount: expenses.amount })
        .from(expenseReportItems)
        .leftJoin(expenses, eq(expenseReportItems.expenseId, expenses.id))
        .where(eq(expenseReportItems.reportId, reportId));

      const totalAmount = reportExpenses.reduce((sum, item) => {
        return sum + parseFloat(item.amount || "0");
      }, 0);

      await db
        .update(expenseReports)
        .set({ totalAmount: totalAmount.toString(), updatedAt: new Date() })
        .where(eq(expenseReports.id, reportId));
    }

    return result.rowCount > 0;
  }

  // OCR settings implementation
  async getOcrSettings(): Promise<any> {
    try {
      const [result] = await db.select()
        .from(settings)
        .where(eq(settings.key, 'ocr_settings'));
      return result?.value ? JSON.parse(result.value) : {};
    } catch (error) {
      console.error("Error fetching OCR settings:", error);
      return {};
    }
  }

  async updateOcrSettings(settingsData: any): Promise<void> {
    await db.insert(settings)
      .values({
        key: 'ocr_settings',
        value: JSON.stringify(settingsData),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(settingsData),
          updatedAt: new Date()
        }
      });
  }

  async getCalendarSettings(): Promise<any> {
    try {
      const [result] = await db.select()
        .from(settings)
        .where(eq(settings.key, 'calendar_settings'));
      return result?.value ? JSON.parse(result.value) : {
        schedulingBufferMinutes: 15,
        preventOverlapping: true,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        defaultJobDuration: 60
      };
    } catch (error) {
      console.error("Error fetching calendar settings:", error);
      return {
        schedulingBufferMinutes: 15,
        preventOverlapping: true,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        defaultJobDuration: 60
      };
    }
  }

  async updateCalendarSettings(settingsData: any): Promise<void> {
    await db.insert(settings)
      .values({
        key: 'calendar_settings',
        value: JSON.stringify(settingsData),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(settingsData),
          updatedAt: new Date()
        }
      });
  }

  // Leads management implementation
  async getLeads(userId: number): Promise<Lead[]> {
    return await db.select()
      .from(leads)
      .where(eq(leads.userId, userId))
      .orderBy(desc(leads.createdAt));
  }

  async getLead(id: number, userId: number): Promise<Lead | undefined> {
    const [lead] = await db.select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads)
      .values(lead)
      .returning();
    return newLead;
  }

  async updateLead(id: number, userId: number, leadData: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads)
      .set({ ...leadData, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();
    return updated;
  }

  async deleteLead(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return result.rowCount > 0;
  }

  // Calendar Jobs management implementation
  async getCalendarJobs(userId: number): Promise<(CalendarJob & { customer?: Customer, lead?: Lead })[]> {
    const jobs = await db.select({
      job: calendarJobs,
      customer: customers,
      lead: leads,
    })
    .from(calendarJobs)
    .leftJoin(customers, eq(calendarJobs.customerId, customers.id))
    .leftJoin(leads, eq(calendarJobs.leadId, leads.id))
    .where(eq(calendarJobs.userId, userId))
    .orderBy(desc(calendarJobs.startDate));

    return jobs.map(row => ({
      ...row.job,
      customer: row.customer || undefined,
      lead: row.lead || undefined,
    }));
  }

  async getCalendarJob(id: number, userId: number): Promise<(CalendarJob & { customer?: Customer, lead?: Lead }) | undefined> {
    const [result] = await db.select({
      job: calendarJobs,
      customer: customers,
      lead: leads,
    })
    .from(calendarJobs)
    .leftJoin(customers, eq(calendarJobs.customerId, customers.id))
    .leftJoin(leads, eq(calendarJobs.leadId, leads.id))
    .where(and(eq(calendarJobs.id, id), eq(calendarJobs.userId, userId)));

    if (!result) return undefined;

    return {
      ...result.job,
      customer: result.customer || undefined,
      lead: result.lead || undefined,
    };
  }

  async createCalendarJob(job: InsertCalendarJob): Promise<CalendarJob> {
    const [newJob] = await db.insert(calendarJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateCalendarJob(id: number, userId: number, jobData: Partial<InsertCalendarJob>): Promise<CalendarJob | undefined> {
    const [updated] = await db.update(calendarJobs)
      .set({ ...jobData, updatedAt: new Date() })
      .where(and(eq(calendarJobs.id, id), eq(calendarJobs.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCalendarJob(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(calendarJobs)
      .where(and(eq(calendarJobs.id, id), eq(calendarJobs.userId, userId)));
    return result.rowCount > 0;
  }

  async convertJobToProject(jobId: number, userId: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const job = await this.getCalendarJob(jobId, userId);
    if (!job) return undefined;

    // Create the project
    const newProject = await this.createProject({
      name: projectData.name || job.title,
      description: projectData.description || job.description || '',
      customerId: job.customerId || projectData.customerId,
      startDate: projectData.startDate || job.startDate,
      endDate: projectData.endDate || job.endDate,
      budget: projectData.budget || (job.estimatedValue ? parseFloat(job.estimatedValue) : undefined),
      status: 'active',
      priority: job.priority,
      userId,
      ...projectData,
    });

    // Update the job to mark it as converted
    await this.updateCalendarJob(jobId, userId, {
      status: 'converted',
      convertedToProjectId: newProject.id,
    });

    return newProject;
  }

  // Internal messaging system implementation
  async getInternalMessages(userId: number): Promise<(InternalMessage & { sender: User, recipients: (InternalMessageRecipient & { user: User })[] })[]> {
    // Ultra-fast query: get messages where user is sender first, then where user is recipient
    const senderResult = await pool.query(`
      SELECT 
        m.id, m.sender_id, m.subject, m.content, m.message_type, 
        m.priority, m.parent_message_id, m.created_at, m.updated_at,
        s.username as sender_username, s.first_name as sender_first_name, 
        s.last_name as sender_last_name, s.email as sender_email, s.role as sender_role
      FROM internal_messages m
      JOIN users s ON m.sender_id = s.id
      WHERE m.sender_id = $1
      ORDER BY m.created_at DESC
      LIMIT 15
    `, [userId]);

    const recipientResult = await pool.query(`
      SELECT DISTINCT
        m.id, m.sender_id, m.subject, m.content, m.message_type, 
        m.priority, m.parent_message_id, m.created_at, m.updated_at,
        s.username as sender_username, s.first_name as sender_first_name, 
        s.last_name as sender_last_name, s.email as sender_email, s.role as sender_role
      FROM internal_messages m
      JOIN users s ON m.sender_id = s.id
      JOIN internal_message_recipients r ON m.id = r.message_id
      WHERE r.recipient_id = $1
      ORDER BY m.created_at DESC
      LIMIT 10
    `, [userId]);

    // Combine and deduplicate results
    const allMessages = [...senderResult.rows, ...recipientResult.rows];
    const uniqueMessages = allMessages.reduce((acc, msg) => {
      if (!acc.find(m => m.id === msg.id)) {
        acc.push(msg);
      }
      return acc;
    }, []);

    // Sort by creation date and limit
    uniqueMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const limitedMessages = uniqueMessages.slice(0, 20);

    // Skip recipients loading for performance
    const recipientsByMessage = {};

    return limitedMessages.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      subject: row.subject,
      content: row.content,
      messageType: row.message_type,
      priority: row.priority,
      parentMessageId: row.parent_message_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sender: {
        id: row.sender_id,
        username: row.sender_username,
        firstName: row.sender_first_name,
        lastName: row.sender_last_name,
        email: row.sender_email,
        role: row.sender_role
      },
      recipients: recipientsByMessage[row.id] || []
    }));
  }

  async getInternalMessage(id: number, userId: number): Promise<(InternalMessage & { sender: User, recipients: (InternalMessageRecipient & { user: User })[] }) | undefined> {
    const result = await pool.query(`
      SELECT 
        m.*,
        s.id as sender_id, s.username as sender_username, s.first_name as sender_first_name, 
        s.last_name as sender_last_name, s.email as sender_email, s.role as sender_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'recipientId', r.recipient_id,
              'isRead', r.is_read,
              'readAt', r.read_at,
              'user', json_build_object(
                'id', u.id,
                'username', u.username,
                'firstName', u.first_name,
                'lastName', u.last_name,
                'email', u.email,
                'role', u.role
              )
            )
          ) FILTER (WHERE r.id IS NOT NULL), '[]'
        ) as recipients
      FROM internal_messages m
      JOIN users s ON m.sender_id = s.id
      LEFT JOIN internal_message_recipients r ON m.id = r.message_id
      LEFT JOIN users u ON r.recipient_id = u.id
      WHERE m.id = $1 AND (m.sender_id = $2 OR r.recipient_id = $2)
      GROUP BY m.id, s.id, s.username, s.first_name, s.last_name, s.email, s.role
    `, [id, userId]);

    const row = result.rows[0];
    if (!row) return undefined;

    return {
      id: row.id,
      senderId: row.sender_id,
      subject: row.subject,
      content: row.content,
      messageType: row.message_type,
      priority: row.priority,
      parentMessageId: row.parent_message_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sender: {
        id: row.sender_id,
        username: row.sender_username,
        firstName: row.sender_first_name,
        lastName: row.sender_last_name,
        email: row.sender_email,
        role: row.sender_role
      },
      recipients: row.recipients
    };
  }

  async createInternalMessage(message: InsertInternalMessage, recipientIds: number[]): Promise<InternalMessage> {
    const messageResult = await pool.query(`
      INSERT INTO internal_messages (sender_id, subject, content, message_type, priority, parent_message_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [message.senderId, message.subject, message.content, message.messageType, message.priority, message.parentMessageId]);

    const newMessage = messageResult.rows[0];

    // Insert recipients
    for (const recipientId of recipientIds) {
      await pool.query(`
        INSERT INTO internal_message_recipients (message_id, recipient_id)
        VALUES ($1, $2)
      `, [newMessage.id, recipientId]);
    }

    return newMessage;
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<boolean> {
    const result = await pool.query(`
      UPDATE internal_message_recipients 
      SET is_read = true, read_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
    `, [messageId, userId]);

    return (result.rowCount || 0) > 0;
  }

  async deleteInternalMessage(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(`
      DELETE FROM internal_messages 
      WHERE id = $1 AND sender_id = $2
    `, [id, userId]);

    return (result.rowCount || 0) > 0;
  }

  // Message groups
  async getMessageGroups(userId: number): Promise<(MessageGroup & { members: (MessageGroupMember & { user: User })[] })[]> {
    const result = await pool.query(`
      SELECT 
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'userId', m.user_id,
              'role', m.role,
              'joinedAt', m.joined_at,
              'user', json_build_object(
                'id', u.id,
                'username', u.username,
                'firstName', u.first_name,
                'lastName', u.last_name,
                'email', u.email,
                'role', u.role
              )
            )
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) as members
      FROM message_groups g
      LEFT JOIN message_group_members m ON g.id = m.group_id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE g.created_by = $1 OR m.user_id = $1
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdBy: row.created_by,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      members: row.members
    }));
  }

  async createMessageGroup(group: InsertMessageGroup): Promise<MessageGroup> {
    const result = await pool.query(`
      INSERT INTO message_groups (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [group.name, group.description, group.createdBy]);

    return result.rows[0];
  }

  async addUserToGroup(groupId: number, userId: number, role: string = 'member'): Promise<MessageGroupMember> {
    const result = await pool.query(`
      INSERT INTO message_group_members (group_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [groupId, userId, role]);

    return result.rows[0];
  }

  async removeUserFromGroup(groupId: number, userId: number): Promise<boolean> {
    const result = await pool.query(`
      DELETE FROM message_group_members 
      WHERE group_id = $1 AND user_id = $2
    `, [groupId, userId]);

    return (result.rowCount || 0) > 0;
  }

  async sendGroupMessage(groupId: number, message: InsertInternalMessage): Promise<InternalMessage> {
    // Get all group members
    const membersResult = await pool.query(`
      SELECT user_id FROM message_group_members WHERE group_id = $1
    `, [groupId]);

    const recipientIds = membersResult.rows.map(row => row.user_id);
    
    return this.createInternalMessage(message, recipientIds);
  }

  // Admin system settings
  async getSystemSettings(): Promise<Record<string, any>> {
    const settingsData = await db.select().from(settings);
    const systemSettings: Record<string, any> = {
      allowRegistration: true,
      requireEmailVerification: false,
      sessionTimeout: 60,
      maxFileSize: 10,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      requireStrongPassword: true,
      enableTwoFactor: false,
      enableImageCompression: false,
      imageQuality: 80,
      maxImageWidth: 1920,
      maxImageHeight: 1080,
      compressionFormat: 'jpeg',
      enableThumbnails: false
    };
    
    settingsData.forEach(setting => {
      if (setting.key.startsWith('system_')) {
        const key = setting.key.replace('system_', '');
        let value: any = setting.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value))) value = Number(value);
        systemSettings[key] = value;
      }
    });
    
    return systemSettings;
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    const settingKey = `system_${key}`;
    
    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, settingKey))
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date()
        })
        .where(eq(settings.key, settingKey));
    } else {
      // Insert new setting
      await db.insert(settings).values({
        category: 'system',
        key: settingKey,
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // Gas Card Management
  async getGasCards(): Promise<GasCard[]> {
    return await db.select().from(gasCards).orderBy(desc(gasCards.createdAt));
  }

  async createGasCard(data: InsertGasCard): Promise<GasCard> {
    const [gasCard] = await db.insert(gasCards).values(data).returning();
    return gasCard;
  }

  async updateGasCard(id: number, data: Partial<InsertGasCard>): Promise<GasCard> {
    const [gasCard] = await db
      .update(gasCards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gasCards.id, id))
      .returning();
    return gasCard;
  }

  async deleteGasCard(id: number): Promise<void> {
    await db.delete(gasCards).where(eq(gasCards.id, id));
  }

  // Gas Card Assignments
  async getGasCardAssignments(): Promise<(GasCardAssignment & { gasCard: GasCard; assignedToUser: User; assignedByUser: User })[]> {
    const assignedByUser = alias(users, 'assignedByUser');
    
    return await db
      .select({
        id: gasCardAssignments.id,
        cardId: gasCardAssignments.cardId,
        assignedToUserId: gasCardAssignments.assignedToUserId,
        assignedBy: gasCardAssignments.assignedBy,
        assignedDate: gasCardAssignments.assignedDate,
        returnedDate: gasCardAssignments.returnedDate,
        purpose: gasCardAssignments.purpose,
        notes: gasCardAssignments.notes,
        status: gasCardAssignments.status,
        createdAt: gasCardAssignments.createdAt,
        updatedAt: gasCardAssignments.updatedAt,
        gasCard: {
          id: gasCards.id,
          cardNumber: gasCards.cardNumber,
          cardName: gasCards.cardName,
          provider: gasCards.provider,
          status: gasCards.status,
          notes: gasCards.notes,
          createdAt: gasCards.createdAt,
          updatedAt: gasCards.updatedAt,
        },
        assignedToUser: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        assignedByUser: {
          id: assignedByUser.id,
          username: assignedByUser.username,
          email: assignedByUser.email,
          firstName: assignedByUser.firstName,
          lastName: assignedByUser.lastName,
        }
      })
      .from(gasCardAssignments)
      .leftJoin(gasCards, eq(gasCardAssignments.cardId, gasCards.id))
      .leftJoin(users, eq(gasCardAssignments.assignedToUserId, users.id))
      .leftJoin(assignedByUser, eq(gasCardAssignments.assignedBy, assignedByUser.id))
      .orderBy(desc(gasCardAssignments.createdAt));
  }

  async createGasCardAssignment(data: InsertGasCardAssignment): Promise<GasCardAssignment> {
    const [assignment] = await db.insert(gasCardAssignments).values(data).returning();
    return assignment;
  }

  async updateGasCardAssignment(id: number, data: Partial<InsertGasCardAssignment>): Promise<GasCardAssignment> {
    const [assignment] = await db
      .update(gasCardAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gasCardAssignments.id, id))
      .returning();
    return assignment;
  }

  async returnGasCard(assignmentId: number, returnedDate: Date): Promise<GasCardAssignment> {
    const [assignment] = await db
      .update(gasCardAssignments)
      .set({ 
        returnedDate: returnedDate,
        status: 'returned',
        updatedAt: new Date()
      })
      .where(eq(gasCardAssignments.id, assignmentId))
      .returning();
    return assignment;
  }

  async getActiveGasCardAssignments(): Promise<(GasCardAssignment & { gasCard: GasCard; assignedToUser: User })[]> {
    return await db
      .select({
        id: gasCardAssignments.id,
        cardId: gasCardAssignments.cardId,
        assignedToUserId: gasCardAssignments.assignedToUserId,
        assignedBy: gasCardAssignments.assignedBy,
        assignedDate: gasCardAssignments.assignedDate,
        returnedDate: gasCardAssignments.returnedDate,
        purpose: gasCardAssignments.purpose,
        notes: gasCardAssignments.notes,
        status: gasCardAssignments.status,
        createdAt: gasCardAssignments.createdAt,
        updatedAt: gasCardAssignments.updatedAt,
        gasCard: {
          id: gasCards.id,
          cardNumber: gasCards.cardNumber,
          cardName: gasCards.cardName,
          provider: gasCards.provider,
          status: gasCards.status,
          notes: gasCards.notes,
          createdAt: gasCards.createdAt,
          updatedAt: gasCards.updatedAt,
        },
        assignedToUser: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(gasCardAssignments)
      .leftJoin(gasCards, eq(gasCardAssignments.cardId, gasCards.id))
      .leftJoin(users, eq(gasCardAssignments.assignedToUserId, users.id))
      .where(eq(gasCardAssignments.status, 'assigned'))
      .orderBy(desc(gasCardAssignments.assignedDate));
  }

  // Activity logs for admin monitoring
  async getActivityLogs(): Promise<any[]> {
    const userResults = await db.select({
      id: users.id,
      username: users.username,
      lastLoginAt: users.lastLoginAt
    }).from(users)
    .where(isNotNull(users.lastLoginAt))
    .orderBy(desc(users.lastLoginAt))
    .limit(20);
    
    return userResults.map((user, index) => ({
      id: index + 1,
      userId: user.id,
      username: user.username,
      action: 'User Login',
      details: `User ${user.username} logged in`,
      timestamp: user.lastLoginAt?.toISOString() || new Date().toISOString(),
      ipAddress: '127.0.0.1'
    }));
  }

  // Image management methods
  async getImages(userId: number): Promise<any[]> {
    const result = await db.select({
      id: images.id,
      filename: images.filename,
      originalName: images.originalName,
      mimeType: images.mimeType,
      size: images.size,
      description: images.description,
      annotations: images.annotations,
      annotatedImageUrl: images.annotatedImageUrl,
      uploadDate: images.createdAt,
      projectId: images.projectId,
      projectName: projects.name
    })
    .from(images)
    .leftJoin(projects, eq(images.projectId, projects.id))
    .where(eq(images.userId, userId))
    .orderBy(desc(images.createdAt));

    return result;
  }

  async createImage(imageData: any): Promise<any> {
    const [image] = await db
      .insert(images)
      .values(imageData)
      .returning();
    return image;
  }

  async saveImageAnnotations(imageId: number, userId: number, annotations: any[], annotatedImageUrl: string): Promise<any | null> {
    const [updatedImage] = await db
      .update(images)
      .set({
        annotations: JSON.stringify(annotations),
        annotatedImageUrl,
        updatedAt: new Date()
      })
      .where(and(eq(images.id, imageId), eq(images.userId, userId)))
      .returning();

    return updatedImage || null;
  }

  async saveFileAnnotations(fileId: number, userId: number, annotations: any[], annotatedImageUrl: string): Promise<any | null> {
    const [updatedFile] = await db
      .update(projectFiles)
      .set({
        annotations: JSON.stringify(annotations),
        annotatedImageUrl,
        updatedAt: new Date()
      })
      .where(and(eq(projectFiles.id, fileId), eq(projectFiles.uploadedById, userId)))
      .returning();

    return updatedFile || null;
  }

  async deleteImage(imageId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(images)
      .where(and(eq(images.id, imageId), eq(images.userId, userId)));

    return result.rowCount > 0;
  }

  // Shared photo links implementation
  async createSharedPhotoLink(linkData: InsertSharedPhotoLink): Promise<SharedPhotoLink> {
    const [link] = await db
      .insert(sharedPhotoLinks)
      .values(linkData)
      .returning();
    return link;
  }

  async getSharedPhotoLink(shareToken: string): Promise<(SharedPhotoLink & { project: Project, images: any[] }) | undefined> {
    const link = await db
      .select()
      .from(sharedPhotoLinks)
      .leftJoin(projects, eq(sharedPhotoLinks.projectId, projects.id))
      .where(and(
        eq(sharedPhotoLinks.shareToken, shareToken),
        eq(sharedPhotoLinks.isActive, true)
      ))
      .limit(1);

    if (!link.length || !link[0].shared_photo_links || !link[0].projects) {
      return undefined;
    }

    const linkData = link[0].shared_photo_links;
    const projectData = link[0].projects;
    
    // Get images based on imageIds in the link
    const imageIds = linkData.imageIds as number[];
    let linkImages: any[] = [];
    
    if (imageIds && imageIds.length > 0) {
      linkImages = await db
        .select()
        .from(images)
        .where(inArray(images.id, imageIds));
    }

    return {
      ...linkData,
      project: projectData,
      images: linkImages
    };
  }

  async getSharedPhotoLinks(userId: number): Promise<(SharedPhotoLink & { project: Project })[]> {
    const links = await db
      .select()
      .from(sharedPhotoLinks)
      .leftJoin(projects, eq(sharedPhotoLinks.projectId, projects.id))
      .where(eq(sharedPhotoLinks.createdBy, userId))
      .orderBy(desc(sharedPhotoLinks.createdAt));

    return links.map(link => ({
      ...link.shared_photo_links,
      project: link.projects!
    }));
  }

  async updateSharedPhotoLinkAccess(shareToken: string): Promise<boolean> {
    const [updated] = await db
      .update(sharedPhotoLinks)
      .set({
        accessCount: sql`${sharedPhotoLinks.accessCount} + 1`,
        lastAccessedAt: new Date()
      })
      .where(eq(sharedPhotoLinks.shareToken, shareToken))
      .returning();

    return !!updated;
  }

  async deactivateSharedPhotoLink(id: number, userId: number): Promise<boolean> {
    const [updated] = await db
      .update(sharedPhotoLinks)
      .set({ isActive: false })
      .where(and(
        eq(sharedPhotoLinks.id, id),
        eq(sharedPhotoLinks.createdBy, userId)
      ))
      .returning();

    return !!updated;
  }

  async deleteSharedPhotoLink(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(sharedPhotoLinks)
      .where(and(
        eq(sharedPhotoLinks.id, id),
        eq(sharedPhotoLinks.createdBy, userId)
      ));

    return result.rowCount > 0;
  }

  // SMS functionality placeholder methods
  async getSmsMessages(): Promise<any[]> {
    return [];
  }

  async createSmsMessage(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  async getSmsTemplates(): Promise<any[]> {
    return [];
  }

  async createSmsTemplate(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  // Review management methods
  async createReviewRequest(reviewData: InsertReviewRequest): Promise<ReviewRequest> {
    const [reviewRequest] = await db
      .insert(reviewRequests)
      .values(reviewData)
      .returning();
    return reviewRequest;
  }

  async getReviewRequests(userId: number): Promise<ReviewRequest[]> {
    return await db
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.userId, userId))
      .orderBy(desc(reviewRequests.createdAt));
  }

  async getReviewRequest(id: number, userId: number): Promise<ReviewRequest | undefined> {
    const [reviewRequest] = await db
      .select()
      .from(reviewRequests)
      .where(and(
        eq(reviewRequests.id, id),
        eq(reviewRequests.userId, userId)
      ));
    return reviewRequest;
  }

  async updateReviewRequest(id: number, userId: number, updates: Partial<ReviewRequest>): Promise<ReviewRequest | undefined> {
    const [updatedRequest] = await db
      .update(reviewRequests)
      .set(updates)
      .where(and(
        eq(reviewRequests.id, id),
        eq(reviewRequests.userId, userId)
      ))
      .returning();
    return updatedRequest;
  }

  async getReviewAnalytics(userId: number): Promise<any> {
    const requests = await db
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.userId, userId));

    const totalRequests = requests.length;
    const sentRequests = requests.filter(r => r.status === 'sent' || r.status === 'reviewed').length;
    const completedReviews = requests.filter(r => r.status === 'reviewed').length;
    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'sent').length;
    const expiredRequests = requests.filter(r => r.status === 'expired').length;

    // Calculate average rating
    const reviewsWithRating = requests.filter(r => r.googleReviewRating && r.googleReviewRating > 0);
    const averageRating = reviewsWithRating.length > 0 
      ? reviewsWithRating.reduce((sum, r) => sum + (r.googleReviewRating || 0), 0) / reviewsWithRating.length 
      : 0;

    // Calculate response rate
    const responseRate = sentRequests > 0 ? (completedReviews / sentRequests) * 100 : 0;

    // Generate monthly stats for the last 6 months
    const monthlyStats = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthRequests = requests.filter(r => {
        const requestDate = new Date(r.sentAt || r.createdAt);
        return requestDate >= month && requestDate < nextMonth;
      });

      const monthReviews = monthRequests.filter(r => r.status === 'reviewed');
      const monthAvgRating = monthReviews.length > 0 
        ? monthReviews.reduce((sum, r) => sum + (r.googleReviewRating || 0), 0) / monthReviews.length 
        : 0;

      monthlyStats.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        requests: monthRequests.length,
        reviews: monthReviews.length,
        averageRating: monthAvgRating
      });
    }

    return {
      totalRequests,
      sentRequests,
      completedReviews,
      averageRating,
      responseRate,
      pendingRequests,
      expiredRequests,
      monthlyStats
    };
  }

  async resendReviewRequest(userId: number, requestId: number): Promise<ReviewRequest | undefined> {
    // Update the request status and resend date
    const [updatedRequest] = await db
      .update(reviewRequests)
      .set({ 
        status: 'sent',
        sentAt: new Date()
      })
      .where(and(
        eq(reviewRequests.id, requestId),
        eq(reviewRequests.userId, userId)
      ))
      .returning();

    // In a real implementation, this would trigger the SMS send again
    console.log(`Resending review request ${requestId} for user ${userId}`);
    
    return updatedRequest;
  }

  // Google My Business settings methods
  async getGoogleMyBusinessSettings(userId: number): Promise<GoogleMyBusinessSettings | undefined> {
    const [settings] = await db
      .select()
      .from(googleMyBusinessSettings)
      .where(and(
        eq(googleMyBusinessSettings.userId, userId),
        eq(googleMyBusinessSettings.isActive, true)
      ));
    return settings;
  }

  async createGoogleMyBusinessSettings(settings: InsertGoogleMyBusinessSettings): Promise<GoogleMyBusinessSettings> {
    const [newSettings] = await db
      .insert(googleMyBusinessSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateGoogleMyBusinessSettings(userId: number, settings: Partial<InsertGoogleMyBusinessSettings>): Promise<GoogleMyBusinessSettings | undefined> {
    const [updatedSettings] = await db
      .update(googleMyBusinessSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(googleMyBusinessSettings.userId, userId))
      .returning();
    return updatedSettings;
  }

  // DocuSign functionality methods
  async createDocusignEnvelope(envelopeData: InsertDocusignEnvelope): Promise<DocusignEnvelope> {
    const [envelope] = await db
      .insert(docusignEnvelopes)
      .values(envelopeData)
      .returning();
    return envelope;
  }

  async getDocusignEnvelopes(userId: number): Promise<DocusignEnvelope[]> {
    return await db
      .select()
      .from(docusignEnvelopes)
      .where(eq(docusignEnvelopes.userId, userId))
      .orderBy(desc(docusignEnvelopes.createdAt));
  }

  async getDocusignEnvelope(envelopeId: string): Promise<DocusignEnvelope | undefined> {
    const [envelope] = await db
      .select()
      .from(docusignEnvelopes)
      .where(eq(docusignEnvelopes.envelopeId, envelopeId));
    return envelope;
  }

  async updateDocusignEnvelope(envelopeId: string, updates: Partial<DocusignEnvelope>): Promise<DocusignEnvelope | undefined> {
    const [updatedEnvelope] = await db
      .update(docusignEnvelopes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(docusignEnvelopes.envelopeId, envelopeId))
      .returning();
    return updatedEnvelope;
  }

  async updateProjectFileSignatureStatus(fileId: number, envelopeId: string, status: string, signingUrl?: string, signedDocUrl?: string): Promise<ProjectFile | undefined> {
    const updateData: any = {
      docusignEnvelopeId: envelopeId,
      signatureStatus: status,
      updatedAt: new Date()
    };

    if (signingUrl) updateData.signatureUrl = signingUrl;
    if (signedDocUrl) updateData.signedDocumentUrl = signedDocUrl;

    const [updatedFile] = await db
      .update(projectFiles)
      .set(updateData)
      .where(eq(projectFiles.id, fileId))
      .returning();
    return updatedFile;
  }
}

export const storage = new DatabaseStorage();
