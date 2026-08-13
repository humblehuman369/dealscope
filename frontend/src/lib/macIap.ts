/**
 * Bridge to the native macOS RevenueCat / StoreKit shell.
 *
 * The Mac WKWebView injects `window.DealGapIQMac.iap` from Swift
 * (`RevenueCatBridge.swift`). This module is the only frontend touchpoint
 * for that bridge — keep all Mac IAP calls here.
 */

export interface MacIapProduct {
  identifier: string
  title: string
  description: string
  priceString: string
  price: number
  currencyCode: string
  packageType: 'MONTHLY' | 'ANNUAL' | 'UNKNOWN'
  packageIdentifier: string
}

export interface MacIapBridge {
  configure: (apiKey: string) => Promise<void>
  logIn: (appUserID: string) => Promise<void>
  getOfferings: () => Promise<{ packages: MacIapProduct[] }>
  purchase: (packageIdentifier: string) => Promise<{ userCancelled?: boolean }>
  restore: () => Promise<void>
}

declare global {
  interface Window {
    DealGapIQMac?: {
      iap?: MacIapBridge
    }
  }
}

export function getMacIapBridge(): MacIapBridge | null {
  if (typeof window === 'undefined') return null
  return window.DealGapIQMac?.iap ?? null
}

export function hasMacIapBridge(): boolean {
  return getMacIapBridge() != null
}
