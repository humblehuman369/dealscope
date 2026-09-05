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
      cashRequired: 114_750,
      breakeven: { changePct: 18.2, changeAmount: 535, resultAmount: 3_475, resultLabel: 'Target rent', closesGapAlone: true, termsNote: null },
      negotiability: { rating: 'low', score: 30, reasons: ['A 18.2% lift usually means rehab'] },
    }),
    structure('price-negotiation', 'price', {
      cashRequired: 76_750,
      pitchScript: 'ANCHOR — lead with math, not opinion.\nThen stop talking.',
      caveat: 'A 33% cut is a large ask without distress signals.',
      breakeven: { changePct: 33.0, changeAmount: 152_000, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null },
      negotiability: { rating: 'medium', score: 55, reasons: ['3 price cuts already', 'listed over a year'] },
    }),
    structure('larger-down', 'capital_stack', {
      cashRequired: 183_600,
      breakeven: { changePct: 15, changeAmount: 68_850, resultAmount: 160_650, resultLabel: 'Down payment', closesGapAlone: true, termsNote: '35% down' },
      negotiability: { rating: 'your_call', score: 100, reasons: ['Your decision, not the seller\u2019s'] },
    }),
    structure('blended-plan', 'blended', { monthlySavings: 310 }),
  ],
  breakevenSummary: {
    listPrice: 459_000,
    baselineCashRequired: 114_750,
    gapAmount: 152_000,
    gapPct: 33.0,
    monthlyShortfall: 812,
    incomeValue: 323_000,
    targetBuyPrice: 307_000,
  },
  blendRecommendation: '3 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
  unavailableWays: [
    {
      family: 'financing',
      reason: 'insufficient',
      message: 'Even a 20% seller-carried second leaves you $340/mo short at full price.',
    },
  ],
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

  it('leads with the monthly loss, not with a restatement of the gap percentage', () => {
    renderSection()

    expect(screen.getByRole('heading', { level: 3, name: 'Breakeven Analysis' })).toBeInTheDocument()
    expect(screen.getByText(/loses/)).toBeInTheDocument()
    expect(screen.getByText('$812 a month')).toBeInTheDocument()
    expect(screen.getByText('$152K')).toBeInTheDocument()
    // The gap percentage is arithmetic, not stakes — it must not headline the section.
    expect(screen.queryByText(/Asking is 33.0% above Target Buy/)).not.toBeInTheDocument()
  })

  it('states each row as an ask on the left and its cash cost on the right', () => {
    renderSection()

    const rows = screen.getAllByRole('button', { name: /^(Price|Income|Terms|Equity):/ })
    expect(rows.map((r) => r.getAttribute('aria-label')?.split(':')[0])).toEqual(['Price', 'Income', 'Terms', 'Equity'])

    expect(screen.getByText('Get the seller to $307,000')).toBeInTheDocument()
    expect(screen.getByText('Prove the rent is $3,475/mo')).toBeInTheDocument()
    expect(screen.getByText('Put $160,650 down (35% down)')).toBeInTheDocument()

    // Cash to close is the figure that differs across levers; each is compared
    // to buying at asking so the trade-off is visible without expanding.
    expect(screen.getByText('$77K')).toBeInTheDocument()
    expect(screen.getByText('$38K less than asking')).toBeInTheDocument()
    expect(screen.getByText('$184K')).toBeInTheDocument()
    expect(screen.getByText('$69K more than asking')).toBeInTheDocument()

    // The percentage moved into the expanded panel, not the collapsed row.
    expect(screen.queryByText('Cut price 33.0% ($152,000)')).not.toBeInTheDocument()
    expect(requestBreakevenNarrative).not.toHaveBeenCalled()
  })

  it('says why an empty lever is empty instead of one vague phrase', () => {
    renderSection()

    expect(screen.getByText('Cannot close it alone')).toBeInTheDocument()
    expect(
      screen.getByText('Even a 20% seller-carried second leaves you $340/mo short at full price.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Not enough lift here')).not.toBeInTheDocument()
  })

  it('reads "not needed" as reassurance rather than as a failed lever', () => {
    render(
      <BreakevenAnalysis
        payload={{
          ...PAYLOAD,
          unavailableWays: [
            {
              family: 'capital_stack',
              reason: 'not_needed',
              message: 'Not needed — the rent already covers this price at 20% down.',
            },
          ],
          paths: PAYLOAD.paths.filter((p) => p.family !== 'capital_stack'),
        }}
        address="x"
        onMakeItWork={vi.fn()}
        detailOpen={false}
        onToggleDetail={vi.fn()}
      />,
    )

    expect(screen.getByText('Not needed here')).toBeInTheDocument()
    expect(screen.getByText('Not needed — the rent already covers this price at 20% down.')).toBeInTheDocument()
  })

  it('surfaces the negotiation script and the caveat in the expanded row', () => {
    requestBreakevenNarrative.mockResolvedValue({ move: 'm', walk_away: 'w', source: 'ai' })
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Price:/ }))
    expect(trackEvent).toHaveBeenCalledWith('breakeven_row_expanded', { family: 'price' })

    // The mechanism and the trade-off, which the row itself cannot show.
    expect(screen.getByText(/Rent covers every bill and the mortgage at \$323,000/)).toBeInTheDocument()
    expect(screen.getByText('The ask: 33.0% off asking · $152,000')).toBeInTheDocument()

    // The script is the differentiated content; it used to hide behind "full math".
    expect(screen.getByText('How to ask for it')).toBeInTheDocument()
    expect(screen.getByText(/ANCHOR — lead with math, not opinion/)).toBeInTheDocument()
    expect(screen.getByText(/A 33% cut is a large ask/)).toBeInTheDocument()

    expect(screen.getByText('Your leverage')).toBeInTheDocument()
    expect(screen.getByText('3 price cuts already')).toBeInTheDocument()
    expect(screen.getByText('listed over a year')).toBeInTheDocument()
  })

  it('fetches one section-level move with a walk-away, not four per-row paragraphs', async () => {
    requestBreakevenNarrative.mockResolvedValue({
      move: 'Open here: put $307,000 on the table and stop talking.',
      walk_away: 'If the seller will not come off $459,000 at all, walk.',
      source: 'ai',
    })
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Price:/ }))

    await waitFor(() => expect(screen.getByText('Your move')).toBeInTheDocument())
    expect(screen.getByText('Open here: put $307,000 on the table and stop talking.')).toBeInTheDocument()
    expect(screen.getByText('Walk away if:')).toBeInTheDocument()
    expect(screen.getByText(/If the seller will not come off \$459,000/)).toBeInTheDocument()
    expect(screen.queryByText('Recommendation')).not.toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('breakeven_narrative_loaded', { source: 'ai', way_count: 3 })

    const body = requestBreakevenNarrative.mock.calls[0][0]
    expect(body.address).toBe('953 Banyan Dr, Delray Beach, FL 33483')
    expect(body.list_price).toBe(459_000)
    expect(body.baseline_cash_required).toBe(114_750)
    expect(body.ways.map((w: { family: string }) => w.family)).toEqual(['price', 'income', 'capital_stack'])
    // Cash is what distinguishes the levers, so the model has to see it.
    expect(body.ways.map((w: { cash_required: number }) => w.cash_required)).toEqual([76_750, 114_750, 183_600])

    // Second expand reuses the same result — no second model call.
    fireEvent.click(screen.getByRole('button', { name: /^Income:/ }))
    expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1)
  })

  it('keeps every deterministic block when the move call fails', async () => {
    requestBreakevenNarrative.mockRejectedValue(new Error('offline'))
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Equity:/ }))
    expect(screen.getByText(/The one lever that needs nobody's permission/)).toBeInTheDocument()
    expect(screen.getByText('Your call')).toBeInTheDocument()
    // "Your call" is not a negotiation, so there is no leverage list to show.
    expect(screen.queryByText('Your leverage')).not.toBeInTheDocument()
    expect(screen.getByText(/most probable close/)).toBeInTheDocument()

    await waitFor(() => expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('Your move')).not.toBeInTheDocument())
    expect(trackEvent).not.toHaveBeenCalledWith('breakeven_narrative_loaded', expect.anything())
  })

  it('opens the wizard with the tapped family from a row, or with no family from the CTA', () => {
    const onMakeItWork = vi.fn()
    requestBreakevenNarrative.mockResolvedValue({ move: 'm', walk_away: 'w', source: 'template' })
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
