import { Express } from 'express';
import { requireAuth } from '../auth';
import * as stripeConnectService from '../services/stripeConnect';

export function registerStripeConnectRoutes(app: Express) {
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

  // Create Connect onboarding link
  app.post('/api/stripe-connect/onboard', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const onboardingUrl = await stripeConnectService.createAccountLink({
        organizationId: user.organizationId,
        email: user.email!,
        refreshUrl: `${baseUrl}/settings?tab=payments&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payments&success=true`,
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
        refreshUrl: `${baseUrl}/settings?tab=payments&refresh=true`,
        returnUrl: `${baseUrl}/settings?tab=payments&success=true`,
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
