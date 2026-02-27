/**
 * Payment abstraction layer — RevenueCat SDK wrapper.
 *
 * Unified interface for IAP (iOS via Apple) and Stripe (Android).
 * RevenueCat handles routing automatically based on Platform.OS.
 *
 * Configuration:
 * - EXPO_PUBLIC_REVENUECAT_APPLE_KEY for iOS
 * - EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY for Android (Stripe via RevenueCat)
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
  LOG_LEVEL,
} from 'react-native-purchases';

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '';
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '';

const PRO_ENTITLEMENT_ID = 'pro';

let _initialized = false;

/**
 * Initialize RevenueCat SDK. Call once at app startup.
 * No-ops if API keys are missing (development mode).
 */
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

/**
 * Identify the logged-in user so RevenueCat can track their entitlements
 * across devices and platforms.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!_initialized) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.error('[Payments] Failed to identify user:', err);
  }
}

/**
 * Reset identity on logout so the next user starts fresh.
 */
export async function resetUser(): Promise<void> {
  if (!_initialized) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('[Payments] Failed to reset user:', err);
  }
}

/**
 * Fetch available offerings (plans/packages).
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!_initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (err) {
    console.error('[Payments] Failed to get offerings:', err);
    return null;
  }
}

/**
 * Initiate a purchase. RevenueCat handles IAP on iOS and Stripe on Android.
 * Returns the updated CustomerInfo on success, or null on cancel/error.
 */
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

/**
 * Restore previous purchases (e.g., after reinstall or new device).
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!_initialized) return null;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (err) {
    console.error('[Payments] Failed to restore purchases:', err);
    return null;
  }
}

/**
 * Check whether the current user has the Pro entitlement.
 */
export async function getSubscriptionStatus(): Promise<{
  isPro: boolean;
  expiresDate: string | null;
  willRenew: boolean;
}> {
  if (!_initialized) {
    return { isPro: false, expiresDate: null, willRenew: false };
  }
  try {
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
    return {
      isPro: !!entitlement,
      expiresDate: entitlement?.expirationDate ?? null,
      willRenew: entitlement?.willRenew ?? false,
    };
  } catch (err) {
    console.error('[Payments] Failed to get subscription status:', err);
    return { isPro: false, expiresDate: null, willRenew: false };
  }
}

/**
 * Get the full CustomerInfo object for detailed status checks.
 */
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
