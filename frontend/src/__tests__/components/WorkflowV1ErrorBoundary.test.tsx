import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const capturePostHog = vi.fn()
vi.mock('@/lib/posthog', () => ({
  capturePostHog: (...args: unknown[]) => capturePostHog(...args),
}))

import { VerdictCard } from '@/components/discovery/VerdictCard'
import { PlanView } from '@/components/workflow/PlanView'
import { WorkflowV1ErrorBoundary } from '@/components/workflow/WorkflowV1ErrorBoundary'
import { PLAN_TARGET_DEFAULTS } from '@/lib/dealStructures/planMetrics'
import { formatPlanSnapshot } from '@/lib/dealStructures/planSnapshot'

function planModel() {
  return formatPlanSnapshot({
    optionKey: '3',
    offerPrice: 625_999,
    cashNeeded: 143_980,
    monthlyCashFlow: 213,
    cashOnCash: 1.77,
    capRate: 4.84,
    dscr: 1.09,
    bankLoan: 385_571,
    sellerAmount: 115_228,
    sellerRate: 0,
    balloonYear: 5,
    downPaymentPercent: 0.2,
    monthlyRent: 4_345,
    listPrice: 625_999,
    iqEstimate: 477_699,
    targetBuy: 453_814,
    askingGapDisplayPct: -27.5,
    gapLeftPct: 27.5,
    targetsMet: 0,
    capMet: false,
    cocMet: false,
    cfMet: false,
    dscrMet: false,
    vsList: 0,
    equity: null,
    sourceLow: null,
    sourceHigh: null,
    appliedStructureId: 'opt-3',
    options: [],
    targets: PLAN_TARGET_DEFAULTS,
  })
}

describe('WorkflowV1ErrorBoundary', () => {
  it('catches a throw inside the V1 Verdict card, reports layout v1 and the route, then the parent can render legacy', () => {
    const onCaught = vi.fn()
    render(
      <WorkflowV1ErrorBoundary route="/discovery" onCaught={onCaught}>
        <VerdictCard
          debugThrow
          listPrice={625_999}
          incomeValue={477_699}
          targetBuy={453_814}
          dealGapDisplayPct={-27.5}
          sentence="Listed at $626K."
          call="worth_pursuing"
          callFired={[]}
          gap={27.5}
          signals={0}
          closes={false}
          isAuthenticated={false}
          onShowMath={vi.fn()}
          onBuildPlan={vi.fn()}
        />
      </WorkflowV1ErrorBoundary>,
    )
    expect(onCaught).toHaveBeenCalledOnce()
    expect(capturePostHog).toHaveBeenCalledWith(
      '$exception',
      expect.objectContaining({
        layout: 'v1',
        route: '/discovery',
        message: 'workflow-v1 verdict card',
      }),
    )
  })

  it('catches a throw inside the V1 Plan card and reports the Plan route', () => {
    const onCaught = vi.fn()
    render(
      <WorkflowV1ErrorBoundary route="/discovery?view=plan" onCaught={onCaught}>
        <PlanView
          debugThrow
          model={planModel()}
          onTune={vi.fn()}
          onApply={vi.fn()}
          onStartDeal={vi.fn()}
        />
      </WorkflowV1ErrorBoundary>,
    )
    expect(onCaught).toHaveBeenCalledOnce()
    expect(capturePostHog).toHaveBeenCalledWith(
      '$exception',
      expect.objectContaining({
        layout: 'v1',
        route: '/discovery?view=plan',
        message: 'workflow-v1 plan card',
      }),
    )
    expect(screen.queryByText('Your plan: Option 3')).not.toBeInTheDocument()
  })
})
