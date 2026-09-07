/**
 * First-touch attribution.
 *
 * On the first page load per device, record where the visitor came from
 * (utm_*, gclid, fbclid, referrer host, landing path) in localStorage. Later visits
 * never overwrite it: the question this answers is "which source earned the
 * first visit that eventually converted", and `trackEvent` attaches the
 * stored values as `ft_*` on every event so `verdict_viewed`,
 * `signup_completed` and `checkout_completed` all carry them.
 *
 * Nothing here is PII and nothing is sent; capture is allowed before analytics
 * consent. Sending still goes through the consent gate in `trackEvent`.
 */

export const FIRST_TOUCH_KEY = 'dgiq_first_touch_v1'
export const FIRST_TOUCH_COOKIE = 'dgiq_first_touch_v1'
const FIRST_TOUCH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const CLICK_ID_KEYS = ['gclid', 'fbclid'] as const

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

function parseFirstTouch(raw: string | null): FirstTouch | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as FirstTouch).landing_path !== 'string') {
      return null
    }
    return parsed as FirstTouch
  } catch {
    return null
  }
}

function readCookie(): FirstTouch | null {
  if (typeof document === 'undefined') return null
  const prefix = `${FIRST_TOUCH_COOKIE}=`
  const hit = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  if (!hit) return null
  return parseFirstTouch(decodeURIComponent(hit.slice(prefix.length)))
}

function writeCookie(record: FirstTouch): void {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(JSON.stringify(record))
  document.cookie = `${FIRST_TOUCH_COOKIE}=${value}; Max-Age=${FIRST_TOUCH_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}

function persist(record: FirstTouch): void {
  try {
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(record))
  } catch {
    // private mode
  }
  writeCookie(record)
}

function readStored(): FirstTouch | null {
  if (typeof window === 'undefined') return null
  const fromStorage = parseFirstTouch(window.localStorage.getItem(FIRST_TOUCH_KEY))
  if (fromStorage) {
    if (!readCookie()) writeCookie(fromStorage)
    return fromStorage
  }
  const fromCookie = readCookie()
  if (fromCookie) {
    try {
      window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(fromCookie))
    } catch {
      // ignore
    }
    return fromCookie
  }
  return null
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

  persist(record)
  return record
}

/** Live UTMs / click ids on the current URL, even when first touch is already stored. */
export function liveClickIds(): Partial<FirstTouch> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const out: Partial<FirstTouch> = {}
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const v = params.get(key)
    if (v) out[key] = v.slice(0, 200)
  }
  return out
}

/** Payload to stamp on the account at signup. First touch wins; live ids fill gaps. */
export function signupAttribution(): FirstTouch | Record<string, string> {
  const stored = getFirstTouch() ?? captureFirstTouch()
  const live = liveClickIds()
  return { ...(stored ?? { landing_path: '/', ts: Date.now() }), ...live }
}

export function getMetaClickIds(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {}
  const out: { fbp?: string; fbc?: string } = {}
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith('_fbp=')) out.fbp = decodeURIComponent(part.slice(5))
    if (part.startsWith('_fbc=')) out.fbc = decodeURIComponent(part.slice(5))
  }
  return out
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
