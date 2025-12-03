import { Express } from 'express';
import { requireAuth } from '../auth';
import * as stripeConnectService from '../services/stripeConnect';
import { db } from '../db';
import { settings } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export function registerStripeConnectRoutes(app: Express) {
  // Get Stripe API keys status (never returns actual secret key)
  app.get('/api/stripe-connect/keys', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const orgId = user.organizationId;
      
      // Get publishable key
      const publishableKeySetting = await db
        .select()
        .from(settings)
        .where(and(
          eq(settings.organizationId, orgId),
          eq(settings.key, 'stripe_publishable_key')
        ))
        .limit(1);
      
      // Check if secret key exists (don't return actual value)
      const secretKeySetting = await db
        .select()
        .from(settings)
        .where(and(
          eq(settings.organizationId, orgId),
          eq(settings.key, 'stripe_secret_key')
        ))
        .limit(1);
      
      res.json({
        stripePublishableKey: publishableKeySetting[0]?.value || '',
        hasSecretKey: !!secretKeySetting[0]?.value,
      });
    } catch (error: any) {
      console.error('Error getting Stripe keys:', error);
      res.status(500).json({ message: error.message || 'Failed to get Stripe keys' });
    }
  });

  // Save Stripe API keys
  app.post('/api/stripe-connect/keys', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const orgId = user.organizationId;
      const { publishableKey, secretKey } = req.body;

      // Validate keys format
      if (publishableKey && !publishableKey.startsWith('pk_')) {
        return res.status(400).json({ message: 'Invalid publishable key format. Should start with pk_' });
      }
      if (secretKey && !secretKey.startsWith('sk_')) {
        return res.status(400).json({ message: 'Invalid secret key format. Should start with sk_' });
      }

      // Only admin can update keys
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can update Stripe keys' });
      }

      // Save publishable key
      if (publishableKey) {
        const existingPublishable = await db
          .select()
          .from(settings)
          .where(and(
            eq(settings.organizationId, orgId),
            eq(settings.key, 'stripe_publishable_key')
          ))
          .limit(1);

        if (existingPublishable.length > 0) {
          await db
            .update(settings)
            .set({ value: publishableKey })
            .where(and(
              eq(settings.organizationId, orgId),
              eq(settings.key, 'stripe_publishable_key')
            ));
        } else {
          await db.insert(settings).values({
            organizationId: orgId,
            key: 'stripe_publishable_key',
            value: publishableKey,
          });
        }
      }

      // Save secret key (only if provided)
      if (secretKey) {
        const existingSecret = await db
          .select()
          .from(settings)
          .where(and(
            eq(settings.organizationId, orgId),
            eq(settings.key, 'stripe_secret_key')
          ))
          .limit(1);

        if (existingSecret.length > 0) {
          await db
            .update(settings)
            .set({ value: secretKey })
            .where(and(
              eq(settings.organizationId, orgId),
              eq(settings.key, 'stripe_secret_key')
            ));
        } else {
          await db.insert(settings).values({
            organizationId: orgId,
            key: 'stripe_secret_key',
            value: secretKey,
          });
        }
      }

      res.json({ success: true, message: 'Stripe keys saved successfully' });
    } catch (error: any) {
      console.error('Error saving Stripe keys:', error);
      res.status(500).json({ message: error.message || 'Failed to save Stripe keys' });
    }
  });
  // Get Stripe Connect account status
  app.get('/api/stripe-connect/status', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const status = await stripeConnectService.getConnectAccountStatus(user.organizationId);
      res.json(status);
    } catch (error: any) {
      console.error('Error getting Connect status:', error);
      res.status(500).json({ message: error.message || 'Failed to get account status' });
    }
  });

  // Create new Stripe Connect account
  app.post('/api/stripe-connect/create-account', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const onboardingUrl = await stripeConnectService.createAccountLink({
        organizationId: user.organizationId,
        email: user.email!,
        refreshUrl: `${baseUrl}/settings?tab=payment&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payment&success=true`,
      });

      res.json({ url: onboardingUrl });
    } catch (error: any) {
      console.error('Error creating account:', error);
      res.status(500).json({ message: error.message || 'Failed to create account' });
    }
  });

  // Create account link for onboarding/updating info
  app.post('/api/stripe-connect/create-account-link', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const onboardingUrl = await stripeConnectService.createAccountLink({
        organizationId: user.organizationId,
        email: user.email!,
        refreshUrl: `${baseUrl}/settings?tab=payment&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payment&success=true`,
      });

      res.json({ url: onboardingUrl });
    } catch (error: any) {
      console.error('Error creating account link:', error);
      res.status(500).json({ message: error.message || 'Failed to create account link' });
    }
  });

  // Create dashboard link
  app.post('/api/stripe-connect/dashboard-link', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const dashboardUrl = await stripeConnectService.createDashboardLink(user.organizationId);
      res.json({ url: dashboardUrl });
    } catch (error: any) {
      console.error('Error creating dashboard link:', error);
      res.status(500).json({ message: error.message || 'Failed to create dashboard link' });
    }
  });

  // Legacy route for backwards compatibility
  app.post('/api/stripe-connect/onboard', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const onboardingUrl = await stripeConnectService.createAccountLink({
        organizationId: user.organizationId,
        email: user.email!,
        refreshUrl: `${baseUrl}/settings?tab=payment&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payment&success=true`,
      });

      res.json({ url: onboardingUrl });
    } catch (error: any) {
      console.error('Error creating onboarding link:', error);
      res.status(500).json({ message: error.message || 'Failed to create onboarding link' });
    }
  });

  // Refresh Connect onboarding (if user didn't complete)
  app.post('/api/stripe-connect/refresh-onboarding', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const onboardingUrl = await stripeConnectService.createAccountLink({
        organizationId: user.organizationId,
        email: user.email!,
        refreshUrl: `${baseUrl}/settings?tab=payment&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payment&success=true`,
      });

      res.json({ url: onboardingUrl });
    } catch (error: any) {
      console.error('Error refreshing onboarding:', error);
      res.status(500).json({ message: error.message || 'Failed to refresh onboarding' });
    }
  });

  // Disconnect Stripe Connect account
  app.post('/api/stripe-connect/disconnect', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      // Only admin can disconnect
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can disconnect Stripe Connect' });
      }

      await stripeConnectService.disconnectConnectAccount(user.organizationId);
      res.json({ success: true, message: 'Stripe Connect account disconnected successfully' });
    } catch (error: any) {
      console.error('Error disconnecting Connect:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect account' });
    }
  });

  // Create payment intent with platform fee
  app.post('/api/stripe-connect/create-payment-intent', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { amount, currency = 'usd', description, metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount' });
      }

      const paymentIntent = await stripeConnectService.createPaymentIntentWithFee({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        organizationId: user.organizationId,
        description,
        metadata,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: error.message || 'Failed to create payment intent' });
    }
  });
}
