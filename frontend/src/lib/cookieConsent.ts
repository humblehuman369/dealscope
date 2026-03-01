export const COOKIE_CONSENT_KEY = 'cookie_consent'
export type CookieConsent = 'all' | 'essential' | null

export function getStoredConsent(): CookieConsent {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (v === 'all' || v === 'essential') return v
    return null
  } catch {
    return null
  }
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'all'
}
