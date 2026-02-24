/**
 * Billing Service - Subscription and payment management
 *
 * Handles billing plans, subscription status, usage tracking,
 * and Stripe integration.
 */

import { api } from './apiClient';
import {
  PricingPlansResponse,
  SubscriptionResponse,
  UsageResponse,
  CreateCheckoutRequest,
  CheckoutSessionResponse,
  PortalSessionResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  PaymentHistoryResponse,
} from '../types';

// API Endpoints
const ENDPOINTS = {
  PLANS: '/api/v1/billing/plans',
  SUBSCRIPTION: '/api/v1/billing/subscription',
  USAGE: '/api/v1/billing/usage',
  CANCEL: '/api/v1/billing/subscription/cancel',
  CHECKOUT: '/api/v1/billing/checkout',
  PORTAL: '/api/v1/billing/portal',
  PAYMENTS: '/api/v1/billing/payments',
};

// ===========================================
// Plans Endpoints
// ===========================================

/**
 * Get available pricing plans
 */
export async function getPlans(): Promise<PricingPlansResponse> {
  return api.get<PricingPlansResponse>(ENDPOINTS.PLANS);
}

// ===========================================
// Subscription Endpoints
// ===========================================

/**
 * Get current subscription details
 */
export async function getSubscription(): Promise<SubscriptionResponse> {
  return api.get<SubscriptionResponse>(ENDPOINTS.SUBSCRIPTION);
}

/**
 * Get current usage statistics
 */
export async function getUsage(): Promise<UsageResponse> {
  return api.get<UsageResponse>(ENDPOINTS.USAGE);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  request: CancelSubscriptionRequest
): Promise<CancelSubscriptionResponse> {
  return api.post<CancelSubscriptionResponse>(ENDPOINTS.CANCEL, request);
}

// ===========================================
// Checkout & Portal Endpoints
// ===========================================

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  request: CreateCheckoutRequest
): Promise<CheckoutSessionResponse> {
  return api.post<CheckoutSessionResponse>(ENDPOINTS.CHECKOUT, request);
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(): Promise<PortalSessionResponse> {
  return api.post<PortalSessionResponse>(ENDPOINTS.PORTAL, {});
}

// ===========================================
// Payment History Endpoints
// ===========================================

/**
 * Get payment history
 */
export async function getPaymentHistory(
  limit: number = 10
): Promise<PaymentHistoryResponse> {
  return api.get<PaymentHistoryResponse>(ENDPOINTS.PAYMENTS, { limit });
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Check if user is on free tier
 */
export function isFreeTier(subscription: SubscriptionResponse): boolean {
  return subscription.tier === 'free';
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: SubscriptionResponse): boolean {
  return ['active', 'trialing'].includes(subscription.status);
}

/**
 * Check if user has reached property limit
 */
export function hasReachedPropertyLimit(usage: UsageResponse): boolean {
  return usage.properties_remaining <= 0;
}

/**
 * Check if user has reached search limit
 */
export function hasReachedSearchLimit(usage: UsageResponse): boolean {
  return usage.searches_remaining <= 0;
}

/**
 * Get usage percentage for a resource
 */
export function getUsagePercentage(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number, yearly = false): string {
  const dollars = cents / 100;
  if (yearly) {
    return `$${dollars.toFixed(2)}/year`;
  }
  return `$${dollars.toFixed(2)}/month`;
}

// ===========================================
// Setup Intent & Subscribe Endpoints (M5 parity)
// ===========================================

/**
 * Create a Stripe setup intent for saving a payment method
 */
export async function setupIntent(): Promise<{ client_secret: string }> {
  return api.post<{ client_secret: string }>('/api/v1/billing/setup-intent', {});
}

/**
 * Subscribe to a plan directly (alternative to checkout flow)
 */
export async function subscribe(
  priceId: string,
): Promise<{ subscription_id: string; status: string }> {
  return api.post<{ subscription_id: string; status: string }>(
    '/api/v1/billing/subscribe',
    { price_id: priceId },
  );
}

// ===========================================
// Export as billingService object
// ===========================================
export const billingService = {
  // Plans
  getPlans,

  // Subscription
  getSubscription,
  getUsage,
  cancelSubscription,

  // Checkout & Portal
  createCheckoutSession,
  createPortalSession,
  setupIntent,
  subscribe,

  // Payment History
  getPaymentHistory,

  // Helpers
  isFreeTier,
  isSubscriptionActive,
  hasReachedPropertyLimit,
  hasReachedSearchLimit,
  getUsagePercentage,
  formatPrice,
};

export default billingService;
