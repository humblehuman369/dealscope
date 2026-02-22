'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  StrategySelector, 
  DEFAULT_STRATEGIES,
  SubTabNav,
  getStrategyTabs,
  PropertyHero,
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
  dealScoreDataFromApi,
  FundingOverview,
  PerformanceSection,
  createMonthlyBreakdown,
  create10YearProjection,
  IQWelcomeModal,
  StrategyGrid,
  StrategyPrompt,
  ProfitZoneDashboard,
  generateProfitZoneTips,
  type ProfitZoneMetrics
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
  TargetAssumptions,
  IQTargetResult 
} from '@/lib/iqTarget'
import { useIQAnalysis } from '@/hooks/useIQAnalysis'
import { 
  calculate10YearProjections, 
  getDefaultProjectionAssumptions,
  YearlyProjection 
} from '@/lib/projections'
import { formatCurrency, formatPercent } from '@/utils/formatters'

// ============================================
// TYPES
// ============================================

// Listing status types for price display
export type ListingStatus = 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER'
export type SellerType = 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown'

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
  // Listing status fields
  listingStatus?: ListingStatus
  isOffMarket?: boolean
  sellerType?: SellerType
  isForeclosure?: boolean
  isBankOwned?: boolean
}

/**
 * Get the appropriate price label based on listing status
 */
function getPriceLabel(listingStatus?: ListingStatus, isOffMarket?: boolean): string {
  if (isOffMarket) return 'Est. Value'
  if (listingStatus === 'FOR_RENT') return 'Rental Price'
  if (listingStatus === 'FOR_SALE') return 'List Price'
  if (listingStatus === 'PENDING') return 'List Price (Pending)'
  if (listingStatus === 'SOLD') return 'Est. Value'
  return 'Est. Value' // Default for unknown/off-market
}

interface StrategyAnalyticsContainerProps {
  property: PropertyData
  onBack?: () => void
  initialStrategy?: StrategyId
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
    monthlyRent: property.monthlyRent || 0,
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

// ============================================
// MAIN COMPONENT
// ============================================

export function StrategyAnalyticsContainer({ property, onBack, initialStrategy }: StrategyAnalyticsContainerProps) {
  // Store the original list price - this never changes and is used for slider min/max
  const originalListPrice = useMemo(() => property.listPrice, [property.listPrice])
  
  // State
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | null>(initialStrategy || null)
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('metrics')
  const [compareView, setCompareView] = useState<'target' | 'list'>('target')
  const [assumptions, setAssumptions] = useState(() => createDefaultAssumptions(property))
  
  // Check sessionStorage to see if welcome modal has been shown this session
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    if (typeof window === 'undefined') return false
    const hasSeenWelcome = sessionStorage.getItem('iq-welcome-shown')
    return !hasSeenWelcome
  })
  
  // Handle closing the welcome modal and saving to sessionStorage
  const handleCloseWelcome = useCallback(() => {
    setShowWelcomeModal(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('iq-welcome-shown', 'true')
    }
  }, [])
  
  // Handle back navigation - use onBack prop to go to premium page
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      setActiveStrategy(null)
    }
  }, [onBack])
  
  // Compute IQ Target + metrics via backend (debounced)
  const {
    iqTarget,
    verdictDealScore,
    metricsAtTarget,
    metricsAtList,
    isLoading: isCalculating,
    error: calcError,
  } = useIQAnalysis(activeStrategy, assumptions)
  
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
    <div className="min-h-screen bg-gradient-to-b from-[#f0f8fa] to-[#e8f4f8] text-slate-900 dark:from-[#0b1426] dark:to-[#091020] dark:text-white">
      {/* Property Hero - Immersive Photo & Details */}
      <div className="px-4 pt-2">
        <PropertyHero
          address={property.address}
          location={`${property.city}, ${property.state} ${property.zipCode}`}
          price={property.listPrice}
          priceLabel={getPriceLabel(property.listingStatus, property.isOffMarket)}
          specs={`${property.bedrooms} bd · ${property.bathrooms} ba · ${property.sqft?.toLocaleString()} sqft`}
          photos={property.photos}
          thumbnailUrl={property.thumbnailUrl}
          photoCount={property.photoCount}
          onSave={() => console.log('Save property')}
          onShare={() => console.log('Share property')}
          // Listing status props
          listingStatus={property.listingStatus}
          isOffMarket={property.isOffMarket}
          sellerType={property.sellerType}
          isForeclosure={property.isForeclosure}
          isBankOwned={property.isBankOwned}
        />
      </div>

      {/* IQ Welcome Modal - Only shows once per session */}
      <IQWelcomeModal
        isOpen={showWelcomeModal && !activeStrategy}
        onClose={handleCloseWelcome}
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

      {/* Strategy Selected - Show Strategy Header with Back Button */}
      {activeStrategy && (
        <>
          {/* Strategy Selector - Single strategy view with back button */}
          <div className="px-4">
            <StrategySelector
              activeStrategy={activeStrategy}
              strategies={DEFAULT_STRATEGIES}
              onChange={(id) => {
                if (id === null) {
                  // Back button clicked - go to premium page
                  handleBack()
                } else {
                  setActiveStrategy(id)
                  setActiveSubTab('metrics')
                  setCompareView('target')
                }
              }}
              showCTA={false}
            />
          </div>
        </>
      )}

      {/* Strategy Content */}
      {activeStrategy && (
        <div className="px-4 pb-24">
          {/* Sub Tab Navigation - Horizontal numbered tabs */}
          <div className="mb-4">
            {/* Progress line with active indicator */}
            <div className="relative h-[3px] bg-slate-300/50 dark:bg-white/[0.08] rounded-full mb-3">
              <div 
                className="absolute top-0 h-[3px] bg-gradient-to-r from-teal to-blue-500 rounded-full transition-all duration-300"
                style={{
                  left: `${(tabs.findIndex(t => t.id === activeSubTab) / tabs.length) * 100}%`,
                  width: `${100 / tabs.length}%`,
                }}
              />
            </div>
            
            {/* Tab buttons row */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab, index) => {
                const isActive = tab.id === activeSubTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0"
                  >
                    {/* Numbered badge */}
                    <span className={`w-5 h-5 flex items-center justify-center text-[0.65rem] font-bold rounded-full transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-teal to-blue-500 text-white' 
                        : 'bg-slate-200 text-slate-500 dark:bg-white/[0.08] dark:text-white/40'
                    }`}>
                      {index + 1}
                    </span>
                    {/* Tab label */}
                    <span className={`text-[0.72rem] font-medium transition-colors ${
                      isActive 
                        ? 'text-teal font-semibold' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/70'
                    }`}>
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

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
              originalListPrice={originalListPrice}
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
              verdictDealScore={verdictDealScore}
              assumptions={assumptions}
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
              originalListPrice={originalListPrice}
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
  metricsAtTarget: Record<string, unknown> | null
  metricsAtList: Record<string, unknown> | null
  assumptions: TargetAssumptions
  compareView: 'target' | 'list'
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
  originalListPrice: number
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
  metricsAtTarget: Record<string, unknown> | null
  metricsAtList: Record<string, unknown> | null
  assumptions: TargetAssumptions
  compareView: 'target' | 'list'
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
  originalListPrice: number
}

function LTRMetricsContent({
  strategy,
  iqTarget,
  metricsAtTarget,
  metricsAtList,
  assumptions,
  compareView,
  setCompareView,
  updateAssumption,
  originalListPrice
}: LTRMetricsContentProps) {
  // Generate price ladder
  const priceLadder = generatePriceLadder(
    assumptions.listPrice,
    iqTarget.targetPrice,
    'IQ Target',
    iqTarget.highlightedMetric,
    iqTarget.incomeValue,
    'Income Value',
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
  
  // Returns data based on strategy — require all rental metrics (same as benchmarks) so we don't show returns with missing data as zeros
  const returnsData = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    if (!m) return null
    
    const raw = m as Record<string, unknown>
    const monthlyCashFlow = raw.monthly_cash_flow ?? raw.monthlyCashFlow
    const capRaw = raw.cap_rate ?? raw.capRate
    const cocRaw = raw.cash_on_cash_return ?? raw.cashOnCashReturn ?? raw.cashOnCash
    const hasAllRentalMetrics =
      monthlyCashFlow !== undefined && monthlyCashFlow !== null &&
      capRaw !== undefined && capRaw !== null &&
      cocRaw !== undefined && cocRaw !== null &&
      raw.dscr !== undefined && raw.dscr !== null
    
    switch (strategy) {
      case 'ltr':
      case 'str':
      case 'brrrr':
      case 'house_hack':
        if (hasAllRentalMetrics) {
          const capRateDecimal = typeof capRaw === 'number' && capRaw > 1 ? capRaw / 100 : Number(capRaw) || 0
          const cashOnCashDecimal = typeof cocRaw === 'number' && cocRaw > 1 ? cocRaw / 100 : Number(cocRaw) || 0
          return createLTRReturns(
            Number(monthlyCashFlow) || 0,
            cashOnCashDecimal,
            capRateDecimal,
            Number(raw.dscr) || 0
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
    
    const raw = m as Record<string, unknown>
    const capRaw = raw.cap_rate ?? raw.capRate
    const cocRaw = raw.cash_on_cash_return ?? raw.cashOnCashReturn ?? raw.cashOnCash
    const hasRentalMetrics = (capRaw !== undefined && capRaw !== null) && (cocRaw !== undefined && cocRaw !== null) && (raw.dscr !== undefined && raw.dscr !== null)
    if (!hasRentalMetrics) return []
    
    const coc = typeof cocRaw === 'number' && cocRaw > 1 ? cocRaw / 100 : Number(cocRaw) || 0
    const cap = typeof capRaw === 'number' && capRaw > 1 ? capRaw / 100 : Number(capRaw) || 0
    const dscr = Number(raw.dscr) || 0
    
    return [
      {
        id: 'coc',
        label: 'Cash-on-Cash Return',
        value: coc,
        formattedValue: formatPercent(coc * 100),
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
        formattedValue: formatPercent(cap * 100),
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
          (v: number) => formatPercent(v * 100, { decimals: 0 })
        ),
        createSliderConfig(
          'interestRate',
          'Interest Rate',
          assumptions.interestRate,
          0.04,
          0.12,
          0.001,
          (v: number) => formatPercent(v * 100)
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
          (v: number) => formatPercent(v * 100, { decimals: 0 })
        )
      ]
    }
  ], [assumptions])

  // Calculate profit zone metrics
  const profitZoneMetrics: ProfitZoneMetrics = useMemo(() => {
    const downPayment = iqTarget.targetPrice * assumptions.downPaymentPct
    const closingCosts = iqTarget.targetPrice * assumptions.closingCostsPct
    const totalCashNeeded = downPayment + closingCosts
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    
    return {
      buyPrice: iqTarget.targetPrice,
      cashNeeded: totalCashNeeded,
      monthlyCashFlow: m && 'monthlyCashFlow' in m ? (m as { monthlyCashFlow: number }).monthlyCashFlow : 0,
      cashOnCash: (m && 'cashOnCash' in m ? (m as { cashOnCash: number }).cashOnCash : 0) * 100,
      capRate: (m && 'capRate' in m ? (m as { capRate: number }).capRate : 0) * 100,
      dealScore: 72, // Placeholder - would come from deal score calculation
    }
  }, [iqTarget, assumptions, compareView, metricsAtTarget, metricsAtList])

  // Calculate projected profit (10-year estimate)
  const projectedProfit = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    const cashFlow = m && 'monthlyCashFlow' in m ? (m as { monthlyCashFlow: number }).monthlyCashFlow : 0
    const arv = assumptions.arv || iqTarget.targetPrice * 1.2
    return cashFlow * 12 * 10 + (arv - iqTarget.targetPrice)
  }, [compareView, metricsAtTarget, metricsAtList, assumptions, iqTarget])

  const profitZoneTips = useMemo(() => {
    return generateProfitZoneTips(profitZoneMetrics, projectedProfit)
  }, [profitZoneMetrics, projectedProfit])

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
        monthlyRent={assumptions.monthlyRent}
        downPaymentPct={assumptions.downPaymentPct}
        interestRate={assumptions.interestRate}
        onAssumptionsChange={(key, value) => updateAssumption(key as keyof TargetAssumptions, value)}
      />

      {/* NEW: Profit Zone Dashboard */}
      <ProfitZoneDashboard
        metrics={profitZoneMetrics}
        projectedProfit={projectedProfit}
        incomeValue={iqTarget.incomeValue}
        listPrice={assumptions.listPrice}
        tips={profitZoneTips}
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
          'Buy Price',
          assumptions.listPrice,
          originalListPrice * 0.60,  // Use original list price for stable min
          originalListPrice * 1.10,  // Use original list price for stable max (expanded range)
          1000,
          formatCurrency,
          originalListPrice  // Use original for change indicator comparison
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
          `With ${formatPercent(assumptions.downPaymentPct * 100, { decimals: 0 })} down, you'll need ${formatCurrency(downPayment + closingCosts)} cash to close.`,
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
  metrics: Record<string, unknown>
  iqTarget: IQTargetResult
  verdictDealScore: import('@/hooks/useIQAnalysis').VerdictDealScore | null
  assumptions: TargetAssumptions
}

function ScoreTabContent({ strategy, metrics, iqTarget, verdictDealScore, assumptions }: ScoreTabContentProps) {
  // Type guard for rental metrics
  const hasRentalMetrics = 'monthlyCashFlow' in metrics && 'cashOnCash' in metrics && 'capRate' in metrics && 'dscr' in metrics
  
  const scoreData = useMemo(() => {
    if (verdictDealScore) {
      return dealScoreDataFromApi({
        dealScore: verdictDealScore.dealScore,
        dealVerdict: verdictDealScore.dealVerdict,
        discountPercent: verdictDealScore.discountPercent,
        incomeValue: iqTarget.incomeValue,
        purchasePrice: iqTarget.targetPrice,
        listPrice: assumptions.listPrice,
        grade: verdictDealScore.grade,
      })
    }
    return dealScoreDataFromApi({
      dealScore: 0,
      dealVerdict: 'Loading…',
      discountPercent: 0,
      incomeValue: iqTarget.incomeValue,
      purchasePrice: iqTarget.targetPrice,
      listPrice: assumptions.listPrice,
      grade: 'C',
    })
  }, [iqTarget, verdictDealScore, assumptions])
  
  // Generate strengths and weaknesses based on opportunity score
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  // Opportunity-based insights
  const discountNeeded = scoreData.discountPercent || 0
  if (discountNeeded <= 5) {
    strengths.push('Profitable near list price')
  } else if (discountNeeded <= 10) {
    strengths.push('Achievable with typical negotiation')
  }
  
  if (hasRentalMetrics) {
    const rentalMetrics = metrics as { monthlyCashFlow: number; cashOnCash: number; dscr: number }
    if ((rentalMetrics.monthlyCashFlow || 0) >= 300) strengths.push('Strong cash flow potential')
    if ((rentalMetrics.dscr || 0) >= 1.25) strengths.push('Good debt coverage')
    
    if ((rentalMetrics.monthlyCashFlow || 0) < 0) weaknesses.push('Negative cash flow at list price')
    if ((rentalMetrics.dscr || 0) < 1.0) weaknesses.push('Income may not cover debt service')
  }
  
  // Handle flip/wholesale-specific insights
  if ('netProfit' in metrics) {
    const flipMetrics = metrics as { netProfit: number; roi: number }
    if ((flipMetrics.netProfit || 0) >= 50000) strengths.push('Strong profit potential')
    if ((flipMetrics.roi || 0) >= 0.25) strengths.push('Excellent ROI')
  }
  
  if (discountNeeded > 25) {
    weaknesses.push(`Requires ${discountNeeded.toFixed(0)}% discount - may be unrealistic`)
  } else if (discountNeeded > 15) {
    weaknesses.push(`Needs significant negotiation (${discountNeeded.toFixed(0)}% off)`)
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
          (v: number) => formatPercent(v * 100)
        ),
        createSliderConfig(
          'appreciationRate',
          'Property Appreciation',
          assumptions.appreciationRate || 0.03,
          0,
          0.08,
          0.005,
          (v: number) => formatPercent(v * 100)
        ),
        createSliderConfig(
          'expenseGrowth',
          'Expense Growth',
          assumptions.expenseGrowth || 0.02,
          0,
          0.06,
          0.005,
          (v: number) => formatPercent(v * 100)
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
          `With ${formatPercent(rentGrowth * 100)} annual rent increases and ${formatPercent(appreciationRate * 100)} appreciation, your equity could grow to ${formatCurrency(projections[9].totalEquity)} in 10 years.`,
          'success'
        )}
      />
    </div>
  )
}

interface WhatIfTabContentProps {
  assumptions: TargetAssumptions
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
  originalListPrice: number
}

function WhatIfTabContent({ assumptions, updateAssumption, originalListPrice }: WhatIfTabContentProps) {
  const tuneGroups: TuneGroup[] = [
    {
      id: 'price',
      title: 'Buy Price Scenarios',
      isOpen: true,
      sliders: [
        createSliderConfig(
          'listPrice',
          'Buy Price',
          assumptions.listPrice,
          originalListPrice * 0.60,  // Use original list price for stable min
          originalListPrice * 1.10,  // Use original list price for stable max
          1000,
          formatCurrency,
          originalListPrice  // Use original for change indicator
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
          (v: number) => formatPercent(v * 100, { decimals: 0 })
        ),
        createSliderConfig(
          'interestRate',
          'Interest Rate',
          assumptions.interestRate,
          0.04,
          0.12,
          0.001,
          (v: number) => formatPercent(v * 100)
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
          (v: number) => formatPercent(v * 100, { decimals: 0 })
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
          (v: number) => formatPercent(v * 100, { decimals: 0 })
        )
      ]
    }
  ]

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sensitivity Analysis</h3>
        <p className="text-sm text-slate-600 dark:text-white/60">Adjust assumptions to see how they impact your returns</p>
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
