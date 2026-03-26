'use client'

import React from 'react'
import type {
  StrategyType,
  AnyStrategyState,
  AnyStrategyMetrics,
  LTRDealMakerState,
  LTRDealMakerMetrics,
  STRDealMakerState,
  STRMetrics,
  BRRRRDealMakerState,
  BRRRRMetrics,
  FlipDealMakerState,
  FlipMetrics,
  HouseHackDealMakerState,
  HouseHackMetrics,
  WholesaleDealMakerState,
  WholesaleMetrics,
} from './types'

// ---------------------------------------------------------------------------
// Shared visual building blocks (matches StrategyBreakdown.tsx styling)
// ---------------------------------------------------------------------------

function fmt(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

function pct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

const colors = {
  brand: { blue: 'var(--accent-sky)' },
  text: { primary: 'var(--text-heading)', body: 'var(--text-body)' },
  ui: { border: 'var(--border-subtle)' },
} as const

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: color }}>
        <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color }}>{title}</span>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-1.5 pl-6">
      <span className="text-base" style={{ color: colors.text.body }}>{label}</span>
      <span className="text-base font-semibold tabular-nums" style={{ color: color || colors.text.primary }}>
        {value}
      </span>
    </div>
  )
}

function NegRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 pl-6">
      <span className="text-base" style={{ color: colors.text.body }}>{label}</span>
      <span className="text-base font-semibold tabular-nums" style={{ color: colors.brand.blue }}>({value})</span>
    </div>
  )
}

function TotalRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex justify-between pt-2.5 pb-2.5 mt-1.5 pl-6"
      style={{ borderTop: `2px solid ${color}`, borderBottom: `2px solid ${color}` }}
    >
      <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{label}</span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{value}</span>
    </div>
  )
}

function StatusRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex justify-between py-1.5 pl-6">
      <span className="text-base" style={{ color: colors.text.body }}>{label}</span>
      <span className="text-base font-semibold" style={{ color: pass ? '#10B981' : '#F43F5E' }}>
        {pass ? 'PASS' : 'FAIL'}
      </span>
    </div>
  )
}

function Divider() {
  return <hr className="my-5" style={{ borderColor: colors.ui.border }} />
}

// ---------------------------------------------------------------------------
// Safe accessor: returns 0 if the key is missing or not a finite number.
// Handles both camelCase and snake_case backend responses.
// ---------------------------------------------------------------------------

function num(obj: Record<string, unknown>, key: string): number {
  const v = obj[key]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

// ---------------------------------------------------------------------------
// LTR Breakdown
// ---------------------------------------------------------------------------

function LTRBreakdown({ state, metrics, listPrice }: { state: LTRDealMakerState; metrics: LTRDealMakerMetrics; listPrice: number }) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = state.buyPrice * state.downPaymentPercent
  const closingCosts = state.buyPrice * state.closingCostsPercent
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const grossMonthly = num(m, 'grossMonthlyIncome') || (state.monthlyRent + state.otherIncome)
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualProfit = num(m, 'annualProfit')
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')
  const cashNeeded = num(m, 'cashNeeded') || (downPayment + closingCosts)

  return (
    <div>
      <SectionHeader title="What You'd Pay" color={colors.brand.blue} />
      <Row label="Market Price" value={fmt(listPrice || state.buyPrice)} />
      <Row label="Buy Price" value={fmt(state.buyPrice)} color={colors.brand.blue} />
      <Row label="Loan Amount" value={fmt(loanAmount)} />
      <Row label={`Down Payment (${Math.round(state.downPaymentPercent * 100)}%)`} value={fmt(downPayment)} />
      <Row label={`Closing Costs (${Math.round(state.closingCostsPercent * 100)}%)`} value={fmt(closingCosts)} />
      {state.rehabBudget > 0 && <Row label="Rehab Budget" value={fmt(state.rehabBudget)} color={colors.brand.blue} />}
      <TotalRow label="Cash Needed" value={fmt(cashNeeded + state.rehabBudget)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Your Loan Payment" color={colors.brand.blue} />
      <Row label="Interest Rate" value={pct(state.interestRate)} />
      <Row label="Loan Term" value={`${state.loanTermYears} years`} />
      <Row label="Monthly Payment" value={fmt(monthlyPayment)} />
      <TotalRow label="Annual Payment" value={fmt(monthlyPayment * 12)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="What It Costs" color={colors.brand.blue} />
      <Row label="Property Tax" value={`${fmt(state.annualPropertyTax)}/yr`} />
      <Row label="Insurance" value={`${fmt(state.annualInsurance)}/yr`} />
      <Row label={`Management (${Math.round(state.managementRate * 100)}%)`} value={`${fmt(grossMonthly * state.managementRate * 12)}/yr`} />
      <Row label={`Maintenance (${Math.round(state.maintenanceRate * 100)}%)`} value={`${fmt(grossMonthly * state.maintenanceRate * 12)}/yr`} />
      <Row label={`Vacancy (${Math.round(state.vacancyRate * 100)}%)`} value={`${fmt(grossMonthly * state.vacancyRate * 12)}/yr`} />
      {state.monthlyHoa > 0 && <Row label="HOA" value={`${fmt(state.monthlyHoa * 12)}/yr`} />}
      <TotalRow label="Total Expenses" value={`${fmt(totalMonthlyExp * 12)}/yr`} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="What You'd Earn" color={colors.brand.blue} />
      <Row label="Monthly Rent" value={fmt(state.monthlyRent)} />
      {state.otherIncome > 0 && <Row label="Other Income" value={fmt(state.otherIncome)} />}
      <Row label="Gross Monthly" value={fmt(grossMonthly)} />
      <Row label="Annual Cash Flow" value={fmt(annualProfit)} color={annualProfit >= 0 ? colors.brand.blue : '#F43F5E'} />
      <Row label="Cap Rate" value={`${capRate.toFixed(2)}%`} />
      <TotalRow label="Cash-on-Cash" value={`${cocReturn.toFixed(2)}%`} color={colors.brand.blue} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// STR Breakdown
// ---------------------------------------------------------------------------

function STRBreakdown({ state, metrics, listPrice }: { state: STRDealMakerState; metrics: STRMetrics; listPrice: number }) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = num(m, 'downPaymentAmount') || (state.buyPrice * state.downPaymentPercent)
  const closingCosts = num(m, 'closingCostsAmount') || (state.buyPrice * state.closingCostsPercent)
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const cashNeeded = num(m, 'cashNeeded') || (downPayment + closingCosts + state.furnitureSetupCost)
  const nightsOccupied = num(m, 'nightsOccupied')
  const monthlyGross = num(m, 'monthlyGrossRevenue')
  const annualGross = num(m, 'annualGrossRevenue')
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualCashFlow = num(m, 'annualCashFlow')
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')

  const me = (m.monthlyExpenses || {}) as Record<string, number>

  return (
    <div>
      <SectionHeader title="What You'd Pay" color={colors.brand.blue} />
      <Row label="Market Price" value={fmt(listPrice || state.buyPrice)} />
      <Row label="Buy Price" value={fmt(state.buyPrice)} color={colors.brand.blue} />
      <Row label="Loan Amount" value={fmt(loanAmount)} />
      <Row label={`Down Payment (${Math.round(state.downPaymentPercent * 100)}%)`} value={fmt(downPayment)} />
      <Row label={`Closing Costs (${Math.round(state.closingCostsPercent * 100)}%)`} value={fmt(closingCosts)} />
      {state.rehabBudget > 0 && <Row label="Rehab Budget" value={fmt(state.rehabBudget)} color={colors.brand.blue} />}
      {state.furnitureSetupCost > 0 && <Row label="Furniture & Setup" value={fmt(state.furnitureSetupCost)} color={colors.brand.blue} />}
      <TotalRow label="Cash Needed" value={fmt(cashNeeded)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Revenue" color={colors.brand.blue} />
      <Row label="Avg Daily Rate" value={fmt(state.averageDailyRate)} />
      <Row label="Occupancy" value={pct(state.occupancyRate)} />
      <Row label="Nights Occupied" value={`${Math.round(nightsOccupied)}/yr`} />
      <Row label="Monthly Gross" value={fmt(monthlyGross)} />
      <TotalRow label="Annual Gross Revenue" value={fmt(annualGross)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Monthly Expenses" color={colors.brand.blue} />
      <Row label="Mortgage" value={`${fmt(monthlyPayment)}/mo`} />
      <Row label="Property Tax" value={`${fmt(me.taxes ?? state.annualPropertyTax / 12)}/mo`} />
      <Row label="Insurance" value={`${fmt(me.insurance ?? state.annualInsurance / 12)}/mo`} />
      {(me.hoa ?? state.monthlyHoa) > 0 && <Row label="HOA" value={`${fmt(me.hoa ?? state.monthlyHoa)}/mo`} />}
      <Row label="Platform Fees" value={`${fmt(me.platformFees ?? 0)}/mo`} />
      <Row label="Management" value={`${fmt(me.management ?? 0)}/mo`} />
      <Row label="Cleaning" value={`${fmt(me.cleaning ?? 0)}/mo`} />
      <Row label="Supplies" value={`${fmt(me.supplies ?? state.suppliesMonthly)}/mo`} />
      <Row label="Utilities" value={`${fmt(me.utilities ?? state.additionalUtilitiesMonthly)}/mo`} />
      <Row label="Maintenance" value={`${fmt(me.maintenance ?? 0)}/mo`} />
      <TotalRow label="Total Monthly" value={`${fmt(totalMonthlyExp)}/mo`} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Performance" color={colors.brand.blue} />
      <Row label="Annual Cash Flow" value={fmt(annualCashFlow)} color={annualCashFlow >= 0 ? colors.brand.blue : '#F43F5E'} />
      <Row label="Cap Rate" value={`${capRate.toFixed(2)}%`} />
      <TotalRow label="Cash-on-Cash" value={`${cocReturn.toFixed(2)}%`} color={colors.brand.blue} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// BRRRR Breakdown
// ---------------------------------------------------------------------------

function BRRRRBreakdown({ state, metrics }: { state: BRRRRDealMakerState; metrics: BRRRRMetrics }) {
  const m = metrics as unknown as Record<string, unknown>
  const initialDown = num(m, 'initialDownPayment')
  const initialClosing = num(m, 'initialClosingCosts')
  const cashPhase1 = num(m, 'cashRequiredPhase1')
  const totalRehab = num(m, 'totalRehabCost')
  const holdingCosts = num(m, 'holdingCosts')
  const allIn = num(m, 'allInCost')
  const refiLoan = num(m, 'refinanceLoanAmount')
  const refiClosing = num(m, 'refinanceClosingCosts')
  const newPayment = num(m, 'newMonthlyPayment')
  const cashOut = num(m, 'cashOutAtRefinance')
  const totalInvested = num(m, 'totalCashInvested')
  const cashLeft = num(m, 'cashLeftInDeal')
  const capitalRecycled = num(m, 'capitalRecycledPct')
  const monthlyCF = num(m, 'postRefiMonthlyCashFlow')
  const annualCF = num(m, 'postRefiAnnualCashFlow')
  const coc = num(m, 'postRefiCashOnCash')

  return (
    <div>
      <SectionHeader title="Phase 1 — Buy" color={colors.brand.blue} />
      <Row label="Purchase Price" value={fmt(state.purchasePrice)} />
      <Row label={`Hard Money Down (${Math.round(state.downPaymentPercent * 100)}%)`} value={fmt(initialDown)} />
      <Row label="Closing Costs" value={fmt(initialClosing)} />
      <Row label="Hard Money Rate" value={pct(state.hardMoneyRate)} />
      <TotalRow label="Cash Required" value={fmt(cashPhase1)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Phase 2 — Rehab" color={colors.brand.blue} />
      <Row label="Rehab Budget" value={fmt(state.rehabBudget)} />
      <Row label={`Contingency (${Math.round(state.contingencyPct * 100)}%)`} value={fmt(state.rehabBudget * state.contingencyPct)} />
      <Row label={`Holding Costs (${state.holdingPeriodMonths} mo)`} value={fmt(holdingCosts)} />
      <Row label="After Repair Value" value={fmt(state.arv)} color={colors.brand.blue} />
      <TotalRow label="All-In Cost" value={fmt(allIn)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Refinance" color={colors.brand.blue} />
      <Row label={`Refi Loan (${Math.round(state.refinanceLtv * 100)}% LTV)`} value={fmt(refiLoan)} />
      <Row label="Refi Closing Costs" value={fmt(refiClosing)} />
      <Row label="Interest Rate" value={pct(state.refinanceInterestRate)} />
      <Row label="New Monthly Payment" value={fmt(newPayment)} />
      <TotalRow label="Cash Out at Refi" value={fmt(cashOut)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Capital Recycling" color={colors.brand.blue} />
      <Row label="Total Cash Invested" value={fmt(totalInvested)} />
      <Row label="Cash Left in Deal" value={fmt(cashLeft)} color={cashLeft <= 0 ? '#10B981' : colors.text.primary} />
      <Row label="Capital Recycled" value={`${capitalRecycled.toFixed(1)}%`} color={capitalRecycled >= 100 ? '#10B981' : colors.text.primary} />
      <Row label="Monthly Cash Flow" value={fmt(monthlyCF)} color={monthlyCF >= 0 ? colors.brand.blue : '#F43F5E'} />
      <Row label="Annual Cash Flow" value={fmt(annualCF)} color={annualCF >= 0 ? colors.brand.blue : '#F43F5E'} />
      <TotalRow label="Cash-on-Cash" value={coc > 999 ? '∞' : `${coc.toFixed(2)}%`} color={colors.brand.blue} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Flip Breakdown
// ---------------------------------------------------------------------------

function FlipBreakdown({ state, metrics }: { state: FlipDealMakerState; metrics: FlipMetrics }) {
  const m = metrics as unknown as Record<string, unknown>
  const loanAmount = num(m, 'loanAmount')
  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const points = num(m, 'loanPointsCost')
  const cashAtPurchase = num(m, 'cashAtPurchase')
  const totalRehab = num(m, 'totalRehabCost')
  const holdingMonths = num(m, 'holdingPeriodMonths')
  const totalHolding = num(m, 'totalHoldingCosts')
  const interestCosts = num(m, 'interestCosts')
  const grossProceeds = num(m, 'grossSaleProceeds')
  const sellingCosts = num(m, 'sellingCosts')
  const netProceeds = num(m, 'netSaleProceeds')
  const totalProject = num(m, 'totalProjectCost')
  const grossProfit = num(m, 'grossProfit')
  const capGains = num(m, 'capitalGainsTax')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annualizedRoi = num(m, 'annualizedRoi')

  return (
    <div>
      <SectionHeader title="Acquisition" color={colors.brand.blue} />
      <Row label="Purchase Price" value={fmt(state.purchasePrice)} />
      {state.financingType !== 'cash' && (
        <>
          <Row label="Loan Amount" value={fmt(loanAmount)} />
          <Row label="Down Payment" value={fmt(downPayment)} />
          {points > 0 && <Row label={`Points (${state.loanPoints})`} value={fmt(points)} />}
        </>
      )}
      <Row label="Closing Costs" value={fmt(closingCosts)} />
      <TotalRow label="Cash at Purchase" value={fmt(cashAtPurchase)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Rehab & Holding" color={colors.brand.blue} />
      <Row label="Rehab Budget" value={fmt(state.rehabBudget)} />
      <Row label={`Contingency (${Math.round(state.contingencyPct * 100)}%)`} value={fmt(state.rehabBudget * state.contingencyPct)} />
      <Row label="Total Rehab" value={fmt(totalRehab)} />
      <Row label={`Holding Period`} value={`${holdingMonths.toFixed(1)} months`} />
      <Row label="Holding Costs" value={fmt(totalHolding)} />
      {state.financingType !== 'cash' && <Row label="Interest Costs" value={fmt(interestCosts)} />}
      <TotalRow label="Total Project Cost" value={fmt(totalProject)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Sale" color={colors.brand.blue} />
      <Row label="ARV / Sale Price" value={fmt(grossProceeds || state.arv)} />
      <NegRow label={`Selling Costs (${Math.round(state.sellingCostsPct * 100)}%)`} value={fmt(sellingCosts)} />
      <TotalRow label="Net Proceeds" value={fmt(netProceeds)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Profit Analysis" color={colors.brand.blue} />
      <Row label="Gross Profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? colors.brand.blue : '#F43F5E'} />
      {capGains > 0 && <NegRow label={`Capital Gains Tax (${Math.round(state.capitalGainsRate * 100)}%)`} value={fmt(capGains)} />}
      <TotalRow label="Net Profit" value={fmt(netProfit)} color={colors.brand.blue} />
      <div className="mt-3" />
      <Row label="ROI" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? colors.brand.blue : '#F43F5E'} />
      <Row label="Annualized ROI" value={`${annualizedRoi.toFixed(1)}%`} color={annualizedRoi >= 0 ? colors.brand.blue : '#F43F5E'} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// House Hack Breakdown
// ---------------------------------------------------------------------------

function HouseHackBreakdown({ state, metrics }: { state: HouseHackDealMakerState; metrics: HouseHackMetrics }) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const cashToClose = num(m, 'cashToClose')
  const pi = num(m, 'monthlyPrincipalInterest')
  const pmi = num(m, 'monthlyPmi')
  const taxes = num(m, 'monthlyTaxes')
  const ins = num(m, 'monthlyInsurance')
  const piti = num(m, 'monthlyPITI')
  const rentedUnits = num(m, 'rentedUnits')
  const grossRental = num(m, 'grossRentalIncome')
  const effectiveRental = num(m, 'effectiveRentalIncome')
  const opex = num(m, 'monthlyOperatingExpenses')
  const netRental = num(m, 'netRentalIncome')
  const effectiveCost = num(m, 'effectiveHousingCost')
  const savings = num(m, 'housingCostSavings')
  const offset = num(m, 'housingOffsetPercent')

  return (
    <div>
      <SectionHeader title="What You'd Pay" color={colors.brand.blue} />
      <Row label="Purchase Price" value={fmt(state.purchasePrice)} />
      <Row label={`Down Payment (${(state.downPaymentPercent * 100).toFixed(1)}%)`} value={fmt(downPayment)} />
      <Row label={`Closing Costs (${Math.round(state.closingCostsPercent * 100)}%)`} value={fmt(closingCosts)} />
      <TotalRow label="Cash to Close" value={fmt(cashToClose)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Monthly Payment" color={colors.brand.blue} />
      <Row label="Principal & Interest" value={`${fmt(pi)}/mo`} />
      {pmi > 0 && <Row label="PMI/MIP" value={`${fmt(pmi)}/mo`} />}
      <Row label="Property Tax" value={`${fmt(taxes)}/mo`} />
      <Row label="Insurance" value={`${fmt(ins)}/mo`} />
      {state.monthlyHoa > 0 && <Row label="HOA" value={`${fmt(state.monthlyHoa)}/mo`} />}
      <TotalRow label="Total PITI" value={`${fmt(piti)}/mo`} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Rental Income" color={colors.brand.blue} />
      <Row label="Rented Units" value={`${Math.round(rentedUnits)}`} />
      <Row label="Avg Rent / Unit" value={`${fmt(state.avgRentPerUnit)}/mo`} />
      <Row label="Gross Rental Income" value={`${fmt(grossRental)}/mo`} />
      <NegRow label={`Vacancy (${Math.round(state.vacancyRate * 100)}%)`} value={`${fmt(grossRental - effectiveRental)}/mo`} />
      {opex > 0 && <NegRow label="Operating Expenses" value={`${fmt(opex)}/mo`} />}
      <TotalRow label="Net Rental Income" value={`${fmt(netRental)}/mo`} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Your Housing Cost" color={colors.brand.blue} />
      <Row label="Total PITI" value={`${fmt(piti)}/mo`} />
      <NegRow label="Rental Offset" value={`${fmt(netRental)}/mo`} />
      <TotalRow
        label="Effective Housing Cost"
        value={effectiveCost <= 0 ? `+${fmt(Math.abs(effectiveCost))}/mo` : `${fmt(effectiveCost)}/mo`}
        color={colors.brand.blue}
      />
      <div className="mt-3" />
      <Row label="vs Current Housing" value={savings > 0 ? `+${fmt(savings)}/mo savings` : `${fmt(savings)}/mo`} color={savings >= 0 ? '#10B981' : '#F43F5E'} />
      <Row label="Housing Offset" value={`${offset.toFixed(0)}%`} color={offset >= 100 ? '#10B981' : colors.text.primary} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wholesale Breakdown
// ---------------------------------------------------------------------------

function WholesaleBreakdown({ state, metrics }: { state: WholesaleDealMakerState; metrics: WholesaleMetrics }) {
  const m = metrics as unknown as Record<string, unknown>
  const mao = num(m, 'maxAllowableOffer')
  const meets70 = (m.meets70PercentRule as boolean) ?? false
  const endBuyerPrice = num(m, 'endBuyerPrice')
  const endBuyerAllIn = num(m, 'endBuyerAllIn')
  const endBuyerProfit = num(m, 'endBuyerProfit')
  const endBuyerROI = num(m, 'endBuyerROI')
  const cashAtRisk = num(m, 'totalCashAtRisk')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annualizedROI = num(m, 'annualizedROI')

  return (
    <div>
      <SectionHeader title="Deal Analysis" color={colors.brand.blue} />
      <Row label="After Repair Value" value={fmt(state.arv)} />
      <Row label="Estimated Repairs" value={fmt(state.estimatedRepairs)} />
      <Row label="Contract Price" value={fmt(state.contractPrice)} color={colors.brand.blue} />
      <TotalRow label="MAO (70% Rule)" value={fmt(mao)} color={colors.brand.blue} />
      <div className="mt-1" />
      <StatusRow label="70% Rule" pass={meets70} />

      <Divider />

      <SectionHeader title="Your Costs" color={colors.brand.blue} />
      <Row label="Earnest Money" value={fmt(state.earnestMoney)} />
      <Row label="Marketing" value={fmt(state.marketingCosts)} />
      <Row label="Closing Costs" value={fmt(state.closingCosts)} />
      <TotalRow label="Cash at Risk" value={fmt(cashAtRisk)} color={colors.brand.blue} />

      <Divider />

      <SectionHeader title="Your Profit" color={colors.brand.blue} />
      <Row label="Assignment Fee" value={fmt(state.assignmentFee)} color={colors.brand.blue} />
      <NegRow label="Marketing & Closing" value={fmt(state.marketingCosts + state.closingCosts)} />
      <TotalRow label="Net Profit" value={fmt(netProfit)} color={colors.brand.blue} />
      <div className="mt-3" />
      <Row label="ROI" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? colors.brand.blue : '#F43F5E'} />
      <Row label="Annualized ROI" value={`${annualizedROI.toFixed(1)}%`} color={annualizedROI >= 0 ? colors.brand.blue : '#F43F5E'} />

      <Divider />

      <SectionHeader title="End Buyer" color={colors.brand.blue} />
      <Row label="Buyer's Price" value={fmt(endBuyerPrice)} />
      <Row label="+ Repairs" value={fmt(state.estimatedRepairs)} />
      <Row label="All-In Cost" value={fmt(endBuyerAllIn)} />
      <Row label="Buyer Profit" value={fmt(endBuyerProfit)} color={endBuyerProfit >= 0 ? '#10B981' : '#F43F5E'} />
      <TotalRow label="Buyer ROI" value={`${endBuyerROI.toFixed(1)}%`} color={colors.brand.blue} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface DealMakerBreakdownProps {
  strategyType: StrategyType
  state: AnyStrategyState
  metrics: AnyStrategyMetrics
  listPrice: number
}

export function DealMakerBreakdown({ strategyType, state, metrics, listPrice }: DealMakerBreakdownProps) {
  return (
    <section className="px-4 sm:px-6 pb-6">
      <div
        className="rounded-xl p-5 sm:p-6"
        style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {strategyType === 'ltr' && (
          <LTRBreakdown state={state as LTRDealMakerState} metrics={metrics as LTRDealMakerMetrics} listPrice={listPrice} />
        )}
        {strategyType === 'str' && (
          <STRBreakdown state={state as STRDealMakerState} metrics={metrics as STRMetrics} listPrice={listPrice} />
        )}
        {strategyType === 'brrrr' && (
          <BRRRRBreakdown state={state as BRRRRDealMakerState} metrics={metrics as BRRRRMetrics} />
        )}
        {strategyType === 'flip' && (
          <FlipBreakdown state={state as FlipDealMakerState} metrics={metrics as FlipMetrics} />
        )}
        {strategyType === 'house_hack' && (
          <HouseHackBreakdown state={state as HouseHackDealMakerState} metrics={metrics as HouseHackMetrics} />
        )}
        {strategyType === 'wholesale' && (
          <WholesaleBreakdown state={state as WholesaleDealMakerState} metrics={metrics as WholesaleMetrics} />
        )}
      </div>
    </section>
  )
}
