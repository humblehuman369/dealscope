import { beforeEach, describe, expect, it, vi } from 'vitest'

const vercelTrack = vi.fn()
vi.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => vercelTrack(...args) }))
const capturePostHog = vi.fn()
vi.mock('@/lib/posthog', () => ({ capturePostHog: (...args: unknown[]) => capturePostHog(...args) }))
const hasAnalyticsConsent = vi.fn(() => true)
vi.mock('@/lib/cookieConsent', () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsent(),
  subscribeConsent: () => () => undefined,
}))
vi.mock('@/lib/metaPixel', () => ({
  captureMetaPixel: () => undefined,
  META_STANDARD_EVENTS: {},
}))
vi.mock('@/lib/attribution', () => ({
  firstTouchEventProps: () => ({}),
  getMetaClickIds: () => ({}),
}))

import {
  trackCardOpened,
  trackDealStarted,
  trackEvent,
  trackPlanBuilt,
  WORKFLOW_EVENTS,
} from '@/lib/eventTracking'

describe('WORKFLOW_EVENTS', () => {
  beforeEach(() => {
    vercelTrack.mockClear()
    capturePostHog.mockClear()
    hasAnalyticsConsent.mockReturnValue(true)
    window.sessionStorage.clear()
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

  it('forwards card_opened with property_id, property_state, days_on_market, price_cuts, and layout', () => {
    trackEvent(WORKFLOW_EVENTS.card_opened, {
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
      layout: 'v1',
    })
    const props = {
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
      layout: 'v1',
    }
    expect(vercelTrack).toHaveBeenCalledWith('card_opened', props)
    expect(capturePostHog).toHaveBeenCalledWith('card_opened', props)
  })

  it('forwards the old-layout card_opened firing with layout legacy', () => {
    trackCardOpened({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 12,
      price_cuts: 2,
      layout: 'legacy',
    })
    expect(vercelTrack).toHaveBeenCalledWith(
      'card_opened',
      expect.objectContaining({ layout: 'legacy', property_id: 'zpid-1766' }),
    )
  })

  it('never sends a street address on card_opened', () => {
    trackCardOpened({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 12,
      price_cuts: 2,
      layout: 'legacy',
    })
    const [, props] = vercelTrack.mock.calls[0] as [string, Record<string, unknown>]
    expect(props).toEqual({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 12,
      price_cuts: 2,
      layout: 'legacy',
    })
    expect(props).not.toHaveProperty('address')
  })

  it('forwards plan_built with option, targets_met, plan, property_id, and layout v1', () => {
    trackPlanBuilt({
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
      layout: 'v1',
    })
    expect(vercelTrack).toHaveBeenCalledWith('plan_built', {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
      layout: 'v1',
    })
    expect(capturePostHog).toHaveBeenCalledWith('plan_built', {
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
      layout: 'v1',
    })
  })

  it('forwards the old-layout plan_built firing with layout legacy', () => {
    trackPlanBuilt({
      property_id: 'zpid-1766',
      option: '2',
      targets_met: 1,
      plan: 'starter',
      layout: 'legacy',
    })
    expect(vercelTrack).toHaveBeenCalledWith(
      'plan_built',
      expect.objectContaining({ layout: 'legacy', option: '2', property_id: 'zpid-1766' }),
    )
  })

  it('forwards deal_started with deal_id, layout v1, and no street address', () => {
    trackDealStarted({
      property_id: 'zpid-1766',
      deal_id: 'deal-9',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
      layout: 'v1',
    })
    const [, props] = vercelTrack.mock.calls[0] as [string, Record<string, unknown>]
    expect(vercelTrack).toHaveBeenCalledWith('deal_started', props)
    expect(props).toEqual({
      property_id: 'zpid-1766',
      deal_id: 'deal-9',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
      layout: 'v1',
    })
    expect(props).not.toHaveProperty('address')
  })

  it('forwards the old-layout deal_started save without option when no plan was applied', () => {
    trackDealStarted({
      property_id: 'zpid-1766',
      deal_id: 'deal-legacy-save',
      plan: 'starter',
      layout: 'legacy',
    })
    const [, props] = vercelTrack.mock.calls[0] as [string, Record<string, unknown>]
    expect(props).toEqual({
      property_id: 'zpid-1766',
      deal_id: 'deal-legacy-save',
      plan: 'starter',
      layout: 'legacy',
    })
    expect(props).not.toHaveProperty('option')
    expect(props).not.toHaveProperty('targets_met')
  })

  it('does not fire deal_started twice for the same deal in one session', () => {
    trackDealStarted({
      deal_id: 'deal-dup',
      plan: 'starter',
      layout: 'v1',
      option: '3',
      targets_met: 0,
    })
    trackDealStarted({
      deal_id: 'deal-dup',
      plan: 'starter',
      layout: 'legacy',
    })
    expect(vercelTrack).toHaveBeenCalledTimes(1)
  })

  it('fires card_opened, plan_built, and deal_started once each with documented properties and no street address', () => {
    window.sessionStorage.clear()
    trackCardOpened({
      property_id: 'zpid-1766',
      property_state: 'FL',
      days_on_market: 224,
      price_cuts: 10,
      layout: 'legacy',
    })
    trackPlanBuilt({
      property_id: 'zpid-1766',
      option: '3',
      targets_met: 0,
      plan: 'starter',
      layout: 'v1',
    })
    trackDealStarted({
      property_id: 'zpid-1766',
      deal_id: 'deal-9b',
      option: 'blend',
      targets_met: 4,
      plan: 'pro',
      layout: 'v1',
    })
    trackEvent('verdict_viewed', {
      call: 'worth_pursuing',
      property_id: 'zpid-1766',
      property_state: 'FL',
      layout: 'v1',
    })

    expect(vercelTrack.mock.calls.map((call) => call[0])).toEqual([
      'card_opened',
      'plan_built',
      'deal_started',
      'verdict_viewed',
    ])
    for (const [, props] of vercelTrack.mock.calls as [string, Record<string, unknown>][]) {
      expect(props).not.toHaveProperty('address')
      expect(props).toHaveProperty('layout')
    }
    expect(vercelTrack.mock.calls[3]?.[1]).toEqual({
      call: 'worth_pursuing',
      property_id: 'zpid-1766',
      property_state: 'FL',
      layout: 'v1',
    })
  })

  it('forwards the old-layout verdict_viewed firing with call and layout legacy', () => {
    trackEvent('verdict_viewed', {
      call: 'only_with_terms',
      gap: 18,
      signals: 0,
      has_address: true,
      has_property_id: false,
      property_id: 'zpid-1766',
      property_state: 'FL',
      layout: 'legacy',
    })
    expect(vercelTrack).toHaveBeenCalledWith(
      'verdict_viewed',
      expect.objectContaining({
        call: 'only_with_terms',
        layout: 'legacy',
        property_id: 'zpid-1766',
        property_state: 'FL',
      }),
    )
  })
})
