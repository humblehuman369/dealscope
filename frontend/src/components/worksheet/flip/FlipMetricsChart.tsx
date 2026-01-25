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
// FLIP METRICS DATA INTERFACE
// ============================================
export interface FlipMetricsData {
  // Profit metrics
  netProfitAfterTax: number
  roi: number
  profitMargin: number
  meets70Rule: boolean
  
  // Cost metrics
  totalAcquisitionCash: number
  totalRenovation: number
  totalCashRequired: number
  totalHoldingCosts: number
  totalSellingCosts: number
  hardMoneyInterest: number
  
  // Valuation
  arv: number
  totalProjectCost: number
  netSaleProceeds: number
  
  // Safety metrics
  mao70: number // 70% Rule Max Price
  minSaleBreakeven: number
  
  // Score
  profitQualityScore: number
}

// ============================================
// HELPER: Build Flip metrics from worksheet
// ============================================
export function buildFlipMetricsData(calc: {
  netProfit: number
  roi: number
  profitMargin: number
  meets70Rule: boolean
  purchaseCosts: number
  downPayment: number
  rehabCosts: number
  allInCost: number
  totalHoldingCosts: number
  sellingCosts: number
  totalHoldingInterest: number
  arv: number
  netSaleProceeds: number
  mao: number
}): FlipMetricsData {
  // Calculate profit quality score
  let score = 0
  if (calc.roi >= 25) score += 25
  else if (calc.roi >= 15) score += 15
  if (calc.profitMargin >= 15) score += 20
  else if (calc.profitMargin >= 10) score += 10
  if (calc.meets70Rule) score += 25
  else score += 5
  if (calc.netProfit >= 40000) score += 20
  else if (calc.netProfit >= 20000) score += 10
  // Budget and timeline risk scoring
  score += 10 // baseline
  
  const totalCashRequired = calc.downPayment + calc.purchaseCosts + calc.rehabCosts
  
  return {
    netProfitAfterTax: calc.netProfit,
    roi: calc.roi,
    profitMargin: calc.profitMargin,
    meets70Rule: calc.meets70Rule,
    totalAcquisitionCash: calc.downPayment + calc.purchaseCosts,
    totalRenovation: calc.rehabCosts,
    totalCashRequired,
    totalHoldingCosts: calc.totalHoldingCosts,
    totalSellingCosts: calc.sellingCosts,
    hardMoneyInterest: calc.totalHoldingInterest,
    arv: calc.arv,
    totalProjectCost: calc.allInCost,
    netSaleProceeds: calc.netSaleProceeds,
    mao70: calc.mao,
    minSaleBreakeven: calc.allInCost + calc.sellingCosts,
    profitQualityScore: Math.min(100, score),
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
interface FlipMetricsChartProps {
  data: FlipMetricsData
}

export function FlipMetricsChart({ data }: FlipMetricsChartProps) {
  const fmt = {
    currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
    percent: (v: number) => `${v.toFixed(1)}%`,
  }

  // Build verdict
  const verdict: VerdictData = useMemo(() => {
    const score = data.profitQualityScore
    if (score >= 75) return { label: 'STRONG', detail: '(Meets 70% rule, healthy net spread)', status: 'good' }
    if (score >= 50) return { label: 'MODERATE', detail: '(Marginal spread, watch timeline)', status: 'warn' }
    return { label: 'WEAK', detail: '(Poor spread or fails 70% rule)', status: 'bad' }
  }, [data.profitQualityScore])

  // Primary KPIs
  const kpis: KPI[] = [
    { label: 'Net Profit After Tax', value: fmt.currency(data.netProfitAfterTax), hint: 'Bottom-line outcome' },
    { label: 'ROI', value: fmt.percent(data.roi), hint: 'Net profit ÷ total cash required' },
    { label: 'Profit Margin', value: fmt.percent(data.profitMargin), hint: 'Net profit ÷ net sale proceeds' },
    { label: 'Meets 70% Rule', value: data.meets70Rule ? 'Yes' : 'No', hint: 'Pass/fail acquisition filter' },
  ]

  // Factors
  const factors: Factor[] = useMemo(() => [
    {
      name: 'Spread Strength',
      desc: 'ARV minus total project cost and selling costs',
      status: data.netProfitAfterTax >= 40000 ? 'good' : data.netProfitAfterTax >= 20000 ? 'warn' : 'bad',
      tag: data.netProfitAfterTax >= 40000 ? 'Healthy' : data.netProfitAfterTax >= 20000 ? 'Marginal' : 'Thin',
    },
    {
      name: 'Budget Control',
      desc: 'Renovation + contingency vs scope risk',
      status: 'warn', // Would need actual budget variance data
      tag: 'Watch',
    },
    {
      name: 'Timeline Risk',
      desc: 'Hard money interest + holding costs sensitivity',
      status: data.totalHoldingCosts / data.netProfitAfterTax < 0.3 ? 'good' : 
              data.totalHoldingCosts / data.netProfitAfterTax < 0.5 ? 'warn' : 'bad',
      tag: data.totalHoldingCosts / data.netProfitAfterTax < 0.3 ? 'Controlled' : 'Watch',
    },
    {
      name: 'Exit Friction',
      desc: 'Realtor commissions + seller closing costs',
      status: 'good',
      tag: 'Known',
    },
    {
      name: 'Breakeven Safety',
      desc: 'Min sale price for breakeven vs ARV',
      status: data.minSaleBreakeven / data.arv < 0.85 ? 'good' : 
              data.minSaleBreakeven / data.arv < 0.95 ? 'warn' : 'bad',
      tag: data.minSaleBreakeven / data.arv < 0.85 ? 'Buffer' : 'Tight',
    },
  ], [data])

  // Meta items
  const leftMeta: MetaItem[] = [
    { label: '70% Rule Max Price', value: fmt.currency(data.mao70) },
    { label: 'Min Sale for Breakeven', value: fmt.currency(data.minSaleBreakeven) },
  ]

  // Cash required panel
  const cashRequiredPanel: BarItem[] = [
    { label: 'Total Acquisition Cash', value: fmt.currency(data.totalAcquisitionCash), meter: 62 },
    { label: 'Total Renovation', value: fmt.currency(data.totalRenovation), meter: 70 },
    { label: 'Total Cash Required', value: fmt.currency(data.totalCashRequired), meter: 76 },
  ]

  // Holding & selling panel
  const holdingSellingPanel: BarItem[] = [
    { label: 'Total Holding Costs', value: fmt.currency(data.totalHoldingCosts), meter: 54 },
    { label: 'Total Selling Costs', value: fmt.currency(data.totalSellingCosts), meter: 58 },
    { label: 'Hard Money Interest', value: fmt.currency(data.hardMoneyInterest), meter: 66 },
  ]

  // Profit bridge
  const profitBridge: BarItem[] = [
    { label: 'ARV', value: fmt.currency(data.arv), meter: 88 },
    { label: 'Total Project Cost', value: fmt.currency(data.totalProjectCost), meter: 74 },
    { label: 'Net Sale Proceeds', value: fmt.currency(data.netSaleProceeds), meter: 62 },
    { label: 'Net Profit After Tax', value: fmt.currency(data.netProfitAfterTax), meter: data.netProfitAfterTax > 0 ? 70 : 20 },
  ]

  return (
    <StrategyMetricsLayout
      strategyName="Fix & Flip Strategy"
      subtitle="Investor scan: Spread • Timeline • Budget Control • 70% Rule • Net Profit"
      leftPanel={
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <ProfitQualityRing 
              score={data.profitQualityScore} 
              subline="Weights: Spread + budget accuracy + time-to-sell + selling costs + rule compliance." 
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
            <BarPanel title="Cash Required" bars={cashRequiredPanel} />
            <BarPanel title="Holding & Selling" bars={holdingSellingPanel} />
          </div>
          
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Profit Bridge</div>
            <div className="space-y-1">
              {profitBridge.map((bar) => (
                <BarRow key={bar.label} {...bar} />
              ))}
            </div>
          </div>
        </>
      }
    />
  )
}
