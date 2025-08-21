# Pro Field Manager - Professional Field Service Management Platform

## Overview
Pro Field Manager is a comprehensive SaaS field service management platform designed to streamline field operations. It offers solutions for invoicing, project and customer management, team coordination, GPS tracking, and real-time communication. The project aims to provide a complete, modern web-based solution for businesses managing field services, enhancing efficiency and communication.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)
- **Live Streaming Feature Complete**: Implemented comprehensive live streaming functionality with camera access, front/rear camera switching, recording capabilities, and demo viewer interface
- **Deployment Configuration Fixed**: Resolved port forwarding and build path issues for successful Cloud Run autoscale deployment
- **Mobile Navigation Fixed**: Added hamburger menu functionality with dropdown navigation for Login and Get Started buttons on landing page
- **Custom Domain Authentication Resolved**: Fixed cross-origin authentication issues for profieldmanager.com domain using Bearer token authentication
- **CORS Configuration Enhanced**: Improved CORS headers to support cross-site requests from custom domain to Replit backend
- **Build Process Optimized**: Created automated build script to properly handle frontend asset deployment

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
- **Google Maps API**: For address geocoding, directions, and map visualization.
- **DocuSign**: For electronic signature integration.
- **Cloudinary**: For cloud-based image and file storage, optimization, and delivery.
- **ClamAV**: For file security and virus scanning.
- **AWS S3**: For backup storage (integrated with backup utility).
- **Expo & EAS**: For mobile app development, building, and Over-The-Air (OTA) updates with automatic deployment capabilities.