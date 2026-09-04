import { beforeEach, describe, expect, it, vi } from 'vitest'

const vercelTrack = vi.fn()
vi.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => vercelTrack(...args) }))
const capturePostHog = vi.fn()
vi.mock('@/lib/posthog', () => ({ capturePostHog: (...args: unknown[]) => capturePostHog(...args) }))
const hasAnalyticsConsent = vi.fn(() => true)
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => hasAnalyticsConsent() }))

import { FIRST_TOUCH_KEY, captureFirstTouch, firstTouchEventProps, getFirstTouch } from '@/lib/attribution'
import { trackEvent } from '@/lib/eventTracking'

// setup.ts installs vi.fn() stubs for localStorage; back them with a real map here.
const store = new Map<string, string>()
const ls = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
}

function setLocation(pathname: string, search: string) {
  window.location.pathname = pathname
  window.location.search = search
  window.location.hostname = 'dealgapiq.com'
}

describe('first-touch attribution', () => {
  beforeEach(() => {
    store.clear()
    ls.getItem.mockImplementation((k: string) => store.get(k) ?? null)
    ls.setItem.mockImplementation((k: string, v: string) => {
      store.set(k, v)
    })
    Object.defineProperty(document, 'referrer', { value: 'https://www.google.com/', configurable: true })
    vercelTrack.mockClear()
    capturePostHog.mockClear()
    hasAnalyticsConsent.mockReturnValue(true)
  })

  it('captures utm, click ids, referrer host and landing path on first load', () => {
    setLocation('/answers/does-this-rental-cash-flow', '?utm_source=google&utm_medium=cpc&utm_campaign=x&gclid=abc&fbclid=def&foo=bar')
    const ft = captureFirstTouch()

    expect(ft).toMatchObject({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'x',
      gclid: 'abc',
      fbclid: 'def',
      referrer_host: 'www.google.com',
      landing_path: '/answers/does-this-rental-cash-flow',
    })
    expect(ft).not.toHaveProperty('foo')
    expect(store.has(FIRST_TOUCH_KEY)).toBe(true)
  })

  it('does not overwrite an existing first touch on a later visit', () => {
    setLocation('/', '?utm_campaign=first')
    captureFirstTouch()

    setLocation('/pricing', '?utm_campaign=second')
    const ft = captureFirstTouch()

    expect(ft?.utm_campaign).toBe('first')
    expect(getFirstTouch()?.landing_path).toBe('/')
  })

  it('records a direct visit with landing path only', () => {
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
    setLocation('/markets/florida', '')
    const ft = captureFirstTouch()
    expect(ft).toEqual({ landing_path: '/markets/florida', ts: expect.any(Number) })
    expect(firstTouchEventProps()).toEqual({ ft_landing_path: '/markets/florida', ft_ts: expect.any(Number) })
  })

  it('merges ft_* into every tracked event without overriding event props', () => {
    setLocation('/', '?utm_source=blog&utm_campaign=post-1')
    captureFirstTouch()

    trackEvent('verdict_viewed', { source: 'discovery' })

    expect(vercelTrack).toHaveBeenCalledTimes(1)
    const [name, props] = vercelTrack.mock.calls[0]
    expect(name).toBe('verdict_viewed')
    expect(props).toMatchObject({ source: 'discovery', ft_utm_source: 'blog', ft_utm_campaign: 'post-1', ft_landing_path: '/' })
    expect(capturePostHog).toHaveBeenCalledWith('verdict_viewed', props)
  })

  it('still respects the consent gate when sending', () => {
    setLocation('/', '?utm_source=blog')
    captureFirstTouch()
    hasAnalyticsConsent.mockReturnValue(false)

    trackEvent('verdict_viewed')

    expect(vercelTrack).not.toHaveBeenCalled()
    expect(getFirstTouch()?.utm_source).toBe('blog')
  })
})
