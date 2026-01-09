'use client'

import React, { useMemo } from 'react'
import {
  IQTargetHero,
  PriceLadder,
  generatePriceLadder,
  ReturnsGrid,
  createLTRReturns,
  createSTRReturns,
  createBRRRRReturns,
  createWholesaleReturns,
  createHouseHackReturns,
  PerformanceBenchmarks,
  NegotiationPlan,
  generateNegotiationPlan,
  LEVERAGE_POINTS,
  TuneSection,
  createSliderConfig,
  CompareToggle,
  InsightCard,
  createIQInsight,
  HeroMetric,
  FormulaCard,
  createCapitalStackFormula,
  createRefinanceFormula,
  create70PercentRuleFormula,
  createWholesaleMathFormula,
  createFlipPLFormula,
  PerformanceSection,
  createMonthlyBreakdown,
  createSTRIncomeBreakdown
} from './index'
import { StrategyId, BenchmarkConfig, TuneGroup, LeveragePoint } from './types'
import { IQTargetResult, TargetAssumptions, getMetricsAtPrice } from '@/lib/iqTarget'

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (value: number): string => 
  new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value)

const formatCompact = (value: number): string => 
  Math.abs(value) >= 1000000 
    ? `$${(value / 1000000).toFixed(1)}M` 
    : Math.abs(value) >= 1000 
      ? `$${Math.round(value / 1000)}K` 
      : formatCurrency(value)

const formatPercent = (value: number, decimals: number = 1): string => 
  `${(value * 100).toFixed(decimals)}%`

// ============================================
// SHARED COMPONENTS
// ============================================

interface BaseMetricsProps {
  iqTarget: IQTargetResult
  metricsAtTarget: ReturnType<typeof getMetricsAtPrice> | null
  metricsAtList: ReturnType<typeof getMetricsAtPrice> | null
  assumptions: TargetAssumptions
  compareView: 'target' | 'list'
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

// ============================================
// STR METRICS CONTENT
// ============================================

export function STRMetricsContent({
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: BaseMetricsProps) {
  const currentMetrics = compareView === 'target' ? metricsAtTarget : metricsAtList
  
  const priceLadder = generatePriceLadder(
    assumptions.listPrice,
    iqTarget.targetPrice,
    'IQ Target',
    iqTarget.highlightedMetric,
    iqTarget.breakeven,
    'Breakeven',
    '$0 monthly cash flow',
    0.70
  )
  
  const negotiationPlan = generateNegotiationPlan(
    assumptions.listPrice,
    iqTarget.targetPrice,
    0.70,
    undefined,
    [
      LEVERAGE_POINTS.touristArea(),
      LEVERAGE_POINTS.daysOnMarket(45, 28),
      LEVERAGE_POINTS.priceReduced(2)
    ]
  )
  
  const returnsData = useMemo(() => {
    const m = currentMetrics
    if (!m) return null
    
    // Type guard for STR metrics
    if (!('monthlyCashFlow' in m)) return null
    const strMetrics = m as { monthlyCashFlow: number; cashOnCash: number; annualGrossRent?: number }
    
    return createSTRReturns(
      strMetrics.monthlyCashFlow || 0,
      strMetrics.cashOnCash || 0,
      strMetrics.annualGrossRent || 0,
      assumptions.occupancyRate
    )
  }, [currentMetrics, assumptions.occupancyRate])
  
  const benchmarks: BenchmarkConfig[] = useMemo(() => {
    const m = currentMetrics
    if (!m) return []
    
    // Type guard for rental metrics
    if (!('cashOnCash' in m)) return []
    const coc = (m as { cashOnCash: number }).cashOnCash || 0
    const occ = assumptions.occupancyRate
    
    return [
      {
        id: 'coc',
        label: 'Cash-on-Cash Return',
        value: coc,
        formattedValue: formatPercent(coc),
        status: coc >= 0.15 ? 'high' : coc >= 0.10 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, coc * 400)),
        zones: {
          low: { label: 'Low', range: '<8%' },
          average: { label: 'Avg', range: '10-15%' },
          high: { label: 'High', range: '15%+' }
        }
      },
      {
        id: 'occupancy',
        label: 'Occupancy Rate',
        value: occ,
        formattedValue: formatPercent(occ, 0),
        status: occ >= 0.80 ? 'high' : occ >= 0.65 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, occ * 100)),
        zones: {
          low: { label: 'Low', range: '<50%' },
          average: { label: 'Avg', range: '65-80%' },
          high: { label: 'High', range: '85%+' }
        }
      },
      {
        id: 'adr',
        label: 'Avg Daily Rate',
        value: assumptions.averageDailyRate,
        formattedValue: formatCurrency(assumptions.averageDailyRate),
        status: assumptions.averageDailyRate >= 250 ? 'high' : assumptions.averageDailyRate >= 150 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, (assumptions.averageDailyRate / 400) * 100)),
        zones: {
          low: { label: 'Low', range: '<$100' },
          average: { label: 'Avg', range: '$150-250' },
          high: { label: 'High', range: '$300+' }
        }
      }
    ]
  }, [currentMetrics, assumptions])
  
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'str_income',
      title: 'STR Revenue',
      sliders: [
        createSliderConfig(
          'averageDailyRate',
          'Average Daily Rate',
          assumptions.averageDailyRate,
          50,
          500,
          5,
          formatCurrency
        ),
        createSliderConfig(
          'occupancyRate',
          'Occupancy Rate',
          assumptions.occupancyRate,
          0.30,
          0.95,
          0.01,
          (v) => formatPercent(v, 0)
        )
      ]
    },
    {
      id: 'financing',
      title: 'Financing',
      sliders: [
        createSliderConfig(
          'downPaymentPct',
          'Down Payment',
          assumptions.downPaymentPct,
          0.10,
          0.50,
          0.01,
          (v) => formatPercent(v, 0)
        ),
        createSliderConfig(
          'interestRate',
          'Interest Rate',
          assumptions.interestRate,
          0.04,
          0.12,
          0.001,
          (v) => formatPercent(v)
        )
      ]
    }
  ], [assumptions])

  return (
    <div className="space-y-4">
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
      />

      <PriceLadder rungs={priceLadder} />
      <CompareToggle activeView={compareView} onChange={setCompareView} />

      {returnsData && (
        <ReturnsGrid
          title={compareView === 'target' ? 'Returns at IQ Target' : 'Returns at List Price'}
          data={returnsData}
        />
      )}

      <PerformanceBenchmarks
        title="STR Performance Benchmarks"
        subtitle="Key metrics for short-term rental success"
        benchmarks={benchmarks}
      />

      <NegotiationPlan data={negotiationPlan} />

      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      <InsightCard
        data={createIQInsight(
          'STR properties can generate 2-3x more revenue than long-term rentals in tourist areas. Consider management fees of 15-25%.',
          'tip'
        )}
      />
    </div>
  )
}

// ============================================
// BRRRR METRICS CONTENT
// ============================================

export function BRRRRMetricsContent({
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: BaseMetricsProps) {
  const currentMetrics = compareView === 'target' ? metricsAtTarget : metricsAtList
  
  const priceLadder = generatePriceLadder(
    assumptions.listPrice,
    iqTarget.targetPrice,
    'IQ Target',
    iqTarget.highlightedMetric,
    iqTarget.breakeven,
    '80% Recovery',
    'Minimum acceptable cash back',
    0.60
  )
  
  const negotiationPlan = generateNegotiationPlan(
    assumptions.listPrice,
    iqTarget.targetPrice,
    0.60,
    undefined,
    [
      LEVERAGE_POINTS.rehabNeeded(assumptions.rehabCost),
      LEVERAGE_POINTS.motivatedSeller(),
      LEVERAGE_POINTS.cashOffer()
    ]
  )
  
  // BRRRR-specific formula cards
  const capitalStackFormula = createCapitalStackFormula(
    iqTarget.targetPrice,
    assumptions.rehabCost,
    iqTarget.targetPrice * assumptions.closingCostsPct
  )
  
  const refinanceFormula = createRefinanceFormula(
    assumptions.arv,
    0.75,
    iqTarget.targetPrice + assumptions.rehabCost + (iqTarget.targetPrice * assumptions.closingCostsPct)
  )
  
  const returnsData = useMemo(() => {
    if (!iqTarget) return null
    return createBRRRRReturns(
      iqTarget.cashLeftInDeal || 0,
      iqTarget.equityCreated || 0,
      iqTarget.monthlyCashFlow,
      (iqTarget.cashRecoveryPercent || 0) >= 100
    )
  }, [iqTarget])
  
  const benchmarks: BenchmarkConfig[] = useMemo(() => {
    if (!iqTarget) return []
    
    const recovery = iqTarget.cashRecoveryPercent || 0
    const purchaseToArv = (iqTarget.targetPrice / assumptions.arv) * 100
    
    return [
      {
        id: 'recovery',
        label: 'Cash Recovery',
        value: recovery,
        formattedValue: `${Math.round(recovery)}%`,
        status: recovery >= 100 ? 'high' : recovery >= 80 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, recovery * 0.8)),
        zones: {
          low: { label: 'Low', range: '<70%' },
          average: { label: 'Avg', range: '80-95%' },
          high: { label: 'High', range: '100%+' }
        }
      },
      {
        id: 'purchaseArv',
        label: 'Purchase to ARV',
        value: purchaseToArv,
        formattedValue: `${Math.round(purchaseToArv)}%`,
        status: purchaseToArv <= 65 ? 'high' : purchaseToArv <= 75 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, 100 - purchaseToArv)),
        isInverted: true,
        zones: {
          low: { label: 'Good', range: '<65%' },
          average: { label: 'Avg', range: '65-75%' },
          high: { label: 'Risky', range: '80%+' }
        }
      }
    ]
  }, [iqTarget, assumptions.arv])
  
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'brrrr',
      title: 'BRRRR Parameters',
      sliders: [
        createSliderConfig(
          'rehabCost',
          'Rehab Budget',
          assumptions.rehabCost,
          5000,
          100000,
          1000,
          formatCurrency
        ),
        createSliderConfig(
          'arv',
          'After Repair Value',
          assumptions.arv,
          assumptions.listPrice,
          assumptions.listPrice * 1.5,
          5000,
          formatCurrency
        )
      ]
    },
    {
      id: 'rental',
      title: 'Rental Income',
      sliders: [
        createSliderConfig(
          'monthlyRent',
          'Monthly Rent (Post-Rehab)',
          assumptions.monthlyRent,
          500,
          5000,
          50,
          formatCurrency
        ),
        createSliderConfig(
          'vacancyRate',
          'Vacancy Rate',
          assumptions.vacancyRate,
          0,
          0.15,
          0.01,
          (v) => formatPercent(v, 0)
        )
      ]
    }
  ], [assumptions])

  return (
    <div className="space-y-4">
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
        badgeText="BRRRR Target"
      />

      {/* Cash Recovery Hero */}
      <HeroMetric
        data={{
          label: 'Cash Recovery at Refinance',
          value: `${Math.round(iqTarget.cashRecoveryPercent || 0)}%`,
          subtitle: `${formatCurrency(iqTarget.cashLeftInDeal || 0)} left in deal`,
          badge: (iqTarget.cashRecoveryPercent || 0) >= 100 ? '∞ RETURNS' : undefined,
          variant: (iqTarget.cashRecoveryPercent || 0) >= 100 ? 'success' : 'default'
        }}
      />

      <FormulaCard data={capitalStackFormula} />
      <FormulaCard data={refinanceFormula} />

      <PriceLadder rungs={priceLadder} />
      <CompareToggle activeView={compareView} onChange={setCompareView} />

      {returnsData && <ReturnsGrid data={returnsData} />}

      <PerformanceBenchmarks benchmarks={benchmarks} />
      <NegotiationPlan data={negotiationPlan} />

      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      <InsightCard
        data={createIQInsight(
          (iqTarget.cashRecoveryPercent || 0) >= 100
            ? 'This BRRRR achieves infinite returns! You recover 100%+ of your cash at refinance.'
            : 'Aim for deals where you recover 100% of your cash to achieve infinite returns.',
          (iqTarget.cashRecoveryPercent || 0) >= 100 ? 'success' : 'tip'
        )}
      />
    </div>
  )
}

// ============================================
// FIX & FLIP METRICS CONTENT
// ============================================

export function FlipMetricsContent({
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: BaseMetricsProps) {
  const priceLadder = generatePriceLadder(
    assumptions.listPrice,
    iqTarget.targetPrice,
    'IQ Target',
    iqTarget.highlightedMetric,
    iqTarget.breakeven,
    'Breakeven',
    '$0 profit',
    0.60
  )
  
  const negotiationPlan = generateNegotiationPlan(
    assumptions.listPrice,
    iqTarget.targetPrice,
    0.60,
    undefined,
    [
      LEVERAGE_POINTS.rehabNeeded(assumptions.rehabCost),
      LEVERAGE_POINTS.daysOnMarket(60, 28),
      LEVERAGE_POINTS.comparables(-8)
    ]
  )
  
  // Flip P&L formula
  const flipPLFormula = createFlipPLFormula(
    assumptions.arv,
    iqTarget.targetPrice,
    assumptions.rehabCost,
    iqTarget.targetPrice * (assumptions.interestRate / 12) * assumptions.holdingPeriodMonths,
    assumptions.arv * assumptions.sellingCostsPct
  )
  
  // 70% Rule formula
  const seventyRuleFormula = create70PercentRuleFormula(
    assumptions.arv,
    assumptions.rehabCost,
    30000 // Standard investor profit expectation
  )
  
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'flip',
      title: 'Flip Parameters',
      sliders: [
        createSliderConfig(
          'rehabCost',
          'Rehab Budget',
          assumptions.rehabCost,
          5000,
          150000,
          1000,
          formatCurrency
        ),
        createSliderConfig(
          'arv',
          'After Repair Value',
          assumptions.arv,
          assumptions.listPrice,
          assumptions.listPrice * 1.5,
          5000,
          formatCurrency
        ),
        createSliderConfig(
          'holdingPeriodMonths',
          'Holding Period',
          assumptions.holdingPeriodMonths,
          3,
          12,
          1,
          (v) => `${v} months`
        )
      ]
    },
    {
      id: 'costs',
      title: 'Transaction Costs',
      sliders: [
        createSliderConfig(
          'closingCostsPct',
          'Closing Costs',
          assumptions.closingCostsPct,
          0.02,
          0.05,
          0.005,
          (v) => formatPercent(v, 1)
        ),
        createSliderConfig(
          'sellingCostsPct',
          'Selling Costs',
          assumptions.sellingCostsPct,
          0.06,
          0.10,
          0.005,
          (v) => formatPercent(v, 1)
        )
      ]
    }
  ], [assumptions])

  return (
    <div className="space-y-4">
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
        badgeText="Flip Target"
      />

      {/* Net Profit Hero */}
      <HeroMetric
        data={{
          label: 'Net Profit',
          value: formatCurrency(iqTarget.netProfit || 0),
          subtitle: `${Math.round((iqTarget.roi || 0) * 100)}% ROI in ${assumptions.holdingPeriodMonths} months`,
          variant: (iqTarget.netProfit || 0) >= 30000 ? 'success' : (iqTarget.netProfit || 0) >= 15000 ? 'default' : 'warning'
        }}
      />

      <FormulaCard data={flipPLFormula} />
      <FormulaCard data={seventyRuleFormula} />

      <PriceLadder rungs={priceLadder} />
      <NegotiationPlan data={negotiationPlan} />

      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      <InsightCard
        data={createIQInsight(
          (iqTarget.netProfit || 0) >= 30000
            ? 'This flip meets the $30K minimum profit threshold. Solid deal!'
            : 'Consider negotiating lower to achieve the standard $30K+ profit target.',
          (iqTarget.netProfit || 0) >= 30000 ? 'success' : 'warning'
        )}
      />
    </div>
  )
}

// ============================================
// HOUSE HACK METRICS CONTENT
// ============================================

export function HouseHackMetricsContent({
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: BaseMetricsProps) {
  const priceLadder = generatePriceLadder(
    assumptions.listPrice,
    iqTarget.targetPrice,
    'IQ Target',
    iqTarget.highlightedMetric,
    iqTarget.breakeven,
    'Market Rent',
    'Break even vs. renting',
    0.75
  )
  
  const isFreeHousing = (iqTarget.effectiveHousingCost || 0) <= 0
  
  const returnsData = useMemo(() => {
    return createHouseHackReturns(
      iqTarget.effectiveHousingCost || 0,
      iqTarget.monthlySavings || 0,
      assumptions.monthlyRent / assumptions.totalBedrooms * assumptions.roomsRented,
      (assumptions.monthlyRent / assumptions.totalBedrooms * assumptions.roomsRented) / 
        ((iqTarget.targetPrice * 0.035 * (assumptions.interestRate / 12)) + assumptions.propertyTaxes / 12 + assumptions.insurance / 12)
    )
  }, [iqTarget, assumptions])
  
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'househack',
      title: 'House Hack Setup',
      sliders: [
        createSliderConfig(
          'roomsRented',
          'Rooms Rented',
          assumptions.roomsRented,
          1,
          Math.max(1, assumptions.totalBedrooms - 1),
          1,
          (v) => `${v} of ${assumptions.totalBedrooms}`
        ),
        createSliderConfig(
          'monthlyRent',
          'Total Market Rent',
          assumptions.monthlyRent,
          500,
          5000,
          50,
          formatCurrency
        )
      ]
    },
    {
      id: 'financing',
      title: 'FHA Financing',
      sliders: [
        createSliderConfig(
          'interestRate',
          'Interest Rate',
          assumptions.interestRate,
          0.05,
          0.10,
          0.001,
          (v) => formatPercent(v)
        )
      ]
    }
  ], [assumptions])

  return (
    <div className="space-y-4">
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
        badgeText="House Hack Target"
      />

      {/* Housing Cost Hero */}
      <HeroMetric
        data={{
          label: 'Your Housing Cost',
          value: isFreeHousing ? '$0/mo' : formatCurrency(iqTarget.effectiveHousingCost || 0) + '/mo',
          subtitle: `Save ${formatCurrency(iqTarget.monthlySavings || 0)}/mo vs. renting`,
          badge: isFreeHousing ? 'FREE HOUSING 🎉' : undefined,
          variant: isFreeHousing ? 'success' : 'default'
        }}
      />

      <ReturnsGrid data={returnsData} />
      <PriceLadder rungs={priceLadder} />

      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      <InsightCard
        data={createIQInsight(
          isFreeHousing
            ? 'Congrats! At this price, your rental income covers all housing costs. You live for FREE!'
            : `Renting ${assumptions.roomsRented} rooms at ${formatCurrency(assumptions.monthlyRent / assumptions.totalBedrooms)}/room dramatically reduces your housing cost.`,
          isFreeHousing ? 'success' : 'tip'
        )}
      />

      <InsightCard
        data={{
          type: 'info',
          icon: '🏠',
          content: `After ${Math.ceil(12 / (assumptions.roomsRented || 1))} years, move out and convert to a full rental for **${formatCurrency(assumptions.monthlyRent * 0.7)}/mo** cash flow.`
        }}
      />
    </div>
  )
}

// ============================================
// WHOLESALE METRICS CONTENT
// ============================================

export function WholesaleMetricsContent({
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: BaseMetricsProps) {
  const negotiationPlan = generateNegotiationPlan(
    assumptions.listPrice,
    iqTarget.targetPrice,
    0.55,
    undefined,
    [
      LEVERAGE_POINTS.motivatedSeller(),
      LEVERAGE_POINTS.rehabNeeded(assumptions.rehabCost),
      LEVERAGE_POINTS.activeBuyerList()
    ]
  )
  
  // 70% Rule formula
  const seventyRuleFormula = create70PercentRuleFormula(
    assumptions.arv,
    assumptions.rehabCost,
    30000
  )
  
  // Wholesale math formula
  const wholesaleMathFormula = createWholesaleMathFormula(
    iqTarget.mao || 0,
    iqTarget.targetPrice
  )
  
  const returnsData = useMemo(() => {
    return createWholesaleReturns(
      iqTarget.assignmentFee || 0,
      ((iqTarget.assignmentFee || 0) / 5000) * 100, // ROI on $5K EMD
      5000, // Standard EMD
      30 // Timeline
    )
  }, [iqTarget])
  
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'wholesale',
      title: 'Wholesale Parameters',
      sliders: [
        createSliderConfig(
          'arv',
          'After Repair Value',
          assumptions.arv,
          assumptions.listPrice,
          assumptions.listPrice * 1.5,
          5000,
          formatCurrency
        ),
        createSliderConfig(
          'rehabCost',
          'Estimated Repairs',
          assumptions.rehabCost,
          5000,
          100000,
          1000,
          formatCurrency
        ),
        createSliderConfig(
          'wholesaleFeePct',
          'Assignment Fee %',
          assumptions.wholesaleFeePct,
          0.003,
          0.015,
          0.001,
          (v) => formatPercent(v)
        )
      ]
    }
  ], [assumptions])

  return (
    <div className="space-y-4">
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
        badgeText="Contract Price"
        labelText="Your Maximum Contract Price"
      />

      {/* Assignment Fee Hero */}
      <HeroMetric
        data={{
          label: 'Assignment Fee',
          value: formatCurrency(iqTarget.assignmentFee || 0),
          subtitle: `${Math.round(((iqTarget.assignmentFee || 0) / 5000) * 100)}% ROI on $5K earnest money`,
          badge: (iqTarget.assignmentFee || 0) >= 10000 ? 'SOLID DEAL' : undefined,
          variant: (iqTarget.assignmentFee || 0) >= 10000 ? 'success' : 'default'
        }}
      />

      <FormulaCard data={seventyRuleFormula} />
      <FormulaCard data={wholesaleMathFormula} />

      <ReturnsGrid data={returnsData} />
      <NegotiationPlan data={negotiationPlan} />

      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      <InsightCard
        data={createIQInsight(
          (iqTarget.assignmentFee || 0) >= 10000
            ? 'This deal has strong wholesale margins. End buyers will love the 70% rule compliance.'
            : 'Consider negotiating lower to increase your assignment fee to $10K+.',
          (iqTarget.assignmentFee || 0) >= 10000 ? 'success' : 'tip'
        )}
      />
    </div>
  )
}
