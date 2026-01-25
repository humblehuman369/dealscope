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
  SeasonalityChart,
  StatusType,
  Factor,
  KPI,
  BarItem,
  MetaItem,
  VerdictData,
} from '../charts/StrategyMetricsBase'

// ============================================
// STR METRICS DATA INTERFACE
// ============================================
export interface STRMetricsData {
  // Revenue metrics
  adr: number // Average Daily Rate
  occupancyRate: number // 0-1
  revPAN: number // Revenue per available night
  grossRevenue: number
  
  // Expense metrics
  grossExpenses: number
  noi: number
  annualDebtService: number
  annualCashFlow: number
  
  // Return metrics
  capRate: number
  cashOnCash: number
  monthlyCashFlow: number
  
  // Entry metrics
  buyDiscount: number
  totalCashRequired: number
  furnishingSetup?: number
  
  // Risk metrics
  breakevenOccupancy: number
  dscr: number
  
  // Deal info
  profitQualityScore: number
  
  // Seasonality (optional)
  seasonalityHeights?: number[] // 12 values for each month
}

// ============================================
// HELPER: Build STR metrics from worksheet
// ============================================
export function buildSTRMetricsData(calc: {
  grossRevenue: number
  grossExpenses: number
  noi: number
  annualDebtService: number
  annualCashFlow: number
  capRate: number
  cashOnCash: number
  monthlyCashFlow: number
  dscr: number
  occupancyRate: number
  adr: number
  totalCashRequired: number
  breakevenOccupancy?: number
  buyDiscount?: number
  furnishingSetup?: number
  listPrice?: number
  purchasePrice?: number
}): STRMetricsData {
  const revPAN = calc.adr * calc.occupancyRate
  const buyDiscount = calc.buyDiscount ?? 
    (calc.listPrice && calc.purchasePrice 
      ? ((calc.listPrice - calc.purchasePrice) / calc.listPrice) * 100 
      : 0)
  
  // Calculate breakeven occupancy if not provided
  const breakevenOccupancy = calc.breakevenOccupancy ?? 
    (calc.grossRevenue > 0 
      ? ((calc.grossExpenses + calc.annualDebtService) / calc.grossRevenue) * calc.occupancyRate * 100 
      : 0)
  
  // Calculate profit quality score
  let score = 0
  if (calc.capRate >= 7) score += 20
  else if (calc.capRate >= 5) score += 10
  if (calc.cashOnCash >= 10) score += 20
  else if (calc.cashOnCash >= 5) score += 10
  if (calc.dscr >= 1.25) score += 20
  else if (calc.dscr >= 1.0) score += 10
  if (breakevenOccupancy <= 60) score += 20
  else if (breakevenOccupancy <= 75) score += 10
  if (buyDiscount >= 10) score += 20
  else if (buyDiscount >= 5) score += 10
  
  return {
    adr: calc.adr,
    occupancyRate: calc.occupancyRate,
    revPAN,
    grossRevenue: calc.grossRevenue,
    grossExpenses: calc.grossExpenses,
    noi: calc.noi,
    annualDebtService: calc.annualDebtService,
    annualCashFlow: calc.annualCashFlow,
    capRate: calc.capRate,
    cashOnCash: calc.cashOnCash,
    monthlyCashFlow: calc.monthlyCashFlow,
    buyDiscount,
    totalCashRequired: calc.totalCashRequired,
    furnishingSetup: calc.furnishingSetup,
    breakevenOccupancy,
    dscr: calc.dscr,
    profitQualityScore: score,
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
interface STRMetricsChartProps {
  data: STRMetricsData
}

export function STRMetricsChart({ data }: STRMetricsChartProps) {
  const fmt = {
    currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
    currencyK: (v: number) => `$${Math.round(v / 1000)}k`,
    percent: (v: number) => `${v.toFixed(1)}%`,
    ratio: (v: number) => v.toFixed(2),
  }

  // Build verdict
  const verdict: VerdictData = useMemo(() => {
    const score = data.profitQualityScore
    if (score >= 80) return { label: 'STRONG', detail: '(Meets 4+ critical checks)', status: 'good' }
    if (score >= 60) return { label: 'MODERATE', detail: '(Meets 3 critical checks)', status: 'warn' }
    return { label: 'WEAK', detail: '(Fails multiple checks)', status: 'bad' }
  }, [data.profitQualityScore])

  // Primary KPIs
  const kpis: KPI[] = [
    { label: 'ADR', value: fmt.currency(data.adr), hint: 'Average nightly rate' },
    { label: 'Occupancy', value: fmt.percent(data.occupancyRate * 100), hint: 'Demand / fill rate' },
    { label: 'RevPAN', value: fmt.currency(data.revPAN), hint: 'Revenue per available night' },
  ]

  // Factors
  const factors: Factor[] = useMemo(() => [
    {
      name: 'Cash Yield',
      desc: 'Cash-on-Cash + Monthly Cash Flow (after all OpEx + debt)',
      status: data.cashOnCash >= 10 ? 'good' : data.cashOnCash >= 5 ? 'warn' : 'bad',
      tag: data.cashOnCash >= 10 ? 'Healthy' : data.cashOnCash >= 5 ? 'Moderate' : 'Weak',
    },
    {
      name: 'Debt Safety',
      desc: 'DSCR and Break-Even Occupancy (can it survive a slow season?)',
      status: data.dscr >= 1.25 ? 'good' : data.dscr >= 1.0 ? 'warn' : 'bad',
      tag: data.dscr >= 1.25 ? 'Strong' : data.dscr >= 1.0 ? 'Watch' : 'Risk',
    },
    {
      name: 'Operating Load',
      desc: 'Platform fees, cleaning, management, utilities, supplies',
      status: data.grossExpenses / data.grossRevenue <= 0.45 ? 'good' : 
              data.grossExpenses / data.grossRevenue <= 0.55 ? 'warn' : 'bad',
      tag: data.grossExpenses / data.grossRevenue <= 0.45 ? 'Controlled' : 
           data.grossExpenses / data.grossRevenue <= 0.55 ? 'Monitor' : 'High',
    },
    {
      name: 'Entry Advantage',
      desc: 'Buy Discount % + Total Cash Required (risk & runway)',
      status: data.buyDiscount >= 10 ? 'good' : data.buyDiscount >= 5 ? 'warn' : 'bad',
      tag: data.buyDiscount >= 10 ? 'Strong' : data.buyDiscount >= 5 ? 'Fair' : 'None',
    },
  ], [data])

  // Quick stats
  const quickStats: MetaItem[] = [
    { label: 'Break-Even Occupancy', value: fmt.percent(data.breakevenOccupancy) },
    { label: 'DSCR', value: fmt.ratio(data.dscr) },
  ]

  // Returns panel
  const returnsPanel: BarItem[] = [
    { label: 'Cap Rate', value: fmt.percent(data.capRate), meter: Math.min(100, data.capRate * 10) },
    { label: 'Cash-on-Cash', value: fmt.percent(data.cashOnCash), meter: Math.min(100, data.cashOnCash * 8) },
    { label: 'Monthly Cash Flow', value: fmt.currency(data.monthlyCashFlow), meter: Math.min(100, (data.monthlyCashFlow / 2000) * 100) },
  ]

  // Entry panel
  const entryPanel: BarItem[] = [
    { label: 'Buy Discount %', value: fmt.percent(data.buyDiscount), meter: Math.min(100, data.buyDiscount * 5) },
    { label: 'Total Cash Req.', value: fmt.currencyK(data.totalCashRequired), meter: Math.min(100, 100 - (data.totalCashRequired / 2000)) },
    ...(data.furnishingSetup ? [{ label: 'Furn. Setup', value: fmt.currencyK(data.furnishingSetup), meter: 60 }] : []),
  ]

  // Financial snapshot
  const financialSnapshot: BarItem[] = [
    { label: 'Total Gross Revenue', value: fmt.currency(data.grossRevenue), meter: 85 },
    { label: 'Total OpEx', value: fmt.currency(data.grossExpenses), meter: Math.min(100, (data.grossExpenses / data.grossRevenue) * 100) },
    { label: 'NOI', value: fmt.currency(data.noi), meter: Math.min(100, (data.noi / data.grossRevenue) * 100) },
    { label: 'Annual Debt Service', value: fmt.currency(data.annualDebtService), meter: 50 },
    { label: 'Annual Cash Flow', value: fmt.currency(data.annualCashFlow), meter: data.annualCashFlow > 0 ? 65 : 20 },
  ]

  // Footer stats
  const footerStats: MetaItem[] = [
    { label: 'ADR • Occupancy • RevPAN', value: `${fmt.currency(data.adr)} • ${fmt.percent(data.occupancyRate * 100)} • ${fmt.currency(data.revPAN)}` },
  ]

  // Seasonality (mock data if not provided)
  const seasonalityMonths = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const seasonalityHeights = data.seasonalityHeights || [45, 50, 58, 65, 72, 82, 92, 88, 75, 62, 52, 48]

  return (
    <StrategyMetricsLayout
      strategyName="Short-Term Rental Strategy"
      subtitle="Investor scan: Revenue Engine • Cost Load • Debt Safety • Seasonality"
      leftPanel={
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <ProfitQualityRing 
              score={data.profitQualityScore} 
              subline="Blends returns + stability + financing safety + seasonality risk." 
            />
            <VerdictBadge verdict={verdict} />
          </div>
          
          <KPIGrid kpis={kpis} columns={3} />
          
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">What Investors Care About Most</div>
            <FactorList factors={factors} />
          </div>
          
          <MetaGrid items={quickStats} />
        </>
      }
      rightPanel={
        <>
          <div className="grid grid-cols-2 gap-4">
            <BarPanel title="Returns" bars={returnsPanel} />
            <BarPanel title="Deal Entry" bars={entryPanel} />
          </div>
          
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Revenue vs Operating Expenses</div>
            <div className="space-y-1">
              {financialSnapshot.map((bar) => (
                <div key={bar.label} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center py-2">
                  <span className="text-sm font-medium text-slate-700 truncate">{bar.label}</span>
                  <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-teal to-cyan-400 transition-all duration-300"
                      style={{ width: `${bar.meter}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums w-24 text-right">{bar.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <SeasonalityChart 
            label="Seasonality (Occupancy Index)" 
            months={seasonalityMonths} 
            heights={seasonalityHeights} 
          />
          
          <MetaGrid items={footerStats} />
        </>
      }
    />
  )
}
