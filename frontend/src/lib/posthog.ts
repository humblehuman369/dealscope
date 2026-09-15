/**
 * PostHog — flags load without analytics consent; capture stays gated.
 *
 * Init runs whenever NEXT_PUBLIC_POSTHOG_KEY is set. Without consent === 'all'
 * the client is flags-only: capturing opted out, no autocapture / pageviews /
 * session replay, persistence in memory. `capturePostHog` and `identifyPostHog`
 * are no-ops until consent is "all". When the user accepts analytics, the
 * existing client opts in without a reload.
 */

import type { PostHog } from 'posthog-js'
import { hasAnalyticsConsent, subscribeConsent } from '@/lib/cookieConsent'

let client: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null
let subscribedToConsent = false

function applyConsentMode(ph: PostHog): void {
  if (hasAnalyticsConsent()) {
    ph.opt_in_capturing()
    ph.set_config({ persistence: 'localStorage+cookie' })
    return
  }
  ph.opt_out_capturing()
}

function applyDevWorkflowOverride(ph: PostHog): void {
  if (
    process.env.NODE_ENV === 'development' &&
    (window as Window & { __WORKFLOW_V1_OVERRIDE__?: boolean }).__WORKFLOW_V1_OVERRIDE__ ===
      true
  ) {
    const local = ph as unknown as {
      overrideFeatureFlags?: (flags: Record<string, boolean | string>) => void
    }
    local.overrideFeatureFlags?.({ 'workflow-v1': true })
  }
}

export function initPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return Promise.resolve(null)

  if (!subscribedToConsent) {
    subscribedToConsent = true
    subscribeConsent?.(() => {
      if (client) applyConsentMode(client)
      else void initPostHog()
    })
  }

  if (initPromise) return initPromise

  const analyticsOn = hasAnalyticsConsent()
  initPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        // '2026-05-30' is the current PostHog config snapshot (SPA pageviews,
        // head script injection for Next.js SSR, plus later flag/replay defaults).
        defaults: '2026-05-30',
        persistence: analyticsOn ? 'localStorage+cookie' : 'memory',
        autocapture: analyticsOn,
        capture_pageview: analyticsOn,
        disable_session_recording: !analyticsOn,
        opt_out_capturing_by_default: !analyticsOn,
        advanced_disable_decide: false,
      })
      client = posthog
      applyConsentMode(posthog)
      applyDevWorkflowOverride(posthog)
      return posthog
    })
    .catch(() => null)
  return initPromise
}

/** Capture an event. No-op until analytics consent is "all". */
export function capturePostHog(
  name: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (!hasAnalyticsConsent()) return
  void initPostHog().then((ph) => ph?.capture(name, props))
}

/** Link the current device's events to a known account (call on login/session). */
export function identifyPostHog(
  distinctId: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (!hasAnalyticsConsent()) return
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
 * Feature-flag read. `null` when PostHog is not initialized (no key),
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
