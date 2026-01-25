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
// WHOLESALE METRICS DATA INTERFACE
// ============================================
export interface WholesaleMetricsData {
  // Profit metrics
  assignmentFee: number
  netProfit: number
  cashAtRisk: number
  effectiveHourly: number
  timeInvestmentHours: number
  
  // Deal math
  arv: number
  estimatedRehab: number
  mao70: number // 70% Max Offer
  contractPrice: number
  
  // Your side
  marketingCosts: number
  earnestMoney: number
  
  // Exit
  endBuyerPrice: number
  
  // Safety
  meets70Rule: boolean
  buyerRoi: number
  breakevenAssignmentFee: number
  timelineDays: number
  
  // Score
  profitQualityScore: number
}

// ============================================
// HELPER: Build Wholesale metrics from worksheet
// ============================================
export function buildWholesaleMetricsData(calc: {
  assignmentFee: number
  yourNetProfit: number
  yourCosts: number
  earnestMoney: number
  marketingCosts: number
  arv: number
  rehabCosts: number
  mao: number
  contractPrice: number
  assignmentSalePrice: number
  meets70Rule: boolean
  buyerRoi: number
}, timelineDays?: number, timeInvestmentHours?: number): WholesaleMetricsData {
  const hours = timeInvestmentHours || 60
  const effectiveHourly = calc.yourNetProfit / Math.max(1, hours)
  
  // Calculate breakeven assignment fee
  const breakevenAssignmentFee = calc.marketingCosts + calc.earnestMoney + 500 // Buffer
  
  // Calculate profit quality score
  let score = 0
  if (calc.yourNetProfit >= 10000) score += 25
  else if (calc.yourNetProfit >= 5000) score += 15
  if (calc.meets70Rule) score += 20
  else score += 5
  if (calc.buyerRoi >= 25) score += 20
  else if (calc.buyerRoi >= 15) score += 10
  if (effectiveHourly >= 150) score += 20
  else if (effectiveHourly >= 100) score += 10
  if (calc.yourCosts <= 3000) score += 15
  else if (calc.yourCosts <= 5000) score += 10
  
  return {
    assignmentFee: calc.assignmentFee,
    netProfit: calc.yourNetProfit,
    cashAtRisk: calc.yourCosts,
    effectiveHourly,
    timeInvestmentHours: hours,
    arv: calc.arv,
    estimatedRehab: calc.rehabCosts,
    mao70: calc.mao,
    contractPrice: calc.contractPrice,
    marketingCosts: calc.marketingCosts,
    earnestMoney: calc.earnestMoney,
    endBuyerPrice: calc.assignmentSalePrice,
    meets70Rule: calc.meets70Rule,
    buyerRoi: calc.buyerRoi,
    breakevenAssignmentFee,
    timelineDays: timelineDays || 21,
    profitQualityScore: Math.min(100, score),
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
interface WholesaleMetricsChartProps {
  data: WholesaleMetricsData
}

export function WholesaleMetricsChart({ data }: WholesaleMetricsChartProps) {
  const fmt = {
    currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
    currencyHr: (v: number) => `$${Math.round(v)}/hr`,
    percent: (v: number) => `${v.toFixed(1)}%`,
    days: (v: number) => `${v} days`,
  }

  // Build verdict
  const verdict: VerdictData = useMemo(() => {
    const score = data.profitQualityScore
    if (score >= 75) return { label: 'STRONG', detail: '(Good spread for you and buyer)', status: 'good' }
    if (score >= 50) return { label: 'WATCH', detail: '(Spread is workable but tight)', status: 'warn' }
    return { label: 'WEAK', detail: '(Thin margins, high risk)', status: 'bad' }
  }, [data.profitQualityScore])

  // Primary KPIs
  const kpis: KPI[] = [
    { label: 'Assignment Fee', value: fmt.currency(data.assignmentFee), hint: 'Your payday' },
    { label: 'Net Profit', value: fmt.currency(data.netProfit), hint: 'After marketing + costs' },
    { label: 'Cash at Risk', value: fmt.currency(data.cashAtRisk), hint: 'Earnest + marketing' },
    { label: 'Effective Hourly', value: fmt.currencyHr(data.effectiveHourly), hint: 'Net profit ÷ hours' },
  ]

  // Factors
  const factors: Factor[] = useMemo(() => [
    {
      name: 'Spread Available',
      desc: 'ARV − rehab − end buyer target − your fee',
      status: data.netProfit >= 10000 ? 'good' : data.netProfit >= 5000 ? 'warn' : 'bad',
      tag: data.netProfit >= 10000 ? 'Healthy' : data.netProfit >= 5000 ? 'Tight' : 'Thin',
    },
    {
      name: 'End Buyer Price Fit',
      desc: 'Does it still meet 70% rule for a flipper/landlord?',
      status: data.meets70Rule ? 'good' : 'warn',
      tag: data.meets70Rule ? 'OK' : 'Stretch',
    },
    {
      name: 'Fee Viability',
      desc: 'Breakeven assignment fee vs expected assignment',
      status: data.assignmentFee >= data.breakevenAssignmentFee * 1.5 ? 'good' : 
              data.assignmentFee >= data.breakevenAssignmentFee ? 'warn' : 'bad',
      tag: data.assignmentFee >= data.breakevenAssignmentFee * 1.5 ? 'Pass' : 'Tight',
    },
    {
      name: 'Timeline Risk',
      desc: 'Days to close affects fallout risk and marketing burn',
      status: data.timelineDays <= 21 ? 'good' : data.timelineDays <= 30 ? 'warn' : 'bad',
      tag: data.timelineDays <= 21 ? 'Quick' : 'Watch',
    },
    {
      name: 'Deal Viability',
      desc: 'Simple yes/no indicator after checks',
      status: data.profitQualityScore >= 60 ? 'good' : data.profitQualityScore >= 40 ? 'warn' : 'bad',
      tag: data.profitQualityScore >= 60 ? 'Yes' : 'Maybe',
    },
  ], [data])

  // Meta items
  const leftMeta: MetaItem[] = [
    { label: 'Timeline (Days)', value: String(data.timelineDays) },
    { label: 'Breakeven Assignment Fee', value: fmt.currency(data.breakevenAssignmentFee) },
  ]

  // Deal math panel
  const dealMath: BarItem[] = [
    { label: 'ARV', value: fmt.currency(data.arv), meter: 70 },
    { label: 'Estimated Rehab', value: fmt.currency(data.estimatedRehab), meter: 62 },
    { label: '70% Max Offer', value: fmt.currency(data.mao70), meter: 58 },
  ]

  // Your side panel
  const yourSide: BarItem[] = [
    { label: 'Contract Price', value: fmt.currency(data.contractPrice), meter: 60 },
    { label: 'Marketing Costs', value: fmt.currency(data.marketingCosts), meter: 56 },
    { label: 'Cash at Risk', value: fmt.currency(data.cashAtRisk), meter: 64 },
  ]

  // Exit & profit
  const exitProfit: BarItem[] = [
    { label: 'End Buyer Price', value: fmt.currency(data.endBuyerPrice), meter: 72 },
    { label: 'Assignment Fee', value: fmt.currency(data.assignmentFee), meter: 66 },
    { label: 'Net Profit', value: fmt.currency(data.netProfit), meter: data.netProfit > 0 ? 62 : 20 },
    { label: 'Time Investment (hrs)', value: String(data.timeInvestmentHours), meter: 58 },
  ]

  // Right meta
  const rightMeta: MetaItem[] = [
    { label: 'Deals for $50K', value: `~${Math.ceil(50000 / Math.max(1, data.netProfit))} deals at $${Math.round(data.netProfit / 1000)}k net` },
    { label: 'Deals for $100K', value: `~${Math.ceil(100000 / Math.max(1, data.netProfit))} deals at $${Math.round(data.netProfit / 1000)}k net` },
  ]

  return (
    <StrategyMetricsLayout
      strategyName="Wholesale Strategy"
      subtitle="Investor scan: Spread • Assignment profit • Cash at risk • Time to close • Effective hourly"
      leftPanel={
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <ProfitQualityRing 
              score={data.profitQualityScore} 
              subline="Weights: Spread available + fee viability + cash at risk + timeline + hourly rate." 
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
          <div className="grid grid-cols-2 gap-4">
            <BarPanel title="Deal Math" bars={dealMath} />
            <BarPanel title="Your Side" bars={yourSide} />
          </div>
          
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Exit & Profit</div>
            <div className="space-y-1">
              {exitProfit.map((bar) => (
                <BarRow key={bar.label} {...bar} />
              ))}
            </div>
          </div>
          
          <MetaGrid items={rightMeta} />
        </>
      }
    />
  )
}
