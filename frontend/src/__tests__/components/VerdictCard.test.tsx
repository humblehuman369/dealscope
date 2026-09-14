import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))
vi.mock('@/lib/metaPixel', () => ({ newMetaEventId: () => 'evt-verdict' }))
vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}))

import { VerdictCard } from '@/components/discovery/VerdictCard'
import { NUMBER_LABELS, VERDICT_TIPS } from '@/lib/verdictCopy'
import { VERDICT_CALL_LABELS, verdictRules } from '@/lib/verdictRules'

const WILLOW_SENTENCE =
  'Listed at $626K. Worth about $454K to you as a rental. That is a 27.5% gap. After 10 price cuts and 224 days, this seller will most likely take a smaller price cut plus a small seller-carried second.'

function renderWillow() {
  return render(
    <VerdictCard
      listPrice={625_999}
      incomeValue={477_699}
      targetBuy={453_814}
      dealGapDisplayPct={-27.5}
      sentence={WILLOW_SENTENCE}
      call="worth_pursuing"
      callFired={['224 days on market', '10 price cuts']}
      propertyId="prop-willow"
      propertyState="FL"
      gap={27.5}
      signals={2}
      closes={true}
      isAuthenticated={false}
      onShowMath={vi.fn()}
      onBuildPlan={vi.fn()}
    />,
  )
}

describe('VerdictCard', () => {
  beforeEach(() => {
    trackEvent.mockClear()
    const store = new Map<string, string>()
    vi.mocked(window.localStorage.getItem).mockImplementation((key) => store.get(key) ?? null)
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      store.set(key, String(value))
    })
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      store.clear()
    })
    window.sessionStorage.clear()
  })

  it('renders a supplied gap slider under the three numbers', () => {
    render(
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence={WILLOW_SENTENCE}
        call="worth_pursuing"
        callFired={[]}
        gap={27.5}
        signals={0}
        closes={false}
        isAuthenticated={false}
        onShowMath={vi.fn()}
        onBuildPlan={vi.fn()}
        gapSlider={<div>Gap slider fixture</div>}
      />,
    )
    expect(screen.getByText('Gap slider fixture')).toBeInTheDocument()
  })

  it('shows the Wandering Willow numbers, gap, and Section 5 sentence', () => {
    renderWillow()
    expect(screen.getByText(WILLOW_SENTENCE)).toBeInTheDocument()
    expect(screen.getByText('$625,999')).toBeInTheDocument()
    expect(screen.getByText('$477,699')).toBeInTheDocument()
    expect(screen.getByText('$453,814')).toBeInTheDocument()
    expect(screen.getByText('Deal Gap -27.5%')).toBeInTheDocument()
    expect(screen.getByText(NUMBER_LABELS.market)).toBeInTheDocument()
    expect(screen.getByText(NUMBER_LABELS.target)).toBeInTheDocument()
  })

  it('shows first-run tips until Got it, then keeps them hidden after reload', () => {
    const first = renderWillow()
    for (const tip of VERDICT_TIPS) {
      expect(screen.getByText(tip)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByText(VERDICT_TIPS[0])).not.toBeInTheDocument()
    expect(window.localStorage.getItem('dgiq_tips_seen_v1')).toBe('1')
    first.unmount()

    renderWillow()
    expect(screen.queryByText(VERDICT_TIPS[0])).not.toBeInTheDocument()
  })

  it('renders the call label from verdictRules, not a hardcoded string in the chip', () => {
    renderWillow()
    expect(screen.getByText(VERDICT_CALL_LABELS.worth_pursuing)).toBeInTheDocument()
    expect(verdictRules.gapWalkAwayPct).toBe(35)
  })

  it('fires verdict_viewed once with the call property', () => {
    const { rerender } = renderWillow()
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith(
      'verdict_viewed',
      expect.objectContaining({
        call: 'worth_pursuing',
        gap: 27.5,
        signals: 2,
        closes: true,
        property_id: 'prop-willow',
        property_state: 'FL',
      }),
      'evt-verdict',
    )
    rerender(
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence={WILLOW_SENTENCE}
        call="worth_pursuing"
        callFired={['224 days on market', '10 price cuts']}
        propertyId="prop-willow"
        propertyState="FL"
        gap={27.5}
        signals={2}
        closes={true}
        isAuthenticated={false}
        onShowMath={vi.fn()}
        onBuildPlan={vi.fn()}
      />,
    )
    expect(trackEvent).toHaveBeenCalledTimes(1)
  })

  it('shows the source line from the Math-tab roster without a source Why? when all answered', () => {
    render(
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence={WILLOW_SENTENCE}
        call="worth_pursuing"
        callFired={[]}
        gap={27.5}
        signals={0}
        closes={false}
        isAuthenticated={false}
        onShowMath={vi.fn()}
        onBuildPlan={vi.fn()}
        sourceStatus={{ answered: 5, total: 5, missingLabels: [] }}
      />,
    )
    expect(screen.getByText('Based on 5 of 5 sources.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Why?' })).toHaveLength(2)
  })

  it('names the missing source and toggles the Why? copy', () => {
    render(
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence={WILLOW_SENTENCE}
        call="worth_pursuing"
        callFired={[]}
        gap={27.5}
        signals={0}
        closes={false}
        isAuthenticated={false}
        onShowMath={vi.fn()}
        onBuildPlan={vi.fn()}
        sourceStatus={{ answered: 4, total: 5, missingLabels: ['Zillow'] }}
      />,
    )
    const sourceLine = screen.getByText(/Based on 4 of 5 sources\. Zillow unavailable\./)
    expect(sourceLine).toBeInTheDocument()
    fireEvent.click(within(sourceLine).getByRole('button', { name: 'Why?' }))
    expect(
      screen.getByText(
        'These are the same sources the Math tab lists. A source counts when it returned a value for this house. Unavailable means that source had no data — nothing is guessed.',
      ),
    ).toBeInTheDocument()
  })

  it('routes Show the math and Build the plan through the supplied handlers', () => {
    const onShowMath = vi.fn()
    const onBuildPlan = vi.fn()
    render(
      <VerdictCard
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
        sentence={WILLOW_SENTENCE}
        call="worth_pursuing"
        callFired={[]}
        gap={27.5}
        signals={0}
        closes={false}
        isAuthenticated={false}
        onShowMath={onShowMath}
        onBuildPlan={onBuildPlan}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show the math' }))
    fireEvent.click(screen.getByRole('button', { name: 'Build the plan' }))
    expect(onShowMath).toHaveBeenCalledTimes(1)
    expect(onBuildPlan).toHaveBeenCalledTimes(1)
  })
})
