import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import { FourWaysStrip } from '@/components/iq-verdict/make-it-work/FourWaysStrip'

function structure(id: string, family: DealStructure['family'], extra: Partial<DealStructure> = {}): DealStructure {
  return {
    id,
    family,
    familyLabel: family,
    realismLabel: 'Common',
    headline: id,
    bullets: [],
    summary: '',
    levers: [],
    monthlySavings: 250,
    cashRequired: 60_000,
    rankingScore: 50,
    pitchScript: null,
    caveat: null,
    selectionReason: null,
    preLoadedRecord: null,
    ...extra,
  }
}

const PATHS = [
  structure('rent-verification', 'income', {
    levers: [{ label: 'Target Rent', beforeLabel: '$2,200', afterLabel: '$2,450', deltaLabel: '+$250' }],
  }),
  structure('price-negotiation', 'price', {
    levers: [{ label: 'Purchase price', beforeLabel: '$450,000', afterLabel: '$412,000', deltaLabel: null }],
  }),
  structure('blended-plan', 'blended', { monthlySavings: 310 }),
]

describe('FourWaysStrip', () => {
  it('renders all four ways in fixed order with engine numbers, and marks a missing slot honestly', () => {
    render(
      <FourWaysStrip paths={PATHS} dealGapAmount={48_000} onMakeItWork={vi.fn()} detailOpen={false} onToggleDetail={vi.fn()} />,
    )

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('The gap is $48K. Investors close it four ways.')

    const tiles = screen.getAllByRole('button').filter((b) => /Price|Improve Income|Creative Financing|Blended Plan/.test(b.textContent ?? ''))
    expect(tiles.map((t) => t.textContent)).toEqual([
      expect.stringContaining('Price'),
      expect.stringContaining('Improve Income'),
      expect.stringContaining('Creative Financing'),
      expect.stringContaining('Blended Plan'),
    ])

    expect(screen.getByText('→ $412,000')).toBeInTheDocument()
    expect(screen.getByText('→ $2,450')).toBeInTheDocument()
    expect(screen.getByText('Saves $310/mo')).toBeInTheDocument()
    // Financing slot has no engine result → muted copy, never hidden, never invented.
    expect(screen.getByText('Not enough lift here')).toBeInTheDocument()
  })

  it('opens the wizard with the tapped family, or with no family from the CTA', () => {
    const onMakeItWork = vi.fn()
    render(<FourWaysStrip paths={PATHS} dealGapAmount={null} onMakeItWork={onMakeItWork} detailOpen={false} onToggleDetail={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /^Improve Income/ }))
    expect(onMakeItWork).toHaveBeenLastCalledWith('income')

    fireEvent.click(screen.getByRole('button', { name: /Make this work for me/ }))
    expect(onMakeItWork).toHaveBeenLastCalledWith()
  })

  it('toggles the detail expander and reflects its state', () => {
    const onToggleDetail = vi.fn()
    const { rerender } = render(
      <FourWaysStrip paths={PATHS} onMakeItWork={vi.fn()} detailOpen={false} onToggleDetail={onToggleDetail} />,
    )
    const toggle = screen.getByRole('button', { name: 'See all four options in detail' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(onToggleDetail).toHaveBeenCalledTimes(1)

    rerender(<FourWaysStrip paths={PATHS} onMakeItWork={vi.fn()} detailOpen onToggleDetail={onToggleDetail} />)
    expect(screen.getByRole('button', { name: 'Hide the detailed options' })).toHaveAttribute('aria-expanded', 'true')
  })
})
