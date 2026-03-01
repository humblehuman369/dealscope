/**
 * Event tracking — abstraction over Vercel Analytics (and future providers).
 * Use trackEvent() for key conversion and product events.
 * Respects cookie consent: events are only sent when user has accepted analytics.
 */

import { track as vercelTrack } from '@vercel/analytics'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return
  if (!hasAnalyticsConsent()) return
  try {
    const filtered =
      props && Object.keys(props).length > 0
        ? Object.fromEntries(
            Object.entries(props).filter(
              ([, v]) => v !== undefined && v !== null,
            ) as [string, string | number | boolean][],
          )
        : undefined
    vercelTrack(name, filtered)
  } catch {
    // no-op if analytics not loaded or disabled
  }
}

/** Track a page view (path). Vercel Analytics does this automatically; use for SPA-style updates if needed. */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return
  const p = path ?? window.location?.pathname
  if (p) trackEvent('page_view', { path: p })
}
