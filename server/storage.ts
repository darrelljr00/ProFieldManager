import { db } from "./db";
import { ensureOrganizationFolders } from "./folderCreation";
import { 
  users, customers, invoices, quotes, quoteLineItems, payments, projects, tasks, taskGroups, taskTemplates,
  expenses, expenseCategories, vendors, expenseReports, gasCards, 
  gasCardAssignments, gasCardUsage, gasCardProviders, leads, calendarJobs, messages,
  images, settings, organizations, userSessions, subscriptionPlans,
  projectFiles, projectWaivers, fileManager, fileFolders, projectUsers, timeClock, timeClockSettings,
  internalMessages, internalMessageRecipients, messageGroups, messageGroupMembers,
  inspectionTemplates, inspectionItems, inspectionRecords, inspectionResponses, inspectionNotifications,
  smsMessages, smsTemplates, sharedPhotoLinks, fileSecuritySettings, fileSecurityScans, fileAccessLogs,
  digitalSignatures, documentSignatureFields, departments, employees, employeeDocuments, timeOffRequests, performanceReviews, disciplinaryActions,
  navigationOrder, backupSettings, backupJobs, partsSupplies, partsCategories, inventoryTransactions, stockAlerts,
  filePermissions, folderPermissions, defaultPermissions, userDashboardSettings, dashboardProfiles, vehicles,
  vehicleMaintenanceIntervals, vehicleMaintenanceRecords, vehicleJobAssignments, timeClockTaskTriggers,
  taskTriggers, taskTriggerInstances, taskTriggerSettings, frontendPages, frontendSliders, frontendComponents,
  frontendIcons, frontendBoxes, frontendCategories, tutorials, tutorialProgress, tutorialCategories, leadSettings,
  meetings, meetingParticipants, meetingMessages, meetingRecordings, phoneNumbers,
  callRecords, callRecordings, callTranscripts, voicemails, callQueues, 
  organizationTwilioSettings, organizationCallAnalytics
} from "@shared/schema";
import { marketResearchCompetitors } from "@shared/schema";
import type { GasCard, InsertGasCard, GasCardAssignment, InsertGasCardAssignment, GasCardUsage, InsertGasCardUsage, GasCardProvider, InsertGasCardProvider } from "@shared/schema";
import { eq, and, desc, asc, like, or, sql, gt, gte, lte, inArray, isNotNull, isNull, exists, ne, not, notInArray, lt, ilike, count, sum, avg, max, min } from "drizzle-orm";
import type { 
  User, Customer, Invoice, Quote, Project, Task, 
  Expense, ExpenseCategory, ExpenseReport, GasCard,
  Lead, CalendarJob, Message, Organization, Department,
  Employee, TimeOffRequest, PerformanceReview, DisciplinaryAction,
  NavigationOrder, InsertNavigationOrder, BackupSettings, BackupJob,
  Meeting, MeetingParticipant, MeetingMessage, MeetingRecording,
  InsertMeeting, InsertMeetingParticipant, InsertMeetingMessage, InsertMeetingRecording
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  updateUser(id: number, updates: any): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(organizationId?: number): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUserStats(organizationId?: number): Promise<any>;
  
  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  createOrganization(orgData: any): Promise<Organization>;
  updateOrganization(id: number, updates: any): Promise<Organization>;
  getAllOrganizations(): Promise<Organization[]>;
  getAllOrganizationsWithDetails(): Promise<any[]>;
  getOrganizationUsage(organizationId: number): Promise<any>;
  
  // Customer methods
  getCustomers(organizationId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string, organizationId: number): Promise<Customer | undefined>;
  createCustomer(customerData: any): Promise<Customer>;
  updateCustomer(id: number, userId: number, updates: any): Promise<Customer>;
  deleteCustomer(id: number, userId: number): Promise<boolean>;
  
  // Invoice methods
  getInvoices(organizationId: number): Promise<any[]>;
  createInvoice(invoiceData: any): Promise<any>;
  createUploadedInvoice(invoiceData: any): Promise<any>;
  updateInvoice(id: number, updates: any): Promise<any>;
  updateInvoiceStatus(invoiceId: number, status: string, paymentMethod?: string, paidAt?: Date): Promise<any>;
  deleteInvoice(id: number): Promise<void>;
  getInvoiceStats(organizationId: number): Promise<any>;
  
  // Quote methods
  getQuotes(organizationId: number): Promise<any[]>;
  getQuote(id: number, organizationId: number): Promise<any>;
  createQuote(quoteData: any): Promise<any>;
  updateQuote(id: number, organizationId: number, updates: any): Promise<any>;
  deleteQuote(id: number, organizationId: number): Promise<boolean>;
  
  // Project/Job methods
  getProjects(organizationId: number, userId?: number, userRole?: string, status?: string): Promise<any[]>;
  getProject(id: number, userId: number): Promise<any>;
  deleteProject(id: number, userId: number): Promise<boolean>;
  cancelProject(id: number, userId: number): Promise<boolean>;
  getDeletedProjects(organizationId: number, userId?: number): Promise<any[]>;
  getCancelledProjects(organizationId: number, userId?: number): Promise<any[]>;
  restoreProject(id: number, userId: number): Promise<boolean>;
  getProjectById(id: number): Promise<any>;
  getProjectsWithLocation(userId: number): Promise<any[]>;
  createProject(projectData: any): Promise<any>;
  updateProject(id: number, updates: any): Promise<any>;
  assignUserToProject(userId: number, projectId: number, role?: string): Promise<any>;
  removeUserFromProject(userId: number, projectId: number): Promise<void>;
  
  // Project waiver methods
  attachWaiversToProject(projectId: number, waiverIds: number[], attachedBy: number): Promise<void>;
  getProjectWaivers(projectId: number): Promise<any[]>;
  removeWaiverFromProject(projectId: number, fileId: number): Promise<void>;
  
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
  
  // Payment methods
  getPayments(userId: number): Promise<any[]>;
  createPayment(paymentData: any): Promise<any>;
  
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
  
  // Subscription plan management methods
  getAllSubscriptionPlans(): Promise<any[]>;
  getSubscriptionPlan(id: number): Promise<any>;
  createSubscriptionPlan(planData: any): Promise<any>;
  updateSubscriptionPlan(id: number, updates: any): Promise<any>;
  deleteSubscriptionPlan(id: number): Promise<void>;
  
  // Plan feature management methods
  getPlanFeatures(): Promise<any[]>;
  createPlanFeature(featureData: any): Promise<any>;
  updatePlanFeature(id: number, updates: any): Promise<any>;
  deletePlanFeature(id: number): Promise<void>;
  
  // Plan feature value management methods
  getPlanFeatureValues(planId: number): Promise<any[]>;
  setPlanFeatureValue(planId: number, featureId: number, value: any): Promise<any>;
  deletePlanFeatureValue(planId: number, featureId: number): Promise<void>;
  
  // File methods
  getFiles(organizationId: number, folderId?: number): Promise<any[]>;
  getAllFiles(): Promise<any[]>;
  getFile(id: number, organizationId: number): Promise<any>;
  createFile(fileData: any): Promise<any>;
  uploadFile(fileData: any): Promise<any>;
  updateFile(id: number, updates: any): Promise<any>;
  updateFileLocation(id: number, filePath: string, fileUrl: string, useS3: boolean): Promise<any>;
  deleteFile(id: number): Promise<void>;
  createTextFile(organizationId: number, userId: number, name: string, content: string, folderId?: number): Promise<any>;
  updateTextFile(id: number, content: string): Promise<any>;
  convertToPdf(fileId: number, organizationId: number): Promise<string>;
  uploadProjectFile(fileData: any): Promise<any>;
  getProjectFiles(projectId: number, userId: number): Promise<any[]>;
  getProjectFile(fileId: number, userId: number): Promise<any>;
  deleteProjectFile(fileId: number, userId: number): Promise<boolean>;
  
  // Folder methods
  getFolders(organizationId: number, parentId?: number): Promise<any[]>;
  createFolder(folderData: any): Promise<any>;
  updateFolder(id: number, updates: any): Promise<any>;
  deleteFolder(id: number): Promise<void>;
  
  // Drag and drop methods
  moveFileToFolder(fileId: number, folderId: number | null, userId: number): Promise<{ file: any; previousFolderId: number | null }>;
  undoFileMove(fileId: number, previousFolderId: number | null, userId: number): Promise<any>;
  
  // File and Folder Permissions methods
  getFilePermissions(fileId: number, organizationId: number): Promise<any[]>;
  getFolderPermissions(folderId: number, organizationId: number): Promise<any[]>;
  createFilePermission(permissionData: any): Promise<any>;
  createFolderPermission(permissionData: any): Promise<any>;
  updateFilePermission(id: number, updates: any): Promise<any>;
  updateFolderPermission(id: number, updates: any): Promise<any>;
  deleteFilePermission(id: number): Promise<boolean>;
  deleteFolderPermission(id: number): Promise<boolean>;
  getUserFilePermissions(userId: number, fileId: number, organizationId: number): Promise<any>;
  getUserFolderPermissions(userId: number, folderId: number, organizationId: number): Promise<any>;
  getDefaultPermissions(organizationId: number): Promise<any[]>;
  setDefaultPermissions(organizationId: number, userRole: string, resourceType: string, permissions: any): Promise<any>;
  checkFileAccess(userId: number, fileId: number, organizationId: number, action: string): Promise<boolean>;
  checkFolderAccess(userId: number, folderId: number, organizationId: number, action: string): Promise<boolean>;
  
  // Dashboard Profile methods
  getDashboardProfiles(): Promise<any[]>;
  getDashboardProfile(profileType: string): Promise<any>;
  createDashboardProfile(profileData: any): Promise<any>;
  updateDashboardProfile(id: number, updates: any): Promise<any>;
  updateUserDashboardSettings(userId: number, organizationId: number, settings: any): Promise<any>;
  applyDashboardProfile(userId: number, organizationId: number, profileType: string): Promise<any>;
  
  // Image methods
  createImage(imageData: any): Promise<any>;
  getImages(userId: number): Promise<any[]>;
  getImageById(imageId: number): Promise<any>;
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
  getAllTasks(organizationId: number): Promise<any[]>;
  createTask(taskData: any): Promise<any>;
  createTaskForOrganization(organizationId: number, taskData: any, userId: number): Promise<any>;
  canUserDelegateTask(userId: number, assignedToId: number): Promise<boolean>;
  updateTask(id: number, userId: number, updates: any): Promise<any>;
  deleteTask(id: number): Promise<void>;
  
  // Task Group methods
  getTaskGroups(organizationId: number): Promise<any[]>;
  getTaskGroup(id: number, organizationId: number): Promise<any>;
  createTaskGroup(groupData: any): Promise<any>;
  updateTaskGroup(id: number, organizationId: number, updates: any): Promise<any>;
  deleteTaskGroup(id: number, organizationId: number): Promise<boolean>;
  
  // Task Template methods
  getTaskTemplates(taskGroupId: number): Promise<any[]>;
  getTaskTemplate(id: number): Promise<any>;
  createTaskTemplate(templateData: any): Promise<any>;
  updateTaskTemplate(id: number, updates: any): Promise<any>;
  deleteTaskTemplate(id: number): Promise<boolean>;
  createTasksFromGroup(projectId: number, taskGroupId: number, userId: number): Promise<any[]>;
  
  // GPS tracking methods
  createGPSSession(sessionData: any): Promise<any>;
  getGPSSessions(organizationId: number): Promise<any[]>;
  getGPSStats(organizationId: number): Promise<any>;
  
  // SMS and Review methods
  getSmsMessages(organizationId: number): Promise<any[]>;
  createSmsMessage(messageData: any): Promise<any>;
  getSmsTemplates(organizationId: number): Promise<any[]>;
  createSmsTemplate(templateData: any): Promise<any>;
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
  
  // Gas card usage tracking methods
  getGasCardUsage(organizationId: number, cardId?: number, startDate?: Date, endDate?: Date): Promise<GasCardUsage[]>;
  createGasCardUsage(data: InsertGasCardUsage): Promise<GasCardUsage>;
  updateGasCardUsage(id: number, data: Partial<InsertGasCardUsage>): Promise<GasCardUsage>;
  deleteGasCardUsage(id: number): Promise<boolean>;
  approveGasCardUsage(id: number, approvedBy: number): Promise<GasCardUsage>;
  
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
  
  // Time clock task trigger methods
  getTimeClockTaskTriggers(organizationId: number, userId?: number): Promise<any[]>;
  getTimeClockTaskTrigger(id: number, organizationId: number): Promise<any>;
  createTimeClockTaskTrigger(triggerData: any): Promise<any>;
  updateTimeClockTaskTrigger(id: number, organizationId: number, updates: any): Promise<any>;
  deleteTimeClockTaskTrigger(id: number, organizationId: number): Promise<boolean>;
  getActiveTriggersForEvent(organizationId: number, triggerEvent: string, userId?: number): Promise<any[]>;
  processTriggerForTimeClockEvent(userId: number, organizationId: number, triggerEvent: string, eventData?: any): Promise<void>;
  
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
  
  // Shared photo link methods
  createSharedPhotoLink(linkData: any): Promise<any>;
  getSharedPhotoLinks(userId: number): Promise<any[]>;
  getSharedPhotoLink(token: string): Promise<any>;
  updateSharedPhotoLinkAccess(token: string): Promise<any>;
  deactivateSharedPhotoLink(linkId: number, userId: number): Promise<boolean>;
  deleteSharedPhotoLink(linkId: number, userId: number): Promise<boolean>;
  
  // Image annotation methods
  saveImageAnnotations(imageId: number, userId: number, annotations: any, annotatedImageUrl: string): Promise<any>;
  
  // File security methods
  getFileSecuritySettings(organizationId: number): Promise<any>;
  updateFileSecuritySettings(organizationId: number, settings: any): Promise<any>;
  createFileSecurityScan(scanData: any): Promise<any>;
  getFileSecurityScans(organizationId: number, limit?: number): Promise<any[]>;
  getFileSecurityStats(organizationId: number): Promise<any>;
  logFileAccess(accessData: any): Promise<any>;
  
  // Navigation order methods
  getNavigationOrder(userId: number, organizationId: number): Promise<NavigationOrder | undefined>;
  saveNavigationOrder(userId: number, organizationId: number, navigationItems: string[]): Promise<NavigationOrder>;
  resetNavigationOrder(userId: number, organizationId: number): Promise<boolean>;
  getFileAccessLogs(organizationId: number, limit?: number): Promise<any[]>;
  
  // File integrity methods
  getAllProjectFiles(): Promise<any[]>;
  deleteProjectFile(fileId: number): Promise<boolean>;
  
  // Digital signature methods
  createDigitalSignature(signatureData: any): Promise<any>;
  getProjectSignatures(projectId: number): Promise<any[]>;
  deleteSignature(signatureId: number): Promise<boolean>;
  
  // Department methods
  getDepartments(organizationId: number): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(departmentData: any): Promise<Department>;
  updateDepartment(id: number, updates: any): Promise<Department>;
  deleteDepartment(id: number): Promise<boolean>;

  // Employee methods
  getEmployees(organizationId: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: number): Promise<Employee | undefined>;
  createEmployee(employeeData: any): Promise<Employee>;
  updateEmployee(id: number, updates: any): Promise<Employee>;
  deleteEmployee(id: number): Promise<boolean>;
  
  // Employee Document methods
  getEmployeeDocuments(employeeId: number, organizationId: number): Promise<any[]>;
  getEmployeeDocument(id: number, organizationId: number): Promise<any | undefined>;
  createEmployeeDocument(documentData: any): Promise<any>;
  updateEmployeeDocument(id: number, updates: any): Promise<any>;
  deleteEmployeeDocument(id: number): Promise<boolean>;
  
  // Time off request methods
  getTimeOffRequests(organizationId: number, employeeId?: number): Promise<TimeOffRequest[]>;
  createTimeOffRequest(requestData: any): Promise<TimeOffRequest>;
  updateTimeOffRequest(id: number, updates: any): Promise<TimeOffRequest>;
  approveTimeOffRequest(id: number, approvedBy: number): Promise<TimeOffRequest>;
  rejectTimeOffRequest(id: number, approvedBy: number, reason: string): Promise<TimeOffRequest>;
  
  // Performance review methods
  getPerformanceReviews(organizationId: number, employeeId?: number): Promise<PerformanceReview[]>;
  createPerformanceReview(reviewData: any): Promise<PerformanceReview>;
  updatePerformanceReview(id: number, updates: any): Promise<PerformanceReview>;
  
  // Backup methods
  getBackupSettings(organizationId: number): Promise<BackupSettings | undefined>;
  createBackupSettings(settingsData: any): Promise<BackupSettings>;
  updateBackupSettings(organizationId: number, updates: any): Promise<BackupSettings>;
  getBackupJobs(organizationId: number, limit?: number): Promise<BackupJob[]>;
  createBackupJob(jobData: any): Promise<BackupJob>;
  updateBackupJob(id: number, updates: any): Promise<BackupJob>;
  createManualBackup(organizationId: number, userId: number, options: any): Promise<any>;
  
  // Disciplinary action methods
  getDisciplinaryActions(organizationId: number, employeeId?: number): Promise<DisciplinaryAction[]>;
  createDisciplinaryAction(actionData: any): Promise<DisciplinaryAction>;
  updateDisciplinaryAction(id: number, updates: any): Promise<DisciplinaryAction>;

  // Navigation order methods
  getNavigationOrder(userId: number, organizationId: number): Promise<NavigationOrder | undefined>;
  saveNavigationOrder(userId: number, organizationId: number, navigationItems: string[]): Promise<NavigationOrder>;
  resetNavigationOrder(userId: number, organizationId: number): Promise<boolean>;

  // Parts and Supplies Inventory methods
  getPartsSupplies(organizationId: number): Promise<any[]>;
  getPartSupply(id: number, organizationId: number): Promise<any>;
  createPartSupply(partData: any): Promise<any>;
  updatePartSupply(id: number, updates: any): Promise<any>;
  deletePartSupply(id: number): Promise<boolean>;
  updatePartStock(partId: number, newStock: number, userId: number, reason?: string): Promise<any>;

  // Parts Categories methods
  getPartsCategories(organizationId: number): Promise<any[]>;
  createPartsCategory(categoryData: any): Promise<any>;
  updatePartsCategory(id: number, updates: any): Promise<any>;
  deletePartsCategory(id: number): Promise<boolean>;

  // Inventory Transaction methods
  getInventoryTransactions(organizationId: number, partId?: number): Promise<any[]>;
  createInventoryTransaction(transactionData: any): Promise<any>;

  // Stock Alert methods
  getStockAlerts(organizationId: number, activeOnly?: boolean): Promise<any[]>;
  createStockAlert(alertData: any): Promise<any>;
  acknowledgeStockAlert(alertId: number, userId: number): Promise<any>;
  checkAndCreateLowStockAlerts(organizationId: number): Promise<any[]>;
  
  // Market Research Competitors methods
  getMarketResearchCompetitors(organizationId: number, businessNiche?: string): Promise<any[]>;
  getMarketResearchCompetitor(id: number, organizationId: number): Promise<any>;
  createMarketResearchCompetitor(competitorData: any): Promise<any>;
  updateMarketResearchCompetitor(id: number, updates: any): Promise<any>;
  deleteMarketResearchCompetitor(id: number): Promise<void>;
  
  // Task Group methods
  getTaskGroups(organizationId: number): Promise<any[]>;
  getTaskGroup(id: number, organizationId: number): Promise<any>;
  createTaskGroup(groupData: any): Promise<any>;
  updateTaskGroup(id: number, organizationId: number, updates: any): Promise<any>;
  deleteTaskGroup(id: number, organizationId: number): Promise<boolean>;
  
  // Task Template methods
  getTaskTemplates(taskGroupId: number): Promise<any[]>;
  getTaskTemplate(id: number): Promise<any>;
  createTaskTemplate(templateData: any): Promise<any>;
  updateTaskTemplate(id: number, updates: any): Promise<any>;
  deleteTaskTemplate(id: number): Promise<boolean>;
  createTasksFromGroup(projectId: number, taskGroupId: number, userId: number): Promise<any[]>;
  
  // Vehicle Management methods
  getVehicles(organizationId: number): Promise<any[]>;
  getVehicle(id: number, organizationId: number): Promise<any>;
  createVehicle(vehicleData: any): Promise<any>;
  updateVehicle(id: number, organizationId: number, updates: any): Promise<any>;
  deleteVehicle(id: number, organizationId: number): Promise<boolean>;
  getVehicleByNumber(vehicleNumber: string, organizationId: number): Promise<any>;
  getVehicleByLicensePlate(licensePlate: string, organizationId: number): Promise<any>;
  
  // Vehicle Maintenance Interval methods
  getVehicleMaintenanceIntervals(vehicleId: number, organizationId: number): Promise<any[]>;
  createVehicleMaintenanceInterval(intervalData: any): Promise<any>;
  updateVehicleMaintenanceInterval(id: number, organizationId: number, updates: any): Promise<any>;
  deleteVehicleMaintenanceInterval(id: number, organizationId: number): Promise<boolean>;
  createDefaultMaintenanceIntervals(vehicleId: number, organizationId: number): Promise<any[]>;
  createCustomMaintenanceIntervals(vehicleId: number, organizationId: number, customIntervals: any[]): Promise<any[]>;
  
  // Vehicle Maintenance Record methods
  getVehicleMaintenanceRecords(vehicleId: number, organizationId: number): Promise<any[]>;
  createVehicleMaintenanceRecord(recordData: any): Promise<any>;
  updateMaintenanceStatus(intervalId: number, organizationId: number, status: string): Promise<any>;
  getMaintenanceStatusForVehicle(vehicleId: number, organizationId: number): Promise<any[]>;
  
  // Vehicle Job Assignment methods
  getVehicleJobAssignments(organizationId: number, date?: string): Promise<any[]>;
  getVehicleJobAssignmentsByUser(userId: number, organizationId: number, date?: string): Promise<any[]>;
  getVehicleJobAssignmentsByVehicle(vehicleId: number, organizationId: number, date?: string): Promise<any[]>;
  createVehicleJobAssignment(assignmentData: any): Promise<any>;
  updateVehicleJobAssignment(id: number, organizationId: number, updates: any): Promise<any>;
  deleteVehicleJobAssignment(id: number, organizationId: number): Promise<boolean>;
  getUsersWithVehicleInspections(organizationId: number, date: string): Promise<any[]>;
  connectUsersToVehicleJobs(organizationId: number, date: string): Promise<any[]>;
  
  // Frontend Management methods
  getFrontendCategories(organizationId: number): Promise<any[]>;
  getFrontendCategory(id: number, organizationId: number): Promise<any>;
  createFrontendCategory(categoryData: any): Promise<any>;
  updateFrontendCategory(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendCategory(id: number, organizationId: number): Promise<boolean>;
  
  getFrontendPages(organizationId: number): Promise<any[]>;
  getFrontendPage(id: number, organizationId: number): Promise<any>;
  createFrontendPage(pageData: any): Promise<any>;
  updateFrontendPage(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendPage(id: number, organizationId: number): Promise<boolean>;
  
  getFrontendSliders(organizationId: number): Promise<any[]>;
  getFrontendSlider(id: number, organizationId: number): Promise<any>;
  createFrontendSlider(sliderData: any): Promise<any>;
  updateFrontendSlider(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendSlider(id: number, organizationId: number): Promise<boolean>;
  
  getFrontendComponents(organizationId: number, pageId?: number): Promise<any[]>;
  getFrontendComponent(id: number, organizationId: number): Promise<any>;
  createFrontendComponent(componentData: any): Promise<any>;
  updateFrontendComponent(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendComponent(id: number, organizationId: number): Promise<boolean>;
  
  getFrontendIcons(organizationId: number): Promise<any[]>;
  getFrontendIcon(id: number, organizationId: number): Promise<any>;
  createFrontendIcon(iconData: any): Promise<any>;
  updateFrontendIcon(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendIcon(id: number, organizationId: number): Promise<boolean>;
  
  getFrontendBoxes(organizationId: number, pageId?: number): Promise<any[]>;
  getFrontendBox(id: number, organizationId: number): Promise<any>;
  createFrontendBox(boxData: any): Promise<any>;
  updateFrontendBox(id: number, organizationId: number, updates: any): Promise<any>;
  deleteFrontendBox(id: number, organizationId: number): Promise<boolean>;
  updateFrontendBoxOrder(organizationId: number, boxUpdates: any[]): Promise<any[]>;

  // Tutorial System methods
  getTutorials(organizationId?: number, category?: string): Promise<any[]>;
  getTutorial(id: number): Promise<any | undefined>;
  createTutorial(tutorialData: any): Promise<any>;
  updateTutorial(id: number, updates: any): Promise<any>;
  deleteTutorial(id: number): Promise<void>;
  getTutorialCategories(organizationId?: number): Promise<any[]>;
  createTutorialCategory(categoryData: any): Promise<any>;
  updateTutorialCategory(id: number, updates: any): Promise<any>;
  deleteTutorialCategory(id: number): Promise<void>;
  getTutorialProgress(userId: number, tutorialId?: number): Promise<any[]>;
  startTutorial(userId: number, tutorialId: number, organizationId: number): Promise<any>;
  updateTutorialProgress(userId: number, tutorialId: number, progressData: any): Promise<any>;
  completeTutorial(userId: number, tutorialId: number, rating?: number, feedback?: string): Promise<any>;
  getUserTutorialStats(userId: number): Promise<any>;

  // Meeting methods
  getMeetings(organizationId: number, userId?: number): Promise<Meeting[]>;
  getMeeting(id: number, organizationId: number): Promise<Meeting | undefined>;
  createMeeting(meetingData: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, organizationId: number, updates: Partial<InsertMeeting>): Promise<Meeting>;
  deleteMeeting(id: number, organizationId: number): Promise<boolean>;
  cleanupExpiredMeetings(): Promise<number>;
  joinMeeting(meetingId: number, userId: number): Promise<MeetingParticipant>;
  joinMeetingWithStatus(meetingId: number, userId: number, status: string): Promise<MeetingParticipant>;
  leaveMeeting(meetingId: number, userId: number): Promise<boolean>;
  getMeetingParticipants(meetingId: number): Promise<MeetingParticipant[]>;
  getWaitingRoomParticipants(meetingId: number): Promise<MeetingParticipant[]>;
  admitParticipant(participantId: number, admittedBy: number): Promise<boolean>;
  denyParticipant(participantId: number): Promise<boolean>;
  getMeetingMessages(meetingId: number): Promise<MeetingMessage[]>;
  createMeetingMessage(messageData: InsertMeetingMessage): Promise<MeetingMessage>;
  getMeetingRecordings(meetingId: number, organizationId: number): Promise<MeetingRecording[]>;
  createMeetingRecording(recordingData: InsertMeetingRecording): Promise<MeetingRecording>;
  updateMeetingStatus(id: number, organizationId: number, status: string): Promise<Meeting>;

  // Call Manager methods
  getPhoneNumbers(organizationId: number): Promise<any[]>;
  getPhoneNumber(id: number, organizationId: number): Promise<any>;
  createPhoneNumber(phoneData: any): Promise<any>;
  updatePhoneNumber(id: number, organizationId: number, updates: any): Promise<any>;
  deletePhoneNumber(id: number, organizationId: number): Promise<boolean>;
  
  // Call Record methods
  getCallRecords(organizationId: number, phoneNumberId?: number): Promise<any[]>;
  getCallRecord(id: number, organizationId: number): Promise<any>;
  createCallRecord(callData: any): Promise<any>;
  updateCallRecord(id: number, organizationId: number, updates: any): Promise<any>;
  
  // Call Recording methods
  getCallRecordings(organizationId: number, callRecordId?: number): Promise<any[]>;
  createCallRecording(recordingData: any): Promise<any>;
  
  // Voicemail methods
  getVoicemails(organizationId: number, phoneNumberId?: number): Promise<any[]>;
  createVoicemail(voicemailData: any): Promise<any>;
  updateVoicemail(id: number, organizationId: number, updates: any): Promise<any>;
  deleteVoicemail(id: number, organizationId: number): Promise<boolean>;
  
  // Call Queue methods
  getCallQueues(organizationId: number): Promise<any[]>;
  createCallQueue(queueData: any): Promise<any>;
  updateCallQueue(id: number, organizationId: number, updates: any): Promise<any>;
  deleteCallQueue(id: number, organizationId: number): Promise<boolean>;
  
  // Organization Twilio Settings methods
  getOrganizationTwilioSettings(organizationId: number): Promise<any>;
  createOrganizationTwilioSettings(settingsData: any): Promise<any>;
  updateOrganizationTwilioSettings(organizationId: number, updates: any): Promise<any>;
  
  // Organization Call Analytics methods
  getOrganizationCallAnalytics(organizationId: number, periodStart?: Date, periodEnd?: Date): Promise<any[]>;
  createOrganizationCallAnalytics(analyticsData: any): Promise<any>;
  updateOrganizationCallAnalytics(id: number, organizationId: number, updates: any): Promise<any>;



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

    // Automatically create employee record when user is created
    try {
      await this.createEmployee({
        userId: user.id,
        organizationId: user.organizationId,
        firstName: user.firstName || user.username,
        lastName: user.lastName || '',
        email: user.email,
        position: userData.position || 'Employee',
        department: userData.department || 'General',
        hireDate: new Date(),
        status: 'active'
      });
    } catch (error) {
      console.error('Error creating employee record for user:', error);
      // Don't fail user creation if employee creation fails
    }

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
    if (updates.canAccessMarketResearch !== undefined) updateData.canAccessMarketResearch = updates.canAccessMarketResearch;
    if (updates.canAccessLeads !== undefined) updateData.canAccessLeads = updates.canAccessLeads;
    if (updates.canAccessGasCards !== undefined) updateData.canAccessGasCards = updates.canAccessGasCards;
    if (updates.canAccessSettings !== undefined) updateData.canAccessSettings = updates.canAccessSettings;
    if (updates.canAccessUsers !== undefined) updateData.canAccessUsers = updates.canAccessUsers;
    if (updates.canAccessAdminSettings !== undefined) updateData.canAccessAdminSettings = updates.canAccessAdminSettings;
    if (updates.canAccessHR !== undefined) updateData.canAccessHR = updates.canAccessHR;
    if (updates.canAccessSaasAdmin !== undefined) updateData.canAccessSaasAdmin = updates.canAccessSaasAdmin;
    if (updates.canAccessExpenseCategories !== undefined) updateData.canAccessExpenseCategories = updates.canAccessExpenseCategories;
    if (updates.canAccessGasCardProviders !== undefined) updateData.canAccessGasCardProviders = updates.canAccessGasCardProviders;
    if (updates.canAccessFileManager !== undefined) updateData.canAccessFileManager = updates.canAccessFileManager;
    if (updates.canAccessFormBuilder !== undefined) updateData.canAccessFormBuilder = updates.canAccessFormBuilder;
    if (updates.canAccessTimeClock !== undefined) updateData.canAccessTimeClock = updates.canAccessTimeClock;
    if (updates.canAccessMyTasks !== undefined) updateData.canAccessMyTasks = updates.canAccessMyTasks;
    if (updates.canAccessInspections !== undefined) updateData.canAccessInspections = updates.canAccessInspections;
    if (updates.canAccessGpsTracking !== undefined) updateData.canAccessGpsTracking = updates.canAccessGpsTracking;
    if (updates.canAccessMobileTest !== undefined) updateData.canAccessMobileTest = updates.canAccessMobileTest;
    if (updates.canAccessJobs !== undefined) updateData.canAccessJobs = updates.canAccessJobs;
    
    // HR-specific permissions
    if (updates.canViewHREmployees !== undefined) updateData.canViewHREmployees = updates.canViewHREmployees;
    if (updates.canEditHREmployees !== undefined) updateData.canEditHREmployees = updates.canEditHREmployees;  
    if (updates.canViewAllEmployees !== undefined) updateData.canViewAllEmployees = updates.canViewAllEmployees;
    if (updates.canEditAllEmployees !== undefined) updateData.canEditAllEmployees = updates.canEditAllEmployees;
    if (updates.canViewOwnHRProfile !== undefined) updateData.canViewOwnHRProfile = updates.canViewOwnHRProfile;
    if (updates.canEditOwnHRProfile !== undefined) updateData.canEditOwnHRProfile = updates.canEditOwnHRProfile;

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      // If no fields to update, just return the current user
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
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
    try {
      const results = await db
        .select({
          id: customers.id,
          userId: customers.userId,
          organizationId: customers.organizationId,
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
        .where(eq(customers.organizationId, organizationId))
        .orderBy(desc(customers.createdAt));
      
      return results;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }



  async getCustomer(id: number, userId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string, organizationId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .innerJoin(users, eq(customers.userId, users.id))
      .where(and(
        eq(customers.email, email),
        eq(users.organizationId, organizationId)
      ));
    return customer || undefined;
  }

  async createCustomer(customerData: any): Promise<Customer> {
    console.log("💾 Storage createCustomer called with data:", customerData);
    
    const insertData: any = {
      userId: customerData.userId,  // This should be the actual userId who created the customer
      organizationId: customerData.organizationId,  // FIXED: Include organizationId
      name: customerData.name,
      email: customerData.email
    };
    
    if (customerData.phone) insertData.phone = customerData.phone;
    if (customerData.address) insertData.address = customerData.address;
    if (customerData.city) insertData.city = customerData.city;
    if (customerData.state) insertData.state = customerData.state;
    if (customerData.zipCode) insertData.zipCode = customerData.zipCode;
    if (customerData.country) insertData.country = customerData.country;

    console.log("💾 Final insert data:", insertData);

    const [customer] = await db
      .insert(customers)
      .values(insertData)
      .returning();
    return customer;
  }

  async updateCustomer(id: number, userId: number, updates: any): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id));
    return result.rowCount > 0;
  }

  async updateCustomerNew(id: number, updates: any): Promise<Customer> {
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

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
      
      return organization || undefined;
    } catch (error) {
      console.error('Error getting organization by ID:', error);
      throw error;
    }
  }

  // Update organization Twilio settings
  async updateOrganizationTwilioSettings(organizationId: number, settings: any): Promise<void> {
    try {
      // Use raw SQL for now to avoid schema mismatch issues
      await db.execute(sql`
        INSERT INTO organization_twilio_settings (
          organization_id, 
          account_sid, 
          auth_token, 
          voice_url, 
          status_callback_url, 
          is_active, 
          updated_at
        )
        VALUES (
          ${organizationId}, 
          ${settings.accountSid || null}, 
          ${settings.authToken || null}, 
          ${settings.webhookUrl || null}, 
          ${settings.statusCallbackUrl || null}, 
          ${settings.isConfigured || false}, 
          NOW()
        )
        ON CONFLICT (organization_id) 
        DO UPDATE SET 
          account_sid = ${settings.accountSid || null},
          auth_token = ${settings.authToken || null},
          voice_url = ${settings.webhookUrl || null},
          status_callback_url = ${settings.statusCallbackUrl || null},
          is_active = ${settings.isConfigured || false},
          updated_at = NOW()
      `);
    } catch (error) {
      console.error('Error updating organization Twilio settings:', error);
      throw error;
    }
  }

  // Get phone number by ID
  async getPhoneNumberById(phoneId: number): Promise<any> {
    try {
      const [phoneNumber] = await db.select()
        .from(callManagerPhoneNumbers)
        .where(eq(callManagerPhoneNumbers.id, phoneId));
      return phoneNumber;
    } catch (error) {
      console.error('Error getting phone number by ID:', error);
      throw error;
    }
  }

  async getOrganizationUsage(organizationId: number): Promise<any> {
    try {
      // Get user count
      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.organizationId, organizationId));

      // Get project count  
      const projectCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .innerJoin(users, eq(projects.userId, users.id))
        .where(eq(users.organizationId, organizationId));

      return {
        userCount: userCount[0]?.count || 0,
        projectCount: projectCount[0]?.count || 0,
        storageUsedGB: 0 // Placeholder for storage calculation
      };
    } catch (error) {
      console.error('Error getting organization usage:', error);
      throw error;
    }
  }

  // Invoice methods
  async getInvoices(organizationId: number): Promise<any[]> {
    const results = await db
      .select({
        id: invoices.id,
        userId: invoices.userId,
        customerId: invoices.customerId,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        currency: invoices.currency,
        notes: invoices.notes,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        stripePaymentIntentId: invoices.stripePaymentIntentId,
        squarePaymentId: invoices.squarePaymentId,
        paymentMethod: invoices.paymentMethod,
        attachmentUrl: invoices.attachmentUrl,
        originalFileName: invoices.originalFileName,
        isUploadedInvoice: invoices.isUploadedInvoice,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt));

    return results;
  }

  async createInvoice(invoiceData: any): Promise<any> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async createUploadedInvoice(invoiceData: any): Promise<any> {
    // For uploaded invoices, we don't require a customer ID
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...invoiceData,
        customerId: invoiceData.customerId || null, // Allow null for uploaded invoices
      })
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

  async updateInvoiceStatus(invoiceId: number, status: string, paymentMethod?: string, paidAt?: Date): Promise<any> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'paid') {
      updateData.paidAt = paidAt || new Date();
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
    } else if (status === 'draft' || status === 'sent' || status === 'overdue' || status === 'cancelled') {
      // For non-paid statuses, clear payment fields
      updateData.paidAt = null;
      updateData.paymentMethod = null;
    }

    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
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
    const quotesWithCustomers = await db
      .select({
        quote: quotes,
        customer: customers,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(quotes)
      .innerJoin(users, eq(quotes.userId, users.id))
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(quotes.createdAt));

    // Get line items for each quote
    const result = [];
    for (const row of quotesWithCustomers) {
      const lineItems = await db
        .select()
        .from(quoteLineItems)
        .where(eq(quoteLineItems.quoteId, row.quote.id));
      
      result.push({
        ...row.quote,
        customer: row.customer,
        user: row.user,
        lineItems: lineItems
      });
    }
    
    return result;
  }

  async getQuote(id: number, organizationId: number): Promise<any> {
    const [quoteWithCustomer] = await db
      .select({
        quote: quotes,
        customer: customers,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(quotes)
      .innerJoin(users, eq(quotes.userId, users.id))
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(and(
        eq(quotes.id, id),
        eq(users.organizationId, organizationId)
      ));

    if (!quoteWithCustomer) {
      return null;
    }

    // Get line items for the quote
    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, id));
    
    return {
      ...quoteWithCustomer.quote,
      customer: quoteWithCustomer.customer,
      user: quoteWithCustomer.user,
      lineItems: lineItems
    };
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

  async createQuoteLineItems(quoteId: number, lineItems: any[]): Promise<void> {
    if (lineItems && lineItems.length > 0) {
      const lineItemsWithQuoteId = lineItems.map(item => ({
        ...item,
        quoteId: quoteId,
        quantity: item.quantity.toString(),
        amount: item.amount.toString(),
      }));
      
      await db.insert(quoteLineItems).values(lineItemsWithQuoteId);
    }
  }

  // Project/Job methods
  async getProjects(organizationId: number, userId?: number, userRole?: string, status?: string): Promise<any[]> {
    // Build the base query
    let whereConditions = [eq(users.organizationId, organizationId)];
    
    // Add status filtering if specified
    if (status) {
      whereConditions.push(eq(projects.status, status));
    }
    
    // If user-specific filtering is requested and not admin, apply sharing rules
    if (userId && userRole !== 'admin') {
      // User can see jobs if:
      // 1. They created the job (projects.userId = userId)
      // 2. Job is shared with team (shareWithTeam = true)
      // 3. They are assigned to the job (exists in projectUsers)
      whereConditions.push(
        or(
          eq(projects.userId, userId), // Job creator
          eq(projects.shareWithTeam, true), // Shared with team
          exists( // User is assigned to project
            db.select().from(projectUsers)
              .where(and(
                eq(projectUsers.projectId, projects.id),
                eq(projectUsers.userId, userId)
              ))
          )
        )
      );
    }

    // Get all projects for the organization with sharing rules applied
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
        shareWithTeam: projects.shareWithTeam,
        vehicleId: projects.vehicleId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(projects.createdAt));

    // Get task counts and customer info for each project
    const projectsWithDetails = await Promise.all(
      allProjects.map(async (project) => {
        const taskCounts = await db
          .select({
            total: sql<number>`count(*)`,
            completed: sql<number>`count(*) filter (where ${tasks.isCompleted} = true)`,
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

  async getProjectById(id: number): Promise<any> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    return project || null;
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
        completed: sql<number>`count(*) filter (where ${tasks.isCompleted} = true)`,
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
    // Support for dispatch routing fields and ensure proper date handling
    const updateData = { ...updates, updatedAt: new Date() };
    
    // Handle dispatch routing fields specifically
    if (updates.scheduledDate !== undefined) {
      updateData.scheduledDate = updates.scheduledDate;
    }
    if (updates.scheduledTime !== undefined) {
      updateData.scheduledTime = updates.scheduledTime;
    }
    if (updates.estimatedDuration !== undefined) {
      updateData.estimatedDuration = updates.estimatedDuration;
    }
    if (updates.currentLocation !== undefined) {
      updateData.currentLocation = updates.currentLocation;
    }
    if (updates.dispatchNotes !== undefined) {
      updateData.dispatchNotes = updates.dispatchNotes;
    }
    
    const [project] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number, userId: number): Promise<boolean> {
    try {
      // Get user's organization to ensure they can delete projects within their org
      const user = await this.getUser(userId);
      if (!user || !user.organizationId) {
        return false;
      }

      // Check if project exists and belongs to user's organization (via project creator's organization)
      const existingProject = await db
        .select({ id: projects.id })
        .from(projects)
        .innerJoin(users, eq(projects.userId, users.id))
        .where(and(
          eq(projects.id, id),
          eq(users.organizationId, user.organizationId)
        ))
        .limit(1);

      if (existingProject.length === 0) {
        return false; // Project not found or user doesn't have access
      }

      // Update project status to 'deleted' instead of actually deleting
      const [project] = await db
        .update(projects)
        .set({ 
          status: 'deleted',
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      
      return !!project;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async cancelProject(id: number, userId: number): Promise<boolean> {
    try {
      // Get user's organization to ensure they can cancel projects within their org
      const user = await this.getUser(userId);
      if (!user || !user.organizationId) {
        return false;
      }

      // Check if project exists and belongs to user's organization (via project creator's organization)
      const existingProject = await db
        .select({ id: projects.id })
        .from(projects)
        .innerJoin(users, eq(projects.userId, users.id))
        .where(and(
          eq(projects.id, id),
          eq(users.organizationId, user.organizationId)
        ))
        .limit(1);

      if (existingProject.length === 0) {
        return false; // Project not found or user doesn't have access
      }

      // Update project status to 'cancelled'
      const [project] = await db
        .update(projects)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      
      return !!project;
    } catch (error) {
      console.error('Error cancelling project:', error);
      return false;
    }
  }

  async getDeletedProjects(organizationId: number, userId?: number): Promise<any[]> {
    try {
      console.log(`🔍 STORAGE: Fetching deleted projects for org ${organizationId}, user ${userId}`);
      
      // Use a much simpler query first to test
      const result = await db.select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        endDate: projects.endDate,
        address: projects.address,
        city: projects.city,
        state: projects.state,
        zipCode: projects.zipCode,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(
        and(
          eq(projects.status, 'deleted'),
          eq(users.organizationId, organizationId),
          userId ? eq(projects.userId, userId) : undefined
        )
      )
      .orderBy(desc(projects.updatedAt));

      console.log(`✅ STORAGE: Found ${result.length} deleted projects`);
      return result;
    } catch (error) {
      console.error('❌ STORAGE ERROR:', error);
      throw error;
    }
  }

  async getCancelledProjects(organizationId: number, userId?: number): Promise<any[]> {
    try {
      if (userId) {
        const result = await db.execute(sql`
          SELECT 
            p.id,
            p.user_id as "userId",
            p.name,
            p.description,
            p.status,
            p.priority,
            p.start_date as "startDate",
            p.end_date as "endDate",
            p.deadline,
            p.progress,
            p.budget,
            p.customer_id as "customerId",
            p.contact_name as "contactName",
            p.contact_email as "contactEmail",
            p.contact_phone as "contactPhone",
            p.contact_company as "contactCompany",
            p.address,
            p.city,
            p.state,
            p.zip_code as "zipCode",
            p.country,
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            u.first_name || ' ' || u.last_name as "creatorName",
            u.email as "creatorEmail",
            COALESCE(COUNT(t.id), 0) as "taskCount",
            COALESCE(COUNT(CASE WHEN t.is_completed = true THEN 1 END), 0) as "completedTasks"
          FROM projects p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.status = 'cancelled' AND u.organization_id = ${organizationId} AND p.user_id = ${userId}
          GROUP BY p.id, u.id, u.first_name, u.last_name, u.email
          ORDER BY p.updated_at DESC
        `);
        return result.rows as any[];
      } else {
        const result = await db.execute(sql`
          SELECT 
            p.id,
            p.user_id as "userId",
            p.name,
            p.description,
            p.status,
            p.priority,
            p.start_date as "startDate",
            p.end_date as "endDate",
            p.deadline,
            p.progress,
            p.budget,
            p.customer_id as "customerId",
            p.contact_name as "contactName",
            p.contact_email as "contactEmail",
            p.contact_phone as "contactPhone",
            p.contact_company as "contactCompany",
            p.address,
            p.city,
            p.state,
            p.zip_code as "zipCode",
            p.country,
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            u.first_name || ' ' || u.last_name as "creatorName",
            u.email as "creatorEmail",
            COALESCE(COUNT(t.id), 0) as "taskCount",
            COALESCE(COUNT(CASE WHEN t.is_completed = true THEN 1 END), 0) as "completedTasks"
          FROM projects p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.status = 'cancelled' AND u.organization_id = ${organizationId}
          GROUP BY p.id, u.id, u.first_name, u.last_name, u.email
          ORDER BY p.updated_at DESC
        `);
        return result.rows as any[];
      }
    } catch (error) {
      console.error('Error fetching cancelled projects:', error);
      return [];
    }
  }

  async restoreProject(id: number, userId: number): Promise<boolean> {
    try {
      // First check if the project exists and user has access
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return false; // User not found
      }

      // Check if project exists and user has access (either owns it or is admin in same org)
      const existingProject = await db
        .select()
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(and(
          eq(projects.id, id),
          or(
            eq(projects.status, 'deleted'),
            eq(projects.status, 'cancelled')
          ),
          eq(users.organizationId, user[0].organizationId)
        ))
        .limit(1);

      if (existingProject.length === 0) {
        return false; // Project not found or user doesn't have access
      }

      // Restore project status to 'active'
      const [project] = await db
        .update(projects)
        .set({ 
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      
      return !!project;
    } catch (error) {
      console.error('Error restoring project:', error);
      return false;
    }
  }

  async assignUserToProject(userId: number, projectId: number, role: string = "member"): Promise<any> {
    const [assignment] = await db
      .insert(projectUsers)
      .values({ userId, projectId, role })
      .onConflictDoNothing()
      .returning();
    return assignment;
  }

  async assignProjectToUser(projectId: number, userId: number, role: string = "member"): Promise<any> {
    // Alias for assignUserToProject with parameters reversed for convenience
    return this.assignUserToProject(userId, projectId, role);
  }

  async getProjectsWithLocation(filters: any = {}): Promise<any[]> {
    try {
      // Build where conditions based on filters
      const whereConditions = [];
      
      if (filters.userId) {
        // Get user to check if they're admin
        const user = await this.getUser(filters.userId);
        if (user?.role !== 'admin') {
          whereConditions.push(eq(projects.userId, filters.userId));
        } else if (user.organizationId) {
          // For admin users, filter by organization through user table join
          // We'll need to get users from the same organization
          const orgUsers = await this.getUsersByOrganization(user.organizationId);
          const orgUserIds = orgUsers.map(u => u.id);
          if (orgUserIds.length > 0) {
            whereConditions.push(inArray(projects.userId, orgUserIds));
          }
        }
      }

      // Filter projects that have location data
      whereConditions.push(isNotNull(projects.address));
      whereConditions.push(ne(projects.address, ''));

      const projectsData = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          priority: projects.priority,
          address: projects.address,
          city: projects.city,
          state: projects.state,
          zipCode: projects.zipCode,
          scheduledDate: projects.scheduledDate,
          scheduledTime: projects.scheduledTime,
          estimatedDuration: projects.estimatedDuration,
          currentLocation: projects.currentLocation,
          dispatchNotes: projects.dispatchNotes,
          vehicleId: projects.vehicleId,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(and(...whereConditions))
        .orderBy(asc(projects.scheduledDate), asc(projects.scheduledTime));

      // Get users assigned to each project
      const projectsWithUsers = await Promise.all(
        projectsData.map(async (project) => {
          const projectTeam = await db
            .select({
              user: {
                id: users.id,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
              },
              role: projectUsers.role,
            })
            .from(projectUsers)
            .innerJoin(users, eq(projectUsers.userId, users.id))
            .where(eq(projectUsers.projectId, project.id));

          return {
            ...project,
            users: projectTeam || [],
          };
        })
      );

      return projectsWithUsers;
    } catch (error) {
      console.error('Error in getProjectsWithLocation:', error);
      return [];
    }
  }

  async removeUserFromProject(userId: number, projectId: number): Promise<void> {
    await db
      .delete(projectUsers)
      .where(and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)));
  }

  // Project waiver methods
  async attachWaiversToProject(projectId: number, waiverIds: number[], attachedBy: number): Promise<void> {
    if (waiverIds.length === 0) return;
    
    const waiverData = waiverIds.map(fileId => ({
      projectId,
      fileId,
      attachedBy,
    }));

    await db
      .insert(projectWaivers)
      .values(waiverData)
      .onConflictDoNothing(); // Avoid duplicates
  }

  async getProjectWaivers(projectId: number): Promise<any[]> {
    return await db
      .select({
        id: projectWaivers.id,
        fileId: projectWaivers.fileId,
        attachedBy: projectWaivers.attachedBy,
        attachedAt: projectWaivers.attachedAt,
        fileName: fileManager.originalName,
        filePath: fileManager.filePath,
        fileType: fileManager.fileType,
        description: fileManager.description,
        attachedByName: users.firstName,
      })
      .from(projectWaivers)
      .innerJoin(fileManager, eq(projectWaivers.fileId, fileManager.id))
      .leftJoin(users, eq(projectWaivers.attachedBy, users.id))
      .where(eq(projectWaivers.projectId, projectId))
      .orderBy(desc(projectWaivers.attachedAt));
  }

  async removeWaiverFromProject(projectId: number, fileId: number): Promise<void> {
    await db
      .delete(projectWaivers)
      .where(and(eq(projectWaivers.projectId, projectId), eq(projectWaivers.fileId, fileId)));
  }

  // DocuSign integration methods
  async createDocuSignEnvelope(envelopeData: any): Promise<any> {
    const [envelope] = await db
      .insert(docusignEnvelopes)
      .values(envelopeData)
      .returning();
    return envelope;
  }

  async getDocuSignEnvelope(envelopeId: string): Promise<any> {
    const [envelope] = await db
      .select()
      .from(docusignEnvelopes)
      .where(eq(docusignEnvelopes.envelopeId, envelopeId));
    return envelope;
  }

  async updateDocuSignEnvelope(envelopeId: string, updates: any): Promise<any> {
    const [envelope] = await db
      .update(docusignEnvelopes)
      .set(updates)
      .where(eq(docusignEnvelopes.envelopeId, envelopeId))
      .returning();
    return envelope;
  }

  async updateFileSignatureStatus(fileId: number, signatureData: any): Promise<any> {
    const [file] = await db
      .update(fileManager)
      .set({
        docusignEnvelopeId: signatureData.envelopeId,
        signatureStatus: signatureData.status,
        signatureUrl: signatureData.signingUrl,
        signedDocumentUrl: signatureData.signedDocumentUrl,
        updatedAt: new Date(),
      })
      .where(eq(fileManager.id, fileId))
      .returning();
    return file;
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

  // Payment methods
  async getPayments(userId: number): Promise<any[]> {
    try {
      // Get user to check organization
      const user = await this.getUser(userId);
      if (!user) return [];

      const results = await db
        .select({
          id: payments.id,
          invoiceId: payments.invoiceId,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          externalId: payments.externalId,
          createdAt: payments.createdAt,
          // Include invoice information
          invoice: {
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            total: invoices.total
          }
        })
        .from(payments)
        .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
        .innerJoin(users, eq(invoices.userId, users.id))
        .where(eq(users.organizationId, user.organizationId))
        .orderBy(desc(payments.createdAt));

      return results;
    } catch (error) {
      console.error("Error in getPayments:", error);
      return [];
    }
  }

  async createPayment(paymentData: any): Promise<any> {
    const [payment] = await db
      .insert(payments)
      .values(paymentData)
      .returning();
    return payment;
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
  async getAllFiles(): Promise<any[]> {
    // Get all files from both fileManager and projectFiles tables
    const fileManagerFiles = await db
      .select({
        id: fileManager.id,
        fileName: fileManager.fileName,
        originalName: fileManager.originalName,
        filePath: fileManager.filePath,
        organizationId: fileManager.organizationId,
        projectId: sql<number>`null`,
        useS3: sql<boolean>`false`,
      })
      .from(fileManager);

    const projectFilesData = await db
      .select({
        id: projectFiles.id,
        fileName: projectFiles.fileName,
        originalName: projectFiles.originalName,
        filePath: projectFiles.filePath,
        organizationId: sql<number>`null`,
        projectId: projectFiles.projectId,
        useS3: sql<boolean>`false`,
      })
      .from(projectFiles);

    return [...fileManagerFiles, ...projectFilesData];
  }

  async updateFileLocation(id: number, filePath: string, fileUrl: string, useS3: boolean): Promise<any> {
    // Try updating in fileManager table first
    try {
      const [file] = await db
        .update(fileManager)
        .set({ filePath, fileUrl: fileUrl, useS3 })
        .where(eq(fileManager.id, id))
        .returning();
      
      if (file) return file;
    } catch (error) {
      // File might be in projectFiles table
    }

    // Try updating in projectFiles table
    const [projectFile] = await db
      .update(projectFiles)
      .set({ filePath })
      .where(eq(projectFiles.id, id))
      .returning();
    
    return projectFile;
  }

  async getFiles(organizationId: number, folderId?: number): Promise<any[]> {
    let whereCondition;
    
    if (folderId) {
      whereCondition = and(
        eq(fileManager.organizationId, organizationId),
        eq(fileManager.folderId, folderId)
      );
    } else {
      whereCondition = and(
        eq(fileManager.organizationId, organizationId),
        sql`${fileManager.folderId} IS NULL`
      );
    }
    
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
        // Digital signature fields
        signatureStatus: fileManager.signatureStatus,
        signatureData: fileManager.signatureData,
        signedBy: fileManager.signedBy,
        signedByUserId: fileManager.signedByUserId,
        signedAt: fileManager.signedAt,
        signedDocumentUrl: fileManager.signedDocumentUrl,
        createdAt: fileManager.createdAt,
        updatedAt: fileManager.updatedAt,
        // User fields
        userUsername: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName
      })
      .from(fileManager)
      .leftJoin(users, eq(fileManager.uploadedBy, users.id))
      .where(whereCondition)
      .orderBy(desc(fileManager.createdAt));
    
    return results.map(row => ({
      id: row.id,
      organizationId: row.organizationId,
      uploadedBy: row.uploadedBy,
      fileName: row.fileName,
      originalName: row.originalName,
      filePath: row.filePath,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      fileType: row.fileType,
      description: row.description,
      tags: row.tags,
      folderId: row.folderId,
      isPublic: row.isPublic,
      downloadCount: row.downloadCount,
      shareableToken: row.shareableToken,
      shareExpiresAt: row.shareExpiresAt,
      docusignEnvelopeId: row.docusignEnvelopeId,
      signatureStatus: row.signatureStatus,
      signatureUrl: row.signatureUrl,
      signedDocumentUrl: row.signedDocumentUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      uploadedByUser: row.userUsername ? {
        username: row.userUsername,
        firstName: row.userFirstName,
        lastName: row.userLastName
      } : null
    }));
  }

  async createFile(fileData: any): Promise<any> {
    const [file] = await db
      .insert(fileManager)
      .values(fileData)
      .returning();
    return file;
  }

  async uploadFile(fileData: any): Promise<any> {
    // uploadFile is just an alias for createFile for the file manager
    return this.createFile(fileData);
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
        cloudinaryUrl: projectFiles.cloudinaryUrl, // Include Cloudinary URL
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
          phone: users.phone,
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

      // Parse location into address components if available
      let addressParts = { address: '', city: '', state: '', zipCode: '' };
      if (job.location) {
        // Split location string and try to parse components
        // Format: "123 Main St, City, State 12345" or variations
        const parts = job.location.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          addressParts.address = parts[0];
          addressParts.city = parts[1];
          // Parse state and zip from last part
          const stateZip = parts[2].split(' ').filter(p => p.length > 0);
          if (stateZip.length >= 2) {
            addressParts.state = stateZip[0];
            addressParts.zipCode = stateZip.slice(1).join(' ');
          } else {
            addressParts.state = parts[2];
          }
        } else if (parts.length === 2) {
          addressParts.address = parts[0];
          addressParts.city = parts[1];
        } else {
          // Single location string - could be address, city, or just a name
          if (job.location.match(/\d+.*\w+/)) {
            // Looks like an address (starts with numbers)
            addressParts.address = job.location;
          } else {
            // Treat as city name
            addressParts.city = job.location;
          }
        }
      }

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
        address: addressParts.address,
        city: addressParts.city,
        state: addressParts.state,
        zip_code: addressParts.zipCode,
        country: 'US',
        // Copy image timestamp settings if available
        enableImageTimestamp: job.enableImageTimestamp || false,
        timestampFormat: job.timestampFormat || "MM/dd/yyyy hh:mm a",
        includeGpsCoords: job.includeGpsCoords || false,
        timestampPosition: job.timestampPosition || "bottom-right",
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
    const whereConditions = [
      eq(inspectionTemplates.organizationId, organizationId),
      eq(inspectionTemplates.isActive, true)
    ];

    if (type) {
      whereConditions.push(eq(inspectionTemplates.type, type));
    }

    return await db
      .select()
      .from(inspectionTemplates)
      .where(and(...whereConditions))
      .orderBy(inspectionTemplates.name);
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

  // Get all inspection records for organization (Manager/Admin only)
  async getAllOrganizationInspectionRecords(organizationId: number, type?: string): Promise<any[]> {
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
        reviewerName: users.firstName,
        technicianName: sql<string>`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.username})`.as('technicianName'),
        technicianEmail: users.email
      })
      .from(inspectionRecords)
      .innerJoin(inspectionTemplates, eq(inspectionRecords.templateId, inspectionTemplates.id))
      .leftJoin(users, eq(inspectionRecords.reviewedBy, users.id))
      .innerJoin(sql`${users} AS technician_user`, sql`${inspectionRecords.userId} = technician_user.id`)
      .where(eq(inspectionRecords.organizationId, organizationId))
      .orderBy(desc(inspectionRecords.createdAt));

    if (type) {
      query = query.where(and(
        eq(inspectionRecords.organizationId, organizationId),
        eq(inspectionRecords.type, type)
      ));
    }

    return await query;
  }

  // Get specific inspection record for organization (Manager/Admin only)
  async getOrganizationInspectionRecord(recordId: number, organizationId: number): Promise<any> {
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
        templateName: inspectionTemplates.name,
        technicianName: sql<string>`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.username})`.as('technicianName'),
        technicianEmail: users.email
      })
      .from(inspectionRecords)
      .innerJoin(inspectionTemplates, eq(inspectionRecords.templateId, inspectionTemplates.id))
      .innerJoin(users, eq(inspectionRecords.userId, users.id))
      .where(and(
        eq(inspectionRecords.id, recordId),
        eq(inspectionRecords.organizationId, organizationId)
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
    
    // Map createdById field properly
    if (processedData.createdById) {
      processedData.createdById = processedData.createdById;
    } else if (processedData.userId) {
      processedData.createdById = processedData.userId;
    }
    
    // Set default values for enhanced task fields
    if (processedData.type === undefined) {
      processedData.type = 'checkbox';
    }
    if (processedData.isRequired === undefined) {
      processedData.isRequired = false;
    }
    if (processedData.isCompleted === undefined) {
      processedData.isCompleted = false;
    }
    
    const [task] = await db
      .insert(tasks)
      .values(processedData)
      .returning();
    return task;
  }

  async getTaskById(taskId: number): Promise<any> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    return task;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, taskId));
    return result.rowCount > 0;
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
    const assignedUser = users;
    const completedUser = users;
    
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        type: tasks.type,
        isRequired: tasks.isRequired,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        completedById: tasks.completedById,
        textValue: tasks.textValue,
        numberValue: tasks.numberValue,
        imagePath: tasks.imagePath,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdById: tasks.createdById,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignedToUser: {
          id: assignedUser.id,
          username: assignedUser.username,
          firstName: assignedUser.firstName,
          lastName: assignedUser.lastName,
          email: assignedUser.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .leftJoin(assignedUser, eq(tasks.assignedToId, assignedUser.id))
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

  async getTaskCompletionAnalytics(organizationId: number): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    completedToday: number;
    completedThisWeek: number;
    averageCompletionTime: number;
    topPerformers: Array<{
      userId: number;
      name: string;
      completedTasks: number;
      completionRate: number;
    }>;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get project IDs for this organization first
      const orgProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.organizationId, organizationId));
      
      const projectIds = orgProjects.map(p => p.id);
      
      if (projectIds.length === 0) {
        return {
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          completedToday: 0,
          completedThisWeek: 0,
          averageCompletionTime: 0,
          topPerformers: []
        };
      }

      // Get all tasks for the organization projects using inArray
      const allTasks = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds));

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(task => task.isCompleted).length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Tasks completed today
      const completedToday = allTasks.filter(task => 
        task.isCompleted && 
        task.completedAt && 
        new Date(task.completedAt) >= today
      ).length;

      // Tasks completed this week
      const completedThisWeek = allTasks.filter(task => 
        task.isCompleted && 
        task.completedAt && 
        new Date(task.completedAt) >= weekAgo
      ).length;

      // Calculate average completion time in hours
      const completedTasksWithTime = allTasks.filter(task => 
        task.isCompleted && task.completedAt && task.createdAt
      );
      
      let averageCompletionTime = 0;
      if (completedTasksWithTime.length > 0) {
        const totalCompletionTime = completedTasksWithTime.reduce((sum, task) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.completedAt!);
          return sum + (completed.getTime() - created.getTime());
        }, 0);
        averageCompletionTime = Math.round(totalCompletionTime / completedTasksWithTime.length / (1000 * 60 * 60)); // Convert to hours
      }

      // Get user information for top performers
      const userIds = [...new Set(allTasks.filter(t => t.completedById).map(t => t.completedById!))];
      const usersData = userIds.length > 0 ? await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username
        })
        .from(users)
        .where(inArray(users.id, userIds))
        : [];

      // Create user lookup map
      const userMap = new Map(usersData.map(u => [u.id, u]));

      // Calculate user performance stats
      const userStats = new Map();
      allTasks.forEach(task => {
        if (task.completedById) {
          const userId = task.completedById;
          const user = userMap.get(userId);
          if (user) {
            if (!userStats.has(userId)) {
              userStats.set(userId, {
                userId,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
                totalTasks: 0,
                completedTasks: 0
              });
            }
            const stats = userStats.get(userId);
            stats.totalTasks++;
            if (task.isCompleted) {
              stats.completedTasks++;
            }
          }
        }
      });

      const topPerformers = Array.from(userStats.values())
        .map(stats => ({
          ...stats,
          completionRate: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
        }))
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5);

      return {
        totalTasks,
        completedTasks,
        completionRate,
        completedToday,
        completedThisWeek,
        averageCompletionTime,
        topPerformers
      };
    } catch (error) {
      console.error('Error in getTaskCompletionAnalytics:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        completedToday: 0,
        completedThisWeek: 0,
        averageCompletionTime: 0,
        topPerformers: []
      };
    }
  }

  async getAllTasks(organizationId: number): Promise<any[]> {
    try {
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
          isCompleted: tasks.isCompleted,
          completedAt: tasks.completedAt,
          completedById: tasks.completedById,
          isRequired: tasks.isRequired,
          type: tasks.type,
          textValue: tasks.textValue,
          numberValue: tasks.numberValue,
          imagePath: tasks.imagePath,
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(projects.organizationId, organizationId));
      
      return result;
    } catch (error) {
      console.error('Error in getAllTasks:', error);
      return [];
    }
  }

  async updateTask(id: number, userId: number, updates: any): Promise<any> {
    // Get current task to access existing description
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));

    if (!currentTask) {
      throw new Error('Task not found');
    }

    const updateData = { ...updates, updatedAt: new Date() };
    
    // If completing the task, set completedById and add completion timestamp to description
    if (updates.isCompleted === true && !currentTask.isCompleted) {
      updateData.completedById = userId;
      updateData.completedAt = new Date();
      
      // Get user info for completion timestamp
      const [user] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId));
      
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
      const completionTimestamp = new Date().toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      // Append completion info to description
      const completionNote = `\n\n✅ Completed by ${userName} on ${completionTimestamp}`;
      updateData.description = (currentTask.description || '') + completionNote;
    }
    
    // If uncompleting the task, remove completion info
    if (updates.isCompleted === false) {
      updateData.completedAt = null;
      updateData.completedById = null;
      
      // Remove completion timestamp from description if it exists
      if (currentTask.description) {
        updateData.description = currentTask.description.replace(/\n\n✅ Completed by .+ on .+/g, '');
      }
    }
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
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
        .from(smsMessages)
        .where(eq(smsMessages.organizationId, organizationId))
        .orderBy(desc(smsMessages.createdAt));
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
      return [];
    }
  }

  async createSmsMessage(messageData: any): Promise<any> {
    try {
      const [smsMessage] = await db.insert(smsMessages)
        .values({
          organizationId: messageData.organizationId,
          recipient: messageData.recipient,
          message: messageData.message,
          status: messageData.status || 'pending',
          sentAt: messageData.sentAt,
          deliveredAt: messageData.deliveredAt,
          cost: messageData.cost || '0',
          twilioSid: messageData.twilioSid,
          errorMessage: messageData.errorMessage,
          sentBy: messageData.sentBy
        })
        .returning();
      return smsMessage;
    } catch (error: any) {
      console.error('Error creating SMS message:', error);
      throw new Error('Failed to create SMS message');
    }
  }

  async getSmsTemplates(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(smsTemplates)
        .where(and(
          eq(smsTemplates.organizationId, organizationId),
          eq(smsTemplates.isActive, true)
        ))
        .orderBy(asc(smsTemplates.name));
    } catch (error) {
      console.error('Error fetching SMS templates:', error);
      return [];
    }
  }

  async createSmsTemplate(templateData: any): Promise<any> {
    try {
      const [template] = await db.insert(smsTemplates)
        .values({
          organizationId: templateData.organizationId,
          name: templateData.name,
          content: templateData.content,
          category: templateData.category,
          createdBy: templateData.createdBy
        })
        .returning();
      return template;
    } catch (error: any) {
      console.error('Error creating SMS template:', error);
      throw new Error('Failed to create SMS template');
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

    // Process time clock triggers for clock_in event
    try {
      await this.processTriggerForTimeClockEvent(userId, organizationId, 'clock_in', { location, ipAddress });
    } catch (error) {
      console.error('Failed to process clock_in triggers:', error);
    }

    return entry;
  }

  async clockOut(userId: number, notes?: string): Promise<any> {
    // Get user's organization ID for trigger checking
    const [user] = await db.select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if there are any active triggers preventing clock-out
    const clockOutCheck = await this.checkClockOutPreventionTriggers(userId, user.organizationId);
    if (!clockOutCheck.canClockOut) {
      throw new Error(clockOutCheck.blockMessage || 'Complete required tasks before clocking out');
    }

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

    // Process time clock triggers for clock_out event
    try {
      if (user) {
        await this.processTriggerForTimeClockEvent(userId, user.organizationId, 'clock_out', { 
          notes, 
          totalHours: totalHours.toString(),
          clockInTime: current.clockInTime,
          clockOutTime 
        });
      }
    } catch (error) {
      console.error('Failed to process clock_out triggers:', error);
    }

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

    // Get user's organization ID for trigger processing
    const [user] = await db.select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Process time clock triggers for break_start event
    try {
      if (user) {
        await this.processTriggerForTimeClockEvent(userId, user.organizationId, 'break_start');
      }
    } catch (error) {
      console.error('Failed to process break_start triggers:', error);
    }

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

    // Get user's organization ID for trigger processing
    const [user] = await db.select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Process time clock triggers for break_end event
    try {
      if (user) {
        await this.processTriggerForTimeClockEvent(userId, user.organizationId, 'break_end', {
          breakDuration: breakDuration.toString(),
          totalBreakDuration: totalBreakDuration.toString()
        });
      }
    } catch (error) {
      console.error('Failed to process break_end triggers:', error);
    }

    return entry;
  }

  async getTimeClockEntries(userId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let whereConditions = [eq(timeClock.userId, userId)];

    if (startDate) {
      whereConditions.push(gte(timeClock.clockInTime, startDate));
    }

    if (endDate) {
      // Add 1 day to endDate to include entries from the entire end date
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      whereConditions.push(lte(timeClock.clockInTime, endDatePlusOne));
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
    console.log('🕒 ORG TIME CLOCK DEBUG:', {
      organizationId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      startDateValid: startDate instanceof Date && !isNaN(startDate.getTime()),
      endDateValid: endDate instanceof Date && !isNaN(endDate.getTime())
    });

    let whereConditions = [eq(timeClock.organizationId, organizationId)];

    if (startDate) {
      whereConditions.push(gte(timeClock.clockInTime, startDate));
    }

    if (endDate) {
      // Add 1 day to endDate to include entries from the entire end date
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      whereConditions.push(lte(timeClock.clockInTime, endDatePlusOne));
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

    console.log('🕒 ORG TIME CLOCK RESULTS:', {
      entriesCount: entries.length,
      entries: entries.map(e => ({
        id: e.id,
        userId: e.userId,
        status: e.status,
        clockInTime: e.clockInTime,
        userName: e.userName
      }))
    });

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

  // Time Clock Task Triggers methods
  async getTimeClockTaskTriggers(organizationId: number, userId?: number): Promise<any[]> {
    let whereConditions = [eq(timeClockTaskTriggers.organizationId, organizationId)];
    
    if (userId) {
      whereConditions.push(
        or(
          eq(timeClockTaskTriggers.userId, userId),
          isNull(timeClockTaskTriggers.userId) // Include organization-wide triggers
        )
      );
    }

    const triggers = await db.select({
      id: timeClockTaskTriggers.id,
      organizationId: timeClockTaskTriggers.organizationId,
      userId: timeClockTaskTriggers.userId,
      triggerEvent: timeClockTaskTriggers.triggerEvent,
      isActive: timeClockTaskTriggers.isActive,
      taskTitle: timeClockTaskTriggers.taskTitle,
      taskDescription: timeClockTaskTriggers.taskDescription,
      taskType: timeClockTaskTriggers.taskType,
      isRequired: timeClockTaskTriggers.isRequired,
      priority: timeClockTaskTriggers.priority,
      assignToMode: timeClockTaskTriggers.assignToMode,
      assignToUserId: timeClockTaskTriggers.assignToUserId,
      projectId: timeClockTaskTriggers.projectId,
      createProjectIfNone: timeClockTaskTriggers.createProjectIfNone,
      projectTemplate: timeClockTaskTriggers.projectTemplate,
      delayMinutes: timeClockTaskTriggers.delayMinutes,
      daysOfWeek: timeClockTaskTriggers.daysOfWeek,
      timeRange: timeClockTaskTriggers.timeRange,
      frequency: timeClockTaskTriggers.frequency,
      lastTriggered: timeClockTaskTriggers.lastTriggered,
      triggerCount: timeClockTaskTriggers.triggerCount,
      createdBy: timeClockTaskTriggers.createdBy,
      createdAt: timeClockTaskTriggers.createdAt,
      // Join creator info
      creatorName: users.firstName,
      creatorLastName: users.lastName,
      // Join assigned user info if applicable
      assignedUserName: sql`assigned_user.first_name`.as('assignedUserName'),
      assignedUserLastName: sql`assigned_user.last_name`.as('assignedUserLastName'),
      // Join project info if applicable
      projectName: projects.name
    })
    .from(timeClockTaskTriggers)
    .leftJoin(users, eq(timeClockTaskTriggers.createdBy, users.id))
    .leftJoin(sql`users assigned_user`, sql`${timeClockTaskTriggers.assignToUserId} = assigned_user.id`)
    .leftJoin(projects, eq(timeClockTaskTriggers.projectId, projects.id))
    .where(and(...whereConditions))
    .orderBy(desc(timeClockTaskTriggers.createdAt));

    return triggers;
  }

  async getTimeClockTaskTrigger(id: number, organizationId: number): Promise<any> {
    const [trigger] = await db.select()
      .from(timeClockTaskTriggers)
      .leftJoin(users, eq(timeClockTaskTriggers.createdBy, users.id))
      .leftJoin(projects, eq(timeClockTaskTriggers.projectId, projects.id))
      .where(and(
        eq(timeClockTaskTriggers.id, id),
        eq(timeClockTaskTriggers.organizationId, organizationId)
      ))
      .limit(1);

    return trigger;
  }

  async createTimeClockTaskTrigger(triggerData: any): Promise<any> {
    const [trigger] = await db.insert(timeClockTaskTriggers)
      .values({
        ...triggerData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return trigger;
  }

  async updateTimeClockTaskTrigger(id: number, organizationId: number, updates: any): Promise<any> {
    const [trigger] = await db.update(timeClockTaskTriggers)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(timeClockTaskTriggers.id, id),
        eq(timeClockTaskTriggers.organizationId, organizationId)
      ))
      .returning();

    return trigger;
  }

  async deleteTimeClockTaskTrigger(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(timeClockTaskTriggers)
      .where(and(
        eq(timeClockTaskTriggers.id, id),
        eq(timeClockTaskTriggers.organizationId, organizationId)
      ));

    return result.rowCount > 0;
  }

  async getActiveTriggersForEvent(organizationId: number, triggerEvent: string, userId?: number): Promise<any[]> {
    let whereConditions = [
      eq(timeClockTaskTriggers.organizationId, organizationId),
      eq(timeClockTaskTriggers.triggerEvent, triggerEvent),
      eq(timeClockTaskTriggers.isActive, true)
    ];

    if (userId) {
      whereConditions.push(
        or(
          eq(timeClockTaskTriggers.userId, userId),
          isNull(timeClockTaskTriggers.userId) // Include organization-wide triggers
        )
      );
    }

    const triggers = await db.select()
      .from(timeClockTaskTriggers)
      .where(and(...whereConditions))
      .orderBy(asc(timeClockTaskTriggers.delayMinutes));

    return triggers;
  }

  async processTriggerForTimeClockEvent(userId: number, organizationId: number, triggerEvent: string, eventData?: any): Promise<void> {
    // Get active triggers for this event
    const triggers = await this.getActiveTriggersForEvent(organizationId, triggerEvent, userId);
    
    for (const trigger of triggers) {
      // Check frequency constraints
      const now = new Date();
      if (trigger.frequency === 'once_per_day' && trigger.lastTriggered) {
        const lastTriggered = new Date(trigger.lastTriggered);
        const daysDiff = Math.floor((now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 1) continue;
      } else if (trigger.frequency === 'once_per_week' && trigger.lastTriggered) {
        const lastTriggered = new Date(trigger.lastTriggered);
        const daysDiff = Math.floor((now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) continue;
      }

      // Check day of week constraints
      if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        if (!trigger.daysOfWeek.includes(currentDay)) continue;
      }

      // Check time range constraints
      if (trigger.timeRange) {
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        if (trigger.timeRange.start && currentTime < trigger.timeRange.start) continue;
        if (trigger.timeRange.end && currentTime > trigger.timeRange.end) continue;
      }

      // Determine who to assign the task to
      let assignToUserId = userId; // Default to the trigger user
      if (trigger.assignToMode === 'specific_user' && trigger.assignToUserId) {
        assignToUserId = trigger.assignToUserId;
      } else if (trigger.assignToMode === 'manager') {
        // Find a manager in the organization (simplified)
        const [manager] = await db.select()
          .from(users)
          .where(and(
            eq(users.organizationId, organizationId),
            eq(users.role, 'manager')
          ))
          .limit(1);
        if (manager) assignToUserId = manager.id;
      } else if (trigger.assignToMode === 'admin') {
        // Find an admin in the organization
        const [admin] = await db.select()
          .from(users)
          .where(and(
            eq(users.organizationId, organizationId),
            eq(users.role, 'admin')
          ))
          .limit(1);
        if (admin) assignToUserId = admin.id;
      }

      // Create the task (with optional delay)
      const createTask = async () => {
        try {
          // Determine project ID
          let projectId = trigger.projectId;
          if (!projectId && trigger.createProjectIfNone) {
            // Create a new project using the template
            const projectData = {
              name: trigger.projectTemplate || `Auto-created for ${trigger.taskTitle}`,
              description: `Project automatically created by time clock trigger: ${trigger.taskTitle}`,
              organizationId,
              createdBy: userId,
              status: 'active'
            };
            const newProject = await this.createProject(projectData);
            projectId = newProject.id;
          }

          // Create the task
          const taskData = {
            title: trigger.taskTitle,
            description: trigger.taskDescription,
            type: trigger.taskType,
            isRequired: trigger.isRequired,
            priority: trigger.priority,
            userId: assignToUserId,
            organizationId,
            projectId,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await this.createTask(taskData);

          // Update trigger statistics
          await db.update(timeClockTaskTriggers)
            .set({
              lastTriggered: new Date(),
              triggerCount: sql`${timeClockTaskTriggers.triggerCount} + 1`,
              updatedAt: new Date()
            })
            .where(eq(timeClockTaskTriggers.id, trigger.id));

        } catch (error) {
          console.error('Failed to create task from trigger:', error);
        }
      };

      // Execute with delay if specified
      if (trigger.delayMinutes > 0) {
        setTimeout(createTask, trigger.delayMinutes * 60 * 1000);
      } else {
        await createTask();
      }
    }
  }

  // Task Triggers System - Comprehensive alert system with flashing, sound, duration settings
  async createTaskTrigger(triggerData: any): Promise<any> {
    try {
      const [trigger] = await db
        .insert(taskTriggers)
        .values({
          organizationId: triggerData.organizationId,
          name: triggerData.name,
          description: triggerData.description,
          triggerType: triggerData.triggerType,
          isActive: triggerData.isActive ?? true,
          hasFlashingAlert: triggerData.hasFlashingAlert ?? true,
          flashColor: triggerData.flashColor || '#ff0000',
          flashDuration: triggerData.flashDuration || 5000,
          hasSoundAlert: triggerData.hasSoundAlert ?? true,
          soundType: triggerData.soundType || 'notification',
          soundVolume: triggerData.soundVolume || 70,
          displayDuration: triggerData.displayDuration || 10000,
          autoHide: triggerData.autoHide ?? true,
          title: triggerData.title,
          message: triggerData.message,
          buttonText: triggerData.buttonText || 'Mark Complete',
          preventClockOut: triggerData.preventClockOut ?? false,
          clockOutBlockMessage: triggerData.clockOutBlockMessage || 'Complete required tasks before clocking out',
          assignedToUserId: triggerData.assignedToUserId || null,
          assignedToRole: triggerData.assignedToRole || null,
          requiresCompletion: triggerData.requiresCompletion ?? true,
          allowMultipleCompletions: triggerData.allowMultipleCompletions ?? false,
          createdBy: triggerData.createdBy,
        })
        .returning();
      return trigger;
    } catch (error) {
      console.error('Error creating task trigger:', error);
      throw error;
    }
  }

  async getTaskTriggers(organizationId: number): Promise<any[]> {
    try {
      const triggers = await db
        .select({
          id: taskTriggers.id,
          organizationId: taskTriggers.organizationId,
          name: taskTriggers.name,
          description: taskTriggers.description,
          triggerType: taskTriggers.triggerType,
          isActive: taskTriggers.isActive,
          hasFlashingAlert: taskTriggers.hasFlashingAlert,
          flashColor: taskTriggers.flashColor,
          flashDuration: taskTriggers.flashDuration,
          hasSoundAlert: taskTriggers.hasSoundAlert,
          soundType: taskTriggers.soundType,
          soundVolume: taskTriggers.soundVolume,
          displayDuration: taskTriggers.displayDuration,
          autoHide: taskTriggers.autoHide,
          title: taskTriggers.title,
          message: taskTriggers.message,
          buttonText: taskTriggers.buttonText,
          preventClockOut: taskTriggers.preventClockOut,
          clockOutBlockMessage: taskTriggers.clockOutBlockMessage,
          assignedToUserId: taskTriggers.assignedToUserId,
          assignedToRole: taskTriggers.assignedToRole,
          requiresCompletion: taskTriggers.requiresCompletion,
          allowMultipleCompletions: taskTriggers.allowMultipleCompletions,
          createdBy: taskTriggers.createdBy,
          createdAt: taskTriggers.createdAt,
          updatedAt: taskTriggers.updatedAt,
          // Include assigned user details
          assignedUserName: users.firstName,
          assignedUserLastName: users.lastName,
          assignedUserEmail: users.email,
        })
        .from(taskTriggers)
        .leftJoin(users, eq(taskTriggers.assignedToUserId, users.id))
        .where(eq(taskTriggers.organizationId, organizationId))
        .orderBy(taskTriggers.createdAt);
      return triggers;
    } catch (error) {
      console.error('Error getting task triggers:', error);
      throw error;
    }
  }

  async getTaskTrigger(id: number, organizationId: number): Promise<any> {
    try {
      const [trigger] = await db
        .select()
        .from(taskTriggers)
        .where(and(eq(taskTriggers.id, id), eq(taskTriggers.organizationId, organizationId)))
        .limit(1);
      return trigger;
    } catch (error) {
      console.error('Error getting task trigger:', error);
      throw error;
    }
  }

  async updateTaskTrigger(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [trigger] = await db
        .update(taskTriggers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(taskTriggers.id, id), eq(taskTriggers.organizationId, organizationId)))
        .returning();
      return trigger;
    } catch (error) {
      console.error('Error updating task trigger:', error);
      throw error;
    }
  }

  async deleteTaskTrigger(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(taskTriggers)
        .where(and(eq(taskTriggers.id, id), eq(taskTriggers.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting task trigger:', error);
      return false;
    }
  }

  // Process task triggers for time clock events
  async processTriggerForTimeClockEvent(userId: number, organizationId: number, eventType: string, context: any = {}): Promise<void> {
    try {
      // Get active triggers for this event type
      const applicableTriggers = await db
        .select()
        .from(taskTriggers)
        .where(and(
          eq(taskTriggers.organizationId, organizationId),
          eq(taskTriggers.triggerType, eventType),
          eq(taskTriggers.isActive, true)
        ));

      // Get user details for role-based filtering
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      for (const trigger of applicableTriggers) {
        // Check assignment filters
        let shouldTrigger = true;
        
        if (trigger.assignedToUserId && trigger.assignedToUserId !== userId) {
          shouldTrigger = false;
        }
        
        if (trigger.assignedToRole && user?.role !== trigger.assignedToRole) {
          shouldTrigger = false;
        }

        if (shouldTrigger) {
          // Check if multiple completions are allowed or if already completed
          if (!trigger.allowMultipleCompletions) {
            const existingCompletion = await db
              .select()
              .from(taskTriggerCompletions)
              .where(and(
                eq(taskTriggerCompletions.triggerId, trigger.id),
                eq(taskTriggerCompletions.userId, userId)
              ))
              .limit(1);
            
            if (existingCompletion.length > 0) {
              continue; // Skip if already completed and multiple completions not allowed
            }
          }

          // Create trigger instance
          await db
            .insert(taskTriggerInstances)
            .values({
              triggerId: trigger.id,
              userId,
              organizationId,
              triggeredBy: eventType,
              timeClockEntryId: context.timeClockEntryId || null,
              status: 'active',
              isVisible: true,
              triggeredAt: new Date(),
              expiresAt: trigger.displayDuration > 0 ? 
                new Date(Date.now() + trigger.displayDuration) : null,
            });
        }
      }
    } catch (error) {
      console.error('Error processing task triggers:', error);
    }
  }

  // Get active trigger instances for a user
  async getActiveTriggerInstances(userId: number, organizationId: number): Promise<any[]> {
    try {
      const instances = await db
        .select({
          id: taskTriggerInstances.id,
          triggerId: taskTriggerInstances.triggerId,
          status: taskTriggerInstances.status,
          isVisible: taskTriggerInstances.isVisible,
          triggeredBy: taskTriggerInstances.triggeredBy,
          triggeredAt: taskTriggerInstances.triggeredAt,
          expiresAt: taskTriggerInstances.expiresAt,
          // Trigger details
          triggerName: taskTriggers.name,
          triggerTitle: taskTriggers.title,
          triggerMessage: taskTriggers.message,
          buttonText: taskTriggers.buttonText,
          hasFlashingAlert: taskTriggers.hasFlashingAlert,
          flashColor: taskTriggers.flashColor,
          flashDuration: taskTriggers.flashDuration,
          hasSoundAlert: taskTriggers.hasSoundAlert,
          soundType: taskTriggers.soundType,
          soundVolume: taskTriggers.soundVolume,
          displayDuration: taskTriggers.displayDuration,
          autoHide: taskTriggers.autoHide,
          requiresCompletion: taskTriggers.requiresCompletion,
        })
        .from(taskTriggerInstances)
        .innerJoin(taskTriggers, eq(taskTriggerInstances.triggerId, taskTriggers.id))
        .where(and(
          eq(taskTriggerInstances.userId, userId),
          eq(taskTriggerInstances.organizationId, organizationId),
          eq(taskTriggerInstances.status, 'active'),
          eq(taskTriggerInstances.isVisible, true)
        ))
        .orderBy(taskTriggerInstances.triggeredAt);
      
      return instances;
    } catch (error) {
      console.error('Error getting active trigger instances:', error);
      throw error;
    }
  }

  // Complete a trigger instance
  async completeTriggerInstance(instanceId: number, userId: number, organizationId: number, notes?: string): Promise<boolean> {
    try {
      // Get the instance and trigger details
      const [instance] = await db
        .select({
          id: taskTriggerInstances.id,
          triggerId: taskTriggerInstances.triggerId,
          timeClockEntryId: taskTriggerInstances.timeClockEntryId,
        })
        .from(taskTriggerInstances)
        .where(and(
          eq(taskTriggerInstances.id, instanceId),
          eq(taskTriggerInstances.userId, userId),
          eq(taskTriggerInstances.organizationId, organizationId)
        ))
        .limit(1);

      if (!instance) return false;

      // Update the instance as completed
      await db
        .update(taskTriggerInstances)
        .set({
          status: 'completed',
          completedAt: new Date(),
          completedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(taskTriggerInstances.id, instanceId));

      // Create completion record
      await db
        .insert(taskTriggerCompletions)
        .values({
          triggerId: instance.triggerId,
          userId,
          organizationId,
          notes,
          timeClockEntryId: instance.timeClockEntryId,
          triggerContext: { completedInstanceId: instanceId },
        });

      return true;
    } catch (error) {
      console.error('Error completing trigger instance:', error);
      return false;
    }
  }

  // Dismiss a trigger instance
  async dismissTriggerInstance(instanceId: number, userId: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .update(taskTriggerInstances)
        .set({
          status: 'dismissed',
          dismissedAt: new Date(),
          isVisible: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(taskTriggerInstances.id, instanceId),
          eq(taskTriggerInstances.userId, userId),
          eq(taskTriggerInstances.organizationId, organizationId)
        ));
      return true;
    } catch (error) {
      console.error('Error dismissing trigger instance:', error);
      return false;
    }
  }

  // Check if user has active triggers that prevent clock-out
  async checkClockOutPreventionTriggers(userId: number, organizationId: number): Promise<{ canClockOut: boolean; blockMessage?: string }> {
    try {
      const preventionTriggers = await db
        .select({
          clockOutBlockMessage: taskTriggers.clockOutBlockMessage,
        })
        .from(taskTriggerInstances)
        .innerJoin(taskTriggers, eq(taskTriggerInstances.triggerId, taskTriggers.id))
        .where(and(
          eq(taskTriggerInstances.userId, userId),
          eq(taskTriggerInstances.organizationId, organizationId),
          eq(taskTriggerInstances.status, 'active'),
          eq(taskTriggers.preventClockOut, true),
          eq(taskTriggers.requiresCompletion, true)
        ))
        .limit(1);

      if (preventionTriggers.length > 0) {
        return {
          canClockOut: false,
          blockMessage: preventionTriggers[0].clockOutBlockMessage
        };
      }

      return { canClockOut: true };
    } catch (error) {
      console.error('Error checking clock-out prevention triggers:', error);
      return { canClockOut: true }; // Default to allowing clock-out on error
    }
  }

  // Image methods
  async createImage(imageData: any): Promise<any> {
    try {
      // Ensure organization folders exist for multi-tenant isolation
      if (imageData.organizationId) {
        await ensureOrganizationFolders(imageData.organizationId);
      }
      
      const [image] = await db
        .insert(images)
        .values({
          filename: imageData.filename,
          originalName: imageData.originalName,
          mimeType: imageData.mimeType,
          size: imageData.size,
          userId: imageData.userId,
          organizationId: imageData.organizationId,
          projectId: imageData.projectId || null,
          customerId: imageData.customerId || null,
          description: imageData.description || null,
          cloudinaryUrl: imageData.cloudinaryUrl || null,
        })
        .returning();
      return image;
    } catch (error) {
      console.error('Error creating image:', error);
      throw error;
    }
  }

  async getImageById(imageId: number): Promise<any> {
    try {
      const [image] = await db
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
          projectId: images.projectId,
          organizationId: users.organizationId
        })
        .from(images)
        .leftJoin(users, eq(images.userId, users.id))
        .where(eq(images.id, imageId));
      
      return image || null;
    } catch (error) {
      console.error('Error fetching image by ID:', error);
      return null;
    }
  }

  async getImages(userId: number): Promise<any[]> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) {
        console.log('🔍 IMAGES DEBUG: No user info found for userId:', userId);
        return [];
      }

      console.log('🔍 IMAGES DEBUG: User info:', {
        userId: userInfo.id,
        organizationId: userInfo.organizationId,
        username: userInfo.username
      });

      // Get images filtered by organization and exclude deleted images
      const imageResults = await db
        .select()
        .from(images)
        .where(
          and(
            eq(images.organizationId, userInfo.organizationId),
            isNull(images.deletedAt)
          )
        )
        .orderBy(desc(images.createdAt));

      console.log('🔍 IMAGES DEBUG: Raw query results:', {
        count: imageResults.length,
        organizationId: userInfo.organizationId,
        results: imageResults.slice(0, 2) // Log first 2 results for debugging
      });

      // Add correct URL paths for organization-based file structure and map date field
      return imageResults.map(image => {
        // If the image has a cloudinaryUrl (newer uploads), use that
        let imageUrl;
        if (image.cloudinaryUrl) {
          imageUrl = image.cloudinaryUrl;
        } else {
          // Fall back to local file path for older uploads
          imageUrl = `/uploads/org-${userInfo.organizationId}/image_gallery/${image.filename}`;
        }

        return {
          ...image,
          uploadDate: image.createdAt, // Map createdAt to uploadDate for frontend compatibility
          url: imageUrl
        };
      });
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

      // Soft delete the image
      const result = await db
        .update(images)
        .set({ 
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          updatedAt: new Date()
        })
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

  // Trash bin methods for images
  async getDeletedImages(userId: number): Promise<any[]> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return [];

      // Get deleted images for the organization
      const deletedImageResults = await db
        .select({
          id: images.id,
          filename: images.filename,
          originalName: images.originalName,
          mimeType: images.mimeType,
          size: images.size,
          description: images.description,
          cloudinaryUrl: images.cloudinaryUrl,
          deletedAt: images.deletedAt,
          deletedBy: images.deletedBy,
          createdAt: images.createdAt,
          organizationId: images.organizationId,
          userId: images.userId,
          projectId: images.projectId,
          deletedByUser: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(images)
        .leftJoin(users, eq(images.deletedBy, users.id))
        .where(
          and(
            eq(images.organizationId, userInfo.organizationId),
            eq(images.isDeleted, true)
          )
        )
        .orderBy(desc(images.deletedAt));

      // Add correct URL paths and format data
      return deletedImageResults.map(image => {
        let imageUrl;
        if (image.cloudinaryUrl) {
          imageUrl = image.cloudinaryUrl;
        } else {
          imageUrl = `/uploads/org-${userInfo.organizationId}/image_gallery/${image.filename}`;
        }

        return {
          ...image,
          url: imageUrl,
          deletedByName: image.deletedByUser?.firstName && image.deletedByUser?.lastName
            ? `${image.deletedByUser.firstName} ${image.deletedByUser.lastName}`
            : image.deletedByUser?.email || 'Unknown User'
        };
      });
    } catch (error) {
      console.error('Error fetching deleted images:', error);
      return [];
    }
  }

  async restoreImage(imageId: number, userId: number): Promise<boolean> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return false;

      // Restore image by clearing soft delete flags
      const result = await db
        .update(images)
        .set({ 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(images.id, imageId),
            eq(images.organizationId, userInfo.organizationId),
            eq(images.isDeleted, true)
          )
        );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error restoring image:', error);
      return false;
    }
  }

  async permanentlyDeleteImage(imageId: number, userId: number): Promise<boolean> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return false;

      // Permanently delete the image record
      const result = await db
        .delete(images)
        .where(
          and(
            eq(images.id, imageId),
            eq(images.organizationId, userInfo.organizationId),
            eq(images.isDeleted, true)
          )
        );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error permanently deleting image:', error);
      return false;
    }
  }

  // Internal messaging methods
  async getInternalMessages(userId: number): Promise<any[]> {
    try {
      const userInfo = await this.getUser(userId);
      if (!userInfo) return [];

      let whereCondition;
      
      // If user is admin, show all messages within their organization
      if (userInfo.role === 'admin') {
        // For admins, get all messages where sender or any recipient is in the same organization
        whereCondition = and(
          or(
            // Messages sent by users in the same organization
            exists(
              db.select()
                .from(users)
                .where(and(
                  eq(users.id, internalMessages.senderId),
                  eq(users.organizationId, userInfo.organizationId)
                ))
            ),
            // Messages received by users in the same organization
            exists(
              db.select()
                .from(internalMessageRecipients)
                .innerJoin(users, eq(internalMessageRecipients.recipientId, users.id))
                .where(and(
                  eq(internalMessageRecipients.messageId, internalMessages.id),
                  eq(users.organizationId, userInfo.organizationId)
                ))
            )
          )
        );
      } else {
        // For regular users, only show messages they sent or received
        whereCondition = or(
          eq(internalMessages.senderId, userId),
          eq(internalMessageRecipients.recipientId, userId)
        );
      }

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
        .where(whereCondition)
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

  // Gas card usage tracking methods
  async getGasCardUsage(organizationId: number, cardId?: number, startDate?: Date, endDate?: Date): Promise<GasCardUsage[]> {
    try {
      let query = db
        .select({
          id: gasCardUsage.id,
          cardId: gasCardUsage.cardId,
          assignmentId: gasCardUsage.assignmentId,
          userId: gasCardUsage.userId,
          purchaseDate: gasCardUsage.purchaseDate,
          location: gasCardUsage.location,
          fuelType: gasCardUsage.fuelType,
          gallons: gasCardUsage.gallons,
          pricePerGallon: gasCardUsage.pricePerGallon,
          totalAmount: gasCardUsage.totalAmount,
          mileage: gasCardUsage.mileage,
          vehicleInfo: gasCardUsage.vehicleInfo,
          projectId: gasCardUsage.projectId,
          purpose: gasCardUsage.purpose,
          receiptUrl: gasCardUsage.receiptUrl,
          notes: gasCardUsage.notes,
          isApproved: gasCardUsage.isApproved,
          approvedBy: gasCardUsage.approvedBy,
          approvedAt: gasCardUsage.approvedAt,
          createdBy: gasCardUsage.createdBy,
          organizationId: gasCardUsage.organizationId,
          createdAt: gasCardUsage.createdAt,
          updatedAt: gasCardUsage.updatedAt,
          cardNumber: gasCards.cardNumber,
          cardName: gasCards.cardName,
          userName: users.username,
          userFirstName: users.firstName,
          userLastName: users.lastName
        })
        .from(gasCardUsage)
        .innerJoin(gasCards, eq(gasCardUsage.cardId, gasCards.id))
        .innerJoin(users, eq(gasCardUsage.userId, users.id))
        .where(eq(gasCardUsage.organizationId, organizationId));

      if (cardId) {
        query = query.where(and(eq(gasCardUsage.organizationId, organizationId), eq(gasCardUsage.cardId, cardId)));
      }

      if (startDate) {
        query = query.where(and(eq(gasCardUsage.organizationId, organizationId), gte(gasCardUsage.purchaseDate, startDate)));
      }

      if (endDate) {
        query = query.where(and(eq(gasCardUsage.organizationId, organizationId), lte(gasCardUsage.purchaseDate, endDate)));
      }

      const usage = await query.orderBy(desc(gasCardUsage.purchaseDate));
      return usage as GasCardUsage[];
    } catch (error) {
      console.error('Error fetching gas card usage:', error);
      return [];
    }
  }

  async createGasCardUsage(data: InsertGasCardUsage): Promise<GasCardUsage> {
    try {
      const [usage] = await db
        .insert(gasCardUsage)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return usage;
    } catch (error) {
      console.error('Error creating gas card usage:', error);
      throw error;
    }
  }

  async updateGasCardUsage(id: number, data: Partial<InsertGasCardUsage>): Promise<GasCardUsage> {
    try {
      const [usage] = await db
        .update(gasCardUsage)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(gasCardUsage.id, id))
        .returning();
      return usage;
    } catch (error) {
      console.error('Error updating gas card usage:', error);
      throw error;
    }
  }

  async deleteGasCardUsage(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(gasCardUsage)
        .where(eq(gasCardUsage.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting gas card usage:', error);
      return false;
    }
  }

  async approveGasCardUsage(id: number, approvedBy: number): Promise<GasCardUsage> {
    try {
      const [usage] = await db
        .update(gasCardUsage)
        .set({
          isApproved: true,
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(gasCardUsage.id, id))
        .returning();
      return usage;
    } catch (error) {
      console.error('Error approving gas card usage:', error);
      throw error;
    }
  }

  // Shared photo link methods
  async createSharedPhotoLink(linkData: any): Promise<any> {
    try {
      const [link] = await db
        .insert(sharedPhotoLinks)
        .values(linkData)
        .returning();
      return link;
    } catch (error) {
      console.error('Error creating shared photo link:', error);
      throw error;
    }
  }

  async getSharedPhotoLinks(userId: number): Promise<any[]> {
    try {
      const links = await db
        .select()
        .from(sharedPhotoLinks)
        .where(eq(sharedPhotoLinks.createdBy, userId))
        .orderBy(desc(sharedPhotoLinks.createdAt));
      return links;
    } catch (error) {
      console.error('Error fetching shared photo links:', error);
      throw error;
    }
  }

  async getSharedPhotoLink(token: string): Promise<any> {
    try {
      const [link] = await db
        .select({
          id: sharedPhotoLinks.id,
          shareToken: sharedPhotoLinks.shareToken,
          projectId: sharedPhotoLinks.projectId,
          imageIds: sharedPhotoLinks.imageIds,
          createdBy: sharedPhotoLinks.createdBy,
          recipientEmail: sharedPhotoLinks.recipientEmail,
          recipientName: sharedPhotoLinks.recipientName,
          expiresAt: sharedPhotoLinks.expiresAt,
          accessCount: sharedPhotoLinks.accessCount,
          maxAccess: sharedPhotoLinks.maxAccess,
          isActive: sharedPhotoLinks.isActive,
          message: sharedPhotoLinks.message,
          createdAt: sharedPhotoLinks.createdAt,
          lastAccessedAt: sharedPhotoLinks.lastAccessedAt,
          project: {
            id: projects.id,
            name: projects.name
          }
        })
        .from(sharedPhotoLinks)
        .leftJoin(projects, eq(sharedPhotoLinks.projectId, projects.id))
        .where(and(
          eq(sharedPhotoLinks.shareToken, token),
          eq(sharedPhotoLinks.isActive, true)
        ));

      if (!link) return null;

      // Get images based on imageIds
      const imageIdsArray = Array.isArray(link.imageIds) ? link.imageIds : JSON.parse(link.imageIds as string);
      const imageList = await db
        .select()
        .from(images)
        .where(inArray(images.id, imageIdsArray));

      return {
        ...link,
        images: imageList
      };
    } catch (error) {
      console.error('Error fetching shared photo link:', error);
      throw error;
    }
  }

  async updateSharedPhotoLinkAccess(token: string): Promise<any> {
    try {
      const [link] = await db
        .update(sharedPhotoLinks)
        .set({
          accessCount: sql`${sharedPhotoLinks.accessCount} + 1`,
          lastAccessedAt: new Date()
        })
        .where(eq(sharedPhotoLinks.shareToken, token))
        .returning();
      return link;
    } catch (error) {
      console.error('Error updating shared photo link access:', error);
      throw error;
    }
  }

  async deactivateSharedPhotoLink(linkId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(sharedPhotoLinks)
        .set({ isActive: false })
        .where(and(
          eq(sharedPhotoLinks.id, linkId),
          eq(sharedPhotoLinks.createdBy, userId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deactivating shared photo link:', error);
      return false;
    }
  }

  async deleteSharedPhotoLink(linkId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(sharedPhotoLinks)
        .where(and(
          eq(sharedPhotoLinks.id, linkId),
          eq(sharedPhotoLinks.createdBy, userId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting shared photo link:', error);
      return false;
    }
  }

  // Image annotation methods
  async saveImageAnnotations(imageId: number, userId: number, annotations: any, annotatedImageUrl: string): Promise<any> {
    try {
      const [updatedImage] = await db
        .update(images)
        .set({
          annotations: JSON.stringify(annotations),
          annotatedImageUrl: annotatedImageUrl,
          updatedAt: new Date()
        })
        .where(eq(images.id, imageId))
        .returning();
      return updatedImage;
    } catch (error) {
      console.error('Error saving image annotations:', error);
      throw error;
    }
  }

  // File security methods
  async getFileSecuritySettings(organizationId: number): Promise<any> {
    try {
      const [settings] = await db
        .select()
        .from(fileSecuritySettings)
        .where(eq(fileSecuritySettings.organizationId, organizationId))
        .limit(1);
      
      if (!settings) {
        // Create default settings if none exist
        const [newSettings] = await db
          .insert(fileSecuritySettings)
          .values({ organizationId })
          .returning();
        return newSettings;
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting file security settings:', error);
      throw error;
    }
  }

  async updateFileSecuritySettings(organizationId: number, settings: any): Promise<any> {
    try {
      const [updatedSettings] = await db
        .update(fileSecuritySettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(fileSecuritySettings.organizationId, organizationId))
        .returning();
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating file security settings:', error);
      throw error;
    }
  }

  async createFileSecurityScan(scanData: any): Promise<any> {
    try {
      const [scan] = await db
        .insert(fileSecurityScans)
        .values(scanData)
        .returning();
      
      return scan;
    } catch (error) {
      console.error('Error creating file security scan:', error);
      throw error;
    }
  }

  async getFileSecurityScans(organizationId: number, limit: number = 50): Promise<any[]> {
    try {
      const scans = await db
        .select()
        .from(fileSecurityScans)
        .where(eq(fileSecurityScans.organizationId, organizationId))
        .orderBy(desc(fileSecurityScans.createdAt))
        .limit(limit);
      
      return scans;
    } catch (error) {
      console.error('Error getting file security scans:', error);
      throw error;
    }
  }

  async getFileSecurityStats(organizationId: number): Promise<any> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      
      const [
        totalScans,
        recentScans,
        threatsDetected,
        quarantinedFiles,
        totalAccess,
        recentAccess,
        suspiciousActivity,
        deniedAccess
      ] = await Promise.all([
        // Total scans
        db.select({ count: sql`count(*)` })
          .from(fileSecurityScans)
          .where(eq(fileSecurityScans.organizationId, organizationId)),
        
        // Recent scans (last 30 days)
        db.select({ count: sql`count(*)` })
          .from(fileSecurityScans)
          .where(
            and(
              eq(fileSecurityScans.organizationId, organizationId),
              gte(fileSecurityScans.createdAt, thirtyDaysAgo)
            )
          ),
        
        // Threats detected
        db.select({ count: sql`count(*)` })
          .from(fileSecurityScans)
          .where(
            and(
              eq(fileSecurityScans.organizationId, organizationId),
              gt(fileSecurityScans.threatCount, 0)
            )
          ),
        
        // Quarantined files
        db.select({ count: sql`count(*)` })
          .from(fileSecurityScans)
          .where(
            and(
              eq(fileSecurityScans.organizationId, organizationId),
              eq(fileSecurityScans.actionTaken, 'quarantined')
            )
          ),
        
        // Total access logs
        db.select({ count: sql`count(*)` })
          .from(fileAccessLogs)
          .where(eq(fileAccessLogs.organizationId, organizationId)),
        
        // Recent access (last 30 days)
        db.select({ count: sql`count(*)` })
          .from(fileAccessLogs)
          .where(
            and(
              eq(fileAccessLogs.organizationId, organizationId),
              gte(fileAccessLogs.createdAt, thirtyDaysAgo)
            )
          ),
        
        // Suspicious activity
        db.select({ count: sql`count(*)` })
          .from(fileAccessLogs)
          .where(
            and(
              eq(fileAccessLogs.organizationId, organizationId),
              eq(fileAccessLogs.suspiciousActivity, true)
            )
          ),
        
        // Denied access
        db.select({ count: sql`count(*)` })
          .from(fileAccessLogs)
          .where(
            and(
              eq(fileAccessLogs.organizationId, organizationId),
              eq(fileAccessLogs.accessDenied, true)
            )
          )
      ]);
      
      return {
        totalScans: parseInt(totalScans[0]?.count?.toString() || '0'),
        recentScans: parseInt(recentScans[0]?.count?.toString() || '0'),
        threatsDetected: parseInt(threatsDetected[0]?.count?.toString() || '0'),
        quarantinedFiles: parseInt(quarantinedFiles[0]?.count?.toString() || '0'),
        totalAccess: parseInt(totalAccess[0]?.count?.toString() || '0'),
        recentAccess: parseInt(recentAccess[0]?.count?.toString() || '0'),
        suspiciousActivity: parseInt(suspiciousActivity[0]?.count?.toString() || '0'),
        deniedAccess: parseInt(deniedAccess[0]?.count?.toString() || '0'),
      };
    } catch (error) {
      console.error('Error getting file security stats:', error);
      throw error;
    }
  }

  async logFileAccess(accessData: any): Promise<any> {
    try {
      const [accessLog] = await db
        .insert(fileAccessLogs)
        .values(accessData)
        .returning();
      
      return accessLog;
    } catch (error) {
      console.error('Error logging file access:', error);
      throw error;
    }
  }

  async getFileAccessLogs(organizationId: number, limit: number = 100): Promise<any[]> {
    try {
      const logs = await db
        .select()
        .from(fileAccessLogs)
        .where(eq(fileAccessLogs.organizationId, organizationId))
        .orderBy(desc(fileAccessLogs.createdAt))
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting file access logs:', error);
      throw error;
    }
  }

  // File integrity methods
  async getAllProjectFiles(): Promise<any[]> {
    try {
      const files = await db
        .select({
          id: projectFiles.id,
          projectId: projectFiles.projectId,
          fileName: projectFiles.fileName,
          filePath: projectFiles.filePath,
          fileSize: projectFiles.fileSize,
          mimeType: projectFiles.mimeType,
          createdAt: projectFiles.createdAt
        })
        .from(projectFiles)
        .orderBy(desc(projectFiles.createdAt));
      
      return files;
    } catch (error) {
      console.error('Error getting all project files:', error);
      throw error;
    }
  }

  async deleteProjectFile(fileId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(projectFiles)
        .where(eq(projectFiles.id, fileId));
      
      return true;
    } catch (error) {
      console.error('Error deleting project file:', error);
      throw error;
    }
  }

  // Digital signature methods
  async createDigitalSignature(signatureData: any): Promise<any> {
    try {
      const [signature] = await db
        .insert(digitalSignatures)
        .values(signatureData)
        .returning();
      
      return signature;
    } catch (error) {
      console.error('Error creating digital signature:', error);
      throw error;
    }
  }

  async getProjectSignatures(projectId: number): Promise<any[]> {
    try {
      const signatures = await db
        .select()
        .from(digitalSignatures)
        .where(eq(digitalSignatures.projectId, projectId))
        .orderBy(desc(digitalSignatures.signedAt));
      
      return signatures;
    } catch (error) {
      console.error('Error getting project signatures:', error);
      throw error;
    }
  }

  async deleteSignature(signatureId: number): Promise<boolean> {
    try {
      await db
        .delete(digitalSignatures)
        .where(eq(digitalSignatures.id, signatureId));
      
      return true;
    } catch (error) {
      console.error('Error deleting signature:', error);
      throw error;
    }
  }

  // Department methods
  async getDepartments(organizationId: number): Promise<Department[]> {
    try {
      const departmentList = await db
        .select()
        .from(departments)
        .where(eq(departments.organizationId, organizationId))
        .orderBy(asc(departments.name));
      
      return departmentList;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    try {
      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id));
      
      return department || undefined;
    } catch (error) {
      console.error('Error getting department:', error);
      throw error;
    }
  }

  async createDepartment(departmentData: any): Promise<Department> {
    try {
      const [department] = await db
        .insert(departments)
        .values({
          organizationId: departmentData.organizationId,
          name: departmentData.name,
          description: departmentData.description,
          managerId: departmentData.managerId,
          budget: departmentData.budget,
          location: departmentData.location,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return department;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  async updateDepartment(id: number, updates: any): Promise<Department> {
    try {
      const [department] = await db
        .update(departments)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(departments.id, id))
        .returning();
      
      return department;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  async deleteDepartment(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(departments)
        .where(eq(departments.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting department:', error);
      return false;
    }
  }

  // Employee methods
  async getEmployees(organizationId: number): Promise<Employee[]> {
    try {
      const employeeList = await db
        .select()
        .from(employees)
        .where(eq(employees.organizationId, organizationId))
        .orderBy(asc(employees.firstName), asc(employees.lastName));
      
      return employeeList;
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    try {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, id));
      
      return employee || undefined;
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  }

  async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
    try {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.userId, userId));
      
      return employee || undefined;
    } catch (error) {
      console.error('Error getting employee by user ID:', error);
      throw error;
    }
  }

  async createEmployee(employeeData: any): Promise<Employee> {
    try {
      const [employee] = await db
        .insert(employees)
        .values({
          userId: employeeData.userId,
          organizationId: employeeData.organizationId,
          employeeId: employeeData.employeeId,
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          department: employeeData.department,
          hireDate: employeeData.hireDate || new Date(),
          salary: employeeData.salary,
          status: employeeData.status || 'active',
          managerId: employeeData.managerId,
          location: employeeData.location,
          emergencyContact: employeeData.emergencyContact,
          notes: employeeData.notes,
        })
        .returning();
      
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: number, updates: any): Promise<Employee> {
    try {
      const [employee] = await db
        .update(employees)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, id))
        .returning();
      
      return employee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  async deleteEmployee(id: number): Promise<boolean> {
    try {
      await db
        .delete(employees)
        .where(eq(employees.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Employee Document methods
  async getEmployeeDocuments(employeeId: number, organizationId: number): Promise<any[]> {
    try {
      const documents = await db
        .select()
        .from(employeeDocuments)
        .where(and(
          eq(employeeDocuments.employeeId, employeeId),
          eq(employeeDocuments.organizationId, organizationId)
        ))
        .orderBy(desc(employeeDocuments.createdAt));
      
      return documents;
    } catch (error) {
      console.error('Error getting employee documents:', error);
      throw error;
    }
  }

  async getEmployeeDocument(id: number, organizationId: number): Promise<any | undefined> {
    try {
      const [document] = await db
        .select()
        .from(employeeDocuments)
        .where(and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.organizationId, organizationId)
        ));
      
      return document || undefined;
    } catch (error) {
      console.error('Error getting employee document:', error);
      throw error;
    }
  }

  async createEmployeeDocument(documentData: any): Promise<any> {
    try {
      const [document] = await db
        .insert(employeeDocuments)
        .values({
          employeeId: documentData.employeeId,
          organizationId: documentData.organizationId,
          uploadedBy: documentData.uploadedBy,
          fileName: documentData.fileName,
          originalName: documentData.originalName,
          filePath: documentData.filePath,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          fileType: documentData.fileType,
          documentType: documentData.documentType,
          category: documentData.category,
          title: documentData.title,
          description: documentData.description,
          tags: documentData.tags,
          confidentialityLevel: documentData.confidentialityLevel,
          accessLevel: documentData.accessLevel,
          status: documentData.status || 'active',
          expirationDate: documentData.expirationDate,
          reminderDate: documentData.reminderDate,
          notes: documentData.notes,
        })
        .returning();
      
      return document;
    } catch (error) {
      console.error('Error creating employee document:', error);
      throw error;
    }
  }

  async updateEmployeeDocument(id: number, updates: any): Promise<any> {
    try {
      const [document] = await db
        .update(employeeDocuments)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(employeeDocuments.id, id))
        .returning();
      
      return document;
    } catch (error) {
      console.error('Error updating employee document:', error);
      throw error;
    }
  }

  async deleteEmployeeDocument(id: number): Promise<boolean> {
    try {
      await db
        .delete(employeeDocuments)
        .where(eq(employeeDocuments.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting employee document:', error);
      return false;
    }
  }

  // Time off request methods
  async getTimeOffRequests(organizationId: number, employeeId?: number): Promise<TimeOffRequest[]> {
    try {
      const whereConditions = [eq(timeOffRequests.organizationId, organizationId)];
      
      if (employeeId) {
        whereConditions.push(eq(timeOffRequests.employeeId, employeeId));
      }
      
      const requests = await db
        .select()
        .from(timeOffRequests)
        .where(and(...whereConditions))
        .orderBy(desc(timeOffRequests.requestedAt));
        
      return requests;
    } catch (error) {
      console.error('Error getting time off requests:', error);
      return [];
    }
  }

  async createTimeOffRequest(requestData: any): Promise<TimeOffRequest> {
    try {
      const [request] = await db
        .insert(timeOffRequests)
        .values(requestData)
        .returning();
      
      return request;
    } catch (error) {
      console.error('Error creating time off request:', error);
      throw error;
    }
  }

  async updateTimeOffRequest(id: number, updates: any): Promise<TimeOffRequest> {
    try {
      const [request] = await db
        .update(timeOffRequests)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(timeOffRequests.id, id))
        .returning();
      
      return request;
    } catch (error) {
      console.error('Error updating time off request:', error);
      throw error;
    }
  }

  async approveTimeOffRequest(id: number, approvedBy: number): Promise<TimeOffRequest> {
    try {
      const [request] = await db
        .update(timeOffRequests)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(timeOffRequests.id, id))
        .returning();
      
      return request;
    } catch (error) {
      console.error('Error approving time off request:', error);
      throw error;
    }
  }

  async rejectTimeOffRequest(id: number, approvedBy: number, reason: string): Promise<TimeOffRequest> {
    try {
      const [request] = await db
        .update(timeOffRequests)
        .set({
          status: 'rejected',
          approvedBy,
          rejectedReason: reason,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(timeOffRequests.id, id))
        .returning();
      
      return request;
    } catch (error) {
      console.error('Error rejecting time off request:', error);
      throw error;
    }
  }

  // Performance review methods
  async getPerformanceReviews(organizationId: number, employeeId?: number): Promise<PerformanceReview[]> {
    try {
      let query = db
        .select()
        .from(performanceReviews)
        .where(eq(performanceReviews.organizationId, organizationId));
      
      if (employeeId) {
        query = query.where(eq(performanceReviews.employeeId, employeeId));
      }
      
      const reviews = await query.orderBy(desc(performanceReviews.createdAt));
      return reviews;
    } catch (error) {
      console.error('Error getting performance reviews:', error);
      throw error;
    }
  }

  async createPerformanceReview(reviewData: any): Promise<PerformanceReview> {
    try {
      const [review] = await db
        .insert(performanceReviews)
        .values(reviewData)
        .returning();
      
      return review;
    } catch (error) {
      console.error('Error creating performance review:', error);
      throw error;
    }
  }

  async updatePerformanceReview(id: number, updates: any): Promise<PerformanceReview> {
    try {
      const [review] = await db
        .update(performanceReviews)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(performanceReviews.id, id))
        .returning();
      
      return review;
    } catch (error) {
      console.error('Error updating performance review:', error);
      throw error;
    }
  }

  // Disciplinary action methods
  async getDisciplinaryActions(organizationId: number, employeeId?: number): Promise<DisciplinaryAction[]> {
    try {
      let query = db
        .select()
        .from(disciplinaryActions)
        .where(and(
          eq(disciplinaryActions.organizationId, organizationId),
          eq(disciplinaryActions.isActive, true)
        ));
      
      if (employeeId) {
        query = query.where(eq(disciplinaryActions.employeeId, employeeId));
      }
      
      const actions = await query.orderBy(desc(disciplinaryActions.createdAt));
      return actions;
    } catch (error) {
      console.error('Error getting disciplinary actions:', error);
      throw error;
    }
  }

  async createDisciplinaryAction(actionData: any): Promise<DisciplinaryAction> {
    try {
      const [action] = await db
        .insert(disciplinaryActions)
        .values(actionData)
        .returning();
      
      return action;
    } catch (error) {
      console.error('Error creating disciplinary action:', error);
      throw error;
    }
  }

  async updateDisciplinaryAction(id: number, updates: any): Promise<DisciplinaryAction> {
    try {
      const [action] = await db
        .update(disciplinaryActions)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(disciplinaryActions.id, id))
        .returning();
      
      return action;
    } catch (error) {
      console.error('Error updating disciplinary action:', error);
      throw error;
    }
  }

  // User-specific dashboard settings
  async getUserDashboardSettings(userId: number): Promise<any> {
    try {
      const [result] = await db.select()
        .from(userDashboardSettings)
        .where(eq(userDashboardSettings.userId, userId));
      
      if (result) {
        return JSON.parse(result.settings);
      }
      
      // Return default settings if none exist
      return {
        showStatsCards: true,
        showRevenueChart: true,
        showRecentActivity: true,
        showRecentInvoices: true,
        showNotifications: true,
        showQuickActions: true,
        showProjectsOverview: false,
        showWeatherWidget: false,
        showTasksWidget: false,
        showCalendarWidget: false,
        showMessagesWidget: false,
        showTeamOverview: false,
        layoutType: 'grid',
        gridColumns: 3,
        widgetSize: 'medium',
        colorTheme: 'default',
        animationsEnabled: true,
        statsCardsCount: 4,
        recentItemsCount: 5,
        refreshInterval: 30,
        showWelcomeMessage: true,
        compactMode: false,
        widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
      };
    } catch (error) {
      console.error("Error getting user dashboard settings:", error);
      throw error;
    }
  }

  async saveUserDashboardSettings(userId: number, settings: any): Promise<void> {
    try {
      // Check if settings already exist for this user
      const [existing] = await db.select()
        .from(userDashboardSettings)
        .where(eq(userDashboardSettings.userId, userId));

      if (existing) {
        // Update existing settings
        await db.update(userDashboardSettings)
          .set({
            settings: JSON.stringify(settings),
            updatedAt: new Date()
          })
          .where(eq(userDashboardSettings.userId, userId));
      } else {
        // Insert new settings
        await db.insert(userDashboardSettings)
          .values({
            userId,
            settings: JSON.stringify(settings),
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error("Error saving user dashboard settings:", error);
      throw error;
    }
  }

  // Dashboard Profile methods
  async getDashboardProfiles(): Promise<any[]> {
    try {
      return await db.select().from(dashboardProfiles).orderBy(asc(dashboardProfiles.name));
    } catch (error) {
      console.error("Error getting dashboard profiles:", error);
      throw error;
    }
  }

  async getDashboardProfile(profileType: string): Promise<any> {
    try {
      const [profile] = await db
        .select()
        .from(dashboardProfiles)
        .where(eq(dashboardProfiles.profileType, profileType));
      return profile;
    } catch (error) {
      console.error("Error getting dashboard profile:", error);
      throw error;
    }
  }

  async createDashboardProfile(profileData: any): Promise<any> {
    try {
      const [profile] = await db
        .insert(dashboardProfiles)
        .values(profileData)
        .returning();
      return profile;
    } catch (error) {
      console.error("Error creating dashboard profile:", error);
      throw error;
    }
  }

  async updateDashboardProfile(id: number, updates: any): Promise<any> {
    try {
      const [profile] = await db
        .update(dashboardProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(dashboardProfiles.id, id))
        .returning();
      return profile;
    } catch (error) {
      console.error("Error updating dashboard profile:", error);
      throw error;
    }
  }

  async updateUserDashboardSettings(userId: number, organizationId: number, settings: any): Promise<any> {
    try {
      // Check if settings already exist for this user
      const [existing] = await db.select()
        .from(userDashboardSettings)
        .where(and(
          eq(userDashboardSettings.userId, userId),
          eq(userDashboardSettings.organizationId, organizationId)
        ));

      const settingsData = {
        userId,
        organizationId,
        profileType: settings.profileType || 'user',
        settings: JSON.stringify(settings),
        updatedAt: new Date()
      };

      if (existing) {
        // Update existing settings
        const [updated] = await db.update(userDashboardSettings)
          .set(settingsData)
          .where(and(
            eq(userDashboardSettings.userId, userId),
            eq(userDashboardSettings.organizationId, organizationId)
          ))
          .returning();
        return updated;
      } else {
        // Insert new settings
        const [created] = await db.insert(userDashboardSettings)
          .values({
            ...settingsData,
            createdAt: new Date()
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error updating user dashboard settings:", error);
      throw error;
    }
  }

  async applyDashboardProfile(userId: number, organizationId: number, profileType: string): Promise<any> {
    try {
      // Get the profile template
      const profile = await this.getDashboardProfile(profileType);
      if (!profile) {
        throw new Error(`Dashboard profile not found: ${profileType}`);
      }

      // Create settings based on profile
      const profileSettings = {
        profileType,
        showStatsCards: profile.showStatsCards,
        showRevenueChart: profile.showRevenueChart,
        showRecentActivity: profile.showRecentActivity,
        showRecentInvoices: profile.showRecentInvoices,
        showNotifications: profile.showNotifications,
        showQuickActions: profile.showQuickActions,
        showProjectsOverview: profile.showProjectsOverview,
        showWeatherWidget: profile.showWeatherWidget,
        showTasksWidget: profile.showTasksWidget,
        showCalendarWidget: profile.showCalendarWidget,
        showMessagesWidget: profile.showMessagesWidget,
        showTeamOverview: profile.showTeamOverview,
        layoutType: profile.layoutType,
        gridColumns: profile.gridColumns,
        widgetSize: profile.widgetSize,
        colorTheme: profile.colorTheme,
        animationsEnabled: true,
        statsCardsCount: 4,
        recentItemsCount: 5,
        refreshInterval: 30,
        showWelcomeMessage: true,
        compactMode: false,
        widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
      };

      // Apply the profile settings
      return await this.updateUserDashboardSettings(userId, organizationId, profileSettings);
    } catch (error) {
      console.error("Error applying dashboard profile:", error);
      throw error;
    }
  }

  // Navigation order methods
  async getNavigationOrder(userId: number, organizationId: number): Promise<NavigationOrder | undefined> {
    try {
      const [order] = await db
        .select()
        .from(navigationOrder)
        .where(and(
          eq(navigationOrder.userId, userId),
          eq(navigationOrder.organizationId, organizationId)
        ));
      
      return order || undefined;
    } catch (error) {
      console.error('Error getting navigation order:', error);
      throw error;
    }
  }

  async saveNavigationOrder(userId: number, organizationId: number, navigationItems: string[]): Promise<NavigationOrder> {
    try {
      // Check if order already exists
      const existing = await this.getNavigationOrder(userId, organizationId);
      
      if (existing) {
        // Update existing order
        const [order] = await db
          .update(navigationOrder)
          .set({
            navigationItems: navigationItems,
            updatedAt: new Date()
          })
          .where(and(
            eq(navigationOrder.userId, userId),
            eq(navigationOrder.organizationId, organizationId)
          ))
          .returning();
        
        return order;
      } else {
        // Create new order
        const [order] = await db
          .insert(navigationOrder)
          .values({
            userId,
            organizationId,
            navigationItems: navigationItems,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return order;
      }
    } catch (error) {
      console.error('Error saving navigation order:', error);
      throw error;
    }
  }

  async resetNavigationOrder(userId: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(navigationOrder)
        .where(and(
          eq(navigationOrder.userId, userId),
          eq(navigationOrder.organizationId, organizationId)
        ));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error resetting navigation order:', error);
      return false;
    }
  }

  // Backup methods
  async getBackupSettings(organizationId: number): Promise<BackupSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(backupSettings)
        .where(eq(backupSettings.organizationId, organizationId));
      
      return settings || undefined;
    } catch (error) {
      console.error('Error getting backup settings:', error);
      throw error;
    }
  }

  async createBackupSettings(settingsData: any): Promise<BackupSettings> {
    try {
      const [settings] = await db
        .insert(backupSettings)
        .values(settingsData)
        .returning();
      
      return settings;
    } catch (error) {
      console.error('Error creating backup settings:', error);
      throw error;
    }
  }

  async updateBackupSettings(organizationId: number, updates: any): Promise<BackupSettings> {
    try {
      const [settings] = await db
        .update(backupSettings)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(backupSettings.organizationId, organizationId))
        .returning();
      
      return settings;
    } catch (error) {
      console.error('Error updating backup settings:', error);
      throw error;
    }
  }

  async getBackupJobs(organizationId: number, limit: number = 20): Promise<BackupJob[]> {
    try {
      const jobs = await db
        .select()
        .from(backupJobs)
        .where(eq(backupJobs.organizationId, organizationId))
        .orderBy(desc(backupJobs.createdAt))
        .limit(limit);
      
      return jobs;
    } catch (error) {
      console.error('Error getting backup jobs:', error);
      throw error;
    }
  }

  async createBackupJob(jobData: any): Promise<BackupJob> {
    try {
      const [job] = await db
        .insert(backupJobs)
        .values(jobData)
        .returning();
      
      return job;
    } catch (error) {
      console.error('Error creating backup job:', error);
      throw error;
    }
  }

  async updateBackupJob(id: number, updates: any): Promise<BackupJob> {
    try {
      const [job] = await db
        .update(backupJobs)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(backupJobs.id, id))
        .returning();
      
      return job;
    } catch (error) {
      console.error('Error updating backup job:', error);
      throw error;
    }
  }

  async createManualBackup(organizationId: number, userId: number, options: any): Promise<any> {
    try {
      // Create backup job record
      const job = await this.createBackupJob({
        organizationId,
        status: 'running',
        type: 'manual',
        createdBy: userId,
        startedAt: new Date(),
        includedTables: options.includedTables || []
      });

      // Start backup process in background
      this.processBackup(job.id, organizationId, options).catch(error => {
        console.error('Backup process failed:', error);
        this.updateBackupJob(job.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        });
      });

      return job;
    } catch (error) {
      console.error('Error creating manual backup:', error);
      throw error;
    }
  }

  private async processBackup(jobId: number, organizationId: number, options: any): Promise<void> {
    const startTime = Date.now();
    let recordCount = 0;
    const includedTables: string[] = [];
    const backupData: any = {};

    try {
      // Include different data types based on options
      if (options.includeCustomers) {
        const customers = await db.select().from(customers).where(eq(customers.organizationId, organizationId));
        backupData.customers = customers;
        recordCount += customers.length;
        includedTables.push('customers');
      }

      if (options.includeProjects) {
        const projects = await db.select().from(projects).where(eq(projects.organizationId, organizationId));
        backupData.projects = projects;
        recordCount += projects.length;
        includedTables.push('projects');
      }

      if (options.includeInvoices) {
        const invoices = await db.select().from(invoices).where(eq(invoices.organizationId, organizationId));
        backupData.invoices = invoices;
        recordCount += invoices.length;
        includedTables.push('invoices');
      }

      if (options.includeExpenses) {
        const expenses = await db.select().from(expenses).where(eq(expenses.organizationId, organizationId));
        backupData.expenses = expenses;
        recordCount += expenses.length;
        includedTables.push('expenses');
      }

      if (options.includeUsers) {
        const users = await db.select().from(users).where(eq(users.organizationId, organizationId));
        backupData.users = users.map(user => ({ ...user, password: '[REDACTED]' })); // Don't backup passwords
        recordCount += users.length;
        includedTables.push('users');
      }

      if (options.includeSettings) {
        const settings = await db.select().from(settings).where(eq(settings.organizationId, organizationId));
        backupData.settings = settings;
        recordCount += settings.length;
        includedTables.push('settings');
      }

      if (options.includeMessages) {
        const messages = await db.select().from(internalMessages).where(eq(internalMessages.organizationId, organizationId));
        backupData.messages = messages;
        recordCount += messages.length;
        includedTables.push('messages');
      }

      // Generate backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-org-${organizationId}-${timestamp}.json`;
      const filePath = `./backups/${fileName}`;
      
      // Create backups directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const backupDir = './backups';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Add metadata to backup
      const backupWithMetadata = {
        metadata: {
          organizationId,
          backupDate: new Date().toISOString(),
          version: '1.0',
          includedTables,
          recordCount
        },
        data: backupData
      };

      // Write backup file
      fs.writeFileSync(filePath, JSON.stringify(backupWithMetadata, null, 2));
      
      const fileSize = fs.statSync(filePath).size;
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Update job as completed
      await this.updateBackupJob(jobId, {
        status: 'completed',
        fileName,
        filePath,
        fileSize,
        recordCount,
        includedTables,
        duration,
        completedAt: new Date()
      });

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.updateBackupJob(jobId, {
        status: 'failed',
        errorMessage: error.message,
        duration,
        completedAt: new Date()
      });
      throw error;
    }
  }
  // File methods - Additional methods for file management
  async getFile(id: number, organizationId: number): Promise<any> {
    try {
      const [file] = await db
        .select()
        .from(fileManager)
        .where(
          and(
            eq(fileManager.id, id),
            eq(fileManager.organizationId, organizationId)
          )
        )
        .limit(1);
      
      return file || null;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async createTextFile(organizationId: number, userId: number, name: string, content: string, folderId?: number): Promise<any> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Create the organization folder if it doesn't exist
      const orgDir = path.join(process.cwd(), 'uploads', `org-${organizationId}`, 'files');
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }
      
      // Create the file
      const fileName = `${name}.txt`;
      const filePath = path.join(orgDir, fileName);
      fs.writeFileSync(filePath, content);
      
      // Get file stats
      const stats = fs.statSync(filePath);
      const relativePath = `uploads/org-${organizationId}/files/${fileName}`;
      
      // Save to database
      const [file] = await db
        .insert(fileManager)
        .values({
          organizationId,
          uploadedBy: userId,
          fileName,
          originalName: fileName,
          filePath: relativePath,
          fileSize: stats.size,
          mimeType: 'text/plain',
          fileType: 'text',
          description: 'Text file',
          folderId,
          isPublic: false,
          downloadCount: 0,
        })
        .returning();
      
      return file;
    } catch (error) {
      console.error('Error creating text file:', error);
      throw error;
    }
  }

  async updateTextFile(id: number, content: string): Promise<any> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Get the file record
      const [file] = await db
        .select()
        .from(fileManager)
        .where(eq(fileManager.id, id))
        .limit(1);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Update the file content
      const fullPath = path.join(process.cwd(), file.filePath);
      fs.writeFileSync(fullPath, content);
      
      // Update file stats
      const stats = fs.statSync(fullPath);
      
      // Update database record
      const [updatedFile] = await db
        .update(fileManager)
        .set({
          fileSize: stats.size,
          updatedAt: new Date(),
        })
        .where(eq(fileManager.id, id))
        .returning();
      
      return updatedFile;
    } catch (error) {
      console.error('Error updating text file:', error);
      throw error;
    }
  }

  async convertToPdf(fileId: number, organizationId: number): Promise<string> {
    try {
      const fs = require('fs');
      const path = require('path');
      const { textToPdf } = require('./pdfConverter');
      
      // Get the file record
      const [file] = await db
        .select()
        .from(fileManager)
        .where(
          and(
            eq(fileManager.id, fileId),
            eq(fileManager.organizationId, organizationId)
          )
        )
        .limit(1);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Read the file content
      const fullPath = path.join(process.cwd(), file.filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Generate PDF
      const pdfFileName = file.fileName.replace(/\.[^/.]+$/, '.pdf');
      const pdfPath = path.join(process.cwd(), 'uploads', `org-${organizationId}`, 'files', pdfFileName);
      
      await textToPdf(content, pdfPath);
      
      // Create a new file record for the PDF
      const stats = fs.statSync(pdfPath);
      const relativePath = `uploads/org-${organizationId}/files/${pdfFileName}`;
      
      const [pdfFile] = await db
        .insert(fileManager)
        .values({
          organizationId,
          uploadedBy: file.uploadedBy,
          fileName: pdfFileName,
          originalName: pdfFileName,
          filePath: relativePath,
          fileSize: stats.size,
          mimeType: 'application/pdf',
          fileType: 'pdf',
          description: `PDF version of ${file.fileName}`,
          folderId: file.folderId,
          isPublic: false,
          downloadCount: 0,
        })
        .returning();
      
      return relativePath;
    } catch (error) {
      console.error('Error converting to PDF:', error);
      throw error;
    }
  }

  // Folder methods
  async getFolders(organizationId: number, parentId?: number): Promise<any[]> {
    try {
      let whereCondition;
      
      if (parentId) {
        whereCondition = and(
          eq(fileFolders.organizationId, organizationId),
          eq(fileFolders.parentFolderId, parentId)
        );
      } else {
        whereCondition = and(
          eq(fileFolders.organizationId, organizationId),
          isNull(fileFolders.parentFolderId)
        );
      }
      
      const folders = await db
        .select()
        .from(fileFolders)
        .where(whereCondition)
        .orderBy(asc(fileFolders.name));
      
      return folders;
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  }

  async createFolder(folderData: any): Promise<any> {
    try {
      const [folder] = await db
        .insert(fileFolders)
        .values(folderData)
        .returning();
      
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async updateFolder(id: number, updates: any): Promise<any> {
    try {
      const [folder] = await db
        .update(fileFolders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(fileFolders.id, id))
        .returning();
      
      return folder;
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  async deleteFolder(id: number): Promise<void> {
    try {
      await db
        .delete(fileFolders)
        .where(eq(fileFolders.id, id));
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // Drag and drop methods
  async moveFileToFolder(fileId: number, folderId: number | null, userId: number): Promise<{ file: any; previousFolderId: number | null }> {
    try {
      // Get the current folder ID before moving
      const currentFile = await db
        .select({ folderId: fileManager.folderId })
        .from(fileManager)
        .where(eq(fileManager.id, fileId))
        .limit(1);
      
      if (currentFile.length === 0) {
        throw new Error('File not found');
      }
      
      const previousFolderId = currentFile[0].folderId;
      
      // Update the file's folder
      const [updatedFile] = await db
        .update(fileManager)
        .set({
          folderId: folderId,
          updatedAt: new Date(),
        })
        .where(eq(fileManager.id, fileId))
        .returning();
      
      return { file: updatedFile, previousFolderId };
    } catch (error) {
      console.error('Error moving file to folder:', error);
      throw error;
    }
  }

  async undoFileMove(fileId: number, previousFolderId: number | null, userId: number): Promise<any> {
    try {
      const [restoredFile] = await db
        .update(fileManager)
        .set({
          folderId: previousFolderId,
          updatedAt: new Date(),
        })
        .where(eq(fileManager.id, fileId))
        .returning();
      
      return restoredFile;
    } catch (error) {
      console.error('Error undoing file move:', error);
      throw error;
    }
  }

  // Digital signature methods
  async signDocument(fileId: number, signatureData: string, signerName: string, userId: number): Promise<any> {
    try {
      const [updatedFile] = await db
        .update(fileManager)
        .set({
          signatureStatus: 'signed',
          signatureData,
          signedBy: signerName,
          signedByUserId: userId,
          signedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fileManager.id, fileId))
        .returning();

      return updatedFile;
    } catch (error) {
      console.error('Error signing document:', error);
      throw error;
    }
  }

  async getSignedDocument(fileId: number): Promise<any> {
    try {
      const [file] = await db
        .select()
        .from(fileManager)
        .where(eq(fileManager.id, fileId));

      if (!file || file.signatureStatus !== 'signed') {
        throw new Error('Signed document not found');
      }

      return file;
    } catch (error) {
      console.error('Error getting signed document:', error);
      throw error;
    }
  }

  // Document signature field methods
  async createSignatureField(fieldData: any): Promise<any> {
    try {
      const [field] = await db
        .insert(documentSignatureFields)
        .values(fieldData)
        .returning();

      return field;
    } catch (error) {
      console.error('Error creating signature field:', error);
      throw error;
    }
  }

  async getSignatureFields(fileId: number): Promise<any[]> {
    try {
      const fields = await db
        .select()
        .from(documentSignatureFields)
        .where(eq(documentSignatureFields.fileId, fileId))
        .orderBy(asc(documentSignatureFields.createdAt));

      return fields;
    } catch (error) {
      console.error('Error getting signature fields:', error);
      throw error;
    }
  }

  async updateSignatureField(fieldId: number, updates: any): Promise<any> {
    try {
      const [field] = await db
        .update(documentSignatureFields)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(documentSignatureFields.id, fieldId))
        .returning();

      return field;
    } catch (error) {
      console.error('Error updating signature field:', error);
      throw error;
    }
  }

  async deleteSignatureField(fieldId: number): Promise<void> {
    try {
      await db
        .delete(documentSignatureFields)
        .where(eq(documentSignatureFields.id, fieldId));
    } catch (error) {
      console.error('Error deleting signature field:', error);
      throw error;
    }
  }

  async signDocumentField(fieldId: number, signatureData: string, signerName: string, userId: number): Promise<any> {
    try {
      const [field] = await db
        .update(documentSignatureFields)
        .set({
          signatureData,
          signedBy: signerName,
          signedByUserId: userId,
          signedAt: new Date(),
          status: 'signed',
          updatedAt: new Date(),
        })
        .where(eq(documentSignatureFields.id, fieldId))
        .returning();

      return field;
    } catch (error) {
      console.error('Error signing document field:', error);
      throw error;
    }
  }

  // Subscription plan management methods
  async getAllSubscriptionPlans(): Promise<any[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .orderBy(asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.id));
      return plans;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      return [];
    }
  }

  async getSubscriptionPlan(id: number): Promise<any> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));
      return plan || null;
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      return null;
    }
  }

  async createSubscriptionPlan(planData: any): Promise<any> {
    try {
      const [plan] = await db
        .insert(subscriptionPlans)
        .values({
          ...planData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return plan;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  async updateSubscriptionPlan(id: number, updates: any): Promise<any> {
    try {
      const [plan] = await db
        .update(subscriptionPlans)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, id))
        .returning();
      return plan;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    try {
      await db
        .delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      throw error;
    }
  }

  // Plan feature management methods (for future expansion)
  async getPlanFeatures(): Promise<any[]> {
    return []; // Placeholder for dynamic features
  }

  async createPlanFeature(featureData: any): Promise<any> {
    return {}; // Placeholder for dynamic features
  }

  async updatePlanFeature(id: number, updates: any): Promise<any> {
    return {}; // Placeholder for dynamic features
  }

  async deletePlanFeature(id: number): Promise<void> {
    // Placeholder for dynamic features
  }

  async getPlanFeatureValues(planId: number): Promise<any[]> {
    return []; // Placeholder for dynamic features
  }

  async setPlanFeatureValue(planId: number, featureId: number, value: any): Promise<any> {
    return {}; // Placeholder for dynamic features
  }

  async deletePlanFeatureValue(planId: number, featureId: number): Promise<void> {
    // Placeholder for dynamic features
  }

  // Parts and Supplies Inventory methods
  async getPartsSupplies(organizationId: number): Promise<any[]> {
    try {
      const parts = await db
        .select()
        .from(partsSupplies)
        .where(and(
          eq(partsSupplies.organizationId, organizationId),
          eq(partsSupplies.isActive, true)
        ))
        .orderBy(asc(partsSupplies.name));
      return parts;
    } catch (error) {
      console.error('Error fetching parts and supplies:', error);
      return [];
    }
  }

  async getPartSupply(id: number, organizationId: number): Promise<any> {
    try {
      const [part] = await db
        .select()
        .from(partsSupplies)
        .where(and(
          eq(partsSupplies.id, id),
          eq(partsSupplies.organizationId, organizationId)
        ));
      return part;
    } catch (error) {
      console.error('Error fetching part supply:', error);
      return null;
    }
  }

  async createPartSupply(partData: any): Promise<any> {
    try {
      const [newPart] = await db
        .insert(partsSupplies)
        .values({
          ...partData,
          isLowStock: partData.currentStock <= partData.minStockLevel,
          isOutOfStock: partData.currentStock === 0
        })
        .returning();

      // Check if we need to create a low stock alert
      if (newPart.isLowStock) {
        await this.createStockAlert({
          organizationId: newPart.organizationId,
          partId: newPart.id,
          alertType: newPart.isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          currentStock: newPart.currentStock,
          minStockLevel: newPart.minStockLevel
        });
      }

      return newPart;
    } catch (error) {
      console.error('Error creating part supply:', error);
      throw error;
    }
  }

  async updatePartSupply(id: number, updates: any): Promise<any> {
    try {
      const [updatedPart] = await db
        .update(partsSupplies)
        .set({
          ...updates,
          updatedAt: new Date(),
          isLowStock: updates.currentStock !== undefined ? 
            updates.currentStock <= (updates.minStockLevel ?? 0) : undefined,
          isOutOfStock: updates.currentStock !== undefined ? 
            updates.currentStock === 0 : undefined
        })
        .where(eq(partsSupplies.id, id))
        .returning();

      // Check if we need to create or update stock alerts
      if (updatedPart && updates.currentStock !== undefined) {
        await this.checkAndCreateLowStockAlerts(updatedPart.organizationId);
      }

      return updatedPart;
    } catch (error) {
      console.error('Error updating part supply:', error);
      throw error;
    }
  }

  async deletePartSupply(id: number): Promise<boolean> {
    try {
      await db.update(partsSupplies)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(partsSupplies.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting part supply:', error);
      return false;
    }
  }

  async updatePartStock(partId: number, newStock: number, userId: number, reason?: string): Promise<any> {
    try {
      // Get current part
      const [currentPart] = await db
        .select()
        .from(partsSupplies)
        .where(eq(partsSupplies.id, partId));

      if (!currentPart) {
        throw new Error('Part not found');
      }

      const previousStock = currentPart.currentStock;
      const quantity = newStock - previousStock;

      // Update part stock
      const [updatedPart] = await db
        .update(partsSupplies)
        .set({
          currentStock: newStock,
          isLowStock: newStock <= currentPart.minStockLevel,
          isOutOfStock: newStock === 0,
          updatedAt: new Date()
        })
        .where(eq(partsSupplies.id, partId))
        .returning();

      // Create inventory transaction
      await this.createInventoryTransaction({
        organizationId: currentPart.organizationId,
        partId: partId,
        transactionType: quantity > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(quantity),
        previousStock,
        newStock,
        reason: reason || 'Manual adjustment',
        createdBy: userId
      });

      // Check for low stock alerts
      await this.checkAndCreateLowStockAlerts(currentPart.organizationId);

      return updatedPart;
    } catch (error) {
      console.error('Error updating part stock:', error);
      throw error;
    }
  }

  // Parts Categories methods
  async getPartsCategories(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(partsCategories)
        .where(and(
          eq(partsCategories.organizationId, organizationId),
          eq(partsCategories.isActive, true)
        ))
        .orderBy(asc(partsCategories.name));
    } catch (error) {
      console.error('Error fetching parts categories:', error);
      return [];
    }
  }

  async createPartsCategory(categoryData: any): Promise<any> {
    try {
      const [category] = await db
        .insert(partsCategories)
        .values(categoryData)
        .returning();
      return category;
    } catch (error) {
      console.error('Error creating parts category:', error);
      throw error;
    }
  }

  async updatePartsCategory(id: number, updates: any): Promise<any> {
    try {
      const [category] = await db
        .update(partsCategories)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(partsCategories.id, id))
        .returning();
      return category;
    } catch (error) {
      console.error('Error updating parts category:', error);
      throw error;
    }
  }

  async deletePartsCategory(id: number): Promise<boolean> {
    try {
      await db.update(partsCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(partsCategories.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting parts category:', error);
      return false;
    }
  }

  // Inventory Transaction methods
  async getInventoryTransactions(organizationId: number, partId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: inventoryTransactions.id,
          partId: inventoryTransactions.partId,
          transactionType: inventoryTransactions.transactionType,
          quantity: inventoryTransactions.quantity,
          previousStock: inventoryTransactions.previousStock,
          newStock: inventoryTransactions.newStock,
          reason: inventoryTransactions.reason,
          reference: inventoryTransactions.reference,
          notes: inventoryTransactions.notes,
          unitCost: inventoryTransactions.unitCost,
          totalCost: inventoryTransactions.totalCost,
          fromLocation: inventoryTransactions.fromLocation,
          toLocation: inventoryTransactions.toLocation,
          transactionDate: inventoryTransactions.transactionDate,
          createdAt: inventoryTransactions.createdAt,
          createdBy: inventoryTransactions.createdBy,
          partName: partsSupplies.name,
          partSku: partsSupplies.sku
        })
        .from(inventoryTransactions)
        .leftJoin(partsSupplies, eq(inventoryTransactions.partId, partsSupplies.id))
        .where(eq(inventoryTransactions.organizationId, organizationId));

      if (partId) {
        query = query.where(eq(inventoryTransactions.partId, partId));
      }

      return await query.orderBy(desc(inventoryTransactions.createdAt));
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      return [];
    }
  }

  async createInventoryTransaction(transactionData: any): Promise<any> {
    try {
      const [transaction] = await db
        .insert(inventoryTransactions)
        .values(transactionData)
        .returning();
      return transaction;
    } catch (error) {
      console.error('Error creating inventory transaction:', error);
      throw error;
    }
  }

  // Stock Alert methods
  async getStockAlerts(organizationId: number, activeOnly: boolean = true): Promise<any[]> {
    try {
      let query = db
        .select({
          id: stockAlerts.id,
          partId: stockAlerts.partId,
          alertType: stockAlerts.alertType,
          currentStock: stockAlerts.currentStock,
          minStockLevel: stockAlerts.minStockLevel,
          isActive: stockAlerts.isActive,
          isRead: stockAlerts.isRead,
          acknowledgedBy: stockAlerts.acknowledgedBy,
          acknowledgedAt: stockAlerts.acknowledgedAt,
          createdAt: stockAlerts.createdAt,
          partName: partsSupplies.name,
          partSku: partsSupplies.sku,
          partCategory: partsSupplies.category
        })
        .from(stockAlerts)
        .leftJoin(partsSupplies, eq(stockAlerts.partId, partsSupplies.id))
        .where(eq(stockAlerts.organizationId, organizationId));

      if (activeOnly) {
        query = query.where(eq(stockAlerts.isActive, true));
      }

      return await query.orderBy(desc(stockAlerts.createdAt));
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return [];
    }
  }

  async createStockAlert(alertData: any): Promise<any> {
    try {
      const [alert] = await db
        .insert(stockAlerts)
        .values(alertData)
        .returning();
      return alert;
    } catch (error) {
      console.error('Error creating stock alert:', error);
      throw error;
    }
  }

  async acknowledgeStockAlert(alertId: number, userId: number): Promise<any> {
    try {
      const [alert] = await db
        .update(stockAlerts)
        .set({
          isRead: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(stockAlerts.id, alertId))
        .returning();
      return alert;
    } catch (error) {
      console.error('Error acknowledging stock alert:', error);
      throw error;
    }
  }

  async checkAndCreateLowStockAlerts(organizationId: number): Promise<any[]> {
    try {
      // Get parts that are low on stock but don't have active alerts
      const lowStockParts = await db
        .select()
        .from(partsSupplies)
        .where(and(
          eq(partsSupplies.organizationId, organizationId),
          eq(partsSupplies.isActive, true),
          or(
            eq(partsSupplies.isLowStock, true),
            eq(partsSupplies.isOutOfStock, true)
          )
        ));

      const newAlerts = [];

      for (const part of lowStockParts) {
        // Check if there's already an active alert for this part
        const [existingAlert] = await db
          .select()
          .from(stockAlerts)
          .where(and(
            eq(stockAlerts.partId, part.id),
            eq(stockAlerts.isActive, true)
          ));

        if (!existingAlert) {
          const alertType = part.isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK';
          const alert = await this.createStockAlert({
            organizationId: part.organizationId,
            partId: part.id,
            alertType,
            currentStock: part.currentStock,
            minStockLevel: part.minStockLevel
          });
          newAlerts.push(alert);
        }
      }

      return newAlerts;
    } catch (error) {
      console.error('Error checking and creating low stock alerts:', error);
      return [];
    }
  }

  // Market Research Competitors methods
  async getMarketResearchCompetitors(organizationId: number, businessNiche?: string): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(marketResearchCompetitors)
        .where(
          and(
            eq(marketResearchCompetitors.organizationId, organizationId),
            eq(marketResearchCompetitors.isActive, true)
          )
        );

      if (businessNiche) {
        query = query.where(eq(marketResearchCompetitors.businessNiche, businessNiche));
      }

      return await query.orderBy(marketResearchCompetitors.name);
    } catch (error) {
      console.error('Error fetching market research competitors:', error);
      throw error;
    }
  }

  async getMarketResearchCompetitor(id: number, organizationId: number): Promise<any> {
    try {
      const [competitor] = await db
        .select()
        .from(marketResearchCompetitors)
        .where(
          and(
            eq(marketResearchCompetitors.id, id),
            eq(marketResearchCompetitors.organizationId, organizationId)
          )
        );

      return competitor;
    } catch (error) {
      console.error('Error fetching market research competitor:', error);
      throw error;
    }
  }

  async createMarketResearchCompetitor(competitorData: any): Promise<any> {
    try {
      const [competitor] = await db
        .insert(marketResearchCompetitors)
        .values({
          organizationId: competitorData.organizationId,
          name: competitorData.name,
          location: competitorData.location,
          services: competitorData.services || [],
          pricing: competitorData.pricing,
          rating: competitorData.rating ? parseFloat(competitorData.rating) : null,
          website: competitorData.website,
          facebookUrl: competitorData.facebookUrl,
          instagramUrl: competitorData.instagramUrl,
          twitterUrl: competitorData.twitterUrl,
          linkedinUrl: competitorData.linkedinUrl,
          youtubeUrl: competitorData.youtubeUrl,
          googleBusinessUrl: competitorData.googleBusinessUrl,
          businessNiche: competitorData.businessNiche,
          marketShare: competitorData.marketShare,
          estimatedRevenue: competitorData.estimatedRevenue,
          strengths: competitorData.strengths || [],
          weaknesses: competitorData.weaknesses || [],
          notes: competitorData.notes,
          isActive: true
        })
        .returning();

      return competitor;
    } catch (error) {
      console.error('Error creating market research competitor:', error);
      throw error;
    }
  }

  async updateMarketResearchCompetitor(id: number, updates: any): Promise<any> {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.services !== undefined) updateData.services = updates.services;
      if (updates.pricing !== undefined) updateData.pricing = updates.pricing;
      if (updates.rating !== undefined) updateData.rating = updates.rating ? parseFloat(updates.rating) : null;
      if (updates.website !== undefined) updateData.website = updates.website;
      if (updates.facebookUrl !== undefined) updateData.facebookUrl = updates.facebookUrl;
      if (updates.instagramUrl !== undefined) updateData.instagramUrl = updates.instagramUrl;
      if (updates.twitterUrl !== undefined) updateData.twitterUrl = updates.twitterUrl;
      if (updates.linkedinUrl !== undefined) updateData.linkedinUrl = updates.linkedinUrl;
      if (updates.youtubeUrl !== undefined) updateData.youtubeUrl = updates.youtubeUrl;
      if (updates.googleBusinessUrl !== undefined) updateData.googleBusinessUrl = updates.googleBusinessUrl;
      if (updates.businessNiche !== undefined) updateData.businessNiche = updates.businessNiche;
      if (updates.marketShare !== undefined) updateData.marketShare = updates.marketShare;
      if (updates.estimatedRevenue !== undefined) updateData.estimatedRevenue = updates.estimatedRevenue;
      if (updates.strengths !== undefined) updateData.strengths = updates.strengths;
      if (updates.weaknesses !== undefined) updateData.weaknesses = updates.weaknesses;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      updateData.updatedAt = new Date();

      const [competitor] = await db
        .update(marketResearchCompetitors)
        .set(updateData)
        .where(eq(marketResearchCompetitors.id, id))
        .returning();

      return competitor;
    } catch (error) {
      console.error('Error updating market research competitor:', error);
      throw error;
    }
  }

  async deleteMarketResearchCompetitor(id: number): Promise<void> {
    try {
      await db
        .update(marketResearchCompetitors)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(marketResearchCompetitors.id, id));
    } catch (error) {
      console.error('Error deleting market research competitor:', error);
      throw error;
    }
  }

  // Task Group methods
  async getTaskGroups(organizationId: number): Promise<any[]> {
    try {
      const groups = await db
        .select({
          id: taskGroups.id,
          name: taskGroups.name,
          description: taskGroups.description,
          color: taskGroups.color,
          isActive: taskGroups.isActive,
          createdById: taskGroups.createdById,
          createdAt: taskGroups.createdAt,
          updatedAt: taskGroups.updatedAt,
          createdBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
          taskCount: sql<number>`(
            SELECT COUNT(*)::int 
            FROM ${taskTemplates} 
            WHERE ${taskTemplates.taskGroupId} = ${taskGroups.id}
          )`
        })
        .from(taskGroups)
        .leftJoin(users, eq(taskGroups.createdById, users.id))
        .where(and(
          eq(taskGroups.organizationId, organizationId),
          eq(taskGroups.isActive, true)
        ))
        .orderBy(desc(taskGroups.createdAt));

      return groups;
    } catch (error) {
      console.error('Error getting task groups:', error);
      throw error;
    }
  }

  async getTaskGroup(id: number, organizationId: number): Promise<any> {
    try {
      const [group] = await db
        .select({
          id: taskGroups.id,
          name: taskGroups.name,
          description: taskGroups.description,
          color: taskGroups.color,
          isActive: taskGroups.isActive,
          createdById: taskGroups.createdById,
          createdAt: taskGroups.createdAt,
          updatedAt: taskGroups.updatedAt,
          createdBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          }
        })
        .from(taskGroups)
        .leftJoin(users, eq(taskGroups.createdById, users.id))
        .where(and(
          eq(taskGroups.id, id),
          eq(taskGroups.organizationId, organizationId),
          eq(taskGroups.isActive, true)
        ))
        .limit(1);

      if (!group) return null;

      // Get templates for this group
      const templates = await this.getTaskTemplates(id);
      
      return {
        ...group,
        templates
      };
    } catch (error) {
      console.error('Error getting task group:', error);
      throw error;
    }
  }

  async createTaskGroup(groupData: any): Promise<any> {
    try {
      const [group] = await db
        .insert(taskGroups)
        .values({
          organizationId: groupData.organizationId,
          name: groupData.name,
          description: groupData.description,
          color: groupData.color || '#3B82F6',
          createdById: groupData.createdById,
        })
        .returning();

      return group;
    } catch (error) {
      console.error('Error creating task group:', error);
      throw error;
    }
  }

  async updateTaskGroup(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const updateData: any = { updatedAt: new Date() };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const [group] = await db
        .update(taskGroups)
        .set(updateData)
        .where(and(
          eq(taskGroups.id, id),
          eq(taskGroups.organizationId, organizationId)
        ))
        .returning();

      return group;
    } catch (error) {
      console.error('Error updating task group:', error);
      throw error;
    }
  }

  async deleteTaskGroup(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .update(taskGroups)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(taskGroups.id, id),
          eq(taskGroups.organizationId, organizationId)
        ));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting task group:', error);
      throw error;
    }
  }

  // Task Template methods
  async getTaskTemplates(taskGroupId: number): Promise<any[]> {
    try {
      const templates = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.taskGroupId, taskGroupId))
        .orderBy(asc(taskTemplates.order), asc(taskTemplates.createdAt));

      return templates;
    } catch (error) {
      console.error('Error getting task templates:', error);
      throw error;
    }
  }

  async getTaskTemplate(id: number): Promise<any> {
    try {
      const [template] = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, id))
        .limit(1);

      return template;
    } catch (error) {
      console.error('Error getting task template:', error);
      throw error;
    }
  }

  async createTaskTemplate(templateData: any): Promise<any> {
    try {
      const [template] = await db
        .insert(taskTemplates)
        .values({
          taskGroupId: templateData.taskGroupId,
          title: templateData.title,
          description: templateData.description,
          type: templateData.type || 'checkbox',
          isRequired: templateData.isRequired || false,
          priority: templateData.priority || 'medium',
          estimatedHours: templateData.estimatedHours,
          order: templateData.order || 0,
        })
        .returning();

      return template;
    } catch (error) {
      console.error('Error creating task template:', error);
      throw error;
    }
  }

  async updateTaskTemplate(id: number, updates: any): Promise<any> {
    try {
      const updateData: any = { updatedAt: new Date() };
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.isRequired !== undefined) updateData.isRequired = updates.isRequired;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.estimatedHours !== undefined) updateData.estimatedHours = updates.estimatedHours;
      if (updates.order !== undefined) updateData.order = updates.order;

      const [template] = await db
        .update(taskTemplates)
        .set(updateData)
        .where(eq(taskTemplates.id, id))
        .returning();

      return template;
    } catch (error) {
      console.error('Error updating task template:', error);
      throw error;
    }
  }

  async deleteTaskTemplate(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(taskTemplates)
        .where(eq(taskTemplates.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting task template:', error);
      throw error;
    }
  }

  async createTasksFromGroup(projectId: number, taskGroupId: number, userId: number): Promise<any[]> {
    try {
      // Get all templates from the group
      const templates = await this.getTaskTemplates(taskGroupId);
      
      const createdTasks = [];
      
      for (const template of templates) {
        const [task] = await db
          .insert(tasks)
          .values({
            projectId,
            createdById: userId,
            title: template.title,
            description: template.description,
            type: template.type,
            isRequired: template.isRequired,
            priority: template.priority,
            estimatedHours: template.estimatedHours,
            status: 'todo',
          })
          .returning();
          
        createdTasks.push(task);
      }
      
      return createdTasks;
    } catch (error) {
      console.error('Error creating tasks from group:', error);
      throw error;
    }
  }

  // File and Folder Permissions methods
  async getFilePermissions(fileId: number, organizationId: number): Promise<any[]> {
    try {
      return await db
        .select({
          id: filePermissions.id,
          fileId: filePermissions.fileId,
          userId: filePermissions.userId,
          userRole: filePermissions.userRole,
          canView: filePermissions.canView,
          canDownload: filePermissions.canDownload,
          canEdit: filePermissions.canEdit,
          canDelete: filePermissions.canDelete,
          canShare: filePermissions.canShare,
          canMove: filePermissions.canMove,
          grantedBy: filePermissions.grantedBy,
          expiresAt: filePermissions.expiresAt,
          createdAt: filePermissions.createdAt,
          // User details if specific user
          userName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email
        })
        .from(filePermissions)
        .leftJoin(users, eq(filePermissions.userId, users.id))
        .where(
          and(
            eq(filePermissions.fileId, fileId),
            eq(filePermissions.organizationId, organizationId)
          )
        )
        .orderBy(filePermissions.createdAt);
    } catch (error) {
      console.error('Error getting file permissions:', error);
      throw error;
    }
  }

  async getFolderPermissions(folderId: number, organizationId: number): Promise<any[]> {
    try {
      return await db
        .select({
          id: folderPermissions.id,
          folderId: folderPermissions.folderId,
          userId: folderPermissions.userId,
          userRole: folderPermissions.userRole,
          canView: folderPermissions.canView,
          canUpload: folderPermissions.canUpload,
          canEdit: folderPermissions.canEdit,
          canDelete: folderPermissions.canDelete,
          canShare: folderPermissions.canShare,
          canMove: folderPermissions.canMove,
          canManagePermissions: folderPermissions.canManagePermissions,
          grantedBy: folderPermissions.grantedBy,
          expiresAt: folderPermissions.expiresAt,
          createdAt: folderPermissions.createdAt,
          // User details if specific user
          userName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email
        })
        .from(folderPermissions)
        .leftJoin(users, eq(folderPermissions.userId, users.id))
        .where(
          and(
            eq(folderPermissions.folderId, folderId),
            eq(folderPermissions.organizationId, organizationId)
          )
        )
        .orderBy(folderPermissions.createdAt);
    } catch (error) {
      console.error('Error getting folder permissions:', error);
      throw error;
    }
  }

  async createFilePermission(permissionData: any): Promise<any> {
    try {
      const [permission] = await db
        .insert(filePermissions)
        .values({
          ...permissionData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return permission;
    } catch (error) {
      console.error('Error creating file permission:', error);
      throw error;
    }
  }

  async createFolderPermission(permissionData: any): Promise<any> {
    try {
      const [permission] = await db
        .insert(folderPermissions)
        .values({
          ...permissionData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return permission;
    } catch (error) {
      console.error('Error creating folder permission:', error);
      throw error;
    }
  }

  async updateFilePermission(id: number, updates: any): Promise<any> {
    try {
      const [permission] = await db
        .update(filePermissions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(filePermissions.id, id))
        .returning();
      
      return permission;
    } catch (error) {
      console.error('Error updating file permission:', error);
      throw error;
    }
  }

  async updateFolderPermission(id: number, updates: any): Promise<any> {
    try {
      const [permission] = await db
        .update(folderPermissions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(folderPermissions.id, id))
        .returning();
      
      return permission;
    } catch (error) {
      console.error('Error updating folder permission:', error);
      throw error;
    }
  }

  async deleteFilePermission(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(filePermissions)
        .where(eq(filePermissions.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting file permission:', error);
      throw error;
    }
  }

  async deleteFolderPermission(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(folderPermissions)
        .where(eq(folderPermissions.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting folder permission:', error);
      throw error;
    }
  }

  async getUserFilePermissions(userId: number, fileId: number, organizationId: number): Promise<any> {
    try {
      // Get user role first
      const user = await this.getUser(userId);
      if (!user) return null;

      // Check for specific user permission
      const [specificPermission] = await db
        .select()
        .from(filePermissions)
        .where(
          and(
            eq(filePermissions.fileId, fileId),
            eq(filePermissions.userId, userId),
            eq(filePermissions.organizationId, organizationId)
          )
        )
        .limit(1);

      if (specificPermission) {
        return specificPermission;
      }

      // Check for role-based permission
      const [rolePermission] = await db
        .select()
        .from(filePermissions)
        .where(
          and(
            eq(filePermissions.fileId, fileId),
            eq(filePermissions.userRole, user.role),
            eq(filePermissions.organizationId, organizationId),
            isNull(filePermissions.userId)
          )
        )
        .limit(1);

      return rolePermission || null;
    } catch (error) {
      console.error('Error getting user file permissions:', error);
      throw error;
    }
  }

  async getUserFolderPermissions(userId: number, folderId: number, organizationId: number): Promise<any> {
    try {
      // Get user role first
      const user = await this.getUser(userId);
      if (!user) return null;

      // Check for specific user permission
      const [specificPermission] = await db
        .select()
        .from(folderPermissions)
        .where(
          and(
            eq(folderPermissions.folderId, folderId),
            eq(folderPermissions.userId, userId),
            eq(folderPermissions.organizationId, organizationId)
          )
        )
        .limit(1);

      if (specificPermission) {
        return specificPermission;
      }

      // Check for role-based permission
      const [rolePermission] = await db
        .select()
        .from(folderPermissions)
        .where(
          and(
            eq(folderPermissions.folderId, folderId),
            eq(folderPermissions.userRole, user.role),
            eq(folderPermissions.organizationId, organizationId),
            isNull(folderPermissions.userId)
          )
        )
        .limit(1);

      return rolePermission || null;
    } catch (error) {
      console.error('Error getting user folder permissions:', error);
      throw error;
    }
  }

  async getDefaultPermissions(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(defaultPermissions)
        .where(eq(defaultPermissions.organizationId, organizationId))
        .orderBy(defaultPermissions.userRole, defaultPermissions.resourceType);
    } catch (error) {
      console.error('Error getting default permissions:', error);
      throw error;
    }
  }

  async setDefaultPermissions(organizationId: number, userRole: string, resourceType: string, permissions: any): Promise<any> {
    try {
      // Check if default permission already exists
      const [existing] = await db
        .select()
        .from(defaultPermissions)
        .where(
          and(
            eq(defaultPermissions.organizationId, organizationId),
            eq(defaultPermissions.userRole, userRole),
            eq(defaultPermissions.resourceType, resourceType)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing
        const [updated] = await db
          .update(defaultPermissions)
          .set({
            ...permissions,
            updatedAt: new Date()
          })
          .where(eq(defaultPermissions.id, existing.id))
          .returning();
        
        return updated;
      } else {
        // Create new
        const [created] = await db
          .insert(defaultPermissions)
          .values({
            organizationId,
            userRole,
            resourceType,
            ...permissions,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error('Error setting default permissions:', error);
      throw error;
    }
  }

  async checkFileAccess(userId: number, fileId: number, organizationId: number, action: string): Promise<boolean> {
    try {
      // Get user to check role
      const user = await this.getUser(userId);
      if (!user) return false;

      // Admins have full access
      if (user.role === 'admin') return true;

      // Get file permissions
      const permissions = await this.getUserFilePermissions(userId, fileId, organizationId);
      
      if (!permissions) {
        // No specific permissions, check default permissions
        const [defaultPerm] = await db
          .select()
          .from(defaultPermissions)
          .where(
            and(
              eq(defaultPermissions.organizationId, organizationId),
              eq(defaultPermissions.userRole, user.role),
              eq(defaultPermissions.resourceType, 'file')
            )
          )
          .limit(1);
        
        if (defaultPerm) {
          switch (action) {
            case 'view': return defaultPerm.canView || false;
            case 'download': return defaultPerm.canDownload || false;
            case 'edit': return defaultPerm.canEdit || false;
            case 'delete': return defaultPerm.canDelete || false;
            case 'share': return defaultPerm.canShare || false;
            case 'move': return defaultPerm.canMove || false;
            default: return false;
          }
        }
        
        return false; // No permissions found
      }

      // Check specific action permission
      switch (action) {
        case 'view': return permissions.canView || false;
        case 'download': return permissions.canDownload || false;
        case 'edit': return permissions.canEdit || false;
        case 'delete': return permissions.canDelete || false;
        case 'share': return permissions.canShare || false;
        case 'move': return permissions.canMove || false;
        default: return false;
      }
    } catch (error) {
      console.error('Error checking file access:', error);
      return false;
    }
  }

  async checkFolderAccess(userId: number, folderId: number, organizationId: number, action: string): Promise<boolean> {
    try {
      // Get user to check role
      const user = await this.getUser(userId);
      if (!user) return false;

      // Admins have full access
      if (user.role === 'admin') return true;

      // Get folder permissions
      const permissions = await this.getUserFolderPermissions(userId, folderId, organizationId);
      
      if (!permissions) {
        // No specific permissions, check default permissions
        const [defaultPerm] = await db
          .select()
          .from(defaultPermissions)
          .where(
            and(
              eq(defaultPermissions.organizationId, organizationId),
              eq(defaultPermissions.userRole, user.role),
              eq(defaultPermissions.resourceType, 'folder')
            )
          )
          .limit(1);
        
        if (defaultPerm) {
          switch (action) {
            case 'view': return defaultPerm.canView || false;
            case 'upload': return defaultPerm.canUpload || false;
            case 'edit': return defaultPerm.canEdit || false;
            case 'delete': return defaultPerm.canDelete || false;
            case 'share': return defaultPerm.canShare || false;
            case 'move': return defaultPerm.canMove || false;
            case 'manage_permissions': return defaultPerm.canManagePermissions || false;
            default: return false;
          }
        }
        
        return false; // No permissions found
      }

      // Check specific action permission
      switch (action) {
        case 'view': return permissions.canView || false;
        case 'upload': return permissions.canUpload || false;
        case 'edit': return permissions.canEdit || false;
        case 'delete': return permissions.canDelete || false;
        case 'share': return permissions.canShare || false;
        case 'move': return permissions.canMove || false;
        case 'manage_permissions': return permissions.canManagePermissions || false;
        default: return false;
      }
    } catch (error) {
      console.error('Error checking folder access:', error);
      return false;
    }
  }

  // Vehicle Management methods
  async getVehicles(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.organizationId, organizationId), eq(vehicles.isActive, true)))
        .orderBy(asc(vehicles.vehicleNumber));
    } catch (error) {
      console.error('Error getting vehicles:', error);
      throw error;
    }
  }

  async getVehicle(id: number, organizationId: number): Promise<any> {
    try {
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, organizationId), eq(vehicles.isActive, true)))
        .limit(1);
      return vehicle;
    } catch (error) {
      console.error('Error getting vehicle:', error);
      throw error;
    }
  }

  async createVehicle(vehicleData: any): Promise<any> {
    try {
      const [vehicle] = await db
        .insert(vehicles)
        .values({
          ...vehicleData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return vehicle;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  async updateVehicle(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [vehicle] = await db
        .update(vehicles)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, organizationId)))
        .returning();
      return vehicle;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  async deleteVehicle(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .update(vehicles)
        .set({ 
          isActive: false, 
          updatedAt: new Date() 
        })
        .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, organizationId)));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  async getVehicleByNumber(vehicleNumber: string, organizationId: number): Promise<any> {
    try {
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(and(
          eq(vehicles.vehicleNumber, vehicleNumber), 
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.isActive, true)
        ))
        .limit(1);
      return vehicle;
    } catch (error) {
      console.error('Error getting vehicle by number:', error);
      throw error;
    }
  }

  async getVehicleByLicensePlate(licensePlate: string, organizationId: number): Promise<any> {
    try {
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(and(
          eq(vehicles.licensePlate, licensePlate), 
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.isActive, true)
        ))
        .limit(1);
      return vehicle;
    } catch (error) {
      console.error('Error getting vehicle by license plate:', error);
      throw error;
    }
  }

  // Vehicle Maintenance Interval methods
  async getVehicleMaintenanceIntervals(vehicleId: number, organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(vehicleMaintenanceIntervals)
        .where(and(
          eq(vehicleMaintenanceIntervals.vehicleId, vehicleId),
          eq(vehicleMaintenanceIntervals.organizationId, organizationId),
          eq(vehicleMaintenanceIntervals.isActive, true)
        ))
        .orderBy(asc(vehicleMaintenanceIntervals.maintenanceType));
    } catch (error) {
      console.error('Error getting vehicle maintenance intervals:', error);
      throw error;
    }
  }

  async createVehicleMaintenanceInterval(intervalData: any): Promise<any> {
    try {
      const [interval] = await db
        .insert(vehicleMaintenanceIntervals)
        .values({
          ...intervalData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return interval;
    } catch (error) {
      console.error('Error creating vehicle maintenance interval:', error);
      throw error;
    }
  }

  async updateVehicleMaintenanceInterval(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [interval] = await db
        .update(vehicleMaintenanceIntervals)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(vehicleMaintenanceIntervals.id, id),
          eq(vehicleMaintenanceIntervals.organizationId, organizationId)
        ))
        .returning();
      return interval;
    } catch (error) {
      console.error('Error updating vehicle maintenance interval:', error);
      throw error;
    }
  }

  async deleteVehicleMaintenanceInterval(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .update(vehicleMaintenanceIntervals)
        .set({ 
          isActive: false, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(vehicleMaintenanceIntervals.id, id),
          eq(vehicleMaintenanceIntervals.organizationId, organizationId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting vehicle maintenance interval:', error);
      throw error;
    }
  }

  async createDefaultMaintenanceIntervals(vehicleId: number, organizationId: number): Promise<any[]> {
    try {
      const defaultIntervals = [
        {
          vehicleId,
          organizationId,
          maintenanceType: 'oil_change',
          intervalMiles: 3000,
          intervalDays: 90,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'tire_pressure',
          intervalDays: 30,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'windshield_wash_fluid',
          intervalDays: 60,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'oil_level',
          intervalDays: 14,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'coolant_level',
          intervalDays: 30,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'tire_rotation',
          intervalMiles: 6000,
          intervalDays: 180,
          status: 'due'
        },
        {
          vehicleId,
          organizationId,
          maintenanceType: 'wipers',
          intervalDays: 365,
          status: 'due'
        }
      ];

      const intervals = [];
      for (const intervalData of defaultIntervals) {
        const [interval] = await db
          .insert(vehicleMaintenanceIntervals)
          .values({
            ...intervalData,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        intervals.push(interval);
      }
      
      return intervals;
    } catch (error) {
      console.error('Error creating default maintenance intervals:', error);
      throw error;
    }
  }

  async createCustomMaintenanceIntervals(vehicleId: number, organizationId: number, customIntervals: any[]): Promise<any[]> {
    try {
      const intervals = [];
      
      for (const customInterval of customIntervals) {
        const intervalData = {
          vehicleId,
          organizationId,
          maintenanceType: customInterval.maintenanceType,
          intervalDays: customInterval.intervalDays || null,
          intervalMiles: customInterval.intervalMiles || null,
          status: 'due'
        };

        const [interval] = await db
          .insert(vehicleMaintenanceIntervals)
          .values({
            ...intervalData,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        intervals.push(interval);
      }
      
      return intervals;
    } catch (error) {
      console.error('Error creating custom maintenance intervals:', error);
      throw error;
    }
  }

  // Vehicle Maintenance Record methods
  async getVehicleMaintenanceRecords(vehicleId: number, organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(vehicleMaintenanceRecords)
        .where(and(
          eq(vehicleMaintenanceRecords.vehicleId, vehicleId),
          eq(vehicleMaintenanceRecords.organizationId, organizationId)
        ))
        .orderBy(desc(vehicleMaintenanceRecords.performedDate));
    } catch (error) {
      console.error('Error getting vehicle maintenance records:', error);
      throw error;
    }
  }

  async createVehicleMaintenanceRecord(recordData: any): Promise<any> {
    try {
      const [record] = await db
        .insert(vehicleMaintenanceRecords)
        .values({
          ...recordData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return record;
    } catch (error) {
      console.error('Error creating vehicle maintenance record:', error);
      throw error;
    }
  }

  async updateMaintenanceStatus(intervalId: number, organizationId: number, status: string): Promise<any> {
    try {
      const [interval] = await db
        .update(vehicleMaintenanceIntervals)
        .set({
          status,
          lastMaintenanceDate: status === 'completed' ? new Date() : undefined,
          updatedAt: new Date()
        })
        .where(and(
          eq(vehicleMaintenanceIntervals.id, intervalId),
          eq(vehicleMaintenanceIntervals.organizationId, organizationId)
        ))
        .returning();
      return interval;
    } catch (error) {
      console.error('Error updating maintenance status:', error);
      throw error;
    }
  }

  async getMaintenanceStatusForVehicle(vehicleId: number, organizationId: number): Promise<any[]> {
    try {
      const intervals = await db
        .select()
        .from(vehicleMaintenanceIntervals)
        .where(and(
          eq(vehicleMaintenanceIntervals.vehicleId, vehicleId),
          eq(vehicleMaintenanceIntervals.organizationId, organizationId),
          eq(vehicleMaintenanceIntervals.isActive, true)
        ));

      // Calculate status for each interval based on current date and mileage
      const now = new Date();
      const statusResults = intervals.map(interval => {
        let status = 'due';
        
        if (interval.lastMaintenanceDate) {
          const daysSinceLastMaintenance = Math.floor(
            (now.getTime() - new Date(interval.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (interval.intervalDays && daysSinceLastMaintenance > interval.intervalDays) {
            status = 'overdue';
          } else if (interval.intervalDays && daysSinceLastMaintenance <= interval.intervalDays) {
            status = 'completed';
          }
        }

        return {
          ...interval,
          calculatedStatus: status,
          maintenanceTypeDisplay: interval.maintenanceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
      });

      return statusResults;
    } catch (error) {
      console.error('Error getting maintenance status for vehicle:', error);
      throw error;
    }
  }

  // Vehicle Job Assignment Methods
  async getVehicleJobAssignments(organizationId: number, date?: string): Promise<any[]> {
    try {
      let query = db
        .select({
          id: vehicleJobAssignments.id,
          userId: vehicleJobAssignments.userId,
          vehicleId: vehicleJobAssignments.vehicleId,
          projectId: vehicleJobAssignments.projectId,
          inspectionDate: vehicleJobAssignments.inspectionDate,
          assignmentDate: vehicleJobAssignments.assignmentDate,
          isActive: vehicleJobAssignments.isActive,
          notes: vehicleJobAssignments.notes,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          // Vehicle details
          vehicleNumber: vehicles.vehicleNumber,
          licensePlate: vehicles.licensePlate,
          vehicleMake: vehicles.make,
          vehicleModel: vehicles.model,
          // Project details
          projectName: projects.name,
          projectDescription: projects.description,
          projectAddress: projects.address,
          projectStatus: projects.status
        })
        .from(vehicleJobAssignments)
        .leftJoin(users, eq(vehicleJobAssignments.userId, users.id))
        .leftJoin(vehicles, eq(vehicleJobAssignments.vehicleId, vehicles.id))
        .leftJoin(projects, eq(vehicleJobAssignments.projectId, projects.id))
        .where(and(
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true)
        ));

      if (date) {
        query = query.where(and(
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true),
          sql`DATE(${vehicleJobAssignments.inspectionDate}) = ${date}`
        ));
      }

      return await query.orderBy(desc(vehicleJobAssignments.assignmentDate));
    } catch (error) {
      console.error('Error getting vehicle job assignments:', error);
      throw error;
    }
  }

  async getVehicleJobAssignmentsByUser(userId: number, organizationId: number, date?: string): Promise<any[]> {
    try {
      let query = db
        .select({
          id: vehicleJobAssignments.id,
          vehicleId: vehicleJobAssignments.vehicleId,
          projectId: vehicleJobAssignments.projectId,
          inspectionDate: vehicleJobAssignments.inspectionDate,
          assignmentDate: vehicleJobAssignments.assignmentDate,
          notes: vehicleJobAssignments.notes,
          // Vehicle details
          vehicleNumber: vehicles.vehicleNumber,
          licensePlate: vehicles.licensePlate,
          vehicleMake: vehicles.make,
          vehicleModel: vehicles.model,
          // Project details
          projectName: projects.name,
          projectDescription: projects.description,
          projectAddress: projects.address,
          projectStatus: projects.status
        })
        .from(vehicleJobAssignments)
        .leftJoin(vehicles, eq(vehicleJobAssignments.vehicleId, vehicles.id))
        .leftJoin(projects, eq(vehicleJobAssignments.projectId, projects.id))
        .where(and(
          eq(vehicleJobAssignments.userId, userId),
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true)
        ));

      if (date) {
        query = query.where(and(
          eq(vehicleJobAssignments.userId, userId),
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true),
          sql`DATE(${vehicleJobAssignments.inspectionDate}) = ${date}`
        ));
      }

      return await query.orderBy(desc(vehicleJobAssignments.assignmentDate));
    } catch (error) {
      console.error('Error getting vehicle job assignments by user:', error);
      throw error;
    }
  }

  async getVehicleJobAssignmentsByVehicle(vehicleId: number, organizationId: number, date?: string): Promise<any[]> {
    try {
      let query = db
        .select({
          id: vehicleJobAssignments.id,
          userId: vehicleJobAssignments.userId,
          projectId: vehicleJobAssignments.projectId,
          inspectionDate: vehicleJobAssignments.inspectionDate,
          assignmentDate: vehicleJobAssignments.assignmentDate,
          notes: vehicleJobAssignments.notes,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          // Project details
          projectName: projects.name,
          projectDescription: projects.description,
          projectAddress: projects.address,
          projectStatus: projects.status
        })
        .from(vehicleJobAssignments)
        .leftJoin(users, eq(vehicleJobAssignments.userId, users.id))
        .leftJoin(projects, eq(vehicleJobAssignments.projectId, projects.id))
        .where(and(
          eq(vehicleJobAssignments.vehicleId, vehicleId),
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true)
        ));

      if (date) {
        query = query.where(and(
          eq(vehicleJobAssignments.vehicleId, vehicleId),
          eq(vehicleJobAssignments.organizationId, organizationId),
          eq(vehicleJobAssignments.isActive, true),
          sql`DATE(${vehicleJobAssignments.inspectionDate}) = ${date}`
        ));
      }

      return await query.orderBy(desc(vehicleJobAssignments.assignmentDate));
    } catch (error) {
      console.error('Error getting vehicle job assignments by vehicle:', error);
      throw error;
    }
  }

  async createVehicleJobAssignment(assignmentData: any): Promise<any> {
    try {
      const [assignment] = await db
        .insert(vehicleJobAssignments)
        .values({
          ...assignmentData,
          assignmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return assignment;
    } catch (error) {
      console.error('Error creating vehicle job assignment:', error);
      throw error;
    }
  }

  async updateVehicleJobAssignment(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [assignment] = await db
        .update(vehicleJobAssignments)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(vehicleJobAssignments.id, id),
          eq(vehicleJobAssignments.organizationId, organizationId)
        ))
        .returning();
      
      return assignment;
    } catch (error) {
      console.error('Error updating vehicle job assignment:', error);
      throw error;
    }
  }

  async deleteVehicleJobAssignment(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(vehicleJobAssignments)
        .where(and(
          eq(vehicleJobAssignments.id, id),
          eq(vehicleJobAssignments.organizationId, organizationId)
        ));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting vehicle job assignment:', error);
      throw error;
    }
  }

  async getUsersWithVehicleInspections(organizationId: number, date: string): Promise<any[]> {
    try {
      // Find users who completed vehicle inspections on the specified date
      const inspectionUsers = await db
        .select({
          userId: inspectionRecords.userId,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          vehicleId: sql`CAST(${inspectionRecords.vehicleInfo}->>'vehicleId' AS INTEGER)`,
          vehicleNumber: sql`${inspectionRecords.vehicleInfo}->>'vehicleNumber'`,
          licensePlate: sql`${inspectionRecords.vehicleInfo}->>'licensePlate'`,
          inspectionDate: inspectionRecords.createdAt,
          inspectionType: inspectionRecords.type
        })
        .from(inspectionRecords)
        .leftJoin(users, eq(inspectionRecords.userId, users.id))
        .where(and(
          eq(inspectionRecords.organizationId, organizationId),
          sql`DATE(${inspectionRecords.createdAt}) = ${date}`,
          sql`${inspectionRecords.vehicleInfo}->>'vehicleId' IS NOT NULL`
        ))
        .orderBy(desc(inspectionRecords.createdAt));

      return inspectionUsers;
    } catch (error) {
      console.error('Error getting users with vehicle inspections:', error);
      throw error;
    }
  }

  async connectUsersToVehicleJobs(organizationId: number, date: string): Promise<any[]> {
    try {
      // Get users who completed vehicle inspections on the specified date
      const inspectionUsers = await this.getUsersWithVehicleInspections(organizationId, date);
      
      // Get all jobs assigned to users on the specified date
      const jobsForDate = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectDescription: projects.description,
          projectAddress: projects.address,
          projectStatus: projects.status,
          userId: projectUsers.userId,
          userRole: projectUsers.role,
          scheduledDate: projects.scheduledDate
        })
        .from(projects)
        .leftJoin(projectUsers, eq(projects.id, projectUsers.projectId))
        .leftJoin(users, eq(projectUsers.userId, users.id))
        .where(and(
          eq(users.organizationId, organizationId),
          sql`DATE(${projects.scheduledDate}) = ${date}`,
          isNotNull(projectUsers.userId)
        ));

      // Create vehicle job assignments for users who both completed inspections and are assigned to jobs
      const assignments = [];
      
      for (const inspectionUser of inspectionUsers) {
        // Find jobs assigned to this user on this date
        const userJobs = jobsForDate.filter(job => job.userId === inspectionUser.userId);
        
        for (const job of userJobs) {
          // Check if assignment already exists
          const existingAssignment = await db
            .select()
            .from(vehicleJobAssignments)
            .where(and(
              eq(vehicleJobAssignments.userId, inspectionUser.userId),
              eq(vehicleJobAssignments.vehicleId, inspectionUser.vehicleId),
              eq(vehicleJobAssignments.projectId, job.projectId),
              eq(vehicleJobAssignments.organizationId, organizationId),
              sql`DATE(${vehicleJobAssignments.inspectionDate}) = ${date}`
            ))
            .limit(1);

          if (existingAssignment.length === 0) {
            // Create new assignment
            const newAssignment = await this.createVehicleJobAssignment({
              organizationId,
              userId: inspectionUser.userId,
              vehicleId: inspectionUser.vehicleId,
              projectId: job.projectId,
              inspectionDate: new Date(date),
              notes: `Auto-assigned based on vehicle inspection: ${inspectionUser.vehicleNumber} (${inspectionUser.licensePlate})`
            });
            
            assignments.push({
              ...newAssignment,
              userFirstName: inspectionUser.userFirstName,
              userLastName: inspectionUser.userLastName,
              userEmail: inspectionUser.userEmail,
              vehicleNumber: inspectionUser.vehicleNumber,
              licensePlate: inspectionUser.licensePlate,
              projectName: job.projectName,
              projectAddress: job.projectAddress
            });
          }
        }
      }
      
      return assignments;
    } catch (error) {
      console.error('Error connecting users to vehicle jobs:', error);
      throw error;
    }
  }

  // Frontend Management methods
  async getFrontendCategories(organizationId: number): Promise<any[]> {
    try {
      const categories = await db
        .select()
        .from(frontendCategories)
        .where(eq(frontendCategories.organizationId, organizationId))
        .orderBy(asc(frontendCategories.type), asc(frontendCategories.sortOrder), asc(frontendCategories.name));
      return categories;
    } catch (error) {
      console.error('Error fetching frontend categories:', error);
      return [];
    }
  }

  async getFrontendCategory(id: number, organizationId: number): Promise<any> {
    try {
      const [category] = await db
        .select()
        .from(frontendCategories)
        .where(and(eq(frontendCategories.id, id), eq(frontendCategories.organizationId, organizationId)));
      return category || null;
    } catch (error) {
      console.error('Error fetching frontend category:', error);
      return null;
    }
  }

  async createFrontendCategory(categoryData: any): Promise<any> {
    try {
      const [category] = await db
        .insert(frontendCategories)
        .values({
          ...categoryData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return category;
    } catch (error) {
      console.error('Error creating frontend category:', error);
      throw error;
    }
  }

  async updateFrontendCategory(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [category] = await db
        .update(frontendCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendCategories.id, id), eq(frontendCategories.organizationId, organizationId)))
        .returning();
      return category;
    } catch (error) {
      console.error('Error updating frontend category:', error);
      throw error;
    }
  }

  async deleteFrontendCategory(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendCategories)
        .where(and(eq(frontendCategories.id, id), eq(frontendCategories.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend category:', error);
      return false;
    }
  }

  async getFrontendPages(organizationId: number): Promise<any[]> {
    try {
      const pages = await db
        .select()
        .from(frontendPages)
        .where(eq(frontendPages.organizationId, organizationId))
        .orderBy(asc(frontendPages.sortOrder), asc(frontendPages.title));
      return pages;
    } catch (error) {
      console.error('Error fetching frontend pages:', error);
      return [];
    }
  }

  async getFrontendPage(id: number, organizationId: number): Promise<any> {
    try {
      const [page] = await db
        .select()
        .from(frontendPages)
        .where(and(eq(frontendPages.id, id), eq(frontendPages.organizationId, organizationId)));
      return page || null;
    } catch (error) {
      console.error('Error fetching frontend page:', error);
      return null;
    }
  }

  async createFrontendPage(pageData: any): Promise<any> {
    try {
      const [page] = await db
        .insert(frontendPages)
        .values({
          ...pageData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return page;
    } catch (error) {
      console.error('Error creating frontend page:', error);
      throw error;
    }
  }

  async updateFrontendPage(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [page] = await db
        .update(frontendPages)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendPages.id, id), eq(frontendPages.organizationId, organizationId)))
        .returning();
      return page;
    } catch (error) {
      console.error('Error updating frontend page:', error);
      throw error;
    }
  }

  async deleteFrontendPage(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendPages)
        .where(and(eq(frontendPages.id, id), eq(frontendPages.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend page:', error);
      return false;
    }
  }

  async getFrontendSliders(organizationId: number): Promise<any[]> {
    try {
      const sliders = await db
        .select()
        .from(frontendSliders)
        .where(eq(frontendSliders.organizationId, organizationId))
        .orderBy(asc(frontendSliders.sortOrder), asc(frontendSliders.title));
      return sliders;
    } catch (error) {
      console.error('Error fetching frontend sliders:', error);
      return [];
    }
  }

  async getFrontendSlider(id: number, organizationId: number): Promise<any> {
    try {
      const [slider] = await db
        .select()
        .from(frontendSliders)
        .where(and(eq(frontendSliders.id, id), eq(frontendSliders.organizationId, organizationId)));
      return slider || null;
    } catch (error) {
      console.error('Error fetching frontend slider:', error);
      return null;
    }
  }

  async createFrontendSlider(sliderData: any): Promise<any> {
    try {
      const [slider] = await db
        .insert(frontendSliders)
        .values({
          ...sliderData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return slider;
    } catch (error) {
      console.error('Error creating frontend slider:', error);
      throw error;
    }
  }

  async updateFrontendSlider(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [slider] = await db
        .update(frontendSliders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendSliders.id, id), eq(frontendSliders.organizationId, organizationId)))
        .returning();
      return slider;
    } catch (error) {
      console.error('Error updating frontend slider:', error);
      throw error;
    }
  }

  async deleteFrontendSlider(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendSliders)
        .where(and(eq(frontendSliders.id, id), eq(frontendSliders.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend slider:', error);
      return false;
    }
  }

  async getFrontendComponents(organizationId: number, pageId?: number): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(frontendComponents)
        .where(eq(frontendComponents.organizationId, organizationId));
      
      if (pageId) {
        query = query.where(eq(frontendComponents.pageId, pageId));
      }
      
      const components = await query.orderBy(asc(frontendComponents.sortOrder));
      return components;
    } catch (error) {
      console.error('Error fetching frontend components:', error);
      return [];
    }
  }

  async getFrontendComponent(id: number, organizationId: number): Promise<any> {
    try {
      const [component] = await db
        .select()
        .from(frontendComponents)
        .where(and(eq(frontendComponents.id, id), eq(frontendComponents.organizationId, organizationId)));
      return component || null;
    } catch (error) {
      console.error('Error fetching frontend component:', error);
      return null;
    }
  }

  async createFrontendComponent(componentData: any): Promise<any> {
    try {
      const [component] = await db
        .insert(frontendComponents)
        .values({
          ...componentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return component;
    } catch (error) {
      console.error('Error creating frontend component:', error);
      throw error;
    }
  }

  async updateFrontendComponent(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [component] = await db
        .update(frontendComponents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendComponents.id, id), eq(frontendComponents.organizationId, organizationId)))
        .returning();
      return component;
    } catch (error) {
      console.error('Error updating frontend component:', error);
      throw error;
    }
  }

  async deleteFrontendComponent(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendComponents)
        .where(and(eq(frontendComponents.id, id), eq(frontendComponents.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend component:', error);
      return false;
    }
  }

  async getFrontendIcons(organizationId: number): Promise<any[]> {
    try {
      const icons = await db
        .select()
        .from(frontendIcons)
        .where(eq(frontendIcons.organizationId, organizationId))
        .orderBy(asc(frontendIcons.category), asc(frontendIcons.name));
      return icons;
    } catch (error) {
      console.error('Error fetching frontend icons:', error);
      return [];
    }
  }

  async getFrontendIcon(id: number, organizationId: number): Promise<any> {
    try {
      const [icon] = await db
        .select()
        .from(frontendIcons)
        .where(and(eq(frontendIcons.id, id), eq(frontendIcons.organizationId, organizationId)));
      return icon || null;
    } catch (error) {
      console.error('Error fetching frontend icon:', error);
      return null;
    }
  }

  async createFrontendIcon(iconData: any): Promise<any> {
    try {
      const [icon] = await db
        .insert(frontendIcons)
        .values({
          ...iconData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return icon;
    } catch (error) {
      console.error('Error creating frontend icon:', error);
      throw error;
    }
  }

  async updateFrontendIcon(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [icon] = await db
        .update(frontendIcons)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendIcons.id, id), eq(frontendIcons.organizationId, organizationId)))
        .returning();
      return icon;
    } catch (error) {
      console.error('Error updating frontend icon:', error);
      throw error;
    }
  }

  async deleteFrontendIcon(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendIcons)
        .where(and(eq(frontendIcons.id, id), eq(frontendIcons.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend icon:', error);
      return false;
    }
  }

  async getFrontendBoxes(organizationId: number, pageId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: frontendBoxes.id,
          title: frontendBoxes.title,
          description: frontendBoxes.description,
          link: frontendBoxes.link,
          backgroundColor: frontendBoxes.backgroundColor,
          textColor: frontendBoxes.textColor,
          borderColor: frontendBoxes.borderColor,
          hoverColor: frontendBoxes.hoverColor,
          position: frontendBoxes.position,
          sortOrder: frontendBoxes.sortOrder,
          isVisible: frontendBoxes.isVisible,
          animationEffect: frontendBoxes.animationEffect,
          pageId: frontendBoxes.pageId,
          iconId: frontendBoxes.iconId,
          iconName: frontendIcons.name,
          iconType: frontendIcons.iconType,
          iconData: frontendIcons.iconData,
        })
        .from(frontendBoxes)
        .leftJoin(frontendIcons, eq(frontendBoxes.iconId, frontendIcons.id))
        .where(eq(frontendBoxes.organizationId, organizationId));
      
      if (pageId) {
        query = query.where(eq(frontendBoxes.pageId, pageId));
      }
      
      const boxes = await query.orderBy(asc(frontendBoxes.sortOrder));
      return boxes;
    } catch (error) {
      console.error('Error fetching frontend boxes:', error);
      return [];
    }
  }

  async getFrontendBox(id: number, organizationId: number): Promise<any> {
    try {
      const [box] = await db
        .select()
        .from(frontendBoxes)
        .where(and(eq(frontendBoxes.id, id), eq(frontendBoxes.organizationId, organizationId)));
      return box || null;
    } catch (error) {
      console.error('Error fetching frontend box:', error);
      return null;
    }
  }

  async createFrontendBox(boxData: any): Promise<any> {
    try {
      const [box] = await db
        .insert(frontendBoxes)
        .values({
          ...boxData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return box;
    } catch (error) {
      console.error('Error creating frontend box:', error);
      throw error;
    }
  }

  async updateFrontendBox(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [box] = await db
        .update(frontendBoxes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(frontendBoxes.id, id), eq(frontendBoxes.organizationId, organizationId)))
        .returning();
      return box;
    } catch (error) {
      console.error('Error updating frontend box:', error);
      throw error;
    }
  }

  async deleteFrontendBox(id: number, organizationId: number): Promise<boolean> {
    try {
      await db
        .delete(frontendBoxes)
        .where(and(eq(frontendBoxes.id, id), eq(frontendBoxes.organizationId, organizationId)));
      return true;
    } catch (error) {
      console.error('Error deleting frontend box:', error);
      return false;
    }
  }

  async updateFrontendBoxOrder(organizationId: number, boxUpdates: any[]): Promise<any[]> {
    try {
      const updatedBoxes = [];
      for (const update of boxUpdates) {
        const [box] = await db
          .update(frontendBoxes)
          .set({
            position: update.position,
            sortOrder: update.sortOrder,
            updatedAt: new Date(),
          })
          .where(and(eq(frontendBoxes.id, update.id), eq(frontendBoxes.organizationId, organizationId)))
          .returning();
        updatedBoxes.push(box);
      }
      return updatedBoxes;
    } catch (error) {
      console.error('Error updating frontend box order:', error);
      throw error;
    }
  }

  // Tutorial System methods
  async getTutorials(organizationId?: number, category?: string): Promise<any[]> {
    try {
      let query = db.select().from(tutorials);
      const conditions = [];

      if (organizationId) {
        conditions.push(or(eq(tutorials.organizationId, organizationId), isNull(tutorials.organizationId)));
      }
      if (category) {
        conditions.push(eq(tutorials.category, category));
      }
      conditions.push(eq(tutorials.isPublished, true));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const tutorialList = await query.orderBy(asc(tutorials.sortOrder), asc(tutorials.title));
      return tutorialList;
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      return [];
    }
  }

  async getTutorial(id: number): Promise<any | undefined> {
    try {
      const [tutorial] = await db
        .select()
        .from(tutorials)
        .where(eq(tutorials.id, id));
      return tutorial || undefined;
    } catch (error) {
      console.error('Error fetching tutorial:', error);
      return undefined;
    }
  }

  async createTutorial(tutorialData: any): Promise<any> {
    try {
      const [tutorial] = await db
        .insert(tutorials)
        .values({
          ...tutorialData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return tutorial;
    } catch (error) {
      console.error('Error creating tutorial:', error);
      throw error;
    }
  }

  async updateTutorial(id: number, updates: any): Promise<any> {
    try {
      const [tutorial] = await db
        .update(tutorials)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(tutorials.id, id))
        .returning();
      return tutorial;
    } catch (error) {
      console.error('Error updating tutorial:', error);
      throw error;
    }
  }

  async deleteTutorial(id: number): Promise<void> {
    try {
      await db.delete(tutorials).where(eq(tutorials.id, id));
    } catch (error) {
      console.error('Error deleting tutorial:', error);
      throw error;
    }
  }

  async getTutorialCategories(organizationId?: number): Promise<any[]> {
    try {
      let query = db.select().from(tutorialCategories);
      const conditions = [];

      if (organizationId) {
        conditions.push(or(eq(tutorialCategories.organizationId, organizationId), isNull(tutorialCategories.organizationId)));
      }
      conditions.push(eq(tutorialCategories.isActive, true));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const categories = await query.orderBy(asc(tutorialCategories.sortOrder), asc(tutorialCategories.name));
      return categories;
    } catch (error) {
      console.error('Error fetching tutorial categories:', error);
      return [];
    }
  }

  async createTutorialCategory(categoryData: any): Promise<any> {
    try {
      const [category] = await db
        .insert(tutorialCategories)
        .values({
          ...categoryData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return category;
    } catch (error) {
      console.error('Error creating tutorial category:', error);
      throw error;
    }
  }

  async updateTutorialCategory(id: number, updates: any): Promise<any> {
    try {
      const [category] = await db
        .update(tutorialCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(tutorialCategories.id, id))
        .returning();
      return category;
    } catch (error) {
      console.error('Error updating tutorial category:', error);
      throw error;
    }
  }

  async deleteTutorialCategory(id: number): Promise<void> {
    try {
      await db.delete(tutorialCategories).where(eq(tutorialCategories.id, id));
    } catch (error) {
      console.error('Error deleting tutorial category:', error);
      throw error;
    }
  }

  async getTutorialProgress(userId: number, tutorialId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: tutorialProgress.id,
          tutorialId: tutorialProgress.tutorialId,
          status: tutorialProgress.status,
          currentStep: tutorialProgress.currentStep,
          completedSteps: tutorialProgress.completedSteps,
          startedAt: tutorialProgress.startedAt,
          completedAt: tutorialProgress.completedAt,
          timeSpent: tutorialProgress.timeSpent,
          rating: tutorialProgress.rating,
          feedback: tutorialProgress.feedback,
          tutorial: {
            id: tutorials.id,
            title: tutorials.title,
            category: tutorials.category,
            type: tutorials.type,
            difficulty: tutorials.difficulty,
            estimatedTime: tutorials.estimatedTime,
          },
        })
        .from(tutorialProgress)
        .leftJoin(tutorials, eq(tutorialProgress.tutorialId, tutorials.id))
        .where(eq(tutorialProgress.userId, userId));

      if (tutorialId) {
        query = query.where(and(eq(tutorialProgress.userId, userId), eq(tutorialProgress.tutorialId, tutorialId)));
      }

      const progress = await query.orderBy(desc(tutorialProgress.updatedAt));
      return progress;
    } catch (error) {
      console.error('Error fetching tutorial progress:', error);
      return [];
    }
  }

  async startTutorial(userId: number, tutorialId: number, organizationId: number): Promise<any> {
    try {
      // Check if progress already exists
      const [existingProgress] = await db
        .select()
        .from(tutorialProgress)
        .where(and(eq(tutorialProgress.userId, userId), eq(tutorialProgress.tutorialId, tutorialId)));

      if (existingProgress) {
        // Update existing progress to start again
        const [updatedProgress] = await db
          .update(tutorialProgress)
          .set({
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(tutorialProgress.userId, userId), eq(tutorialProgress.tutorialId, tutorialId)))
          .returning();
        return updatedProgress;
      } else {
        // Create new progress
        const [newProgress] = await db
          .insert(tutorialProgress)
          .values({
            userId,
            tutorialId,
            organizationId,
            status: 'in_progress',
            currentStep: 0,
            completedSteps: [],
            startedAt: new Date(),
            timeSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        return newProgress;
      }
    } catch (error) {
      console.error('Error starting tutorial:', error);
      throw error;
    }
  }

  async updateTutorialProgress(userId: number, tutorialId: number, progressData: any): Promise<any> {
    try {
      const [progress] = await db
        .update(tutorialProgress)
        .set({
          ...progressData,
          updatedAt: new Date(),
        })
        .where(and(eq(tutorialProgress.userId, userId), eq(tutorialProgress.tutorialId, tutorialId)))
        .returning();
      return progress;
    } catch (error) {
      console.error('Error updating tutorial progress:', error);
      throw error;
    }
  }

  async completeTutorial(userId: number, tutorialId: number, rating?: number, feedback?: string): Promise<any> {
    try {
      const [progress] = await db
        .update(tutorialProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          rating,
          feedback,
          updatedAt: new Date(),
        })
        .where(and(eq(tutorialProgress.userId, userId), eq(tutorialProgress.tutorialId, tutorialId)))
        .returning();

      // Update tutorial rating if rating was provided
      if (rating) {
        const [tutorial] = await db
          .select()
          .from(tutorials)
          .where(eq(tutorials.id, tutorialId));

        if (tutorial) {
          const newTotalRatings = tutorial.totalRatings + 1;
          const newAverageRating = ((tutorial.averageRating * tutorial.totalRatings) + rating) / newTotalRatings;

          await db
            .update(tutorials)
            .set({
              averageRating: newAverageRating.toFixed(2),
              totalRatings: newTotalRatings,
              updatedAt: new Date(),
            })
            .where(eq(tutorials.id, tutorialId));
        }
      }

      return progress;
    } catch (error) {
      console.error('Error completing tutorial:', error);
      throw error;
    }
  }

  async getUserTutorialStats(userId: number): Promise<any> {
    try {
      const [stats] = await db
        .select({
          totalTutorials: count(tutorialProgress.id),
          completedTutorials: sum(sql`CASE WHEN ${tutorialProgress.status} = 'completed' THEN 1 ELSE 0 END`),
          inProgressTutorials: sum(sql`CASE WHEN ${tutorialProgress.status} = 'in_progress' THEN 1 ELSE 0 END`),
          totalTimeSpent: sum(tutorialProgress.timeSpent),
          averageRating: avg(tutorialProgress.rating),
        })
        .from(tutorialProgress)
        .where(eq(tutorialProgress.userId, userId));

      return stats || {
        totalTutorials: 0,
        completedTutorials: 0,
        inProgressTutorials: 0,
        totalTimeSpent: 0,
        averageRating: 0,
      };
    } catch (error) {
      console.error('Error fetching user tutorial stats:', error);
      return {
        totalTutorials: 0,
        completedTutorials: 0,
        inProgressTutorials: 0,
        totalTimeSpent: 0,
        averageRating: 0,
      };
    }
  }

  // Lead Settings Operations
  async getLeadSettings(organizationId: number): Promise<any> {
    const [settings] = await db
      .select()
      .from(leadSettings)
      .where(eq(leadSettings.organizationId, organizationId));
    return settings;
  }

  async updateLeadSettings(organizationId: number, updates: any): Promise<any> {
    // First try to update existing settings
    const [updatedSettings] = await db
      .update(leadSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leadSettings.organizationId, organizationId))
      .returning();

    // If no existing settings, create new ones
    if (!updatedSettings) {
      const [newSettings] = await db
        .insert(leadSettings)
        .values({ organizationId, ...updates })
        .returning();
      return newSettings;
    }

    return updatedSettings;
  }

  // Meeting Operations
  async getMeetings(organizationId: number, userId?: number): Promise<Meeting[]> {
    let query = db.select().from(meetings).where(eq(meetings.organizationId, organizationId));
    
    if (userId) {
      // For now, just get meetings where user is the host
      query = query.where(and(
        eq(meetings.organizationId, organizationId),
        eq(meetings.hostId, userId)
      ));
    }
    
    return await query.orderBy(desc(meetings.createdAt));
  }

  async getMeeting(id: number, organizationId: number): Promise<Meeting | undefined> {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)));
    return meeting;
  }

  async createMeeting(meetingData: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(meetingData).returning();
    
    // Auto-join the host as a participant with admitted status
    if (meetingData.hostId) {
      await db.insert(meetingParticipants).values({
        meetingId: meeting.id,
        userId: meetingData.hostId,
        role: 'host',
        status: 'admitted',
        joinedAt: new Date(),
        admittedAt: new Date(),
        admittedBy: meetingData.hostId
      });
    }
    
    return meeting;
  }

  async updateMeeting(id: number, organizationId: number, updates: Partial<InsertMeeting>): Promise<Meeting> {
    const [meeting] = await db
      .update(meetings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
      .returning();
    return meeting;
  }

  async deleteMeeting(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  async joinMeeting(meetingId: number, userId: number): Promise<MeetingParticipant> {
    // Check if user is already a participant
    const [existingParticipant] = await db
      .select()
      .from(meetingParticipants)
      .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)));

    if (existingParticipant) {
      // Update existing participant to rejoin
      const [participant] = await db
        .update(meetingParticipants)
        .set({ joinedAt: new Date(), leftAt: null })
        .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)))
        .returning();
      return participant;
    } else {
      // Create new participant
      const [participant] = await db
        .insert(meetingParticipants)
        .values({ meetingId, userId, role: 'participant', joinedAt: new Date() })
        .returning();
      return participant;
    }
  }

  async joinMeetingWithStatus(meetingId: number, userId: number, status: string): Promise<MeetingParticipant> {
    // Check if user is already a participant
    const [existingParticipant] = await db
      .select()
      .from(meetingParticipants)
      .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)));

    if (existingParticipant) {
      // Update existing participant status
      const [participant] = await db
        .update(meetingParticipants)
        .set({ 
          status,
          joinedAt: status === "admitted" ? new Date() : null,
          admittedAt: status === "admitted" ? new Date() : null,
          leftAt: null 
        })
        .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)))
        .returning();
      return participant;
    } else {
      // Create new participant with waiting room status
      const [participant] = await db
        .insert(meetingParticipants)
        .values({ 
          meetingId, 
          userId, 
          role: 'participant', 
          status,
          joinedAt: status === "admitted" ? new Date() : null,
          admittedAt: status === "admitted" ? new Date() : null
        })
        .returning();
      return participant;
    }
  }

  async leaveMeeting(meetingId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(meetingParticipants)
      .set({ leftAt: new Date(), status: "left" })
      .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)));
    return result.rowCount > 0;
  }

  async getMeetingParticipants(meetingId: number): Promise<MeetingParticipant[]> {
    return await db
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meetingId))
      .orderBy(asc(meetingParticipants.joinedAt));
  }

  async getWaitingRoomParticipants(meetingId: number): Promise<MeetingParticipant[]> {
    return await db
      .select()
      .from(meetingParticipants)
      .where(and(
        eq(meetingParticipants.meetingId, meetingId),
        eq(meetingParticipants.status, "waiting")
      ))
      .orderBy(asc(meetingParticipants.id));
  }

  async admitParticipant(participantId: number, admittedBy: number): Promise<boolean> {
    const result = await db
      .update(meetingParticipants)
      .set({ 
        status: "admitted",
        admittedAt: new Date(),
        admittedBy,
        joinedAt: new Date()
      })
      .where(and(
        eq(meetingParticipants.id, participantId),
        eq(meetingParticipants.status, "waiting")
      ));
    return result.rowCount > 0;
  }

  async denyParticipant(participantId: number): Promise<boolean> {
    const result = await db
      .update(meetingParticipants)
      .set({ 
        status: "denied",
        leftAt: new Date()
      })
      .where(and(
        eq(meetingParticipants.id, participantId),
        eq(meetingParticipants.status, "waiting")
      ));
    return result.rowCount > 0;
  }

  async getMeetingMessages(meetingId: number): Promise<MeetingMessage[]> {
    return await db
      .select()
      .from(meetingMessages)
      .where(eq(meetingMessages.meetingId, meetingId))
      .orderBy(asc(meetingMessages.sentAt));
  }

  async createMeetingMessage(messageData: InsertMeetingMessage): Promise<MeetingMessage> {
    const [message] = await db.insert(meetingMessages).values(messageData).returning();
    return message;
  }

  async getMeetingRecordings(meetingId: number, organizationId: number): Promise<MeetingRecording[]> {
    return await db
      .select()
      .from(meetingRecordings)
      .leftJoin(meetings, eq(meetingRecordings.meetingId, meetings.id))
      .where(and(eq(meetingRecordings.meetingId, meetingId), eq(meetings.organizationId, organizationId)))
      .then(rows => rows.map(row => row.meeting_recordings));
  }

  async createMeetingRecording(recordingData: InsertMeetingRecording): Promise<MeetingRecording> {
    const [recording] = await db.insert(meetingRecordings).values(recordingData).returning();
    return recording;
  }

  async updateMeetingStatus(id: number, organizationId: number, status: string): Promise<Meeting> {
    const [meeting] = await db
      .update(meetings)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)))
      .returning();
    return meeting;
  }

  async cleanupExpiredMeetings(): Promise<number> {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
      
      // Find expired meetings that are older than 2 days past their scheduled end time
      const expiredMeetings = await db
        .select({ id: meetings.id, organizationId: meetings.organizationId })
        .from(meetings)
        .where(
          and(
            lt(meetings.scheduledEndTime, twoDaysAgo),
            isNotNull(meetings.scheduledEndTime)
          )
        );

      if (expiredMeetings.length === 0) {
        return 0;
      }

      // Delete meeting messages first (foreign key constraint)
      for (const meeting of expiredMeetings) {
        await db
          .delete(meetingMessages)
          .where(eq(meetingMessages.meetingId, meeting.id));
      }

      // Delete meeting participants
      for (const meeting of expiredMeetings) {
        await db
          .delete(meetingParticipants)
          .where(eq(meetingParticipants.meetingId, meeting.id));
      }

      // Delete meeting recordings
      for (const meeting of expiredMeetings) {
        await db
          .delete(meetingRecordings)
          .where(eq(meetingRecordings.meetingId, meeting.id));
      }

      // Finally delete the meetings
      const deletedMeetingIds = expiredMeetings.map(m => m.id);
      await db
        .delete(meetings)
        .where(inArray(meetings.id, deletedMeetingIds));

      console.log(`🧹 Cleaned up ${expiredMeetings.length} expired meetings:`, deletedMeetingIds);
      return expiredMeetings.length;
    } catch (error) {
      console.error('Error cleaning up expired meetings:', error);
      throw error;
    }
  }

  // Call Manager methods
  async getOrganizationsWithCallManager(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          email: organizations.email,
          subscriptionPlan: organizations.subscriptionPlan,
          canAccessCallManager: organizations.canAccessCallManager,
          phoneNumbersCount: count(phoneNumbers.id)
        })
        .from(organizations)
        .leftJoin(phoneNumbers, eq(organizations.id, phoneNumbers.organizationId))
        .where(eq(organizations.canAccessCallManager, true))
        .groupBy(organizations.id, organizations.name, organizations.email, organizations.subscriptionPlan, organizations.canAccessCallManager)
        .orderBy(organizations.name);

      // Get phone numbers for each organization
      const orgsWithPhones = await Promise.all(
        result.map(async (org) => {
          const phones = await this.getPhoneNumbersByOrganization(org.id);
          return {
            ...org,
            phoneNumbers: phones
          };
        })
      );

      return orgsWithPhones;
    } catch (error) {
      console.error('Error fetching organizations with Call Manager:', error);
      throw error;
    }
  }

  async getPhoneNumbersByOrganization(organizationId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(phoneNumbers)
        .where(eq(phoneNumbers.organizationId, organizationId))
        .orderBy(phoneNumbers.phoneNumber);
    } catch (error) {
      console.error('Error fetching phone numbers for organization:', error);
      throw error;
    }
  }

  async createPhoneNumber(phoneData: any): Promise<any> {
    try {
      const [phoneNumber] = await db
        .insert(phoneNumbers)
        .values(phoneData)
        .returning();
      return phoneNumber;
    } catch (error) {
      console.error('Error creating phone number:', error);
      throw error;
    }
  }

  async updatePhoneNumber(id: number, updates: any): Promise<any> {
    try {
      const [phoneNumber] = await db
        .update(phoneNumbers)
        .set(updates)
        .where(eq(phoneNumbers.id, id))
        .returning();
      return phoneNumber;
    } catch (error) {
      console.error('Error updating phone number:', error);
      throw error;
    }
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(phoneNumbers)
        .where(eq(phoneNumbers.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting phone number:', error);
      throw error;
    }
  }

  // ===============================
  // Call Manager Implementation
  // ===============================

  // Phone Number methods
  async getPhoneNumbers(organizationId: number): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(phoneNumbers)
        .where(eq(phoneNumbers.organizationId, organizationId))
        .orderBy(desc(phoneNumbers.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      return [];
    }
  }

  async getPhoneNumber(id: number, organizationId: number): Promise<any> {
    try {
      const [phoneNumber] = await db
        .select()
        .from(phoneNumbers)
        .where(and(
          eq(phoneNumbers.id, id),
          eq(phoneNumbers.organizationId, organizationId)
        ));
      return phoneNumber;
    } catch (error) {
      console.error('Error fetching phone number:', error);
      return undefined;
    }
  }

  async createPhoneNumber(phoneData: any): Promise<any> {
    try {
      const [phoneNumber] = await db
        .insert(phoneNumbers)
        .values(phoneData)
        .returning();
      return phoneNumber;
    } catch (error) {
      console.error('Error creating phone number:', error);
      throw error;
    }
  }

  async updatePhoneNumber(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [phoneNumber] = await db
        .update(phoneNumbers)
        .set(updates)
        .where(and(
          eq(phoneNumbers.id, id),
          eq(phoneNumbers.organizationId, organizationId)
        ))
        .returning();
      return phoneNumber;
    } catch (error) {
      console.error('Error updating phone number:', error);
      throw error;
    }
  }

  async deletePhoneNumber(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(phoneNumbers)
        .where(and(
          eq(phoneNumbers.id, id),
          eq(phoneNumbers.organizationId, organizationId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting phone number:', error);
      throw error;
    }
  }

  // Call Record methods
  async getCallRecords(organizationId: number, phoneNumberId?: number): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(callRecords)
        .where(eq(callRecords.organizationId, organizationId));

      if (phoneNumberId) {
        query = query.where(eq(callRecords.phoneNumberId, phoneNumberId));
      }

      const results = await query.orderBy(desc(callRecords.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching call records:', error);
      return [];
    }
  }

  async getCallRecord(id: number, organizationId: number): Promise<any> {
    try {
      const [callRecord] = await db
        .select()
        .from(callRecords)
        .where(and(
          eq(callRecords.id, id),
          eq(callRecords.organizationId, organizationId)
        ));
      return callRecord;
    } catch (error) {
      console.error('Error fetching call record:', error);
      return undefined;
    }
  }

  async createCallRecord(callData: any): Promise<any> {
    try {
      const [callRecord] = await db
        .insert(callRecords)
        .values(callData)
        .returning();
      return callRecord;
    } catch (error) {
      console.error('Error creating call record:', error);
      throw error;
    }
  }

  async updateCallRecord(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [callRecord] = await db
        .update(callRecords)
        .set(updates)
        .where(and(
          eq(callRecords.id, id),
          eq(callRecords.organizationId, organizationId)
        ))
        .returning();
      return callRecord;
    } catch (error) {
      console.error('Error updating call record:', error);
      throw error;
    }
  }

  // Call Recording methods
  async getCallRecordings(organizationId: number, callRecordId?: number): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(callRecordings)
        .where(eq(callRecordings.organizationId, organizationId));

      if (callRecordId) {
        query = query.where(eq(callRecordings.callRecordId, callRecordId));
      }

      const results = await query.orderBy(desc(callRecordings.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching call recordings:', error);
      return [];
    }
  }

  async createCallRecording(recordingData: any): Promise<any> {
    try {
      const [recording] = await db
        .insert(callRecordings)
        .values(recordingData)
        .returning();
      return recording;
    } catch (error) {
      console.error('Error creating call recording:', error);
      throw error;
    }
  }

  // Voicemail methods
  async getVoicemails(organizationId: number, phoneNumberId?: number): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(voicemails)
        .where(eq(voicemails.organizationId, organizationId));

      if (phoneNumberId) {
        query = query.where(eq(voicemails.phoneNumberId, phoneNumberId));
      }

      const results = await query.orderBy(desc(voicemails.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching voicemails:', error);
      return [];
    }
  }

  async createVoicemail(voicemailData: any): Promise<any> {
    try {
      const [voicemail] = await db
        .insert(voicemails)
        .values(voicemailData)
        .returning();
      return voicemail;
    } catch (error) {
      console.error('Error creating voicemail:', error);
      throw error;
    }
  }

  async updateVoicemail(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [voicemail] = await db
        .update(voicemails)
        .set(updates)
        .where(and(
          eq(voicemails.id, id),
          eq(voicemails.organizationId, organizationId)
        ))
        .returning();
      return voicemail;
    } catch (error) {
      console.error('Error updating voicemail:', error);
      throw error;
    }
  }

  async deleteVoicemail(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(voicemails)
        .where(and(
          eq(voicemails.id, id),
          eq(voicemails.organizationId, organizationId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting voicemail:', error);
      throw error;
    }
  }

  // Call Queue methods
  async getCallQueues(organizationId: number): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(callQueues)
        .where(eq(callQueues.organizationId, organizationId))
        .orderBy(desc(callQueues.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching call queues:', error);
      return [];
    }
  }

  async createCallQueue(queueData: any): Promise<any> {
    try {
      const [queue] = await db
        .insert(callQueues)
        .values(queueData)
        .returning();
      return queue;
    } catch (error) {
      console.error('Error creating call queue:', error);
      throw error;
    }
  }

  async updateCallQueue(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [queue] = await db
        .update(callQueues)
        .set(updates)
        .where(and(
          eq(callQueues.id, id),
          eq(callQueues.organizationId, organizationId)
        ))
        .returning();
      return queue;
    } catch (error) {
      console.error('Error updating call queue:', error);
      throw error;
    }
  }

  async deleteCallQueue(id: number, organizationId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(callQueues)
        .where(and(
          eq(callQueues.id, id),
          eq(callQueues.organizationId, organizationId)
        ));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting call queue:', error);
      throw error;
    }
  }

  // Organization Twilio Settings methods
  async getOrganizationTwilioSettings(organizationId: number): Promise<any> {
    try {
      const [settings] = await db
        .select()
        .from(organizationTwilioSettings)
        .where(eq(organizationTwilioSettings.organizationId, organizationId));
      return settings;
    } catch (error) {
      console.error('Error fetching organization Twilio settings:', error);
      return undefined;
    }
  }

  async createOrganizationTwilioSettings(settingsData: any): Promise<any> {
    try {
      const [settings] = await db
        .insert(organizationTwilioSettings)
        .values(settingsData)
        .returning();
      return settings;
    } catch (error) {
      console.error('Error creating organization Twilio settings:', error);
      throw error;
    }
  }

  async updateOrganizationTwilioSettings(organizationId: number, updates: any): Promise<any> {
    try {
      const [settings] = await db
        .update(organizationTwilioSettings)
        .set(updates)
        .where(eq(organizationTwilioSettings.organizationId, organizationId))
        .returning();
      return settings;
    } catch (error) {
      console.error('Error updating organization Twilio settings:', error);
      throw error;
    }
  }

  // Organization Call Analytics methods
  async getOrganizationCallAnalytics(organizationId: number, periodStart?: Date, periodEnd?: Date): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(organizationCallAnalytics)
        .where(eq(organizationCallAnalytics.organizationId, organizationId));

      if (periodStart && periodEnd) {
        query = query.where(and(
          gte(organizationCallAnalytics.periodStart, periodStart),
          lte(organizationCallAnalytics.periodEnd, periodEnd)
        ));
      }

      const results = await query.orderBy(desc(organizationCallAnalytics.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching organization call analytics:', error);
      return [];
    }
  }

  async createOrganizationCallAnalytics(analyticsData: any): Promise<any> {
    try {
      const [analytics] = await db
        .insert(organizationCallAnalytics)
        .values(analyticsData)
        .returning();
      return analytics;
    } catch (error) {
      console.error('Error creating organization call analytics:', error);
      throw error;
    }
  }

  async updateOrganizationCallAnalytics(id: number, organizationId: number, updates: any): Promise<any> {
    try {
      const [analytics] = await db
        .update(organizationCallAnalytics)
        .set(updates)
        .where(and(
          eq(organizationCallAnalytics.id, id),
          eq(organizationCallAnalytics.organizationId, organizationId)
        ))
        .returning();
      return analytics;
    } catch (error) {
      console.error('Error updating organization call analytics:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();