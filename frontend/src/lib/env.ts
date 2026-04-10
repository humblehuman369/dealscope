/**
 * Centralized environment variable access (client-side).
 *
 * Web (Vercel): API_BASE_URL is empty — requests use relative paths
 * through the Vercel rewrite proxy, keeping auth cookies first-party.
 *
 * Capacitor: API_BASE_URL is the full backend URL (e.g. https://api.dealgapiq.com).
 * Requests go directly to the backend with Bearer token auth.
 */

/**
 * Detect Capacitor runtime (WebView native shell).
 *
 * Primary: window.Capacitor (injected by native bridge).
 * Fallback: localStorage flag set on first successful bridge detection,
 * so subsequent page loads in the same WebView are correctly identified
 * even if the bridge injection hasn't completed yet.
 */
export const IS_CAPACITOR: boolean = (() => {
  if (typeof window === 'undefined') return false
  if ((window as any).Capacitor) {
    try { localStorage.setItem('__cap_bridge', '1') } catch { /* noop */ }
    return true
  }
  try { return localStorage.getItem('__cap_bridge') === '1' } catch { return false }
})()

/**
 * Base URL prefix for client-side API calls.
 * - Default: empty string — relative paths go through the app origin and rewrites
 * - Optional direct mode: set NEXT_PUBLIC_USE_DIRECT_API=true to call
 *   NEXT_PUBLIC_API_URL directly (useful for targeted debugging only)
 */
const DIRECT_API_ENABLED = process.env.NEXT_PUBLIC_USE_DIRECT_API === 'true'
const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '')

export const API_BASE_URL = DIRECT_API_ENABLED ? PUBLIC_API_URL : ''

/**
 * Base URL for the web app (used when Capacitor needs to call
 * Vercel-hosted API routes like /api/report).
 * Falls back to the production URL in Capacitor so validate-address
 * and other API routes always resolve to an absolute URL.
 */
export const WEB_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_CAPACITOR ? 'https://dealgapiq.com' : '')
