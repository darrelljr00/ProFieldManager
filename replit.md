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

## External Dependencies

- **Stripe**: For subscription billing and payment processing.
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