# Pro Field Manager - Professional Field Service Management Platform

## Overview
Pro Field Manager is a comprehensive SaaS field service management platform designed to streamline field operations. It offers solutions for invoicing, project and customer management, team coordination, GPS tracking, and real-time communication. The project aims to provide a complete, modern web-based solution for businesses managing field services, enhancing efficiency and communication.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Mobile Support**: Responsive design with PWA capabilities

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Design**: RESTful APIs with WebSocket support
- **Authentication**: JWT-based authentication
- **File Handling**: Multer for file uploads (initial local storage, later Cloudinary)

### Database & ORM
- **Database**: PostgreSQL (local and cloud)
- **ORM**: Drizzle ORM
- **Migration**: Drizzle Kit
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Connection Pool Configuration**: max=10 connections, idleTimeout=15s, connectionTimeout=10s

### Performance Optimizations (November 2025)
- **Sidebar Query Optimization**: Reduced polling frequency from 10s to 30s across all sidebar queries (3x reduction in database load)
- **Configurable Cache System**: Custom Map-based caching with database-driven configuration (replaces memoizee)
  - Multi-tenant cache settings with global defaults and per-organization overrides
  - Dynamic TTL configuration (5s-300s) via `cache_settings` table
  - Enable/disable caching per organization through admin UI
  - Automatic cache invalidation on settings changes
  - `CacheConfigService` for lazy-loading and refreshing cache configurations
- **Query Caching**: Implemented for notification unread counts and internal messages with configurable TTL
- **Cache Invalidation**: Comprehensive cache invalidation on create/read operations for immediate data freshness despite caching
- **Database Indexing**: Added indexes on `notifications(user_id, is_read)` and `internal_message_recipients(recipient_id, is_read)` for faster query performance
- **Centralized Caching Module**: `server/cache/queryCache.ts` provides cached versions of expensive queries with automatic invalidation and multi-tenant isolation
- **Connection Pool Optimization**: Reduced idle connection timeout to prevent connection pool exhaustion under high load
- **GPS Speed Calculation Enhancement**: Implemented 5-sample rolling average with exponential weighting (favoring recent readings) to prevent icon flickering
  - Filters unrealistic speeds >120 mph to remove GPS drift/errors
  - Caps final averaged speed at 100 mph maximum
  - Handles edge cases where all speeds are filtered (defaults to 0 mph)
  - Resolves Isuzu NPR Box Truck anomaly (178.8 mph spikes and red/green status flickering)

### Core Features & Design Patterns
- **Multi-Tenant SaaS Infrastructure**: Organization-based tenant separation, subscription management, role-based access control, usage limits.
- **Core Business Modules**: Customer, Project, Invoicing & Quotes, and Field Operations management.
- **Communication & Collaboration**: SMS, internal WebSocket messaging, file sharing, Google My Business review requests.
- **Mobile-First Features**: GPS tracking, mobile camera integration, time clock, offline support.
- **File Management**: Secure uploads, organization-based file isolation, image processing and compression, Cloudinary integration.
- **Real-time Communication**: WebSocket for instant updates (project changes, messages, notifications) with polling fallback.
- **Security**: Malware scanning (ClamAV integration), file type restrictions.
- **Backup Utility**: Automated scheduling, manual backups, AWS S3 integration.
- **Dashboard Customization**: User-configurable widgets and role-based profiles.
- **Task Management**: Job-specific tasks with progress tracking.
- **Inspection Forms**: Customizable forms with mandatory disclaimers and photo uploads.
- **Vehicle Management**: CRUD operations for vehicles, maintenance tracking, and inspection integration.
- **Dispatch Routing**: Real-time job scheduling, assignment, and status updates with multi-map views and undo functionality.
- **Market Research**: Google search volume analysis for local service demand.
- **Sound Notifications**: Customizable audio alerts for events.
- **Employee Analytics**: Real-time performance metrics via WebSocket.
- **Visual Page Designer**: Drag-and-drop interface for editing frontend pages.
- **Interactive Product Walkthroughs**: Guided tours for key features like invoice creation, expense tracking, and lead management.
- **Comprehensive Help Documentation System**: Organized help sections with tutorials, FAQs, and interactive walkthroughs.
- **Mobile App OTA Updates**: Over-The-Air update system using Expo EAS Updates for automatic app updates.
- **GPS Tracking System**: Cellular SIM card OBD GPS tracking system with database schema, API endpoints, WebSocket, Google Maps integration, live vehicle monitoring, and trip history.
- **Fuel Tracking**: OBD GPS fuel tracking integration, daily fuel usage calculation, and fuel receipt OCR enhancement.
- **GPS Arrival & Time Tracking**: GPS geofencing arrival detection and automated job time exceeded monitoring with notifications.
- **On-Site Labor Cost Tracking**: Comprehensive on-site labor cost calculation based on job start/stop times and technician hourly rates.
- **Profit/Loss Analysis**: Daily and multi-view (Per Day, Per Week, Per Month, Per Job) profit/loss reporting with detailed breakdowns and dynamic charts.
- **Notification System**: Advanced notification system with visual alerts for job status, GPS events, and team activity for admin/manager oversight.
- **Customer Availability Requests**: Management of quote availability submissions with automated job creation and confirmation emails.
- **Email Deliverability**: Enhanced quote email system with plain text, Reply-To headers, and anti-spam measures.
- **Job Start/Complete Tracking**: "Start Job" button with automatic time tracking and analytics integration.
- **GPS Display Settings**: Configurable map layer (dark, light, satellite, hybrid), zoom level, and metric visibility (speed, fuel, engine temp) that apply to both GPS Tracking and GPS Analytics/Route Monitoring maps.
- **Pro Field Sense - Phone Sensor Productivity Tracking**: Monitors technician productivity using mobile device sensors including GPS location, accelerometer for activity detection (walking, sitting, driving, stationary), screen time tracking, step counting, distance measurement, and battery status. Calculates productivity scores based on activity patterns and idle time, with visual analytics showing activity breakdowns and daily performance metrics in the Employee Performance Analytics section of Reports.
- **Customer ETA Notifications**: Automated SMS notifications to customers when their technician is approaching the job site. Uses real-time GPS tracking combined with Google Maps Distance Matrix API to calculate accurate drive times, sends customizable SMS alerts when technician is within configured time threshold (default 15 minutes), includes live tracking links, and prevents duplicate notifications (one per job per day). Requires Twilio configuration and job GPS coordinates.
- **Job Analytics Employee Filtering**: Filter job completion analytics by specific employees or view all employees. Employee dropdown in Reports > Job Analytics tab allows managers to analyze individual technician performance including job duration, completion rate, and time-based metrics. Backend filters all queries (time clock, job site events, project users) by selected employee.
- **Enhanced Google Maps API Error Diagnostics**: Comprehensive error handling for Google Maps API failures including 403 Forbidden detection with actionable troubleshooting steps, structured logging for HTTP errors vs transport failures, and improved null/undefined checks across geocoding and directions API calls. Applies to GPS tracking reverse geocoding and trip distance calculations.
- **Stripe Connect Marketplace Payments**: Full marketplace payment infrastructure enabling organizations to connect their own Stripe accounts to receive customer payments with automatic platform fee deduction. Uses Stripe Connect Express accounts with destination charges pattern. Platform creates payment on platform account, transfers (amount - platformFee) to organization's connected account via `transfer_data.destination`. Features include: OAuth onboarding flow, account status dashboard, webhook event logging to `stripe_webhook_events` table with duplicate event protection, invoice and quote payment endpoints with automatic payment methods, revenue protection (blocks payments when Connect enabled but charges disabled), and proper metadata tracking for reconciliation.
- **Customer-Facing Payment Integration**: Complete public payment system allowing organizations to collect invoice and quote payments via shareable branded URLs. Features include: organization slug system (e.g., `texas-power-wash`) for branded payment links, public payment pages at `/:orgSlug/invoice/:id/pay` and `/:orgSlug/quote/:id/pay`, Stripe Checkout Sessions for PCI-compliant payment processing, anonymous customer access (no login required), "Copy Payment Link" buttons in invoices/quotes tables for easy sharing, multi-tenant security via database joins (invoices/quotes → users → organizations), revenue routing through Stripe Connect when enabled, success/error callback pages for redirect flow, and automatic invoice/quote status updates via webhooks. Public endpoints bypass authentication while maintaining organization isolation through slug validation and user-based joins.

## External Dependencies

- **Stripe**: For subscription billing, payment processing, and Stripe Connect marketplace payments.
- **Twilio**: For SMS messaging.
- **SendGrid**: For email notifications.
- **OpenAI**: For receipt OCR using GPT-5 Vision API.
- **Google Maps API**: For address geocoding, directions, and map visualization.
- **DocuSign**: For electronic signature integration.
- **Cloudinary**: For cloud-based image and file storage, optimization, and delivery.
- **ClamAV**: For file security and virus scanning.
- **AWS S3**: For backup storage.
- **Expo & EAS**: For mobile app development, building, and Over-The-Air (OTA) updates.
- **Android Studio Native Development**: For native Android app development with Kotlin, camera/GPS/file access, and WebView integration.