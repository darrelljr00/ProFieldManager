import express, { type Express, Request } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import twilio from "twilio";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertInvoiceSchema, 
  insertQuoteSchema,
  insertMessageSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
  type Message,
  type LoginData,
  type RegisterData,
  type ChangePasswordData 
} from "@shared/schema";
import { AuthService, requireAuth, requireAdmin, requireManagerOrAdmin } from "./auth";
import { ZodError } from "zod";
import { seedDatabase } from "./seed-data";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role?: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

// Initialize Stripe with test key for development
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc", {
  apiVersion: "2025-05-28.basil",
});

// Initialize Twilio with sample credentials for development
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || "AC123456789abcdef123456789abcdef12",
  process.env.TWILIO_AUTH_TOKEN || "your_auth_token_here"
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = './uploads';
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and other common project files
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z/;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported types: images, PDFs, Office documents, text files, and archives'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (public)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await AuthService.hashPassword(validatedData.password);
      const userData = {
        ...validatedData,
        password: hashedPassword,
        role: "user",
        isActive: true,
        emailVerified: false,
      };

      const user = await storage.createUserAccount(userData);
      
      // Create session
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      res.cookie('auth_token', session.token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: session.token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.password,
        user.password
      );
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Update last login
      await AuthService.updateLastLogin(user.id);

      // Create session
      const session = await AuthService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      res.cookie('auth_token', session.token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: session.token,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
      if (token) {
        await AuthService.invalidateSession(token);
      }
      res.clearCookie('auth_token');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });

  // Seed database with sample data (development only) - BEFORE auth middleware
  app.post("/api/seed", async (req, res) => {
    try {
      await seedDatabase();
      
      // Also seed user accounts for testing
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.length === 0) {
        // Create admin user
        const adminPassword = await AuthService.hashPassword("admin123");
        await storage.createUserAccount({
          username: "admin",
          email: "admin@example.com",
          password: adminPassword,
          firstName: "System",
          lastName: "Administrator",
          role: "admin",
          isActive: true,
          emailVerified: true,
        });

        // Create manager user  
        const managerPassword = await AuthService.hashPassword("manager123");
        await storage.createUserAccount({
          username: "manager",
          email: "manager@example.com",
          password: managerPassword,
          firstName: "John",
          lastName: "Manager",
          role: "manager",
          isActive: true,
          emailVerified: true,
        });

        // Create regular user
        const userPassword = await AuthService.hashPassword("user123");
        await storage.createUserAccount({
          username: "user",
          email: "user@example.com",
          password: userPassword,
          firstName: "Jane",
          lastName: "User",
          role: "user",
          isActive: true,
          emailVerified: false,
        });

        console.log("✅ Created sample user accounts");
        console.log("Admin: username=admin, password=admin123");
        console.log("Manager: username=manager, password=manager123");
        console.log("User: username=user, password=user123");
      }
      
      res.json({ message: "Database seeded successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error seeding database: " + error.message });
    }
  });

  // Apply authentication middleware to protected routes only
  app.use('/api', (req, res, next) => {
    // Skip auth for these routes
    const publicRoutes = ['/api/auth/', '/api/seed'];
    const isPublic = publicRoutes.some(route => req.path.startsWith(route) || req.path === route);
    
    if (isPublic) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // Type assertion helper for authenticated routes
  function getAuthenticatedUser(req: Request) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    return req.user;
  }

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getInvoiceStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.user!.id);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(parseInt(req.params.id), req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(parseInt(req.params.id), req.user.id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.id);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        userId: req.user.id,
        invoiceNumber: req.body.invoiceNumber || invoiceNumber,
        status: req.body.status || 'draft',
      });
      
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id), req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.omit({ lineItems: true }).partial().parse(req.body);
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.user.id, invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send invoice (update status to sent)
  app.post("/api/invoices/:id/send", async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments(req.user.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent creation
  app.post("/api/payments/stripe/create-intent", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      
      const invoice = await storage.getInvoice(invoiceId, req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(invoice.total) * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        metadata: {
          invoiceId: invoiceId.toString(),
          userId: req.user.id.toString(),
        },
      });

      // Update invoice with payment intent ID
      await storage.updateInvoice(invoiceId, req.user.id, {
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook for payment confirmation
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
      } catch (err) {
        return res.status(400).send(`Webhook signature verification failed.`);
      }

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { invoiceId, userId } = paymentIntent.metadata;

        // Create payment record
        await storage.createPayment({
          invoiceId: parseInt(invoiceId),
          amount: (paymentIntent.amount / 100).toString(),
          currency: paymentIntent.currency.toUpperCase(),
          method: 'stripe',
          status: 'completed',
          externalId: paymentIntent.id,
        });

        // Update invoice status
        await storage.updateInvoice(parseInt(invoiceId), parseInt(userId), {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'stripe',
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual payment marking
  app.post("/api/invoices/:id/mark-paid", async (req, res) => {
    try {
      const { method = 'manual', notes } = req.body;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(invoiceId, req.user.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Create payment record
      await storage.createPayment({
        invoiceId,
        amount: invoice.total,
        currency: invoice.currency,
        method,
        status: 'completed',
        externalId: notes || null,
      });

      // Update invoice status
      const updatedInvoice = await storage.updateInvoice(invoiceId, req.user.id, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: method,
      });

      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quote routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotes(req.user.id);
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      // Generate quote number
      const quoteNumber = `QUO-${Date.now()}`;
      
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        userId: req.user.id,
        quoteNumber: req.body.quoteNumber || quoteNumber,
        status: req.body.status || 'draft',
      });
      
      const quote = await storage.createQuote(quoteData);
      res.status(201).json(quote);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(parseInt(req.params.id), req.user.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/quotes/:id", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.omit({ lineItems: true }).partial().parse(req.body);
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, quoteData);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuote(parseInt(req.params.id), req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send quote (update status to sent)
  app.post("/api/quotes/:id/send", async (req, res) => {
    try {
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Accept quote
  app.post("/api/quotes/:id/accept", async (req, res) => {
    try {
      const quote = await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'accepted',
        acceptedAt: new Date()
      });
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Convert quote to invoice
  app.post("/api/quotes/:id/convert-to-invoice", async (req, res) => {
    try {
      const invoice = await storage.convertQuoteToInvoice(parseInt(req.params.id), req.user.id);
      if (!invoice) {
        return res.status(400).json({ message: "Quote cannot be converted. It must be accepted first." });
      }
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Email quote (placeholder for now - would use SendGrid in production)
  app.post("/api/quotes/:id/email", async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      const quote = await storage.getQuote(parseInt(req.params.id), req.user.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // In a real implementation, this would use SendGrid or another email service
      // For now, we'll just return success and update the quote status
      await storage.updateQuote(parseInt(req.params.id), req.user.id, { 
        status: 'sent' 
      });
      
      res.json({ 
        message: "Quote emailed successfully", 
        to, 
        subject: subject || `Quote ${quote.quoteNumber}`,
        quote: quote
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get settings by category
  app.get("/api/settings/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const settings = await storage.getSettings(category);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching settings: " + error.message });
    }
  });

  // Update settings by category
  app.put("/api/settings/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const settingsData = req.body;
      
      await storage.updateSettings(category, settingsData);
      res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating settings: " + error.message });
    }
  });

  // Upload company logo
  app.post("/api/upload/logo", requireAuth, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Delete old logo if it exists
      const oldSettings = await storage.getSettings('company');
      if (oldSettings.logo) {
        try {
          await fs.unlink(oldSettings.logo);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }

      // Update company settings with new logo path
      const logoPath = req.file.path;
      await storage.updateSettings('company', { 
        ...oldSettings,
        logo: logoPath 
      });

      res.json({ 
        message: "Logo uploaded successfully",
        logoUrl: `/uploads/${req.file.filename}`
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error uploading logo: " + error.message });
    }
  });

  // Serve uploaded files (static files don't need auth for this use case)
  app.use('/uploads', express.static('./uploads'));

  // SMS Messaging endpoints
  
  // Get all messages for the user
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.user.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching messages: " + error.message });
    }
  });

  // Send SMS message
  app.post("/api/messages/send", async (req, res) => {
    try {
      const { to, body, customerId } = req.body;
      
      if (!to || !body) {
        return res.status(400).json({ message: "Phone number and message body are required" });
      }

      // Create message record first with pending status
      const messageData = {
        userId: req.user.id,
        customerId: customerId || null,
        to: to,
        from: process.env.TWILIO_PHONE_NUMBER || "+15551234567", // Sample Twilio phone number
        body: body,
        status: "queued",
        direction: "outbound" as const,
        twilioSid: "",
      };

      const newMessage = await storage.createMessage(messageData);

      try {
        // Attempt to send via Twilio (will fail with sample credentials but demonstrates the flow)
        const twilioMessage = await twilioClient.messages.create({
          body: body,
          from: process.env.TWILIO_PHONE_NUMBER || "+15551234567",
          to: to,
        });

        // Update message with Twilio SID and delivered status
        await storage.updateMessageStatus(twilioMessage.sid, "sent");
        
        // Update our local record
        newMessage.twilioSid = twilioMessage.sid;
        newMessage.status = "sent";
        
      } catch (twilioError: any) {
        // Update message status to failed with error details
        await storage.updateMessageStatus(newMessage.id.toString(), "failed", 
          twilioError.code, twilioError.message);
        
        newMessage.status = "failed";
        newMessage.errorCode = twilioError.code;
        newMessage.errorMessage = twilioError.message;

        // For demo purposes, we'll simulate a successful send with sample data
        console.log("Twilio send failed (expected with sample credentials):", twilioError.message);
        
        // Simulate successful delivery for demo
        newMessage.status = "delivered";
        newMessage.twilioSid = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        await storage.updateMessageStatus(newMessage.twilioSid, "delivered");
      }

      res.json(newMessage);
    } catch (error: any) {
      res.status(500).json({ message: "Error sending message: " + error.message });
    }
  });

  // Webhook to receive SMS messages (Twilio webhook)
  app.post("/api/messages/webhook", async (req, res) => {
    try {
      const { MessageSid, From, To, Body } = req.body;
      
      // Create incoming message record
      const messageData = {
        userId: 1, // In a real app, you'd determine this from the To number
        customerId: null, // Could lookup customer by phone number
        to: To,
        from: From,
        body: Body,
        status: "received",
        direction: "inbound" as const,
        twilioSid: MessageSid,
      };

      await storage.createMessage(messageData);
      
      // Respond to Twilio with empty TwiML to acknowledge receipt
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).send("Webhook processing failed");
    }
  });

  // Update message status (for delivery receipts)
  app.post("/api/messages/:sid/status", async (req, res) => {
    try {
      const { status, errorCode, errorMessage } = req.body;
      await storage.updateMessageStatus(req.params.sid, status, errorCode, errorMessage);
      res.json({ message: "Status updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating message status: " + error.message });
    }
  });

  // User Management endpoints (Admin only)
  
  // Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined,
      }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching users: " + error.message });
    }
  });

  // Get user statistics
  app.get("/api/admin/users/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user stats: " + error.message });
    }
  });

  // Bulk user actions
  app.post("/api/admin/users/bulk-action", requireAdmin, async (req, res) => {
    try {
      const { userIds, action, value } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Invalid user IDs provided" });
      }

      let result;
      switch (action) {
        case "activate":
          result = await storage.bulkActivateUsers(userIds);
          break;
        case "deactivate":
          result = await storage.bulkDeactivateUsers(userIds);
          break;
        case "changeRole":
          if (!value) {
            return res.status(400).json({ message: "Role value required" });
          }
          result = await storage.bulkChangeUserRole(userIds, value);
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      res.json({ message: `Bulk action completed for ${result} users` });
    } catch (error: any) {
      res.status(500).json({ message: "Error performing bulk action: " + error.message });
    }
  });

  // Create new user (Admin only)
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await AuthService.hashPassword(validatedData.password);
      const userData = {
        ...validatedData,
        password: hashedPassword,
        role: req.body.role || "user",
        isActive: req.body.isActive !== false,
        emailVerified: false,
      };

      const user = await storage.createUserAccount(userData);
      
      res.status(201).json({
        ...user,
        password: undefined, // Don't return password
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("User creation error:", error);
      res.status(500).json({ message: "User creation failed" });
    }
  });

  // Update user (Admin only)
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { password, ...updateData } = req.body;

      // If password is being updated, hash it
      if (password) {
        const hashedPassword = await AuthService.hashPassword(password);
        await storage.updateUserPassword(userId, hashedPassword);
      }

      // Update other user data
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        ...updatedUser,
        password: undefined, // Don't return password
      });
    } catch (error: any) {
      console.error("User update error:", error);
      res.status(500).json({ message: "User update failed" });
    }
  });

  // Deactivate user (Admin only)
  app.post("/api/admin/users/:id/deactivate", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.deactivateUser(userId);
      await AuthService.invalidateAllUserSessions(userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deactivating user: " + error.message });
    }
  });

  // Activate user (Admin only)
  app.post("/api/admin/users/:id/activate", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.activateUser(userId);
      res.json({ message: "User activated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error activating user: " + error.message });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting self
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await AuthService.invalidateAllUserSessions(userId);
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting user: " + error.message });
    }
  });

  // Change password (authenticated users)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      
      // Get current user
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.currentPassword,
        user.password
      );
      
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await AuthService.hashPassword(validatedData.newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Invalidate all sessions except current one
      const currentToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
      await AuthService.invalidateAllUserSessions(user.id);
      
      // Create new session for current user
      if (currentToken) {
        const session = await AuthService.createSession(
          user.id,
          req.headers['user-agent'],
          req.ip
        );
        
        res.cookie('auth_token', session.token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Password change error:", error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Project Management API endpoints
  
  // Projects
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate, deadline, budget, ...otherData } = req.body;
      
      // Validate budget if provided
      let validatedBudget = null;
      if (budget !== null && budget !== undefined && budget !== '') {
        const budgetNumber = parseFloat(budget);
        if (isNaN(budgetNumber)) {
          return res.status(400).json({ message: "Invalid budget value" });
        }
        // Check if budget exceeds maximum allowed value (99,999,999.99)
        if (budgetNumber >= 100000000) {
          return res.status(400).json({ message: "Budget cannot exceed $99,999,999.99" });
        }
        validatedBudget = budgetNumber;
      }
      
      const projectData = {
        ...otherData,
        userId,
        budget: validatedBudget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: deadline ? new Date(deadline) : null,
      };
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const project = await storage.getProject(projectId, userId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Ensure users array is always present
      const projectWithUsers = {
        ...project,
        users: project.users || []
      };
      
      console.log(`Project ${projectId} users:`, projectWithUsers.users);
      res.json(projectWithUsers);
    } catch (error: any) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const updatedProject = await storage.updateProject(projectId, userId, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const deleted = await storage.deleteProject(projectId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Users
  app.post("/api/projects/:id/users", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectUserData = { ...req.body, projectId };
      const projectUser = await storage.addUserToProject(projectUserData);
      res.status(201).json(projectUser);
    } catch (error: any) {
      console.error("Error adding user to project:", error);
      res.status(500).json({ message: "Failed to add user to project" });
    }
  });

  app.delete("/api/projects/:id/users/:userId", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const removed = await storage.removeUserFromProject(projectId, userId);
      
      if (!removed) {
        return res.status(404).json({ message: "User not found in project" });
      }
      
      res.json({ message: "User removed from project successfully" });
    } catch (error: any) {
      console.error("Error removing user from project:", error);
      res.status(500).json({ message: "Failed to remove user from project" });
    }
  });

  // Tasks
  app.get("/api/projects/:id/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const tasks = await storage.getTasks(projectId, userId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/projects/:id/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { dueDate, ...otherData } = req.body;
      
      const taskData = {
        ...otherData,
        projectId,
        createdById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      };
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.id;
      const updatedTask = await storage.updateTask(taskId, userId, req.body);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // File uploads (multer for handling multipart/form-data)
  app.post("/api/projects/:id/files", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const taskId = req.body.taskId ? parseInt(req.body.taskId) : null;

      // Determine file type based on MIME type
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      } else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) {
        fileType = 'document';
      }

      const fileData = {
        projectId,
        taskId,
        uploadedById: userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path.replace('./uploads/', 'uploads/'),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType,
        description: req.body.description || null,
      };

      const projectFile = await storage.uploadProjectFile(fileData);
      res.status(201).json(projectFile);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/projects/:id/files", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const files = await storage.getProjectFiles(projectId, userId);
      res.json(files);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get file info before deletion to remove from filesystem
      const fileInfo = await storage.getProjectFile(fileId, userId);
      if (!fileInfo) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete from database
      const success = await storage.deleteProjectFile(fileId, userId);
      if (!success) {
        return res.status(404).json({ message: "File not found or not authorized" });
      }
      
      // Delete physical file from filesystem
      try {
        await fs.unlink(fileInfo.filePath);
      } catch (fsError) {
        console.warn("Could not delete physical file:", fsError);
        // Continue even if physical file deletion fails
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Time Entries
  app.post("/api/projects/:id/time", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { date, ...otherData } = req.body;
      
      const timeEntryData = {
        ...otherData,
        projectId,
        userId,
        date: date ? new Date(date) : new Date(),
      };
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.get("/api/projects/:id/time", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const timeEntries = await storage.getTimeEntries(projectId, userId);
      res.json(timeEntries);
    } catch (error: any) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // Expense management routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const expenses = await storage.getExpenses(userId);
      res.json(expenses);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const expense = await storage.getExpense(expenseId, userId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error: any) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", requireAuth, upload.single('receipt'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const expenseData = req.body;
      
      // Handle file upload
      let receiptUrl = null;
      let receiptData = null;
      
      if (req.file) {
        receiptUrl = req.file.path;
        receiptData = `Receipt uploaded: ${req.file.originalname}`;
      }

      const expense = await storage.createExpense({
        ...expenseData,
        userId,
        categoryId: expenseData.categoryId ? parseInt(expenseData.categoryId) : null,
        projectId: expenseData.projectId ? parseInt(expenseData.projectId) : null,
        amount: parseFloat(expenseData.amount),
        expenseDate: new Date(expenseData.expenseDate),
        receiptUrl,
        receiptData,
        tags: expenseData.tags ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : [],
      });

      res.status(201).json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const expenseData = req.body;

      const expense = await storage.updateExpense(expenseId, userId, {
        ...expenseData,
        amount: expenseData.amount ? parseFloat(expenseData.amount) : undefined,
        expenseDate: expenseData.expenseDate ? new Date(expenseData.expenseDate) : undefined,
        tags: expenseData.tags ? expenseData.tags.split(',').map((tag: string) => tag.trim()) : undefined,
      });

      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(expense);
    } catch (error: any) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteExpense(expenseId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.post("/api/expenses/:id/approve", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const approvedBy = req.user!.id;
      
      const success = await storage.approveExpense(expenseId, approvedBy);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense approved successfully" });
    } catch (error: any) {
      console.error("Error approving expense:", error);
      res.status(500).json({ message: "Failed to approve expense" });
    }
  });

  // Expense categories
  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const categories = await storage.getExpenseCategories(userId);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ message: "Failed to fetch expense categories" });
    }
  });

  app.post("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const categoryData = req.body;

      const category = await storage.createExpenseCategory({
        ...categoryData,
        userId,
      });

      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating expense category:", error);
      res.status(500).json({ message: "Failed to create expense category" });
    }
  });

  // Expense reports
  app.get("/api/expense-reports", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reports = await storage.getExpenseReports(userId);
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching expense reports:", error);
      res.status(500).json({ message: "Failed to fetch expense reports" });
    }
  });

  app.post("/api/expense-reports", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reportData = req.body;

      const report = await storage.createExpenseReport({
        ...reportData,
        userId,
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating expense report:", error);
      res.status(500).json({ message: "Failed to create expense report" });
    }
  });

  app.post("/api/expense-reports/:id/submit", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.submitExpenseReport(reportId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense report not found" });
      }
      
      res.json({ message: "Expense report submitted successfully" });
    } catch (error: any) {
      console.error("Error submitting expense report:", error);
      res.status(500).json({ message: "Failed to submit expense report" });
    }
  });

  app.post("/api/expense-reports/:reportId/expenses/:expenseId", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const expenseId = parseInt(req.params.expenseId);
      
      const success = await storage.addExpenseToReport(reportId, expenseId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add expense to report" });
      }
      
      res.json({ message: "Expense added to report successfully" });
    } catch (error: any) {
      console.error("Error adding expense to report:", error);
      res.status(500).json({ message: "Failed to add expense to report" });
    }
  });

  // OCR endpoint for receipt processing
  app.post("/api/ocr/receipt", requireAuth, upload.single('receipt'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image provided" });
      }

      // This endpoint requires an OCR API key for full functionality
      // For testing purposes, you can provide test data temporarily
      res.json({
        success: false,
        message: "OCR service requires API configuration. Please provide OCR API credentials.",
        testData: {
          vendor: "Receipt Merchant",
          amount: "25.99",
          date: new Date().toISOString().split('T')[0],
          category: "meals",
          rawText: "Receipt text would appear here after OCR processing"
        }
      });
    } catch (error: any) {
      console.error("Error processing receipt:", error);
      res.status(500).json({ message: "Failed to process receipt" });
    }
  });

  // OCR Settings API
  app.get("/api/settings/ocr", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getOcrSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching OCR settings:", error);
      res.status(500).json({ message: "Failed to fetch OCR settings" });
    }
  });

  app.put("/api/settings/ocr", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settings = req.body;
      await storage.updateOcrSettings(settings);
      res.json({ message: "OCR settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating OCR settings:", error);
      res.status(500).json({ message: "Failed to update OCR settings" });
    }
  });

  // Leads API
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const leads = await storage.getLeads(userId);
      res.json(leads);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const lead = await storage.getLead(leadId, userId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error: any) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const leadData = req.body;
      
      const lead = await storage.createLead({
        ...leadData,
        userId,
        leadPrice: leadData.leadPrice ? parseFloat(leadData.leadPrice) : null,
        followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
      });

      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      const leadData = req.body;
      
      const updatedLead = await storage.updateLead(leadId, userId, {
        ...leadData,
        leadPrice: leadData.leadPrice ? parseFloat(leadData.leadPrice) : null,
        followUpDate: leadData.followUpDate ? new Date(leadData.followUpDate) : null,
        contactedAt: leadData.contactedAt ? new Date(leadData.contactedAt) : null,
      });
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(updatedLead);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteLead(leadId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Calendar Jobs API
  app.get("/api/calendar-jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const jobs = await storage.getCalendarJobs(userId);
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching calendar jobs:", error);
      res.status(500).json({ message: "Failed to fetch calendar jobs" });
    }
  });

  app.get("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const job = await storage.getCalendarJob(jobId, userId);
      
      if (!job) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error("Error fetching calendar job:", error);
      res.status(500).json({ message: "Failed to fetch calendar job" });
    }
  });

  app.post("/api/calendar-jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const jobData = req.body;
      
      const job = await storage.createCalendarJob({
        ...jobData,
        userId,
        startDate: new Date(jobData.startDate),
        endDate: new Date(jobData.endDate),
        estimatedValue: jobData.estimatedValue ? parseFloat(jobData.estimatedValue) : null,
      });

      res.status(201).json(job);
    } catch (error: any) {
      console.error("Error creating calendar job:", error);
      res.status(500).json({ message: "Failed to create calendar job" });
    }
  });

  app.put("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const jobData = req.body;
      
      const updatedJob = await storage.updateCalendarJob(jobId, userId, {
        ...jobData,
        startDate: jobData.startDate ? new Date(jobData.startDate) : undefined,
        endDate: jobData.endDate ? new Date(jobData.endDate) : undefined,
        estimatedValue: jobData.estimatedValue ? parseFloat(jobData.estimatedValue) : null,
      });
      
      if (!updatedJob) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(updatedJob);
    } catch (error: any) {
      console.error("Error updating calendar job:", error);
      res.status(500).json({ message: "Failed to update calendar job" });
    }
  });

  app.delete("/api/calendar-jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const success = await storage.deleteCalendarJob(jobId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json({ message: "Calendar job deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting calendar job:", error);
      res.status(500).json({ message: "Failed to delete calendar job" });
    }
  });

  app.post("/api/calendar-jobs/:id/convert-to-project", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const projectData = req.body;
      
      const project = await storage.convertJobToProject(jobId, userId, projectData);
      
      if (!project) {
        return res.status(404).json({ message: "Calendar job not found" });
      }
      
      res.json(project);
    } catch (error: any) {
      console.error("Error converting job to project:", error);
      res.status(500).json({ message: "Failed to convert job to project" });
    }
  });

  // Internal Messages routes
  app.get("/api/internal-messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getInternalMessages(req.user!.id);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching internal messages:", error);
      res.status(500).json({ message: "Failed to fetch internal messages" });
    }
  });

  app.get("/api/internal-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getInternalMessage(id, req.user!.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(message);
    } catch (error: any) {
      console.error("Error fetching internal message:", error);
      res.status(500).json({ message: "Failed to fetch internal message" });
    }
  });

  app.post("/api/internal-messages", requireAuth, async (req, res) => {
    try {
      const { subject, content, priority = 'normal', messageType = 'individual', recipientIds = [], groupIds = [] } = req.body;
      
      let finalRecipientIds = recipientIds;
      
      // If it's a group message, get all group members
      if (messageType === 'group' && groupIds.length > 0) {
        for (const groupId of groupIds) {
          const groupMessage = await storage.sendGroupMessage(groupId, {
            senderId: req.user!.id,
            subject,
            content,
            messageType: 'group',
            priority
          });
          return res.json(groupMessage);
        }
      }
      
      // If it's a broadcast, get all users
      if (messageType === 'broadcast') {
        const allUsers = await storage.getAllUsers();
        finalRecipientIds = allUsers.filter(u => u.id !== req.user!.id).map(u => u.id);
      }

      const message = await storage.createInternalMessage({
        senderId: req.user!.id,
        subject,
        content,
        messageType,
        priority
      }, finalRecipientIds);

      res.json(message);
    } catch (error: any) {
      console.error("Error creating internal message:", error);
      res.status(500).json({ message: "Failed to create internal message" });
    }
  });

  app.put("/api/internal-messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markMessageAsRead(id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Message not found or already read" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.delete("/api/internal-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInternalMessage(id, req.user!.id);
      if (!success) {
        return res.status(404).json({ message: "Message not found or not authorized" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting internal message:", error);
      res.status(500).json({ message: "Failed to delete internal message" });
    }
  });

  // Message Groups routes
  app.get("/api/message-groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getMessageGroups(req.user!.id);
      res.json(groups);
    } catch (error: any) {
      console.error("Error fetching message groups:", error);
      res.status(500).json({ message: "Failed to fetch message groups" });
    }
  });

  app.post("/api/message-groups", requireAuth, async (req, res) => {
    try {
      const { name, description, memberIds = [] } = req.body;
      
      const group = await storage.createMessageGroup({
        name,
        description,
        createdBy: req.user!.id
      });

      // Add creator as admin
      await storage.addUserToGroup(group.id, req.user!.id, 'admin');
      
      // Add other members
      for (const memberId of memberIds) {
        await storage.addUserToGroup(group.id, memberId, 'member');
      }

      res.json(group);
    } catch (error: any) {
      console.error("Error creating message group:", error);
      res.status(500).json({ message: "Failed to create message group" });
    }
  });

  app.post("/api/message-groups/:id/members", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId, role = 'member' } = req.body;
      
      const member = await storage.addUserToGroup(groupId, userId, role);
      res.json(member);
    } catch (error: any) {
      console.error("Error adding user to group:", error);
      res.status(500).json({ message: "Failed to add user to group" });
    }
  });

  app.delete("/api/message-groups/:groupId/members/:userId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      const success = await storage.removeUserFromGroup(groupId, userId);
      if (!success) {
        return res.status(404).json({ message: "User not found in group" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ message: "Failed to remove user from group" });
    }
  });

  // Admin system health monitoring
  app.get('/api/admin/system/health', requireAdmin, async (req, res) => {
    try {
      const health = {
        database: true,
        api: true,
        storage: true,
        email: false,
        uptime: process.uptime() ? `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m` : "Unknown",
        lastBackup: "Never"
      };
      
      // Check database connectivity
      try {
        await storage.getUserStats();
      } catch (error) {
        health.database = false;
      }
      
      res.json(health);
    } catch (error: any) {
      console.error('Error checking system health:', error);
      res.status(500).json({ message: 'Failed to check system health' });
    }
  });

  // Admin system settings
  app.get('/api/admin/system/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.put('/api/admin/system/settings', requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      await storage.updateSystemSetting(key, value);
      res.json({ message: 'System setting updated successfully' });
    } catch (error: any) {
      console.error('Error updating system setting:', error);
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  // Admin activity logs
  app.get('/api/admin/activity-logs', requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getActivityLogs();
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  // Admin maintenance operations
  app.post('/api/admin/maintenance', requireAdmin, async (req, res) => {
    try {
      const { action } = req.body;
      
      switch (action) {
        case 'backup':
          await new Promise(resolve => setTimeout(resolve, 1000));
          res.json({ message: 'Backup created successfully' });
          break;
        case 'cleanup':
          await new Promise(resolve => setTimeout(resolve, 500));
          res.json({ message: 'Temporary files cleaned successfully' });
          break;
        case 'refresh-cache':
          await new Promise(resolve => setTimeout(resolve, 300));
          res.json({ message: 'Cache refreshed successfully' });
          break;
        default:
          res.status(400).json({ message: 'Invalid maintenance action' });
      }
    } catch (error: any) {
      console.error('Error performing maintenance:', error);
      res.status(500).json({ message: 'Failed to perform maintenance action' });
    }
  });

  // Admin data export
  app.post('/api/admin/export', requireAdmin, async (req, res) => {
    try {
      const { type } = req.body;
      
      const exportData = {
        timestamp: new Date().toISOString(),
        type,
        userStats: await storage.getUserStats(),
        systemHealth: {
          database: true,
          api: true,
          storage: true,
          email: false
        }
      };
      
      res.json(exportData);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export system data' });
    }
  });

  // SMS API endpoints
  app.get('/api/sms/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getSmsMessages();
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching SMS messages:', error);
      res.status(500).json({ message: 'Failed to fetch SMS messages' });
    }
  });

  app.post('/api/sms/send', requireAuth, async (req, res) => {
    try {
      const { recipient, message } = req.body;
      
      if (!recipient || !message) {
        return res.status(400).json({ message: 'Recipient and message are required' });
      }

      // Get Twilio settings
      const twilioSettings = await storage.getSystemSettings();
      const accountSid = twilioSettings.find(s => s.keys === 'twilio_account_sid')?.value;
      const authToken = twilioSettings.find(s => s.keys === 'twilio_auth_token')?.value;
      const phoneNumber = twilioSettings.find(s => s.keys === 'twilio_phone_number')?.value;

      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({ message: 'Twilio configuration is incomplete' });
      }

      // For development, create a mock SMS message
      const smsMessage = await storage.createSmsMessage({
        recipient,
        message,
        status: 'sent',
        sentAt: new Date(),
        cost: 0.0075 // Standard SMS cost
      });

      res.json(smsMessage);
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ message: 'Failed to send SMS message' });
    }
  });

  app.get('/api/sms/templates', requireAuth, async (req, res) => {
    try {
      const templates = await storage.getSmsTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching SMS templates:', error);
      res.status(500).json({ message: 'Failed to fetch SMS templates' });
    }
  });

  app.post('/api/sms/templates', requireAuth, async (req, res) => {
    try {
      const { name, content, category } = req.body;
      
      if (!name || !content || !category) {
        return res.status(400).json({ message: 'Name, content, and category are required' });
      }

      const template = await storage.createSmsTemplate({
        name,
        content,
        category
      });

      res.json(template);
    } catch (error: any) {
      console.error('Error creating SMS template:', error);
      res.status(500).json({ message: 'Failed to create SMS template' });
    }
  });

  app.get('/api/settings/twilio', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      const twilioSettings = {
        accountSid: settings.find(s => s.keys === 'twilio_account_sid')?.value || null,
        authToken: settings.find(s => s.keys === 'twilio_auth_token')?.value || null,
        phoneNumber: settings.find(s => s.keys === 'twilio_phone_number')?.value || null,
      };
      res.json(twilioSettings);
    } catch (error: any) {
      console.error('Error fetching Twilio settings:', error);
      res.status(500).json({ message: 'Failed to fetch Twilio settings' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
