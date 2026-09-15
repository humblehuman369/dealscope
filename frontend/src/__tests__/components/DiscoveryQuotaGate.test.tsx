import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiscoveryQuotaGate } from '@/components/discovery/DiscoveryQuotaGate'
import { ANON_FUNNEL_COPY } from '@/lib/anonFunnelCopy'

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
})
