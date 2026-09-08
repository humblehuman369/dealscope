/**
 * Absolute start URLs for Apple/Google OAuth inside the Capacitor Browser
 * plugin (SFSafariViewController / Chrome Custom Tab).
 *
 * Never prefix with NEXT_PUBLIC_API_URL: that env is often empty in the
 * client bundle (rewrites use BACKEND_URL server-side). A relative URL
 * fails to load in the system browser.
 *
 * The WebView already sits on dealgapiq.com, so window.location.origin is
 * the correct OAuth host (frontend proxy → /api/v1/auth/…).
 */

import { Browser } from '@capacitor/browser'

export const CAPACITOR_OAUTH_REDIRECT = 'dealgapiq://auth/callback'

export type CapacitorOauthProvider = 'apple' | 'google'

export function capacitorAppOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '')
    if (origin.startsWith('http')) return origin
  }
  return 'https://dealgapiq.com'
}

export function capacitorOauthStartUrl(provider: CapacitorOauthProvider): string {
  const redirect = encodeURIComponent(CAPACITOR_OAUTH_REDIRECT)
  return `${capacitorAppOrigin()}/api/v1/auth/${provider}?mobile_redirect=${redirect}`
}

export async function openCapacitorOauth(provider: CapacitorOauthProvider): Promise<void> {
  await Browser.open({ url: capacitorOauthStartUrl(provider) })
}
