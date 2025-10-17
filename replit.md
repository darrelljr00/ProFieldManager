# Pro Field Manager - Professional Field Service Management Platform

## Overview
Pro Field Manager is a comprehensive SaaS field service management platform designed to streamline field operations. It offers solutions for invoicing, project and customer management, team coordination, GPS tracking, and real-time communication. The project aims to provide a complete, modern web-based solution for businesses managing field services, enhancing efficiency and communication.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)
- **On-Site Labor Cost Tracking**: Implemented comprehensive on-site labor cost calculation system that tracks actual labor costs based on job start/stop times and technician hourly rates. The system calculates hours worked from project startDate/endDate timestamps, retrieves technician hourly rates from the employees table, and includes on-site labor costs in all profit/loss calculations. Both Profit Per Vehicle and Profit/Loss reports now display on-site labor costs alongside travel fuel, travel labor, and material costs for complete financial visibility. Custom date range support ensures accurate reporting across all time periods.
- **Daily Profit/Loss Analysis**: Enhanced Reports page Profit Loss tab with comprehensive daily financial analysis featuring line-by-line daily net profit breakdown table (last 30 days), daily most profitable jobs rankings showing top 5 jobs per day with detailed profitability metrics, daily profit margin analysis integrated into existing charts, and complete job-level revenue/expense tracking for each day. All data aggregates using createdAt timestamps for accurate daily grouping.
- **Fuel Receipt OCR Enhancement**: Extended OCR receipt scanning to automatically extract gallons and price per gallon from gas/fuel receipts in addition to standard fields (vendor, amount, date, category). The Technician Expenses form now includes fuel-specific fields that auto-populate when scanning gas station receipts, enabling detailed fuel expense tracking.
- **Receipt OCR Auto-Extraction**: Implemented OpenAI Vision-powered OCR for Technician Expenses to automatically extract receipt data. When taking or uploading a receipt photo, the system analyzes the image and auto-populates vendor name, amount, date, and category fields using GPT-5 Vision API. Features include real-time processing feedback with loading overlay, success notifications, and graceful degradation when API key is not configured. Requires OPENAI_API_KEY environment variable.
- **Customer Availability Requests Management**: Implemented Customer Requests tab in calendar page to manage quote availability submissions. When customers accept quotes and provide their available dates/times, requests appear in the calendar interface grouped by customer. Admins can click any time slot to confirm, which automatically creates a scheduled job and sends a confirmation email to the customer. The availability request is removed once confirmed, streamlining the quote-to-job workflow.
- **Quote Email Deliverability Improvements**: Enhanced quote email system with plain text version alongside HTML, Reply-To headers, and anti-spam headers (X-Mailer, X-Priority, Importance) to improve email deliverability and avoid spam filters.
- **OBD GPS Tracking System Complete**: Fully implemented cellular SIM card OBD GPS tracking system with database schema (obd_location_data, obd_diagnostic_data, obd_trips tables), 6 backend API endpoints for device data reception and retrieval, WebSocket real-time broadcasting, Google Maps integration with live vehicle monitoring dashboard, trip history with route replay functionality, weekly statistics, and dark mode automotive-themed interface. Devices POST location/diagnostic data to /api/obd/location and /api/obd/data endpoints for seamless integration.
- **Multi-View Profit/Loss Reporting**: Enhanced financial reporting with flexible profit/loss analysis views including Per Day (last 30 days), Per Week (last 12 weeks), Per Month, and Per Job. The Per Job view includes a detailed breakdown table showing revenue, expenses, profit, and profit margin for each job with totals. Dynamic charts automatically adapt to the selected view with proper data aggregation.
- **Job Start/Complete Tracking with Analytics Integration**: Implemented "Start Job" button with automatic time tracking for job analytics. When jobs are started or completed, the system records timestamps (startDate/endDate) and sends notifications to admins/managers via the existing notification system. This data integrates with the job analytics dashboard to measure job completion time vs onsite duration and technician performance metrics.
- **SendGrid Email Configuration Added**: Integrated SendGrid configuration into Email Settings with secure API key storage using password-protected fields and show/hide toggle. Quote email functionality now checks settings database first, falling back to environment variables for backward compatibility.
- **Comprehensive Team Activity Notification System**: Implemented complete notification infrastructure for admin/manager oversight including task completion, project/job completion, time clock events (clock in/out), and late arrival detection. All notifications use 'team_based' category for proper visibility in admin notification tabs with appropriate priority levels and detailed messaging.
- **Complete Android Studio Project Created**: Built full production-ready Android Studio project with native capabilities including camera, GPS, file system access, and WebView integration for APK generation
- **Live Streaming Feature Complete**: Implemented comprehensive live streaming functionality with camera access, front/rear camera switching, recording capabilities, and demo viewer interface
- **Deployment Configuration Fixed**: Resolved port forwarding and build path issues for successful Cloud Run autoscale deployment
- **Mobile Navigation Fixed**: Added hamburger menu functionality with dropdown navigation for Login and Get Started buttons on landing page
- **Custom Domain Authentication Resolved**: Fixed cross-origin authentication issues for profieldmanager.com domain using Bearer token authentication
- **CORS Configuration Enhanced**: Improved CORS headers to support cross-site requests from custom domain to Replit backend
- **Build Process Optimized**: Created automated build script to properly handle frontend asset deployment
- **Share Photo Links Fixed**: Resolved foreign key constraint violation when sharing images without project associations by allowing nullable projectId in database schema and converting zero values to null in both frontend and backend validation

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

### Core Features & Design Patterns
- **Multi-Tenant SaaS Infrastructure**: Organization-based tenant separation, subscription management (Stripe integration), role-based access control, usage limits.
- **Core Business Modules**: Customer, Project, Invoicing & Quotes, and Field Operations management.
- **Communication & Collaboration**: SMS (Twilio), internal WebSocket messaging, file sharing, Google My Business review requests.
- **Mobile-First Features**: GPS tracking, mobile camera integration, time clock, offline support.
- **File Management**: Secure uploads, organization-based file isolation, image processing and compression (Sharp library), Cloudinary integration for permanent cloud storage.
- **Real-time Communication**: WebSocket for instant updates (project changes, messages, notifications) with polling fallback system for reliable navigation updates when WebSocket connections fail.
- **Security**: Malware scanning (ClamAV integration), file type restrictions.
- **Backup Utility**: Automated scheduling, manual backups, AWS S3 integration.
- **Dashboard Customization**: User-configurable widgets and role-based profiles.
- **Task Management**: Job-specific tasks with progress tracking and completion timestamps.
- **Inspection Forms**: Customizable forms with mandatory disclaimers and photo uploads.
- **Vehicle Management**: CRUD operations for vehicles, maintenance tracking, and inspection integration.
- **Dispatch Routing**: Real-time job scheduling, assignment, and status updates with multi-map views and undo functionality.
- **Market Research**: Google search volume analysis for local service demand.
- **Sound Notifications**: Customizable audio alerts for events.
- **Employee Analytics**: Real-time performance metrics via WebSocket.
- **Visual Page Designer**: Drag-and-drop interface for editing frontend pages (e.g., Home Page).
- **Interactive Product Walkthroughs**: Step-by-step guided tours with visual element highlighting, action execution, and progress tracking for key features including invoice creation, expense tracking, lead management, task creation, vehicle inspections, team messaging, file management, and dashboard navigation.
- **Comprehensive Help Documentation System**: Organized help sections with tutorials, FAQs, documentation, and interactive walkthroughs searchable by category and difficulty level, integrated into the admin interface with global accessibility.
- **Mobile App OTA Updates**: Complete Over-The-Air update system using Expo EAS Updates for automatic app updates without APK regeneration, supporting continuous deployment with channel-based control (development/preview/production).

## External Dependencies

- **Stripe**: For subscription billing and payment processing.
- **Twilio**: For SMS messaging.
- **SendGrid**: For email notifications.
- **OpenAI**: For receipt OCR (Optical Character Recognition) using GPT-5 Vision API to automatically extract data from receipt images.
- **Google Maps API**: For address geocoding, directions, and map visualization.
- **DocuSign**: For electronic signature integration.
- **Cloudinary**: For cloud-based image and file storage, optimization, and delivery.
- **ClamAV**: For file security and virus scanning.
- **AWS S3**: For backup storage (integrated with backup utility).
- **Expo & EAS**: For mobile app development, building, and Over-The-Air (OTA) updates with automatic deployment capabilities.
- **Android Studio Native Development**: Complete Android Studio project structure with Kotlin development, native camera/GPS/file access, WebView integration, and APK generation capabilities.