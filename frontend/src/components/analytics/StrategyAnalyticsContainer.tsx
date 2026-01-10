'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  StrategySelector, 
  DEFAULT_STRATEGIES,
  SubTabNav,
  getStrategyTabs,
  PropertyMiniCard,
  IQTargetHero,
  PriceLadder,
  generatePriceLadder,
  ReturnsGrid,
  createLTRReturns,
  PerformanceBenchmarks,
  NegotiationPlan,
  generateNegotiationPlan,
  LEVERAGE_POINTS,
  TuneSection,
  createSliderConfig,
  formatters,
  CompareToggle,
  InsightCard,
  createIQInsight,
  HeroMetric,
  DealScoreDisplay,
  calculateDealScoreData,
  FundingOverview,
  PerformanceSection,
  createMonthlyBreakdown,
  create10YearProjection,
  IQWelcomeModal,
  StrategyGrid,
  StrategyPrompt
} from './index'
import {
  STRMetricsContent,
  BRRRRMetricsContent,
  FlipMetricsContent,
  HouseHackMetricsContent,
  WholesaleMetricsContent
} from './StrategyMetricsContent'
import { StrategyId, SubTabId, BenchmarkConfig, TuneGroup } from './types'
import { 
  calculateIQTarget, 
  getMetricsAtPrice, 
  TargetAssumptions,
  IQTargetResult 
} from '@/lib/iqTarget'
import { 
  calculate10YearProjections, 
  getDefaultProjectionAssumptions,
  YearlyProjection 
} from '@/lib/projections'

// ============================================
// TYPES
// ============================================

export interface PropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  listPrice: number
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv?: number
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
}

interface StrategyAnalyticsContainerProps {
  property: PropertyData
  onBack?: () => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createDefaultAssumptions(property: PropertyData): TargetAssumptions {
  const arv = property.arv || property.listPrice * 1.15
  const rehabCost = arv * 0.05
  
  return {
    listPrice: property.listPrice,
    downPaymentPct: 0.20,
    interestRate: 0.0725,
    loanTermYears: 30,
    closingCostsPct: 0.03,
    monthlyRent: property.monthlyRent || property.listPrice * 0.007,
    averageDailyRate: property.averageDailyRate || 150,
    occupancyRate: property.occupancyRate || 0.70,
    vacancyRate: 0.05,
    propertyTaxes: property.propertyTaxes || property.listPrice * 0.012,
    insurance: property.insurance || 1800,
    managementPct: 0.08,
    maintenancePct: 0.05,
    rehabCost,
    arv,
    holdingPeriodMonths: 6,
    sellingCostsPct: 0.08,
    roomsRented: Math.max(1, (property.bedrooms || 3) - 1),
    totalBedrooms: property.bedrooms || 3,
    wholesaleFeePct: 0.007
  }
}

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
// MAIN COMPONENT
// ============================================

export function StrategyAnalyticsContainer({ property, onBack }: StrategyAnalyticsContainerProps) {
  // State
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('metrics')
  const [compareView, setCompareView] = useState<'target' | 'list'>('target')
  const [assumptions, setAssumptions] = useState(() => createDefaultAssumptions(property))
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  
  // Compute IQ Target
  const iqTarget = useMemo(() => {
    if (!activeStrategy) return null
    return calculateIQTarget(activeStrategy, assumptions)
  }, [activeStrategy, assumptions])
  
  // Compute metrics at both prices
  const metricsAtTarget = useMemo(() => {
    if (!activeStrategy || !iqTarget) return null
    return getMetricsAtPrice(activeStrategy, iqTarget.targetPrice, assumptions)
  }, [activeStrategy, iqTarget, assumptions])
  
  const metricsAtList = useMemo(() => {
    if (!activeStrategy) return null
    return getMetricsAtPrice(activeStrategy, assumptions.listPrice, assumptions)
  }, [activeStrategy, assumptions])
  
  // Current metrics based on compare view
  const currentMetrics = compareView === 'target' ? metricsAtTarget : metricsAtList
  const currentPrice = compareView === 'target' ? iqTarget?.targetPrice : assumptions.listPrice
  
  // Update assumption handler
  const updateAssumption = useCallback((key: keyof TargetAssumptions, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])
  
  // Get tabs for current strategy
  const tabs = activeStrategy ? getStrategyTabs(activeStrategy) : []
  
  // Calculate 10-year projections
  const projections = useMemo(() => {
    if (!activeStrategy || !currentPrice) return null
    
    const projAssumptions = getDefaultProjectionAssumptions(
      currentPrice,
      assumptions.monthlyRent,
      assumptions.propertyTaxes
    )
    projAssumptions.downPaymentPct = assumptions.downPaymentPct
    projAssumptions.interestRate = assumptions.interestRate
    projAssumptions.vacancyRate = assumptions.vacancyRate
    projAssumptions.managementPct = assumptions.managementPct
    projAssumptions.maintenancePct = assumptions.maintenancePct
    projAssumptions.insurance = assumptions.insurance
    
    return calculate10YearProjections(projAssumptions)
  }, [activeStrategy, currentPrice, assumptions])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1426] to-[#091020] text-white">
      {/* Property Photos & Card */}
      <div className="px-4">
        <PropertyMiniCard
          data={{
            address: property.address,
            location: `${property.city}, ${property.state} ${property.zipCode}`,
            price: property.listPrice,
            priceLabel: 'List Price',
            specs: `${property.bedrooms} bd · ${property.bathrooms} ba · ${property.sqft?.toLocaleString()} sqft`,
            thumbnailUrl: property.thumbnailUrl,
            photoCount: property.photoCount
          }}
          photos={property.photos}
          onExpand={onBack}
          showExpandButton={!!onBack}
        />
      </div>

      {/* IQ Welcome Modal */}
      <IQWelcomeModal
        isOpen={showWelcomeModal && !activeStrategy}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Landing State - No Strategy Selected */}
      {!activeStrategy && !showWelcomeModal && (
        <div className="px-4 pb-24 space-y-5">
          {/* Strategy Prompt */}
          <StrategyPrompt />

          {/* Strategy Grid */}
          <StrategyGrid
            activeStrategy={activeStrategy}
            onSelectStrategy={(id) => {
              setActiveStrategy(id)
              setActiveSubTab('metrics')
              setCompareView('target')
            }}
          />
        </div>
      )}

      {/* Strategy Selected - Show Horizontal Selector + Content */}
      {activeStrategy && (
        <>
          {/* Strategy Selector Pills */}
          <div className="px-4">
            <StrategySelector
              activeStrategy={activeStrategy}
              strategies={DEFAULT_STRATEGIES}
              onChange={(id) => {
                setActiveStrategy(id)
                setActiveSubTab('metrics')
                setCompareView('target')
              }}
              showCTA={false}
            />
          </div>
        </>
      )}

      {/* Strategy Content */}
      {activeStrategy && (
        <div className="px-4 pb-24">
          {/* Sub Tab Navigation */}
          <SubTabNav
            tabs={tabs}
            activeTab={activeSubTab}
            onChange={setActiveSubTab}
          />

          {/* Tab Content */}
          {activeSubTab === 'metrics' && iqTarget && currentMetrics && (
            <StrategySpecificMetrics
              strategy={activeStrategy}
              iqTarget={iqTarget}
              metricsAtTarget={metricsAtTarget}
              metricsAtList={metricsAtList}
              assumptions={assumptions}
              compareView={compareView}
              setCompareView={setCompareView}
              updateAssumption={updateAssumption}
            />
          )}

          {activeSubTab === 'funding' && currentPrice && (
            <FundingTabContent
              purchasePrice={currentPrice}
              assumptions={assumptions}
            />
          )}

          {activeSubTab === '10year' && projections && iqTarget && (
            <ProjectionsTabContent
              projections={projections}
              iqTarget={iqTarget}
              assumptions={assumptions}
            />
          )}

          {activeSubTab === 'score' && currentMetrics && iqTarget && (
            <ScoreTabContent
              strategy={activeStrategy}
              metrics={currentMetrics}
              iqTarget={iqTarget}
            />
          )}

          {activeSubTab === 'growth' && projections && iqTarget && (
            <GrowthTabContent
              projections={projections}
              iqTarget={iqTarget}
              assumptions={assumptions}
              updateAssumption={updateAssumption}
            />
          )}

          {activeSubTab === 'whatif' && (
            <WhatIfTabContent
              assumptions={assumptions}
              updateAssumption={updateAssumption}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// STRATEGY-SPECIFIC METRICS ROUTER
// ============================================

interface StrategySpecificMetricsProps {
  strategy: StrategyId
  iqTarget: IQTargetResult
  metricsAtTarget: ReturnType<typeof getMetricsAtPrice> | null
  metricsAtList: ReturnType<typeof getMetricsAtPrice> | null
  assumptions: TargetAssumptions
  compareView: 'target' | 'list'
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

function StrategySpecificMetrics(props: StrategySpecificMetricsProps) {
  switch (props.strategy) {
    case 'str':
      return <STRMetricsContent {...props} />
    case 'brrrr':
      return <BRRRRMetricsContent {...props} />
    case 'flip':
      return <FlipMetricsContent {...props} />
    case 'house_hack':
      return <HouseHackMetricsContent {...props} />
    case 'wholesale':
      return <WholesaleMetricsContent {...props} />
    case 'ltr':
    default:
      return <LTRMetricsContent {...props} />
  }
}

// ============================================
// TAB CONTENT COMPONENTS
// ============================================

interface LTRMetricsContentProps {
  strategy: StrategyId
  iqTarget: IQTargetResult
  metricsAtTarget: ReturnType<typeof getMetricsAtPrice> | null
  metricsAtList: ReturnType<typeof getMetricsAtPrice> | null
  assumptions: TargetAssumptions
  compareView: 'target' | 'list'
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

function LTRMetricsContent({
  strategy,
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption
}: LTRMetricsContentProps) {
  // Generate price ladder
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
  
  // Generate negotiation plan
  const negotiationPlan = generateNegotiationPlan(
    assumptions.listPrice,
    iqTarget.targetPrice,
    0.70,
    undefined,
    [
      LEVERAGE_POINTS.daysOnMarket(45, 28),
      LEVERAGE_POINTS.priceReduced(2),
      LEVERAGE_POINTS.cashOffer()
    ]
  )
  
  // Returns data based on strategy
  const returnsData = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    if (!m) return null
    
    // Type guard for rental metrics (LTR, STR, BRRRR, House Hack have monthlyCashFlow)
    const hasRentalMetrics = 'monthlyCashFlow' in m
    
    switch (strategy) {
      case 'ltr':
      case 'str':
      case 'brrrr':
      case 'house_hack':
        if (hasRentalMetrics) {
          const rentalMetrics = m as { monthlyCashFlow: number; cashOnCash: number; capRate: number; dscr: number }
          return createLTRReturns(
            rentalMetrics.monthlyCashFlow || 0,
            rentalMetrics.cashOnCash || 0,
            rentalMetrics.capRate || 0,
            rentalMetrics.dscr || 0
          )
        }
        return null
      case 'flip':
      case 'wholesale':
        // Flip and Wholesale don't have traditional rental returns
        return null
      default:
        return null
    }
  }, [strategy, compareView, metricsAtTarget, metricsAtList])
  
  // Benchmarks
  const benchmarks: BenchmarkConfig[] = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    if (!m) return []
    
    // Type guard - only rental strategies have these metrics
    const hasRentalMetrics = 'cashOnCash' in m && 'capRate' in m && 'dscr' in m
    if (!hasRentalMetrics) return []
    
    const rentalMetrics = m as { cashOnCash: number; capRate: number; dscr: number }
    const coc = rentalMetrics.cashOnCash || 0
    const cap = rentalMetrics.capRate || 0
    const dscr = rentalMetrics.dscr || 0
    
    return [
      {
        id: 'coc',
        label: 'Cash-on-Cash Return',
        value: coc,
        formattedValue: formatPercent(coc),
        status: coc >= 0.12 ? 'high' : coc >= 0.08 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, coc * 500)),
        zones: {
          low: { label: 'Low', range: '<5%' },
          average: { label: 'Avg', range: '8-10%' },
          high: { label: 'High', range: '12%+' }
        }
      },
      {
        id: 'cap',
        label: 'Cap Rate',
        value: cap,
        formattedValue: formatPercent(cap),
        status: cap >= 0.055 ? 'high' : cap >= 0.04 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, cap * 1000)),
        zones: {
          low: { label: 'Low', range: '<4%' },
          average: { label: 'Avg', range: '4.5-5.5%' },
          high: { label: 'High', range: '5.5%+' }
        }
      },
      {
        id: 'dscr',
        label: 'Debt Service Coverage',
        value: dscr,
        formattedValue: dscr.toFixed(2),
        status: dscr >= 1.5 ? 'high' : dscr >= 1.2 ? 'average' : 'low',
        markerPosition: Math.min(95, Math.max(5, (dscr - 0.5) * 50)),
        zones: {
          low: { label: 'Low', range: '<1.0' },
          average: { label: 'Avg', range: '1.2-1.5' },
          high: { label: 'High', range: '1.5+' }
        }
      }
    ]
  }, [compareView, metricsAtTarget, metricsAtList])
  
  // Tune groups
  const tuneGroups: TuneGroup[] = useMemo(() => [
    {
      id: 'financing',
      title: 'Financing',
      sliders: [
        createSliderConfig(
          'downPaymentPct',
          'Down Payment',
          assumptions.downPaymentPct,
          0.05,
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
    },
    {
      id: 'rental',
      title: 'Rental Income',
      sliders: [
        createSliderConfig(
          'monthlyRent',
          'Monthly Rent',
          assumptions.monthlyRent,
          500,
          10000,
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
      {/* IQ Target Hero */}
      <IQTargetHero
        targetPrice={iqTarget.targetPrice}
        discountAmount={iqTarget.discountFromList}
        discountPercent={iqTarget.discountPercent}
        rationale={iqTarget.rationale}
        highlightedMetric={iqTarget.highlightedMetric}
        secondaryMetric={iqTarget.secondaryMetric}
      />

      {/* Price Ladder */}
      <PriceLadder rungs={priceLadder} />

      {/* Compare Toggle */}
      <CompareToggle
        activeView={compareView}
        onChange={setCompareView}
      />

      {/* Returns Grid */}
      {returnsData && (
        <ReturnsGrid
          title={compareView === 'target' ? 'Returns at IQ Target' : 'Returns at List Price'}
          data={returnsData}
        />
      )}

      {/* Performance Benchmarks */}
      <PerformanceBenchmarks
        title="Performance Benchmarks"
        subtitle="How this deal compares to national averages"
        benchmarks={benchmarks}
      />

      {/* Negotiation Plan */}
      <NegotiationPlan data={negotiationPlan} />

      {/* Tune the Deal */}
      <TuneSection
        title="Tune the Deal"
        groups={tuneGroups}
        primarySlider={createSliderConfig(
          'listPrice',
          'Purchase Price',
          assumptions.listPrice,
          assumptions.listPrice * 0.60,
          assumptions.listPrice * 1.05,
          1000,
          formatCurrency,
          assumptions.listPrice
        )}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={false}
      />

      {/* IQ Insight */}
      <InsightCard
        data={createIQInsight(
          compareView === 'target'
            ? `At the IQ Target price, this property generates strong returns with good risk coverage.`
            : `At list price, returns are compressed. Consider negotiating toward the IQ Target.`,
          compareView === 'target' ? 'success' : 'warning'
        )}
      />
    </div>
  )
}

interface FundingTabContentProps {
  purchasePrice: number
  assumptions: TargetAssumptions
}

function FundingTabContent({ purchasePrice, assumptions }: FundingTabContentProps) {
  const downPayment = purchasePrice * assumptions.downPaymentPct
  const closingCosts = purchasePrice * assumptions.closingCostsPct
  const loanAmount = purchasePrice - downPayment
  
  return (
    <div className="space-y-4">
      <FundingOverview
        loanAmount={loanAmount}
        interestRate={assumptions.interestRate}
        loanTermYears={assumptions.loanTermYears}
        downPayment={downPayment}
        closingCosts={closingCosts}
        purchasePrice={purchasePrice}
      />
      
      <InsightCard
        data={createIQInsight(
          `With ${formatPercent(assumptions.downPaymentPct, 0)} down, you'll need ${formatCurrency(downPayment + closingCosts)} cash to close.`,
          'info'
        )}
      />
    </div>
  )
}

interface ProjectionsTabContentProps {
  projections: YearlyProjection[]
  iqTarget: IQTargetResult
  assumptions: TargetAssumptions
}

function ProjectionsTabContent({ projections, iqTarget, assumptions }: ProjectionsTabContentProps) {
  const year10 = projections[9]
  const downPayment = iqTarget.targetPrice * assumptions.downPaymentPct
  const closingCosts = iqTarget.targetPrice * assumptions.closingCostsPct
  const totalCashInvested = downPayment + closingCosts
  
  const projectionRows = create10YearProjection(
    year10.cumulativeCashFlow,
    year10.cumulativePrincipal,
    year10.equityFromAppreciation,
    year10.totalEquity,
    (year10.totalWealth / totalCashInvested) * 100
  )
  
  return (
    <div className="space-y-4">
      <HeroMetric
        data={{
          label: '10-Year Total Return',
          value: `${Math.round((year10.totalWealth / totalCashInvested) * 100)}%`,
          subtitle: `On ${formatCurrency(totalCashInvested)} initial investment`,
          badge: `${formatCurrency(year10.totalWealth)} Total Wealth`,
          variant: 'success'
        }}
      />
      
      <PerformanceSection
        title="10-Year Projection Summary"
        rows={projectionRows}
      />
      
      <InsightCard
        data={createIQInsight(
          `Over 10 years, this property could generate ${formatCurrency(year10.cumulativeCashFlow)} in cash flow and build ${formatCurrency(year10.totalEquity)} in equity.`,
          'success'
        )}
      />
    </div>
  )
}

interface ScoreTabContentProps {
  strategy: StrategyId
  metrics: ReturnType<typeof getMetricsAtPrice>
  iqTarget: IQTargetResult
}

function ScoreTabContent({ strategy, metrics, iqTarget }: ScoreTabContentProps) {
  // Type guard for rental metrics
  const hasRentalMetrics = 'monthlyCashFlow' in metrics && 'cashOnCash' in metrics && 'capRate' in metrics && 'dscr' in metrics
  
  const scoreData = useMemo(() => {
    // Get values with type guards
    const cashFlow = hasRentalMetrics ? (metrics as { monthlyCashFlow: number }).monthlyCashFlow : 0
    const cashOnCash = hasRentalMetrics ? (metrics as { cashOnCash: number }).cashOnCash : 0
    const capRate = hasRentalMetrics ? (metrics as { capRate: number }).capRate : 0
    const dscr = hasRentalMetrics ? (metrics as { dscr: number }).dscr : 0
    
    return calculateDealScoreData({
      cashFlow: cashFlow || 0,
      cashOnCash: cashOnCash || 0,
      capRate: capRate || 0,
      onePercentRule: (iqTarget.monthlyCashFlow || 0) > 0 ? 0.01 : 0.008,
      dscr: dscr || 0,
      equityPotential: 0.15,
      riskBuffer: 0.8
    })
  }, [metrics, iqTarget, hasRentalMetrics])
  
  // Generate strengths and weaknesses
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  if (hasRentalMetrics) {
    const rentalMetrics = metrics as { monthlyCashFlow: number; cashOnCash: number; dscr: number }
    if ((rentalMetrics.monthlyCashFlow || 0) >= 300) strengths.push('Strong monthly cash flow')
    if ((rentalMetrics.cashOnCash || 0) >= 0.10) strengths.push('Excellent cash-on-cash return')
    if ((rentalMetrics.dscr || 0) >= 1.25) strengths.push('Good debt coverage')
    
    if ((rentalMetrics.monthlyCashFlow || 0) < 100) weaknesses.push('Low cash flow margin')
    if ((rentalMetrics.cashOnCash || 0) < 0.06) weaknesses.push('Below-average returns')
  }
  
  // Handle flip/wholesale-specific strengths
  if ('netProfit' in metrics) {
    const flipMetrics = metrics as { netProfit: number; roi: number }
    if ((flipMetrics.netProfit || 0) >= 50000) strengths.push('Strong profit potential')
    if ((flipMetrics.roi || 0) >= 0.25) strengths.push('Excellent ROI')
    if ((flipMetrics.netProfit || 0) < 20000) weaknesses.push('Thin profit margin')
  }
  
  if ('assignmentFee' in metrics) {
    const wholesaleMetrics = metrics as { assignmentFee: number }
    if ((wholesaleMetrics.assignmentFee || 0) >= 15000) strengths.push('Strong assignment fee')
    if ((wholesaleMetrics.assignmentFee || 0) < 5000) weaknesses.push('Low assignment fee')
  }
  
  return (
    <div className="space-y-4">
      <DealScoreDisplay
        data={scoreData}
        strengths={strengths}
        weaknesses={weaknesses}
      />
    </div>
  )
}

interface GrowthTabContentProps {
  projections: YearlyProjection[]
  iqTarget: IQTargetResult
  assumptions: TargetAssumptions
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

function GrowthTabContent({ projections, iqTarget, assumptions, updateAssumption }: GrowthTabContentProps) {
  // Year 5 projections
  const year5 = projections[4]
  const downPayment = iqTarget.targetPrice * assumptions.downPaymentPct
  const closingCosts = iqTarget.targetPrice * assumptions.closingCostsPct
  const totalCashInvested = downPayment + closingCosts
  
  // Growth sliders
  const growthSliders: TuneGroup[] = [
    {
      id: 'growth',
      title: 'Growth Assumptions',
      isOpen: true,
      sliders: [
        createSliderConfig(
          'rentGrowth',
          'Annual Rent Increase',
          assumptions.rentGrowth || 0.03,
          0,
          0.08,
          0.005,
          (v) => formatPercent(v)
        ),
        createSliderConfig(
          'appreciationRate',
          'Property Appreciation',
          assumptions.appreciationRate || 0.03,
          0,
          0.08,
          0.005,
          (v) => formatPercent(v)
        ),
        createSliderConfig(
          'expenseGrowth',
          'Expense Growth',
          assumptions.expenseGrowth || 0.02,
          0,
          0.06,
          0.005,
          (v) => formatPercent(v)
        )
      ]
    }
  ]
  
  // Calculate Year 5 values based on growth assumptions
  const rentGrowth = assumptions.rentGrowth || 0.03
  const appreciationRate = assumptions.appreciationRate || 0.03
  const year5Rent = assumptions.monthlyRent * Math.pow(1 + rentGrowth, 5)
  const year5Value = iqTarget.targetPrice * Math.pow(1 + appreciationRate, 5)
  
  const year5ProjectionRows = [
    { label: 'Monthly Rent', value: formatCurrency(year5Rent) },
    { label: 'Property Value', value: formatCurrency(year5Value) },
    { label: 'Monthly Cash Flow', value: formatCurrency(year5.cashFlow / 12), isPositive: year5.cashFlow > 0 },
    { label: 'Total Equity', value: formatCurrency(year5.totalEquity), isPositive: true }
  ]
  
  return (
    <div className="space-y-4">
      {/* Growth Sliders */}
      <TuneSection
        title="Growth Assumptions"
        groups={growthSliders}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={true}
      />
      
      {/* Year 5 Projections */}
      <PerformanceSection
        title="Year 5 Projections"
        rows={year5ProjectionRows}
      />
      
      {/* Year 10 Summary */}
      <HeroMetric
        data={{
          label: '10-Year Equity Growth',
          value: formatCurrency(projections[9].totalEquity),
          subtitle: `Starting equity: ${formatCurrency(downPayment)}`,
          badge: `${Math.round((projections[9].totalEquity / downPayment) * 100 - 100)}% Growth`,
          variant: 'success'
        }}
      />
      
      <InsightCard
        data={createIQInsight(
          `With ${formatPercent(rentGrowth)} annual rent increases and ${formatPercent(appreciationRate)} appreciation, your equity could grow to ${formatCurrency(projections[9].totalEquity)} in 10 years.`,
          'success'
        )}
      />
    </div>
  )
}

interface WhatIfTabContentProps {
  assumptions: TargetAssumptions
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

function WhatIfTabContent({ assumptions, updateAssumption }: WhatIfTabContentProps) {
  const tuneGroups: TuneGroup[] = [
    {
      id: 'price',
      title: 'Purchase Price Scenarios',
      isOpen: true,
      sliders: [
        createSliderConfig(
          'listPrice',
          'Purchase Price',
          assumptions.listPrice,
          assumptions.listPrice * 0.60,
          assumptions.listPrice * 1.05,
          1000,
          formatCurrency
        )
      ]
    },
    {
      id: 'financing',
      title: 'Financing Scenarios',
      sliders: [
        createSliderConfig(
          'downPaymentPct',
          'Down Payment',
          assumptions.downPaymentPct,
          0.05,
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
        ),
        createSliderConfig(
          'loanTermYears',
          'Loan Term',
          assumptions.loanTermYears,
          15,
          30,
          5,
          (v) => `${v} years`
        )
      ]
    },
    {
      id: 'income',
      title: 'Income Scenarios',
      sliders: [
        createSliderConfig(
          'monthlyRent',
          'Monthly Rent',
          assumptions.monthlyRent,
          500,
          10000,
          50,
          formatCurrency
        ),
        createSliderConfig(
          'vacancyRate',
          'Vacancy Rate',
          assumptions.vacancyRate,
          0,
          0.20,
          0.01,
          (v) => formatPercent(v, 0)
        )
      ]
    },
    {
      id: 'expenses',
      title: 'Expense Scenarios',
      sliders: [
        createSliderConfig(
          'propertyTaxes',
          'Property Taxes (Annual)',
          assumptions.propertyTaxes,
          500,
          20000,
          100,
          formatCurrency
        ),
        createSliderConfig(
          'insurance',
          'Insurance (Annual)',
          assumptions.insurance,
          500,
          5000,
          100,
          formatCurrency
        ),
        createSliderConfig(
          'managementPct',
          'Management Fee',
          assumptions.managementPct,
          0,
          0.15,
          0.01,
          (v) => formatPercent(v, 0)
        )
      ]
    }
  ]

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h3 className="text-lg font-bold text-white mb-1">Sensitivity Analysis</h3>
        <p className="text-sm text-white/60">Adjust assumptions to see how they impact your returns</p>
      </div>
      
      {tuneGroups.map(group => (
        <TuneSection
          key={group.id}
          title={group.title}
          groups={[group]}
          onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
          defaultOpen={group.isOpen}
        />
      ))}
      
      <InsightCard
        data={createIQInsight(
          'Use these sliders to stress-test the deal under different market conditions.',
          'tip'
        )}
      />
    </div>
  )
}

export default StrategyAnalyticsContainer
