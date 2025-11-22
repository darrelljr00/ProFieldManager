import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = process.env.PAYMENT_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

export interface PaymentTokenPayload {
  type: 'invoice' | 'quote';
  id: number;
  organizationId: number;
  amount: string;
  currency: string;
  expiresAt: number; // Timestamp
}

/**
 * Generate a secure, signed payment token for invoice/quote payment links
 * Token expires in 90 days by default
 */
export function generatePaymentToken(
  type: 'invoice' | 'quote',
  id: number,
  organizationId: number,
  amount: string,
  currency: string,
  expiryDays: number = 90
): string {
  const payload: PaymentTokenPayload = {
    type,
    id,
    organizationId,
    amount,
    currency,
    expiresAt: Date.now() + (expiryDays * 24 * 60 * 60 * 1000),
  };

  return jwt.sign(payload, SECRET, {
    algorithm: 'HS256',
    expiresIn: `${expiryDays}d`,
  });
}

/**
 * Verify and decode a payment token
 * Returns payload if valid, throws error if invalid/expired
 */
export function verifyPaymentToken(token: string): PaymentTokenPayload {
  try {
    const payload = jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
    }) as PaymentTokenPayload;

    // Additional expiry check
    if (payload.expiresAt < Date.now()) {
      throw new Error('Payment link has expired');
    }

    return payload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Payment link has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid payment link');
    }
    throw error;
  }
}

/**
 * Validate that token matches the expected invoice/quote details
 * Prevents token reuse for different invoices
 */
export function validatePaymentToken(
  token: PaymentTokenPayload,
  expectedType: 'invoice' | 'quote',
  expectedId: number,
  expectedOrgId: number,
  expectedAmount: string,
  expectedCurrency: string
): boolean {
  return (
    token.type === expectedType &&
    token.id === expectedId &&
    token.organizationId === expectedOrgId &&
    token.amount === expectedAmount &&
    token.currency.toLowerCase() === expectedCurrency.toLowerCase()
  );
}
