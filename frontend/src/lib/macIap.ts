/**
 * Typed client for the native macOS WKWebView ↔ RevenueCat bridge
 * (`window.DealGapIQMac.iap` injected by frontend/macos).
 */

import type { RCPackage } from '@/hooks/useRevenueCat'

export interface MacIapBridge {
  configure: (apiKey: string) => Promise<unknown>
  logIn: (appUserID: string) => Promise<unknown>
  getOfferings: () => Promise<{ packages: RCPackage[] }>
  purchasePackage: (packageId: string) => Promise<unknown>
  restorePurchases: () => Promise<unknown>
}

type DealGapIQMacGlobal = {
  iap?: MacIapBridge
}

export function getMacIapBridge(): MacIapBridge | null {
  if (typeof window === 'undefined') return null
  const mac = (window as Window & { DealGapIQMac?: DealGapIQMacGlobal }).DealGapIQMac
  return mac?.iap ?? null
}

export function isMacIapAvailable(): boolean {
  return getMacIapBridge() != null
}
