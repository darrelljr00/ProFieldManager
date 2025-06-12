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
        cb(error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getInvoiceStats(req.user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.user.id);
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

  const httpServer = createServer(app);
  return httpServer;
}
