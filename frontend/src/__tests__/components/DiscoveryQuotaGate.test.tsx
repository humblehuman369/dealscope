import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiscoveryQuotaGate } from '@/components/discovery/DiscoveryQuotaGate'
import { ANON_FUNNEL_COPY, STARTER_LIMIT_COPY } from '@/lib/anonFunnelCopy'

describe('DiscoveryQuotaGate', () => {
  it('renders the anonymous gate copy and opens create-account / sign-in', () => {
    const onCreateAccount = vi.fn()
    const onSignIn = vi.fn()
    render(
      <DiscoveryQuotaGate
        kind="anonymous"
        onCreateAccount={onCreateAccount}
        onSignIn={onSignIn}
        onUpgrade={vi.fn()}
      />,
    )
    expect(screen.getByText(ANON_FUNNEL_COPY.gateTitle)).toBeInTheDocument()
    expect(screen.getByText(ANON_FUNNEL_COPY.gateBody)).toBeInTheDocument()
    expect(screen.getByText(ANON_FUNNEL_COPY.gateFootnote)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: ANON_FUNNEL_COPY.gatePrimary }))
    fireEvent.click(screen.getByRole('button', { name: ANON_FUNNEL_COPY.signIn }))
    expect(onCreateAccount).toHaveBeenCalledTimes(1)
    expect(onSignIn).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Go Back')).not.toBeInTheDocument()
  })

  it('keeps the old Starter screen when the v1 flag is off', () => {
    render(
      <DiscoveryQuotaGate
        kind="free"
        onCreateAccount={vi.fn()}
        onSignIn={vi.fn()}
        onUpgrade={vi.fn()}
      />,
    )
    expect(screen.getByText("You've used this month's free analyses")).toBeInTheDocument()
    expect(
      screen.getByText(
        'Upgrade to Pro for unlimited property analyses, the Deal Maker, comps, and exports.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(STARTER_LIMIT_COPY.footnote)).not.toBeInTheDocument()
  })

  it('renders v1 Starter limit copy inside the shell', () => {
    const onUpgrade = vi.fn()
    render(
      <DiscoveryQuotaGate
        kind="free"
        workflowV1
        onCreateAccount={vi.fn()}
        onSignIn={vi.fn()}
        onUpgrade={onUpgrade}
      />,
    )
    expect(screen.getByText(STARTER_LIMIT_COPY.title)).toBeInTheDocument()
    expect(screen.getByText(STARTER_LIMIT_COPY.body)).toBeInTheDocument()
    expect(screen.getByText(STARTER_LIMIT_COPY.footnote)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: STARTER_LIMIT_COPY.primary }))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })
})
