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
6. **Security Fix - Auto-Login Bypass Removed**: Removed the development mode "ENHANCED FALLBACK" code that was automatically authenticating users without credentials by looking up existing database sessions. Now users must enter valid username/email and password to log in.
