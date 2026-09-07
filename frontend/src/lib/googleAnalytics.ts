/**
 * Google Analytics 4 — consent-gated, lazy-loaded gtag.js.
 *
 * GA4 only initializes when:
 *   1. NEXT_PUBLIC_GA_MEASUREMENT_ID is configured (G-XXXXXXXXXX), AND
 *   2. the user accepted analytics cookies (consent === 'all').
 *
 * Role in the stack: GA4 is the acquisition referee — which source / medium /
 * campaign (UTM) brought the visitor who later signed up, started a trial, or
 * paid. PostHog keeps the identity-stitched product funnel; Vercel keeps
 * lightweight page views; Meta Pixel feeds paid-social optimization.
 *
 * Every trackEvent() call is forwarded. The handful of funnel events below are
 * renamed to GA4's recommended event names so they land in the built-in
 * conversion and monetization reports; everything else passes through under
 * its own name as a custom event. Because gtag is only loaded after consent,
 * it sees the consenting share of visitors only.
 *
 * See docs/operations/google-analytics.md.
 */

import { hasAnalyticsConsent } from '@/lib/cookieConsent'

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFn
  }
}

const SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js'

/** Our funnel events → GA4 recommended event names. Unlisted events keep their name. */
export const GA4_EVENT_NAMES: Readonly<Record<string, string>> = {
  signup_completed: 'sign_up',
  checkout_started: 'begin_checkout',
  checkout_completed: 'purchase',
  verdict_viewed: 'analysis_run',
}

/** Pro plan list prices, used to give `purchase` a value for revenue reports. */
export const PLAN_PRICES_USD: Readonly<Record<string, number>> = {
  monthly: 39.99,
  yearly: 349.99,
}

/** sessionStorage key carrying the chosen plan from checkout start to the success page. */
export const CHECKOUT_PLAN_KEY = 'dgiq_checkout_plan'

type Props = Record<string, string | number | boolean>

let initialized = false

export function getMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  return id && id.trim() ? id.trim() : undefined
}

function installGtag(id: string): GtagFn {
  const dataLayer: unknown[] = window.dataLayer ?? []
  window.dataLayer = dataLayer
  if (!window.gtag) {
    // The canonical gtag bootstrap: push `arguments` (not a spread array) so
    // gtag.js can read the call as it expects.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments)
    }
  }
  const script = document.createElement('script')
  script.async = true
  script.src = `${SCRIPT_SRC}?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  return window.gtag
}

/** Initialize if configured and consented. Returns whether GA4 is live. */
export function initGoogleAnalytics(): boolean {
  if (typeof window === 'undefined') return false
  const id = getMeasurementId()
  if (!id || !hasAnalyticsConsent()) return false
  if (initialized) return true
  try {
    const gtag = installGtag(id)
    gtag('js', new Date())
    // We fire page_view ourselves on route change (see trackGoogleAnalyticsPageView)
    // so SPA navigations count and the initial load is not double-counted.
    gtag('config', id, { send_page_view: false })
    initialized = true
  } catch {
    return false
  }
  return initialized
}

/** Build the GA4 params for one of our events. Exported for tests. */
export function toGoogleAnalyticsEvent(name: string, props?: Props): { name: string; params: Props } {
  const gaName = GA4_EVENT_NAMES[name] ?? name
  const params: Props = { ...(props ?? {}) }
  if (gaName === 'purchase') {
    const plan = typeof params.plan === 'string' ? params.plan : undefined
    params.currency = 'USD'
    if (plan && PLAN_PRICES_USD[plan] !== undefined) params.value = PLAN_PRICES_USD[plan]
    if (params.transaction_id === undefined && typeof params.session_id === 'string') {
      params.transaction_id = params.session_id
    }
  }
  return { name: gaName, params }
}

/** Forward an event. Initializes GA4 on first call if consent allows. No-op otherwise. */
export function captureGoogleAnalytics(name: string, props?: Props): void {
  if (!initGoogleAnalytics()) return
  try {
    const { name: gaName, params } = toGoogleAnalyticsEvent(name, props)
    window.gtag?.('event', gaName, params)
  } catch {
    // no-op if gtag failed to load
  }
}

/** Record a page view for the given path (called on every route change). */
export function trackGoogleAnalyticsPageView(path: string): void {
  if (!initGoogleAnalytics()) return
  try {
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    })
  } catch {
    // no-op
  }
}

/** Attach the signed-in account id so GA4 can count users across devices. */
export function setGoogleAnalyticsUser(userId: string | null, tier?: string): void {
  if (!initGoogleAnalytics()) return
  const id = getMeasurementId()
  if (!id) return
  try {
    window.gtag?.('config', id, { user_id: userId ?? undefined, send_page_view: false })
    if (tier) window.gtag?.('set', 'user_properties', { plan_tier: tier })
  } catch {
    // no-op
  }
}

/** Test seam: forget that init ran. */
export function resetGoogleAnalyticsForTests(): void {
  initialized = false
}
