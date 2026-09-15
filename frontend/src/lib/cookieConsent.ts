export const COOKIE_CONSENT_KEY = 'cookie_consent'
export type CookieConsent = 'all' | 'essential' | null

type ConsentListener = (consent: CookieConsent) => void

const listeners = new Set<ConsentListener>()

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

export function setStoredConsent(value: CookieConsent): void {
  if (typeof window !== 'undefined') {
    try {
      if (value) localStorage.setItem(COOKIE_CONSENT_KEY, value)
    } catch {
      /* private mode */
    }
  }
  for (const listener of listeners) listener(value)
}

export function subscribeConsent(listener: ConsentListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
