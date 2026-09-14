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

  it('exports card_opened plus the Plan funnel event names', () => {
    expect(WORKFLOW_EVENTS.card_opened).toBe('card_opened')
    expect(WORKFLOW_EVENTS.plan_built).toBe('plan_built')
    expect(WORKFLOW_EVENTS.deal_started).toBe('deal_started')
  })

  it('defines later-phase event names that nothing calls', () => {
    expect(WORKFLOW_EVENTS).toMatchObject({
      task_completed: 'task_completed',
      draft_used: 'draft_used',
      offer_sent: 'offer_sent',
      deal_closed: 'deal_closed',
      alert_opened: 'alert_opened',
      digest_opened: 'digest_opened',
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

  it('forwards plan_built with option, targets_met, plan, and property_id', () => {
    trackEvent(WORKFLOW_EVENTS.plan_built, {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
    })
    expect(vercelTrack).toHaveBeenCalledWith('plan_built', {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
    })
    expect(capturePostHog).toHaveBeenCalledWith('plan_built', {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
    })
  })

  it('forwards deal_started with deal_id and no street address', () => {
    trackEvent(WORKFLOW_EVENTS.deal_started, {
      property_id: 'zpid-1766',
      deal_id: 'deal-9',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
    })
    const [, props] = vercelTrack.mock.calls[0] as [string, Record<string, unknown>]
    expect(vercelTrack).toHaveBeenCalledWith('deal_started', props)
    expect(props).toEqual({
      property_id: 'zpid-1766',
      deal_id: 'deal-9',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
    })
    expect(props).not.toHaveProperty('address')
  })

  it('fires card_opened, plan_built, and deal_started once each with documented properties and no street address', () => {
    trackCardOpened({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
    })
    trackEvent(WORKFLOW_EVENTS.plan_built, {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
    })
    trackEvent(WORKFLOW_EVENTS.deal_started, {
      property_id: 'zpid-1766',
      deal_id: 'deal-9',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
    })
    trackEvent('verdict_viewed', {
      call: 'worth_pursuing',
      property_id: 'zpid-1766',
      property_state: 'FL',
    })

    expect(vercelTrack.mock.calls.map((call) => call[0])).toEqual([
      'card_opened',
      'plan_built',
      'deal_started',
      'verdict_viewed',
    ])
    for (const [, props] of vercelTrack.mock.calls as [string, Record<string, unknown>][]) {
      expect(props).not.toHaveProperty('address')
    }
    expect(vercelTrack.mock.calls[3]?.[1]).toEqual({
      call: 'worth_pursuing',
      property_id: 'zpid-1766',
      property_state: 'FL',
    })
  })
})
