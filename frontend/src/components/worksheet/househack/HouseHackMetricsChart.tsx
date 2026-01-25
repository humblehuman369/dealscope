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
// HOUSE HACK METRICS DATA INTERFACE
// ============================================
export interface HouseHackMetricsData {
  // Housing cost metrics
  netHousingCost: number
  savingsVsRenting: number
  housingCostOffsetPct: number
  liveFreeThreshold: number
  
  // Cash metrics
  totalCashRequired: number
  downPayment: number
  closingCosts: number
  monthlyPITI: number
  monthlyExpenses: number
  
  // Income
  roomsRented: number
  roomRent: number
  totalMonthlyIncome: number
  
  // Returns
  roiOnSavings: number
  breakevenHousingCost: number
  
  // Scenario B (conversion)
  conversionCost?: number
  unit2Rent?: number
  helocPayment?: number
  netHousingCostB?: number
  savingsVsRentingB?: number
  
  // Entry
  buyDiscount: number
  
  // Score
  profitQualityScore: number
  liveFree: boolean
}

// ============================================
// HELPER: Build House Hack metrics from worksheet
// ============================================
export function buildHouseHackMetricsData(calc: {
  actualHousingCost: number
  savingsVsRenting: number
  housingOffsetPct?: number
  totalCashNeeded: number
  downPayment: number
  purchaseCosts: number
  monthlyPayment: number
  totalExpenses: number
  rentalIncome: number
  marketRent: number
  liveFree: boolean
  cocReturn?: number
  listPrice?: number
  purchasePrice?: number
  unitCount?: number
}, unitRents?: number[], ownerUnit?: number): HouseHackMetricsData {
  const housingOffsetPct = calc.housingOffsetPct ?? 
    (calc.marketRent > 0 
      ? Math.max(0, ((calc.marketRent - calc.actualHousingCost) / calc.marketRent) * 100)
      : 0)
  
  const buyDiscount = calc.listPrice && calc.purchasePrice
    ? ((calc.listPrice - calc.purchasePrice) / calc.listPrice) * 100
    : 0
  
  // Calculate ROI on savings
  const annualSavings = calc.savingsVsRenting * 12
  const roiOnSavings = calc.totalCashNeeded > 0 
    ? (annualSavings / calc.totalCashNeeded) * 100 
    : 0
  
  // Profit quality score
  let score = 0
  if (housingOffsetPct >= 90) score += 25
  else if (housingOffsetPct >= 70) score += 15
  else if (housingOffsetPct >= 50) score += 10
  if (calc.liveFree) score += 25
  if (calc.savingsVsRenting >= 500) score += 20
  else if (calc.savingsVsRenting >= 300) score += 10
  if (roiOnSavings >= 15) score += 20
  else if (roiOnSavings >= 10) score += 10
  if (buyDiscount >= 5) score += 10
  
  const roomsRented = unitRents && ownerUnit !== undefined
    ? unitRents.filter((_, i) => i !== ownerUnit).length
    : 1
  const avgRoomRent = calc.rentalIncome / Math.max(1, roomsRented)
  
  return {
    netHousingCost: calc.actualHousingCost,
    savingsVsRenting: calc.savingsVsRenting,
    housingCostOffsetPct: housingOffsetPct,
    liveFreeThreshold: 90, // Target to pay $0
    totalCashRequired: calc.totalCashNeeded,
    downPayment: calc.downPayment,
    closingCosts: calc.purchaseCosts,
    monthlyPITI: calc.monthlyPayment,
    monthlyExpenses: calc.totalExpenses,
    roomsRented,
    roomRent: avgRoomRent,
    totalMonthlyIncome: calc.rentalIncome,
    roiOnSavings,
    breakevenHousingCost: calc.marketRent, // Could calculate actual breakeven
    buyDiscount,
    profitQualityScore: Math.min(100, score),
    liveFree: calc.liveFree,
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
interface HouseHackMetricsChartProps {
  data: HouseHackMetricsData
}

export function HouseHackMetricsChart({ data }: HouseHackMetricsChartProps) {
  const fmt = {
    currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
    currencyMo: (v: number) => `$${Math.round(v).toLocaleString()}/mo`,
    percent: (v: number) => `${v.toFixed(1)}%`,
  }

  // Build verdict
  const verdict: VerdictData = useMemo(() => {
    const score = data.profitQualityScore
    if (score >= 80) return { label: 'STRONG', detail: '(Offset 85%+ housing cost, near live-free)', status: 'good' }
    if (score >= 50) return { label: 'MODERATE', detail: '(Good savings, room for improvement)', status: 'warn' }
    return { label: 'WEAK', detail: '(Minimal housing offset)', status: 'bad' }
  }, [data.profitQualityScore])

  // Primary KPIs
  const kpis: KPI[] = [
    { label: 'Net Housing Cost', value: fmt.currencyMo(data.netHousingCost), hint: 'After room rent income' },
    { label: 'Savings vs Renting', value: fmt.currencyMo(data.savingsVsRenting), hint: 'Compared to rent baseline' },
    { label: 'Housing Cost Offset %', value: fmt.percent(data.housingCostOffsetPct), hint: 'Income ÷ housing cost' },
    { label: 'Live Free Threshold', value: fmt.percent(data.liveFreeThreshold), hint: 'Target offset to pay $0' },
  ]

  // Factors
  const factors: Factor[] = useMemo(() => [
    {
      name: 'Monthly Risk',
      desc: 'Can you still afford it if a room is vacant?',
      status: data.netHousingCost < data.monthlyPITI * 0.5 ? 'good' : 
              data.netHousingCost < data.monthlyPITI * 0.75 ? 'warn' : 'bad',
      tag: data.netHousingCost < data.monthlyPITI * 0.5 ? 'Safe' : 'Watch',
    },
    {
      name: 'Offset Strength',
      desc: 'Housing Cost Offset % and live-free proximity',
      status: data.housingCostOffsetPct >= 80 ? 'good' : 
              data.housingCostOffsetPct >= 50 ? 'warn' : 'bad',
      tag: data.housingCostOffsetPct >= 80 ? 'High' : data.housingCostOffsetPct >= 50 ? 'Moderate' : 'Low',
    },
    {
      name: 'Savings ROI',
      desc: 'ROI on savings vs total cash required',
      status: data.roiOnSavings >= 15 ? 'good' : data.roiOnSavings >= 10 ? 'warn' : 'bad',
      tag: data.roiOnSavings >= 15 ? 'Strong' : data.roiOnSavings >= 10 ? 'Fair' : 'Weak',
    },
    {
      name: 'Entry Advantage',
      desc: 'Buy discount and breakeven housing cost buffer',
      status: data.buyDiscount >= 5 ? 'good' : data.buyDiscount > 0 ? 'warn' : 'bad',
      tag: data.buyDiscount >= 5 ? 'Buffer' : 'Market',
    },
  ], [data])

  // Meta items
  const leftMeta: MetaItem[] = [
    { label: 'ROI on Savings', value: fmt.percent(data.roiOnSavings) },
    { label: 'Breakeven Housing Cost', value: fmt.currencyMo(data.breakevenHousingCost) },
  ]

  // Scenario A panel
  const scenarioA: BarItem[] = [
    { label: `Rooms Rented • Room Rent`, value: `${data.roomsRented} • ${fmt.currency(data.roomRent)}`, meter: 72 },
    { label: 'Total Monthly Income', value: fmt.currency(data.totalMonthlyIncome), meter: 78 },
    { label: 'Monthly PITI', value: fmt.currency(data.monthlyPITI), meter: 64 },
    { label: 'Net Housing Cost', value: fmt.currency(data.netHousingCost), meter: data.netHousingCost <= 0 ? 90 : 58 },
    { label: 'Savings vs Renting', value: fmt.currency(data.savingsVsRenting), meter: Math.min(100, (data.savingsVsRenting / 1000) * 100) },
  ]

  // Upfront cash panel
  const upfrontCash: BarItem[] = [
    { label: 'Total Cash Required', value: fmt.currency(data.totalCashRequired), meter: 70 },
    { label: 'Down Payment', value: fmt.currency(data.downPayment), meter: 62 },
    { label: 'Closing Costs', value: fmt.currency(data.closingCosts), meter: 54 },
  ]

  // Entry safety panel
  const entrySafety: BarItem[] = [
    { label: 'Buy Discount %', value: fmt.percent(data.buyDiscount), meter: Math.min(100, data.buyDiscount * 10) },
    { label: 'Breakeven Housing Cost', value: fmt.currency(data.breakevenHousingCost), meter: 60 },
    { label: 'Monthly Expenses', value: fmt.currency(data.monthlyExpenses), meter: 58 },
  ]

  return (
    <StrategyMetricsLayout
      strategyName="House Hack Strategy"
      subtitle="Investor scan: Monthly housing cost • Offset % • Live-free threshold • Savings ROI"
      leftPanel={
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <ProfitQualityRing 
              score={data.profitQualityScore} 
              subline="Weights: Housing cost offset + savings vs renting + downside buffer." 
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
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Scenario A: Room Rental</div>
            <div className="space-y-1">
              {scenarioA.map((bar) => (
                <BarRow key={bar.label} {...bar} />
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <BarPanel title="Upfront Cash" bars={upfrontCash} />
            <BarPanel title="Entry & Safety" bars={entrySafety} />
          </div>
          
          {data.liveFree && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-700">Live Free Achieved!</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">Rental income covers all housing costs.</p>
            </div>
          )}
        </>
      }
    />
  )
}
