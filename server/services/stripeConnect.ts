import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export interface ConnectOnboardingParams {
  organizationId: number;
  email: string;
  refreshUrl: string;
  returnUrl: string;
}

export interface ConnectAccountStatus {
  isConnected: boolean;
  accountId?: string;
  hasCompletedOnboarding: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

/**
 * Create a Stripe Connect Express account for an organization
 */
export async function createConnectAccount(organizationId: number, email: string): Promise<string> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
          },
        },
      },
    });

    // Update organization with Connect account ID
    await db.update(organizations)
      .set({
        stripeConnectAccountId: account.id,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    return account.id;
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    throw new Error(`Failed to create Connect account: ${error.message}`);
  }
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(params: ConnectOnboardingParams): Promise<string> {
  try {
    // Get or create the Connect account
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.organizationId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    let accountId = org.stripeConnectAccountId;

    // Create account if it doesn't exist
    if (!accountId) {
      accountId = await createConnectAccount(params.organizationId, params.email);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error: any) {
    console.error('Error creating account link:', error);
    throw new Error(`Failed to create account link: ${error.message}`);
  }
}

/**
 * Get the status of a Connect account
 */
export async function getConnectAccountStatus(organizationId: number): Promise<ConnectAccountStatus> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org || !org.stripeConnectAccountId) {
      return {
        isConnected: false,
        hasCompletedOnboarding: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    // Fetch account from Stripe
    const account = await stripe.accounts.retrieve(org.stripeConnectAccountId);

    // Update local database with latest status
    await db.update(organizations)
      .set({
        stripeConnectOnboardingComplete: account.charges_enabled && account.payouts_enabled,
        stripeConnectChargesEnabled: account.charges_enabled,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        stripeConnectDetailsSubmitted: account.details_submitted,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    return {
      isConnected: true,
      accountId: account.id,
      hasCompletedOnboarding: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements ? {
        currently_due: account.requirements.currently_due || [],
        eventually_due: account.requirements.eventually_due || [],
        past_due: account.requirements.past_due || [],
      } : undefined,
    };
  } catch (error: any) {
    console.error('Error getting Connect account status:', error);
    throw new Error(`Failed to get account status: ${error.message}`);
  }
}

/**
 * Create a dashboard login link for a connected account
 */
export async function createDashboardLink(organizationId: number): Promise<string> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org || !org.stripeConnectAccountId) {
      throw new Error('No Stripe Connect account found');
    }

    const loginLink = await stripe.accounts.createLoginLink(org.stripeConnectAccountId);
    return loginLink.url;
  } catch (error: any) {
    console.error('Error creating dashboard link:', error);
    throw new Error(`Failed to create dashboard link: ${error.message}`);
  }
}

/**
 * Disconnect a Stripe Connect account
 */
export async function disconnectConnectAccount(organizationId: number): Promise<void> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org || !org.stripeConnectAccountId) {
      throw new Error('No Connect account found');
    }

    // Delete the account from Stripe
    await stripe.accounts.del(org.stripeConnectAccountId);

    // Clear Connect fields in database
    await db.update(organizations)
      .set({
        stripeConnectAccountId: null,
        stripeConnectOnboardingComplete: false,
        stripeConnectChargesEnabled: false,
        stripeConnectPayoutsEnabled: false,
        stripeConnectDetailsSubmitted: false,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  } catch (error: any) {
    console.error('Error disconnecting Connect account:', error);
    throw new Error(`Failed to disconnect account: ${error.message}`);
  }
}

/**
 * Create a payment intent on a connected account with platform fee
 */
export async function createPaymentIntentWithFee(params: {
  amount: number;
  currency: string;
  organizationId: number;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.organizationId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    if (!org.stripeConnectAccountId) {
      throw new Error('Organization has not connected Stripe account');
    }

    if (!org.stripeConnectChargesEnabled) {
      throw new Error('Stripe account is not enabled for charges');
    }

    // Calculate platform fee (in cents)
    const platformFeePercentage = parseFloat(org.platformFeePercentage || '2.5');
    const platformFee = Math.round(params.amount * (platformFeePercentage / 100));

    // Create payment intent on connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      application_fee_amount: platformFee,
      description: params.description,
      metadata: params.metadata || {},
    }, {
      stripeAccount: org.stripeConnectAccountId,
    });

    return paymentIntent;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment: ${error.message}`);
  }
}

export default {
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  createDashboardLink,
  disconnectConnectAccount,
  createPaymentIntentWithFee,
};
