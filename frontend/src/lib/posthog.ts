/**
 * PostHog product analytics — consent-gated, lazy-loaded.
 *
 * PostHog only initializes when:
 *   1. NEXT_PUBLIC_POSTHOG_KEY is configured, AND
 *   2. the user accepted analytics cookies (consent === 'all').
 *
 * The SDK is dynamically imported so it never lands in the main bundle for
 * users without consent. All exports are safe to call anywhere (no-ops when
 * PostHog is unavailable).
 *
 * Funnel identity: `identifyPostHog(user.id, ...)` stitches anonymous
 * pre-signup events to the account, enabling signup → verdict → trial → paid
 * funnel analysis. `resetPostHog()` must run on logout so shared devices
 * don't cross-link users.
 */

import type { PostHog } from 'posthog-js'
import { hasAnalyticsConsent } from '@/lib/cookieConsent'

let client: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null

export function initPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || !hasAnalyticsConsent()) return Promise.resolve(null)

  if (initPromise) return initPromise

  initPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        // '2026-01-30' defaults: history-change pageviews (SPA-correct) and
        // head script injection (avoids Next.js SSR hydration errors).
        defaults: '2026-01-30',
        persistence: 'localStorage+cookie',
      })
      client = posthog
      return posthog
    })
    .catch(() => null)
  return initPromise
}

/** Capture an event. Initializes PostHog on first call if consent allows. */
export function capturePostHog(
  name: string,
  props?: Record<string, string | number | boolean>,
): void {
  void initPostHog().then((ph) => ph?.capture(name, props))
}

/** Link the current device's events to a known account (call on login/session). */
export function identifyPostHog(
  distinctId: string,
  props?: Record<string, string | number | boolean>,
): void {
  void initPostHog().then((ph) => {
    if (!ph) return
    // Re-identifying with the same id is a no-op server-side, but skip the
    // network chatter when we already know this user.
    if (ph.get_distinct_id() === distinctId) return
    ph.identify(distinctId, props)
  })
}

/** Unlink the device from the user (call on logout). */
export function resetPostHog(): void {
  client?.reset()
}
