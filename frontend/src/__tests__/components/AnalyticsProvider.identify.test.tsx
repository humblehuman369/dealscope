import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const identifyPostHog = vi.hoisted(() => vi.fn())
const useSession = vi.hoisted(() => vi.fn())

vi.mock('@/lib/posthog', () => ({
  identifyPostHog,
  initPostHog: vi.fn(),
}))
vi.mock('@/lib/metaPixel', () => ({ initMetaPixel: vi.fn() }))
vi.mock('@/hooks/useSession', () => ({ useSession: () => useSession() }))
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))

import { AnalyticsProvider } from '@/components/AnalyticsProvider'

describe('AnalyticsProvider identify', () => {
  beforeEach(() => {
    identifyPostHog.mockReset()
    useSession.mockReset()
  })

  it('identifies once per mount with email in $set and never when signed out', () => {
    useSession.mockReturnValue({ user: null })
    const { rerender } = render(<AnalyticsProvider />)
    expect(identifyPostHog).not.toHaveBeenCalled()

    useSession.mockReturnValue({
      user: { id: 'user-1', email: 'brad@example.com', subscription_tier: 'pro' },
    })
    rerender(<AnalyticsProvider />)
    expect(identifyPostHog).toHaveBeenCalledTimes(1)
    expect(identifyPostHog).toHaveBeenCalledWith('user-1', {
      email: 'brad@example.com',
      tier: 'pro',
    })

    rerender(<AnalyticsProvider />)
    expect(identifyPostHog).toHaveBeenCalledTimes(1)
  })

  it('does not identify a signed-in user with no email', () => {
    useSession.mockReturnValue({
      user: { id: 'user-2', email: '', subscription_tier: 'starter' },
    })
    render(<AnalyticsProvider />)
    expect(identifyPostHog).not.toHaveBeenCalled()
  })
})
