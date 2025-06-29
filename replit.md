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

## User Preferences

Preferred communication style: Simple, everyday language.