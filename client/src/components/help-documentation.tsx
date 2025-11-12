import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  Video, 
  FileText, 
  Play, 
  Clock, 
  Star,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Target,
  Users,
  Settings,
  Smartphone,
  BarChart3,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalkthroughPlayer, BUILTIN_WALKTHROUGHS } from "./interactive-walkthrough";
import { useAuth } from "@/hooks/useAuth";

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: HelpItem[];
}

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'walkthrough' | 'documentation' | 'video' | 'faq';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  content?: string;
  videoUrl?: string;
  walkthroughId?: string;
  tags: string[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Play,
    color: 'bg-blue-500',
    items: [
      {
        id: 'account-setup',
        title: 'Account Setup & Configuration',
        description: 'Set up your account, organization, and basic preferences',
        type: 'tutorial',
        difficulty: 'beginner',
        estimatedTime: 15,
        content: `# Account Setup & Configuration

## Initial Setup
1. **Create Account**: Sign up with your email and company information
2. **Verify Email**: Check your inbox and click the verification link
3. **Organization Setup**: Configure your company profile and branding
4. **User Preferences**: Set your timezone, notifications, and display options

## Essential First Steps
- Add your company logo and contact information in Settings
- Set up your primary business address
- Configure notification preferences
- Invite team members to your organization
- Set up your subscription plan and billing information

## Company Profile
Navigate to **Settings > Company Profile** to configure:
- **Company Name**: Your business name as it appears on invoices
- **Contact Information**: Email, phone, website
- **Business Address**: Physical address for your company
- **Logo**: Upload your company logo (appears on invoices, quotes, and emails)
- **Tax Settings**: Configure tax rates for your region

## User Account Settings
Customize your personal account settings:
- **Profile Information**: Name, email, phone number
- **Password Management**: Change password regularly for security
- **Notification Preferences**: Choose which notifications you want to receive
- **Time Zone**: Set your local time zone for accurate scheduling
- **Display Preferences**: Theme, language, and interface options

## Security Setup
- Set up strong password requirements for all users
- Review and customize user role permissions
- Configure session timeout settings (auto-logout for security)
- Enable email notifications for security events
- Regularly review user access and permissions

## Organization Structure
- **Departments**: Create departments for better organization (optional)
- **User Roles**: Set up admin, manager, and technician roles
- **Permission Levels**: Define what each role can access and modify
- **Teams**: Group users by function or location`,
        tags: ['setup', 'onboarding', 'account', 'security']
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        description: 'Understanding your main dashboard and key metrics',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 5,
        walkthroughId: 'dashboard-tour',
        tags: ['dashboard', 'overview', 'metrics']
      },
      {
        id: 'navigation-basics',
        title: 'Navigation & Interface Basics',
        description: 'Learn how to navigate the interface efficiently',
        type: 'documentation',
        difficulty: 'beginner',
        estimatedTime: 8,
        content: `# Navigation & Interface Basics

## Main Navigation
The sidebar contains all major sections of the application:
- **Dashboard**: Overview and key metrics
- **Calendar**: View and schedule jobs by date
- **Jobs**: Project and job management (active, cancelled, deleted views)
- **My Tasks**: Personal task list and assignments
- **Leads**: Sales leads and prospect management
- **Customers**: Customer relationship management
- **Invoices & Quotes**: Financial management
- **Expenses**: Expense tracking and reporting
- **Payments**: Payment processing and history
- **File Manager**: Document and photo storage
- **Parts & Supplies**: Inventory management
- **GPS Tracking**: Real-time location and route monitoring
- **Reports**: Business analytics and performance metrics
- **Messages**: Internal team communication
- **SMS**: Customer text messaging
- **Reviews**: Customer review management
- **Settings**: Application and company configuration
- **Users**: Team member management (admin only)

## Customizable Navigation
Your navigation menu is customizable based on:
- **User Role**: Different roles see different menu items
- **Permissions**: Admins can control which features each user can access
- **Navigation Order**: Customize the order of menu items in Settings

## Search Functionality
Use the global search (magnifying glass icon) to quickly find:
- Customer records by name, email, or phone
- Job details by title or ID
- Invoice numbers
- Team members
- File names and documents

## Quick Actions
Look for action buttons throughout the interface:
- **"+" or "Add New" buttons**: Create new records quickly
- **Action menus (three dots)**: Access additional options for each record
- **Bulk actions**: Select multiple items for batch operations

## Notifications
The bell icon in the header shows:
- **Job updates**: Status changes, completions
- **Payment notifications**: New payments received
- **Team messages**: Internal communications
- **System alerts**: Important system notifications
- **GPS events**: Arrival/departure notifications

## Keyboard Shortcuts
Speed up your workflow with keyboard shortcuts:
- **Ctrl/Cmd + K**: Open search
- **Ctrl/Cmd + N**: Create new (context-aware)
- **Esc**: Close dialogs and modals`,
        tags: ['navigation', 'interface', 'search', 'basics']
      },
      {
        id: 'dashboard-customization',
        title: 'Dashboard Customization',
        description: 'Customize your dashboard widgets and layout',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 12,
        content: `# Dashboard Customization

## Overview
Your dashboard is fully customizable with widgets that show the most important information for your role and workflow.

## Widget Types Available
- **Revenue & Financial Metrics**: Track income, expenses, profit/loss
- **Job Statistics**: Active jobs, completion rates, pending tasks
- **Team Performance**: Technician productivity, GPS tracking status
- **Customer Metrics**: New customers, customer satisfaction
- **Calendar View**: Upcoming jobs and appointments
- **Payment Status**: Outstanding invoices, recent payments
- **GPS Status**: Team locations and field status
- **Quick Actions**: Common tasks and shortcuts

## Customizing Your Dashboard

### Adding Widgets
1. Click the **"Customize Dashboard"** button
2. Select **"Add Widget"**
3. Choose from available widget types
4. Configure widget settings (date range, filters, display options)
5. Click **"Save"** to add the widget

### Arranging Widgets
1. Enter customization mode
2. Drag and drop widgets to reorder
3. Resize widgets by dragging corners
4. Organize related widgets together for better workflow
5. Save your layout

### Widget Settings
Each widget can be configured with:
- **Date Range**: Today, this week, this month, custom
- **Filters**: Organization, department, team member
- **Display Options**: Chart type, metrics shown
- **Refresh Rate**: How often data updates

## Dashboard Profiles
Create multiple dashboard configurations:
- **Executive View**: High-level financial and performance metrics
- **Operations View**: Job status, team location, daily tasks
- **Financial View**: Revenue, expenses, invoicing status
- **Field View**: Today's jobs, customer locations, route planning

Switch between profiles with one click based on your current focus.

## Role-Based Defaults
- **Admin**: Full business overview with all metrics
- **Manager**: Team performance and job management
- **Technician**: Personal tasks, assigned jobs, time tracking`,
        tags: ['dashboard', 'customization', 'widgets', 'personalization']
      }
    ]
  },
  {
    id: 'core-features',
    title: 'Core Features',
    icon: Target,
    color: 'bg-green-500',
    items: [
      {
        id: 'customer-management',
        title: 'Customer Management Basics',
        description: 'Add, edit, and manage customer information',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 8,
        walkthroughId: 'create-customer',
        tags: ['customers', 'management', 'data-entry']
      },
      {
        id: 'customer-management-detailed',
        title: 'Complete Customer Management Guide',
        description: 'Comprehensive guide to managing customer relationships',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 25,
        content: `# Complete Customer Management Guide

## Adding New Customers

### Basic Information
1. Navigate to **Customers** in the sidebar
2. Click **"Add Customer"** button
3. Fill in required fields:
   - **Name**: Customer's full name or business name
   - **Email**: Primary email address
   - **Phone**: Contact phone number
   - **Address**: Service address or billing address

### Additional Customer Details
- **Secondary Contact**: Backup contact information
- **Billing Address**: If different from service address
- **Customer Type**: Residential or commercial
- **Preferred Contact Method**: Email, phone, or SMS
- **Tags**: Add custom tags for organization (VIP, seasonal, etc.)

## Customer Locations

### Managing Multiple Service Locations
Many customers have multiple service locations:

1. **Add Location**
   - From customer detail page, click **"Add Location"**
   - Enter address details
   - Add location-specific notes
   - Mark as primary location if applicable

2. **Location Features**
   - **GPS Coordinates**: Automatically geocoded for routing
   - **Access Instructions**: Gate codes, parking notes, etc.
   - **Service History**: View all jobs at this location
   - **Photos**: Attach location photos for reference

3. **Location Management**
   - Edit location details anytime
   - Deactivate unused locations
   - Set default service location
   - Add emergency contact for each location

## Customer Communication

### Email Integration
- Send quotes directly from the system
- Email invoices with payment links
- Automated appointment reminders
- Follow-up emails after service completion

### SMS Messaging
- Quick text updates on job status
- Appointment confirmations
- Payment reminders
- Review requests after service

### Communication History
View all communications with a customer:
- Emails sent/received
- SMS messages
- Internal notes
- Phone call logs

## Customer Portal Features

### Quote Acceptance
Customers can:
- View quotes online via secure link
- Accept or decline quotes
- Provide availability for scheduling
- Upload photos or documents
- Add comments or special requests

### Payment Portal
- View invoice details
- Pay online via Stripe
- Download payment receipts
- View payment history

## Customer Data Management

### Importing Customers
Bulk import customers from spreadsheet:
1. Download CSV template
2. Fill in customer data
3. Upload CSV file
4. Review and confirm import
5. System validates and imports records

### Exporting Customer Data
- Export customer list to CSV or Excel
- Filter before export (active only, by tags, etc.)
- Include job history and financial data
- Scheduled exports for backup

## Customer Insights

### Activity Tracking
Monitor customer engagement:
- Last service date
- Total jobs completed
- Total revenue generated
- Average job value
- Service frequency

### Customer Segmentation
Group customers by:
- **Lifetime Value**: High-value vs. standard customers
- **Service Type**: Recurring vs. one-time service
- **Location**: Geographic regions
- **Customer Status**: Active, inactive, at-risk

## Best Practices

### Data Quality
- Enter complete contact information
- Verify addresses for accurate GPS routing
- Keep notes updated with preferences
- Tag customers for easy filtering
- Regular data cleanup and updates

### Privacy & Security
- Respect customer privacy preferences
- Secure storage of sensitive information
- GDPR/privacy compliance
- Permission-based data sharing

### Customer Retention
- Track customer satisfaction
- Follow up after each service
- Proactive maintenance reminders
- Loyalty programs and discounts
- Request and manage customer reviews`,
        tags: ['customers', 'management', 'crm', 'communication', 'detailed']
      },
      {
        id: 'job-creation',
        title: 'Creating and Managing Jobs - Quick Start',
        description: 'Learn how to create, assign, and track jobs',
        type: 'tutorial',
        difficulty: 'beginner',
        estimatedTime: 12,
        content: `# Creating and Managing Jobs - Quick Start

## Job Creation Process
1. **Navigate to Jobs**: Click on "Jobs" in the sidebar
2. **Add New Job**: Click the "Add Job" button
3. **Basic Information**: Enter job title, description, and customer
4. **Scheduling**: Set start date, end date, and priority
5. **Team Assignment**: Assign team members to the job
6. **Tasks**: Break down the job into specific tasks

## Job Management Features
- **Status Tracking**: Monitor job progress through various stages
- **Time Tracking**: Record time spent on jobs
- **File Attachments**: Upload photos, documents, and reports
- **Customer Communication**: Send updates and collect feedback

## Best Practices
- Use clear, descriptive job titles
- Set realistic timelines and deadlines
- Assign appropriate team members based on skills
- Regular status updates to keep everyone informed
- Document important decisions and changes`,
        tags: ['jobs', 'projects', 'management', 'workflow']
      },
      {
        id: 'job-management-comprehensive',
        title: 'Complete Job & Project Management Guide',
        description: 'Comprehensive guide to job lifecycle management',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 35,
        content: `# Complete Job & Project Management Guide

## Creating Jobs from Different Sources

### 1. Creating from Calendar
- Click any date on the calendar
- Fill in job details in the popup form
- Drag and drop to reschedule
- Color-coded by status and priority

### 2. Creating from Customer Record
- Open customer detail page
- Click **"Create Job"** button
- Customer information auto-populated
- Previous service history visible for reference

### 3. Creating from Lead Conversion
- Convert qualified leads directly to jobs
- Lead information transfers automatically
- Maintain conversation history
- Track lead-to-job conversion metrics

### 4. Creating from Quotes
- When customer accepts quote
- Convert to scheduled job with one click
- Quote pricing transfers to job
- Original quote remains linked for reference

## Job Information & Settings

### Basic Details
- **Title**: Clear, descriptive job name
- **Description**: Detailed scope of work
- **Customer**: Link to customer record
- **Location**: Service address (with GPS coordinates)
- **Estimated Value**: Expected job revenue
- **Priority**: Low, Medium, High, Urgent

### Scheduling
- **Start Date/Time**: When work begins
- **End Date/Time**: Expected completion
- **Duration**: Calculated or manually set
- **All-Day Event**: For jobs without specific times
- **Recurring**: Set up recurring service schedules

### Team Assignment
- **Assigned To**: Primary technician/team
- **Additional Team Members**: Support staff
- **Skills Required**: Match jobs to technician skills
- **Availability Check**: View technician schedules

## Job Status Workflow

### Status Progression
1. **Scheduled**: Job created and scheduled
2. **In Progress**: Technician starts work
3. **Completed**: Work finished, pending review
4. **Converted**: Converted to invoice
5. **Cancelled**: Job cancelled (with reason)

### Automated Status Updates
- **GPS-Based**: Auto-mark "In Progress" when technician arrives
- **Time-Based**: Notifications for overdue jobs
- **Manual**: Technician can update via mobile app

## Recurring Jobs System

### Setting Up Recurring Jobs
1. **Create Template Job**
   - Define service details
   - Set pricing and tasks
   - Specify customer and location

2. **Configure Recurrence Pattern**
   - **Frequency**: Daily, Weekly, Bi-weekly, Monthly, Quarterly, Annually
   - **Days of Week**: For weekly schedules
   - **Day of Month**: For monthly schedules
   - **End Date**: When recurring series ends
   - **Occurrences**: Or number of repetitions

3. **Automatic Job Generation**
   - System creates future job occurrences
   - Assigned to same technician
   - Same pricing and tasks
   - Notifications sent to customer

### Managing Recurring Jobs
- **Edit Series**: Change all future occurrences
- **Edit Single Occurrence**: Modify one instance only
- **Skip Occurrence**: Cancel specific date
- **End Series**: Stop future job generation
- **View Series**: See all related jobs

## Job Tasks

### Creating Task Lists
Break down jobs into manageable tasks:
- **Task Name**: Specific activity
- **Description**: Details and requirements
- **Assigned To**: Team member responsible
- **Estimated Time**: How long it should take
- **Dependencies**: Tasks that must finish first
- **Status**: Not Started, In Progress, Completed

### Task Templates
Create reusable task lists for common jobs:
- **Service Type Templates**: HVAC maintenance, plumbing repair, etc.
- **Checklist Items**: Standard steps for quality control
- **Required Photos**: Document before/after conditions
- **Safety Requirements**: PPE and safety procedures

## Job Time Tracking

### Automatic Time Tracking
- **GPS Arrival**: Start time when technician arrives at job site
- **GPS Departure**: End time when leaving location
- **Geofencing**: Automatic detection within job site radius
- **Time Exceeded Alerts**: Notifications when job runs over estimate

### Manual Time Entry
- Technicians can manually start/stop time
- Edit time entries for accuracy
- Add break times
- Time clock integration

### On-Site Labor Cost Tracking
System automatically calculates:
- **Actual Labor Hours**: Based on arrival/departure times
- **Technician Hourly Rate**: From employee settings
- **Total Labor Cost**: Hours × Rate
- **Comparison to Estimate**: Over/under budget tracking
- **Profit Margin Impact**: Real-time profitability analysis

## Job Files & Photos

### File Management
- **Before Photos**: Document initial conditions
- **During Progress**: Update photos as work progresses
- **After Photos**: Show completed work
- **Documents**: Upload permits, receipts, contracts
- **Image Timestamps**: Auto-add date/time/GPS to photos

### Photo Organization
- **Folders**: Organize by job phase or type
- **Tagging**: Add descriptive tags
- **Sharing**: Share with customers via secure link
- **Download**: Bulk download all job files

## Mobile Job Management

### Mobile App Features
- **View Assigned Jobs**: Today's schedule
- **Start/Complete Jobs**: One-tap status updates
- **GPS Navigation**: Route to job site
- **Photo Capture**: Take and upload photos
- **Customer Signature**: Digital sign-off
- **Time Tracking**: Automatic or manual

### Offline Mode
- View job details offline
- Capture photos and notes
- Sync when connection restored

## Job Views & Filters

### Available Views
- **Active Jobs**: All current jobs
- **My Jobs**: Assigned to current user
- **Calendar View**: Jobs by date
- **Map View**: Jobs by location
- **Cancelled Jobs**: Historical cancelled jobs
- **Deleted Jobs**: Soft-deleted jobs (recoverable)

### Filtering & Search
- **By Status**: Scheduled, in progress, completed
- **By Date Range**: Custom date filters
- **By Customer**: All jobs for specific customer
- **By Technician**: Team member's jobs
- **By Location**: Geographic area
- **By Value**: High-value jobs

## Converting Jobs to Invoices

### Automatic Conversion
When job is marked complete:
1. System offers to create invoice
2. Job details auto-populate invoice
3. Time tracked becomes labor line items
4. Expenses can be added
5. Review and send to customer

### Invoice Line Items
- **Labor**: Calculated from time tracking
- **Materials**: Parts and supplies used
- **Equipment**: Tool rental or usage fees
- **Travel**: Mileage or trip charges
- **Taxes**: Automatically calculated

## Cancelled & Deleted Jobs

### Cancelling Jobs
- Select cancellation reason
- Optionally notify customer
- Job moves to "Cancelled" view
- Can be reactivated if needed
- Cancellation history tracked

### Deleted Jobs
- Soft delete (recoverable)
- Moved to "Deleted Jobs" view
- Can be permanently deleted by admin
- Or restored to active status
- Deletion tracked with user and timestamp

## Job Analytics & Reporting

### Key Metrics
- **Completion Rate**: % jobs finished on time
- **Average Duration**: Actual vs. estimated time
- **Revenue Per Job**: Average job value
- **Customer Satisfaction**: Post-job ratings
- **Technician Performance**: Jobs per day, completion rate

### Profit/Loss Analysis
View profitability per job:
- **Revenue**: Invoice total
- **Labor Cost**: Actual hours worked
- **Materials Cost**: Parts and supplies
- **Overhead**: Allocated business expenses
- **Net Profit**: Bottom line per job

### Multi-View Reporting
- **Per Day**: Daily profitability
- **Per Week**: Weekly trends
- **Per Month**: Monthly performance
- **Per Job**: Individual job analysis
- **Per Customer**: Customer profitability
- **Per Technician**: Team member performance

## Best Practices

### Job Planning
- Create detailed job descriptions
- Realistic time estimates based on historical data
- Assign jobs based on technician skills and location
- Schedule buffer time between jobs
- Communicate schedule to team daily

### Quality Control
- Use task checklists for consistency
- Require photos at key stages
- Customer sign-off before completion
- Follow-up quality checks
- Address issues immediately

### Customer Communication
- Automated appointment reminders (SMS/Email)
- Real-time status updates
- ETA notifications when en route
- Completion notifications
- Review requests after service

### Efficiency Tips
- **Batch Similar Jobs**: Group by location or service type
- **Route Optimization**: Plan most efficient daily routes
- **Mobile First**: Minimize office time for field staff
- **Template Usage**: Standardize common jobs
- **GPS Tracking**: Monitor field team in real-time`,
        tags: ['jobs', 'projects', 'management', 'workflow', 'comprehensive', 'recurring', 'tracking']
      },
      {
        id: 'invoicing',
        title: 'Invoicing & Billing',
        description: 'Create invoices, track payments, and manage billing',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 25,
        content: `# Invoicing & Billing

## Creating Invoices
1. **Job Completion**: Ensure job is marked as complete
2. **Generate Invoice**: Use the "Create Invoice" button from the job
3. **Line Items**: Add services, materials, and labor costs
4. **Tax Calculation**: Apply appropriate tax rates
5. **Review & Send**: Preview invoice before sending to customer

## Payment Tracking
- **Payment Status**: Track paid, pending, and overdue invoices
- **Payment Methods**: Accept various payment types
- **Automatic Reminders**: Set up automated payment reminders
- **Reporting**: Generate financial reports and summaries

## Invoice Templates
- **Custom Branding**: Add your logo and company information
- **Template Variations**: Create templates for different service types
- **Terms & Conditions**: Include standard terms and payment policies`,
        tags: ['invoicing', 'billing', 'payments', 'financial']
      }
    ]
  },
  {
    id: 'mobile-features',
    title: 'Mobile Features',
    icon: Smartphone,
    color: 'bg-purple-500',
    items: [
      {
        id: 'mobile-overview',
        title: 'Mobile App Overview',
        description: 'Understanding mobile features and capabilities',
        type: 'walkthrough',
        difficulty: 'intermediate',
        estimatedTime: 12,
        walkthroughId: 'mobile-features',
        tags: ['mobile', 'overview', 'features']
      },
      {
        id: 'gps-tracking',
        title: 'GPS Tracking & Location Services',
        description: 'Track team locations and optimize routing',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 15,
        content: `# GPS Tracking & Location Services

## Enabling GPS Tracking
1. **Mobile App**: Download and install the mobile app
2. **Permissions**: Grant location access permissions
3. **Settings**: Configure tracking preferences
4. **Privacy**: Understand data collection and privacy settings

## Location Features
- **Real-time Tracking**: See team member locations in real-time
- **Route Optimization**: Plan efficient routes between jobs
- **Geofencing**: Set up location-based alerts and check-ins
- **Time Tracking**: Automatic time tracking based on location

## Best Practices
- Respect employee privacy and communicate tracking policies
- Use location data to improve efficiency, not for micromanagement
- Regular review of tracking settings and permissions
- Train team on proper use of mobile features`,
        tags: ['gps', 'tracking', 'mobile', 'location', 'routing']
      }
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    icon: Zap,
    color: 'bg-orange-500',
    items: [
      {
        id: 'reporting',
        title: 'Advanced Reporting & Analytics',
        description: 'Create custom reports and analyze business data',
        type: 'tutorial',
        difficulty: 'advanced',
        estimatedTime: 30,
        content: `# Advanced Reporting & Analytics

## Report Types
- **Financial Reports**: Revenue, expenses, and profit analysis
- **Team Performance**: Productivity and efficiency metrics
- **Customer Reports**: Customer satisfaction and retention
- **Operational Reports**: Job completion rates and timelines

## Custom Dashboard Creation
1. **Widget Selection**: Choose from available widget types
2. **Data Filtering**: Apply filters for specific date ranges or criteria
3. **Layout Customization**: Arrange widgets for optimal visibility
4. **Sharing**: Share dashboards with team members or stakeholders

## Data Export & Integration
- **Export Formats**: CSV, PDF, Excel formats available
- **Scheduled Reports**: Automatic report generation and delivery
- **API Integration**: Connect with third-party tools and services`,
        tags: ['reporting', 'analytics', 'dashboard', 'data', 'business-intelligence']
      }
    ]
  },
  {
    id: 'task-management',
    title: 'Task Management',
    icon: Target,
    color: 'bg-indigo-500',
    items: [
      {
        id: 'create-task-guide',
        title: 'Creating and Managing Tasks',
        description: 'Learn how to create, assign, and track tasks effectively',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 8,
        walkthroughId: 'create-task',
        tags: ['tasks', 'assignment', 'productivity']
      }
    ]
  },
  {
    id: 'financial-management',
    title: 'Financial Management',
    icon: BarChart3,
    color: 'bg-emerald-500',
    items: [
      {
        id: 'invoice-creation',
        title: 'Creating Professional Invoices',
        description: 'Step-by-step guide to create and send invoices',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 10,
        walkthroughId: 'create-invoice',
        tags: ['invoicing', 'billing', 'payments']
      },
      {
        id: 'expense-tracking',
        title: 'Tracking Business Expenses',
        description: 'Learn how to record and categorize expenses',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 8,
        walkthroughId: 'add-expense',
        tags: ['expenses', 'accounting', 'financial']
      }
    ]
  },
  {
    id: 'sales-marketing',
    title: 'Sales & Marketing',
    icon: Users,
    color: 'bg-pink-500',
    items: [
      {
        id: 'lead-management',
        title: 'Managing Sales Leads',
        description: 'Capture and convert potential customers',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 12,
        walkthroughId: 'create-lead',
        tags: ['leads', 'sales', 'crm']
      }
    ]
  },
  {
    id: 'field-operations',
    title: 'Field Operations',
    icon: Settings,
    color: 'bg-cyan-500',
    items: [
      {
        id: 'vehicle-inspections',
        title: 'Digital Vehicle Inspections',
        description: 'Perform comprehensive vehicle inspections with photos',
        type: 'walkthrough',
        difficulty: 'intermediate',
        estimatedTime: 15,
        walkthroughId: 'vehicle-inspection',
        tags: ['vehicles', 'inspections', 'maintenance']
      }
    ]
  },
  {
    id: 'communication',
    title: 'Team Communication',
    icon: Users,
    color: 'bg-violet-500',
    items: [
      {
        id: 'team-messaging',
        title: 'Team Messaging System',
        description: 'Send messages and announcements to your team',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 6,
        walkthroughId: 'create-team-message',
        tags: ['messaging', 'communication', 'team']
      }
    ]
  },
  {
    id: 'file-management',
    title: 'File Management',
    icon: FileText,
    color: 'bg-amber-500',
    items: [
      {
        id: 'file-manager-guide',
        title: 'Using the File Manager',
        description: 'Upload, organize, and share files effectively',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 10,
        walkthroughId: 'use-file-manager',
        tags: ['files', 'documents', 'organization']
      }
    ]
  },
  {
    id: 'admin-management',
    title: 'Admin & Management',
    icon: Shield,
    color: 'bg-red-500',
    items: [
      {
        id: 'user-management',
        title: 'User Management & Permissions',
        description: 'Manage team members and set appropriate permissions',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 20,
        content: `# User Management & Permissions

## Adding Team Members
1. **User Invitation**: Send email invitations to new team members
2. **Role Assignment**: Choose appropriate roles and permissions
3. **Department Setup**: Organize users into departments or teams
4. **Initial Setup**: Guide new users through initial setup

## Permission Management
- **Role-Based Access**: Define roles with specific permissions
- **Granular Controls**: Set permissions for individual features
- **Administrative Rights**: Carefully manage admin access
- **Regular Reviews**: Periodically review and update permissions

## Security Best Practices
- Implement strong password policies
- Enable two-factor authentication
- Regular security audits and reviews
- Monitor user activity and access logs`,
        tags: ['users', 'permissions', 'security', 'admin', 'management']
      }
    ]
  }
];

interface HelpDocumentationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDocumentation({ isOpen, onClose }: HelpDocumentationProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("getting-started");
  const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sections' | 'item' | 'walkthrough'>('sections');

  // Start tutorial/walkthrough progress tracking
  const startTutorialMutation = useMutation({
    mutationFn: (tutorialId: string) => 
      apiRequest("/api/tutorial-progress/start", {
        method: "POST",
        body: { tutorialId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-progress"] });
    },
  });

  // Filter items based on search
  const filteredSections = HELP_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(section => section.items.length > 0);

  const handleItemClick = (item: HelpItem) => {
    setSelectedItem(item);
    setViewMode('item');

    if (item.type === 'walkthrough' && item.walkthroughId) {
      setActiveWalkthrough(item.walkthroughId);
      setViewMode('walkthrough');
      onClose(); // Close help to show walkthrough
    }
  };

  const handleWalkthroughComplete = (rating?: number, feedback?: string) => {
    setActiveWalkthrough(null);
    setViewMode('sections');
    // Track completion if needed
  };

  if (!isOpen && !activeWalkthrough) return null;

  // Render active walkthrough
  if (activeWalkthrough) {
    const walkthrough = BUILTIN_WALKTHROUGHS.find(w => w.id === activeWalkthrough);
    if (walkthrough) {
      return (
        <WalkthroughPlayer
          walkthrough={walkthrough}
          onComplete={handleWalkthroughComplete}
          onClose={() => setActiveWalkthrough(null)}
        />
      );
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'walkthrough': return Play;
      case 'tutorial': return BookOpen;
      case 'documentation': return FileText;
      default: return HelpCircle;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Help & Documentation
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {viewMode === 'item' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setViewMode('sections')}
              >
                ← Back to Sections
              </Button>
            )}
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'sections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Sections Sidebar */}
              <div className="border-r overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3",
                        selectedSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white", section.color)}>
                        <section.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="text-sm opacity-80">{section.items.length} items</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="col-span-2 overflow-y-auto p-4">
                {(() => {
                  const section = filteredSections.find(s => s.id === selectedSection);
                  if (!section) return null;

                  return (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                      
                      <div className="grid gap-4">
                        {section.items.map((item) => {
                          const TypeIcon = getTypeIcon(item.type);
                          
                          return (
                            <Card 
                              key={item.id} 
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleItemClick(item)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-medium">{item.title}</h3>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-3">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center gap-2">
                                  <Badge className={getDifficultyColor(item.difficulty)}>
                                    {item.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.estimatedTime}min
                                  </Badge>
                                  <Badge variant="outline">
                                    {item.type}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {viewMode === 'item' && selectedItem && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const TypeIcon = getTypeIcon(selectedItem.type);
                      return <TypeIcon className="w-5 h-5 text-muted-foreground" />;
                    })()}
                    <h1 className="text-2xl font-bold">{selectedItem.title}</h1>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={getDifficultyColor(selectedItem.difficulty)}>
                      {selectedItem.difficulty}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedItem.estimatedTime} minutes
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                </div>

                {selectedItem.content && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ 
                      __html: selectedItem.content.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/# /g, '<h1>')
                    }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}