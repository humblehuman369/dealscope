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
 *
 * NORTH-STAR FUNNEL (free → paid). Define this funnel in PostHog using these events,
 * in order. Free-to-paid conversion is the north-star metric:
 *   1. `signup_completed`   — account created
 *   2. `verdict_viewed`     — first analysis result seen
 *   3. `activated`          — first "aha": Four Paths viewed or a directory engaged
 *                             (fired once per device via trackActivation(); `source` prop)
 *   4. `checkout_started`   — Pro trial / purchase initiated
 *   5. `checkout_completed` — paid conversion
 * `activated` is the activation milestone the strategic plan calls for; it is the
 * step most predictive of conversion and the primary lever for first-week activation work.
 */

import { track as vercelTrack } from '@vercel/analytics'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'
import { capturePostHog } from '@/lib/posthog'

/** localStorage key marking that the activation milestone already fired for this device. */
const ACTIVATION_FLAG = 'dgiq_activated_v1'

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

/**
 * Fire the `activated` north-star milestone the first time a user reaches an
 * "aha" moment (Four Paths viewed or a directory engaged). Deduped per device
 * so PostHog sees one activation per user. `source` records which surface
 * triggered it (e.g. 'four_paths', 'buyer_directory', 'lender_directory').
 */
export function trackActivation(source: string): void {
  if (typeof window === 'undefined') return
  // Gate on consent BEFORE setting the dedup flag. Otherwise a user without
  // analytics consent would set the flag while trackEvent() silently drops the
  // event — and granting consent later would never record activation because
  // the flag is already present.
  if (!hasAnalyticsConsent()) return
  try {
    if (window.localStorage.getItem(ACTIVATION_FLAG)) return
    window.localStorage.setItem(ACTIVATION_FLAG, '1')
  } catch {
    // localStorage unavailable (e.g. private mode) — fall through and let the
    // event fire; PostHog can still dedupe to first-touch per identified user.
  }
  trackEvent('activated', { source })
}
