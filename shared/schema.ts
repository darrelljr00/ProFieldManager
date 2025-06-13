import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"), // admin, manager, user
  isActive: boolean("is_active").default(true),
  canViewProfiles: boolean("can_view_profiles").default(true),
  canEditProfiles: boolean("can_edit_profiles").default(false),
  canCreateInvoices: boolean("can_create_invoices").default(true),
  canViewAllData: boolean("can_view_all_data").default(false),
  canManageProjects: boolean("can_manage_projects").default(true),
  canAccessReports: boolean("can_access_reports").default(true),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  companyName: text("company_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  squareApplicationId: text("square_application_id"),
  squareAccessToken: text("square_access_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  squarePaymentId: text("square_payment_id"),
  paymentMethod: text("payment_method"), // stripe, square, manual
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  quoteNumber: text("quote_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  quoteDate: timestamp("quote_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  acceptedAt: timestamp("accepted_at"),
  convertedInvoiceId: integer("converted_invoice_id").references(() => invoices.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  method: text("method").notNull(), // stripe, square, manual
  status: text("status").notNull(), // pending, completed, failed, refunded
  externalId: text("external_id"), // Stripe or Square payment ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // payment, company, email
  key: text("key").notNull(),
  value: text("value"),
  isSecret: boolean("is_secret").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  to: text("to").notNull(),
  from: text("from").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // queued, sent, delivered, failed
  direction: text("direction").notNull(), // inbound, outbound
  twilioSid: text("twilio_sid"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  permission: text("permission").notNull(), // read_invoices, write_invoices, admin_users, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Project Management Tables
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, completed, on-hold, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  deadline: timestamp("deadline"),
  progress: integer("progress").default(0), // 0-100
  budget: decimal("budget", { precision: 10, scale: 2 }),
  customerId: integer("customer_id").references(() => customers.id),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactCompany: text("contact_company"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectUsers = pgTable("project_users", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // owner, manager, member, viewer
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // todo, in-progress, review, completed
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // image, video, document, other
  description: text("description"),
  annotations: text("annotations"), // JSON string of annotations
  annotatedImageUrl: text("annotated_image_url"), // URL of annotated image version
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  description: text("description"),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  billable: boolean("billable").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expense tracking tables
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(), // travel, meals, office_supplies, equipment, etc.
  subcategory: text("subcategory"),
  description: text("description").notNull(),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  receiptData: text("receipt_data"), // OCR extracted text
  expenseDate: timestamp("expense_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, reimbursed
  isReimbursable: boolean("is_reimbursable").default(true),
  tags: text("tags").array(),
  notes: text("notes"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  reimbursedAt: timestamp("reimbursed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseReports = pgTable("expense_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, submitted, approved, rejected
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenseReportItems = pgTable("expense_report_items", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => expenseReports.id),
  expenseId: integer("expense_id").notNull().references(() => expenses.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Gas cards table
export const gasCards = pgTable("gas_cards", {
  id: serial("id").primaryKey(),
  cardNumber: text("card_number").notNull().unique(),
  cardName: text("card_name").notNull(),
  provider: text("provider").notNull(), // Shell, BP, Exxon, etc.
  status: text("status").notNull().default("active"), // active, inactive, lost, expired
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Gas card assignments table
export const gasCardAssignments = pgTable("gas_card_assignments", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().references(() => gasCards.id),
  assignedToUserId: integer("assigned_to_user_id").notNull().references(() => users.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  assignedDate: timestamp("assigned_date").notNull(),
  returnedDate: timestamp("returned_date"),
  purpose: text("purpose"), // job site, project, etc.
  notes: text("notes"),
  status: text("status").notNull().default("assigned"), // assigned, returned, overdue
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  serviceDescription: text("service_description").notNull(),
  leadPrice: decimal("lead_price", { precision: 10, scale: 2 }),
  leadSource: text("lead_source").notNull(), // referral, website, advertising, social_media, etc.
  status: text("status").notNull().default("new"), // new, contacted, qualified, proposal_sent, won, lost
  priority: text("priority").notNull().default("medium"), // low, medium, high
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar Jobs table
export const calendarJobs = pgTable("calendar_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, converted, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high
  notes: text("notes"),
  convertedToProjectId: integer("converted_to_project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Internal messaging system
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("individual"), // individual, group, broadcast
  priority: text("priority").default("normal"), // low, normal, high, urgent
  parentMessageId: integer("parent_message_id").references((): any => internalMessages.id), // for replies
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const internalMessageRecipients = pgTable("internal_message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => internalMessages.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageGroups = pgTable("message_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageGroupMembers = pgTable("message_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => messageGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("member"), // admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Image management tables
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  filename: text("filename").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  description: text("description"),
  annotations: jsonb("annotations").default('[]'),
  annotatedImageUrl: text("annotated_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const imageAnnotations = pgTable("image_annotations", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // text, rectangle, circle, arrow, freehand
  x: decimal("x", { precision: 10, scale: 2 }).notNull(),
  y: decimal("y", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  text: text("text"),
  color: text("color").notNull().default("#ff0000"),
  strokeWidth: integer("stroke_width").notNull().default(2),
  points: jsonb("points"), // for freehand drawings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive(),
  })),
});

export const insertQuoteSchema = createInsertSchema(quotes, {
  quoteDate: z.string().transform((val) => new Date(val)),
  expiryDate: z.string().transform((val) => new Date(val)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive(),
  })),
});

export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectUserSchema = createInsertSchema(projectUsers).omit({
  id: true,
  joinedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  reimbursedAt: true,
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseReportSchema = createInsertSchema(expenseReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertExpenseReportItemSchema = createInsertSchema(expenseReportItems).omit({
  id: true,
  createdAt: true,
});

export const insertGasCardSchema = createInsertSchema(gasCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImageAnnotationSchema = createInsertSchema(imageAnnotations).omit({
  id: true,
  createdAt: true,
});

export const insertGasCardAssignmentSchema = createInsertSchema(gasCardAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarJobSchema = createInsertSchema(calendarJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInternalMessageRecipientSchema = createInsertSchema(internalMessageRecipients).omit({
  id: true,
  createdAt: true,
});

export const insertMessageGroupSchema = createInsertSchema(messageGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageGroupMemberSchema = createInsertSchema(messageGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectUser = typeof projectUsers.$inferSelect;
export type InsertProjectUser = z.infer<typeof insertProjectUserSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

export type ExpenseReport = typeof expenseReports.$inferSelect;
export type InsertExpenseReport = z.infer<typeof insertExpenseReportSchema>;

export type ExpenseReportItem = typeof expenseReportItems.$inferSelect;
export type InsertExpenseReportItem = z.infer<typeof insertExpenseReportItemSchema>;

export type GasCard = typeof gasCards.$inferSelect;
export type InsertGasCard = z.infer<typeof insertGasCardSchema>;

export type GasCardAssignment = typeof gasCardAssignments.$inferSelect;
export type InsertGasCardAssignment = z.infer<typeof insertGasCardAssignmentSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type CalendarJob = typeof calendarJobs.$inferSelect;
export type InsertCalendarJob = z.infer<typeof insertCalendarJobSchema>;

export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;

export type InternalMessageRecipient = typeof internalMessageRecipients.$inferSelect;
export type InsertInternalMessageRecipient = z.infer<typeof insertInternalMessageRecipientSchema>;

export type MessageGroup = typeof messageGroups.$inferSelect;
export type InsertMessageGroup = z.infer<typeof insertMessageGroupSchema>;

export type MessageGroupMember = typeof messageGroupMembers.$inferSelect;
export type InsertMessageGroupMember = z.infer<typeof insertMessageGroupMemberSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;