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
        // '2026-05-30' is the current PostHog config snapshot (SPA pageviews,
        // head script injection for Next.js SSR, plus later flag/replay defaults).
        defaults: '2026-05-30',
        persistence: 'localStorage+cookie',
      })
      client = posthog
      // Local screenshot / Lighthouse bootstrap only. Production builds
      // never see NODE_ENV === 'development', so this cannot bypass the flag.
      if (
        process.env.NODE_ENV === 'development' &&
        (window as Window & { __WORKFLOW_V1_OVERRIDE__?: boolean }).__WORKFLOW_V1_OVERRIDE__ ===
          true
      ) {
        const local = posthog as unknown as {
          overrideFeatureFlags?: (flags: Record<string, boolean | string>) => void
        }
        local.overrideFeatureFlags?.({ 'workflow-v1': true })
      }
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
    const set: Record<string, string | number | boolean> = {}
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) set[key] = value
      }
    }
    // Person-targeted flags (email is set / email is one of) need $set on
    // every signed-in mount, including when the distinct id is already known.
    ph.identify(distinctId, { $set: set })
  })
}

/** Unlink the device from the user (call on logout). */
export function resetPostHog(): void {
  client?.reset()
}

/**
 * Feature-flag read. `null` when PostHog is not initialized (no key / no consent),
 * so callers can treat "unknown" as a miss instead of false.
 */
export function isPostHogFeatureEnabled(flag: string): Promise<boolean | null> {
  return initPostHog().then((ph) => {
    if (!ph) return null
    // undefined = flags not loaded, or this key is not in the project.
    // Do not treat that as an explicit off.
    const value = ph.getFeatureFlag(flag)
    if (value === undefined) return null
    return Boolean(value)
  })
}
