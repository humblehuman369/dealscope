/**
 * Meta Pixel — consent-gated, lazy-loaded.
 *
 * The pixel only initializes when:
 *   1. NEXT_PUBLIC_META_PIXEL_ID is configured, AND
 *   2. the user accepted analytics cookies (consent === 'all').
 *
 * It exists so Meta ad sets pointed at /for/* can optimize on the events
 * that matter (a verdict, a signup, a trial, a payment) instead of clicks.
 * Only the four funnel events below are forwarded, and only as Meta standard
 * events so the ad platform recognizes them. Nothing else leaves the site.
 *
 * Because the pixel is consent-gated it sees the consenting share of
 * visitors only; absolute counts undercount, ratios between ad sets hold.
 * See docs/marketing/LISTICLE_LANDING_PAGES.md.
 */

import { hasAnalyticsConsent } from '@/lib/cookieConsent'

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[][]
  loaded?: boolean
  version?: string
  callMethod?: (...args: unknown[]) => void
  push?: Fbq
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

/** Our funnel events → Meta standard events. Anything not listed is never sent. */
export const META_STANDARD_EVENTS: Readonly<Record<string, string>> = {
  verdict_viewed: 'Lead',
  signup_completed: 'CompleteRegistration',
  checkout_started: 'StartTrial',
  checkout_completed: 'Subscribe',
}

let initialized = false

/** The standard fbevents bootstrap, without an inline script tag. */
function installStub(): Fbq {
  if (window.fbq) return window.fbq
  const fbq: Fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue?.push(args)
  }) as Fbq
  fbq.queue = []
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.push = fbq
  window.fbq = fbq
  window._fbq = fbq
  const script = document.createElement('script')
  script.async = true
  script.src = SCRIPT_SRC
  document.head.appendChild(script)
  return fbq
}

/** Initialize if configured and consented. Returns whether the pixel is live. */
export function initMetaPixel(): boolean {
  if (typeof window === 'undefined') return false
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!id || !hasAnalyticsConsent()) return false
  if (initialized) return true
  try {
    const fbq = installStub()
    fbq('init', id)
    fbq('track', 'PageView')
    initialized = true
  } catch {
    return false
  }
  return initialized
}

/** Forward one of our funnel events as its Meta standard event. No-op otherwise. */
export function captureMetaPixel(name: string): void {
  const standard = META_STANDARD_EVENTS[name]
  if (!standard) return
  if (!initMetaPixel()) return
  try {
    window.fbq?.('track', standard)
  } catch {
    // no-op if the pixel failed to load
  }
}

/** Test seam: forget that init ran. */
export function resetMetaPixelForTests(): void {
  initialized = false
}
