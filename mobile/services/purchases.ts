import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

const ENTITLEMENT_ID = 'pro';

export const PRODUCT_IDS = {
  proMonthly: 'dealgapiq_pro_monthly',
  proAnnual: 'dealgapiq_pro_annual',
} as const;

let initialized = false;

export async function initPurchases(userId?: string) {
  if (initialized) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  if (!apiKey) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  initialized = true;
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

export function isPro(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export function isTrialActive(info: CustomerInfo): boolean {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return false;
  return ent.periodType === 'TRIAL';
}

export function trialExpirationDate(info: CustomerInfo): Date | null {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent?.expirationDate) return null;
  return new Date(ent.expirationDate);
}

export async function purchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function logInUser(userId: string) {
  if (!initialized) return;
  await Purchases.logIn(userId);
}

export async function logOutUser() {
  if (!initialized) return;
  await Purchases.logOut();
}
