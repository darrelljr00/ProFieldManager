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
- **Multi-Tenant SaaS Infrastructure**: Organization-based tenant separation, subscription management (Stripe integration), role-based access control, usage limits.
- **Core Business Modules**: Customer, Project, Invoicing & Quotes, and Field Operations management.
- **Communication & Collaboration**: SMS (Twilio), internal WebSocket messaging, file sharing, Google My Business review requests.
- **Mobile-First Features**: GPS tracking, mobile camera integration, time clock, offline support.
- **File Management**: Secure uploads, organization-based file isolation, image processing and compression (Sharp library), Cloudinary integration for permanent cloud storage.
- **Real-time Communication**: WebSocket for instant updates (project changes, messages, notifications).
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

## External Dependencies

- **Stripe**: For subscription billing and payment processing.
- **Twilio**: For SMS messaging.
- **SendGrid**: For email notifications.
- **Google Maps API**: For address geocoding, directions, and map visualization.
- **DocuSign**: For electronic signature integration.
- **Cloudinary**: For cloud-based image and file storage, optimization, and delivery.
- **ClamAV**: For file security and virus scanning.
- **AWS S3**: For backup storage (integrated with backup utility).