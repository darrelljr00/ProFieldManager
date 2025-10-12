import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, varchar, jsonb, date, time, pgEnum, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  hasScreenSharing: boolean("has_screen_sharing").default(true),
  hasMeetings: boolean("has_meetings").default(true),
  hasCallManager: boolean("has_call_manager").default(false),
  
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
  canAccessTutorials: boolean("can_access_tutorials").default(true),
  canAccessPartsSupplies: boolean("can_access_parts_supplies").default(true),
  canAccessMySchedule: boolean("can_access_my_schedule").default(true),
  canAccessFrontEnd: boolean("can_access_front_end").default(false),
  canAccessCallManager: boolean("can_access_call_manager").default(false),
  canAccessLiveStream: boolean("can_access_live_stream").default(true),
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
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
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
  projectId: integer("project_id").references(() => projects.id), // Link to project for Smart Capture auto-invoices
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending_approval, sent, paid, overdue, cancelled
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
  isSmartCaptureInvoice: boolean("is_smart_capture_invoice").default(false), // Flag for Smart Capture auto-invoices
  
  // Smart Capture approval tracking
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  viewedAt: timestamp("viewed_at"), // Track when invoice is viewed by customer
  
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
  // Smart Capture integration fields
  sourceType: text("source_type").default("manual"), // "manual", "smart_capture"
  smartCaptureItemId: integer("smart_capture_item_id").references(() => smartCaptureItems.id), // Link to original Smart Capture item
  priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }), // Snapshot of price when added
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint for idempotency: prevent duplicate line items for same smart capture item
  uniqueInvoiceSmartCaptureItem: unique().on(table.invoiceId, table.smartCaptureItemId),
}));

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
  approvalToken: text("approval_token"),
  denialToken: text("denial_token"),
  respondedAt: timestamp("responded_at"),
  responseMethod: text("response_method"), // email, sms
  viewedAt: timestamp("viewed_at"), // Track when quote is viewed by customer
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteAvailability = pgTable("quote_availability", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  customerEmail: text("customer_email").notNull(),
  selectedDates: jsonb("selected_dates").notNull(), // Array of {date: string, times: string[]}
  availabilityToken: text("availability_token").notNull().unique(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  notificationSent: boolean("notification_sent").default(false),
  emailSent: boolean("email_sent").default(false),
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
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  jobNumber: text("job_number"), // Unique job identifier like "PW-2024-001"
  description: text("description"),
  status: text("status").notNull().default("active"), // active, completed, on-hold, cancelled, deleted
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
  // Smart Capture settings
  enableSmartCapture: boolean("enable_smart_capture").default(false), // Enable Smart Capture automated invoice generation
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
  startedAt: timestamp("started_at"), // When task was started (status changed to in-progress)
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
  cloudinaryUrl: text("cloudinary_url"), // Cloudinary permanent storage URL
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

// Time Clock Task Triggers - Automated task creation on clock in/out events
export const timeClockTaskTriggers = pgTable("time_clock_task_triggers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").references(() => users.id), // null = applies to all users
  
  // Trigger configuration
  triggerEvent: text("trigger_event").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end'
  isActive: boolean("is_active").default(true),
  
  // Task configuration
  taskTitle: text("task_title").notNull(),
  taskDescription: text("task_description"),
  taskType: text("task_type").notNull().default("checkbox"), // checkbox, text, number, image
  isRequired: boolean("is_required").default(false),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  
  // Assignment rules
  assignToMode: text("assign_to_mode").notNull().default("trigger_user"), // trigger_user, specific_user, manager, admin
  assignToUserId: integer("assign_to_user_id").references(() => users.id), // For specific_user mode
  
  // Project association
  projectId: integer("project_id").references(() => projects.id), // null = no specific project
  createProjectIfNone: boolean("create_project_if_none").default(false),
  projectTemplate: text("project_template"), // Template for auto-created projects
  
  // Scheduling and conditions
  delayMinutes: integer("delay_minutes").default(0), // Delay before creating task
  daysOfWeek: text("days_of_week").array(), // Mon, Tue, Wed, Thu, Fri, Sat, Sun - empty = all days
  timeRange: jsonb("time_range"), // {start: "09:00", end: "17:00"} - null = any time
  
  // Frequency controls
  frequency: text("frequency").default("every_occurrence"), // every_occurrence, once_per_day, once_per_week
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").default(0),
  
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Notifications - Automated reminder system for task due dates
export const taskNotifications = pgTable("task_notifications", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Notification configuration
  notificationType: text("notification_type").notNull(), // '24h', '12h', '6h', '3h', '1h'
  hoursBeforeDue: integer("hours_before_due").notNull(), // 24, 12, 6, 3, 1
  
  // Delivery tracking
  status: text("status").notNull().default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  
  // Notification content
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  
  // Delivery channels
  isEmailSent: boolean("is_email_sent").default(false),
  isSmsSent: boolean("is_sms_sent").default(false),
  isWebSocketSent: boolean("is_websocket_sent").default(false),
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(), // When to send this notification
  
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
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  serviceDescription: text("service_description").notNull(),
  leadPrice: decimal("lead_price", { precision: 10, scale: 2 }),
  leadSource: text("lead_source").notNull(), // referral, website, advertising, social_media, etc.
  status: text("status").notNull().default("new"), // new, contacted, qualified, proposal_sent, won, lost
  priority: text("priority").notNull().default("medium"), // low, medium, high
  grade: text("grade").notNull().default("cold"), // cold, warm, hot
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  followUpDate: timestamp("follow_up_date"),
  // Follow-up attempts
  followUpAttempt1Date: timestamp("follow_up_attempt_1_date"),
  followUpAttempt1Type: text("follow_up_attempt_1_type"), // sms, email, call
  followUpAttempt1Completed: boolean("follow_up_attempt_1_completed").default(false),
  followUpAttempt2Date: timestamp("follow_up_attempt_2_date"),
  followUpAttempt2Type: text("follow_up_attempt_2_type"),
  followUpAttempt2Completed: boolean("follow_up_attempt_2_completed").default(false),
  followUpAttempt3Date: timestamp("follow_up_attempt_3_date"),
  followUpAttempt3Type: text("follow_up_attempt_3_type"),
  followUpAttempt3Completed: boolean("follow_up_attempt_3_completed").default(false),
  followUpAttempt4Date: timestamp("follow_up_attempt_4_date"),
  followUpAttempt4Type: text("follow_up_attempt_4_type"),
  followUpAttempt4Completed: boolean("follow_up_attempt_4_completed").default(false),
  // Automatic follow-up tracking
  automaticFollowUpEnabled: boolean("automatic_follow_up_enabled").default(false),
  automaticFollowUpCount: integer("automatic_follow_up_count").default(0),
  automaticFollowUpEmailCount: integer("automatic_follow_up_email_count").default(0),
  automaticFollowUpSmsCount: integer("automatic_follow_up_sms_count").default(0),
  lastAutomaticFollowUp: timestamp("last_automatic_follow_up"),
  nextAutomaticFollowUp: timestamp("next_automatic_follow_up"),
  automaticFollowUpInterval: integer("automatic_follow_up_interval").default(1), // days between follow-ups
  automaticFollowUpTemplate: text("automatic_follow_up_template"), // custom message template
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lead Settings table
export const leadSettings = pgTable("lead_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Follow-up Automation Settings
  enableAutoFollowUp: boolean("enable_auto_follow_up").default(false),
  autoFollowUpInterval: integer("auto_follow_up_interval").default(1), // days
  maxFollowUps: integer("max_follow_ups").default(3),
  defaultFollowUpMethod: text("default_follow_up_method").default("email"), // sms, email, call
  
  // SMS follow-up settings
  enableSmsFollowUp: boolean("enable_sms_follow_up").default(false),
  smsTemplate: text("sms_template").default("Hi {name}, following up on your {service} inquiry. Reply STOP to opt out."),
  
  // Email follow-up settings
  enableEmailFollowUp: boolean("enable_email_follow_up").default(false),
  emailTemplate: text("email_template").default("Hi {name}, this is a follow-up regarding your {service} request. Please let us know if you have any questions!"),
  emailSubject: text("email_subject").default("Follow-up on your {service} inquiry"),
  
  // Voice call settings
  enableVoiceFollowUp: boolean("enable_voice_follow_up").default(false),
  voiceScript: text("voice_script").default("Hello {name}, this is a follow-up call regarding your {service} request. Please call us back when convenient."),
  
  // Automatic Discount Settings
  enableAutoDiscounts: boolean("enable_auto_discounts").default(false),
  firstTimeCustomerDiscount: boolean("first_time_customer_discount").default(false),
  firstTimeCustomerDiscountValue: text("first_time_customer_discount_value").default("10%"),
  firstTimeCustomerDiscountType: text("first_time_customer_discount_type").default("percentage"), // percentage, fixed
  quickResponseDiscount: boolean("quick_response_discount").default(false),
  quickResponseDiscountValue: text("quick_response_discount_value").default("5%"),
  quickResponseDiscountType: text("quick_response_discount_type").default("percentage"),
  highValueLeadDiscount: boolean("high_value_lead_discount").default(false),
  highValueLeadDiscountValue: text("high_value_lead_discount_value").default("15%"),
  highValueLeadDiscountType: text("high_value_lead_discount_type").default("percentage"),
  
  // Referral Program Settings
  enableReferralProgram: boolean("enable_referral_program").default(false),
  referrerReward: text("referrer_reward").default("$50"),
  refereeDiscount: text("referee_discount").default("10%"),
  referralThreshold: text("referral_threshold").default("$200"),
  referralMessage: text("referral_message").default("Thanks for the referral! You'll receive your reward after the job is completed."),
  
  // Lead Scoring Settings
  enableLeadScoring: boolean("enable_lead_scoring").default(false),
  hotLeadValueThreshold: boolean("hot_lead_value_threshold").default(false),
  hotLeadQuickResponse: boolean("hot_lead_quick_response").default(false),
  hotLeadCompleteInfo: boolean("hot_lead_complete_info").default(false),
  hotLeadReferral: boolean("hot_lead_referral").default(false),
  warmLeadValueRange: boolean("warm_lead_value_range").default(false),
  warmLeadResponse24h: boolean("warm_lead_response_24h").default(false),
  warmLeadHasContact: boolean("warm_lead_has_contact").default(false),
  warmLeadLocalArea: boolean("warm_lead_local_area").default(false),
  
  // Integration Settings
  enableGoogleMyBusiness: boolean("enable_google_my_business").default(false),
  enableSmsNotifications: boolean("enable_sms_notifications").default(false),
  enableEmailMarketing: boolean("enable_email_marketing").default(false),
  enableCrmSync: boolean("enable_crm_sync").default(false),
  
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

// Recurring Jobs System - Template-based recurring job scheduling
export const recurringJobSeries = pgTable("recurring_job_series", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  
  // Job template data (default values for all occurrences)
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  estimatedDuration: integer("estimated_duration"), // in minutes
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  customerId: integer("customer_id").references(() => customers.id),
  
  // Job payload stored as JSON for flexible template data
  jobTemplateData: jsonb("job_template_data"), // stores all job fields as template
  
  // Recurrence configuration
  recurrencePattern: text("recurrence_pattern").notNull(), // daily, weekly, monthly, custom
  recurrenceInterval: integer("recurrence_interval").default(1), // every N days/weeks/months
  daysOfWeek: text("days_of_week").array(), // ['monday', 'tuesday'] for weekly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  monthsOfYear: text("months_of_year").array(), // ['january', 'march'] for yearly
  
  // Time configuration
  defaultStartTime: text("default_start_time"), // "09:00"
  timezone: text("timezone").notNull().default("America/New_York"),
  
  // Series lifecycle
  isActive: boolean("is_active").default(true),
  startDate: date("start_date").notNull(), // when recurring series begins
  endDate: date("end_date"), // optional end date
  maxOccurrences: integer("max_occurrences"), // optional limit on total occurrences
  
  // Default technician assignments
  defaultTechnicianIds: integer("default_technician_ids").array(), // default assigned users
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recurring Job Occurrences - Links generated dates to actual jobs
export const recurringJobOccurrences = pgTable("recurring_job_occurrences", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  seriesId: integer("series_id").notNull().references(() => recurringJobSeries.id, { onDelete: "cascade" }),
  
  // Generated occurrence details
  scheduledDate: date("scheduled_date").notNull(),
  scheduledStartTime: text("scheduled_start_time"), // can override series default
  scheduledEndTime: text("scheduled_end_time"),
  
  // Links to actual created jobs
  calendarJobId: integer("calendar_job_id").references(() => calendarJobs.id),
  projectId: integer("project_id").references(() => projects.id),
  
  // Per-occurrence overrides
  assignedTechnicianIds: integer("assigned_technician_ids").array(), // can override series defaults
  occurrenceOverrideData: jsonb("occurrence_override_data"), // custom data for this specific occurrence
  
  // Occurrence status
  status: text("status").notNull().default("scheduled"), // scheduled, created, completed, skipped, cancelled
  isOverride: boolean("is_override").default(false), // true if manually edited from series template
  
  // Skip/reschedule functionality
  isSkipped: boolean("is_skipped").default(false),
  skipReason: text("skip_reason"),
  rescheduledTo: date("rescheduled_to"),
  
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
  cloudinaryUrl: text("cloudinary_url"), // URL for images stored in Cloudinary
  isDeleted: boolean("is_deleted").default(false).notNull(), // Soft delete flag
  deletedAt: timestamp("deleted_at"), // When the image was deleted
  deletedBy: integer("deleted_by").references(() => users.id), // Who deleted the image
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
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
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

// Late Arrivals Tracking
export const lateArrivals = pgTable("late_arrivals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  scheduleId: integer("schedule_id").references(() => schedules.id),
  timeClockId: integer("time_clock_id").references(() => timeClock.id),
  
  // Schedule details
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  actualClockInTime: timestamp("actual_clock_in_time").notNull(),
  
  // Late calculation
  minutesLate: integer("minutes_late").notNull(),
  hoursLate: decimal("hours_late", { precision: 4, scale: 2 }).notNull(),
  
  // Context
  workDate: timestamp("work_date").notNull(), // The date of work (for easier querying)
  location: text("location"), // Where they clocked in
  reason: text("reason"), // Optional reason for being late
  isExcused: boolean("is_excused").default(false),
  excusedBy: integer("excused_by").references(() => users.id),
  excusedAt: timestamp("excused_at"),
  excuseReason: text("excuse_reason"),
  
  // Notifications
  supervisorNotified: boolean("supervisor_notified").default(false),
  notifiedAt: timestamp("notified_at"),
  
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

export const insertLateArrivalSchema = createInsertSchema(lateArrivals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type NavigationOrder = typeof navigationOrder.$inferSelect;
export type InsertNavigationOrder = z.infer<typeof insertNavigationOrderSchema>;
export type BackupSettings = typeof backupSettings.$inferSelect;
export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;
export type BackupJob = typeof backupJobs.$inferSelect;
export type SoundSettings = typeof soundSettings.$inferSelect;
export type InsertSoundSettings = z.infer<typeof insertSoundSettingsSchema>;
export type LateArrival = typeof lateArrivals.$inferSelect;
export type InsertLateArrival = z.infer<typeof insertLateArrivalSchema>;

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
    amount: z.number().positive(),
  })),
});

export const insertQuoteLineItemSchema = z.object({
  quoteId: z.number(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  amount: z.number().positive(),
});

export const insertQuoteAvailabilitySchema = z.object({
  quoteId: z.number(),
  organizationId: z.number(),
  customerEmail: z.string().email(),
  selectedDates: z.array(z.object({
    date: z.string(), // ISO date string
    times: z.array(z.string()), // Array of time strings like "9:00 AM", "2:00 PM"
  })),
  availabilityToken: z.string(),
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
  projectId: z.number().nullable(),
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
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  serviceDescription: z.string(),
  leadPrice: z.string().optional(),
  leadSource: z.string(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost']).default('new'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  grade: z.enum(['cold', 'warm', 'hot']).default('cold'),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  // Manual follow-up attempts
  followUpAttempt1Date: z.string().optional(),
  followUpAttempt1Type: z.string().optional(),
  followUpAttempt1Completed: z.boolean().default(false),
  followUpAttempt2Date: z.string().optional(),
  followUpAttempt2Type: z.string().optional(),
  followUpAttempt2Completed: z.boolean().default(false),
  followUpAttempt3Date: z.string().optional(),
  followUpAttempt3Type: z.string().optional(),
  followUpAttempt3Completed: z.boolean().default(false),
  followUpAttempt4Date: z.string().optional(),
  followUpAttempt4Type: z.string().optional(),
  followUpAttempt4Completed: z.boolean().default(false),
  // Automatic follow-up fields
  automaticFollowUpEnabled: z.boolean().default(false),
  automaticFollowUpInterval: z.number().default(1),
  automaticFollowUpTemplate: z.string().optional(),
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

export const insertRecurringJobSeriesSchema = createInsertSchema(recurringJobSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Job title is required"),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'custom'], {
    required_error: "Recurrence pattern is required"
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  timezone: z.string().default('America/New_York'),
});

export const insertRecurringJobOccurrenceSchema = createInsertSchema(recurringJobOccurrences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Scheduled date must be in YYYY-MM-DD format"),
  status: z.enum(['scheduled', 'created', 'completed', 'skipped', 'cancelled']).default('scheduled'),
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

export type QuoteAvailability = typeof quoteAvailability.$inferSelect;
export type InsertQuoteAvailability = z.infer<typeof insertQuoteAvailabilitySchema>;

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

export type RecurringJobSeries = typeof recurringJobSeries.$inferSelect;
export type InsertRecurringJobSeries = z.infer<typeof insertRecurringJobSeriesSchema>;

export type RecurringJobOccurrence = typeof recurringJobOccurrences.$inferSelect;
export type InsertRecurringJobOccurrence = z.infer<typeof insertRecurringJobOccurrenceSchema>;
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

// Schedule Management System
export const scheduleRecurrenceEnum = pgEnum('schedule_recurrence', ['none', 'weekly', 'biweekly', 'monthly']);

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  
  // Schedule details
  title: text("title").notNull(),
  description: text("description"),
  
  // Time details
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  
  // Location
  location: text("location"),
  address: text("address"),
  
  // Recurrence
  recurrence: scheduleRecurrenceEnum("recurrence").default("none"),
  recurrenceEndDate: date("recurrence_end_date"),
  
  // Status and approvals
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, cancelled, completed
  requiresApproval: boolean("requires_approval").default(false),
  isApproved: boolean("is_approved").default(true),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Additional fields
  priority: text("priority").default("medium"), // low, medium, high, urgent
  notes: text("notes"),
  color: text("color").default("#3B82F6"), // For calendar display
  
  // Time tracking
  clockInTime: timestamp("clock_in_time"),
  clockOutTime: timestamp("clock_out_time"),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Default schedule details
  defaultStartTime: time("default_start_time").notNull(),
  defaultEndTime: time("default_end_time").notNull(),
  defaultLocation: text("default_location"),
  defaultRecurrence: scheduleRecurrenceEnum("default_recurrence").default("weekly"),
  
  // Template settings
  isPublic: boolean("is_public").default(false), // Can be used by managers/admins
  category: text("category").default("general"), // general, shift, meeting, training
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduleAssignments = pgTable("schedule_assignments", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  assignedById: integer("assigned_by_id").notNull().references(() => users.id),
  
  // Assignment status
  status: text("status").default("assigned"), // assigned, accepted, declined, completed
  responseDate: timestamp("response_date"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleNotifications = pgTable("schedule_notifications", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Notification details
  type: text("type").notNull(), // reminder, assignment, change, cancellation
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  
  // Delivery status
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  method: text("method").default("email"), // email, sms, push, in_app
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleComments = pgTable("schedule_comments", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  
  comment: text("comment").notNull(),
  isInternal: boolean("is_internal").default(false), // Only visible to managers/admins
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule management schemas
export const insertScheduleSchema = createInsertSchema(schedules, {
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]).default("scheduled"),
  recurrence: z.enum(["none", "weekly", "biweekly", "monthly"]).default("none"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates, {
  name: z.string().min(1, "Template name is required"),
  defaultStartTime: z.string().min(1, "Default start time is required"),
  defaultEndTime: z.string().min(1, "Default end time is required"),
  category: z.enum(["general", "shift", "meeting", "training"]).default("general"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleAssignmentSchema = createInsertSchema(scheduleAssignments, {
  status: z.enum(["assigned", "accepted", "declined", "completed"]).default("assigned"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleCommentSchema = createInsertSchema(scheduleComments, {
  comment: z.string().min(1, "Comment is required"),
}).omit({
  id: true,
  createdAt: true,
});

// Schedule management types
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleAssignment = typeof scheduleAssignments.$inferSelect;
export type InsertScheduleAssignment = z.infer<typeof insertScheduleAssignmentSchema>;
export type ScheduleNotification = typeof scheduleNotifications.$inferSelect;
export type ScheduleComment = typeof scheduleComments.$inferSelect;
export type InsertScheduleComment = z.infer<typeof insertScheduleCommentSchema>;

// Tutorial System Tables
export const tutorials = pgTable("tutorials", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  category: text("category").notNull(), // getting-started, core-features, mobile-app, advanced-features, admin-features
  type: text("type").notNull(), // video, interactive, documentation
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  estimatedTime: integer("estimated_time"), // in minutes
  videoUrl: text("video_url"),
  videoThumbnail: text("video_thumbnail"),
  interactiveSteps: jsonb("interactive_steps"), // JSON array of interactive steps
  content: text("content"), // Markdown content for documentation
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(true),
  sortOrder: integer("sort_order").default(0),
  viewCount: integer("view_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  prerequisites: text("prerequisites").array(), // Array of tutorial IDs that should be completed first
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tutorialProgress = pgTable("tutorial_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tutorialId: integer("tutorial_id").references(() => tutorials.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  status: text("status").default("not_started"), // not_started, in_progress, completed
  currentStep: integer("current_step").default(0),
  completedSteps: integer("completed_steps").array(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  timeSpent: integer("time_spent").default(0), // in seconds
  rating: integer("rating"), // 1-5 star rating
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tutorialCategories = pgTable("tutorial_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color").default("#3B82F6"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Frontend Management Tables
export const frontendCategories = pgTable("frontend_categories", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  type: text("type").notNull(), // header, footer, sidebar, main
  position: text("position").default("top"), // top, bottom, left, right, center
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  styling: jsonb("styling"), // CSS styling options for category
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frontendPages = pgTable("frontend_pages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  path: text("path").notNull(),
  content: jsonb("content"), // Page content as JSON
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  templateType: text("template_type").default("custom"), // custom, landing, about, contact
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frontendSliders = pgTable("frontend_sliders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  imageUrl: text("image_url"),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  backgroundColor: text("background_color").default("#1e40af"),
  textColor: text("text_color").default("#ffffff"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  displayDuration: integer("display_duration").default(5000), // milliseconds
  animationType: text("animation_type").default("fade"), // fade, slide, zoom
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frontendComponents = pgTable("frontend_components", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  pageId: integer("page_id").references(() => frontendPages.id),
  categoryId: integer("category_id").references(() => frontendCategories.id),
  componentType: text("component_type").notNull(), // hero, features, testimonials, pricing, contact, custom
  title: text("title"),
  content: jsonb("content"), // Component configuration as JSON
  position: text("position").default("main"), // header, main, sidebar, footer
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
  isGlobal: boolean("is_global").default(false), // Shows on all pages
  styling: jsonb("styling"), // CSS styling options
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frontendIcons = pgTable("frontend_icons", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  iconType: text("icon_type").notNull(), // lucide, custom, image
  iconData: text("icon_data"), // Icon name for lucide, URL for image, SVG for custom
  category: text("category").default("general"), // navigation, features, social, etc
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const frontendBoxes = pgTable("frontend_boxes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  pageId: integer("page_id").references(() => frontendPages.id),
  categoryId: integer("category_id").references(() => frontendCategories.id),
  title: text("title").notNull(),
  description: text("description"),
  iconId: integer("icon_id").references(() => frontendIcons.id),
  link: text("link"),
  backgroundColor: text("background_color").default("#ffffff"),
  textColor: text("text_color").default("#000000"),
  borderColor: text("border_color").default("#e5e7eb"),
  hoverColor: text("hover_color").default("#f3f4f6"),
  position: jsonb("position"), // {x: 0, y: 0, width: 12, height: 4} for grid layout
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
  animationEffect: text("animation_effect").default("none"), // none, fade, slide, bounce
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call Manager System - Phone Number Provisioning and Call Management
export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  phoneNumber: text("phone_number").notNull().unique(), // E.164 format: +1234567890
  friendlyName: text("friendly_name"), // User-friendly name for the number
  areaCode: text("area_code"),
  country: text("country").default("US"),
  numberType: text("number_type").default("local"), // local, toll-free, mobile
  
  // Provider Information
  provider: text("provider").default("twilio"), // twilio, vonage, etc.
  providerSid: text("provider_sid"), // Provider's unique identifier
  providerAccountSid: text("provider_account_sid"),
  
  // Configuration
  isActive: boolean("is_active").default(true),
  isCallEnabled: boolean("is_call_enabled").default(true),
  isSmsEnabled: boolean("is_sms_enabled").default(true),
  isRecordingEnabled: boolean("is_recording_enabled").default(false),
  
  // Webhooks and Routing
  voiceUrl: text("voice_url"), // Webhook URL for incoming calls
  voiceMethod: text("voice_method").default("POST"),
  smsUrl: text("sms_url"), // Webhook URL for incoming SMS
  smsMethod: text("sms_method").default("POST"),
  statusCallbackUrl: text("status_callback_url"),
  
  // Features
  voicemailEnabled: boolean("voicemail_enabled").default(true),
  callForwardingEnabled: boolean("call_forwarding_enabled").default(false),
  callForwardingNumber: text("call_forwarding_number"),
  
  // Business Hours and Routing
  businessHours: jsonb("business_hours").default('{"enabled": false}'), // {enabled: true, schedule: {...}}
  afterHoursAction: text("after_hours_action").default("voicemail"), // voicemail, forward, disconnect
  afterHoursNumber: text("after_hours_number"),
  
  // Pricing and Limits
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 4 }).default("0"),
  usageCost: decimal("usage_cost", { precision: 10, scale: 4 }).default("0"), // Per minute/message cost
  
  // Metadata
  assignedTo: integer("assigned_to").references(() => users.id), // Primary user responsible
  department: text("department"), // sales, support, etc.
  purpose: text("purpose"), // main, support, emergency, etc.
  
  purchasedAt: timestamp("purchased_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callRecords = pgTable("call_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id),
  
  // Call Identification
  callSid: text("call_sid").notNull().unique(), // Provider's call ID
  parentCallSid: text("parent_call_sid"), // For transfers/conferences
  
  // Call Participants
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  fromFormatted: text("from_formatted"), // Formatted display number
  toFormatted: text("to_formatted"),
  
  // Call Direction and Type
  direction: text("direction").notNull(), // inbound, outbound
  callType: text("call_type").default("voice"), // voice, conference, transfer
  
  // Call Status and Timing
  status: text("status").notNull(), // queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
  startTime: timestamp("start_time"),
  answerTime: timestamp("answer_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration").default(0), // Total call duration in seconds
  billableDuration: integer("billable_duration").default(0), // Charged duration
  
  // Call Quality and Details
  callQuality: text("call_quality"), // excellent, good, fair, poor
  price: decimal("price", { precision: 10, scale: 4 }).default("0"),
  priceUnit: text("price_unit").default("USD"),
  
  // User Assignment
  handledBy: integer("handled_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  
  // Call Notes and Context
  purpose: text("purpose"), // sales, support, follow-up, etc.
  notes: text("notes"),
  tags: text("tags").array(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  
  // Customer/Lead Context
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  projectId: integer("project_id").references(() => projects.id),
  
  // Call Features Used
  wasRecorded: boolean("was_recorded").default(false),
  wasTransferred: boolean("was_transferred").default(false),
  wasConference: boolean("was_conference").default(false),
  hadVoicemail: boolean("had_voicemail").default(false),
  
  // Error Handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const callRecordings = pgTable("call_recordings", {
  id: serial("id").primaryKey(),
  callRecordId: integer("call_record_id").notNull().references(() => callRecords.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Recording Details
  recordingSid: text("recording_sid").notNull().unique(), // Provider's recording ID
  recordingUrl: text("recording_url").notNull(),
  recordingDuration: integer("recording_duration").default(0), // Duration in seconds
  recordingSize: integer("recording_size").default(0), // File size in bytes
  
  // Recording Configuration
  recordingFormat: text("recording_format").default("mp3"), // mp3, wav, etc.
  recordingChannels: text("recording_channels").default("mono"), // mono, dual
  recordingSource: text("recording_source").default("DialVerb"), // How recording was initiated
  
  // Access Control
  isTranscribed: boolean("is_transcribed").default(false),
  transcriptionStatus: text("transcription_status").default("pending"), // pending, completed, failed
  isEncrypted: boolean("is_encrypted").default(false),
  encryptionKey: text("encryption_key"),
  
  // Storage and Retention
  localFilePath: text("local_file_path"), // Local backup path
  cloudinaryUrl: text("cloudinary_url"), // Cloud storage URL
  retentionPeriod: integer("retention_period").default(90), // Days to retain
  expiresAt: timestamp("expires_at"),
  
  // Compliance and Legal
  consentGiven: boolean("consent_given").default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  legalHold: boolean("legal_hold").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callTranscripts = pgTable("call_transcripts", {
  id: serial("id").primaryKey(),
  callRecordId: integer("call_record_id").notNull().references(() => callRecords.id, { onDelete: "cascade" }),
  callRecordingId: integer("call_recording_id").references(() => callRecordings.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Transcription Content
  fullTranscript: text("full_transcript"), // Complete transcript text
  structuredTranscript: jsonb("structured_transcript"), // Timestamped segments with speakers
  
  // Transcription Details
  transcriptionProvider: text("transcription_provider").default("auto"), // auto, whisper, google, aws
  language: text("language").default("en-US"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // Overall confidence score
  
  // Analysis and Insights
  sentiment: text("sentiment"), // positive, negative, neutral
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 4 }),
  keyTopics: text("key_topics").array(),
  actionItems: text("action_items").array(),
  
  // Speaker Identification
  speakerCount: integer("speaker_count").default(2),
  speakerMapping: jsonb("speaker_mapping"), // Map speaker labels to actual people
  
  // Processing Status
  status: text("status").default("pending"), // pending, processing, completed, failed
  processingStartTime: timestamp("processing_start_time"),
  processingEndTime: timestamp("processing_end_time"),
  errorMessage: text("error_message"),
  
  // Search and Indexing
  searchableText: text("searchable_text"), // Processed text for full-text search
  keywords: text("keywords").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callTransfers = pgTable("call_transfers", {
  id: serial("id").primaryKey(),
  originalCallId: integer("original_call_id").notNull().references(() => callRecords.id),
  transferredCallId: integer("transferred_call_id").references(() => callRecords.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Transfer Details
  transferType: text("transfer_type").notNull(), // warm, cold, conference
  transferredFrom: integer("transferred_from").notNull().references(() => users.id),
  transferredTo: integer("transferred_to").references(() => users.id),
  transferredToNumber: text("transferred_to_number"), // External number if not internal user
  
  // Transfer Status
  status: text("status").default("pending"), // pending, accepted, declined, completed, failed
  transferTime: timestamp("transfer_time").defaultNow(),
  acceptTime: timestamp("accept_time"),
  completeTime: timestamp("complete_time"),
  
  // Transfer Context
  reason: text("reason"), // customer_request, expertise_needed, escalation, etc.
  notes: text("notes"),
  customerConsent: boolean("customer_consent").default(false),
  
  // Call Quality
  transferDuration: integer("transfer_duration").default(0), // Time in transfer state
  wasSuccessful: boolean("was_successful").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const voicemails = pgTable("voicemails", {
  id: serial("id").primaryKey(),
  callRecordId: integer("call_record_id").references(() => callRecords.id),
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Voicemail Details
  voicemailSid: text("voicemail_sid").unique(), // Provider's voicemail ID
  fromNumber: text("from_number").notNull(),
  fromFormatted: text("from_formatted"),
  
  // Recording Details
  recordingUrl: text("recording_url"),
  recordingDuration: integer("recording_duration").default(0),
  recordingSize: integer("recording_size").default(0),
  
  // Transcription
  transcriptionText: text("transcription_text"),
  transcriptionConfidence: decimal("transcription_confidence", { precision: 5, scale: 4 }),
  
  // Message Status
  status: text("status").default("new"), // new, listened, saved, deleted
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isUrgent: boolean("is_urgent").default(false),
  
  // Assignment and Handling
  assignedTo: integer("assigned_to").references(() => users.id),
  listenedBy: integer("listened_by").references(() => users.id),
  listenedAt: timestamp("listened_at"),
  
  // Customer Context
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  
  // Follow-up Actions
  needsFollowup: boolean("needs_followup").default(false),
  followupNotes: text("followup_notes"),
  followupDate: timestamp("followup_date"),
  
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callQueues = pgTable("call_queues", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Queue Configuration
  name: text("name").notNull(),
  description: text("description"),
  phoneNumberIds: integer("phone_number_ids").array(), // Phone numbers that route to this queue
  
  // Queue Behavior
  queueStrategy: text("queue_strategy").default("round_robin"), // round_robin, longest_idle, skills_based
  maxWaitTime: integer("max_wait_time").default(300), // Maximum wait time in seconds
  maxQueueSize: integer("max_queue_size").default(50),
  
  // Agent Assignment
  availableAgents: integer("available_agents").array(), // User IDs of available agents
  skillRequirements: text("skill_requirements").array(),
  priority: integer("priority").default(1), // Queue priority level
  
  // Queue Messages and Music
  welcomeMessage: text("welcome_message"),
  holdMusicUrl: text("hold_music_url"),
  estimatedWaitMessage: text("estimated_wait_message"),
  queueFullMessage: text("queue_full_message"),
  
  // Business Hours
  businessHours: jsonb("business_hours").default('{"enabled": false}'),
  afterHoursAction: text("after_hours_action").default("voicemail"),
  afterHoursMessage: text("after_hours_message"),
  
  // Statistics and Monitoring
  currentQueueSize: integer("current_queue_size").default(0),
  averageWaitTime: integer("average_wait_time").default(0),
  averageHandleTime: integer("average_handle_time").default(0),
  
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callQueueEntries = pgTable("call_queue_entries", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => callQueues.id, { onDelete: "cascade" }),
  callRecordId: integer("call_record_id").notNull().references(() => callRecords.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Queue Position and Timing
  queuePosition: integer("queue_position").notNull(),
  enteredAt: timestamp("entered_at").defaultNow(),
  exitedAt: timestamp("exited_at"),
  waitTime: integer("wait_time").default(0), // Time waited in seconds
  
  // Exit Reason
  exitReason: text("exit_reason"), // answered, abandoned, transferred, timeout, queue_full
  answeredBy: integer("answered_by").references(() => users.id),
  
  // Caller Information
  callerNumber: text("caller_number").notNull(),
  callerName: text("caller_name"),
  callbackNumber: text("callback_number"),
  
  // Priority and Skills
  priority: integer("priority").default(1),
  requiredSkills: text("required_skills").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization-specific Twilio settings for multi-tenant call manager
export const organizationTwilioSettings = pgTable("organization_twilio_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
  
  // Twilio Account Configuration
  accountSid: text("account_sid"), // Organization's Twilio Account SID
  authToken: text("auth_token"), // Organization's Twilio Auth Token (encrypted)
  isActive: boolean("is_active").default(false),
  
  // Default Phone Number Settings
  defaultPhoneNumberId: integer("default_phone_number_id").references(() => phoneNumbers.id),
  
  // Webhook Configuration
  baseWebhookUrl: text("base_webhook_url"), // Base URL for this organization's webhooks
  voiceWebhookUrl: text("voice_webhook_url"),
  smsWebhookUrl: text("sms_webhook_url"),
  statusCallbackUrl: text("status_callback_url"),
  
  // Call Features Configuration
  callRecordingEnabled: boolean("call_recording_enabled").default(false),
  callTranscriptionEnabled: boolean("call_transcription_enabled").default(false),
  voicemailEnabled: boolean("voicemail_enabled").default(true),
  conferenceEnabled: boolean("conference_enabled").default(false),
  callQueueEnabled: boolean("call_queue_enabled").default(false),
  
  // Business Rules
  maxConcurrentCalls: integer("max_concurrent_calls").default(5),
  allowInternationalCalls: boolean("allow_international_calls").default(false),
  allowOutboundCalls: boolean("allow_outbound_calls").default(true),
  requireCallerConsent: boolean("require_caller_consent").default(false),
  
  // Cost Management
  monthlyCallLimit: integer("monthly_call_limit").default(1000),
  currentMonthUsage: integer("current_month_usage").default(0),
  callCostLimit: decimal("call_cost_limit", { precision: 10, scale: 2 }).default("100.00"),
  currentMonthCost: decimal("current_month_cost", { precision: 10, scale: 2 }).default("0.00"),
  
  // Compliance and Legal
  dataRetentionDays: integer("data_retention_days").default(90),
  requireCallConsent: boolean("require_call_consent").default(false),
  consentMessage: text("consent_message"),
  
  // Status and Health
  lastConnectionTest: timestamp("last_connection_test"),
  connectionStatus: text("connection_status").default("untested"), // untested, connected, failed, suspended
  lastError: text("last_error"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Call Manager Analytics
export const organizationCallAnalytics = pgTable("organization_call_analytics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Time Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodType: text("period_type").default("daily"), // daily, weekly, monthly
  
  // Call Volume Metrics
  totalCalls: integer("total_calls").default(0),
  inboundCalls: integer("inbound_calls").default(0),
  outboundCalls: integer("outbound_calls").default(0),
  answeredCalls: integer("answered_calls").default(0),
  missedCalls: integer("missed_calls").default(0),
  
  // Call Duration Metrics
  totalCallDuration: integer("total_call_duration").default(0), // Total seconds
  averageCallDuration: integer("average_call_duration").default(0),
  longestCall: integer("longest_call").default(0),
  
  // Quality Metrics
  callAnswerRate: decimal("call_answer_rate", { precision: 5, scale: 2 }).default("0.00"), // Percentage
  averageWaitTime: integer("average_wait_time").default(0),
  customerSatisfactionScore: decimal("customer_satisfaction_score", { precision: 3, scale: 2 }).default("0.00"),
  
  // Cost Tracking
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0.00"),
  costPerCall: decimal("cost_per_call", { precision: 8, scale: 4 }).default("0.00"),
  costPerMinute: decimal("cost_per_minute", { precision: 8, scale: 4 }).default("0.00"),
  
  // Feature Usage
  recordingsCount: integer("recordings_count").default(0),
  transcriptionsCount: integer("transcriptions_count").default(0),
  transfersCount: integer("transfers_count").default(0),
  voicemailsCount: integer("voicemails_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Frontend Management Insert Schemas
export const insertFrontendCategorySchema = createInsertSchema(frontendCategories, {
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Slug is required"),
  type: z.enum(["header", "footer", "sidebar", "main"], { required_error: "Category type is required" }),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFrontendPageSchema = createInsertSchema(frontendPages, {
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  path: z.string().min(1, "Path is required"),
  content: z.any().optional(),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFrontendSliderSchema = createInsertSchema(frontendSliders, {
  title: z.string().min(1, "Title is required"),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFrontendComponentSchema = createInsertSchema(frontendComponents, {
  componentType: z.string().min(1, "Component type is required"),
  content: z.any().optional(),
  styling: z.any().optional(),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFrontendIconSchema = createInsertSchema(frontendIcons, {
  name: z.string().min(1, "Name is required"),
  iconType: z.string().min(1, "Icon type is required"),
  iconData: z.string().optional(),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFrontendBoxSchema = createInsertSchema(frontendBoxes, {
  title: z.string().min(1, "Title is required"),
  position: z.any().optional(),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tutorial System Insert Schemas
export const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTutorialProgressSchema = createInsertSchema(tutorialProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTutorialCategorySchema = createInsertSchema(tutorialCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Frontend Management Types
export type FrontendCategory = typeof frontendCategories.$inferSelect;
export type InsertFrontendCategory = z.infer<typeof insertFrontendCategorySchema>;
export type FrontendPage = typeof frontendPages.$inferSelect;
export type InsertFrontendPage = z.infer<typeof insertFrontendPageSchema>;
export type FrontendSlider = typeof frontendSliders.$inferSelect;
export type InsertFrontendSlider = z.infer<typeof insertFrontendSliderSchema>;
export type FrontendComponent = typeof frontendComponents.$inferSelect;
export type InsertFrontendComponent = z.infer<typeof insertFrontendComponentSchema>;
export type FrontendIcon = typeof frontendIcons.$inferSelect;
export type InsertFrontendIcon = z.infer<typeof insertFrontendIconSchema>;
export type FrontendBox = typeof frontendBoxes.$inferSelect;
export type InsertFrontendBox = z.infer<typeof insertFrontendBoxSchema>;

// Tutorial System Types
export type Tutorial = typeof tutorials.$inferSelect;
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;
export type TutorialProgress = typeof tutorialProgress.$inferSelect;
export type InsertTutorialProgress = z.infer<typeof insertTutorialProgressSchema>;
export type TutorialCategory = typeof tutorialCategories.$inferSelect;
export type InsertTutorialCategory = z.infer<typeof insertTutorialCategorySchema>;

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

// Call Manager Insert Schemas
export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers, {
  phoneNumber: z.string().min(1, "Phone number is required"),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  purchasedAt: true,
});

export const insertCallRecordSchema = createInsertSchema(callRecords, {
  callSid: z.string().min(1, "Call SID is required"),
  fromNumber: z.string().min(1, "From number is required"),
  toNumber: z.string().min(1, "To number is required"),
  direction: z.enum(["inbound", "outbound"]),
  status: z.string().min(1, "Status is required"),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCallRecordingSchema = createInsertSchema(callRecordings, {
  callRecordId: z.number(),
  recordingSid: z.string().min(1, "Recording SID is required"),
  recordingUrl: z.string().url("Invalid recording URL"),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallTranscriptSchema = createInsertSchema(callTranscripts, {
  callRecordId: z.number(),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallTransferSchema = createInsertSchema(callTransfers, {
  originalCallId: z.number(),
  transferredFrom: z.number(),
  transferType: z.enum(["warm", "cold", "conference"]),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertVoicemailSchema = createInsertSchema(voicemails, {
  fromNumber: z.string().min(1, "From number is required"),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  receivedAt: true,
});

export const insertCallQueueSchema = createInsertSchema(callQueues, {
  name: z.string().min(1, "Queue name is required"),
  organizationId: z.number(),
  createdBy: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallQueueEntrySchema = createInsertSchema(callQueueEntries, {
  queueId: z.number(),
  callRecordId: z.number(),
  queuePosition: z.number(),
  callerNumber: z.string().min(1, "Caller number is required"),
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
});

// Call Manager Types
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;
export type CallRecord = typeof callRecords.$inferSelect;
export type InsertCallRecord = z.infer<typeof insertCallRecordSchema>;
export type CallRecording = typeof callRecordings.$inferSelect;
export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;
export type CallTranscript = typeof callTranscripts.$inferSelect;
export type InsertCallTranscript = z.infer<typeof insertCallTranscriptSchema>;
export type CallTransfer = typeof callTransfers.$inferSelect;
export type InsertCallTransfer = z.infer<typeof insertCallTransferSchema>;
export type Voicemail = typeof voicemails.$inferSelect;
export type InsertVoicemail = z.infer<typeof insertVoicemailSchema>;
export type CallQueue = typeof callQueues.$inferSelect;
export type InsertCallQueue = z.infer<typeof insertCallQueueSchema>;
export type CallQueueEntry = typeof callQueueEntries.$inferSelect;
export type InsertCallQueueEntry = z.infer<typeof insertCallQueueEntrySchema>;

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
  payType: text("pay_type").notNull().default("salary"), // salary, hourly
  salary: decimal("salary", { precision: 10, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
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
  category: text("category").notNull(), // 'safety', 'vehicle', 'equipment', 'gas_card'
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  itemType: text("item_type").default("regular"), // 'regular', 'gas_card_check_in', 'gas_card_check_out'
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
  response: text("response").notNull(), // 'pass', 'fail', 'na', 'needs_attention', 'checked_in', 'checked_out'
  notes: text("notes"),
  photos: text("photos").array(), // Array of photo file paths for this specific item
  gasCardId: integer("gas_card_id").references(() => gasCards.id), // For gas card check-in/check-out items
  gasCardAssignmentId: integer("gas_card_assignment_id").references(() => gasCardAssignments.id), // Link to assignment record
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

// Task Triggers System - Comprehensive alert system with flashing, sound, duration settings
export const taskTriggers = pgTable("task_triggers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(), // Trigger name
  description: text("description"),
  
  // Trigger conditions
  triggerType: text("trigger_type").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end', 'manual'
  isActive: boolean("is_active").default(true),
  
  // Alert settings
  hasFlashingAlert: boolean("has_flashing_alert").default(true),
  flashColor: text("flash_color").default("#ff0000"), // Color for flashing alert
  flashDuration: integer("flash_duration").default(5000), // Duration in milliseconds
  
  // Sound settings
  hasSoundAlert: boolean("has_sound_alert").default(true),
  soundType: text("sound_type").default("notification"), // 'chime', 'bell', 'notification', 'pop', etc.
  soundVolume: integer("sound_volume").default(70), // Volume 0-100
  
  // Duration and timing
  displayDuration: integer("display_duration").default(10000), // How long to show alert (ms)
  autoHide: boolean("auto_hide").default(true),
  
  // Text fields and content
  title: text("title").notNull(),
  message: text("message").notNull(),
  buttonText: text("button_text").default("Mark Complete"),
  
  // Clock-in prevention (when trigger is active, prevent clock-out)
  preventClockOut: boolean("prevent_clock_out").default(false),
  clockOutBlockMessage: text("clock_out_block_message").default("Complete required tasks before clocking out"),
  
  // Assignment and targeting
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id), // Specific user or null for all
  assignedToRole: text("assigned_to_role"), // 'admin', 'manager', 'user' or null for all
  
  // Completion tracking
  requiresCompletion: boolean("requires_completion").default(true),
  allowMultipleCompletions: boolean("allow_multiple_completions").default(false),
  
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskTriggerCompletions = pgTable("task_trigger_completions", {
  id: serial("id").primaryKey(),
  triggerId: integer("trigger_id").notNull().references(() => taskTriggers.id),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Completion details
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"), // Optional completion notes
  timeClockEntryId: integer("time_clock_entry_id").references(() => timeClock.id), // Link to time clock entry if triggered by clock action
  
  // Context data
  triggerContext: jsonb("trigger_context"), // Additional context data from trigger event
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskTriggerInstances = pgTable("task_trigger_instances", {
  id: serial("id").primaryKey(),
  triggerId: integer("trigger_id").notNull().references(() => taskTriggers.id),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Instance status
  status: text("status").notNull().default("active"), // 'active', 'completed', 'dismissed', 'expired'
  isVisible: boolean("is_visible").default(true),
  
  // Trigger event details
  triggeredBy: text("triggered_by").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end', 'manual'
  triggeredAt: timestamp("triggered_at").defaultNow(),
  timeClockEntryId: integer("time_clock_entry_id").references(() => timeClock.id),
  
  // Completion
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  dismissedAt: timestamp("dismissed_at"),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Trigger Schema Validation
export const insertTaskTriggerSchema = createInsertSchema(taskTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskTriggerCompletionSchema = createInsertSchema(taskTriggerCompletions).omit({
  id: true,
  createdAt: true,
});

export const insertTaskTriggerInstanceSchema = createInsertSchema(taskTriggerInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Task Trigger Types
export type TaskTrigger = typeof taskTriggers.$inferSelect;
export type InsertTaskTrigger = z.infer<typeof insertTaskTriggerSchema>;

export type TaskTriggerCompletion = typeof taskTriggerCompletions.$inferSelect;
export type InsertTaskTriggerCompletion = z.infer<typeof insertTaskTriggerCompletionSchema>;

export type TaskTriggerInstance = typeof taskTriggerInstances.$inferSelect;
export type InsertTaskTriggerInstance = z.infer<typeof insertTaskTriggerInstanceSchema>;

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
  
  // Image
  imageUrl: text("image_url"), // Object storage URL for part/supply image
  
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

// Comprehensive Notifications System
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // recipient
  
  // Notification details
  type: text("type").notNull(), // job_assigned, job_completed, task_assigned, task_completed, task_triggered, lead_new, invoice_paid, stock_alert, schedule_reminder
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Related entity IDs (for linking back to source)
  relatedEntityType: text("related_entity_type"), // project, task, lead, invoice, customer, etc.
  relatedEntityId: integer("related_entity_id"),
  
  // Notification metadata
  priority: text("priority").default("normal"), // low, normal, high, urgent
  category: text("category").notNull(), // user_based, team_based
  
  // Status tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isActioned: boolean("is_actioned").default(false), // for notifications that require action
  actionedAt: timestamp("actioned_at"),
  
  // Admin read tracking
  adminViewedBy: integer("admin_viewed_by").references(() => users.id), // which admin/manager viewed this notification's read status
  adminViewedAt: timestamp("admin_viewed_at"), // when admin viewed the read status
  
  // Delivery tracking
  deliveredVia: text("delivered_via").array(), // ['in_app', 'email', 'sms', 'push']
  emailSent: boolean("email_sent").default(false),
  smsSent: boolean("sms_sent").default(false),
  pushSent: boolean("push_sent").default(false),
  
  // Creator info
  createdBy: integer("created_by").references(() => users.id), // who triggered this notification
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User notification preferences
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Job notifications
  jobAssignedInApp: boolean("job_assigned_in_app").default(true),
  jobAssignedEmail: boolean("job_assigned_email").default(true),
  jobAssignedSms: boolean("job_assigned_sms").default(false),
  
  jobCompletedInApp: boolean("job_completed_in_app").default(true),
  jobCompletedEmail: boolean("job_completed_email").default(false),
  jobCompletedSms: boolean("job_completed_sms").default(false),
  
  // Task notifications
  taskAssignedInApp: boolean("task_assigned_in_app").default(true),
  taskAssignedEmail: boolean("task_assigned_email").default(true),
  taskAssignedSms: boolean("task_assigned_sms").default(false),
  
  taskCompletedInApp: boolean("task_completed_in_app").default(true),
  taskCompletedEmail: boolean("task_completed_email").default(false),
  taskCompletedSms: boolean("task_completed_sms").default(false),
  
  taskTriggeredInApp: boolean("task_triggered_in_app").default(true),
  taskTriggeredEmail: boolean("task_triggered_email").default(true),
  taskTriggeredSms: boolean("task_triggered_sms").default(false),
  
  // Lead notifications
  leadNewInApp: boolean("lead_new_in_app").default(true),
  leadNewEmail: boolean("lead_new_email").default(true),
  leadNewSms: boolean("lead_new_sms").default(false),
  
  // Invoice notifications
  invoicePaidInApp: boolean("invoice_paid_in_app").default(true),
  invoicePaidEmail: boolean("invoice_paid_email").default(true),
  invoicePaidSms: boolean("invoice_paid_sms").default(false),
  
  // System notifications
  stockAlertInApp: boolean("stock_alert_in_app").default(true),
  stockAlertEmail: boolean("stock_alert_email").default(false),
  stockAlertSms: boolean("stock_alert_sms").default(false),
  
  scheduleReminderInApp: boolean("schedule_reminder_in_app").default(true),
  scheduleReminderEmail: boolean("schedule_reminder_email").default(true),
  scheduleReminderSms: boolean("schedule_reminder_sms").default(false),
  
  // Global settings
  globalInApp: boolean("global_in_app").default(true),
  globalEmail: boolean("global_email").default(true),
  globalSms: boolean("global_sms").default(false),
  
  // Quiet hours
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: time("quiet_hours_start").default("22:00"),
  quietHoursEnd: time("quiet_hours_end").default("07:00"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for notifications
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for notifications
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

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

// Time Clock Task Triggers Zod schemas
export const insertTimeClockTaskTriggerSchema = createInsertSchema(timeClockTaskTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Time Clock Task Triggers Types
export type TimeClockTaskTrigger = typeof timeClockTaskTriggers.$inferSelect;
export type InsertTimeClockTaskTrigger = z.infer<typeof insertTimeClockTaskTriggerSchema>;


// Task Notification types
export const insertTaskNotificationSchema = createInsertSchema(taskNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});
export type InsertTaskNotification = z.infer<typeof insertTaskNotificationSchema>;
export type SelectTaskNotification = typeof taskNotifications.$inferSelect;

// Meetings and Screen Sharing System
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  hostId: integer("host_user_id").notNull().references(() => users.id),
  
  // Meeting details
  title: text("title").notNull(),
  description: text("description"),
  
  // Meeting status and timing
  status: text("status"),
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // WebRTC and connection settings
  meetingUrl: text("meeting_url"),
  isRecording: boolean("is_recording"),
  maxParticipants: integer("max_participants"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Participant role and permissions
  role: text("role").notNull().default("participant"), // 'host', 'co_host', 'participant'
  
  // Waiting room functionality
  status: text("status").notNull().default("waiting"), // 'waiting', 'admitted', 'denied', 'left'
  admittedAt: timestamp("admitted_at"), // When host admitted them
  admittedBy: integer("admitted_by").references(() => users.id), // Host who admitted them
  
  // Join/leave tracking
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
});

export const meetingMessages = pgTable("meeting_messages", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  
  // Message content
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text', 'system', 'file', 'emoji'
  isPrivate: boolean("is_private").default(false), // Private message to host
  recipientId: integer("recipient_id").references(() => users.id), // For private messages
  
  // File attachments
  attachments: jsonb("attachments"), // Array of file objects
  
  sentAt: timestamp("sent_at").defaultNow(),
});

export const meetingRecordings = pgTable("meeting_recordings", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Recording details
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(), // Cloud storage path
  fileSize: integer("file_size"), // in bytes
  duration: integer("duration"), // in seconds
  format: text("format").default("mp4"), // 'mp4', 'webm'
  quality: text("quality").default("720p"), // '480p', '720p', '1080p'
  
  // Recording metadata
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at").notNull(),
  startedBy: integer("started_by").notNull().references(() => users.id),
  
  // Access control
  isPublic: boolean("is_public").default(false), // Accessible to all org members
  downloadUrl: text("download_url"), // Signed URL for download
  viewUrl: text("view_url"), // Signed URL for viewing
  expiresAt: timestamp("expires_at"), // When URLs expire
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema validation for meetings
export const insertMeetingSchema = createInsertSchema(meetings, {
  scheduledStartTime: z.string().transform((str) => new Date(str)).optional(),
  scheduledEndTime: z.string().transform((str) => new Date(str)).optional(),
}).omit({
  id: true,
  organizationId: true,
  hostId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingParticipantSchema = createInsertSchema(meetingParticipants).omit({
  id: true,
  admittedAt: true,
  admittedBy: true,
  joinedAt: true,
  leftAt: true,
});

export const insertMeetingMessageSchema = createInsertSchema(meetingMessages).omit({
  id: true,
  sentAt: true,
});

export const insertMeetingRecordingSchema = createInsertSchema(meetingRecordings).omit({
  id: true,
  createdAt: true,
});

// Types
export type Meeting = typeof meetings.$inferSelect;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type MeetingMessage = typeof meetingMessages.$inferSelect;
export type MeetingRecording = typeof meetingRecordings.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertMeetingParticipant = z.infer<typeof insertMeetingParticipantSchema>;
export type InsertMeetingMessage = z.infer<typeof insertMeetingMessageSchema>;
export type InsertMeetingRecording = z.infer<typeof insertMeetingRecordingSchema>;

// Organization-specific Call Manager Insert Schemas
export const insertOrganizationTwilioSettingsSchema = createInsertSchema(organizationTwilioSettings, {
  organizationId: z.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationCallAnalyticsSchema = createInsertSchema(organizationCallAnalytics, {
  organizationId: z.number(),
  periodStart: z.string().transform((str) => new Date(str)),
  periodEnd: z.string().transform((str) => new Date(str)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Organization-specific Call Manager Types  
export type OrganizationTwilioSettings = typeof organizationTwilioSettings.$inferSelect;
export type InsertOrganizationTwilioSettings = z.infer<typeof insertOrganizationTwilioSettingsSchema>;

export type OrganizationCallAnalytics = typeof organizationCallAnalytics.$inferSelect;
export type InsertOrganizationCallAnalytics = z.infer<typeof insertOrganizationCallAnalyticsSchema>;

// Live Streaming tables
export const streamSessions = pgTable("stream_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  streamerId: integer("streamer_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  status: varchar("status").notNull().default("active"), // active, ended
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  recordingUrl: varchar("recording_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const streamViewers = pgTable("stream_viewers", {
  id: serial("id").primaryKey(),
  streamId: varchar("stream_id").references(() => streamSessions.id),
  userId: integer("user_id").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
});

export const streamInvitations = pgTable("stream_invitations", {
  id: serial("id").primaryKey(),
  streamId: varchar("stream_id").notNull().references(() => streamSessions.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  invitedById: integer("invited_by_id").notNull().references(() => users.id),
  invitedUserId: integer("invited_user_id").notNull().references(() => users.id),
  
  // Invitation details
  message: text("message"),
  role: text("role").notNull().default("viewer"), // viewer, moderator, co-host
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, accepted, declined, expired
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  
  // Notification settings
  notificationSent: boolean("notification_sent").default(false),
  emailSent: boolean("email_sent").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const streamNotifications = pgTable("stream_notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  streamId: varchar("stream_id").references(() => streamSessions.id, { onDelete: "cascade" }),
  invitationId: integer("invitation_id").references(() => streamInvitations.id, { onDelete: "cascade" }),
  
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // stream_started, stream_ended, invitation_received, viewer_joined
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Delivery tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  deliveredViaWebSocket: boolean("delivered_via_websocket").default(false),
  deliveredViaEmail: boolean("delivered_via_email").default(false),
  
  // Metadata
  metadata: jsonb("metadata"), // Additional notification data
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stream schema validation
export const insertStreamSessionSchema = createInsertSchema(streamSessions, {
  title: z.string().min(1, "Stream title is required"),
}).omit({
  id: true,
  streamerId: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStreamViewerSchema = createInsertSchema(streamViewers).omit({
  id: true,
  joinedAt: true,
});

// Stream invitation schemas
export const insertStreamInvitationSchema = createInsertSchema(streamInvitations, {
  message: z.string().optional(),
  role: z.enum(['viewer', 'moderator', 'co-host']).default('viewer'),
  expiresAt: z.string().optional(),
}).omit({
  id: true,
  status: true,
  sentAt: true,
  respondedAt: true,
  notificationSent: true,
  emailSent: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStreamNotificationSchema = createInsertSchema(streamNotifications, {
  type: z.enum(['stream_started', 'stream_ended', 'invitation_received', 'viewer_joined']),
  title: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  isRead: true,
  readAt: true,
  deliveredViaWebSocket: true,
  deliveredViaEmail: true,
  createdAt: true,
  updatedAt: true,
});

// Stream Types
export type StreamSession = typeof streamSessions.$inferSelect;
export type InsertStreamSession = z.infer<typeof insertStreamSessionSchema>;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type InsertStreamViewer = z.infer<typeof insertStreamViewerSchema>;
export type StreamInvitation = typeof streamInvitations.$inferSelect;
export type InsertStreamInvitation = z.infer<typeof insertStreamInvitationSchema>;
export type StreamNotification = typeof streamNotifications.$inferSelect;
export type InsertStreamNotification = z.infer<typeof insertStreamNotificationSchema>;

// GPS Tracking Tables
export const gpsTrackingData = pgTable("gps_tracking_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  speed: decimal("speed", { precision: 6, scale: 2 }), // in meters per second
  heading: decimal("heading", { precision: 6, scale: 2 }), // in degrees
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // in meters
  timestamp: timestamp("timestamp").notNull(),
  address: text("address"), // reverse geocoded address
  deviceType: text("device_type").default("mobile"), // mobile, desktop, tablet
  batteryLevel: integer("battery_level"), // 0-100
  isInsideGeofence: boolean("is_inside_geofence").default(false),
  jobSiteId: integer("job_site_id").references(() => projects.id), // null if not at job site
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobSiteGeofences = pgTable("job_site_geofences", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  centerLatitude: decimal("center_latitude", { precision: 10, scale: 7 }).notNull(),
  centerLongitude: decimal("center_longitude", { precision: 10, scale: 7 }).notNull(),
  radius: integer("radius").notNull().default(100), // radius in meters
  address: text("address").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobSiteEvents = pgTable("job_site_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  geofenceId: integer("geofence_id").notNull().references(() => jobSiteGeofences.id),
  eventType: text("event_type").notNull(), // 'arrival', 'departure'
  eventTime: timestamp("event_time").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  address: text("address"),
  durationMinutes: integer("duration_minutes"), // calculated for departure events
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Smart Capture Inventory Lists - allows creation of custom inventory lists
export const smartCaptureLists = pgTable("smart_capture_lists", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id), // Link to project for Smart Capture automated invoicing
  
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, archived
  
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Smart Capture Items - individual inventory items in lists
export const smartCaptureItems = pgTable("smart_capture_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").references(() => smartCaptureLists.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id), // Optional: link to specific job/project
  
  // Core item identification fields
  partNumber: text("part_number"),
  vehicleNumber: text("vehicle_number"), 
  inventoryNumber: text("inventory_number"),
  
  // Pricing and inventory details
  masterPrice: decimal("master_price", { precision: 10, scale: 2 }).notNull(),
  location: text("location").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  quantity: integer("quantity").notNull().default(1),
  description: text("description"),
  notes: text("notes"),
  image: text("image"), // URL or path to uploaded image
  
  // Master item linking - for project items to reference master items
  masterItemId: integer("master_item_id").references(() => smartCaptureItems.id, { onDelete: "set null" }), // Links project items to master items
  masterPriceSnapshot: decimal("master_price_snapshot", { precision: 10, scale: 2 }), // Snapshot of master price when linked
  
  // Optional references to existing data
  derivedPartId: integer("derived_part_id").references(() => partsSupplies.id),
  derivedVehicleId: integer("derived_vehicle_id").references(() => vehicles.id),
  
  // User attribution
  submittedBy: integer("submitted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Smart Capture insert schemas
export const insertSmartCaptureListSchema = createInsertSchema(smartCaptureLists, {
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  projectId: z.number().optional(), // Optional link to project for Smart Capture automated invoicing
}).omit({
  id: true,
  organizationId: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmartCaptureItemSchema = createInsertSchema(smartCaptureItems, {
  partNumber: z.string().optional(),
  vehicleNumber: z.string().optional(),
  inventoryNumber: z.string().optional(),
  masterPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Master price must be a positive number"),
  location: z.string().min(1, "Location is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  image: z.string().optional(), // URL or path to uploaded image
}).omit({
  id: true,
  listId: true,
  organizationId: true,
  projectId: true,
  masterItemId: true,
  masterPriceSnapshot: true,
  derivedPartId: true,
  derivedVehicleId: true,
  submittedBy: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => data.partNumber || data.vehicleNumber || data.inventoryNumber, {
  message: "At least one of part number, vehicle number, or inventory number is required",
});

// Smart Capture Integration API schemas
export const linkSmartCaptureSchema = z.object({
  masterItemId: z.number().int().positive("Master item ID must be a positive integer"),
});

export const searchSmartCaptureSchema = z.object({
  query: z.string().optional(),
  partNumber: z.string().trim().optional(),
  vehicleNumber: z.string().trim().optional(), 
  inventoryNumber: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// GPS Tracking insert schemas
export const insertGpsTrackingDataSchema = createInsertSchema(gpsTrackingData, {
  latitude: z.string().refine((val) => !isNaN(Number(val)), "Latitude must be a number"),
  longitude: z.string().refine((val) => !isNaN(Number(val)), "Longitude must be a number"),
  accuracy: z.string().optional().refine((val) => !val || !isNaN(Number(val)), "Accuracy must be a number"),
  speed: z.string().optional().refine((val) => !val || !isNaN(Number(val)), "Speed must be a number"),
  heading: z.string().optional().refine((val) => !val || !isNaN(Number(val)), "Heading must be a number"),
  altitude: z.string().optional().refine((val) => !val || !isNaN(Number(val)), "Altitude must be a number"),
  timestamp: z.string().datetime(),
}).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertJobSiteGeofenceSchema = createInsertSchema(jobSiteGeofences, {
  centerLatitude: z.string().refine((val) => !isNaN(Number(val)), "Latitude must be a number"),
  centerLongitude: z.string().refine((val) => !isNaN(Number(val)), "Longitude must be a number"),
  radius: z.number().int().min(50).max(1000).default(100),
  address: z.string().min(1, "Address is required"),
}).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSiteEventSchema = createInsertSchema(jobSiteEvents, {
  eventType: z.enum(['arrival', 'departure']),
  eventTime: z.string().datetime(),
  latitude: z.string().refine((val) => !isNaN(Number(val)), "Latitude must be a number"),
  longitude: z.string().refine((val) => !isNaN(Number(val)), "Longitude must be a number"),
}).omit({
  id: true,
  organizationId: true,
  durationMinutes: true,
  notificationSent: true,
  createdAt: true,
});

// OBD GPS Tracking Tables
export const obdLocationData = pgTable("obd_location_data", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  deviceId: text("device_id").notNull(), // OBD device identifier
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }), // mph
  heading: decimal("heading", { precision: 5, scale: 2 }), // degrees
  altitude: decimal("altitude", { precision: 7, scale: 2 }), // meters
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // meters
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const obdDiagnosticData = pgTable("obd_diagnostic_data", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  deviceId: text("device_id").notNull(),
  rpm: integer("rpm"), // Engine RPM
  engineTemp: decimal("engine_temp", { precision: 5, scale: 2 }), // Celsius
  coolantTemp: decimal("coolant_temp", { precision: 5, scale: 2 }), // Celsius
  fuelLevel: decimal("fuel_level", { precision: 5, scale: 2 }), // Percentage
  batteryVoltage: decimal("battery_voltage", { precision: 4, scale: 2 }), // Volts
  throttlePosition: decimal("throttle_position", { precision: 5, scale: 2 }), // Percentage
  engineLoad: decimal("engine_load", { precision: 5, scale: 2 }), // Percentage
  maf: decimal("maf", { precision: 6, scale: 2 }), // Mass Air Flow (g/s)
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const obdTrips = pgTable("obd_trips", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  deviceId: text("device_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  startLatitude: decimal("start_latitude", { precision: 10, scale: 8 }),
  startLongitude: decimal("start_longitude", { precision: 11, scale: 8 }),
  endLatitude: decimal("end_latitude", { precision: 10, scale: 8 }),
  endLongitude: decimal("end_longitude", { precision: 11, scale: 8 }),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  distanceMiles: decimal("distance_miles", { precision: 10, scale: 2 }),
  durationMinutes: integer("duration_minutes"),
  averageSpeed: decimal("average_speed", { precision: 5, scale: 2 }), // mph
  maxSpeed: decimal("max_speed", { precision: 5, scale: 2 }), // mph
  status: text("status").default("active"), // active, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for OBD tables
export const insertObdLocationDataSchema = createInsertSchema(obdLocationData, {
  deviceId: z.string().min(1, "Device ID is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitude: z.number().optional(),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().or(z.date()),
}).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertObdDiagnosticDataSchema = createInsertSchema(obdDiagnosticData, {
  deviceId: z.string().min(1, "Device ID is required"),
  rpm: z.number().int().min(0).max(10000).optional(),
  engineTemp: z.number().optional(),
  coolantTemp: z.number().optional(),
  fuelLevel: z.number().min(0).max(100).optional(),
  batteryVoltage: z.number().min(0).max(20).optional(),
  throttlePosition: z.number().min(0).max(100).optional(),
  engineLoad: z.number().min(0).max(100).optional(),
  maf: z.number().min(0).optional(),
  timestamp: z.string().datetime().or(z.date()),
}).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertObdTripSchema = createInsertSchema(obdTrips, {
  deviceId: z.string().min(1, "Device ID is required"),
  startTime: z.string().datetime().or(z.date()),
  endTime: z.string().datetime().or(z.date()).optional(),
}).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

// OBD types
export type ObdLocationData = typeof obdLocationData.$inferSelect;
export type InsertObdLocationData = z.infer<typeof insertObdLocationDataSchema>;
export type ObdDiagnosticData = typeof obdDiagnosticData.$inferSelect;
export type InsertObdDiagnosticData = z.infer<typeof insertObdDiagnosticDataSchema>;
export type ObdTrip = typeof obdTrips.$inferSelect;
export type InsertObdTrip = z.infer<typeof insertObdTripSchema>;

// GPS Tracking types
export type GpsTrackingData = typeof gpsTrackingData.$inferSelect;
export type InsertGpsTrackingData = z.infer<typeof insertGpsTrackingDataSchema>;
export type JobSiteGeofence = typeof jobSiteGeofences.$inferSelect;
export type InsertJobSiteGeofence = z.infer<typeof insertJobSiteGeofenceSchema>;
export type JobSiteEvent = typeof jobSiteEvents.$inferSelect;
export type InsertJobSiteEvent = z.infer<typeof insertJobSiteEventSchema>;

// Smart Capture types
export type SmartCaptureList = typeof smartCaptureLists.$inferSelect;
export type InsertSmartCaptureList = z.infer<typeof insertSmartCaptureListSchema>;
export type SmartCaptureItem = typeof smartCaptureItems.$inferSelect;
export type InsertSmartCaptureItem = z.infer<typeof insertSmartCaptureItemSchema>;
export type LinkSmartCapture = z.infer<typeof linkSmartCaptureSchema>;
export type SearchSmartCapture = z.infer<typeof searchSmartCaptureSchema>;
