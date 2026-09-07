import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hasAnalyticsConsent = vi.fn(() => true)
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => hasAnalyticsConsent() }))

import {
  captureGoogleAnalytics,
  initGoogleAnalytics,
  resetGoogleAnalyticsForTests,
  toGoogleAnalyticsEvent,
  trackGoogleAnalyticsPageView,
} from '@/lib/googleAnalytics'

const ORIGINAL_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

describe('googleAnalytics', () => {
  beforeEach(() => {
    resetGoogleAnalyticsForTests()
    hasAnalyticsConsent.mockReturnValue(true)
    delete window.gtag
    delete window.dataLayer
    document.head.innerHTML = ''
  })

  afterEach(() => {
    if (ORIGINAL_ID === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ORIGINAL_ID
  })

  it('does nothing without a measurement id', () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    expect(initGoogleAnalytics()).toBe(false)
    captureGoogleAnalytics('signup_completed')
    expect(window.gtag).toBeUndefined()
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('does nothing without analytics consent', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123'
    hasAnalyticsConsent.mockReturnValue(false)
    expect(initGoogleAnalytics()).toBe(false)
    captureGoogleAnalytics('signup_completed')
    expect(window.gtag).toBeUndefined()
  })

  it('installs gtag, loads the script once, and configures without an auto page_view', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123'
    expect(initGoogleAnalytics()).toBe(true)
    expect(initGoogleAnalytics()).toBe(true)
    const scripts = document.head.querySelectorAll('script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123')
    const calls = (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>))
    expect(calls[0][0]).toBe('js')
    expect(calls[1]).toEqual(['config', 'G-TEST123', { send_page_view: false }])
  })

  it('renames funnel events to GA4 recommended names and passes others through', () => {
    expect(toGoogleAnalyticsEvent('signup_completed', { method: 'email' })).toEqual({
      name: 'sign_up',
      params: { method: 'email' },
    })
    expect(toGoogleAnalyticsEvent('checkout_started', { plan: 'yearly' }).name).toBe('begin_checkout')
    expect(toGoogleAnalyticsEvent('verdict_viewed').name).toBe('analysis_run')
    expect(toGoogleAnalyticsEvent('property_searched', { q: 'x' })).toEqual({
      name: 'property_searched',
      params: { q: 'x' },
    })
  })

  it('gives purchase a value, currency and transaction id', () => {
    const { name, params } = toGoogleAnalyticsEvent('checkout_completed', {
      plan: 'monthly',
      session_id: 'cs_123',
    })
    expect(name).toBe('purchase')
    expect(params).toEqual({
      plan: 'monthly',
      session_id: 'cs_123',
      currency: 'USD',
      value: 39.99,
      transaction_id: 'cs_123',
    })
    expect(toGoogleAnalyticsEvent('checkout_completed').params).toEqual({ currency: 'USD' })
  })

  it('forwards events and page views through gtag when live', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123'
    captureGoogleAnalytics('signup_completed', { method: 'google' })
    trackGoogleAnalyticsPageView('/pricing')
    const calls = (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>))
    expect(calls).toContainEqual(['event', 'sign_up', { method: 'google' }])
    const pv = calls.find((c) => c[0] === 'event' && c[1] === 'page_view')
    expect(pv?.[2]).toMatchObject({ page_path: '/pricing' })
  })
})
