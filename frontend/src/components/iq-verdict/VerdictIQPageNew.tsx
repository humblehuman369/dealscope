'use client'

/**
 * VerdictIQPageNew Component
 * 
 * Fresh layout for VerdictIQ page incorporating best visual patterns:
 * - Clean nav tabs header
 * - Property dropdown with 2x3 grid
 * - Centered stacked score hero with quick stats
 * - Investment analysis with price cards + metrics
 * - 3-column financial breakdown
 * - Performance metrics table
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileSpreadsheet, Loader2 } from 'lucide-react'

// Components
import { CompactHeader, PropertyData } from '../layout/CompactHeader'
import { VerdictScoreHero } from './VerdictScoreHero'
import { PropertyInfoDropdown } from './PropertyInfoDropdown'
import { InvestmentAnalysisNew } from './InvestmentAnalysisNew'
import { FinancialBreakdownColumns } from './FinancialBreakdownColumns'
import { PerformanceMetricsTable, generateDefaultMetrics } from './PerformanceMetricsTable'
import { ScoreMethodologySheet } from './ScoreMethodologySheet'
import { DealMakerPopup, DealMakerValues, PopupStrategyType } from '../deal-maker/DealMakerPopup'
import { PriceTarget } from '@/lib/priceUtils'

// Types
import { IQProperty, IQAnalysisResult, formatPrice } from './types'

// =============================================================================
// PROPS
// =============================================================================

interface VerdictIQPageNewProps {
  property: IQProperty
  analysis: IQAnalysisResult
  onNavigateToDealMaker?: () => void
  savedPropertyId?: string
}

// Strategy mapping
function getPopupStrategyType(headerStrategy: string): PopupStrategyType {
  switch (headerStrategy) {
    case 'Short-term': return 'str'
    case 'BRRRR': return 'brrrr'
    case 'Fix & Flip': return 'flip'
    case 'House Hack': return 'house_hack'
    case 'Wholesale': return 'wholesale'
    default: return 'ltr'
  }
}

// Get verdict label from score
// Unified rating system across all VerdictIQ pages
function getVerdictLabel(score: number): { label: string; subtitle: string } {
  if (score >= 90) return { label: 'Strong', subtitle: 'Deal Gap easily achievable' }
  if (score >= 80) return { label: 'Good', subtitle: 'Deal Gap likely achievable' }
  if (score >= 65) return { label: 'Average', subtitle: 'Negotiation required' }
  if (score >= 50) return { label: 'Marginal', subtitle: 'Aggressive discount needed' }
  if (score >= 30) return { label: 'Unlikely', subtitle: 'Deal Gap probably too large' }
  return { label: 'Pass', subtitle: 'Not a viable investment' }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VerdictIQPageNew({
  property,
  analysis,
  onNavigateToDealMaker,
  savedPropertyId,
}: VerdictIQPageNewProps) {
  const router = useRouter()
  const [showMethodology, setShowMethodology] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState('Long-term')
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [overrideValues, setOverrideValues] = useState<Partial<DealMakerValues> | null>(null)
  const [activePriceTarget, setActivePriceTarget] = useState<PriceTarget>('targetBuy')

  // Handle price target change from popup
  const handlePriceTargetChange = useCallback((target: PriceTarget) => {
    setActivePriceTarget(target)
  }, [])

  // Defaults for financing/operating
  const defaults = useMemo(() => ({
    financing: {
      down_payment_pct: 0.20,
      interest_rate: 0.06,
      loan_term_years: 30,
      closing_costs_pct: 0.03,
    },
    operating: {
      vacancy_rate: 0.05,
      maintenance_pct: 0.05,
      property_management_pct: 0.00,
    },
  }), [])

  // Pricing: prefer backend API values (analysis) for income value and target buy; local math only for display breakdown when API missing.
  const pricing = useMemo(() => {
    const buyPrice = overrideValues?.buyPrice ?? analysis.purchasePrice ?? property.price * 0.9
    const monthlyRent = overrideValues?.monthlyRent ?? property.monthlyRent ?? property.price * 0.007
    const annualRent = monthlyRent * 12
    const vacancyRate = (overrideValues?.vacancyRate ?? 5) / 100
    const effectiveIncome = annualRent * (1 - vacancyRate)

    const propertyTaxes = overrideValues?.propertyTaxes ?? property.propertyTaxes ?? buyPrice * 0.012
    const insurance = overrideValues?.insurance ?? property.insurance ?? buyPrice * 0.01
    const maintenance = annualRent * defaults.operating.maintenance_pct
    const management = annualRent * defaults.operating.property_management_pct

    const totalExpenses = propertyTaxes + insurance + maintenance + management
    const noi = effectiveIncome - totalExpenses

    // Mortgage calculation (for display breakdown only; key prices from API when available)
    const downPaymentPct = (overrideValues?.downPayment ?? 20) / 100
    const interestRate = (overrideValues?.interestRate ?? 6) / 100
    const loanTermYears = overrideValues?.loanTerm ?? 30
    const downPayment = buyPrice * downPaymentPct
    const loanAmount = buyPrice - downPayment

    const monthlyRate = interestRate / 12
    const numPayments = loanTermYears * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12

    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = annualCashFlow / 12

    const closingCosts = buyPrice * defaults.financing.closing_costs_pct
    const cashNeeded = downPayment + closingCosts

    const capRate = buyPrice > 0 ? (noi / buyPrice) * 100 : 0
    const cashOnCash = cashNeeded > 0 ? (annualCashFlow / cashNeeded) * 100 : 0
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
    const grm = monthlyRent > 0 ? buyPrice / (monthlyRent * 12) : 0

    // Income value and target buy: from backend when available (single source of truth)
    const targetBuyFromApi = analysis.purchasePrice
    const mortgageConstant = loanAmount > 0
      ? ((monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)) * 12 * (1 - downPaymentPct)
      : 0
    const incomeValueLocal = mortgageConstant > 0 ? Math.round(noi / mortgageConstant) : buyPrice * 1.1
    const incomeValue = analysis.incomeValue != null && analysis.incomeValue > 0 ? analysis.incomeValue : incomeValueLocal
    const targetBuyPrice = targetBuyFromApi != null && targetBuyFromApi > 0 ? targetBuyFromApi : Math.round(incomeValue * 0.95)

    // Wholesale price: backend verdict does not yet expose MAO on the price ladder; use backend when added, until then display-only fallback
    const wholesalePrice = Math.round(incomeValue * 0.70)

    return {
      buyPrice,
      incomeValue,
      targetBuyPrice,
      wholesalePrice,
      monthlyRent,
      annualRent,
      vacancyAmount: annualRent * vacancyRate / 12,
      effectiveIncome: effectiveIncome / 12,
      propertyTaxes,
      insurance,
      maintenance,
      management,
      totalExpenses,
      noi,
      annualDebtService,
      monthlyCashFlow,
      annualCashFlow,
      cashNeeded,
      downPayment,
      downPaymentPct: downPaymentPct * 100,
      loanAmount,
      interestRate: interestRate * 100,
      loanTermYears,
      capRate,
      cashOnCash,
      dscr,
      grm,
    }
  }, [property, analysis, defaults, overrideValues])

  // Calculate deal gap
  const marketValue = property.zestimate || property.price
  const dealGap = marketValue > 0 
    ? ((marketValue - pricing.incomeValue) / marketValue) * 100 
    : 0

  // Verdict info
  const verdictInfo = getVerdictLabel(analysis.dealScore)

  // Generate performance metrics
  const performanceMetrics = useMemo(() => generateDefaultMetrics({
    monthlyCashFlow: pricing.monthlyCashFlow,
    cashRequired: pricing.cashNeeded,
    capRate: pricing.capRate,
    cashOnCash: pricing.cashOnCash,
    dscr: pricing.dscr,
    grm: pricing.grm,
  }), [pricing])

  // Header property data
  const headerPropertyData: PropertyData = useMemo(() => ({
    address: property.address,
    city: property.city || '',
    state: property.state || '',
    zip: property.zip || '',
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft || 0,
    price: property.price,
    rent: property.monthlyRent || Math.round(property.price * 0.007),
    status: property.listingStatus || 'OFF-MARKET',
    image: property.imageUrl,
    zpid: property.zpid?.toString(),
  }), [property])

  // Handlers
  const handleStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy)
  }, [])

  const handleOpenDealMaker = useCallback(() => {
    setShowDealMakerPopup(true)
  }, [])

  const handleApplyDealMakerValues = useCallback((values: DealMakerValues) => {
    setOverrideValues(values)
    setShowDealMakerPopup(false)
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    // TODO: Implement export
    setTimeout(() => setIsExporting(false), 1000)
  }, [])

  return (
    <div 
      className="min-h-screen flex flex-col max-w-[640px] mx-auto"
      style={{ 
        background: '#F1F5F9',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Compact Header with Nav Tabs */}
      <CompactHeader
        property={headerPropertyData}
        activeNav="analysis"
        currentStrategy={currentStrategy}
        pageTitle="VERDICT"
        pageTitleAccent="IQ"
        onStrategyChange={handleStrategyChange}
        defaultPropertyOpen={false}
        savedPropertyId={savedPropertyId}
      />

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-36">
        {/* Property Info Dropdown - NEW */}
        <PropertyInfoDropdown
          address={property.address}
          city={property.city || ''}
          state={property.state || ''}
          zip={property.zip || ''}
          beds={property.beds}
          baths={property.baths}
          sqft={property.sqft || 0}
          estimatedValue={property.price}
          estimatedRent={property.monthlyRent || Math.round(property.price * 0.007)}
          status={property.listingStatus || 'OFF-MARKET'}
          imageUrl={property.imageUrl}
          defaultOpen={true}
        />

        {/* Score Hero - NEW Centered Stacked Layout */}
        <VerdictScoreHero
          score={analysis.dealScore}
          verdictLabel={verdictInfo.label}
          verdictSubtitle={verdictInfo.subtitle}
          dealGap={dealGap}
          sellerUrgency={analysis.opportunityFactors?.motivationLabel || 'Medium'}
          sellerUrgencyScore={analysis.opportunityFactors?.motivation || 50}
          marketTemp="Warm"
          vacancy={5}
          confidenceMetrics={{
            dealProbability: Math.min(100, analysis.dealScore + 10),
            marketAlignment: Math.min(100, Math.max(0, 100 - Math.abs(dealGap) * 3)),
            priceConfidence: 82,
          }}
          onShowMethodology={() => setShowMethodology(true)}
        />

        {/* Investment Analysis - NEW with Metrics */}
        <InvestmentAnalysisNew
          downPaymentPct={pricing.downPaymentPct}
          interestRate={pricing.interestRate}
          incomeValue={pricing.incomeValue}
          targetBuyPrice={pricing.targetBuyPrice}
          wholesalePrice={pricing.wholesalePrice}
          capRate={pricing.capRate}
          cashOnCash={pricing.cashOnCash}
          dscr={pricing.dscr}
          monthlyCashFlow={pricing.monthlyCashFlow}
          annualNoi={pricing.noi}
          cashNeeded={pricing.cashNeeded}
          currentStrategy={currentStrategy}
          onStrategyChange={handleStrategyChange}
          onChangeTerms={handleOpenDealMaker}
        />

        {/* Financial Breakdown - NEW 3-Column Layout */}
        <FinancialBreakdownColumns
          targetBuyPrice={pricing.buyPrice}
          downPayment={pricing.downPayment}
          downPaymentPct={pricing.downPaymentPct}
          loanAmount={pricing.loanAmount}
          interestRate={pricing.interestRate}
          loanTermYears={pricing.loanTermYears}
          monthlyRent={pricing.monthlyRent}
          vacancyRate={(overrideValues?.vacancyRate ?? 5)}
          vacancyAmount={pricing.vacancyAmount}
          effectiveIncome={pricing.effectiveIncome}
          propertyTaxes={pricing.propertyTaxes}
          insurance={pricing.insurance}
          repairsCapex={pricing.maintenance}
          management={pricing.management}
          totalExpenses={pricing.totalExpenses}
          onAdjustPurchase={handleOpenDealMaker}
          onAdjustIncome={handleOpenDealMaker}
          onAdjustExpenses={handleOpenDealMaker}
        />

        {/* Performance Metrics - NEW Table Format */}
        <PerformanceMetricsTable metrics={performanceMetrics} />
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] bg-white border-t border-[#E2E8F0] p-4 px-5">
        <button 
          className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white py-4 rounded-xl text-[15px] font-semibold cursor-pointer border-none mb-3 hover:bg-[#0E7490] active:scale-[0.98] transition-all"
          onClick={handleOpenDealMaker}
        >
          Go to DealMakerIQ
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>
        
        <button 
          className="w-full flex items-center justify-center gap-2 bg-transparent text-[#64748B] py-3 text-[13px] font-medium cursor-pointer border-none hover:text-[#0A1628] transition-colors disabled:opacity-50"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              Export Analysis
            </>
          )}
        </button>
      </div>

      {/* Score Methodology Sheet */}
      <ScoreMethodologySheet
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        currentScore={analysis.dealScore}
        scoreType="verdict"
      />

      {/* DealMaker Popup */}
      <DealMakerPopup
        isOpen={showDealMakerPopup}
        onClose={() => setShowDealMakerPopup(false)}
        onApply={handleApplyDealMakerValues}
        strategyType={getPopupStrategyType(currentStrategy)}
        onStrategyChange={(s) => {
          const map: Record<PopupStrategyType, string> = {
            ltr: 'Long-term', str: 'Short-term', brrrr: 'BRRRR',
            flip: 'Fix & Flip', house_hack: 'House Hack', wholesale: 'Wholesale',
          }
          setCurrentStrategy(map[s])
        }}
        activePriceTarget={activePriceTarget}
        onPriceTargetChange={handlePriceTargetChange}
        initialValues={{
          buyPrice: pricing.buyPrice,
          downPayment: pricing.downPaymentPct,
          closingCosts: 3,
          interestRate: pricing.interestRate,
          loanTerm: pricing.loanTermYears,
          rehabBudget: 0,
          arv: property.arv ?? pricing.buyPrice * 1.15,
          propertyTaxes: pricing.propertyTaxes,
          insurance: pricing.insurance,
          monthlyRent: pricing.monthlyRent,
          vacancyRate: 5,
          managementRate: 0,
          // STR defaults
          averageDailyRate: 200,
          occupancyRate: 65,
          cleaningFeeRevenue: 150,
          avgLengthOfStayDays: 3,
          platformFeeRate: 15,
          strManagementRate: 20,
          cleaningCostPerTurnover: 100,
          suppliesMonthly: 150,
          additionalUtilitiesMonthly: 200,
          furnitureSetupCost: 6000,
          // BRRRR defaults
          buyDiscountPct: 15,
          hardMoneyRate: 12,
          holdingPeriodMonths: 6,
          holdingCostsMonthly: 1500,
          postRehabMonthlyRent: pricing.monthlyRent,
          refinanceLtv: 75,
          refinanceInterestRate: 6.5,
          refinanceTermYears: 30,
          refinanceClosingCostsPct: 2,
          contingencyPct: 10,
          maintenanceRate: 5,
          monthlyHoa: 0,
          // Flip defaults
          financingType: 'hardMoney',
          hardMoneyLtv: 90,
          loanPoints: 2,
          rehabTimeMonths: 4,
          daysOnMarket: 45,
          sellingCostsPct: 8,
          capitalGainsRate: 25,
          // House Hack defaults
          totalUnits: 4,
          ownerOccupiedUnits: 1,
          ownerUnitMarketRent: 1500,
          loanType: 'fha',
          pmiRate: 0.85,
          avgRentPerUnit: 1500,
          currentHousingPayment: 2000,
          utilitiesMonthly: 200,
          capexRate: 5,
          // Wholesale defaults
          estimatedRepairs: 40000,
          squareFootage: property.sqft ?? 1500,
          contractPrice: pricing.buyPrice * 0.85,
          earnestMoney: 1000,
          inspectionPeriodDays: 14,
          daysToClose: 45,
          assignmentFee: 15000,
          marketingCosts: 500,
          wholesaleClosingCosts: 500,
        }}
      />
    </div>
  )
}

export default VerdictIQPageNew
