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
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  billingInterval: text("billing_interval").default("month"), // month, year
  stripePriceId: text("stripe_price_id"),
  
  // Plan limits
  maxUsers: integer("max_users").default(5),
  maxProjects: integer("max_projects").default(50),
  maxStorageGB: integer("max_storage_gb").default(10),
  maxCustomers: integer("max_customers").default(100),
  maxInvoices: integer("max_invoices").default(100),
  maxExpenses: integer("max_expenses").default(100),
  
  // Core features (legacy fields - moved to Advanced Features section)
  hasIntegrations: boolean("has_integrations").default(false),
  
  // Core Platform Features
  hasHumanResources: boolean("has_human_resources").default(false),
  hasGpsTracking: boolean("has_gps_tracking").default(true),
  hasWeather: boolean("has_weather").default(false),
  hasSms: boolean("has_sms").default(false),
  hasImageGallery: boolean("has_image_gallery").default(true),
  hasVehicleInspections: boolean("has_vehicle_inspections").default(false),
  hasFormBuilder: boolean("has_form_builder").default(false),
  hasExpenses: boolean("has_expenses").default(true),
  hasQuotes: boolean("has_quotes").default(true),
  hasLeads: boolean("has_leads").default(true),
  hasAnalytics: boolean("has_analytics").default(false),
  hasTimeClock: boolean("has_time_clock").default(true),
  
  // Advanced Features
  hasInvoicing: boolean("has_invoicing").default(true),
  hasAdvancedReporting: boolean("has_advanced_reporting").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasCustomBranding: boolean("has_custom_branding").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  hasWhiteLabel: boolean("has_white_label").default(false),
  hasAdvancedIntegrations: boolean("has_advanced_integrations").default(false),
  hasMultiLanguage: boolean("has_multi_language").default(false),
  hasAdvancedSecurity: boolean("has_advanced_security").default(false),
  
  // Legacy Features (maintained for compatibility)
  hasMobileApp: boolean("has_mobile_app").default(true),
  hasTimeTracking: boolean("has_time_tracking").default(true),
  hasExpenseTracking: boolean("has_expense_tracking").default(true),
  hasTeamMessaging: boolean("has_team_messaging").default(true),
  hasFileManagement: boolean("has_file_management").default(true),
  hasDigitalSignatures: boolean("has_digital_signatures").default(false),
  hasReviewManagement: boolean("has_review_management").default(false),
  hasSmsNotifications: boolean("has_sms_notifications").default(false),
  hasEmailNotifications: boolean("has_email_notifications").default(true),
  hasCalendarIntegration: boolean("has_calendar_integration").default(false),
  hasBackupAndExport: boolean("has_backup_and_export").default(false),
  hasWhitelabeling: boolean("has_whitelabeling").default(false),
  hasMultiLocation: boolean("has_multi_location").default(false),
  hasInventoryManagement: boolean("has_inventory_management").default(false),
  hasPaymentProcessing: boolean("has_payment_processing").default(false),
  
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plan Features - for dynamic feature management
export const planFeatures = pgTable("plan_features", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(), // "core", "field_service", "integrations", "support", "limits"
  featureType: text("feature_type").default("boolean"), // "boolean", "numeric", "text"
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plan Feature Values - dynamic values for each plan
export const planFeatureValues = pgTable("plan_feature_values", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  featureId: integer("feature_id").references(() => planFeatures.id).notNull(),
  booleanValue: boolean("boolean_value"),
  numericValue: integer("numeric_value"),
  textValue: text("text_value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Market Research Competitors
export const marketResearchCompetitors = pgTable("market_research_competitors", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  location: text("location"),
  services: text("services").array(), // Array of services offered
  pricing: text("pricing"), // Price range like "$200-$400"
  rating: decimal("rating", { precision: 3, scale: 1 }), // e.g., 4.5
  website: text("website"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  youtubeUrl: text("youtube_url"),
  googleBusinessUrl: text("google_business_url"),
  businessNiche: text("business_niche").notNull(), // e.g., "pressure washing"
  marketShare: text("market_share"), // e.g., "15%"
  estimatedRevenue: text("estimated_revenue"), // e.g., "$500K-$1M"
  strengths: text("strengths").array(), // Array of competitive strengths
  weaknesses: text("weaknesses").array(), // Array of competitive weaknesses
  notes: text("notes"), // Additional notes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MarketResearchCompetitor = typeof marketResearchCompetitors.$inferSelect;
export const insertMarketResearchCompetitorSchema = createInsertSchema(marketResearchCompetitors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketResearchCompetitor = z.infer<typeof insertMarketResearchCompetitorSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), // Phone number for contact purposes
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
  canAccessExpenseCategories: boolean("can_access_expense_categories").default(true),
  canAccessGasCardProviders: boolean("can_access_gas_card_providers").default(false),
  canAccessInspections: boolean("can_access_inspections").default(true),
  canAccessFormBuilder: boolean("can_access_form_builder").default(true),
  canAccessTimeClock: boolean("can_access_time_clock").default(true),
  canAccessMyTasks: boolean("can_access_my_tasks").default(true),
  canAccessFileManager: boolean("can_access_file_manager").default(true),
  canAccessGpsTracking: boolean("can_access_gps_tracking").default(true),
  canAccessJobs: boolean("can_access_jobs").default(true),
  canAccessTeamMessages: boolean("can_access_team_messages").default(true),
  canAccessWeather: boolean("can_access_weather").default(true),
  canAccessMobileTest: boolean("can_access_mobile_test").default(false),
  canAccessSaasAdmin: boolean("can_access_saas_admin").default(false),
  canAccessReports: boolean("can_access_reports").default(true),
  canAccessSettings: boolean("can_access_settings").default(true),
  canAccessUsers: boolean("can_access_users").default(false),
  canAccessAdminSettings: boolean("can_access_admin_settings").default(false),
  canAccessHR: boolean("can_access_hr").default(false),
  canAccessMarketResearch: boolean("can_access_market_research").default(true),
  // HR-specific permissions
  canViewHREmployees: boolean("can_view_hr_employees").default(false),
  canEditHREmployees: boolean("can_edit_hr_employees").default(false),
  canViewAllEmployees: boolean("can_view_all_employees").default(false),
  canEditAllEmployees: boolean("can_edit_all_employees").default(false),
  canViewOwnHRProfile: boolean("can_view_own_hr_profile").default(true),
  canEditOwnHRProfile: boolean("can_edit_own_hr_profile").default(false),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  companyName: text("company_name"),
  profilePicture: text("profile_picture"), // Path to uploaded profile picture
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
  customerId: integer("customer_id").references(() => customers.id), // Made nullable for uploaded invoices
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
  attachmentUrl: text("attachment_url"), // For uploaded previous invoices
  originalFileName: text("original_file_name"), // Original name of uploaded file
  isUploadedInvoice: boolean("is_uploaded_invoice").default(false), // Flag for uploaded vs created invoices
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
  address: text("address"), // Human-readable address from reverse geocoding
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
  // Image timestamp overlay settings
  enableImageTimestamp: boolean("enable_image_timestamp").default(false),
  timestampFormat: text("timestamp_format").default("MM/dd/yyyy hh:mm a"), // Date format for overlay
  includeGpsCoords: boolean("include_gps_coords").default(false),
  timestampPosition: text("timestamp_position").default("bottom-right"), // bottom-right, bottom-left, top-right, top-left
  // Job sharing settings
  shareWithTeam: boolean("share_with_team").default(true), // true = entire team, false = assigned only (admin and creator always see)
  // Dispatch routing fields
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: text("scheduled_time"), // e.g., "09:00", "14:30"
  estimatedDuration: integer("estimated_duration"), // in minutes
  currentLocation: text("current_location"), // Current GPS or text location
  dispatchNotes: text("dispatch_notes"), // Notes for dispatch routing
  vehicleId: text("vehicle_id"), // Vehicle assignment for dispatch routing
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
  
  // Task type and completion tracking
  type: text("type").notNull().default("checkbox"), // checkbox, text, number, image
  isRequired: boolean("is_required").default(false),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  completedById: integer("completed_by_id").references(() => users.id),
  
  // Value storage for different task types
  textValue: text("text_value"),
  numberValue: decimal("number_value", { precision: 15, scale: 4 }),
  imagePath: text("image_path"),
  
  // Legacy fields (maintaining compatibility)
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

// Task Groups - Bundled tasks that can be reused across projects
export const taskGroups = pgTable("task_groups", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // For visual identification
  isActive: boolean("is_active").default(true),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Templates - Individual tasks within a group
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  taskGroupId: integer("task_group_id").notNull().references(() => taskGroups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("checkbox"), // checkbox, text, number, image
  isRequired: boolean("is_required").default(false),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  order: integer("order").default(0), // For ordering tasks within a group
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const projectWaivers = pgTable("project_waivers", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileId: integer("file_id").notNull().references(() => fileManager.id, { onDelete: "cascade" }),
  attachedBy: integer("attached_by").notNull().references(() => users.id),
  attachedAt: timestamp("attached_at").defaultNow().notNull(),
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

export const userDashboardSettings = pgTable("user_dashboard_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Dashboard Profile System
  profileType: text("profile_type").default("user"), // user, manager, admin, hr
  
  settings: jsonb("settings").notNull(), // JSON blob of dashboard settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dashboard Profile Templates
export const dashboardProfiles = pgTable("dashboard_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "User Dashboard", "Manager Dashboard", etc.
  profileType: text("profile_type").notNull(), // user, manager, admin, hr
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isSystem: boolean("is_system").default(true), // System-defined profiles
  
  // Default widget visibility for this profile
  showStatsCards: boolean("show_stats_cards").default(true),
  showRevenueChart: boolean("show_revenue_chart").default(true),
  showRecentActivity: boolean("show_recent_activity").default(true),
  showRecentInvoices: boolean("show_recent_invoices").default(true),
  showNotifications: boolean("show_notifications").default(true),
  showQuickActions: boolean("show_quick_actions").default(true),
  showProjectsOverview: boolean("show_projects_overview").default(false),
  showWeatherWidget: boolean("show_weather_widget").default(false),
  showTasksWidget: boolean("show_tasks_widget").default(false),
  showCalendarWidget: boolean("show_calendar_widget").default(false),
  showMessagesWidget: boolean("show_messages_widget").default(false),
  showTeamOverview: boolean("show_team_overview").default(false),
  
  // Default layout settings
  layoutType: text("layout_type").default("grid"),
  gridColumns: integer("grid_columns").default(3),
  widgetSize: text("widget_size").default("medium"),
  colorTheme: text("color_theme").default("default"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  deletedBy: integer("deleted_by").references(() => users.id), // Who deleted it
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

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  taxId: text("tax_id"),
  website: text("website"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gasCardProviders = pgTable("gas_card_providers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  contactInfo: text("contact_info"),
  accountNumber: text("account_number"),
  providerType: text("provider_type").default("fuel"), // fuel, fleet, corporate
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  apiKey: text("api_key"), // For integration if available
  fuelTypes: text("fuel_types").array().default(['gasoline', 'diesel']), // Types of fuel accepted
  networkType: text("network_type"), // universal, branded, restricted
  acceptedLocations: text("accepted_locations").array(), // Station brands or networks
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }),
  perTransactionLimit: decimal("per_transaction_limit", { precision: 10, scale: 2 }),
  restrictionRules: jsonb("restriction_rules"), // JSON object for complex rules
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
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
  expectedReturnDate: timestamp("expected_return_date"),
  returnedDate: timestamp("returned_date"),
  purpose: text("purpose"), // job site, project, etc.
  notes: text("notes"),
  status: text("status").notNull().default("assigned"), // assigned, returned, overdue
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Gas card usage tracking table
export const gasCardUsage = pgTable("gas_card_usage", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().references(() => gasCards.id),
  assignmentId: integer("assignment_id").references(() => gasCardAssignments.id),
  userId: integer("user_id").notNull().references(() => users.id), // Who used the card
  purchaseDate: timestamp("purchase_date").notNull(),
  location: text("location"), // Gas station name/address
  fuelType: text("fuel_type").notNull().default("regular"), // regular, premium, diesel
  gallons: decimal("gallons", { precision: 8, scale: 3 }), // Amount of fuel purchased
  pricePerGallon: decimal("price_per_gallon", { precision: 6, scale: 3 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  mileage: integer("mileage"), // Vehicle mileage at purchase
  vehicleInfo: text("vehicle_info"), // Vehicle make/model/license
  projectId: integer("project_id").references(() => projects.id), // Associated project
  purpose: text("purpose"), // Work-related purpose
  receiptUrl: text("receipt_url"), // Receipt image
  notes: text("notes"),
  isApproved: boolean("is_approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").notNull().references(() => users.id), // Who recorded this entry
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
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
  // Image timestamp settings
  enableImageTimestamp: boolean("enable_image_timestamp").default(false),
  timestampFormat: text("timestamp_format").default("MM/dd/yyyy hh:mm a"),
  includeGpsCoords: boolean("include_gps_coords").default(false),
  timestampPosition: text("timestamp_position").default("bottom-right"),
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
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
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
// File Security Settings
export const fileSecuritySettings = pgTable("file_security_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Malware and Virus Scanning
  enableMalwareScan: boolean("enable_malware_scan").default(true),
  enableVirusScan: boolean("enable_virus_scan").default(true),
  quarantineOnThreatDetection: boolean("quarantine_on_threat_detection").default(true),
  
  // File Type Restrictions
  allowedMimeTypes: jsonb("allowed_mime_types").default('["image/jpeg","image/png","image/gif","image/webp","application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]'),
  blockedMimeTypes: jsonb("blocked_mime_types").default('["application/x-executable","application/x-msdownload","application/x-msdos-program","application/vnd.microsoft.portable-executable"]'),
  allowedExtensions: jsonb("allowed_extensions").default('[".jpg",".jpeg",".png",".gif",".webp",".pdf",".txt",".doc",".docx",".xls",".xlsx",".zip",".csv"]'),
  blockedExtensions: jsonb("blocked_extensions").default('[".exe",".bat",".cmd",".scr",".pif",".com",".dll",".sys",".vbs",".js",".jar"]'),
  
  // File Size Limits (in bytes)
  maxFileSize: integer("max_file_size").default(50000000), // 50MB default
  maxTotalUploadSize: integer("max_total_upload_size").default(100000000), // 100MB per request
  
  // Upload Limits
  maxFilesPerUpload: integer("max_files_per_upload").default(10),
  maxDailyUploads: integer("max_daily_uploads").default(100),
  
  // Security Scanning Providers
  primaryScanProvider: text("primary_scan_provider").default("clamav"), // clamav, virustotal, defender
  enableMultipleProviders: boolean("enable_multiple_providers").default(false),
  scanTimeout: integer("scan_timeout").default(30), // seconds
  
  // Access Controls
  requireAuthentication: boolean("require_authentication").default(true),
  enableAccessLogging: boolean("enable_access_logging").default(true),
  enableDownloadTracking: boolean("enable_download_tracking").default(true),
  allowPublicSharing: boolean("allow_public_sharing").default(false),
  maxShareDuration: integer("max_share_duration").default(168), // hours (1 week)
  
  // Content Validation
  enableContentTypeValidation: boolean("enable_content_type_validation").default(true),
  enableFileHeaderValidation: boolean("enable_file_header_validation").default(true),
  blockSuspiciousFileNames: boolean("block_suspicious_file_names").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// File Security Scan Log
export const fileSecurityScans = pgTable("file_security_scans", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id"), // Can be null for orphaned scans
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Scan Results
  scanStatus: text("scan_status").notNull().default("pending"), // pending, scanning, clean, infected, error, timeout
  scanProvider: text("scan_provider").notNull(),
  scanStarted: timestamp("scan_started").defaultNow().notNull(),
  scanCompleted: timestamp("scan_completed"),
  scanDuration: integer("scan_duration"), // milliseconds
  
  // Threat Detection
  threatsDetected: jsonb("threats_detected").default('[]'), // Array of threat objects
  threatCount: integer("threat_count").default(0),
  threatSeverity: text("threat_severity"), // low, medium, high, critical
  
  // Actions Taken
  actionTaken: text("action_taken").default("none"), // none, quarantined, deleted, allowed
  quarantinePath: text("quarantine_path"),
  
  // Scan Details
  scanHash: text("scan_hash"), // File hash for verification
  scanResults: jsonb("scan_results"), // Raw scan results from provider
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// File Access Log
export const fileAccessLogs = pgTable("file_access_logs", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id"), // Can reference various file tables
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  userId: integer("user_id").references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Access Details
  accessType: text("access_type").notNull(), // view, download, share, upload, delete
  accessMethod: text("access_method").default("web"), // web, api, mobile
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Share Information (if accessed via share)
  shareToken: text("share_token"),
  shareExpiresAt: timestamp("share_expires_at"),
  
  // Geolocation
  latitude: text("latitude"),
  longitude: text("longitude"),
  location: text("location"), // Human readable location
  
  // Security Flags
  suspiciousActivity: boolean("suspicious_activity").default(false),
  accessDenied: boolean("access_denied").default(false),
  denialReason: text("denial_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  // Digital signature fields
  signatureStatus: text("signature_status").default("none"), // none, pending, signed, declined
  signatureData: text("signature_data"), // Base64 encoded signature image
  signedBy: text("signed_by"),
  signedByUserId: integer("signed_by_user_id").references(() => users.id),
  signedAt: timestamp("signed_at"),
  signedDocumentUrl: text("signed_document_url"),
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

// SMS Messages
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0"),
  twilioSid: text("twilio_sid"), // Twilio message SID for tracking
  errorMessage: text("error_message"),
  sentBy: integer("sent_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMS Templates  
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // appointment, reminder, follow-up, etc.
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Navigation Order - Store custom sidebar order for users
export const navigationOrder = pgTable("navigation_order", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  navigationItems: jsonb("navigation_items").notNull(), // Array of navigation item names in custom order
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Backup Settings and Jobs
export const backupSettings = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Backup Configuration
  isEnabled: boolean("is_enabled").default(true),
  backupFrequency: text("backup_frequency").default("weekly"), // daily, weekly, monthly
  backupTime: text("backup_time").default("02:00"), // HH:mm format
  retentionDays: integer("retention_days").default(30), // How long to keep backups
  
  // What to include in backup
  includeCustomers: boolean("include_customers").default(true),
  includeProjects: boolean("include_projects").default(true),
  includeInvoices: boolean("include_invoices").default(true),
  includeExpenses: boolean("include_expenses").default(true),
  includeFiles: boolean("include_files").default(false), // Files can be large
  includeImages: boolean("include_images").default(false),
  includeUsers: boolean("include_users").default(true),
  includeSettings: boolean("include_settings").default(true),
  includeMessages: boolean("include_messages").default(false),
  
  // Storage settings
  storageLocation: text("storage_location").default("local"), // local, aws_s3, google_drive
  awsS3Bucket: text("aws_s3_bucket"),
  awsAccessKey: text("aws_access_key"),
  awsSecretKey: text("aws_secret_key"),
  awsRegion: text("aws_region").default("us-east-1"),
  
  // Email notifications
  emailOnSuccess: boolean("email_on_success").default(false),
  emailOnFailure: boolean("email_on_failure").default(true),
  notificationEmails: text("notification_emails").array(),
  
  lastBackupAt: timestamp("last_backup_at"),
  nextBackupAt: timestamp("next_backup_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const backupJobs = pgTable("backup_jobs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Job details
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  type: text("type").notNull().default("automatic"), // automatic, manual
  
  // Backup metadata
  fileName: text("file_name"), // Generated backup file name
  filePath: text("file_path"), // Where backup is stored
  fileSize: integer("file_size"), // Size in bytes
  recordCount: integer("record_count"), // Total records backed up
  
  // What was included
  includedTables: text("included_tables").array(),
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  createdBy: integer("created_by").references(() => users.id), // null for automatic
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sound settings table
export const soundSettings = pgTable("sound_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  teamMessageSound: text("team_message_sound").default("chime"),
  textMessageSound: text("text_message_sound").default("bell"),
  volume: decimal("volume", { precision: 3, scale: 2 }).default("0.70"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Navigation Order insert schema
export const insertNavigationOrderSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  navigationItems: z.array(z.string()),
});

export const insertBackupSettingsSchema = z.object({
  organizationId: z.number(),
  isEnabled: z.boolean().default(true),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  backupTime: z.string().default("02:00"),
  retentionDays: z.number().min(1).max(365).default(30),
  includeCustomers: z.boolean().default(true),
  includeProjects: z.boolean().default(true),
  includeInvoices: z.boolean().default(true),
  includeExpenses: z.boolean().default(true),
  includeFiles: z.boolean().default(false),
  includeImages: z.boolean().default(false),
  includeUsers: z.boolean().default(true),
  includeSettings: z.boolean().default(true),
  includeMessages: z.boolean().default(false),
  storageLocation: z.enum(["local", "aws_s3", "google_drive"]).default("local"),
  awsS3Bucket: z.string().optional(),
  awsAccessKey: z.string().optional(),
  awsSecretKey: z.string().optional(),
  awsRegion: z.string().default("us-east-1"),
  emailOnSuccess: z.boolean().default(false),
  emailOnFailure: z.boolean().default(true),
  notificationEmails: z.array(z.string().email()).default([]),
});

export const insertSoundSettingsSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  teamMessageSound: z.string().default("chime"),
  textMessageSound: z.string().default("bell"),
  volume: z.number().min(0).max(1).default(0.7),
  enabled: z.boolean().default(true),
});

// Types
export type NavigationOrder = typeof navigationOrder.$inferSelect;
export type InsertNavigationOrder = z.infer<typeof insertNavigationOrderSchema>;
export type BackupSettings = typeof backupSettings.$inferSelect;
export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;
export type BackupJob = typeof backupJobs.$inferSelect;
export type SoundSettings = typeof soundSettings.$inferSelect;
export type InsertSoundSettings = z.infer<typeof insertSoundSettingsSchema>;

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

export const insertInvoiceSchema = createInsertSchema(invoices, {
  paymentMethod: z.enum(['check', 'ach', 'square', 'stripe']).optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive(),
  })).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertTaskGroupSchema = z.object({
  organizationId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
  createdById: z.number(),
});

export const insertTaskTemplateSchema = z.object({
  taskGroupId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['checkbox', 'text', 'number', 'image']).default('checkbox'),
  isRequired: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimatedHours: z.number().optional(),
  order: z.number().default(0),
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
  cardName: z.string().min(1),
  provider: z.string().min(1),
  status: z.string().default("active"),
  notes: z.string().optional(),
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
  shareToken: z.string(),
  projectId: z.number(),
  imageIds: z.union([z.array(z.number()), z.string()]), // Can be array or JSON string
  createdBy: z.number(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  expiresAt: z.date(),
  maxAccess: z.number().optional(),
  message: z.string().optional(),
  isActive: z.boolean().default(true),
  accessCount: z.number().default(0),
});

export const insertGasCardAssignmentSchema = z.object({
  cardId: z.number(),
  assignedToUserId: z.number(),
  assignedBy: z.number(),
  assignedDate: z.date(),
  expectedReturnDate: z.date().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

export const insertGasCardUsageSchema = z.object({
  cardId: z.number(),
  assignmentId: z.number().optional(),
  userId: z.number(),
  purchaseDate: z.date(),
  location: z.string().optional(),
  fuelType: z.enum(["regular", "premium", "diesel"]).default("regular"),
  gallons: z.number().positive().optional(),
  pricePerGallon: z.number().positive().optional(),
  totalAmount: z.number().positive(),
  mileage: z.number().int().positive().optional(),
  vehicleInfo: z.string().optional(),
  projectId: z.number().optional(),
  purpose: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.number(),
});

// Type exports for gas cards
export type GasCard = typeof gasCards.$inferSelect;
export type InsertGasCard = z.infer<typeof insertGasCardSchema>;
export type GasCardAssignment = typeof gasCardAssignments.$inferSelect;
export type GasCardUsage = typeof gasCardUsage.$inferSelect;
export type InsertGasCardUsage = z.infer<typeof insertGasCardUsageSchema>;
export type InsertGasCardAssignment = z.infer<typeof insertGasCardAssignmentSchema>;

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
  leadId: z.number().optional(),
  startDate: z.date(),
  endDate: z.date(),
  location: z.string().optional(),
  estimatedValue: z.number().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'converted', 'cancelled']).default('scheduled'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.string().optional(),
  userId: z.number(),
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

export const insertVendorSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("US"),
  taxId: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  organizationId: z.number(),
});

export type InsertExpenseLineItem = z.infer<typeof insertExpenseLineItemSchema>;
export type ExpenseLineItem = typeof expenseLineItems.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export const insertGasCardProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  accountNumber: z.string().optional(),
  providerType: z.enum(["fuel", "fleet", "corporate"]).default("fuel"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  fuelTypes: z.array(z.string()).default(["gasoline", "diesel"]),
  networkType: z.enum(["universal", "branded", "restricted"]).optional(),
  acceptedLocations: z.array(z.string()).optional(),
  monthlyLimit: z.number().positive().optional(),
  perTransactionLimit: z.number().positive().optional(),
  restrictionRules: z.any().optional(),
  notes: z.string().optional(),
  organizationId: z.number(),
});

export type GasCardProvider = typeof gasCardProviders.$inferSelect;
export type InsertGasCardProvider = z.infer<typeof insertGasCardProviderSchema>;

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

export type TaskGroup = typeof taskGroups.$inferSelect;
export type InsertTaskGroup = z.infer<typeof insertTaskGroupSchema>;

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type ProjectWaiver = typeof projectWaivers.$inferSelect;
export type InsertProjectWaiver = typeof projectWaivers.$inferInsert;

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
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default("USD"),
  billingInterval: z.enum(['month', 'year']).default('month'),
  stripePriceId: z.string().optional(),
  
  // Plan limits
  maxUsers: z.number().default(5),
  maxProjects: z.number().default(50),
  maxStorageGB: z.number().default(10),
  maxCustomers: z.number().default(100),
  maxInvoices: z.number().default(100),
  maxExpenses: z.number().default(100),
  
  // Legacy core features
  hasIntegrations: z.boolean().default(false),
  
  // Core Platform Features
  hasHumanResources: z.boolean().default(false),
  hasGpsTracking: z.boolean().default(true),
  hasWeather: z.boolean().default(false),
  hasSms: z.boolean().default(false),
  hasImageGallery: z.boolean().default(true),
  hasVehicleInspections: z.boolean().default(false),
  hasFormBuilder: z.boolean().default(false),
  hasExpenses: z.boolean().default(true),
  hasQuotes: z.boolean().default(true),
  hasLeads: z.boolean().default(true),
  hasAnalytics: z.boolean().default(false),
  hasTimeClock: z.boolean().default(true),
  
  // Advanced Features
  hasInvoicing: z.boolean().default(true),
  hasAdvancedReporting: z.boolean().default(false),
  hasApiAccess: z.boolean().default(false),
  hasCustomBranding: z.boolean().default(false),
  hasPrioritySupport: z.boolean().default(false),
  hasWhiteLabel: z.boolean().default(false),
  hasAdvancedIntegrations: z.boolean().default(false),
  hasMultiLanguage: z.boolean().default(false),
  hasAdvancedSecurity: z.boolean().default(false),
  
  // Legacy Features (maintained for compatibility)
  hasMobileApp: z.boolean().default(true),
  hasTimeTracking: z.boolean().default(true),
  hasExpenseTracking: z.boolean().default(true),
  hasTeamMessaging: z.boolean().default(true),
  hasFileManagement: z.boolean().default(true),
  hasDigitalSignatures: z.boolean().default(false),
  hasReviewManagement: z.boolean().default(false),
  hasSmsNotifications: z.boolean().default(false),
  hasEmailNotifications: z.boolean().default(true),
  hasCalendarIntegration: z.boolean().default(false),
  hasBackupAndExport: z.boolean().default(false),
  hasWhitelabeling: z.boolean().default(false),
  hasMultiLocation: z.boolean().default(false),
  hasInventoryManagement: z.boolean().default(false),
  hasPaymentProcessing: z.boolean().default(false),
  
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const insertPlanFeatureSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  featureType: z.enum(['boolean', 'numeric', 'text']).default('boolean'),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const insertPlanFeatureValueSchema = z.object({
  planId: z.number(),
  featureId: z.number(),
  booleanValue: z.boolean().optional(),
  numericValue: z.number().optional(),
  textValue: z.string().optional(),
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
export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = z.infer<typeof insertPlanFeatureSchema>;
export type PlanFeatureValue = typeof planFeatureValues.$inferSelect;
export type InsertPlanFeatureValue = z.infer<typeof insertPlanFeatureValueSchema>;
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

// Departments
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  managerId: integer("manager_id").references(() => employees.id),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Management
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  departmentId: integer("department_id").references(() => departments.id),
  employeeId: text("employee_id"), // Custom employee ID
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  position: text("position").notNull(),
  department: text("department").notNull(), // Keep for backward compatibility
  hireDate: timestamp("hire_date").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"), // active, inactive, on_leave, terminated
  managerId: integer("manager_id").references(() => employees.id),
  location: text("location"),
  emergencyContact: jsonb("emergency_contact"), // {name, phone, relationship}
  profileImage: text("profile_image"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Documents
export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  
  // File Information
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // document, image, video, other
  
  // Document Classification
  documentType: text("document_type").notNull(), // resume, contract, id_copy, tax_form, certification, training, performance, medical, other
  category: text("category").notNull().default("general"), // personal, legal, training, hr, medical, financial
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  
  // Security & Access
  confidentialityLevel: text("confidentiality_level").notNull().default("internal"), // public, internal, confidential, restricted
  accessLevel: text("access_level").notNull().default("hr_only"), // employee_only, hr_only, manager_access, full_access
  
  // Document Lifecycle
  status: text("status").notNull().default("active"), // active, archived, expired, under_review
  expirationDate: timestamp("expiration_date"),
  reminderDate: timestamp("reminder_date"), // When to remind about expiration
  version: integer("version").notNull().default(1),
  supersededBy: integer("superseded_by").references((): any => employeeDocuments.id), // Reference to newer version
  
  // Metadata
  notes: text("notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  downloadCount: integer("download_count").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Time Off Requests
export const timeOffRequests = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  type: text("type").notNull(), // vacation, sick, personal, other
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: decimal("days", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reason: text("reason"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  requestedAt: timestamp("requested_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance Reviews
export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  reviewPeriod: text("review_period").notNull(),
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }),
  goals: jsonb("goals"), // Array of goals
  feedback: text("feedback"),
  reviewDate: timestamp("review_date"),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  status: text("status").notNull().default("draft"), // draft, completed, pending_employee_review
  employeeComments: text("employee_comments"),
  employeeSignedAt: timestamp("employee_signed_at"),
  managerSignedAt: timestamp("manager_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Disciplinary Actions
export const disciplinaryActions = pgTable("disciplinary_actions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  type: text("type").notNull(), // verbal_warning, written_warning, suspension, termination, counseling
  severity: text("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  incident: text("incident").notNull(),
  actionTaken: text("action_taken").notNull(),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  issuedBy: integer("issued_by").notNull().references(() => users.id),
  witnessedBy: integer("witnessed_by").references(() => users.id),
  employeeAcknowledged: boolean("employee_acknowledged").default(false),
  employeeAcknowledgedAt: timestamp("employee_acknowledged_at"),
  employeeComments: text("employee_comments"),
  attachments: jsonb("attachments"), // Array of file paths
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Digital Signatures
export const digitalSignatures = pgTable("digital_signatures", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  signatureData: text("signature_data").notNull(), // Base64 encoded signature image
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email"),
  signerRole: text("signer_role"), // customer, contractor, inspector, etc.
  signatureType: text("signature_type").notNull().default("digital"), // digital, docusign, manual
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedBy: integer("signed_by").references(() => users.id), // Internal user who captured signature
  notes: text("notes"),
  status: text("status").notNull().default("completed"), // pending, completed, voided
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Document Signature Fields
export const documentSignatureFields = pgTable("document_signature_fields", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => fileManager.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  
  // Field positioning (as percentages of document dimensions)
  x: decimal("x", { precision: 5, scale: 2 }).notNull(), // X position as percentage (0-100)
  y: decimal("y", { precision: 5, scale: 2 }).notNull(), // Y position as percentage (0-100)
  width: decimal("width", { precision: 5, scale: 2 }).notNull(), // Width as percentage
  height: decimal("height", { precision: 5, scale: 2 }).notNull(), // Height as percentage
  page: integer("page").notNull().default(1), // Page number for multi-page documents
  
  // Field properties
  fieldType: text("field_type").notNull().default("signature"), // signature, initial, date, text
  fieldLabel: text("field_label").notNull(),
  required: boolean("required").notNull().default(true),
  signerRole: text("signer_role").notNull(), // who should sign this field
  
  // Signature data (when signed)
  signatureData: text("signature_data"), // Base64 encoded signature image
  signedBy: text("signed_by"),
  signedByUserId: integer("signed_by_user_id").references(() => users.id),
  signedAt: timestamp("signed_at"),
  
  status: text("status").notNull().default("pending"), // pending, signed, declined
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Vehicle Inspection Tables
export const inspectionTemplates = pgTable("inspection_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'pre-trip', 'post-trip'
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspectionItems = pgTable("inspection_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => inspectionTemplates.id),
  category: text("category").notNull(), // 'safety', 'vehicle', 'equipment'
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inspectionRecords = pgTable("inspection_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  templateId: integer("template_id").notNull().references(() => inspectionTemplates.id),
  type: text("type").notNull(), // 'pre-trip', 'post-trip'
  vehicleInfo: jsonb("vehicle_info"), // Vehicle details like license plate, mileage, etc.
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'requires_attention'
  submittedAt: timestamp("submitted_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  location: jsonb("location"), // GPS coordinates
  photos: text("photos").array(), // Array of photo file paths
  signature: text("signature"), // Base64 encoded signature
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspectionResponses = pgTable("inspection_responses", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull().references(() => inspectionRecords.id),
  itemId: integer("item_id").notNull().references(() => inspectionItems.id),
  response: text("response").notNull(), // 'pass', 'fail', 'na', 'needs_attention'
  notes: text("notes"),
  photos: text("photos").array(), // Array of photo file paths for this specific item
  createdAt: timestamp("created_at").defaultNow(),
});

export const inspectionNotifications = pgTable("inspection_notifications", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull().references(() => inspectionRecords.id),
  sentTo: integer("sent_to").notNull().references(() => users.id),
  notificationType: text("notification_type").notNull(), // 'submission', 'failure', 'review_required'
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Inspection Schema Validation
export const insertInspectionTemplateSchema = createInsertSchema(inspectionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionRecordSchema = createInsertSchema(inspectionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInspectionResponseSchema = createInsertSchema(inspectionResponses).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionNotificationSchema = createInsertSchema(inspectionNotifications).omit({
  id: true,
  sentAt: true,
});

// Types
export type InspectionTemplate = typeof inspectionTemplates.$inferSelect;
export type InsertInspectionTemplate = z.infer<typeof insertInspectionTemplateSchema>;

export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;

export type InspectionRecord = typeof inspectionRecords.$inferSelect;
export type InsertInspectionRecord = z.infer<typeof insertInspectionRecordSchema>;

export type InspectionResponse = typeof inspectionResponses.$inferSelect;
export type InsertInspectionResponse = z.infer<typeof insertInspectionResponseSchema>;

export type InspectionNotification = typeof inspectionNotifications.$inferSelect;
export type InsertInspectionNotification = z.infer<typeof insertInspectionNotificationSchema>;

// Digital Signature Schema Validation
export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({
  id: true,
  signedAt: true,
  createdAt: true,
});

// Digital Signature Types
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;

// Department Schema Validation
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Employee Management Schema Validation
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  requestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceReviewSchema = createInsertSchema(performanceReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisciplinaryActionSchema = createInsertSchema(disciplinaryActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Department Types
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// Employee Management Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;

export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;

export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = z.infer<typeof insertPerformanceReviewSchema>;

export type DisciplinaryAction = typeof disciplinaryActions.$inferSelect;
export type InsertDisciplinaryAction = z.infer<typeof insertDisciplinaryActionSchema>;

// Parts and Supplies Inventory Management
export const partsSupplies = pgTable("parts_supplies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // Chemical, Tool, Part, Supply, etc.
  sku: text("sku"), // Stock Keeping Unit
  barcode: text("barcode"),
  
  // Inventory tracking
  currentStock: integer("current_stock").default(0).notNull(),
  minStockLevel: integer("min_stock_level").default(0).notNull(), // Triggers low stock alert
  maxStockLevel: integer("max_stock_level"),
  reorderPoint: integer("reorder_point"), // When to reorder
  reorderQuantity: integer("reorder_quantity"), // How much to reorder
  
  // Pricing
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  
  // Physical properties
  weight: decimal("weight", { precision: 10, scale: 3 }), // in pounds or kg
  dimensions: text("dimensions"), // LxWxH format
  unit: text("unit").default("each"), // each, gallon, lbs, box, case, etc.
  
  // Supplier information
  supplier: text("supplier"),
  supplierSku: text("supplier_sku"),
  supplierContact: text("supplier_contact"),
  
  // Location tracking
  location: text("location"), // Warehouse section, vehicle, etc.
  binLocation: text("bin_location"),
  
  // Status and flags
  isActive: boolean("is_active").default(true),
  isLowStock: boolean("is_low_stock").default(false),
  isOutOfStock: boolean("is_out_of_stock").default(false),
  requiresSpecialHandling: boolean("requires_special_handling").default(false),
  isHazardous: boolean("is_hazardous").default(false),
  
  // Tracking
  lastInventoryDate: timestamp("last_inventory_date"),
  lastOrderDate: timestamp("last_order_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Inventory Transactions (Stock In/Out)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  partId: integer("part_id").references(() => partsSupplies.id).notNull(),
  
  transactionType: text("transaction_type").notNull(), // IN, OUT, ADJUSTMENT, TRANSFER
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  
  // Transaction details
  reason: text("reason"), // Purchase, Sale, Usage, Damaged, Lost, etc.
  reference: text("reference"), // Invoice #, Job #, etc.
  notes: text("notes"),
  
  // Cost tracking
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  
  // Location
  fromLocation: text("from_location"),
  toLocation: text("to_location"),
  
  // Tracking
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
});

// Low Stock Alerts
export const stockAlerts = pgTable("stock_alerts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  partId: integer("part_id").references(() => partsSupplies.id).notNull(),
  
  alertType: text("alert_type").notNull(), // LOW_STOCK, OUT_OF_STOCK, REORDER_POINT
  currentStock: integer("current_stock").notNull(),
  minStockLevel: integer("min_stock_level").notNull(),
  
  // Alert status
  isActive: boolean("is_active").default(true),
  isRead: boolean("is_read").default(false),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  
  // Auto-generated or manual
  isAutoGenerated: boolean("is_auto_generated").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parts Categories for better organization
export const partsCategories = pgTable("parts_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Hex color for UI
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for Parts and Supplies
export const insertPartsSuppliesSchema = createInsertSchema(partsSupplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isLowStock: true,
  isOutOfStock: true,
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertStockAlertSchema = createInsertSchema(stockAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartsCategorySchema = createInsertSchema(partsCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type PartsSupplies = typeof partsSupplies.$inferSelect;
export type InsertPartsSupplies = z.infer<typeof insertPartsSuppliesSchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type StockAlert = typeof stockAlerts.$inferSelect;
export type InsertStockAlert = z.infer<typeof insertStockAlertSchema>;
export type PartsCategory = typeof partsCategories.$inferSelect;
export type InsertPartsCategory = z.infer<typeof insertPartsCategorySchema>;

// File and Folder Permissions System
export const filePermissions = pgTable("file_permissions", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => fileManager.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  userRole: text("user_role"), // admin, manager, user - alternative to specific user
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Permission levels
  canView: boolean("can_view").default(false),
  canDownload: boolean("can_download").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  canShare: boolean("can_share").default(false),
  canMove: boolean("can_move").default(false),
  
  // Metadata
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const folderPermissions = pgTable("folder_permissions", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").notNull().references(() => fileFolders.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  userRole: text("user_role"), // admin, manager, user - alternative to specific user
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Permission levels
  canView: boolean("can_view").default(false),
  canUpload: boolean("can_upload").default(false),
  canCreateSubfolder: boolean("can_create_subfolder").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  canMove: boolean("can_move").default(false),
  
  // Inheritance settings
  inheritPermissions: boolean("inherit_permissions").default(true),
  applyToSubfolders: boolean("apply_to_subfolders").default(false),
  
  // Metadata
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Default permissions for files and folders by role
export const defaultPermissions = pgTable("default_permissions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userRole: text("user_role").notNull(), // admin, manager, user
  resourceType: text("resource_type").notNull(), // file, folder
  
  // Default permission levels
  canView: boolean("can_view").default(true),
  canDownload: boolean("can_download").default(true),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  canShare: boolean("can_share").default(false),
  canMove: boolean("can_move").default(false),
  canUpload: boolean("can_upload").default(false), // Folder only
  canCreateSubfolder: boolean("can_create_subfolder").default(false), // Folder only
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for permissions
export const insertFilePermissionSchema = createInsertSchema(filePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFolderPermissionSchema = createInsertSchema(folderPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDefaultPermissionSchema = createInsertSchema(defaultPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type FilePermission = typeof filePermissions.$inferSelect;
export type InsertFilePermission = z.infer<typeof insertFilePermissionSchema>;
export type FolderPermission = typeof folderPermissions.$inferSelect;
export type InsertFolderPermission = z.infer<typeof insertFolderPermissionSchema>;
export type DefaultPermission = typeof defaultPermissions.$inferSelect;
export type InsertDefaultPermission = z.infer<typeof insertDefaultPermissionSchema>;

// Vehicle Management System for Inspections
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Vehicle identification
  vehicleNumber: text("vehicle_number").notNull(), // Custom number/name (e.g., "Truck 1", "Unit A", "Fleet 001")
  licensePlate: text("license_plate").notNull(), // License plate number
  
  // Vehicle details
  year: integer("year"),
  make: text("make"), // Ford, Chevrolet, etc.
  model: text("model"), // F-150, Silverado, etc.
  color: text("color"),
  vin: text("vin"), // Vehicle Identification Number
  
  // Vehicle type and capacity
  vehicleType: text("vehicle_type").notNull().default("truck"), // truck, van, trailer, equipment
  capacity: text("capacity"), // Payload capacity, tank size, etc.
  
  // Status and tracking
  status: text("status").notNull().default("active"), // active, maintenance, out_of_service, retired
  currentMileage: integer("current_mileage"),
  fuelType: text("fuel_type"), // gasoline, diesel, electric, hybrid
  
  // Insurance and registration
  insuranceExpiry: timestamp("insurance_expiry"),
  registrationExpiry: timestamp("registration_expiry"),
  inspectionDue: timestamp("inspection_due"),
  
  // Notes and additional info
  notes: text("notes"),
  photoUrl: text("photo_url"), // Vehicle photo
  
  // Tracking
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for Vehicles
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Vehicle Maintenance Intervals
export const vehicleMaintenanceIntervals = pgTable("vehicle_maintenance_intervals", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Maintenance type
  maintenanceType: text("maintenance_type").notNull(), // oil_change, tire_pressure, windshield_wash_fluid, oil_level, coolant_level, tire_rotation, wipers
  
  // Interval configuration
  intervalMiles: integer("interval_miles"), // Miles between maintenance (e.g., 3000 for oil change)
  intervalDays: integer("interval_days"), // Days between maintenance (e.g., 90 for quarterly checks)
  
  // Last maintenance
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  lastMaintenanceMileage: integer("last_maintenance_mileage"),
  
  // Next due dates (calculated)
  nextDueDate: timestamp("next_due_date"),
  nextDueMileage: integer("next_due_mileage"),
  
  // Status tracking
  status: text("status").notNull().default("due"), // completed, due, overdue
  isActive: boolean("is_active").default(true),
  
  // Notes and tracking
  notes: text("notes"),
  performedBy: integer("performed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vehicle Maintenance Records
export const vehicleMaintenanceRecords = pgTable("vehicle_maintenance_records", {
  id: serial("id").primaryKey(),
  intervalId: integer("interval_id").notNull().references(() => vehicleMaintenanceIntervals.id),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Maintenance details
  maintenanceType: text("maintenance_type").notNull(),
  performedDate: timestamp("performed_date").notNull(),
  performedMileage: integer("performed_mileage"),
  
  // Performed by
  performedBy: integer("performed_by").notNull().references(() => users.id),
  
  // Details
  notes: text("notes"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  vendorName: text("vendor_name"),
  receiptPhoto: text("receipt_photo"),
  
  // Next maintenance scheduling
  nextDueDate: timestamp("next_due_date"),
  nextDueMileage: integer("next_due_mileage"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for Vehicle Maintenance
export const insertVehicleMaintenanceIntervalSchema = createInsertSchema(vehicleMaintenanceIntervals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleMaintenanceRecordSchema = createInsertSchema(vehicleMaintenanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type VehicleMaintenanceInterval = typeof vehicleMaintenanceIntervals.$inferSelect;
export type InsertVehicleMaintenanceInterval = z.infer<typeof insertVehicleMaintenanceIntervalSchema>;

export type VehicleMaintenanceRecord = typeof vehicleMaintenanceRecords.$inferSelect;
export type InsertVehicleMaintenanceRecord = z.infer<typeof insertVehicleMaintenanceRecordSchema>;

// Vehicle Job Assignments - tracks which users are assigned to jobs based on vehicle inspections they completed
export const vehicleJobAssignments = pgTable("vehicle_job_assignments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  inspectionDate: timestamp("inspection_date").notNull(), // Date the inspection was completed
  assignmentDate: timestamp("assignment_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true), // Can be used to disable assignments
  notes: text("notes"), // Optional assignment notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schema for Vehicle Job Assignments
export const insertVehicleJobAssignmentSchema = createInsertSchema(vehicleJobAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type VehicleJobAssignment = typeof vehicleJobAssignments.$inferSelect;
export type InsertVehicleJobAssignment = z.infer<typeof insertVehicleJobAssignmentSchema>;