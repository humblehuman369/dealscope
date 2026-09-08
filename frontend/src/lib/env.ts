/**
 * Centralized environment variable access (client-side).
 *
 * Web (Vercel): API_BASE_URL is empty — requests use relative paths
 * through the Vercel rewrite proxy, keeping auth cookies first-party.
 *
 * Capacitor: API_BASE_URL is the full backend URL (e.g. https://api.dealgapiq.com).
 * Requests go directly to the backend with Bearer token auth.
 *
 * Native flags are functions, not module-init constants: the Capacitor
 * bridge can inject after the first JS evaluation. Reading once at import
 * time can send the iOS/Android WebView down the Stripe/cookie path.
 */

const CAP_BRIDGE_KEY = '__cap_bridge'

function rememberCapacitorBridge(): void {
  try {
    localStorage.setItem(CAP_BRIDGE_KEY, '1')
  } catch {
    /* noop */
  }
}

/**
 * Detect Capacitor runtime (WebView native shell).
 *
 * Primary: window.Capacitor (injected by native bridge).
 * Fallback: localStorage flag set on first successful bridge detection,
 * so subsequent page loads in the same WebView are correctly identified
 * even if the bridge injection hasn't completed yet.
 */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  if ((window as any).Capacitor) {
    rememberCapacitorBridge()
    return true
  }
  try {
    return localStorage.getItem(CAP_BRIDGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Native platform identifier inside Capacitor: 'ios' | 'android' | 'web'.
 * Returns 'web' when running in a browser (also covers SSR).
 */
export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  if (!isCapacitor()) return 'web'
  const cap = (window as any).Capacitor
  const platform = cap?.getPlatform?.() ?? cap?.platform
  if (platform === 'ios' || platform === 'android') return platform
  return 'web'
}

/**
 * Convenience flags for store-specific UI/copy. Required for compliance:
 * Apple and Google each mandate their own subscription disclosure language
 * ("App Store account" vs "Google Play account," etc.). Mixing them up is
 * a guaranteed review rejection on whichever store sees the wrong copy.
 */
export function isIOS(): boolean {
  return nativePlatform() === 'ios'
}

export function isAndroid(): boolean {
  return nativePlatform() === 'android'
}

/**
 * True inside the native macOS WKWebView shell (`frontend/macos`),
 * which injects `window.__DEALGAPIQ_MAC__` at document start.
 */
export function isMacNative(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as Window & { __DEALGAPIQ_MAC__?: boolean }).__DEALGAPIQ_MAC__)
}

/**
 * True when running on Mac desktop chrome:
 * - Capacitor iOS shell on Apple Silicon ("Designed for iPad"), or
 * - Native Mac App Store shell (`isMacNative()`).
 */
export function isMacDesktop(): boolean {
  if (isMacNative()) return true
  if (!isCapacitor() || !isIOS()) return false
  if (typeof navigator === 'undefined') return false
  return /Macintosh|Mac OS X/i.test(navigator.userAgent)
}

/**
 * StoreKit / Play Billing path (Capacitor or native Mac shell).
 * When true, UpgradeModal must NOT use Stripe Checkout.
 */
export function usesNativeIap(): boolean {
  return isCapacitor() || isMacNative()
}

/** Apple ID / App Store subscription disclosure (iOS Capacitor or Mac shell). */
export function usesAppleIap(): boolean {
  return isIOS() || isMacNative()
}

/**
 * Base URL prefix for client-side API calls.
 * - Default: empty string — relative paths go through the app origin and rewrites
 * - Optional direct mode: set NEXT_PUBLIC_USE_DIRECT_API=true to call
 *   NEXT_PUBLIC_API_URL directly (useful for targeted debugging only)
 */
const DIRECT_API_ENABLED = process.env.NEXT_PUBLIC_USE_DIRECT_API === 'true'
const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '')

export const API_BASE_URL = DIRECT_API_ENABLED ? PUBLIC_API_URL : ''

const CONFIGURED_APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')

/**
 * Base URL for the web app (used when Capacitor needs to call
 * Vercel-hosted API routes like /api/report).
 * Falls back to the production URL in Capacitor so validate-address
 * and other API routes always resolve to an absolute URL.
 */
export function webBaseUrl(): string {
  if (CONFIGURED_APP_URL) return CONFIGURED_APP_URL
  if (isCapacitor() || isMacNative()) return 'https://dealgapiq.com'
  return ''
}

/** Prefer webBaseUrl() in native shells so a late Capacitor inject is seen. */
export const WEB_BASE_URL = CONFIGURED_APP_URL

/**
 * "Make It Work" wizard on /discovery. On by default; set
 * NEXT_PUBLIC_MAKE_IT_WORK=off to fall back to the original four option cards
 * (kept so the two experiences can be A/B compared).
 */
export const MAKE_IT_WORK_ENABLED: boolean = process.env.NEXT_PUBLIC_MAKE_IT_WORK !== 'off'
