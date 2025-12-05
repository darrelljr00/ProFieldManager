# Pro Field Manager - Professional Field Service Management Platform

## Overview
Pro Field Manager is a comprehensive SaaS field service management platform designed to streamline field operations for businesses. It offers solutions for invoicing, project and customer management, team coordination, GPS tracking, and real-time communication. The platform aims to enhance efficiency, improve communication, and provide a complete web-based solution for managing field services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI**: Tailwind CSS with shadcn/ui, responsive design, PWA capabilities
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API**: RESTful APIs with WebSocket support
- **Authentication**: JWT-based
- **File Handling**: Multer for uploads

### Database
- **Type**: PostgreSQL (Neon serverless with connection pooling)
- **ORM**: Drizzle ORM
- **Migration**: Drizzle Kit

### Core Features & Design Patterns
- **Multi-Tenant SaaS Infrastructure**: Organization-based tenant separation, subscription management, role-based access control.
- **Core Business Modules**: Customer, Project, Invoicing & Quotes, Field Operations management.
- **Communication & Collaboration**: SMS, internal WebSocket messaging, file sharing, Google My Business review requests.
- **Mobile-First Features**: GPS tracking, mobile camera integration, time clock, offline support.
- **File Management**: Secure uploads, organization-based file isolation, image processing, malware scanning.
- **Real-time Communication**: WebSockets for instant updates.
- **Backup Utility**: Automated and manual backups to AWS S3.
- **Customization**: Dashboard customization, visual page designer, interactive product walkthroughs.
- **Task & Inspection Management**: Job-specific tasks, customizable inspection forms.
- **Vehicle & Dispatch Management**: CRUD for vehicles, maintenance tracking, real-time dispatch routing.
- **GPS Tracking System**: Cellular SIM card OBD GPS tracking, live monitoring, trip history, geofencing, arrival detection, fuel tracking, on-site labor cost tracking.
- **Profit/Loss Analysis**: Daily and multi-view profit/loss reporting with dynamic charts.
- **Advanced Notification System**: Visual alerts for job status, GPS events, team activity, sound notifications.
- **Customer Engagement**: Customer availability requests, enhanced quote email system, automated ETA notifications via SMS.
- **Performance & Productivity**: Employee analytics, phone sensor productivity tracking (Pro Field Sense).
- **Security Enhancements**: Puzzle picture captcha for login, comprehensive Google Maps API error diagnostics.
- **Payments**: Stripe Connect Marketplace Payments for organizations to receive payments, customer-facing public payment integration for invoices/quotes.
- **Deployment**: Deploy to CWP System for server deployments with SSH/rsync, real-time logs, and deployment history.
- **SEO**: Comprehensive SEO implementation for public-facing pages, dynamic sitemap/robots.txt, structured data.
- **Mobile App**: OTA updates via Expo EAS.
- **Promotions & Rewards**: Spin-to-win wheels for customer engagement, coupon code management, promotion campaigns with weighted probability selection, redemption tracking, and public-facing spin wheel pages with one-spin-per-user enforcement.

## External Dependencies

- **Stripe**: Subscription billing, payment processing, Stripe Connect.
- **Twilio**: SMS messaging.
- **SendGrid**: Email notifications.
- **OpenAI**: Receipt OCR (GPT-5 Vision API).
- **Google Maps API**: Geocoding, directions, map visualization.
- **DocuSign**: Electronic signature integration.
- **Cloudinary**: Cloud-based image and file storage.
- **ClamAV**: File security and virus scanning.
- **AWS S3**: Backup storage.
- **Expo & EAS**: Mobile app development, building, and OTA updates.

## Recent Updates (Dec 5, 2025)
- **Admin Inventory Management System Enhanced**:
  - Created dedicated `inventory_items` database table separate from `parts_supplies`
  - Admin Inventory Management page (`/admin-inventory-management`) with 3 tabs: Inventory, Assignments, Daily Verifications
  - "Inventory" tab displays all created inventory items in a card grid with images
  - Create Item dialog supports image upload via Cloudinary, item name, description, category, SKU, initial stock, and min stock level
  - Delete functionality for inventory items
  - Quick "Assign" button on each inventory item card to assign to technicians
  - API endpoints: GET/POST/PUT/DELETE `/api/admin/inventory-items`
  - Image upload uses existing `/api/files/upload` endpoint
  - Navigation: "Inventory Assignment" sub-item under "Parts & Supplies" (admin/manager only)
  - Integrates with Daily Flow system for required daily inventory verification
- **Personal Profile & My Reports Pages**:
  - Created Personal Profile page (`/personal-profile`) showing user's own HR data
  - Displays time off requests, performance reviews, and disciplinary actions for the logged-in user
  - Created My Reports page (`/my-reports`) showing user's own performance analytics
  - Includes task completion rates, job activity metrics, and documentation compliance
  - API endpoints: `/api/my-time-off-requests`, `/api/my-performance-reviews`, `/api/my-disciplinary-actions`, `/api/my-reports/summary`
  - Both pages accessible to all authenticated users as separate sidebar navigation items (no permission restriction)
- **Time Clock Settings Admin-Only Restriction**:
  - Restricted Time Clock Settings tab to organization admins only
  - Both the tab trigger and tab content are conditionally rendered based on `isAdmin` check
  - Applies across all organizations as a platform-wide rule
- **Dashboard Profile Matching Fix**: 
  - Fixed critical bug where `/api/settings/dashboard` was incorrectly marked as a public route
  - Profile-based widget visibility now correctly applies based on user role
  - Technician users now see the correct dashboard configuration (no revenue chart, no recent invoices)
  - Added `protectedOverrides` array in routes.ts to exclude specific paths from public route matching

## Previous Updates (Dec 4, 2025)
- **Technician Daily Flow System**: 
  - Created 4-step daily workflow wizard for field technicians: Check-In, Daily Jobs Review, Tech Inventory, Vehicle Inspection
  - Added `technician_daily_flow_sessions` database table for tracking daily session progress
  - API routes `/api/technician-daily-flow` (GET/PATCH) for session management
  - DailyFlowWidget on Dashboard prompts technicians to complete their daily checklist
  - Each step links to existing systems (time clock, my schedule, tech inventory, inspections)
  - Session resets daily and tracks completion status per step
- **Technician Inventory Management**:
  - Created `/tech-inventory` page for technicians to view and manage their assigned parts/tools
  - Added `technician_inventory` and `technician_inventory_transactions` database tables
  - Supports quantity tracking, vehicle assignment, and restock alerts
  - Transaction logging for usage, restocking, and adjustments
- **Technician Onboarding System**: 
  - Created user-scoped technician training wizard with 7 steps: Welcome, Schedule, Job Details, Image Uploads, Time Clock, Tasks, and GPS
  - Added `technician_onboarding_progress` database table for individual user progress tracking
  - API routes `/api/technician-onboarding/progress` (GET/POST) for progress management
  - TechnicianTrainingWidget on Dashboard prompts users with incomplete training
  - Role-based sidebar navigation: Admins/managers see "Onboarding" menu with "Admin Onboarding" and "Technician Onboarding" subtabs; technicians only see "Training" tab and "Daily Flow"
  - Progress persists per-step with completion percentage tracking

## Previous Updates (Dec 2, 2025)
- **Dual Onboarding System Enhancements**: 
  - Added "Onboarding" navigation item to sidebar for organization admins to view their own progress (`/onboarding-overview` page)
  - Enhanced SaaS Admin Onboarding tab with Monitor/Settings tabs
  - Settings tab allows configuring email templates (welcome/reminder), reminder delay timing, and enabling/disabling onboarding steps
  - Created `onboarding_settings` database table for platform-wide configuration persistence
  - API routes `/api/admin/onboarding/settings` (GET/PUT) protected with `isSuperAdmin` middleware
- **Promotion Settings Moved to Frontend Management**: Promotions, coupon codes, redemptions, and spin wheel configuration are now accessible from the Frontend Management page under a new "Promotions" tab (in addition to the standalone promotions page)
- **Spin Wheel Feature Complete**: Interactive spin-to-win wheel with CSS animation, weighted probability selection, one-spin enforcement, optional email capture, and integration with coupon code system
- **Public Spin Wheel Pages**: Customers can access individual spin wheel campaigns via public URLs (`/spin-wheel/{id}`) with localStorage and database-backed spin tracking
