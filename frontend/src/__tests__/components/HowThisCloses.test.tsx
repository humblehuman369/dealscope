import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { DealStructure, DealStructuresPayload } from '@/components/iq-verdict/PathOptionCard'
import { HowThisCloses } from '@/components/discovery/HowThisCloses'

function structure(
  id: string,
  family: DealStructure['family'],
  extra: Partial<DealStructure> = {},
): DealStructure {
  return {
    id,
    family,
    familyLabel: family,
    realismLabel: 'Common',
    headline: id,
    bullets: [],
    summary: 'engine summary',
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

const PAYLOAD: DealStructuresPayload = {
  hasPaths: true,
  narrativeParagraphs: [],
  paths: [
    structure('price-negotiation', 'price', {
      breakeven: {
        changePct: 4.6,
        changeAmount: 17_516,
        resultAmount: 362_465,
        resultLabel: 'Target Buy',
        closesGapAlone: true,
        termsNote: null,
      },
      negotiability: { rating: 'high', score: 80, reasons: [] },
    }),
    structure('seller-second', 'financing', {
      breakeven: {
        changePct: 4.6,
        changeAmount: 17_516,
        resultAmount: 17_516,
        resultLabel: 'Seller financing',
        closesGapAlone: true,
        termsNote: null,
      },
      negotiability: { rating: 'medium', score: 55, reasons: [] },
    }),
    structure('rent-verification', 'income', {
      breakeven: {
        changePct: 2,
        changeAmount: 40,
        resultAmount: 2_400,
        resultLabel: 'Target rent',
        closesGapAlone: true,
        termsNote: null,
      },
      negotiability: { rating: 'high', score: 85, reasons: [] },
    }),
    structure('larger-down', 'capital_stack', {
      breakeven: {
        changePct: 5,
        changeAmount: 10_000,
        resultAmount: 85_000,
        resultLabel: 'Down payment',
        closesGapAlone: true,
        termsNote: '25% down',
      },
      negotiability: { rating: 'your_call', score: 100, reasons: [] },
    }),
  ],
  breakevenSummary: {
    listPrice: 379_981,
    baselineCashRequired: 90_000,
    gapAmount: 17_516,
    gapPct: 4.6,
    monthlyShortfall: 40,
    incomeValue: 381_465,
    targetBuyPrice: 362_465,
  },
}

describe('HowThisCloses', () => {
  it('opens the Start here row on load and shows engine tags', () => {
    render(<HowThisCloses payload={PAYLOAD} />)
    expect(screen.getByRole('heading', { name: 'How this closes' })).toBeInTheDocument()
    expect(screen.getAllByText(/Ask \$17,516 less — buy at \$362,465/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Start here')).toBeInTheDocument()

    const price = screen.getByRole('button', { name: /Price/ })
    expect(price).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Terms/ })).toHaveAttribute('aria-expanded', 'false')

    expect(screen.getAllByText('Closes the gap: yes').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Sellers say yes: often')).toBeInTheDocument()
    expect(screen.getByText('You decide')).toBeInTheDocument()
  })

  it('expands a collapsed row to the engine one-liner', () => {
    render(<HowThisCloses payload={PAYLOAD} />)
    fireEvent.click(screen.getByRole('button', { name: /Equity/ }))
    expect(screen.getByText('Put $85,000 down (25% down)')).toBeInTheDocument()
  })
})
