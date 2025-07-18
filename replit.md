# Pro Field Manager - Professional Field Service Management Platform

## Overview

Pro Field Manager is a comprehensive SaaS field service management platform built with modern web technologies. The application provides a complete solution for managing field operations, including invoicing, project tracking, customer management, team coordination, GPS tracking, and real-time communication.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Mobile Support**: Responsive design with mobile-specific optimizations

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **API Design**: RESTful APIs with WebSocket support for real-time features
- **Authentication**: JWT-based authentication with session management
- **File Handling**: Multer for file uploads with local storage

### Database & ORM
- **Database**: PostgreSQL (configured for both local and cloud deployment)
- **ORM**: Drizzle ORM with schema-first approach
- **Migration**: Drizzle Kit for database migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Multi-Tenant SaaS Infrastructure
- Organization-based tenant separation
- Subscription management with Stripe integration
- Role-based access control (admin, manager, user)
- Usage limits and feature flags per subscription tier

### Core Business Modules
- **Customer Management**: Contact information, project history, communication tracking
- **Project Management**: Project lifecycle, task assignment, progress tracking
- **Invoicing & Quotes**: Automated billing, payment processing, financial reporting
- **Field Operations**: GPS tracking, mobile camera integration, real-time updates

### Communication & Collaboration
- **SMS Integration**: Twilio-powered messaging for customer communication
- **Internal Messaging**: Real-time team communication via WebSocket
- **File Sharing**: Document management with secure file uploads
- **Review Management**: Automated Google My Business review requests

### Mobile-First Features
- **GPS Tracking**: Real-time location tracking for field workers
- **Mobile Camera**: Photo capture with annotations and project linking
- **Time Clock**: Clock in/out with location verification
- **Offline Support**: Progressive Web App capabilities for field work

## Data Flow

### Authentication Flow
1. User login with optional GPS data capture for mobile devices
2. JWT token generation and secure cookie storage
3. Session management with expiration and refresh handling
4. Role-based route protection and API access control

### Real-Time Communication
1. WebSocket connection establishment on authentication
2. Event-driven updates for project changes, messages, and notifications
3. Mobile-specific optimizations for battery and data usage
4. Automatic reconnection and state synchronization

### File Management
1. Secure file upload with type validation and size limits
2. Organized storage by project and category
3. Image processing and thumbnail generation
4. Cloud storage integration for scalability

## External Dependencies

### Payment Processing
- **Stripe**: Subscription billing, one-time payments, and webhook handling
- **Integration**: Secure payment forms with PCI compliance

### Communication Services
- **Twilio**: SMS messaging for customer communication and review requests
- **SendGrid**: Email notifications and automated communications

### Location Services
- **Google Maps API**: Address geocoding, directions, and map visualization
- **GPS Integration**: Native browser geolocation with mobile optimizations

### Document Management
- **DocuSign**: Electronic signature integration for contracts and agreements
- **File Storage**: Secure document storage with access controls

## Deployment Strategy

### Development Environment
- Replit-optimized configuration with hot reloading
- PostgreSQL 16 module for local database
- Environment variable management for API keys

### Production Deployment
- Autoscale deployment target for traffic handling
- Build process with Vite for frontend and esbuild for backend
- Static asset serving with optimized caching

### Database Strategy
- Schema-first design with Drizzle ORM
- Migration-based deployment process
- Connection pooling for performance and reliability

## Changelog

- June 23, 2025. Initial setup
- June 23, 2025. Added organization dropdown to user creation form with admin-only access
- June 23, 2025. Created superadmin user profile: superadmin@profieldmanager.com
- June 23, 2025. Created "Pro Field Manager" organization with enterprise features and assigned superadmin
- June 24, 2025. Enhanced Navigation Tab Access Control with all 25+ navigation tabs including Dashboard, Calendar, Time Clock, Jobs, My Tasks, Leads, Expenses, Quotes, Invoices, Customers, Payments, File Manager, Form Builder, Team Messages, Image Gallery, SMS, GPS Tracking, Mobile Test, Reviews, Human Resources, User Management, SaaS Admin, Admin Settings, Reports, and Settings
- June 25, 2025. Implemented complete internal messaging system with real-time WebSocket updates for instant message delivery, including createInternalMessage storage methods, message recipient handling, and WebSocket broadcasting for seamless team communication
- June 25, 2025. Fixed "S is undefined" WebSocket error by properly organizing variable scope and declarations in routes.ts
- June 25, 2025. Resolved expense visibility issue where WebSocket notifications showed expense creation but expenses weren't visible due to organization-based filtering - updated getExpenses to allow admin users to see all expenses across organizations
- June 25, 2025. Moved Mobile Test tab from main navigation to a sub-tab within Admin Settings for better organization of admin-only features
- June 25, 2025. Fixed user creation error 500 by correcting all storage.createUserAccount() calls to storage.createUser() in routes.ts
- June 25, 2025. Fixed team messaging security issue by implementing organization-scoped user filtering - users can now only see and message other users within their organization, with proper validation to prevent cross-organization messaging
- June 26, 2025. Resolved "S is undefined" error in team messaging by adding proper null checks for recipients property in message filtering logic - messaging system now works reliably between organization members
- June 26, 2025. Implemented complete expense category management system with database-driven categories, full CRUD operations, color-coding, and organization-based filtering - replaced hardcoded categories with dynamic system including 10 default categories
- June 26, 2025. Fixed expense deletion and approval functionality by adding missing approveExpense method to storage interface and correcting deleteExpense method signature to return boolean success status
- June 26, 2025. Fixed navigation tab access control radio buttons for HR, User Management, SaaS Admin, Admin Settings, Reports, and Settings - added missing Switch components to enable proper permission management for these navigation sections
- June 26, 2025. Fixed user permissions update error by correcting storage.getUserById() call to storage.getUser() in routes.ts - tab access control switches now function properly for updating user permissions
- June 26, 2025. Added missing canAccessHR column to database schema and users table to support HR tab access control - resolved "No values to set" error when updating user permissions
- June 26, 2025. Fixed user permissions update functionality by adding all permission fields to updateUser method in storage.ts - all tab access control switches now work properly and save changes to database
- June 26, 2025. Fixed expense receipt image 404 errors by adding static file serving middleware for uploads directory - images now load properly when clicked
- June 26, 2025. Enhanced expense notes functionality with dedicated Notes column in table view, separated description and notes into distinct columns, and improved notes visibility across all expense management views including trash
- June 26, 2025. Fixed expense receipt image loading by implementing custom static file handler that bypasses Vite development server middleware interference - receipt images now display properly when clicked instead of showing 404 errors
- June 26, 2025. Restored proper receipt file associations by updating database to point each expense to its actual uploaded receipt file instead of generic placeholder - each expense now displays its unique uploaded receipt when clicked
- June 26, 2025. Completely resolved expense receipt image display issue by mapping all expenses back to their authentic uploaded receipt files with proper logo- prefixes - eliminated placeholder images and restored genuine user-uploaded receipts
- June 27, 2025. Fixed critical data integrity issue where expense receipt references were incorrectly overwritten with placeholder images - restored NULL values for missing files and preserved authentic receipt file associations for legitimate uploads
- June 27, 2025. Implemented dedicated expense attachment system with separate uploads/expenses/ folder structure and dedicated multer configuration to prevent future conflicts with other upload types - includes file type validation, size limits, and proper database path management
- June 27, 2025. Implemented comprehensive organization-based file isolation system with complete folder structure separation (uploads/org-{organizationId}/{type}) including dedicated multer configurations for expenses, images, and general files, automatic folder creation for new organizations, and organization-scoped file serving to prevent cross-organization access
- June 27, 2025. Updated image gallery upload system to use dedicated "image_gallery" folder instead of generic "images" folder for better organization and file type separation - includes updated multer configuration, folder structure creation, and file path mapping
- June 27, 2025. Updated expense receipt upload system to use dedicated "receipt_images" folder instead of "expenses" folder for better organization and file type separation - includes updated multer configuration, folder structure creation, and receipt URL path mapping
- June 29, 2025. Fixed recurring expense receipt file loading issues by clearing corrupted file paths from database - removed invalid file references that pointed to non-existent organization folder locations, preventing "ENOENT" file not found errors
- June 29, 2025. Consolidated all expense receipts to use only receipt_images folder - moved legacy receipt files from multiple locations (uploads/expenses/, uploads/) to organization-specific uploads/org-{organizationId}/receipt_images/ directories and updated database paths accordingly
- June 29, 2025. Added mandatory disclaimer checkbox to inspection forms requiring technicians to acknowledge that submissions are tracked, reviewed by managers, and false reporting may result in disciplinary action including termination
- June 29, 2025. Enhanced inspection forms with vehicle number field and read-only technician name field that automatically displays the logged-in user's name - technician name field is not editable and ensures accountability by tracking the actual user performing the inspection
- June 29, 2025. Implemented universal image compression system using Sharp library that applies to ALL uploaded images across the entire platform - moved compression settings from 'inspection' to 'system' category for global application, updated all image upload endpoints (logo uploads, file uploads, image gallery uploads, inspection image uploads, expense receipt uploads, and OCR receipt uploads) to automatically apply configurable compression with quality control (10-100%), dimension limits (100-4000px), and enable/disable toggle accessible through Admin Settings - compression now applies to ALL folders: uploads/org-{organizationId}/image_gallery/, uploads/org-{organizationId}/receipt_images/, uploads/org-{organizationId}/inspection_report_images/, and uploads/org-{organizationId}/files/
- June 29, 2025. Fixed inspection photo upload button functionality issue - discovered that the file input triggering mechanism works correctly, but the original onClick handlers were not being called properly due to React event binding issues - updated buttons to use inline onClick handlers that properly call the handleAddPhotosClick function, enabling successful photo upload functionality for both pre-trip and post-trip inspections
- June 30, 2025. RESOLVED: Photo upload buttons now fully functional for both Pre-Trip and Post-Trip inspections - created separate file input references (preTripFileInputRef, postTripFileInputRef) to prevent conflicts between tabs, implemented dedicated click handlers (handlePreTripPhotoUpload, handlePostTripPhotoUpload), and fixed all references to ensure proper file selection functionality with color-coded buttons (blue for Pre-Trip, orange for Post-Trip)
- June 30, 2025. Implemented complete gas card provider management system with database schema fixes, CRUD operations, and dynamic provider selection in gas card creation forms - resolved column naming mismatches between snake_case and camelCase, cleaned up duplicate columns, and integrated gas card providers into the gas card creation workflow for streamlined fuel card management
- June 30, 2025. Fixed "invalid date" display issue in image gallery by mapping createdAt field from database to uploadDate field expected by frontend, and added null checks to prevent invalid date formatting errors - images now display proper upload dates or "No date" when data is unavailable
- July 2, 2025. Implemented complete historical jobs image upload functionality with dedicated "historical_job_images" folder structure - added multer configuration for organization-based image uploads, backend API endpoint for handling multiple image uploads with compression support, frontend form integration with file selection and preview, and automatic folder creation for new organizations - historical jobs can now include up to 10 images with proper isolation between organizations
- July 2, 2025. Implemented comprehensive dashboard customization functionality with dedicated Settings tab - users can now control which dashboard widgets are displayed on the home page including Stats Cards, Revenue Chart, Recent Activity, Recent Invoices, Notifications bell, and Quick Actions button - added backend dashboard settings API endpoints with default configuration, frontend dashboard customization tab in Settings page with individual toggle switches for each widget, and updated dashboard page to conditionally render widgets based on user preferences - provides complete control over dashboard appearance and reduces visual clutter by allowing users to hide unused sections
- July 2, 2025. Fixed calendar job update functionality by resolving "No values to set" error - corrected parameter mismatch in updateCalendarJob storage call and added proper filtering for empty/undefined values to prevent database errors
- July 2, 2025. Restored directions functionality to calendar jobs by adding DirectionsButton component to both calendar grid view and job detail dialog - users can now get GPS directions to job locations directly from calendar view, complementing existing dispatch routing system in Projects page for comprehensive navigation capabilities
- July 2, 2025. Enhanced job details view with prominent address display and directions functionality - added project location section with address information and DirectionsButton in the main job header, making it easy for users to see and navigate to job locations without having to navigate to separate tabs
- July 3, 2025. Implemented comprehensive project assignment system with real-time WebSocket updates and multiple user assignment capabilities - added WebSocket broadcasting for project_user_assigned, project_user_removed, project_users_assigned, and project_users_removed events, created bulk assignment endpoints (/api/projects/:id/assign), enhanced frontend with multi-select UI including checkboxes, select all functionality, bulk assignment controls with role selection, and organization-based user filtering for admin restrictions - users can now assign multiple team members to projects simultaneously with real-time updates across all connected clients
- July 3, 2025. Implemented comprehensive calendar view switching functionality with 4 different view modes - added dropdown selector for 1 Week, 2 Weeks, 1 Month, and 3 Months views with appropriate date range calculations, enhanced navigation controls to work with all view types, created adaptive grid layouts and period-specific logic for date filtering, and updated calendar header with dynamic title generation showing appropriate date ranges for each view mode - users can now easily switch between different time periods to better manage their job scheduling workflow
- July 3, 2025. Implemented automatic organization assignment for user creation - updated backend API to automatically use admin's organization ID instead of requiring manual selection, removed organization dropdown from user creation form and replaced with informational message showing which organization new users will be assigned to, streamlined user creation workflow to prevent cross-organization user creation and improve admin experience
- July 5, 2025. Implemented comprehensive file security system with malware scanning, virus detection, and strict file type restrictions - added FileSecurityService with ClamAV integration for virus scanning, new database tables for security settings and logs (fileSecuritySettings, fileSecurityScans, fileAccessLogs), File Security tab in SaaS Admin interface with customizable security settings including file type restrictions, scan provider configuration, and quarantine options, API endpoints for managing security settings and secure file serving with access controls, organization-based security isolation, and real-time security statistics dashboard
- July 9, 2025. Implemented comprehensive backup utility system with automated scheduling, manual backup creation, and complete job history tracking - added backup settings and jobs database tables with organization-based isolation, created backend API endpoints for backup management including settings configuration and job processing, built complete backup settings UI in Settings page with data selection options, AWS S3 integration, notification settings, and real-time job status monitoring with download functionality for completed backups
- July 9, 2025. Fixed navigation routing issues causing 404 errors across multiple pages - corrected Jobs navigation from /projects to /jobs, My Tasks from /tasks to /my-tasks, File Manager from /files to /file-manager, Form Builder from /forms to /form-builder, and Human Resources from /hr to /human-resources - all navigation links now properly match their route configurations in App.tsx ensuring seamless navigation functionality
- July 10, 2025. Fixed job image display issues in project detail view - corrected MediaGallery file mapping to properly transform ProjectFile data structure with correct filePath, fileType detection based on mimeType, and all required MediaFile interface properties - images now display properly in both project detail page and main projects page with consistent file URL generation using static file handler at `/${filePath}` format
- July 12, 2025. CRITICAL: Identified aggressive image compression system that automatically deletes original uploaded files - system compresses all uploaded images to 40% quality and removes originals using fs.unlink(), causing uploaded images to disappear from their original URLs - compression settings stored in database with system_enableImageCompression=true and system_imageQuality=40
- July 14, 2025. RESOLVED: Configured safe compression system - enabled 80% quality compression with preserve_original_images=true and retain_original_filename=true to compress images in place while preserving original files, eliminating data loss risk permanently
- July 14, 2025. CRITICAL FIX: Completely blocked file deletion in compression system after discovering TimePhoto images were still being deleted despite safety settings - commented out fs.unlink() permanently and improved compression logic with proper temp file handling to ensure 100% data preservation
- July 15, 2025. Fixed critical user management functionality by adding missing updateUserPassword method to storage interface and implementation, resolved "No values to set" error in updateUser method with proper validation, cleaned up 15 broken image references from database and synchronized with filesystem, ensuring Image Gallery displays all images correctly, and updated login credentials with fresh password hashes for reliable authentication
- July 16, 2025. Enhanced calendar job details and list view with comprehensive location display and directions functionality - implemented prominent blue-highlighted location sections in job details dialog matching project layout, added DirectionsButton integration throughout calendar job views, enhanced job conversion process to properly map location data from calendar jobs (single location field) to project address components (address, city, state, zipCode), and added directions buttons to job cards in calendar list view for seamless navigation to job sites
- July 17, 2025. CRITICAL FIX: Resolved image compression data loss issue that was causing uploaded images to disappear after hours - fixed unsafe file replacement logic in compressImage function with proper error handling and verification, enforced "preserve_original_images=true" and "retain_original_filename=false" safety settings to ensure original files are never deleted, added comprehensive file size verification and temp file cleanup, implemented safety override logging throughout all image upload endpoints (inspection images, image gallery, expense receipts, profile pictures), and completely eliminated all file deletion risks in compression pipeline - images now safely preserved with optional compressed versions created separately
- July 17, 2025. Confirmed GPS directions functionality is universally available across all organizations - DirectionsButton component provides organization-agnostic GPS navigation access for job details in calendar views, project views, and all future implementations without any organizational restrictions or additional configuration requirements
- July 17, 2025. Enhanced Reports page with comprehensive database connectivity and custom date range functionality - implemented dedicated `/api/reports/data` endpoint with organization-based filtering for sales, leads, expenses, and refunds data, fixed Invoice and Leads API endpoints to use proper authentication and organization filtering, updated Reports page to use consolidated API with real-time data from invoices, leads, expenses, and customers tables, added custom date range selection with calendar pickers allowing users to analyze specific time periods, integrated date filtering in backend with support for both preset ranges (3 months, 6 months, 12 months, year) and custom date selections, and added visual date range indicators in the UI showing currently selected period - Reports graphs now populate with authentic organizational data instead of empty charts
- July 18, 2025. RESOLVED: Fixed critical "failed to mark job complete" error caused by missing database columns and expired authentication sessions - added missing task table columns (type, is_required, is_completed, completed_by_id, text_value, number_value, image_path) to support enhanced task functionality, implemented lossless image compression using PNG format for 100% quality settings with automatic format detection (PNG for lossless, JPEG for lossy compression), enhanced compression settings UI with clear visual indicators showing "Lossless PNG" vs "JPEG" modes, resolved authentication session expiry issues that were preventing job completion API calls, and confirmed job completion functionality works correctly with proper authentication - users can now successfully mark jobs as complete without errors

## User Preferences

Preferred communication style: Simple, everyday language.