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

import { trackEvent, WORKFLOW_EVENTS } from '@/lib/eventTracking'

describe('WORKFLOW_EVENTS', () => {
  beforeEach(() => {
    vercelTrack.mockClear()
    capturePostHog.mockClear()
    hasAnalyticsConsent.mockReturnValue(true)
  })

  it('exports the Plan funnel event names', () => {
    expect(WORKFLOW_EVENTS).toEqual({
      plan_built: 'plan_built',
      deal_started: 'deal_started',
    })
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
})
