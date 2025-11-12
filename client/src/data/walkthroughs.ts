import { InteractiveWalkthrough } from "@/components/interactive-walkthrough";

export const coreWalkthroughs: InteractiveWalkthrough[] = [
  {
    id: 'dashboard-tour',
    title: 'Dashboard Overview',
    description: 'Get familiar with your main dashboard and key metrics',
    category: 'getting-started',
    estimatedTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Dashboard',
        description: 'This is your main dashboard where you can see an overview of your business.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'stats-cards',
        title: 'Key Metrics Cards',
        description: 'These cards show your most important business metrics at a glance.',
        targetSelector: '[data-testid="dashboard-stats"]',
        position: 'bottom',
        action: 'highlight'
      },
      {
        id: 'recent-jobs',
        title: 'Recent Jobs',
        description: 'View your most recent jobs and their current status.',
        targetSelector: '[data-testid="recent-jobs"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Use these buttons to quickly create new jobs, customers, or quotes.',
        targetSelector: '[data-testid="quick-actions"]',
        position: 'top',
        action: 'highlight'
      }
    ]
  },
  {
    id: 'create-customer',
    title: 'Creating Your First Customer',
    description: 'Learn how to add a new customer to your system',
    category: 'core-features',
    estimatedTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-customers',
        title: 'Navigate to Customers',
        description: 'Click on the Customers link in the sidebar to open the customers page.',
        targetSelector: 'a[href="/customers"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-customer-button',
        title: 'Click Add Customer',
        description: 'Click the "Add Customer" button to open the customer creation form.',
        targetSelector: '[data-testid="add-customer-btn"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'fill-name',
        title: 'Enter Customer Name',
        description: 'Type the customer\'s name in the name field.',
        targetSelector: 'input[name="name"]',
        position: 'top',
        action: 'type',
        actionData: 'John Smith'
      },
      {
        id: 'fill-email',
        title: 'Enter Email Address',
        description: 'Add the customer\'s email address for communication.',
        targetSelector: 'input[name="email"]',
        position: 'top',
        action: 'type',
        actionData: 'john.smith@example.com'
      },
      {
        id: 'fill-phone',
        title: 'Enter Phone Number',
        description: 'Add the customer\'s phone number.',
        targetSelector: 'input[name="phone"]',
        position: 'top',
        action: 'type',
        actionData: '(555) 123-4567'
      },
      {
        id: 'save-customer',
        title: 'Save Customer',
        description: 'Click the Save button to create the customer.',
        targetSelector: 'button[type="submit"]',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'create-invoice',
    title: 'Creating an Invoice',
    description: 'Step-by-step guide to create and send invoices to customers',
    category: 'core-features',
    estimatedTime: 10,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-invoices',
        title: 'Navigate to Invoices',
        description: 'Click on the Invoices link in the sidebar to open the invoicing section.',
        targetSelector: 'a[href="/invoices"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-invoice-button',
        title: 'Click Add Invoice',
        description: 'Click the "Add Invoice" or "Create Invoice" button to start creating a new invoice.',
        targetSelector: '[data-testid="add-invoice-btn"], .add-invoice-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'select-customer',
        title: 'Select Customer',
        description: 'Choose the customer for this invoice from the dropdown menu.',
        targetSelector: 'select[name="customerId"], [data-testid="customer-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'invoice-details',
        title: 'Fill Invoice Details',
        description: 'Enter the invoice number, date, and due date for the invoice.',
        targetSelector: 'input[name="invoiceNumber"], [data-testid="invoice-number"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'add-line-items',
        title: 'Add Line Items',
        description: 'Add services, products, or labor to the invoice with quantities and prices.',
        targetSelector: '[data-testid="add-line-item"], .add-item-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'review-total',
        title: 'Review Total Amount',
        description: 'Review the calculated total, including taxes and discounts.',
        targetSelector: '[data-testid="invoice-total"], .invoice-total',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'save-invoice',
        title: 'Save Invoice',
        description: 'Click Save to create the invoice. You can then send it to the customer.',
        targetSelector: 'button[type="submit"], .save-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'create-task',
    title: 'Creating a Task',
    description: 'Learn how to create and assign tasks to team members',
    category: 'project-management',
    estimatedTime: 7,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-projects',
        title: 'Open Projects',
        description: 'Navigate to the projects section where you can manage tasks.',
        targetSelector: 'a[href="/projects"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'select-project',
        title: 'Select a Project',
        description: 'Choose the project you want to add a task to.',
        targetSelector: '[data-testid="project-card"]:first-child',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'add-task-button',
        title: 'Add New Task',
        description: 'Click the Add Task button to create a new task for this project.',
        targetSelector: '[data-testid="add-task-btn"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'fill-task-details',
        title: 'Enter Task Details',
        description: 'Fill in the task title, description, and priority level.',
        targetSelector: 'input[name="title"], [data-testid="task-title"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'assign-task',
        title: 'Assign to Team Member',
        description: 'Select a team member to assign this task to.',
        targetSelector: 'select[name="assignedTo"], [data-testid="assignee-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'save-task',
        title: 'Save Task',
        description: 'Save the task to add it to the project.',
        targetSelector: 'button[type="submit"]',
        position: 'bottom',
        action: 'click'
      }
    ]
  }
];

export const advancedWalkthroughs: InteractiveWalkthrough[] = [
  {
    id: 'gps-tracking-setup',
    title: 'GPS Tracking System Setup',
    description: 'Configure OneStep GPS integration, set up vehicles, and sync trip data',
    category: 'technical',
    estimatedTime: 15,
    difficulty: 'advanced',
    prerequisites: ['Admin or Manager role', 'OneStep GPS API credentials'],
    steps: [
      {
        id: 'intro-gps',
        title: 'GPS Tracking Overview',
        description: 'This walkthrough will guide you through setting up OneStep GPS tracking for your fleet. You\'ll learn to add vehicles, configure API credentials, and sync trip data.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'navigate-vehicles',
        title: 'Navigate to Vehicles',
        description: 'Click on the Vehicles link in the sidebar to access vehicle management.',
        targetSelector: 'a[href="/vehicles"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'wait-vehicles-load',
        title: 'Loading Vehicles',
        description: 'The vehicles page is loading with your existing fleet.',
        action: 'wait',
        duration: 1500,
        position: 'center'
      },
      {
        id: 'add-vehicle-button',
        title: 'Add New Vehicle',
        description: 'Click the "Add Vehicle" button to register a new vehicle with GPS tracking.',
        targetSelector: '[data-testid="add-vehicle-btn"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'vehicle-name',
        title: 'Enter Vehicle Name',
        description: 'Give your vehicle a name (e.g., "Truck #1" or "Service Van A").',
        targetSelector: 'input[name="name"]',
        position: 'top',
        action: 'type',
        actionData: 'Service Van #1'
      },
      {
        id: 'vehicle-type',
        title: 'Select Vehicle Type',
        description: 'Choose the type of vehicle from the dropdown.',
        targetSelector: 'select[name="vehicleType"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'onestep-device-id',
        title: 'Enter OneStep Device ID',
        description: 'Enter the OneStep GPS device ID (found on your device or in OneStep dashboard).',
        targetSelector: 'input[name="onestepDeviceId"]',
        position: 'top',
        action: 'type',
        actionData: '12345678'
      },
      {
        id: 'save-vehicle',
        title: 'Save Vehicle',
        description: 'Click Save to register the vehicle with GPS tracking enabled.',
        targetSelector: 'button[type="submit"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'wait-save',
        title: 'Saving Vehicle',
        description: 'Your vehicle is being registered in the system.',
        action: 'wait',
        duration: 2000,
        position: 'center'
      },
      {
        id: 'view-vehicle-list',
        title: 'Vehicle List Updated',
        description: 'Your new vehicle now appears in the list. GPS polling will begin automatically every 30-60 seconds.',
        targetSelector: '[data-testid="vehicle-list"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'navigate-gps-tracking',
        title: 'View GPS Tracking',
        description: 'Navigate to GPS Tracking to see real-time vehicle locations.',
        targetSelector: 'a[href="/gps-tracking"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'wait-gps-load',
        title: 'Loading GPS Map',
        description: 'The GPS tracking map is loading with vehicle markers.',
        action: 'wait',
        duration: 2000,
        position: 'center'
      },
      {
        id: 'vehicle-marker',
        title: 'Vehicle Location Marker',
        description: 'Your vehicle appears on the map. Click on markers to see details like speed, location, and last update time.',
        targetSelector: '[data-testid="gps-map"]',
        position: 'bottom',
        action: 'highlight'
      },
      {
        id: 'sync-trips-button',
        title: 'Sync Trip History',
        description: 'Click "Sync Trips" to import historical trip data from OneStep GPS API.',
        targetSelector: '[data-testid="sync-trips-btn"]',
        position: 'left',
        action: 'click'
      },
      {
        id: 'wait-sync',
        title: 'Syncing Trips',
        description: 'Trip data is being imported from OneStep GPS. This may take a few moments.',
        action: 'wait',
        duration: 3000,
        position: 'center'
      },
      {
        id: 'completion-gps',
        title: 'GPS Setup Complete',
        description: 'Congratulations! Your GPS tracking system is now active. Vehicles are being tracked every 30-60 seconds automatically.',
        position: 'center',
        action: 'info'
      }
    ]
  },
  {
    id: 'cache-configuration',
    title: 'Configurable Caching System',
    description: 'Learn to configure cache settings, adjust TTL values, and monitor performance',
    category: 'technical',
    estimatedTime: 12,
    difficulty: 'advanced',
    prerequisites: ['Admin role', 'Understanding of caching concepts'],
    steps: [
      {
        id: 'intro-cache',
        title: 'Caching System Overview',
        description: 'This walkthrough covers the configurable caching system. You\'ll learn to adjust cache TTL, enable/disable caching per organization, and monitor cache performance.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'navigate-admin',
        title: 'Navigate to Admin Settings',
        description: 'Access the admin panel where advanced system settings are configured.',
        targetSelector: 'a[href="/admin"], a[href="/settings"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'wait-admin-load',
        title: 'Loading Admin Panel',
        description: 'The admin panel is loading with system configuration options.',
        action: 'wait',
        duration: 1500,
        position: 'center'
      },
      {
        id: 'cache-settings-tab',
        title: 'Open Cache Settings',
        description: 'Click on the Cache Settings or Performance tab to access caching configuration.',
        targetSelector: '[data-testid="cache-settings-tab"], button:contains("Cache")',
        position: 'top',
        action: 'click'
      },
      {
        id: 'cache-settings-panel',
        title: 'Cache Configuration Panel',
        description: 'This panel shows current cache settings including TTL (Time To Live) for different cache types.',
        targetSelector: '[data-testid="cache-settings-panel"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'enable-cache-toggle',
        title: 'Enable/Disable Caching',
        description: 'Toggle this switch to enable or disable caching for this organization. When disabled, all queries fetch fresh data.',
        targetSelector: '[data-testid="cache-enabled-toggle"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'ttl-setting',
        title: 'Adjust Cache TTL',
        description: 'Modify the cache TTL (in seconds). Lower values = fresher data but more database load. Typical range: 5-300 seconds.',
        targetSelector: 'input[name="cacheTtl"], [data-testid="cache-ttl-input"]',
        position: 'top',
        action: 'type',
        actionData: '30'
      },
      {
        id: 'notification-cache-ttl',
        title: 'Notification Cache TTL',
        description: 'Set the TTL specifically for notification queries (unread count caching).',
        targetSelector: 'input[name="notificationCacheTtl"]',
        position: 'top',
        action: 'type',
        actionData: '10'
      },
      {
        id: 'save-cache-settings',
        title: 'Save Cache Settings',
        description: 'Click Save to apply the new cache configuration. Note: You must manually reload the cache configuration for changes to take effect.',
        targetSelector: 'button[type="submit"], [data-testid="save-cache-btn"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'wait-save-cache',
        title: 'Saving Configuration',
        description: 'Cache settings are being saved to the database.',
        action: 'wait',
        duration: 1500,
        position: 'center'
      },
      {
        id: 'reload-cache-config',
        title: 'Reload Cache Configuration',
        description: 'IMPORTANT: Click "Reload Cache Config" to apply changes. Cache settings do NOT auto-reload - manual reload is required.',
        targetSelector: '[data-testid="reload-cache-btn"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'cache-stats',
        title: 'View Cache Statistics',
        description: 'Monitor cache hit rates, memory usage, and performance metrics here.',
        targetSelector: '[data-testid="cache-stats"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'completion-cache',
        title: 'Cache Configuration Complete',
        description: 'You\'ve successfully configured the caching system! Remember: cache changes require manual reload via reloadConfig() or the Reload button.',
        position: 'center',
        action: 'info'
      }
    ]
  },
  {
    id: 'user-deletion-process',
    title: 'Two-Stage User Deletion System',
    description: 'Learn the safe user deletion workflow: soft delete, dependency check, and permanent removal',
    category: 'technical',
    estimatedTime: 10,
    difficulty: 'advanced',
    prerequisites: ['Admin role', 'User management permissions'],
    steps: [
      {
        id: 'intro-deletion',
        title: 'User Deletion Overview',
        description: 'This walkthrough covers the two-stage user deletion system designed for data safety. Stage 1: Soft delete (mark as deleted). Stage 2: Review dependencies and permanently delete.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'navigate-users',
        title: 'Navigate to Users',
        description: 'Open the Users page to view and manage user accounts.',
        targetSelector: 'a[href="/users"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'wait-users-load',
        title: 'Loading Users',
        description: 'The user management page is loading.',
        action: 'wait',
        duration: 1500,
        position: 'center'
      },
      {
        id: 'user-list',
        title: 'User List',
        description: 'This shows all active users in your organization. Users with "Deleted" status are soft-deleted (Stage 1) and can still be reviewed.',
        targetSelector: '[data-testid="users-table"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'select-user',
        title: 'Select User for Deletion',
        description: 'Click on a user to view their details and deletion options.',
        targetSelector: '[data-testid="user-row"]:first-child',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'soft-delete-button',
        title: 'Stage 1: Soft Delete',
        description: 'Click "Delete User" to perform a soft delete. This marks the user as deleted but retains all data for review.',
        targetSelector: '[data-testid="soft-delete-btn"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'confirm-soft-delete',
        title: 'Confirm Soft Delete',
        description: 'Confirm the soft delete action. The user will be marked as deleted immediately but data is preserved.',
        targetSelector: '[data-testid="confirm-soft-delete"]',
        position: 'center',
        action: 'click'
      },
      {
        id: 'wait-soft-delete',
        title: 'Processing Soft Delete',
        description: 'The user is being marked as deleted. All associated records remain intact.',
        action: 'wait',
        duration: 2000,
        position: 'center'
      },
      {
        id: 'view-deleted-users',
        title: 'View Soft-Deleted Users',
        description: 'Toggle "Show Deleted Users" to see users marked for deletion. They appear with a "Deleted" status.',
        targetSelector: '[data-testid="show-deleted-toggle"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'dependency-check',
        title: 'Check Dependencies',
        description: 'Click "View Dependencies" to see what data is associated with this user (projects, invoices, tasks, etc.).',
        targetSelector: '[data-testid="view-dependencies-btn"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'dependency-report',
        title: 'Dependency Report',
        description: 'This report shows all records linked to the user. Review carefully before permanent deletion to avoid data loss.',
        targetSelector: '[data-testid="dependency-report"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'permanent-delete-button',
        title: 'Stage 2: Permanent Delete',
        description: 'If ready, click "Permanently Delete" to remove the user and ALL associated data. This action CANNOT be undone.',
        targetSelector: '[data-testid="permanent-delete-btn"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'completion-deletion',
        title: 'User Deletion Process Complete',
        description: 'You\'ve learned the two-stage deletion process: (1) Soft delete for safety, (2) Dependency review, (3) Permanent deletion. Always review dependencies before permanent deletion!',
        position: 'center',
        action: 'info'
      }
    ]
  }
];

// Export merged list for backward compatibility
export const BUILTIN_WALKTHROUGHS: InteractiveWalkthrough[] = [
  ...coreWalkthroughs,
  ...advancedWalkthroughs
];

// Export by category for filtered access
export const walkthroughsByCategory = {
  core: coreWalkthroughs,
  advanced: advancedWalkthroughs,
  all: BUILTIN_WALKTHROUGHS
};
