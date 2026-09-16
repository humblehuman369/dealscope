import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UpgradeWall } from '@/components/discovery/UpgradeWall'
import { PRO_YEARLY_PER_MONTH, PRO_YEARLY_PRICE } from '@/lib/claims'

const trackEvent = vi.fn()

vi.mock('@/lib/eventTracking', () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

describe('UpgradeWall', () => {
  it('renders the specified copy and fires view/trial/dismiss events', () => {
    const onStartTrial = vi.fn()
    const onDismiss = vi.fn()
    render(
      <UpgradeWall
        resetsAt="2026-10-01T00:00:00.000Z"
        limit={3}
        used={3}
        plan="starter"
        onStartTrial={onStartTrial}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText("You've used all 3 free analyses this month")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'See the Deal Gap on every property.' })).toBeInTheDocument()
    expect(screen.getByText('Unlimited analyses')).toBeInTheDocument()
    expect(screen.getByText('Full investor workflow suite')).toBeInTheDocument()
    expect(screen.getByText('Excel proforma download')).toBeInTheDocument()
    expect(screen.getByText('Buyer & lender directories')).toBeInTheDocument()
    expect(screen.getByText(`$${PRO_YEARLY_PER_MONTH}`)).toBeInTheDocument()
    expect(screen.getByText(`Billed yearly at ${PRO_YEARLY_PRICE}. Less than one bad offer.`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start my free 7-day trial' })).toBeInTheDocument()
    expect(screen.getByText(/Your free plan resets on October 1/)).toBeInTheDocument()

    expect(trackEvent).toHaveBeenCalledWith('upgrade_wall_viewed', {
      plan: 'starter',
      used: 3,
      limit: 3,
      source: 'quota_exceeded',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Start my free 7-day trial' }))
    expect(onStartTrial).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /I'll wait/ }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
