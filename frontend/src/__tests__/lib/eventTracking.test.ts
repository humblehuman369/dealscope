import { beforeEach, describe, expect, it, vi } from 'vitest'

const vercelTrack = vi.fn()
vi.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => vercelTrack(...args) }))
const capturePostHog = vi.fn()
vi.mock('@/lib/posthog', () => ({ capturePostHog: (...args: unknown[]) => capturePostHog(...args) }))
const hasAnalyticsConsent = vi.fn(() => true)
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => hasAnalyticsConsent() }))
vi.mock('@/lib/metaPixel', () => ({
  captureMetaPixel: () => undefined,
  META_STANDARD_EVENTS: {},
}))
vi.mock('@/lib/attribution', () => ({
  firstTouchEventProps: () => ({}),
  getMetaClickIds: () => ({}),
}))

import { trackCardOpened, trackEvent, WORKFLOW_EVENTS } from '@/lib/eventTracking'

describe('WORKFLOW_EVENTS', () => {
  beforeEach(() => {
    vercelTrack.mockClear()
    capturePostHog.mockClear()
    hasAnalyticsConsent.mockReturnValue(true)
  })

  it('exports card_opened', () => {
    expect(WORKFLOW_EVENTS).toEqual({
      card_opened: 'card_opened',
    })
  })

  it('forwards card_opened with property_id, property_state, days_on_market, and price_cuts', () => {
    trackEvent(WORKFLOW_EVENTS.card_opened, {
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
    })
    const props = {
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
    }
    expect(vercelTrack).toHaveBeenCalledWith('card_opened', props)
    expect(capturePostHog).toHaveBeenCalledWith('card_opened', props)
  })

  it('never sends a street address on card_opened', () => {
    trackCardOpened({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 12,
      price_cuts: 2,
    })
    const [, props] = vercelTrack.mock.calls[0] as [string, Record<string, unknown>]
    expect(props).toEqual({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 12,
      price_cuts: 2,
    })
    expect(props).not.toHaveProperty('address')
  })
})
