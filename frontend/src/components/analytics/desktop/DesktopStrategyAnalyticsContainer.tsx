'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DesktopBottomNav } from './DesktopBottomNav'
import { DesktopPropertyMiniCard } from './DesktopPropertyMiniCard'
import { DesktopIQTargetHero } from './DesktopIQTargetHero'
import { DesktopTuneSection } from './DesktopTuneSection'
import { DesktopSpectrumBar } from './DesktopSpectrumBar'
import { 
  StrategySelector,
  DEFAULT_STRATEGIES,
  SubTabNav,
  SubTabDropdown,
  getStrategyTabs,
  PriceLadder,
  generatePriceLadder,
  ReturnsGrid,
  createLTRReturns,
  NegotiationPlan,
  generateNegotiationPlan,
  LEVERAGE_POINTS,
  CompareToggle,
  InsightCard,
  createIQInsight,
  HeroMetric,
  DealScoreDisplay,
  dealScoreDataFromApi,
  FundingOverview,
  PerformanceSection,
  create10YearProjection,
  IQWelcomeModal,
  StrategyGrid,
  StrategyPrompt,
  createSliderConfig,
  formatters
} from '../index'
import {
  STRMetricsContent,
  BRRRRMetricsContent,
  FlipMetricsContent,
  HouseHackMetricsContent,
  WholesaleMetricsContent
} from '../StrategyMetricsContent'
import { StrategyId, SubTabId, BenchmarkConfig, TuneGroup } from '../types'
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

// Import desktop styles
import './desktop-analytics.css'
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

interface DesktopStrategyAnalyticsContainerProps {
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
// MAIN DESKTOP COMPONENT
// ============================================

export function DesktopStrategyAnalyticsContainer({ 
  property, 
  onBack,
  initialStrategy 
}: DesktopStrategyAnalyticsContainerProps) {
  const router = useRouter()
  
  // Store the original list price - this never changes and is used for slider min/max
  const originalListPrice = useMemo(() => property.listPrice, [property.listPrice])
  
  // State
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | null>(initialStrategy || null)
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('metrics')
  const [compareView, setCompareView] = useState<'target' | 'list'>('target')
  const [assumptions, setAssumptions] = useState(() => createDefaultAssumptions(property))
  const [isSaved, setIsSaved] = useState(false)
  const [showLOI, setShowLOI] = useState(false)
  
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

  // Action handlers
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const handleGenerateLOI = () => {
    setShowLOI(true)
    setTimeout(() => setShowLOI(false), 2000)
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'DealGapIQ Analysis',
        text: `Check out this property analysis for ${property.address}`,
        url: window.location.href
      })
    }
  }

  return (
    <div className="desktop-analytics-container">
      {/* Note: Using main app Header from layout instead of DesktopHeader to avoid double header */}
      
      {/* Main Content */}
      <main className="desktop-app-content">
        {/* Property Mini Card */}
        <DesktopPropertyMiniCard
          address={property.address}
          location={`${property.city}, ${property.state} ${property.zipCode}`}
          price={property.listPrice}
          priceLabel={getPriceLabel(property.listingStatus, property.isOffMarket)}
          specs={`${property.bedrooms} bd · ${property.bathrooms} ba · ${property.sqft?.toLocaleString()} sqft`}
          thumbnailUrl={property.thumbnailUrl}
          photos={property.photos}
          photoCount={property.photoCount}
          onExpand={handleBack}
          showExpandButton={!!onBack}
          // Listing status props
          listingStatus={property.listingStatus}
          isOffMarket={property.isOffMarket}
          sellerType={property.sellerType}
          isForeclosure={property.isForeclosure}
        />

        {/* IQ Welcome Modal - Only shows once per session */}
        <IQWelcomeModal
          isOpen={showWelcomeModal && !activeStrategy}
          onClose={handleCloseWelcome}
        />

        {/* Landing State - No Strategy Selected */}
        {!activeStrategy && !showWelcomeModal && (
          <div className="space-y-6">
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
            {/* Strategy Selector Pills - With Clear Section Border */}
            <div className="desktop-strategy-selector-section">
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

            {/* Sub Tab Navigation - Dropdown tied to strategy */}
            <SubTabDropdown
              tabs={tabs}
              activeTab={activeSubTab}
              onChange={setActiveSubTab}
              strategy={DEFAULT_STRATEGIES.find(s => s.id === activeStrategy)}
            />

            {/* Tab Content */}
            <div className="space-y-4">
              {activeSubTab === 'metrics' && iqTarget && currentMetrics && (
                <DesktopStrategySpecificMetrics
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
                <DesktopFundingTabContent
                  purchasePrice={currentPrice}
                  assumptions={assumptions}
                />
              )}

              {activeSubTab === '10year' && projections && iqTarget && (
                <DesktopProjectionsTabContent
                  projections={projections}
                  iqTarget={iqTarget}
                  assumptions={assumptions}
                />
              )}

              {activeSubTab === 'score' && currentMetrics && iqTarget && (
                <DesktopScoreTabContent
                  strategy={activeStrategy}
                  metrics={currentMetrics}
                  iqTarget={iqTarget}
                  verdictDealScore={verdictDealScore}
                  assumptions={assumptions}
                />
              )}

              {activeSubTab === 'growth' && projections && iqTarget && (
                <DesktopGrowthTabContent
                  projections={projections}
                  iqTarget={iqTarget}
                  assumptions={assumptions}
                  updateAssumption={updateAssumption}
                />
              )}

              {activeSubTab === 'whatif' && (
                <DesktopWhatIfTabContent
                  assumptions={assumptions}
                  updateAssumption={updateAssumption}
                  originalListPrice={originalListPrice}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Desktop Bottom Navigation */}
      <DesktopBottomNav
        onSave={handleSave}
        onShare={handleShare}
        onGenerateLOI={handleGenerateLOI}
        isSaved={isSaved}
        isLoading={showLOI}
      />

      {/* LOI Loading Overlay */}
      {showLOI && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0d1e38] border border-teal/30 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-900 dark:text-white font-semibold">Generating LOI...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// DESKTOP STRATEGY-SPECIFIC METRICS
// ============================================

interface DesktopStrategySpecificMetricsProps {
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

function DesktopStrategySpecificMetrics(props: DesktopStrategySpecificMetricsProps) {
  const { strategy, iqTarget, metricsAtTarget, metricsAtList, assumptions, compareView, setCompareView, updateAssumption, originalListPrice } = props
  
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
  
  // Returns data based on strategy
  const returnsData = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    if (!m) return null
    
    const hasRentalMetrics = 'monthlyCashFlow' in m
    
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
  }, [strategy, compareView, metricsAtTarget, metricsAtList])
  
  // Benchmarks
  const benchmarks: BenchmarkConfig[] = useMemo(() => {
    const m = compareView === 'target' ? metricsAtTarget : metricsAtList
    if (!m) return []
    
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

  return (
    <div className="space-y-5">
      {/* IQ Target Hero - Desktop Enhanced */}
      <DesktopIQTargetHero
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

      {/* Performance Benchmarks with Desktop Spectrum Bars */}
      <div className="desktop-benchmarks-section">
        <div className="desktop-benchmarks-header">
          <div>
            <div className="desktop-benchmarks-title">Performance Benchmarks</div>
            <div className="desktop-benchmarks-subtitle">How this deal compares to national averages</div>
          </div>
        </div>
        
        {benchmarks.map((benchmark) => (
          <div key={benchmark.id} className="desktop-benchmark-row">
            <div className="desktop-benchmark-header">
              <span className="desktop-benchmark-label">{benchmark.label}</span>
              <div className="desktop-benchmark-value-group">
                <span className="desktop-benchmark-value">{benchmark.formattedValue}</span>
                <span className={`desktop-benchmark-status ${benchmark.status}`}>
                  {benchmark.status === 'high' ? 'High' : benchmark.status === 'average' ? 'Avg' : 'Low'}
                </span>
              </div>
            </div>
            <DesktopSpectrumBar
              markerPosition={benchmark.markerPosition}
              status={benchmark.status}
              zones={benchmark.zones}
            />
          </div>
        ))}
      </div>

      {/* Negotiation Plan */}
      <NegotiationPlan data={negotiationPlan} />

      {/* Tune the Deal - Desktop Enhanced */}
      <DesktopTuneSection
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

// ============================================
// DESKTOP TAB CONTENT COMPONENTS
// ============================================

interface DesktopFundingTabContentProps {
  purchasePrice: number
  assumptions: TargetAssumptions
}

function DesktopFundingTabContent({ purchasePrice, assumptions }: DesktopFundingTabContentProps) {
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

interface DesktopProjectionsTabContentProps {
  projections: YearlyProjection[]
  iqTarget: IQTargetResult
  assumptions: TargetAssumptions
}

function DesktopProjectionsTabContent({ projections, iqTarget, assumptions }: DesktopProjectionsTabContentProps) {
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

interface DesktopScoreTabContentProps {
  strategy: StrategyId
  metrics: Record<string, unknown>
  iqTarget: IQTargetResult
  verdictDealScore: import('@/hooks/useIQAnalysis').VerdictDealScore | null
  assumptions: TargetAssumptions
}

function DesktopScoreTabContent({ strategy, metrics, iqTarget, verdictDealScore, assumptions }: DesktopScoreTabContentProps) {
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
  
  if (discountNeeded > 25) {
    weaknesses.push(`Requires ${discountNeeded.toFixed(0)}% discount - may be unrealistic`)
  } else if (discountNeeded > 15) {
    weaknesses.push(`Needs significant negotiation (${discountNeeded.toFixed(0)}% off)`)
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

interface DesktopGrowthTabContentProps {
  projections: YearlyProjection[]
  iqTarget: IQTargetResult
  assumptions: TargetAssumptions
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
}

function DesktopGrowthTabContent({ projections, iqTarget, assumptions, updateAssumption }: DesktopGrowthTabContentProps) {
  const year5 = projections[4]
  const downPayment = iqTarget.targetPrice * assumptions.downPaymentPct
  
  const growthSliders: TuneGroup[] = [
    {
      id: 'growth',
      title: 'Growth Assumptions',
      isOpen: true,
      sliders: [
        createSliderConfig('rentGrowth', 'Annual Rent Increase', assumptions.rentGrowth || 0.03, 0, 0.08, 0.005, (v: number) => formatPercent(v * 100)),
        createSliderConfig('appreciationRate', 'Property Appreciation', assumptions.appreciationRate || 0.03, 0, 0.08, 0.005, (v: number) => formatPercent(v * 100)),
        createSliderConfig('expenseGrowth', 'Expense Growth', assumptions.expenseGrowth || 0.02, 0, 0.06, 0.005, (v: number) => formatPercent(v * 100))
      ]
    }
  ]
  
  return (
    <div className="space-y-4">
      <DesktopTuneSection
        title="Growth Assumptions"
        groups={growthSliders}
        onSliderChange={(id, value) => updateAssumption(id as keyof TargetAssumptions, value)}
        defaultOpen={true}
      />
      
      <HeroMetric
        data={{
          label: '10-Year Equity Growth',
          value: formatCurrency(projections[9].totalEquity),
          subtitle: `Starting equity: ${formatCurrency(downPayment)}`,
          badge: `${Math.round((projections[9].totalEquity / downPayment) * 100 - 100)}% Growth`,
          variant: 'success'
        }}
      />
    </div>
  )
}

interface DesktopWhatIfTabContentProps {
  assumptions: TargetAssumptions
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void
  originalListPrice: number
}

function DesktopWhatIfTabContent({ assumptions, updateAssumption, originalListPrice }: DesktopWhatIfTabContentProps) {
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
        createSliderConfig('downPaymentPct', 'Down Payment', assumptions.downPaymentPct, 0.05, 0.50, 0.01, (v: number) => formatPercent(v * 100, { decimals: 0 })),
        createSliderConfig('interestRate', 'Interest Rate', assumptions.interestRate, 0.04, 0.12, 0.001, (v: number) => formatPercent(v * 100)),
        createSliderConfig('loanTermYears', 'Loan Term', assumptions.loanTermYears, 15, 30, 5, (v) => `${v} years`)
      ]
    },
    {
      id: 'income',
      title: 'Income Scenarios',
      sliders: [
        createSliderConfig('monthlyRent', 'Monthly Rent', assumptions.monthlyRent, 500, 10000, 50, formatCurrency),
        createSliderConfig('vacancyRate', 'Vacancy Rate', assumptions.vacancyRate, 0, 0.20, 0.01, (v: number) => formatPercent(v * 100, { decimals: 0 }))
      ]
    }
  ]

  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <h3 className="text-xl font-bold text-white mb-2">Sensitivity Analysis</h3>
        <p className="text-white/60">Adjust assumptions to see how they impact your returns</p>
      </div>
      
      {tuneGroups.map(group => (
        <DesktopTuneSection
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

export default DesktopStrategyAnalyticsContainer
