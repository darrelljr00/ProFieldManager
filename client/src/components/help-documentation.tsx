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
  Zap,
  Code
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
  },
  {
    id: 'technical-documentation',
    title: 'Technical Documentation',
    icon: Code,
    color: 'bg-slate-500',
    items: [
      {
        id: 'two-stage-user-deletion',
        title: 'Two-Stage User Deletion System',
        description: 'How soft delete and hard delete work with dependency checking',
        type: 'documentation',
        difficulty: 'advanced',
        estimatedTime: 20,
        content: `# Two-Stage User Deletion System

## Architecture Overview

The Pro Field Manager implements a **two-stage user deletion system** to protect business data integrity while allowing proper user management. This prevents accidental data loss and ensures business records are never orphaned.

### Why Two-Stage Deletion?

**Stage 1 - Soft Delete:** Marks users as inactive but preserves all data
**Stage 2 - Hard Delete:** Permanently removes user only if no business records exist

This approach provides:
- **Data Integrity**: Never orphan business records (jobs, invoices, customers, etc.)
- **Reversibility**: Soft deleted users can be reactivated
- **Audit Trail**: Tracks who deleted whom and when
- **Safety Net**: Prevents accidental permanent deletion

### Database Design

**User Table Fields:**
\`\`\`typescript
users table:
  - isActive: boolean (false when soft deleted)
  - deletedAt: timestamp (when user was soft deleted)
  - deletedBy: integer (admin who performed soft delete)
  - passwordResetToken: string (cleared on soft delete)
  - passwordResetExpires: timestamp (cleared on soft delete)
\`\`\`

## Implementation Details

### Location
\`server/storage.ts\` - Lines 875-992

### Required Table Imports
\`\`\`typescript
import { 
  users, userSessions, notifications,
  calendarJobs, invoices, quotes, 
  expenses, customers, payments, 
  internalMessages 
} from "@shared/schema";
\`\`\`

### Stage 1: Soft Delete (\`deleteUser\` method)

**Code Location:** Lines 875-890

\`\`\`typescript
async deleteUser(id: number, deletedBy?: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Mark user as inactive and record deletion metadata
    await tx.update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        passwordResetToken: null,
        passwordResetExpires: null
      })
      .where(eq(users.id, id));

    // Delete all active sessions
    await tx.delete(userSessions)
      .where(eq(userSessions.userId, id));
  });
}
\`\`\`

**What Happens:**
1. Transaction begins (atomic operation)
2. User record updated with soft delete flags
3. isActive set to false (prevents login)
4. deletedAt timestamp recorded
5. deletedBy tracks admin who deleted
6. Password reset tokens cleared for security
7. All sessions deleted (forces logout)
8. Transaction commits

### Stage 2: Hard Delete (\`hardDeleteUser\` method)

**Code Location:** Lines 892-992

**Step 1: Validate User Can Be Hard Deleted**
\`\`\`typescript
const user = await this.getUser(id);
if (!user) {
  return { success: false, message: "User not found" };
}

if (user.isActive) {
  return { 
    success: false, 
    message: "Can only hard delete inactive users. Please deactivate first." 
  };
}
\`\`\`

**Step 2: Synchronous Dependency Check**

The system performs **immediate, synchronous queries** (not background queue) to check 7 critical business entities for records created by or assigned to the user:

\`\`\`typescript
const dependencies = {
  jobs: 0,          // calendarJobs.userId
  invoices: 0,      // invoices.createdBy
  quotes: 0,        // quotes.createdBy
  expenses: 0,      // expenses.userId
  customers: 0,     // customers.createdBy
  payments: 0,      // payments.createdBy
  internalMessages: 0  // internalMessages.senderId
};

// Example dependency check:
const [jobCount] = await db.select({ count: sql\`count(*)\` })
  .from(calendarJobs)
  .where(eq(calendarJobs.userId, id));
dependencies.jobs = Number(jobCount.count);

// Repeat for all 7 entity types...
\`\`\`

**Step 3: Block Deletion if Dependencies Exist**
\`\`\`typescript
const hasData = Object.values(dependencies).some(count => count > 0);

if (hasData) {
  return {
    success: false,
    message: \`Cannot permanently delete user with existing business records. 
              User has: \${Object.entries(dependencies)
                .filter(([_, count]) => count > 0)
                .map(([key, count]) => \`\${count} \${key}\`)
                .join(', ')
              }. User will remain deactivated.\`,
    dependencies
  };
}
\`\`\`

**Example Response:**
\`\`\`json
{
  "success": false,
  "message": "Cannot permanently delete user with existing business records. User has: 12 jobs, 8 invoices, 3 customers. User will remain deactivated.",
  "dependencies": {
    "jobs": 12,
    "invoices": 8,
    "quotes": 0,
    "expenses": 0,
    "customers": 3,
    "payments": 0,
    "internalMessages": 0
  }
}
\`\`\`

**Step 4: Perform Hard Delete (If Safe)**
\`\`\`typescript
await db.transaction(async (tx) => {
  // Delete ephemeral data
  await tx.delete(userSessions)
    .where(eq(userSessions.userId, id));
  await tx.delete(notifications)
    .where(eq(notifications.userId, id));
  
  // Delete the user record permanently
  await tx.delete(users)
    .where(eq(users.id, id));
});

console.log(\`✅ Hard deleted user \${id} (\${user.username}) by admin \${deletedBy} - no business data dependencies\`);
\`\`\`

## Data Flow

### Soft Delete Flow
1. Admin clicks "Delete User" on active user
2. **Route**: \`DELETE /api/admin/users/:id\`
3. **Check**: Prevent self-deletion
4. **Check**: User exists and belongs to admin's organization
5. **Check**: \`user.isActive === true\`
6. **Execute**: \`storage.deleteUser(id, adminId)\`
7. **Transaction**:
   - Update users table (isActive=false, timestamps)
   - Delete from userSessions table
8. **Broadcast**: WebSocket \`user_deleted\` event to organization
9. **Response**: \`{ message: "User deactivated successfully", hardDelete: false }\`

### Hard Delete Flow  
1. Admin clicks "Delete User" on inactive user
2. **Route**: \`DELETE /api/admin/users/:id\`
3. **Check**: Prevent self-deletion
4. **Check**: User exists and belongs to admin's organization
5. **Check**: \`user.isActive === false\`
6. **Execute**: \`storage.hardDeleteUser(id, adminId)\`
7. **Dependency Scan**:
   - Query calendarJobs for userId matches
   - Query invoices for createdBy matches
   - Query quotes for createdBy matches
   - Query expenses for userId matches
   - Query customers for createdBy matches
   - Query payments for createdBy matches
   - Query internalMessages for senderId matches
8. **Decision**:
   - If ANY dependencies found → Return error with details
   - If NO dependencies → Proceed to step 9
9. **Transaction** (only if no dependencies):
   - Delete from userSessions
   - Delete from notifications  
   - Delete from users
10. **Log**: Console log with admin ID and username
11. **Broadcast**: WebSocket \`user_hard_deleted\` event
12. **Response**: \`{ message: "User permanently deleted", hardDelete: true, dependencies: {...} }\`

## Design Decisions

### Why Not Immediate Permanent Deletion?
- **Prevents Accidents**: Easy to accidentally click delete
- **Data Integrity**: Ensures all business records remain valid
- **Reversible**: Inactive users can be reactivated if mistake
- **Compliance**: Some regulations require data retention

### Why Dependency Checks?
- **Referential Integrity**: Prevents orphaned business records
- **Business Continuity**: Jobs, invoices still reference valid users
- **Audit Trail**: Maintains who created what
- **Reporting Accuracy**: Historical reports remain valid

### Why Soft Delete First?
- **Cooling-Off Period**: Admin can reconsider before permanent action
- **Data Review**: Time to reassign records to other users
- **Safety**: Cannot accidentally hard delete an active account
- **Reversibility**: Mistakes can be undone

### Why Console Logging Instead of Database Audit Table?
**Decision**: Middle-ground approach for this project scale

**Pros of Console Logging:**
- Simpler implementation
- No additional database table needed
- Timestamped logs in production
- Can be monitored with log aggregation tools

**Cons**:
- Logs may rotate/expire
- Not queryable like database
- No built-in UI for viewing audit history

**Note**: For enterprise scale, consider migrating to database audit table with:
- Detailed action logging
- IP address tracking
- Full before/after state
- Queryable audit history

## Performance Considerations

### Dependency Counting Queries
**Optimization**: Use COUNT queries instead of SELECT *
\`\`\`typescript
// Efficient - only counts rows
const [count] = await db.select({ count: sql\`count(*)\` })
  .from(calendarJobs)
  .where(eq(calendarJobs.userId, id));

// Inefficient - fetches all data
const jobs = await db.select().from(calendarJobs)
  .where(eq(calendarJobs.userId, id));
const count = jobs.length;
\`\`\`

### Database Indexes
Required indexes for fast dependency checks:
\`\`\`sql
-- Improves calendarJobs lookup
CREATE INDEX idx_calendar_jobs_user_id ON calendar_jobs(user_id);

-- Improves invoices lookup  
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

-- Improves quotes lookup
CREATE INDEX idx_quotes_created_by ON quotes(created_by);

-- Similar indexes for expenses, customers, payments, messages
\`\`\`

### Transaction Isolation
- **ACID Compliance**: Ensures all-or-nothing deletion
- **Prevents Race Conditions**: No partial deletes if error occurs
- **Rollback Safety**: Auto-rollback on any error

## Security Measures

### Cannot Delete Yourself
\`\`\`typescript
if (parseInt(id) === req.user!.id) {
  return res.status(400).json({ 
    message: "Cannot delete your own account" 
  });
}
\`\`\`

### Organization Scoping
\`\`\`typescript
const user = await storage.getUser(parseInt(id));
if (user.organizationId !== req.user!.organizationId) {
  return res.status(403).json({ 
    message: "Cannot delete users from other organizations" 
  });
}
\`\`\`

### Admin/Manager Only
Route protected by \`requireManagerOrAdmin\` middleware - only users with admin or manager roles can delete users.

### Cannot Hard Delete Active Users
\`\`\`typescript
if (user.isActive) {
  return { 
    success: false, 
    message: "Can only hard delete inactive users. Please deactivate first." 
  };
}
\`\`\`

### Audit Trail
- Console logs include: timestamp, user ID, username, admin ID
- deletedBy field tracks who performed soft delete
- deletedAt timestamp records when

## Common Issues & Troubleshooting

### Error: "jobs is not defined"
**Cause**: Missing table import in storage.ts
**Solution**:
\`\`\`typescript
// Add to imports at top of server/storage.ts
import { 
  // ... other imports
  calendarJobs, 
  notifications 
} from "@shared/schema";
\`\`\`

### Error: "Can only hard delete inactive users"
**Cause**: Trying to hard delete an active user
**Solution**: Must perform soft delete first, then hard delete
1. Click Delete on active user (soft deletes)
2. Click Delete again on now-inactive user (hard deletes if no dependencies)

### Deletion Blocked with Dependency Report
**Cause**: User has business records in the system
**Example**: User created 12 jobs, 8 invoices, 3 customers

**Solutions**:
1. **Reassign Records**: Change createdBy/userId to different user
2. **Delete Business Records**: If truly no longer needed
3. **Leave Inactive**: User remains soft-deleted but accessible for reports

**Best Practice**: Keep user soft-deleted to maintain historical data integrity

### Session Cleanup Not Working
**Cause**: Transaction rollback due to error
**Solution**: Check logs for transaction errors
- Verify database connectivity
- Check for foreign key constraint violations
- Ensure user ID exists

### WebSocket Broadcast Fails
**Cause**: broadcastFunction not initialized
**Solution**: Verify WebSocket setup in server/routes.ts
\`\`\`typescript
setBroadcastFunction((event, data, orgId, excludeUserId) => {
  // Broadcast logic
});
\`\`\`

## Best Practices

1. **Always Soft Delete First**: Never skip to hard delete
2. **Review Dependencies**: Check the dependency report before asking user to reassign
3. **Communicate to User**: Explain why deletion is blocked and what they need to do
4. **Regular Audits**: Periodically review inactive users
5. **Data Cleanup**: Create process for handling users with orphaned records`,
        tags: ['technical', 'architecture', 'database', 'security', 'deletion', 'soft-delete', 'hard-delete']
      },
      {
        id: 'gps-tracking-system',
        title: 'GPS Tracking System Architecture',
        description: 'OBD GPS integration, real-time tracking, geofencing, and trip building',
        type: 'documentation',
        difficulty: 'advanced',
        estimatedTime: 25,
        content: `# GPS Tracking System Architecture

## Overview

Pro Field Manager's **GPS tracking system** integrates with OneStep GPS OBD devices to provide **real-time vehicle location tracking**. 

**What's Currently Implemented**:
- OneStep GPS API polling (every 30-60 seconds)
- Vehicle location data storage in \`obd_location_data\` table
- Manual trip import from OneStep API
- Database tables and utility functions for geofencing and trip analysis

**Roadmap Features** (Database schema exists but automation not implemented):
- Automatic trip building from GPS pings
- Automatic geofence-based arrival/departure detection
- Fuel level monitoring via OBD data
- Real-time WebSocket location broadcasting

### Key Features (Current Implementation)
- ✅ **Real-Time Location Tracking**: Live vehicle positions updated every 30-60 seconds via OneStep API poller
- ✅ **OBD Device Integration**: OneStep GPS cellular SIM card devices for vehicle tracking
- ✅ **Manual Trip Import**: Fetch trip history from OneStep GPS API and store in database
- ✅ **Geofence Infrastructure**: Database schema and utilities for geofence calculations
- ✅ **GPS Data Storage**: All location pings stored in \`obd_location_data\` table
- ✅ **Multi-Organization Support**: Isolated tracking per organization with separate API keys
- ⏳ **Automated Trip Building**: Planned - automatic grouping of GPS pings into trips
- ⏳ **Automatic Geofence Detection**: Planned - auto arrival/departure detection
- ⏳ **Fuel Tracking Integration**: Planned - OBD fuel level monitoring
- ⏳ **Historical Route Replay**: Planned - save and replay historical GPS routes

## System Architecture

### Components

**1. OneStep GPS API Integration** (\`server/integrations/onestep.ts\`)
- Fetches trips and device data from OneStep GPS cloud platform
- Handles rate limiting (429 responses) with automatic retry
- Maps external trip data to internal database schema

**2. GPS Poller Service** (\`server/services/OneStepPoller.ts\`)
- Background service polling OneStep API every 30-60 seconds
- Stores GPS pings in \`obd_location_data\` table
- Per-organization polling with jittered intervals
- Locking mechanism prevents duplicate polling

**3. Trip Builder** (Planned Feature)
- **Status**: Not currently implemented as automatic background service
- **Planned Functionality**:
  - Group GPS pings into trips based on movement patterns
  - Detect significant movement (150m minimum, 0.5 MPH minimum speed)
  - Calculate trip distance, duration, average/max speed
  - Automatically store trips in \`obd_trips\` table
- **Current Alternative**: Manual trip import via \`OneStepGPSService.syncVehicleTrips()\` fetches completed trips from OneStep API
- **Utility Available**: \`isSignificantMovement()\` function exists in \`server/utils/gps.ts\` for future implementation

**4. Geofencing Engine**
- Database schema supports circular geofences around job sites (default 100m radius)
- Haversine distance calculation available in \`server/utils/gps.ts\`
- Manual geofence checking can be implemented using \`haversineDistance()\`
- **Note**: Automatic arrival detection is not currently implemented in routes

**5. Auto Job Service** (Planned Feature)
- **Status**: Currently disabled, pending implementation of automatic geofence detection
- **Planned Functionality**:
  - Monitor arrival events and auto-start jobs
  - Monitor departure events and auto-complete jobs
  - Track on-site labor time and costs
- **Blocker**: Requires automatic geofence detection to generate arrival/departure events
- **Note**: Service skeleton exists in codebase but is not active

## Database Schema

### Core GPS Tables

**\`obd_location_data\`** - Real-time GPS pings
\`\`\`typescript
{
  id: serial,
  organizationId: integer,
  vehicleId: integer,
  deviceId: text,              // OneStep device identifier
  latitude: decimal(10, 8),
  longitude: decimal(11, 8),
  speed: decimal(5, 2),         // mph
  heading: decimal(5, 2),       // degrees (0-360)
  altitude: decimal(7, 2),      // meters
  accuracy: decimal(6, 2),      // meters
  timestamp: timestamp,
  
  // Unique constraint to prevent duplicate pings
  UNIQUE (organizationId, deviceId, timestamp)
}
\`\`\`

**\`obd_trips\`** - Grouped travel segments
\`\`\`typescript
{
  id: serial,
  organizationId: integer,
  vehicleId: integer,
  deviceId: text,
  externalTripId: text,        // OneStep trip ID
  provider: text,              // "onestep", "custom"
  startTime: timestamp,
  endTime: timestamp,
  startLatitude/startLongitude: decimal,
  endLatitude/endLongitude: decimal,
  startLocation: text,         // Reverse geocoded address
  endLocation: text,
  distanceMiles: decimal(10, 2),
  durationMinutes: integer,
  averageSpeed: decimal(5, 2),
  maxSpeed: decimal(5, 2),
  status: text,                // "active", "completed"
  
  // Prevent duplicate imports from OneStep
  UNIQUE (provider, externalTripId)
}
\`\`\`

**\`job_site_geofences\`** - Geofence definitions
\`\`\`typescript
{
  id: serial,
  projectId: integer,          // Links to job/project
  organizationId: integer,
  centerLatitude: decimal(10, 7),
  centerLongitude: decimal(10, 7),
  radius: integer,             // meters (default 100)
  address: text,
  isActive: boolean
}
\`\`\`

**\`job_site_events\`** - Arrival/departure events
\`\`\`typescript
{
  id: serial,
  userId: integer,             // Technician
  projectId: integer,
  geofenceId: integer,
  eventType: text,             // "arrival", "departure"
  eventTime: timestamp,
  latitude/longitude: decimal,
  durationMinutes: integer,    // For departure events
  notificationSent: boolean
}
\`\`\`

**\`onestep_sync_state\`** - Polling status tracking
\`\`\`typescript
{
  id: serial,
  organizationId: integer,
  vehicleId: integer (nullable),
  lastSyncTimestamp: timestamp,
  lastSuccessfulSync: timestamp,
  syncStatus: text,            // "idle", "syncing", "error"
  errorMessage: text,
  tripsImported: integer       // Cumulative count
}
\`\`\`

## Implementation Details

### Location: \`server/services/OneStepPoller.ts\`

### GPS Poller Lifecycle

**1. Initialization (Server Startup)**
\`\`\`typescript
const poller = new OneStepPoller();
await poller.start();

// Queries all orgs with GPS API keys configured
const orgsWithGPS = await db
  .select({ organizationId: settings.organizationId })
  .from(settings)
  .where(eq(settings.key, "oneStepGpsApiKey"));

// Start polling for each organization
for (const org of orgsWithGPS) {
  await poller.startPollingForOrganization(org.organizationId);
}
\`\`\`

**2. Per-Organization Polling**
\`\`\`typescript
async startPollingForOrganization(organizationId: number) {
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 10000; // 0-10 seconds
  const interval = 30000 + jitter;      // 30-40 seconds

  const pollInterval = setInterval(async () => {
    await this.pollOrganization(organizationId);
  }, interval);

  this.pollingIntervals.set(organizationId, pollInterval);
  
  // Poll immediately on startup
  await this.pollOrganization(organizationId);
}
\`\`\`

**3. Poll Execution with Locking**
\`\`\`typescript
private async pollOrganization(organizationId: number) {
  // Acquire lock (prevents duplicate polling if process restarted)
  const canPoll = await this.acquireLock(organizationId);
  if (!canPoll) return; // Another process is polling

  try {
    // Fetch API key from settings
    const apiKey = await getOneStepApiKey(organizationId);
    
    // Call OneStep GPS API
    const response = await fetch(
      \`https://track.onestepgps.com/v3/api/public/device-info?lat_lng=1&device_speed=1&direction=1&api-key=\${apiKey}\`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    const devices: OneStepDevice[] = await response.json();
    console.log(\`📡 OneStep API returned \${devices.length} devices\`);
    
    // Find vehicles with GPS enabled
    const mappedVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.oneStepGpsEnabled, true)
        )
      );
    
    // Store location pings
    for (const vehicle of mappedVehicles) {
      const device = devices.find(
        d => d.display_name === vehicle.oneStepGpsDeviceId
      );
      
      if (device && device.lat && device.lng) {
        await db.insert(obdLocationData).values({
          organizationId,
          vehicleId: vehicle.id,
          deviceId: device.display_name,
          latitude: device.lat.toString(),
          longitude: device.lng.toString(),
          speed: device.device_speed?.toString() ?? "0",
          heading: device.direction?.toString() ?? "0",
          timestamp: new Date(device.latest_accurate_dt_tracker || Date.now())
        }).onConflictDoNothing(); // Skip duplicates
      }
    }
    
    await this.releaseLock(organizationId, "idle");
    
  } catch (error) {
    await this.releaseLock(organizationId, "error", error.message);
  }
}
\`\`\`

### Location: \`server/integrations/onestep.ts\`

### Trip Sync from OneStep GPS

**Manual Trip Import**
\`\`\`typescript
class OneStepGPSService {
  async syncVehicleTrips(vehicleId: number, daysBack: number = 30): Promise<number> {
    // Verify vehicle is configured
    const vehicle = await db.select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    
    if (!vehicle[0].oneStepGpsDeviceId || !vehicle[0].oneStepGpsEnabled) {
      throw new Error("Vehicle not configured for OneStep GPS");
    }
    
    // Set date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Update sync state
    await this.updateSyncState(vehicleId, "syncing");
    
    try {
      // Fetch trips from OneStep API
      const trips = await this.fetchTrips(
        vehicle[0].oneStepGpsDeviceId,
        startDate,
        endDate
      );
      
      let imported = 0;
      
      // Import each trip if not already exists
      for (const trip of trips) {
        const existing = await db.select()
          .from(obdTrips)
          .where(
            and(
              eq(obdTrips.provider, "onestep"),
              eq(obdTrips.externalTripId, trip.id)
            )
          )
          .limit(1);
        
        if (!existing.length) {
          await db.insert(obdTrips).values(this.mapTrip(trip, vehicleId));
          imported++;
        }
      }
      
      await this.updateSyncState(vehicleId, "idle", imported);
      return imported;
      
    } catch (error) {
      await this.updateSyncState(vehicleId, "error", 0, error.message);
      throw error;
    }
  }
  
  async fetchTrips(deviceId: string, startDate: Date, endDate: Date) {
    try {
      const response = await this.client.get("/trips", {
        params: {
          device_id: deviceId,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          per_page: 200
        }
      });
      
      return response.data.data || [];
      
    } catch (error: any) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        await this.sleep(5000); // Wait 5 seconds
        return this.fetchTrips(deviceId, startDate, endDate); // Retry
      }
      throw error;
    }
  }
}
\`\`\`

### Location: \`server/utils/gps.ts\`

### Geofencing Calculations

**Haversine Distance Formula**
\`\`\`typescript
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}
\`\`\`

**Geofence Distance Calculation Example**

**Note**: This is example code showing HOW geofence arrival detection COULD be implemented using the available utilities. Automatic geofence detection is NOT currently implemented in server/routes.ts.

\`\`\`typescript
// Example: Manual geofence checking using haversineDistance()
const distance = haversineDistance(
  ping.latitude,
  ping.longitude,
  geofence.centerLatitude,
  geofence.centerLongitude
);

const radiusMiles = geofence.radius / 1609.34; // Convert meters to miles

if (distance <= radiusMiles) {
  // User is inside geofence radius
  console.log(\`Vehicle within \${distance} miles of job site\`);
  
  // Database schema supports storing arrival events:
  // - job_site_events table (eventType: "arrival" | "departure")
  // - jobSiteEvents can be manually inserted via API
  // - projects.arrivedAt field can be manually updated
}
\`\`\`

**Implementation Status**:
- ✅ Database tables exist (\`job_site_geofences\`, \`job_site_events\`)
- ✅ \`haversineDistance()\` utility function available
- ✅ Manual geofence CRUD via API
- ❌ Automatic background geofence checking NOT implemented
- ❌ Automatic arrival notifications NOT implemented
- ❌ Automatic \`arrivedAt\` updates NOT implemented

**Significant Movement Detection**
\`\`\`typescript
export function isSignificantMovement(
  distanceMiles: number,
  speedMph: number
): boolean {
  const MIN_DISTANCE_MILES = 0.093; // 150 meters
  const MIN_SPEED_MPH = 0.5;
  
  return distanceMiles >= MIN_DISTANCE_MILES && speedMph >= MIN_SPEED_MPH;
}
\`\`\`

## Data Flow

### Real-Time Tracking Flow (Current Implementation)

1. **OneStep Device** → GPS satellites → **OneStep Cloud**
2. **GPS Poller** (every 30-60s) → OneStep API (\`server/services/OneStepPoller.ts\`)
3. API returns device array with latest positions
4. **Poller** matches devices to vehicles in database
5. **Store** GPS ping in \`obd_location_data\` table
6. **Frontend** queries \`/api/gps/vehicles\` for vehicle locations
7. **Frontend** displays vehicle markers on Google Maps

**Not Currently Implemented**:
- Automatic trip building from GPS pings
- Automatic geofence checking on new pings
- Auto job start/complete based on geofence events
- Real-time WebSocket location broadcasting

### Trip Import Flow

1. Admin clicks "Sync Trips" for a vehicle
2. **Route**: \`POST /api/gps/vehicles/:id/sync-trips\`
3. **Service**: \`OneStepGPSService.syncVehicleTrips(vehicleId, daysBack)\`
4. Update \`onestep_sync_state\` to "syncing"
5. **API Call**: OneStep \`/v3/trips\` endpoint with date range
6. **Filter**: Check each trip against \`obd_trips\` table
7. **Import**: Insert new trips only (skip duplicates via UNIQUE constraint)
8. **Map Data**: Convert OneStep format to internal schema
9. Update \`onestep_sync_state\` to "idle" with import count
10. **Response**: Return number of trips imported

### Geofence Arrival Flow (Potential Implementation)

**Status**: Infrastructure exists but automatic checking is NOT implemented

**What EXISTS**:
- \`job_site_geofences\` table with radius and coordinates
- \`job_site_events\` table for storing arrival/departure records
- \`haversineDistance()\` utility for distance calculation
- \`projects.arrivedAt\` field for tracking technician arrival
- Manual API endpoints for geofence/event CRUD

**What Would Be NEEDED for Automatic Detection**:
1. Background service or route handler to check new GPS pings against geofences
2. Logic to detect first arrival (not re-trigger on every ping)
3. Notification creation on arrival detection
4. WebSocket broadcast for real-time updates
5. Optional: Auto job start/complete integration

**Manual Alternative**:
- Frontend can calculate distance client-side
- User manually marks arrival via "Start Job" button
- \`arrivedAt\` field updated on manual job start

## Design Decisions

### Why OneStep GPS Instead of Custom Hardware?
**Decision**: Integrate with OneStep GPS cellular OBD devices

**Pros**:
- No app draining phone battery
- More reliable than phone GPS (cellular + satellite)
- Works even if phone is off or dead
- Vehicle-based not user-based (any driver)
- OBD diagnostics (fuel level, engine temp, RPM)

**Cons**:
- Monthly cost per device ($15-25/month)
- Requires OBD port (2008+ vehicles)
- Dependency on third-party API

### Why Polling Instead of Webhooks?
**Decision**: Poll OneStep API every 30-60 seconds

**Pros**:
- OneStep doesn't offer webhooks
- Full control over update frequency
- Can batch process multiple devices
- Easier error handling and retry logic

**Cons**:
- Slight delay (max 60 seconds)
- More API calls than webhooks
- Must manage polling intervals

### Why Unique Constraint on (org, device, timestamp)?
**Decision**: Prevent duplicate GPS pings in database

**Prevents**:
- Duplicate inserts if polling overlaps
- Data bloat from identical pings
- Incorrect trip distance calculations

**Implementation**:
\`\`\`typescript
uniqueIndex("unique_location_ping").on(
  table.organizationId,
  table.deviceId,
  table.timestamp
)
\`\`\`

### Why Store Trips AND Individual Pings?
**Decision**: Keep both granular pings and aggregated trips

**Use Cases**:
- **Pings**: Real-time tracking, route replay, debugging
- **Trips**: Daily summary, mileage reports, fuel analysis

**Storage**: Pings can be archived after 30 days, trips kept forever

### Why Jittered Polling Intervals?
**Decision**: Add 0-10 second random jitter to 30-second interval

**Prevents**:
- Thundering herd on OneStep API
- All orgs polling at exact same time
- Rate limiting (429) responses

**Implementation**:
\`\`\`typescript
const jitter = Math.random() * 10000;
const interval = 30000 + jitter; // 30-40 seconds
\`\`\`

## Performance Considerations

### Database Indexes

**Critical Indexes**:
\`\`\`sql
-- Fast vehicle lookup for polling
CREATE INDEX idx_vehicles_org_gps ON vehicles(organization_id, onestep_gps_enabled)
  WHERE onestep_gps_enabled = true;

-- Fast ping queries by vehicle
CREATE INDEX idx_obd_location_vehicle_time ON obd_location_data(vehicle_id, timestamp DESC);

-- Fast trip queries
CREATE INDEX idx_obd_trips_vehicle_time ON obd_trips(vehicle_id, start_time DESC);

-- Fast geofence lookups
CREATE INDEX idx_geofences_project ON job_site_geofences(project_id) WHERE is_active = true;

-- Prevent duplicate arrival events
CREATE INDEX idx_job_site_events_lookup ON job_site_events(project_id, user_id, event_type, event_time);
\`\`\`

### API Rate Limiting

**OneStep GPS Limits**:
- 1000 requests per hour per API key
- 429 response if exceeded

**Mitigation**:
\`\`\`typescript
if (error.response?.status === 429) {
  await sleep(5000); // Wait 5 seconds
  return this.fetchTrips(deviceId, startDate, endDate); // Retry
}
\`\`\`

### Memory Efficiency

**Poller Service**:
- Streams data instead of loading all at once
- Releases lock after each poll
- Cleans up intervals on shutdown
- No caching (database is source of truth)

### Connection Pooling

**Issue**: Polling can exhaust connection pool

**Solution**: Use existing connection pool settings
\`\`\`typescript
// server/db.ts
pool: {
  max: 10,                  // Max connections
  idleTimeoutMillis: 15000, // Release idle connections
  connectionTimeoutMillis: 10000
}
\`\`\`

## Security Measures

### API Key Storage

**Secure Storage**:
\`\`\`typescript
// Stored in settings table, not environment variables
await db.insert(settings).values({
  organizationId,
  key: "oneStepGpsApiKey",
  value: encryptedApiKey, // Could be encrypted at rest
  category: "gps"
});
\`\`\`

### Multi-Tenant Isolation

**Organization Scoping**:
- API keys scoped per organization
- GPS pings scoped per organization
- Polling isolated per organization
- Prevents cross-tenant data leakage

**Enforcement**:
\`\`\`typescript
// Every query includes organization filter
await db.select()
  .from(obdLocationData)
  .where(eq(obdLocationData.organizationId, user.organizationId));
\`\`\`

### Geofence Privacy

**Access Control**:
- Only managers/admins can view GPS tracking
- Technicians can only see their own trips
- Geofences only visible to project stakeholders

### Locking Mechanism

**Prevents Race Conditions**:
\`\`\`typescript
private async acquireLock(organizationId: number): Promise<boolean> {
  const existing = await db.select()
    .from(onestepSyncState)
    .where(eq(onestepSyncState.organizationId, organizationId))
    .limit(1);
  
  // If currently syncing and lock hasn't expired, don't poll
  if (existing[0].syncStatus === "syncing" && !isLockExpired(existing[0])) {
    return false;
  }
  
  // Acquire lock
  await db.update(onestepSyncState)
    .set({ syncStatus: "syncing", updatedAt: new Date() })
    .where(eq(onestepSyncState.id, existing[0].id));
  
  return true;
}
\`\`\`

**Lock Timeout**: Hard-coded 2-minute timeout in OneStepPoller.ts (line 171)
\`\`\`typescript
const lockTimeout = 2 * 60 * 1000; // 120,000ms = 2 minutes
\`\`\`

## Common Issues & Troubleshooting

### No GPS Data Showing

**Cause 1**: OneStep API key not configured
**Solution**:
\`\`\`sql
SELECT * FROM settings 
WHERE key = 'oneStepGpsApiKey' 
AND organization_id = YOUR_ORG_ID;
\`\`\`
Add key via Settings > GPS Tracking > Configure API

**Cause 2**: Vehicle not mapped to device
**Solution**: Verify vehicle has \`oneStepGpsDeviceId\` and \`oneStepGpsEnabled = true\`

**Cause 3**: Device ID mismatch
**Solution**: Device ID must exactly match OneStep \`display_name\` field

### Duplicate GPS Pings

**Cause**: Unique constraint violation
**Solution**: \`.onConflictDoNothing()\` handles this automatically
\`\`\`typescript
await db.insert(obdLocationData)
  .values(ping)
  .onConflictDoNothing(); // Silently skip duplicates
\`\`\`

### Trips Not Importing

**Cause 1**: Duplicate external trip ID
**Check**:
\`\`\`sql
SELECT COUNT(*), external_trip_id 
FROM obd_trips 
WHERE provider = 'onestep'
GROUP BY external_trip_id
HAVING COUNT(*) > 1;
\`\`\`

**Cause 2**: Rate limiting (429 response)
**Solution**: Automatic retry with 5-second delay

**Cause 3**: Invalid date range
**Solution**: Ensure \`startDate < endDate\` and not too far in past (OneStep limits)

### Geofence Not Triggering

**Cause 1**: Radius too small
**Solution**: Increase geofence radius (default 100m, try 200-300m)

**Cause 2**: GPS accuracy low
**Check**: \`accuracy\` field in \`obd_location_data\` (should be < 50 meters)

**Cause 3**: Geofence inactive
**Solution**: Check \`is_active = true\` in \`job_site_geofences\`

**Debugging**:
\`\`\`typescript
const distance = haversineDistance(
  ping.latitude, ping.longitude,
  geofence.centerLatitude, geofence.centerLongitude
);
console.log(\`Distance: \${distance} miles, Radius: \${geofence.radius / 1609.34} miles\`);
\`\`\`

### Polling Stopped

**Cause**: Server restart or crash
**Solution**: Poller auto-starts on server boot
**Check**:
\`\`\`sql
SELECT * FROM onestep_sync_state 
WHERE sync_status = 'error'
OR (updated_at < NOW() - INTERVAL '5 minutes' AND sync_status = 'syncing');
\`\`\`

**Manual Restart**: Restart Node server (poller initializes automatically)

### High API Usage

**Cause**: Too many organizations or short polling intervals
**Solution**:
- Review polling intervals (30-60s is optimal)
- Disable GPS for inactive vehicles
- Archive old GPS pings (reduce query time)

**Monitor**:
\`\`\`sql
SELECT 
  organization_id,
  COUNT(*) as ping_count,
  MAX(timestamp) as last_ping
FROM obd_location_data
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY organization_id;
\`\`\`

## Best Practices

1. **Geofence Sizing**: Start with 100m radius, increase if missed arrivals
2. **Data Retention**: Archive GPS pings older than 30 days, keep trips forever
3. **Error Monitoring**: Check \`onestep_sync_state.errorMessage\` regularly
4. **API Key Rotation**: Rotate OneStep API keys quarterly
5. **Vehicle Mapping**: Ensure every vehicle has correct device ID
6. **Polling Efficiency**: Don't poll more than once per 30 seconds
7. **Index Maintenance**: Rebuild GPS indexes monthly for large datasets
8. **Trip Validation**: Validate trip distances/durations for anomalies`,
        tags: ['technical', 'gps', 'tracking', 'onestep', 'geofencing', 'trips', 'obd', 'real-time']
      },
      {
        id: 'configurable-caching-system',
        title: 'Configurable Caching System',
        description: 'Database-driven cache configuration with dynamic TTL and multi-tenant support',
        type: 'documentation',
        difficulty: 'advanced',
        estimatedTime: 15,
        content: `# Configurable Caching System

## Overview

Pro Field Manager implements a **database-driven configurable caching system** that allows per-organization cache settings with dynamic TTL (Time-To-Live), enable/disable flags, and automatic cache invalidation. This system replaced the static \`memoizee\` library to provide administrators with runtime control over caching behavior without code changes or server restarts.

### Key Features
- **Database-Driven Configuration**: Cache settings stored in \`cache_settings\` table
- **Global & Per-Organization Settings**: Global defaults with per-org overrides
- **Dynamic TTL**: Configurable cache expiration (5s - 5min)
- **Enable/Disable Flags**: Turn caching on/off per query type
- **Multi-Tenant Isolation**: Cache keys scoped by organizationId
- **Automatic Invalidation**: Cache cleared on create/read operations
- **Lazy Loading**: Cache config loaded on-demand and memoized
- **Periodic Cleanup**: Expired entries removed every 60 seconds

### Why This Approach?
**Before**: Static \`memoizee\` with hardcoded 30s TTL
**After**: Dynamic database-driven configuration with admin control

**Benefits**:
- Admins can tune cache performance without developer help
- Different organizations can have different cache strategies
- Can disable caching for debugging or testing
- No code deployment required to change cache behavior

## System Architecture

### Components

**1. Cache Configuration Service** (\`server/cache/CacheConfigService.ts\`)
- Loads global defaults from \`cache_settings\` where \`organization_id IS NULL\`
- Loads per-org overrides from \`cache_settings\` where \`organization_id = X\`
- Caches loaded configs in-memory Map for fast access
- Provides \`getConfig(orgId)\`, \`reloadConfig(orgId)\`, \`clearConfig()\`

**2. Query Cache** (\`server/cache/queryCache.ts\`)
- Simple Map-based cache with TTL expiration
- \`get(key, ttl)\` - retrieve with TTL check
- \`set(key, value, ttl)\` - store with expiration time
- \`delete(key)\` - manual invalidation
- \`deleteByPrefix(prefix)\` - batch invalidation
- \`cleanup()\` - remove expired entries

**3. Cached Query Functions**
- \`getCachedNotificationUnreadCount(userId, orgId)\`
- \`getCachedInternalMessages(userId, storage, orgId)\`
- Check if caching enabled for org
- Return cached value if fresh
- Query database if cache miss
- Store result with configured TTL

**4. Cache Invalidation Helpers**
- \`invalidateNotificationCache(userId, orgId)\` - after notification mutations
- \`invalidateMessageCache(userId, orgId)\` - after message mutations
- \`clearOrganizationCaches(orgId)\` - when settings change
- \`clearAllQueryCaches()\` - for debugging/testing

## Database Schema

### \`cache_settings\` Table

\`\`\`typescript
{
  id: serial,
  organizationId: integer (nullable), // NULL = global default
  
  // Cache TTL (milliseconds)
  // Constraints: min 5000ms (5s), max 300000ms (5min)
  notificationCacheTtl: integer, default 30000,  // 30s
  messageCacheTtl: integer, default 30000,       // 30s
  
  // Polling frequency (milliseconds)
  // Constraints: min 5000ms (5s), max 120000ms (2min)
  sidebarPollingInterval: integer, default 30000, // 30s
  
  // Enable/disable flags
  notificationCacheEnabled: boolean, default true,
  messageCacheEnabled: boolean, default true,
  
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // Unique constraint: one row per organization + one global row
  UNIQUE (organizationId)
}
\`\`\`

### Configuration Priority

**Hierarchy**: Organization Settings → Global Defaults → Hardcoded Fallback

\`\`\`sql
-- This query implements the cascading config logic
SELECT 
  COALESCE(org.notification_cache_ttl, global.notification_cache_ttl, 30000) as notification_cache_ttl,
  COALESCE(org.message_cache_ttl, global.message_cache_ttl, 30000) as message_cache_ttl
FROM (SELECT * FROM cache_settings WHERE organization_id IS NULL) as global
FULL OUTER JOIN (SELECT * FROM cache_settings WHERE organization_id = ?) as org
ON true
\`\`\`

## Implementation Details

### Location: \`server/cache/CacheConfigService.ts\`

### Configuration Loading

**Lazy Initialization**
\`\`\`typescript
class CacheConfigService {
  private config: Map<number, CacheConfig> = new Map();
  private globalDefaults: CacheConfig = {
    notificationCacheTtl: 30000,
    messageCacheTtl: 30000,
    sidebarPollingInterval: 30000,
    notificationCacheEnabled: true,
    messageCacheEnabled: true,
  };
  
  async getConfig(organizationId: number): Promise<CacheConfig> {
    // Lazy load if not cached
    if (!this.config.has(organizationId)) {
      return await this.loadConfig(organizationId);
    }
    return this.config.get(organizationId)!;
  }
}
\`\`\`

**Load Global Defaults Once**
\`\`\`typescript
async loadGlobalDefaults(): Promise<void> {
  const result = await db.execute(sql\`
    SELECT notification_cache_ttl, message_cache_ttl, ...
    FROM cache_settings
    WHERE organization_id IS NULL
    LIMIT 1
  \`);
  
  if (result[0]) {
    this.globalDefaults = { ...result[0] };
    console.log('📝 Loaded global cache defaults:', this.globalDefaults);
  }
}
\`\`\`

**Load Per-Organization Config**
\`\`\`typescript
async loadConfig(organizationId: number): Promise<CacheConfig> {
  const result = await db.execute(sql\`
    SELECT 
      COALESCE(org_settings.notification_cache_ttl, global_settings.notification_cache_ttl, 30000) as notification_cache_ttl,
      COALESCE(org_settings.message_cache_ttl, global_settings.message_cache_ttl, 30000) as message_cache_ttl,
      COALESCE(org_settings.notification_cache_enabled, global_settings.notification_cache_enabled, true) as notification_cache_enabled
    FROM (
      SELECT * FROM cache_settings WHERE organization_id IS NULL LIMIT 1
    ) as global_settings
    FULL OUTER JOIN (
      SELECT * FROM cache_settings WHERE organization_id = \${organizationId}
    ) as org_settings
    ON true
    LIMIT 1
  \`);
  
  const config = {
    notificationCacheTtl: result[0]?.notification_cache_ttl || this.globalDefaults.notificationCacheTtl,
    messageCacheTtl: result[0]?.message_cache_ttl || this.globalDefaults.messageCacheTtl,
    notificationCacheEnabled: result[0]?.notification_cache_enabled ?? this.globalDefaults.notificationCacheEnabled,
    // ... other fields
  };
  
  this.config.set(organizationId, config);
  return config;
}
\`\`\`

**Manual Reload on Settings Change**

**Important**: Cache config does NOT automatically reload when database settings change. You must manually call \`reloadConfig()\` after updating \`cache_settings\` table.

\`\`\`typescript
// After updating cache settings in database
await db.update(cacheSettings)
  .set({ notificationCacheTtl: 60000 })
  .where(eq(cacheSettings.organizationId, orgId));

// REQUIRED: Manually reload config to pick up changes
await cacheConfigService.reloadConfig(orgId);
\`\`\`

**No automatic propagation**: There is no database trigger or listener that automatically refreshes the in-memory config cache. Admins must explicitly call the reload endpoint after changing settings.

### Location: \`server/cache/queryCache.ts\`

### Query Cache Implementation

**Simple Map with TTL**
\`\`\`typescript
interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp (ms)
}

class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  get(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl // Current time + TTL
    });
  }
}
\`\`\`

**Cached Notification Query**
\`\`\`typescript
const notificationCache = new QueryCache<number>();

export const getCachedNotificationUnreadCount = async (
  userId: number,
  organizationId: number
): Promise<number> => {
  // Load cache config for this org
  const config = await cacheConfigService.getConfig(organizationId);
  
  // If caching disabled, bypass cache entirely
  if (!config.notificationCacheEnabled) {
    return await NotificationService.getUnreadCount(userId, organizationId);
  }

  // Try cache first
  const cacheKey = \`notification:\${userId}:\${organizationId}\`;
  const cached = notificationCache.get(cacheKey, config.notificationCacheTtl);

  if (cached !== null) {
    return cached; // Cache hit!
  }

  // Cache miss - query database
  const result = await NotificationService.getUnreadCount(userId, organizationId);
  
  // Store in cache with org-specific TTL
  notificationCache.set(cacheKey, result, config.notificationCacheTtl);
  
  return result;
};
\`\`\`

**Cache Invalidation**
\`\`\`typescript
export const invalidateNotificationUnreadCount = (
  userId: number,
  organizationId: number
) => {
  const cacheKey = \`notification:\${userId}:\${organizationId}\`;
  notificationCache.delete(cacheKey);
  console.log(\`🗑️  Invalidated notification cache for user \${userId}:\${organizationId}\`);
};

// Called after any notification mutation
await NotificationService.markAsRead(notificationId);
invalidateNotificationCache(userId, organizationId); // Clear cache
\`\`\`

**Periodic Cleanup**
\`\`\`typescript
// Remove expired entries every 60 seconds
setInterval(() => {
  notificationCache.cleanup();
  messagesCache.cleanup();
}, 60000);

cleanup(): void {
  const now = Date.now();
  const entriesToDelete = Array.from(this.cache.entries())
    .filter(([_, entry]) => now > entry.expiresAt);
  
  for (const [key] of entriesToDelete) {
    this.cache.delete(key);
  }
}
\`\`\`

## Data Flow

### Cache Configuration Flow

1. **Server Startup**: \`CacheConfigService\` initialized (config Map empty)
2. **First API Request**: User from Org 2 requests notification count
3. **Config Load**: \`getConfig(2)\` called → cache miss
4. **Database Query**: Query \`cache_settings\` with \`COALESCE\` logic
5. **Merge Config**: Combine org-specific + global + hardcoded defaults
6. **Cache Config**: Store in Map: \`config.set(2, {...})\`
7. **Return Config**: Config object with TTLs and flags
8. **Subsequent Requests**: \`getConfig(2)\` returns cached Map entry

### Cached Query Flow

1. **API Request**: \`GET /api/notifications/unread-count\`
2. **Route Handler**: Calls \`getCachedNotificationUnreadCount(userId, orgId)\`
3. **Load Config**: \`cacheConfigService.getConfig(orgId)\`
4. **Check Enabled**: If \`notificationCacheEnabled === false\`, bypass cache
5. **Build Cache Key**: \`notification:\${userId}:\${orgId}\`
6. **Check Cache**: \`notificationCache.get(key, ttl)\`
7. **Cache Hit**: Return cached value immediately
8. **Cache Miss**: Query \`NotificationService.getUnreadCount()\`
9. **Store Result**: \`notificationCache.set(key, result, ttl)\`
10. **Return**: Respond with count

### Cache Invalidation Flow

1. **Mutation**: User marks notification as read
2. **Route Handler**: \`POST /api/notifications/:id/read\`
3. **Database Update**: Update \`notifications\` set \`is_read = true\`
4. **Invalidate Cache**: \`invalidateNotificationCache(userId, orgId)\`
5. **Delete Cache Entry**: \`notificationCache.delete(\`notification:\${userId}:\${orgId}\`)\`
6. **Next Request**: Cache miss → fresh count from database

## Design Decisions

### Why Database-Driven Instead of Environment Variables?
**Decision**: Store cache config in database, not \`.env\` files

**Pros**:
- Admins can change settings via UI without code deployment
- Different orgs can have different cache strategies
- Changes take effect immediately (no server restart)
- Can be changed per-organization dynamically

**Cons**:
- Extra database query to load config (mitigated by in-memory caching)
- More complex than static config

### Why Not Redis?
**Decision**: Use in-memory Map instead of Redis

**Pros**:
- No external dependency (one less service to manage)
- Simpler deployment (works on Replit out-of-box)
- Lower latency (no network hop)
- Sufficient for this scale (10-100 orgs)

**Cons**:
- Lost on server restart (acceptable - rebuilds quickly)
- Not shared across multiple server instances (acceptable - single instance)

### Why Lazy Config Loading?
**Decision**: Load config on-demand, not at startup

**Pros**:
- Faster server startup (don't load all orgs)
- Only loads configs for active organizations
- Automatic cache population as users log in

**Cons**:
- First request per org slightly slower
- Need to handle null/missing configs

### Why Two-Level Caching (Config + Query)?
**Decision**: Cache both config settings AND query results

**Config Cache**: In-memory Map of organization cache settings
**Query Cache**: In-memory Map of actual query results (notification counts, messages)

**Why Both**:
- Config changes rarely (minutes/hours)
- Query results change frequently (seconds)
- Don't want to re-query database for config on every request
- Don't want to re-query database for data on every request within TTL

## Performance Considerations

### Cache Hit Rate

**Goal**: >80% cache hit rate for notification/message queries

**Monitoring**:
\`\`\`typescript
let hits = 0;
let misses = 0;

get(key: string, ttl: number): T | null {
  const entry = this.cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    misses++;
    return null;
  }
  hits++;
  return entry.value;
}

// Log hit rate every 1000 requests
if ((hits + misses) % 1000 === 0) {
  console.log(\`Cache hit rate: \${(hits / (hits + misses) * 100).toFixed(2)}%\`);
}
\`\`\`

### Memory Usage

**Estimate Per Cache Entry**:
- Key: ~50 bytes (\`notification:123:456\`)
- Value: ~8 bytes (integer count) or ~1KB (message array)
- Metadata: ~16 bytes (expiresAt timestamp)
- **Total**: ~80 bytes per notification cache entry, ~1KB per message cache entry

**For 100 organizations × 10 users × 2 cache types**:
- Notification cache: 2,000 entries × 80 bytes = 160 KB
- Message cache: 2,000 entries × 1 KB = 2 MB
- **Total**: ~2.2 MB (negligible)

### Database Load Reduction

**Before Caching**:
- 10 users polling every 30s = 10 req/30s = 0.33 req/s
- Per-org query load: 0.33 req/s × 2 queries = 0.66 req/s
- 100 orgs: 66 req/s

**After Caching (30s TTL)**:
- Cache hit rate 95% (only 5% hit database)
- Effective load: 66 req/s × 0.05 = **3.3 req/s**
- **95% reduction in database queries**

### Cleanup Performance

**Issue**: Cleanup iterates entire Map
**Solution**: Only run every 60 seconds
**Impact**: Minimal (Map iteration is O(n), n = ~2000 entries = <1ms)

## Security Measures

### Multi-Tenant Isolation

**Cache Key Scoping**:
\`\`\`typescript
const cacheKey = \`notification:\${userId}:\${organizationId}\`;
//                                      ^^^^^^^^^^^^^^^^^
//                                      REQUIRED for isolation
\`\`\`

**Prevents**:
- User from Org A seeing cached data from Org B
- Cross-tenant information disclosure

**Enforcement**: All cache keys MUST include \`organizationId\`

### Configuration Access Control

**Who Can Change Settings**:
- Global defaults: Super admins only
- Org-specific: Organization admins only

**Route Protection**:
\`\`\`typescript
router.put('/api/cache-settings', requireAdmin, async (req, res) => {
  // Only admins can modify cache settings
});
\`\`\`

### TTL Limits

**Enforce Min/Max TTL**:
\`\`\`sql
-- Database CHECK constraints
ALTER TABLE cache_settings
ADD CONSTRAINT notification_cache_ttl_range 
CHECK (notification_cache_ttl >= 5000 AND notification_cache_ttl <= 300000);

-- 5 seconds min (too low → database overload)
-- 5 minutes max (too high → stale data)
\`\`\`

## Common Issues & Troubleshooting

### Stale Cache Data

**Cause**: Cache not invalidated after mutation
**Solution**: Always call invalidation function after database writes

\`\`\`typescript
// BAD - no invalidation
await NotificationService.markAsRead(notificationId);

// GOOD - invalidate cache
await NotificationService.markAsRead(notificationId);
invalidateNotificationCache(userId, organizationId);
\`\`\`

### Config Not Updating

**Cause**: Config cached in-memory, DB changes not reflected
**Solution**: Call \`reloadConfig()\` after changing settings

\`\`\`typescript
await db.update(cacheSettings)
  .set({ notificationCacheTtl: 60000 })
  .where(eq(cacheSettings.organizationId, orgId));

// MUST reload config to pick up changes
await cacheConfigService.reloadConfig(orgId);
\`\`\`

### Cache Not Working

**Debugging Steps**:
1. Check if caching enabled: \`SELECT * FROM cache_settings WHERE organization_id = X\`
2. Verify cache key format: Must include \`userId:organizationId\`
3. Check TTL: Ensure not expired immediately
4. Log cache hits/misses: Add console.log in get()

\`\`\`typescript
const cached = notificationCache.get(cacheKey, config.notificationCacheTtl);
console.log(\`Cache lookup: key=\${cacheKey}, hit=\${cached !== null}\`);
\`\`\`

### Memory Leak

**Cause**: Cache never cleared, grows indefinitely
**Solution**: Periodic cleanup + TTL expiration

\`\`\`typescript
// Automatic cleanup every 60s
setInterval(() => {
  notificationCache.cleanup();
  messagesCache.cleanup();
}, 60000);
\`\`\`

**Manual Cleanup**:
\`\`\`typescript
// Clear all caches
clearAllQueryCaches();

// Clear specific org
clearOrganizationCaches(orgId);
\`\`\`

## Best Practices

1. **Always Invalidate After Mutations**: Don't forget to clear cache after database writes
2. **Use Organization-Scoped Keys**: Include \`organizationId\` in every cache key
3. **Set Reasonable TTLs**: 30s is good default, 5s min, 5min max
4. **Monitor Hit Rates**: Track cache effectiveness over time
5. **Test with Caching Disabled**: Use disable flags to verify data correctness
6. **Reload Config After Changes**: Call \`reloadConfig()\` when updating settings
7. **Clean Up Regularly**: Run periodic cleanup to prevent memory bloat
8. **Log Cache Activity**: Log hits/misses/invalidations for debugging`,
        tags: ['technical', 'caching', 'performance', 'configuration', 'multi-tenant', 'ttl']
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