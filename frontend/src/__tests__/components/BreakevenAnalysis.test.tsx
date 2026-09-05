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

  it('leads with the dollar gap and a recommended play, not a textbook title', () => {
    renderSection()

    expect(screen.getByRole('heading', { level: 3, name: 'You’re $152,000 from cash flow' })).toBeInTheDocument()
    expect(screen.getByText(/short about \$812 a month/)).toBeInTheDocument()
    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(screen.getAllByText(/Ask \$152,000 less — buy at \$307,000/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Breakeven Analysis')).not.toBeInTheDocument()
    expect(screen.queryByText(/BREAKEVEN REQUIRES/)).not.toBeInTheDocument()
  })

  it('marks Price as the start and states each row as a trade', () => {
    renderSection()

    expect(screen.getByText('Start here')).toBeInTheDocument()
    expect(screen.getByText('Prove the rent is $3,475/mo')).toBeInTheDocument()
    expect(screen.getByText('Put $160,650 down (35% down)')).toBeInTheDocument()
    expect(screen.getByText('$77K')).toBeInTheDocument()
    expect(screen.getByText('$38K less than asking')).toBeInTheDocument()
    expect(requestBreakevenNarrative).not.toHaveBeenCalled()
  })

  it('says why an empty lever is empty instead of analyst slang', () => {
    renderSection()

    expect(screen.getByText('Won’t get you there')).toBeInTheDocument()
    expect(
      screen.getByText('Even a 20% seller-carried second leaves you $340/mo short at full price.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Not enough lift here')).not.toBeInTheDocument()
  })

  it('reads a skipped lever as advice, not as a failed calculation', () => {
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

    expect(screen.getByText('Skip')).toBeInTheDocument()
    expect(screen.getByText('Don’t put more cash in. You don’t need it to break even.')).toBeInTheDocument()
  })

  it('expands with the trade-off and opening line, not a restated spreadsheet', () => {
    requestBreakevenNarrative.mockResolvedValue({ move: 'm', walk_away: 'w', source: 'ai' })
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Price:/ }))
    expect(trackEvent).toHaveBeenCalledWith('breakeven_row_expanded', { family: 'price' })

    expect(screen.getByText(/the loan, the payment, and the cash you bring/)).toBeInTheDocument()
    expect(screen.getByText('Lead with one number: $307,000. Then stop talking.')).toBeInTheDocument()
    expect(screen.getAllByText(/3 price cuts already/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('How to ask for it')).not.toBeInTheDocument()
    expect(screen.queryByText(/ANCHOR — lead with math/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Rent covers every bill and the mortgage at \$323,000/)).not.toBeInTheDocument()
    expect(screen.queryByText(/The ask:/)).not.toBeInTheDocument()
  })

  it('upgrades Your move from the AI once, and hides the blend box unless a blend is actually required', async () => {
    requestBreakevenNarrative.mockResolvedValue({
      move: 'Open here: put $307,000 on the table and stop talking.',
      walk_away: 'If the seller will not come off $459,000 at all, walk.',
      source: 'ai',
    })
    renderSection()

    // Deep gap → blend note is allowed.
    expect(screen.getByText(/most probable close/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Price:/ }))
    await waitFor(() =>
      expect(screen.getByText('Open here: put $307,000 on the table and stop talking.')).toBeInTheDocument(),
    )
    expect(screen.getByText(/Walk away if:/)).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('breakeven_narrative_loaded', { source: 'ai', way_count: 3 })
    expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^Income:/ }))
    expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1)
  })

  it('does not show a blend box on a conversation-sized gap', () => {
    render(
      <BreakevenAnalysis
        payload={{
          ...PAYLOAD,
          breakevenSummary: { ...PAYLOAD.breakevenSummary!, gapPct: 0.5, gapAmount: 1_689, monthlyShortfall: 40 },
          blendRecommendation: '1213 days on market: a modest price cut plus a small seller-carried second.',
        }}
        address="x"
        onMakeItWork={vi.fn()}
        detailOpen={false}
        onToggleDetail={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'You’re $1,689 from cash flow' })).toBeInTheDocument()
    expect(screen.getByText('That’s a conversation, not a restructure.')).toBeInTheDocument()
    expect(screen.queryByText('Most likely close: a blend')).not.toBeInTheDocument()
  })

  it('keeps the deterministic move when the AI call fails', async () => {
    requestBreakevenNarrative.mockRejectedValue(new Error('offline'))
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /^Equity:/ }))
    expect(screen.getByText(/Nobody has to say yes/)).toBeInTheDocument()
    expect(screen.getByText('Your call')).toBeInTheDocument()
    expect(screen.getByText('Your move')).toBeInTheDocument()

    await waitFor(() => expect(requestBreakevenNarrative).toHaveBeenCalledTimes(1))
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
