import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SaaS Organizations/Tenants
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // e.g., "acme-corp"
  domain: text("domain"), // Custom domain like "acme.profieldmanager.com"
  logo: text("logo"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  timezone: text("timezone").default("America/New_York"),
  currency: text("currency").default("USD"),
  
  // Subscription info
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, cancelled, past_due
  subscriptionPlan: text("subscription_plan").default("starter"), // starter, professional, enterprise
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  
  // Stripe integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  
  // Usage limits based on plan
  maxUsers: integer("max_users").default(5),
  maxProjects: integer("max_projects").default(50),
  maxStorageGB: integer("max_storage_gb").default(10),
  
  // Features enabled
  hasAdvancedReporting: boolean("has_advanced_reporting").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasCustomBranding: boolean("has_custom_branding").default(false),
  hasIntegrations: boolean("has_integrations").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Starter", "Professional", "Enterprise"
  slug: text("slug").notNull().unique(), // "starter", "professional", "enterprise"
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  billingInterval: text("billing_interval").default("month"), // month, year
  stripePriceId: text("stripe_price_id"),
  
  // Plan limits
  maxUsers: integer("max_users").default(5),
  maxProjects: integer("max_projects").default(50),
  maxStorageGB: integer("max_storage_gb").default(10),
  
  // Plan features
  hasAdvancedReporting: boolean("has_advanced_reporting").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasCustomBranding: boolean("has_custom_branding").default(false),
  hasIntegrations: boolean("has_integrations").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"), // admin, manager, user
  userType: text("user_type").notNull().default("both"), // web, mobile, both
  isActive: boolean("is_active").default(true),
  canViewProfiles: boolean("can_view_profiles").default(true),
  canEditProfiles: boolean("can_edit_profiles").default(false),
  canCreateInvoices: boolean("can_create_invoices").default(true),
  canViewAllData: boolean("can_view_all_data").default(false),
  canManageProjects: boolean("can_manage_projects").default(true),
  canAccessReports: boolean("can_access_reports").default(true),
  // Tab-level access controls
  canAccessDashboard: boolean("can_access_dashboard").default(true),
  canAccessCustomers: boolean("can_access_customers").default(true),
  canAccessProjects: boolean("can_access_projects").default(true),
  canAccessInvoices: boolean("can_access_invoices").default(true),
  canAccessQuotes: boolean("can_access_quotes").default(true),
  canAccessExpenses: boolean("can_access_expenses").default(true),
  canAccessExpenseReports: boolean("can_access_expense_reports").default(true),
  canAccessPayments: boolean("can_access_payments").default(true),
  canAccessMessages: boolean("can_access_messages").default(true),
  canAccessInternalMessages: boolean("can_access_internal_messages").default(true),
  canAccessSMS: boolean("can_access_sms").default(true),
  canAccessCalendar: boolean("can_access_calendar").default(true),
  canAccessImageGallery: boolean("can_access_image_gallery").default(true),
  canAccessReviews: boolean("can_access_reviews").default(true),
  canAccessLeads: boolean("can_access_leads").default(true),
  canAccessGasCards: boolean("can_access_gas_cards").default(true),
  canAccessSettings: boolean("can_access_settings").default(true),
  canAccessUsers: boolean("can_access_users").default(false),
  canAccessAdminSettings: boolean("can_access_admin_settings").default(false),
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
  // GPS tracking fields
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationAccuracy: text("location_accuracy"),
  deviceType: text("device_type"),
  locationTimestamp: timestamp("location_timestamp"),
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
  docusignEnvelopeId: text("docusign_envelope_id"), // DocuSign envelope ID for e-signature
  signatureStatus: text("signature_status").default("none"), // none, sent, completed, declined, voided
  signatureUrl: text("signature_url"), // DocuSign signing URL
  signedDocumentUrl: text("signed_document_url"), // URL of signed document
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const docusignEnvelopes = pgTable("docusign_envelopes", {
  id: serial("id").primaryKey(),
  envelopeId: text("envelope_id").notNull().unique(),
  fileId: integer("file_id").references(() => fileManager.id), // File manager integration
  projectFileId: integer("project_file_id").references(() => projectFiles.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // created, sent, delivered, completed, declined, voided
  signingUrl: text("signing_url"),
  signedDocumentUrl: text("signed_document_url"),
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

// Time Clock System
export const timeClock = pgTable("time_clock", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  breakDuration: decimal("break_duration", { precision: 5, scale: 2 }).default("0.00"),
  clockInLocation: text("clock_in_location"), // GPS coordinates
  clockOutLocation: text("clock_out_location"), // GPS coordinates
  clockInIP: text("clock_in_ip"),
  clockOutIP: text("clock_out_ip"),
  status: text("status").notNull().default("clocked_in"), // clocked_in, on_break, clocked_out
  notes: text("notes"),
  supervisorApproval: boolean("supervisor_approval").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timeClockSettings = pgTable("time_clock_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  requireGPS: boolean("require_gps").default(false),
  allowedLocations: jsonb("allowed_locations"), // Array of allowed GPS coordinates with radius
  breakRules: jsonb("break_rules"), // Break policies and rules
  overtimeRules: jsonb("overtime_rules"), // Overtime calculation rules
  roundingRules: text("rounding_rules").default("none"), // none, 15min, 30min, hour
  requireSupervisorApproval: boolean("require_supervisor_approval").default(false),
  maxDailyHours: decimal("max_daily_hours", { precision: 3, scale: 1 }).default("12.0"),
  maxWeeklyHours: decimal("max_weekly_hours", { precision: 3, scale: 1 }).default("40.0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Expense line items for detailed tracking
export const expenseLineItems = pgTable("expense_line_items", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("1.000"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"), // optional sub-category for the item
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  address: text("address"),
  serviceDescription: text("service_description").notNull(),
  leadPrice: decimal("lead_price", { precision: 10, scale: 2 }),
  leadSource: text("lead_source").notNull(), // referral, website, advertising, social_media, etc.
  status: text("status").notNull().default("new"), // new, contacted, qualified, proposal_sent, won, lost
  priority: text("priority").notNull().default("medium"), // low, medium, high
  grade: text("grade").notNull().default("cold"), // cold, warm, hot
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

// Review management tables
export const reviewRequests = pgTable("review_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  customerPhone: text("customer_phone").notNull(),
  customerName: text("customer_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, clicked, reviewed, failed
  sentAt: timestamp("sent_at"),
  clickedAt: timestamp("clicked_at"),
  reviewedAt: timestamp("reviewed_at"),
  googleReviewId: text("google_review_id"),
  googleReviewRating: integer("google_review_rating"),
  googleReviewText: text("google_review_text"),
  twilioMessageSid: text("twilio_message_sid"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const googleMyBusinessSettings = pgTable("google_my_business_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  locationId: text("location_id").notNull(),
  locationName: text("location_name").notNull(),
  businessName: text("business_name").notNull(),
  placeId: text("place_id"),
  reviewUrl: text("review_url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shared photo links table
export const sharedPhotoLinks = pgTable("shared_photo_links", {
  id: serial("id").primaryKey(),
  shareToken: text("share_token").notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  imageIds: jsonb("image_ids").notNull(), // Array of image IDs to share
  createdBy: integer("created_by").notNull().references(() => users.id),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  expiresAt: timestamp("expires_at").notNull(),
  accessCount: integer("access_count").notNull().default(0),
  maxAccess: integer("max_access"), // Optional limit on access count
  isActive: boolean("is_active").notNull().default(true),
  message: text("message"), // Optional message to include
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
});

// File Manager system
export const fileManager = pgTable("file_manager", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // document, image, video, other
  description: text("description"),
  tags: text("tags").array(),
  folderId: integer("folder_id").references((): any => fileFolders.id),
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  shareableToken: text("shareable_token").unique(),
  shareExpiresAt: timestamp("share_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fileFolders = pgTable("file_folders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  parentFolderId: integer("parent_folder_id").references((): any => fileFolders.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  isSystemFolder: boolean("is_system_folder").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fileShares = pgTable("file_shares", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => fileManager.id, { onDelete: "cascade" }),
  sharedBy: integer("shared_by").notNull().references(() => users.id),
  sharedWith: integer("shared_with").references(() => users.id), // null for public shares
  shareToken: text("share_token").notNull().unique(),
  permissions: text("permissions").notNull().default("view"), // view, download, edit
  expiresAt: timestamp("expires_at"),
  accessCount: integer("access_count").default(0),
  maxAccess: integer("max_access"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fileVersions = pgTable("file_versions", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => fileManager.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  changeLog: text("change_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Form Builder System
export const customForms = pgTable("custom_forms", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  formData: jsonb("form_data").notNull(), // Fields and structure
  settings: jsonb("settings").notNull().default('{}'), // Form settings
  status: text("status").notNull().default("draft"), // draft, published, archived
  isPublic: boolean("is_public").default(false),
  publicId: text("public_id").unique(),
  submissionCount: integer("submission_count").default(0),
  lastSubmission: timestamp("last_submission"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  templateData: jsonb("template_data").notNull(), // Form structure and fields
  isSystem: boolean("is_system").default(true), // System templates vs user templates
  usageCount: integer("usage_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => customForms.id, { onDelete: "cascade" }),
  submissionData: jsonb("submission_data").notNull(),
  submittedBy: integer("submitted_by").references(() => users.id), // null for anonymous
  submittedByName: text("submitted_by_name"),
  submittedByEmail: text("submitted_by_email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").default("received"), // received, processed, archived
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  email: z.string().email(),
  role: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
  organizationId: z.number(),
});

export const insertCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  organizationId: z.number(),
});

export const insertInvoiceSchema = z.object({
  customerId: z.number(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.date(),
  dueDate: z.date(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  notes: z.string().optional(),
  organizationId: z.number(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive(),
  })),
});

export const insertQuoteSchema = z.object({
  customerId: z.number(),
  quoteNumber: z.string().min(1),
  quoteDate: z.date(),
  expiryDate: z.date(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']),
  notes: z.string().optional(),
  organizationId: z.number(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive(),
  })),
});

export const insertQuoteLineItemSchema = z.object({
  quoteId: z.number(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  amount: z.number().positive(),
});

export const insertInvoiceLineItemSchema = z.object({
  invoiceId: z.number(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  amount: z.number().positive(),
});

export const insertPaymentSchema = z.object({
  invoiceId: z.number(),
  amount: z.number().positive(),
  paymentDate: z.date(),
  paymentMethod: z.string(),
  notes: z.string().optional(),
  organizationId: z.number(),
});

export const insertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.string().optional(),
  organizationId: z.number(),
});

export const insertMessageSchema = z.object({
  recipientPhone: z.string(),
  content: z.string().min(1),
  scheduledFor: z.date().optional(),
  organizationId: z.number(),
});

export const insertUserSessionSchema = z.object({
  userId: z.number(),
  token: z.string(),
  expiresAt: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const insertUserPermissionSchema = z.object({
  userId: z.number(),
  permission: z.string(),
  granted: z.boolean().default(true),
});

export const insertProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).default('planning'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budget: z.number().optional(),
  organizationId: z.number(),
});

export const insertProjectUserSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(['owner', 'manager', 'member', 'viewer']).default('member'),
});

export const insertTaskSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedToId: z.number().optional(),
  dueDate: z.date().optional(),
  estimatedHours: z.number().optional(),
});

export const insertTaskCommentSchema = z.object({
  taskId: z.number(),
  userId: z.number(),
  content: z.string().min(1),
});

export const insertProjectFileSchema = z.object({
  projectId: z.number(),
  fileName: z.string().min(1),
  fileSize: z.number(),
  mimeType: z.string(),
  uploadedById: z.number(),
});

export const insertTimeEntrySchema = z.object({
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  userId: z.number(),
  description: z.string().min(1),
  hours: z.number().positive(),
  date: z.date(),
  billableRate: z.number().optional(),
});

export const insertExpenseSchema = z.object({
  userId: z.number(),
  categoryId: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.date(),
  receiptUrl: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  organizationId: z.number(),
});

export const insertExpenseCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  organizationId: z.number(),
});

export const insertExpenseReportSchema = z.object({
  userId: z.number(),
  title: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
  organizationId: z.number(),
});

export const insertExpenseReportItemSchema = z.object({
  reportId: z.number(),
  expenseId: z.number(),
});

export const insertGasCardSchema = z.object({
  cardNumber: z.string().min(1),
  provider: z.string(),
  monthlyLimit: z.number().positive(),
  isActive: z.boolean().default(true),
  organizationId: z.number(),
});

export const insertImageSchema = z.object({
  originalName: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  projectId: z.number().optional(),
  uploadedBy: z.number(),
  organizationId: z.number(),
});

export const insertImageAnnotationSchema = z.object({
  imageId: z.number(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  text: z.string(),
  createdBy: z.number(),
});

export const insertSharedPhotoLinkSchema = z.object({
  imageIds: z.array(z.number()),
  accessToken: z.string(),
  expiresAt: z.date().optional(),
  allowDownload: z.boolean().default(false),
  createdBy: z.number(),
  organizationId: z.number(),
});

export const insertGasCardAssignmentSchema = z.object({
  cardId: z.number(),
  assignedToUserId: z.number(),
  assignedBy: z.number(),
  assignedDate: z.date(),
});

export const insertLeadSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  notes: z.string().optional(),
  assignedToId: z.number().optional(),
  estimatedValue: z.number().optional(),
  organizationId: z.number(),
});

export const insertCalendarJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customerId: z.number().optional(),
  assignedToId: z.number(),
  startTime: z.date(),
  endTime: z.date(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  organizationId: z.number(),
});

export const insertInternalMessageSchema = z.object({
  senderId: z.number(),
  subject: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  organizationId: z.number(),
});

export const insertInternalMessageRecipientSchema = z.object({
  messageId: z.number(),
  recipientId: z.number(),
  isRead: z.boolean().default(false),
});

export const insertMessageGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  createdBy: z.number(),
  organizationId: z.number(),
});

export const insertMessageGroupMemberSchema = z.object({
  groupId: z.number(),
  userId: z.number(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const insertReviewRequestSchema = z.object({
  customerId: z.number(),
  requestType: z.enum(['google', 'facebook', 'yelp']),
  templateId: z.number().optional(),
  sentBy: z.number(),
  organizationId: z.number(),
});

export const insertGoogleMyBusinessSettingsSchema = z.object({
  accountId: z.string(),
  locationId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  isActive: z.boolean().default(true),
  organizationId: z.number(),
});

export const insertDocusignEnvelopeSchema = z.object({
  envelopeId: z.string(),
  documentName: z.string(),
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  status: z.string(),
  sentBy: z.number(),
  organizationId: z.number(),
});

export const insertExpenseLineItemSchema = z.object({
  expenseId: z.number(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().positive(),
  amount: z.number().positive(),
  category: z.string().optional(),
});



export type InsertExpenseLineItem = z.infer<typeof insertExpenseLineItemSchema>;
export type ExpenseLineItem = typeof expenseLineItems.$inferSelect;

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

export type SharedPhotoLink = typeof sharedPhotoLinks.$inferSelect;
export type InsertSharedPhotoLink = z.infer<typeof insertSharedPhotoLinkSchema>;

export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type InsertReviewRequest = z.infer<typeof insertReviewRequestSchema>;

export type GoogleMyBusinessSettings = typeof googleMyBusinessSettings.$inferSelect;
export type InsertGoogleMyBusinessSettings = z.infer<typeof insertGoogleMyBusinessSettingsSchema>;

export type DocusignEnvelope = typeof docusignEnvelopes.$inferSelect;
export type InsertDocusignEnvelope = z.infer<typeof insertDocusignEnvelopeSchema>;

// SaaS Schema and Types
export const insertOrganizationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  subscriptionPlanId: z.number().optional(),
  subscriptionStatus: z.enum(['active', 'trial', 'suspended', 'cancelled']).default('trial'),
  trialEndsAt: z.date().optional(),
});

export const insertSubscriptionPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  maxUsers: z.number().optional(),
  maxProjects: z.number().optional(),
  isActive: z.boolean().default(true),
});

export const organizationSignupSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type OrganizationSignupData = z.infer<typeof organizationSignupSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// File Manager types
export type FileManager = typeof fileManager.$inferSelect;
export type InsertFileManager = typeof fileManager.$inferInsert;
export type FileFolder = typeof fileFolders.$inferSelect;
export type InsertFileFolder = typeof fileFolders.$inferInsert;
export type FileShare = typeof fileShares.$inferSelect;
export type InsertFileShare = typeof fileShares.$inferInsert;
export type FileVersion = typeof fileVersions.$inferSelect;
export type InsertFileVersion = typeof fileVersions.$inferInsert;

// Form Builder types
export type CustomForm = typeof customForms.$inferSelect;
export type InsertCustomForm = typeof customForms.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof formTemplates.$inferInsert;

// File Manager Zod schemas
export const insertFileManagerSchema = z.object({
  organizationId: z.number(),
  uploadedBy: z.number(),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  fileType: z.enum(['document', 'image', 'video', 'other']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.number().optional(),
  isPublic: z.boolean().default(false),
});

export const insertFileFolderSchema = z.object({
  organizationId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  parentFolderId: z.number().optional(),
  createdBy: z.number(),
  isSystemFolder: z.boolean().default(false),
});

// Form Builder Zod schemas
export const insertCustomFormSchema = z.object({
  organizationId: z.number(),
  createdBy: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  formData: z.any(), // JSON object for form configuration
  settings: z.any().optional(),
  isPublic: z.boolean().default(false),
});

export const insertFormSubmissionSchema = z.object({
  formId: z.number(),
  submittedBy: z.number().optional(),
  submissionData: z.any(), // JSON object for form data
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const insertFormTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  templateData: z.any(), // JSON object for template configuration
  isSystem: z.boolean().default(false),
  createdBy: z.number().optional(),
});

export const insertFileShareSchema = z.object({
  fileId: z.number(),
  sharedBy: z.number(),
  sharedWith: z.number().optional(),
  permissions: z.enum(['view', 'download', 'edit']).default('view'),
  expiresAt: z.date().optional(),
  maxAccess: z.number().optional(),
});