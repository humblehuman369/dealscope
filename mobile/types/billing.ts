/**
 * Billing and Subscription types - matching backend schemas/billing.py exactly
 */

import { SubscriptionTier, SubscriptionStatus } from './api';

// ===========================================
// Plan Feature
// ===========================================
export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
  limit?: string | null; // e.g., "100/month"
}

// ===========================================
// Pricing Plan
// ===========================================
export interface PricingPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description: string;
  price_monthly: number; // Price in cents
  price_yearly: number; // Price in cents (yearly total)
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
  features: PlanFeature[];
  is_popular: boolean;
  properties_limit: number;
  searches_per_month: number;
  api_calls_per_month: number;
}

// ===========================================
// Pricing Plans Response
// ===========================================
export interface PricingPlansResponse {
  plans: PricingPlan[];
}

// ===========================================
// Subscription Response
// ===========================================
export interface SubscriptionResponse {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;

  // Limits
  properties_limit: number;
  searches_per_month: number;
  api_calls_per_month: number;

  // Usage
  searches_used: number;
  api_calls_used: number;
  usage_reset_date?: string | null;

  created_at: string;
  updated_at: string;
}

// ===========================================
// Usage Response
// ===========================================
export interface UsageResponse {
  tier: SubscriptionTier;

  // Properties
  properties_saved: number;
  properties_limit: number;
  properties_remaining: number;

  // Searches
  searches_used: number;
  searches_limit: number;
  searches_remaining: number;

  // API calls
  api_calls_used: number;
  api_calls_limit: number;
  api_calls_remaining: number;

  // Reset info
  usage_reset_date?: string | null;
  days_until_reset?: number | null;
}

// ===========================================
// Checkout Request
// ===========================================
export interface CreateCheckoutRequest {
  price_id: string;
  success_url?: string | null;
  cancel_url?: string | null;
}

// ===========================================
// Checkout Session Response
// ===========================================
export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

// ===========================================
// Portal Session Response
// ===========================================
export interface PortalSessionResponse {
  portal_url: string;
}

// ===========================================
// Cancel Subscription Request
// ===========================================
export interface CancelSubscriptionRequest {
  cancel_immediately: boolean;
  reason?: string | null;
}

// ===========================================
// Cancel Subscription Response
// ===========================================
export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  cancel_at_period_end: boolean;
  current_period_end?: string | null;
}

// ===========================================
// Payment History Item
// ===========================================
export interface PaymentHistoryItem {
  id: string;
  amount: number; // In cents
  currency: string;
  status: string;
  description?: string | null;
  invoice_pdf_url?: string | null;
  receipt_url?: string | null;
  created_at: string;
}

// ===========================================
// Payment History Response
// ===========================================
export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
  total_count: number;
  has_more: boolean;
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Format price from cents to dollars string
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format monthly price from yearly cents
 */
export function formatMonthlyFromYearly(yearlyCents: number): string {
  return `$${(yearlyCents / 100 / 12).toFixed(2)}`;
}

/**
 * Calculate savings percentage for yearly vs monthly
 */
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyIfMonthly = monthlyPrice * 12;
  return Math.round(((yearlyIfMonthly - yearlyPrice) / yearlyIfMonthly) * 100);
}
