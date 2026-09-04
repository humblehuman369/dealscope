import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hasAnalyticsConsent = vi.fn(() => true)
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => hasAnalyticsConsent() }))

import { META_STANDARD_EVENTS, captureMetaPixel, initMetaPixel, resetMetaPixelForTests } from '@/lib/metaPixel'

const ORIGINAL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

describe('metaPixel', () => {
  beforeEach(() => {
    resetMetaPixelForTests()
    hasAnalyticsConsent.mockReturnValue(true)
    delete window.fbq
    delete window._fbq
    document.head.innerHTML = ''
  })

  afterEach(() => {
    if (ORIGINAL_ID === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = ORIGINAL_ID
  })

  it('does nothing without a pixel id', () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID
    expect(initMetaPixel()).toBe(false)
    captureMetaPixel('verdict_viewed')
    expect(window.fbq).toBeUndefined()
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('does nothing without analytics consent', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '123'
    hasAnalyticsConsent.mockReturnValue(false)
    expect(initMetaPixel()).toBe(false)
    captureMetaPixel('signup_completed')
    expect(window.fbq).toBeUndefined()
  })

  it('installs the stub, inits and tracks PageView when configured and consented', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '123'
    expect(initMetaPixel()).toBe(true)
    expect(window.fbq).toBeTypeOf('function')
    expect(window.fbq?.queue).toEqual([
      ['init', '123'],
      ['track', 'PageView'],
    ])
    const script = document.head.querySelector('script')
    expect(script?.getAttribute('src')).toBe('https://connect.facebook.net/en_US/fbevents.js')

    // Second init is a no-op.
    expect(initMetaPixel()).toBe(true)
    expect(window.fbq?.queue).toHaveLength(2)
  })

  it('forwards only the mapped funnel events, as standard events', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '123'
    captureMetaPixel('verdict_viewed')
    captureMetaPixel('blog_post_viewed')
    captureMetaPixel('checkout_completed')

    const tracked = (window.fbq?.queue ?? []).filter(([cmd]) => cmd === 'track').map(([, name]) => name)
    expect(tracked).toEqual(['PageView', 'Lead', 'Subscribe'])
  })

  it('maps the four north-star funnel events and nothing else', () => {
    expect(META_STANDARD_EVENTS).toEqual({
      verdict_viewed: 'Lead',
      signup_completed: 'CompleteRegistration',
      checkout_started: 'StartTrial',
      checkout_completed: 'Subscribe',
    })
  })
})
