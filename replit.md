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

## User Preferences

Preferred communication style: Simple, everyday language.