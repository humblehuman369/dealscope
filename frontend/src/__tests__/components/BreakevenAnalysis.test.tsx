import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DealStructure, DealStructuresPayload } from '@/components/iq-verdict/PathOptionCard'
import { BreakevenAnalysis } from '@/components/iq-verdict/make-it-work/BreakevenAnalysis'

const requestBreakevenNarrative = vi.fn()
const trackEvent = vi.fn()

vi.mock('@/lib/api/plans', () => ({
  requestBreakevenNarrative: (...args: unknown[]) => requestBreakevenNarrative(...args),
}))
vi.mock('@/lib/eventTracking', () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

function structure(id: string, family: DealStructure['family'], extra: Partial<DealStructure> = {}): DealStructure {
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
    structure('rent-verification', 'income', {
      breakeven: { changePct: 18.2, changeAmount: 535, resultAmount: 3_475, resultLabel: 'Target rent', closesGapAlone: true, termsNote: null },
      negotiability: { rating: 'low', score: 30, reasons: ['A 18.2% lift usually means rehab'] },
    }),
    structure('price-negotiation', 'price', {
      breakeven: { changePct: 33.0, changeAmount: 152_000, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null },
      negotiability: { rating: 'medium', score: 55, reasons: ['3 price cuts already', '94 days on market'] },
    }),
    structure('larger-down', 'capital_stack', {
      breakeven: { changePct: 15, changeAmount: 68_850, resultAmount: 160_650, resultLabel: 'Down payment', closesGapAlone: true, termsNote: '35% down' },
      negotiability: { rating: 'your_call', score: 100, reasons: ['Your decision, not the seller\u2019s'] },
    }),
    structure('blended-plan', 'blended', { monthlySavings: 310 }),
  ],
  breakevenSummary: {
    listPrice: 459_000,
    gapAmount: 152_000,
    gapPct: 33.0,
    monthlyShortfall: 812,
    incomeValue: 323_000,
    targetBuyPrice: 307_000,
  },
  blendRecommendation: '3 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
}

function renderSection(onMakeItWork = vi.fn(), onToggleDetail = vi.fn(), detailOpen = false) {
  return render(
    <BreakevenAnalysis
      payload={PAYLOAD}
      address="953 Banyan Dr, Delray Beach, FL 33483"
      onMakeItWork={onMakeItWork}
      detailOpen={detailOpen}
      onToggleDetail={onToggleDetail}
    />,
  )
}

describe('BreakevenAnalysis', () => {
  beforeEach(() => {
    requestBreakevenNarrative.mockReset()
    trackEvent.mockReset()
  })

  it('renders the title, the four rows in fixed order with engine facts, and marks a missing slot honestly', () => {
    renderSection()

    expect(screen.getByRole('heading', { level: 3, name: 'Breakeven Analysis' })).toBeInTheDocument()
    expect(screen.getByText(/Asking is 33.0% above Target Buy/)).toBeInTheDocument()
    expect(screen.getByText(/about \$812\/mo short at asking/)).toBeInTheDocument()

    const rows = screen.getAllByRole('button', { name: /^(Price|Income|Terms|Equity):/ })
    expect(rows.map((r) => r.getAttribute('aria-label')?.split(':')[0])).toEqual(['Price', 'Income', 'Terms', 'Equity'])

    expect(screen.getByText('Cut price 33.0% ($152,000)')).toBeInTheDocument()
    expect(screen.getByText('$307,000')).toBeInTheDocument()
    expect(screen.getByText('Raise rent 18.2% ($535/mo)')).toBeInTheDocument()
    expect(screen.getByText('Raise down payment to 35% down (+$68,850)')).toBeInTheDocument()
    // Terms slot has no engine result → muted copy, never hidden, never invented.
    expect(screen.getByText('Not enough lift here')).toBeInTheDocument()
    // The blend note is the engine's own sentence until the AI one arrives.
    expect(screen.getByText(/most probable close/)).toBeInTheDocument()
    // Nothing was fetched on a plain page view.
    expect(requestBreakevenNarrative).not.toHaveBeenCalled()
  })

  it('expands a row with the explanation and reasons, fetches the recommendation once, and tracks it', async () => {
    requestBreakevenNarrative.mockResolvedValue({
      overview: 'AI overview',
      ways: { price: 'Offer $307,000 and hold.' },
      blend: 'AI blend text.',
      source: 'ai',
    })
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Price:/ }))
    expect(trackEvent).toHaveBeenCalledWith('breakeven_row_expanded', { family: 'price' })
    expect(screen.getByText(/Breakeven is the price where the rent covers every bill/)).toBeInTheDocument()
    expect(screen.getByText(/about \$323,000 here/)).toBeInTheDocument()
    expect(screen.getByText('3 price cuts already')).toBeInTheDocument()
    expect(screen.getByText('94 days on market')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Offer $307,000 and hold.')).toBeInTheDocument())
    expect(screen.getByText('AI blend text.')).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('breakeven_narrative_loaded', { source: 'ai', way_count: 3 })

    const body = requestBreakevenNarrative.mock.calls[0][0]
    expect(body.address).toBe('953 Banyan Dr, Delray Beach, FL 33483')
    expect(body.list_price).toBe(459_000)
    expect(body.ways.map((w: { family: string }) => w.family)).toEqual(['price', 'income', 'capital_stack'])

    // Second expand reuses the same result — no second model call.
    fireEvent.click(screen.getByRole('button', { name: /^Income:/ }))
    expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1)
  })

  it('keeps the deterministic content when the recommendation call fails', async () => {
    requestBreakevenNarrative.mockRejectedValue(new Error('offline'))
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Equity:/ }))
    expect(screen.getByText(/Put more of your own cash down/)).toBeInTheDocument()
    // Chip in the row header plus the label in the expanded panel.
    expect(screen.getAllByText('Your call')).toHaveLength(2)
    expect(screen.getByText('Who decides')).toBeInTheDocument()
    await waitFor(() => expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Recommendation')).not.toBeInTheDocument()
    expect(trackEvent).not.toHaveBeenCalledWith('breakeven_narrative_loaded', expect.anything())
  })

  it('opens the wizard with the tapped family from a row, or with no family from the CTA', () => {
    const onMakeItWork = vi.fn()
    requestBreakevenNarrative.mockResolvedValue({ overview: '', ways: {}, blend: '', source: 'template' })
    renderSection(onMakeItWork)

    fireEvent.click(screen.getByRole('button', { name: /^Income:/ }))
    fireEvent.click(screen.getByRole('button', { name: /Build a plan around income/ }))
    expect(onMakeItWork).toHaveBeenLastCalledWith('income')

    fireEvent.click(screen.getByRole('button', { name: /Build my plan/ }))
    expect(onMakeItWork).toHaveBeenLastCalledWith()
  })

  it('toggles the full-math expander and reflects its state', () => {
    const onToggleDetail = vi.fn()
    const { rerender } = renderSection(vi.fn(), onToggleDetail)
    const toggle = screen.getByRole('button', { name: 'See the full math' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(onToggleDetail).toHaveBeenCalledTimes(1)

    rerender(
      <BreakevenAnalysis payload={PAYLOAD} address="x" onMakeItWork={vi.fn()} detailOpen onToggleDetail={onToggleDetail} />,
    )
    expect(screen.getByRole('button', { name: 'Hide the full math' })).toHaveAttribute('aria-expanded', 'true')
  })
})
