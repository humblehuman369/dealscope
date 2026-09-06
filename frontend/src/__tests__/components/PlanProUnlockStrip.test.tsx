import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlanProUnlockStrip } from '@/features/strategy-workbench/components/PlanProUnlockStrip'

describe('PlanProUnlockStrip', () => {
  it('asks for Pro after the worksheet aha, not before', () => {
    const onUpgrade = vi.fn()
    render(
      <PlanProUnlockStrip
        buyerTotalLabel="2,812+"
        lenderTotalLabel="484+"
        onUpgrade={onUpgrade}
      />,
    )
    expect(screen.getByText(/ready to take this offer out/i)).toBeInTheDocument()
    expect(screen.getByText(/2,812\+ verified cash buyers/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /unlock buyers/i }))
    expect(onUpgrade).toHaveBeenCalledOnce()
  })
})
