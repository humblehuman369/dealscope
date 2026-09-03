/**
 * First-touch attribution.
 *
 * On the first page load per device, record where the visitor came from
 * (utm_*, gclid, referrer host, landing path) in localStorage. Later visits
 * never overwrite it: the question this answers is "which source earned the
 * first visit that eventually converted", and `trackEvent` attaches the
 * stored values as `ft_*` on every event so `verdict_viewed`,
 * `signup_completed` and `checkout_completed` all carry them.
 *
 * Nothing here is PII and nothing is sent; capture is allowed before analytics
 * consent. Sending still goes through the consent gate in `trackEvent`.
 */

export const FIRST_TOUCH_KEY = 'dgiq_first_touch_v1'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const CLICK_ID_KEYS = ['gclid'] as const

export type FirstTouch = Partial<Record<(typeof UTM_KEYS)[number] | (typeof CLICK_ID_KEYS)[number], string>> & {
  referrer_host?: string
  landing_path: string
  ts: number
}

function referrerHost(referrer: string): string | undefined {
  if (!referrer) return undefined
  try {
    const host = new URL(referrer).hostname
    return host && host !== window.location.hostname ? host : undefined
  } catch {
    return undefined
  }
}

function readStored(): FirstTouch | null {
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as FirstTouch).landing_path !== 'string') {
      return null
    }
    return parsed as FirstTouch
  } catch {
    return null
  }
}

/**
 * Record the current page as first touch if none is stored yet.
 * Returns the stored record (existing or new), or null when storage is unavailable.
 */
export function captureFirstTouch(): FirstTouch | null {
  if (typeof window === 'undefined') return null
  const existing = readStored()
  if (existing) return existing

  const params = new URLSearchParams(window.location.search)
  const record: FirstTouch = {
    landing_path: window.location.pathname || '/',
    ts: Date.now(),
  }
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const v = params.get(key)
    if (v) record[key] = v.slice(0, 200)
  }
  const host = referrerHost(document.referrer)
  if (host) record.referrer_host = host

  try {
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(record))
  } catch {
    return null
  }
  return record
}

/** Stored first touch, or null if none has been captured. */
export function getFirstTouch(): FirstTouch | null {
  if (typeof window === 'undefined') return null
  return readStored()
}

/** First touch flattened to `ft_*` event properties. Empty when nothing is stored. */
export function firstTouchEventProps(): Record<string, string | number> {
  const ft = getFirstTouch()
  if (!ft) return {}
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(ft)) {
    if (value !== undefined && value !== null) out[`ft_${key}`] = value
  }
  return out
}
