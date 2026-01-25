'use client'

import React, { useMemo } from 'react'
import {
  StrategyMetricsLayout,
  ProfitQualityRing,
  VerdictBadge,
  KPIGrid,
  FactorList,
  BarPanel,
  MetaGrid,
  StatusType,
  Factor,
  KPI,
  BarItem,
  MetaItem,
  VerdictData,
  BarRow,
} from '../charts/StrategyMetricsBase'

// ============================================
// BRRRR METRICS DATA INTERFACE
// ============================================
export interface BRRRRMetricsData {
  // Core BRRRR metrics
  cashRecoveryPct: number
  cashLeftInDeal: number
  cashOnCash: number
  equityCreated: number
  
  // Purchase phase
  purchasePrice: number
  rehabCosts: number
  allInCost: number
  totalCashInvested: number
  
  // Refinance phase
  arv: number
  refinanceLoanAmount: number
  cashOut: number
  refiLtvPct: number
  
  // Cash flow (post-refinance)
  monthlyCashFlow: number
  annualCashFlow: number
  dscr: number
  capRate: number
  
  // Holding costs
  totalHoldingCosts: number
  holdingMonths: number
  
  // Score
  profitQualityScore: number
}

// ============================================
// HELPER: Build BRRRR metrics from worksheet
// ============================================
export function buildBRRRRMetricsData(calc: {
  cashRecoveryPct: number
  cashLeftInDeal: number
  cashOnCash: number
  equityCreated: number
  purchasePrice: number
  rehabCosts: number
  allInCost: number
  totalCashInvested: number
  arv: number
  refinanceLoanAmount: number
  cashOut: number
  refiLtvPct: number
  monthlyCashFlow: number
  annualCashFlow: number
  dscr: number
  capRateRefi: number
  totalHoldingCosts: number
  holdingMonths: number
}): BRRRRMetricsData {
  // Calculate profit quality score
  let score = 0
  
  // Cash recovery is key for BRRRR - getting 100%+ back is ideal
  if (calc.cashRecoveryPct >= 100) score += 30
  else if (calc.cashRecoveryPct >= 75) score += 20
  else if (calc.cashRecoveryPct >= 50) score += 10
  
  // Cash-on-Cash after refinance
  if (calc.cashOnCash >= 15) score += 20
  else if (calc.cashOnCash >= 10) score += 10
  
  // DSCR for debt safety
  if (calc.dscr >= 1.25) score += 20
  else if (calc.dscr >= 1.0) score += 10
  
  // Equity created
  if (calc.equityCreated >= 50000) score += 15
  else if (calc.equityCreated >= 25000) score += 10
  
  // Positive cash flow
  if (calc.monthlyCashFlow >= 300) score += 15
  else if (calc.monthlyCashFlow >= 100) score += 10
  
  return {
    cashRecoveryPct: calc.cashRecoveryPct,
    cashLeftInDeal: calc.cashLeftInDeal,
    cashOnCash: calc.cashOnCash,
    equityCreated: calc.equityCreated,
    purchasePrice: calc.purchasePrice,
    rehabCosts: calc.rehabCosts,
    allInCost: calc.allInCost,
    totalCashInvested: calc.totalCashInvested,
    arv: calc.arv,
    refinanceLoanAmount: calc.refinanceLoanAmount,
    cashOut: calc.cashOut,
    refiLtvPct: calc.refiLtvPct,
    monthlyCashFlow: calc.monthlyCashFlow,
    annualCashFlow: calc.annualCashFlow,
    dscr: calc.dscr,
    capRate: calc.capRateRefi,
    totalHoldingCosts: calc.totalHoldingCosts,
    holdingMonths: calc.holdingMonths,
    profitQualityScore: Math.min(100, score),
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
interface BRRRRMetricsChartProps {
  data: BRRRRMetricsData
}

export function BRRRRMetricsChart({ data }: BRRRRMetricsChartProps) {
  const fmt = {
    currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
    percent: (v: number) => `${v.toFixed(1)}%`,
    ratio: (v: number) => v.toFixed(2),
    months: (v: number) => `${v} mo`,
  }

  // Build verdict
  const verdict: VerdictData = useMemo(() => {
    const score = data.profitQualityScore
    if (score >= 80) return { label: 'EXCELLENT', detail: '(Full cash recovery + strong cash flow)', status: 'good' }
    if (score >= 60) return { label: 'GOOD', detail: '(Partial recovery, decent returns)', status: 'good' }
    if (score >= 40) return { label: 'MODERATE', detail: '(Cash left in deal, watch margins)', status: 'warn' }
    return { label: 'WEAK', detail: '(Poor recovery, thin cash flow)', status: 'bad' }
  }, [data.profitQualityScore])

  // Primary KPIs
  const kpis: KPI[] = [
    { label: 'Cash Recovery %', value: fmt.percent(data.cashRecoveryPct), hint: 'Capital returned at refi' },
    { label: 'Cash Left in Deal', value: fmt.currency(data.cashLeftInDeal), hint: 'Remaining investment' },
    { label: 'Cash-on-Cash', value: fmt.percent(data.cashOnCash), hint: 'Annual return on cash left' },
    { label: 'Equity Created', value: fmt.currency(data.equityCreated), hint: 'ARV - All-in cost' },
  ]

  // Factors
  const factors: Factor[] = useMemo(() => [
    {
      name: 'Cash Recovery',
      desc: 'How much capital is recycled at refinance',
      status: data.cashRecoveryPct >= 100 ? 'good' : data.cashRecoveryPct >= 75 ? 'warn' : 'bad',
      tag: data.cashRecoveryPct >= 100 ? 'Full' : data.cashRecoveryPct >= 75 ? 'Partial' : 'Low',
    },
    {
      name: 'Equity Capture',
      desc: 'Forced appreciation through rehab and ARV lift',
      status: data.equityCreated >= 50000 ? 'good' : data.equityCreated >= 25000 ? 'warn' : 'bad',
      tag: data.equityCreated >= 50000 ? 'Strong' : data.equityCreated >= 25000 ? 'Moderate' : 'Thin',
    },
    {
      name: 'Cash Flow Safety',
      desc: 'DSCR and monthly cash flow after refinance',
      status: data.dscr >= 1.25 ? 'good' : data.dscr >= 1.0 ? 'warn' : 'bad',
      tag: data.dscr >= 1.25 ? 'Safe' : data.dscr >= 1.0 ? 'Watch' : 'Risk',
    },
    {
      name: 'Holding Period',
      desc: 'Time and cost of rehab phase before refinance',
      status: data.holdingMonths <= 4 ? 'good' : data.holdingMonths <= 6 ? 'warn' : 'bad',
      tag: data.holdingMonths <= 4 ? 'Quick' : data.holdingMonths <= 6 ? 'Standard' : 'Long',
    },
    {
      name: 'Refi Terms',
      desc: 'LTV and loan amount at refinance',
      status: data.refiLtvPct <= 75 ? 'good' : data.refiLtvPct <= 80 ? 'warn' : 'bad',
      tag: `${data.refiLtvPct.toFixed(0)}% LTV`,
    },
  ], [data])

  // Meta items
  const leftMeta: MetaItem[] = [
    { label: 'Monthly Cash Flow', value: fmt.currency(data.monthlyCashFlow) },
    { label: 'DSCR', value: fmt.ratio(data.dscr) },
  ]

  // Purchase & rehab panel
  const purchaseRehab: BarItem[] = [
    { label: 'Purchase Price', value: fmt.currency(data.purchasePrice), meter: 60 },
    { label: 'Rehab Costs', value: fmt.currency(data.rehabCosts), meter: 65 },
    { label: 'All-In Cost', value: fmt.currency(data.allInCost), meter: 70 },
    { label: 'Total Cash Invested', value: fmt.currency(data.totalCashInvested), meter: 75 },
  ]

  // Refinance panel
  const refinance: BarItem[] = [
    { label: 'ARV', value: fmt.currency(data.arv), meter: 85 },
    { label: 'Refinance Loan', value: fmt.currency(data.refinanceLoanAmount), meter: 72 },
    { label: 'Cash Out', value: fmt.currency(data.cashOut), meter: data.cashOut > 0 ? 68 : 30 },
    { label: 'Holding Costs', value: fmt.currency(data.totalHoldingCosts), meter: 55 },
  ]

  // Cash flow panel
  const cashFlowBars: BarItem[] = [
    { label: 'Monthly Cash Flow', value: fmt.currency(data.monthlyCashFlow), meter: data.monthlyCashFlow > 0 ? 70 : 20 },
    { label: 'Annual Cash Flow', value: fmt.currency(data.annualCashFlow), meter: data.annualCashFlow > 0 ? 72 : 25 },
    { label: 'Cap Rate', value: fmt.percent(data.capRate), meter: Math.min(100, data.capRate * 10) },
  ]

  // Right meta
  const rightMeta: MetaItem[] = [
    { label: 'Cash-on-Cash Return', value: fmt.percent(data.cashOnCash) },
    { label: 'Holding Period', value: fmt.months(data.holdingMonths) },
  ]

  return (
    <StrategyMetricsLayout
      strategyName="BRRRR Strategy"
      subtitle="Investor scan: Cash Recovery • Equity Created • Cash Flow • Refinance Terms"
      leftPanel={
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <ProfitQualityRing 
              score={data.profitQualityScore} 
              subline="Weights: Cash recovery + equity capture + post-refi cash flow + DSCR." 
            />
            <VerdictBadge verdict={verdict} />
          </div>
          
          <KPIGrid kpis={kpis} />
          
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">What Investors Care About Most</div>
            <FactorList factors={factors} />
          </div>
          
          <MetaGrid items={leftMeta} />
        </>
      }
      rightPanel={
        <>
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Purchase & Rehab Phase</div>
            <div className="space-y-1">
              {purchaseRehab.map((bar) => (
                <BarRow key={bar.label} {...bar} />
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Refinance Phase</div>
            <div className="space-y-1">
              {refinance.map((bar) => (
                <BarRow key={bar.label} {...bar} />
              ))}
            </div>
          </div>
          
          <BarPanel title="Post-Refinance Cash Flow" bars={cashFlowBars} />
          
          <MetaGrid items={rightMeta} />
          
          {data.cashRecoveryPct >= 100 && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-700">Infinite Returns!</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">100%+ cash recovery means infinite cash-on-cash return potential.</p>
            </div>
          )}
        </>
      }
    />
  )
}
