import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlanView } from '@/components/workflow/PlanView'
import { PLAN_TARGET_DEFAULTS } from '@/lib/dealStructures/planMetrics'
import { formatPlanSnapshot } from '@/lib/dealStructures/planSnapshot'

function willowModel() {
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
    options: [
      {
        family: 'financing',
        key: '3',
        structureId: 'opt-3',
        headline: 'Seller carries $115,228 at 0%',
        familyLabel: 'Creative finance',
        metrics: {
          offerPrice: 625_999,
          sellerSecond: 115_228,
          sellerRate: 0,
          balloonYear: 5,
          monthlyRent: 4_345,
          downPaymentPercent: 0.2,
          sellerInterestOnly: true,
          cashToClose: 143_980,
          monthlyCashFlow: 213,
          capRate: 4.84,
          cashOnCash: 1.77,
          dscr: 1.09,
          bankLoan: 385_571,
        },
        targetsMet: 0,
        isBest: false,
      },
      {
        family: 'blended',
        key: 'blend',
        structureId: 'blended-plan',
        headline: '$500,000 with the seller carrying $115,228 at 0%',
        familyLabel: 'Blend',
        metrics: {
          offerPrice: 500_000,
          sellerSecond: 115_228,
          sellerRate: 0,
          balloonYear: 5,
          monthlyRent: 4_345,
          downPaymentPercent: 0.2,
          sellerInterestOnly: true,
          cashToClose: 115_000,
          monthlyCashFlow: 817,
          capRate: 6.5,
          cashOnCash: 8.5,
          dscr: 1.4,
          bankLoan: 284_772,
        },
        targetsMet: 4,
        isBest: true,
      },
    ],
    targets: PLAN_TARGET_DEFAULTS,
  })
}

describe('PlanView', () => {
  it('applies a tapped option and starts the deal from Next moves', () => {
    const onApply = vi.fn()
    const onStartDeal = vi.fn()
    const onTune = vi.fn()
    render(
      <PlanView model={willowModel()} onTune={onTune} onApply={onApply} onStartDeal={onStartDeal} />,
    )

    expect(screen.getByText('Your plan: creative finance')).toBeInTheDocument()
    expect(screen.getAllByText('$625,999').length).toBeGreaterThan(0)
    expect(screen.getByText('Meets 0 of 4')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Blend/ }))
    expect(onApply).toHaveBeenCalledWith('blended-plan')

    fireEvent.click(screen.getByRole('button', { name: 'Apply the blend' }))
    expect(onApply).toHaveBeenCalledWith('blended-plan')

    fireEvent.click(screen.getByRole('button', { name: 'Tune the numbers' }))
    expect(onTune).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Start working this deal' }))
    expect(onStartDeal).toHaveBeenCalledOnce()
  })

  it('opens the Share menu next to Start working this deal', () => {
    const onShareFullReport = vi.fn()
    const onShareExcel = vi.fn()
    const onSharePdf = vi.fn()
    render(
      <PlanView
        model={willowModel()}
        onTune={vi.fn()}
        onApply={vi.fn()}
        onStartDeal={vi.fn()}
        onShareFullReport={onShareFullReport}
        onShareExcel={onShareExcel}
        onSharePdf={onSharePdf}
        trialPitch={<p>Unlock the full worksheet</p>}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Full Report' }))
    expect(onShareFullReport).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download Excel' }))
    expect(onShareExcel).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'PDF' }))
    expect(onSharePdf).toHaveBeenCalledOnce()

    expect(screen.getByText('Unlock the full worksheet')).toBeInTheDocument()
  })
})
