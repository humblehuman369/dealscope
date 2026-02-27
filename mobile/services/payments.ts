/**
 * Payment abstraction layer — RevenueCat SDK wrapper.
 *
 * Unified interface for IAP (iOS via Apple) and Stripe (Android).
 * RevenueCat handles routing automatically based on Platform.OS.
 *
 * Products configured in App Store Connect / RevenueCat:
 * - pro_monthly: $29/month with 7-day trial
 * - pro_annual: $290/year with 7-day trial
 */

import { Platform } from 'react-native';
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesEntitlementInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '';
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '';
const PRO_ENTITLEMENT_ID = 'pro';

let _initialized = false;

// ---------------------------------------------------------------------------
// Subscription state — covers all edge cases
// ---------------------------------------------------------------------------

export type SubscriptionPeriodType = 'trial' | 'paid' | 'grace' | 'none';

export interface DetailedSubscriptionStatus {
  isPro: boolean;
  periodType: SubscriptionPeriodType;
  expiresDate: string | null;
  willRenew: boolean;
  /** Trial is active and will expire soon (< 2 days) */
  trialExpiringSoon: boolean;
  /** User cancelled but access lasts until period end */
  cancelledButActive: boolean;
  /** Payment failed, in billing retry grace period */
  inGracePeriod: boolean;
  /** Subscription was refunded — access revoked */
  wasRefunded: boolean;
  /** Original purchase date for this entitlement */
  originalPurchaseDate: string | null;
  /** Product identifier (pro_monthly, pro_annual) */
  productId: string | null;
}

function deriveStatus(entitlement: PurchasesEntitlementInfo | undefined): DetailedSubscriptionStatus {
  if (!entitlement) {
    return {
      isPro: false,
      periodType: 'none',
      expiresDate: null,
      willRenew: false,
      trialExpiringSoon: false,
      cancelledButActive: false,
      inGracePeriod: false,
      wasRefunded: false,
      originalPurchaseDate: null,
      productId: null,
    };
  }

  const now = Date.now();
  const expires = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).getTime()
    : null;

  const isActive = entitlement.isActive;
  const willRenew = entitlement.willRenew;

  // Period type detection
  let periodType: SubscriptionPeriodType = 'none';
  if (isActive) {
    const periodRaw = (entitlement as any).periodType;
    if (periodRaw === 'trial' || periodRaw === 'TRIAL') {
      periodType = 'trial';
    } else if (
      (entitlement as any).billingIssueDetectedAt ||
      (entitlement as any).billingIssueDetectedAtMillis
    ) {
      periodType = 'grace';
    } else {
      periodType = 'paid';
    }
  }

  // Trial expiring soon: < 2 days remaining
  const trialExpiringSoon =
    periodType === 'trial' &&
    expires != null &&
    expires - now < 2 * 24 * 60 * 60 * 1000 &&
    expires - now > 0;

  // Cancelled but still active until period end
  const cancelledButActive = isActive && !willRenew;

  // Grace period: billing issue detected but still active
  const inGracePeriod =
    isActive &&
    !!((entitlement as any).billingIssueDetectedAt ||
      (entitlement as any).billingIssueDetectedAtMillis);

  // Refund detection: not active, has unsubscribed date, no expiration in future
  const wasRefunded =
    !isActive &&
    !!(entitlement as any).unsubscribeDetectedAt &&
    (expires == null || expires < now);

  return {
    isPro: isActive,
    periodType,
    expiresDate: entitlement.expirationDate ?? null,
    willRenew,
    trialExpiringSoon,
    cancelledButActive,
    inGracePeriod,
    wasRefunded,
    originalPurchaseDate: (entitlement as any).originalPurchaseDate ?? null,
    productId: entitlement.productIdentifier ?? null,
  };
}

// ---------------------------------------------------------------------------
// SDK lifecycle
// ---------------------------------------------------------------------------

export async function initPayments(): Promise<void> {
  if (_initialized) return;
  const apiKey = Platform.OS === 'ios' ? APPLE_KEY : GOOGLE_KEY;
  if (!apiKey) {
    console.log('[Payments] No RevenueCat API key — skipping init');
    return;
  }
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    _initialized = true;
  } catch (err) {
    console.error('[Payments] Failed to configure RevenueCat:', err);
  }
}

export async function identifyUser(userId: string): Promise<void> {
  if (!_initialized) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.error('[Payments] Failed to identify user:', err);
  }
}

export async function resetUser(): Promise<void> {
  if (!_initialized) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('[Payments] Failed to reset user:', err);
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!_initialized) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.error('[Payments] Failed to get offerings:', err);
    return null;
  }
}

export async function getDetailedSubscriptionStatus(): Promise<DetailedSubscriptionStatus> {
  if (!_initialized) {
    return deriveStatus(undefined);
  }
  try {
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID]
      ?? info.entitlements.all[PRO_ENTITLEMENT_ID];
    return deriveStatus(entitlement);
  } catch (err) {
    console.error('[Payments] Failed to get subscription status:', err);
    return deriveStatus(undefined);
  }
}

/** Backwards-compatible simple status check. */
export async function getSubscriptionStatus(): Promise<{
  isPro: boolean;
  expiresDate: string | null;
  willRenew: boolean;
}> {
  const detailed = await getDetailedSubscriptionStatus();
  return {
    isPro: detailed.isPro,
    expiresDate: detailed.expiresDate,
    willRenew: detailed.willRenew,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  if (!_initialized) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err: any) {
    if (err.userCancelled) return null;
    throw err;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!_initialized) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.error('[Payments] Failed to restore purchases:', err);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!_initialized) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('[Payments] Failed to get customer info:', err);
    return null;
  }
}

export function isPaymentsInitialized(): boolean {
  return _initialized;
}
