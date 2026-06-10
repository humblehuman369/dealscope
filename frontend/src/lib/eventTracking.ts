/**
 * Event tracking — abstraction over Vercel Analytics (and future providers).
 * Use trackEvent() for key conversion and product events.
 * Respects cookie consent: events are only sent when user has accepted analytics.
 *
 * Three Paths (T0.5 / T14): `three_paths_rendered`, `path_pitch_opened`, `path_opened_in_strategy`,
 * `path_attorney_link_clicked`, `assumable_pv_displayed`, `morby_method_substituted`.
 * (Note: `path_card_caveat_viewed` was retired when the caveat became always-visible
 * on path cards instead of an expandable disclosure.)
 * Three Paths (T17): `path_family_dismissed` — fires when the user dismisses a card's
 *   family from the Four Paths panel; the selector applies a ranking penalty on subsequent
 *   verdict requests via the `dismissed_families` payload field.
 */

import { track as vercelTrack } from '@vercel/analytics'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'
import { capturePostHog } from '@/lib/posthog'

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
            Object.entries(props).filter(([, v]) => v !== undefined && v !== null) as [
              string,
              string | number | boolean,
            ][],
          )
        : undefined
    vercelTrack(name, filtered)
    // Fan out to PostHog for identity-stitched funnel analysis.
    capturePostHog(name, filtered)
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
