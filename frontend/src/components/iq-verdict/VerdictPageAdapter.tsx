'use client'

/**
 * VerdictPageAdapter - Connects existing data to VerdictPageFresh
 * 
 * This adapter transforms the IQProperty and IQAnalysisResult types
 * used by the /verdict route into the VerdictPageFresh prop format.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { VerdictPageFresh } from './VerdictPageFresh'
import { type PriceCardVariant } from './verdict-design-tokens'
import { type IQProperty, type IQAnalysisResult } from './types'
import { DealMakerPopup, DealMakerValues, PopupStrategyType } from '../deal-maker/DealMakerPopup'
import { PriceTarget } from '@/lib/priceUtils'
import api from '@/lib/api'

// Re-export types for convenience
export type { IQProperty, IQAnalysisResult }

interface VerdictPageAdapterProps {
  property: IQProperty
  analysis: IQAnalysisResult
  // Action callbacks
  onDealMakerClick?: () => void
  onShowMethodology?: () => void
  // Note: Header and navigation callbacks are now handled by global AppHeader
}

// Helper to get verdict label from score
// Unified rating system across all VerdictIQ pages
function getVerdictLabel(score: number): string {
  if (score >= 90) return 'Strong'
  if (score >= 80) return 'Good'
  if (score >= 65) return 'Average'
  if (score >= 50) return 'Marginal'
  if (score >= 30) return 'Unlikely'
  return 'Pass'
}

// Helper to get verdict subtitle
// Unified rating system across all VerdictIQ pages
function getVerdictSubtitle(score: number, discountPercent: number): string {
  if (score >= 90) return 'Deal Gap easily achievable'
  if (score >= 80) return 'Deal Gap likely achievable'
  if (score >= 65) return 'Negotiation required'
  if (score >= 50) return 'Aggressive discount needed'
  if (score >= 30) return 'Deal Gap probably too large'
  return 'Not a viable investment'
}

export function VerdictPageAdapter({
  property,
  analysis,
  onDealMakerClick,
  onShowMethodology,
}: VerdictPageAdapterProps) {
  const [selectedPriceCard, setSelectedPriceCard] = useState<PriceCardVariant>('target')
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<PopupStrategyType>('ltr')
  const [activePriceTarget, setActivePriceTarget] = useState<PriceTarget>('targetBuy')

  // Override values applied from DealMaker popup — drives recalculation
  const [overrideValues, setOverrideValues] = useState<Partial<DealMakerValues> | null>(null)

  // Handle strategy change from popup
  const handleStrategyChange = useCallback((strategy: PopupStrategyType) => {
    setCurrentStrategy(strategy)
  }, [])

  // Handle price target change from popup
  const handlePriceTargetChange = useCallback((target: PriceTarget) => {
    setActivePriceTarget(target)
  }, [])

  // Handle opening the DealMaker popup for editing terms
  const handleOpenTermsPopup = useCallback(() => {
    setShowDealMakerPopup(true)
  }, [])

  // Handle export to Excel
  const handleExport = useCallback(async () => {
    // Use property.id or zpid as fallback (convert to string)
    const propertyIdToUse = String(property.id || property.zpid || '')
    if (!propertyIdToUse) {
      console.error('Property ID not found for export')
      return
    }

    setIsExporting(true)

    try {
      // Build full address for property lookup
      const fullAddress = [property.address, property.city, property.state, property.zip]
        .filter(Boolean)
        .join(', ')
      
      // Download Excel proforma
      const blob = await api.proforma.downloadExcel({
        propertyId: propertyIdToUse,
        address: fullAddress,
        strategy: 'ltr', // Default to long-term rental
        holdPeriodYears: 10,
      })
      const filename = `Proforma_${property.address?.replace(/\s+/g, '_').slice(0, 30)}_LTR.xlsx`

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [property])

  // Handle applying values from DealMaker popup — persists overrides
  const handleApplyDealMakerValues = useCallback((values: DealMakerValues) => {
    setOverrideValues(values)
    setShowDealMakerPopup(false)
  }, [])

  // --- Effective values: override > analysis > property fallback ---
  // DealMakerValues stores percentages as whole numbers (20 = 20%)
  const effectiveBuyPrice = overrideValues?.buyPrice ?? analysis.purchasePrice ?? Math.round(property.price * 0.95)
  const effectiveDownPaymentPct = (overrideValues?.downPayment ?? 20) / 100
  const effectiveClosingCostsPct = (overrideValues?.closingCosts ?? 3) / 100
  const effectiveInterestRate = (overrideValues?.interestRate ?? 6) / 100
  const effectiveLoanTerm = overrideValues?.loanTerm ?? 30
  const effectiveRent = overrideValues?.monthlyRent ?? property.monthlyRent ?? 0
  const effectiveVacancyRate = (overrideValues?.vacancyRate ?? 5) / 100
  const effectiveManagementPct = (overrideValues?.managementRate ?? 8) / 100
  const effectiveTaxes = overrideValues?.propertyTaxes ?? property.propertyTaxes ?? Math.round(property.price * 0.012)
  const effectiveInsurance = overrideValues?.insurance ?? property.insurance ?? Math.round(property.price * 0.01)

  // Calculate wholesale price (typically 70% of ARV or list price)
  const wholesalePrice = useMemo(() => {
    const basePrice = analysis.listPrice || property.price
    return Math.round(basePrice * 0.70)
  }, [analysis.listPrice, property.price])

  // Transform property data
  const propertySummary = useMemo(() => ({
    address: property.address,
    city: property.city || 'Unknown',
    state: property.state || 'XX',
    zip: property.zip || '00000',
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    price: property.price,
    monthlyRent: property.monthlyRent || 0,
    listingStatus: (property.listingStatus || 'OFF_MARKET') as 'FOR_SALE' | 'PENDING' | 'OFF_MARKET',
    zpid: property.zpid,
  }), [property])

  // Quick stats from analysis
  const quickStats = useMemo(() => ({
    dealGap: analysis.discountPercent || 0,
    sellerUrgency: analysis.opportunityFactors?.motivationLabel || 'Medium',
    sellerUrgencyScore: analysis.opportunityFactors?.motivation || 62,
    marketTemp: analysis.opportunityFactors?.buyerMarket || 'Warm',
    vacancy: 5, // Default estimate (as number, not string)
  }), [analysis])

  // Confidence metrics (derived from analysis factors)
  const confidenceMetrics = useMemo(() => ({
    dealProbability: Math.min(100, Math.max(0, 100 - Math.abs(analysis.discountPercent || 0) * 2)),
    marketAlignment: analysis.returnFactors?.capRate 
      ? Math.min(100, (analysis.returnFactors.capRate / 0.08) * 100) 
      : 65,
    priceConfidence: analysis.dealScore >= 65 ? 82 : 65,
  }), [analysis])

  // Price cards with fallbacks — override buy price feeds through
  const incomeValue = analysis.incomeValue || property.price
  const purchasePrice = effectiveBuyPrice
  const listPrice = analysis.listPrice || property.price

  const priceCards = useMemo(() => [
    {
      label: 'Income Value',
      value: incomeValue,
      variant: 'breakeven' as PriceCardVariant,
    },
    {
      label: 'Target Buy',
      value: purchasePrice,
      variant: 'target' as PriceCardVariant,
    },
    {
      label: 'Wholesale',
      value: wholesalePrice,
      variant: 'wholesale' as PriceCardVariant,
    },
  ], [incomeValue, purchasePrice, wholesalePrice])

  // Key metrics based on selected price card — uses effective override values
  const keyMetrics = useMemo(() => {
    const selectedPrice = selectedPriceCard === 'breakeven' 
      ? incomeValue 
      : selectedPriceCard === 'target' 
        ? purchasePrice 
        : wholesalePrice

    const annualRent = effectiveRent * 12
    const expenses = effectiveTaxes + effectiveInsurance + (annualRent * effectiveManagementPct)
    const noi = annualRent - expenses
    const capRate = selectedPrice > 0 ? (noi / selectedPrice) * 100 : 0

    // Cash-on-cash uses effective financing terms
    const downPayment = selectedPrice * effectiveDownPaymentPct
    const loanAmount = selectedPrice - downPayment
    const monthlyRate = effectiveInterestRate / 12
    const numPayments = effectiveLoanTerm * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12
    const cashOnCash = downPayment > 0 ? ((noi - annualDebtService) / downPayment) * 100 : 0

    if (selectedPriceCard === 'wholesale') {
      const assignmentFee = Math.round((property.price || 0) * 0.10)
      return [
        { value: `${capRate.toFixed(1)}%`, label: 'Cap Rate' },
        { value: `${Math.max(0, cashOnCash).toFixed(1)}%`, label: 'Cash-on-Cash' },
        { value: `$${assignmentFee.toLocaleString()}`, label: 'Assignment Fee' },
      ]
    }

    return [
      { value: `${capRate.toFixed(1)}%`, label: 'Cap Rate' },
      { value: `${Math.max(0, cashOnCash).toFixed(1)}%`, label: 'Cash-on-Cash' },
      { value: `$${Math.round(effectiveRent).toLocaleString()}`, label: 'Monthly Rent' },
    ]
  }, [selectedPriceCard, incomeValue, purchasePrice, wholesalePrice, property.price,
      effectiveRent, effectiveTaxes, effectiveInsurance, effectiveManagementPct,
      effectiveDownPaymentPct, effectiveInterestRate, effectiveLoanTerm])

  // Financial breakdown columns — recalculates when overrides are applied
  const financialBreakdown = useMemo(() => {
    const downPayment = purchasePrice * effectiveDownPaymentPct
    const closingCosts = purchasePrice * effectiveClosingCostsPct
    const loanAmount = purchasePrice - downPayment
    const monthlyRate = effectiveInterestRate / 12
    const numPayments = effectiveLoanTerm * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12

    const maintenancePct = 0.05
    const capexPct = 0.05

    const annualRent = effectiveRent * 12
    const vacancyLoss = annualRent * effectiveVacancyRate
    const effectiveGross = annualRent - vacancyLoss
    const management = annualRent * effectiveManagementPct
    const maintenance = annualRent * maintenancePct
    const capex = annualRent * capexPct
    const totalExpenses = effectiveTaxes + effectiveInsurance + management + maintenance + capex

    return [
      {
        title: 'Purchase & Financing',
        items: [
          { label: 'PURCHASE', value: '', isSubHeader: true },
          { label: 'List Price', value: `$${listPrice.toLocaleString()}` },
          { label: 'Target Buy Price', value: `$${purchasePrice.toLocaleString()}`, isTeal: true },
          { label: `Down Payment (${Math.round(effectiveDownPaymentPct * 100)}%)`, value: `$${Math.round(downPayment).toLocaleString()}` },
          { label: `Closing Costs (${Math.round(effectiveClosingCostsPct * 100)}%)`, value: `$${Math.round(closingCosts).toLocaleString()}` },
          { label: 'Loan Amount', value: `$${Math.round(loanAmount).toLocaleString()}` },
          { label: 'FINANCING', value: '', isSubHeader: true },
          { label: 'Interest Rate', value: `${(effectiveInterestRate * 100).toFixed(1)}%` },
          { label: 'Loan Term', value: `${effectiveLoanTerm} years` },
          { label: 'Monthly P&I', value: `$${Math.round(monthlyPI).toLocaleString()}` },
          { label: 'Annual Debt Service', value: `$${Math.round(annualDebtService).toLocaleString()}`, isTotal: true },
        ],
      },
      {
        title: 'Income & Expenses',
        items: [
          { label: 'INCOME', value: '', isSubHeader: true },
          { label: 'Monthly Rent', value: `$${Math.round(effectiveRent).toLocaleString()}` },
          { label: 'Annual Gross', value: `$${Math.round(annualRent).toLocaleString()}` },
          { label: `Vacancy (${Math.round(effectiveVacancyRate * 100)}%)`, value: `($${Math.round(vacancyLoss).toLocaleString()})`, isNegative: true },
          { label: 'Eff. Gross Income', value: `$${Math.round(effectiveGross).toLocaleString()}`, isTotal: true },
          { label: 'EXPENSES', value: '', isSubHeader: true },
          { label: 'Property Tax', value: `$${Math.round(effectiveTaxes).toLocaleString()}/yr` },
          { label: 'Insurance', value: `$${Math.round(effectiveInsurance).toLocaleString()}/yr` },
          { label: `Mgmt (${Math.round(effectiveManagementPct * 100)}%)`, value: `$${Math.round(management).toLocaleString()}/yr` },
          { label: `Maintenance (${Math.round(maintenancePct * 100)}%)`, value: `$${Math.round(maintenance).toLocaleString()}/yr` },
          { label: `CapEx (${Math.round(capexPct * 100)}%)`, value: `$${Math.round(capex).toLocaleString()}/yr` },
          { label: 'Total Expenses', value: `$${Math.round(totalExpenses).toLocaleString()}/yr`, isTotal: true },
        ],
      },
    ]
  }, [listPrice, purchasePrice, effectiveRent, effectiveTaxes, effectiveInsurance,
      effectiveDownPaymentPct, effectiveClosingCostsPct, effectiveInterestRate,
      effectiveLoanTerm, effectiveVacancyRate, effectiveManagementPct])

  // Financial summary (NOI & Cashflow) — uses effective override values
  const financialSummary = useMemo(() => {
    const annualRent = effectiveRent * 12
    const effectiveGross = annualRent * (1 - effectiveVacancyRate)
    const maintenancePct = 0.05
    const capexPct = 0.05
    const totalExpenses = effectiveTaxes + effectiveInsurance +
      (annualRent * effectiveManagementPct) + (annualRent * maintenancePct) + (annualRent * capexPct)
    const noi = effectiveGross - totalExpenses

    const loanAmount = purchasePrice * (1 - effectiveDownPaymentPct)
    const monthlyRate = effectiveInterestRate / 12
    const numPayments = effectiveLoanTerm * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12
    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = annualCashFlow / 12

    const fmtCurrency = (v: number) => `$${Math.round(Math.abs(v)).toLocaleString()}`

    return {
      noi: { 
        label: 'Net Operating Income (NOI)', 
        value: `$${Math.round(noi).toLocaleString()}`,
        monthlyLabel: 'Monthly NOI',
        monthlyValue: `$${Math.round(noi / 12).toLocaleString()}`,
      },
      cashflow: {
        annual: {
          label: 'Pre-Tax Cash Flow',
          value: annualCashFlow >= 0 ? fmtCurrency(annualCashFlow) : `(${fmtCurrency(annualCashFlow)})`,
          isNegative: annualCashFlow < 0,
        },
        monthly: {
          label: 'Monthly Cash Flow',
          value: monthlyCashFlow >= 0 ? fmtCurrency(monthlyCashFlow) : `(${fmtCurrency(monthlyCashFlow)})`,
          isNegative: monthlyCashFlow < 0,
        },
      },
    }
  }, [purchasePrice, effectiveRent, effectiveTaxes, effectiveInsurance,
      effectiveDownPaymentPct, effectiveInterestRate, effectiveLoanTerm,
      effectiveVacancyRate, effectiveManagementPct])

  // Performance metrics — recalculated from effective values when overrides present
  const performanceMetrics = useMemo(() => {
    const annualRent = effectiveRent * 12
    const totalExpenses = effectiveTaxes + effectiveInsurance +
      (annualRent * effectiveManagementPct) + (annualRent * 0.05) + (annualRent * 0.05)
    const noi = (annualRent * (1 - effectiveVacancyRate)) - totalExpenses

    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0
    const downPayment = purchasePrice * effectiveDownPaymentPct
    const loanAmount = purchasePrice - downPayment
    const monthlyRate = effectiveInterestRate / 12
    const numPayments = effectiveLoanTerm * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12
    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = Math.round(annualCashFlow / 12)
    const cashOnCash = downPayment > 0 ? ((noi - annualDebtService) / downPayment) * 100 : 0
    const paybackYears = downPayment > 0 && annualCashFlow > 0
      ? downPayment / annualCashFlow
      : 99

    return [
      {
        name: 'Cap Rate',
        value: `${capRate.toFixed(1)}%`,
        benchmark: '6.0%',
        numValue: capRate,
        benchmarkNum: 6.0,
        higherIsBetter: true,
      },
      {
        name: 'Cash-on-Cash',
        value: `${cashOnCash.toFixed(1)}%`,
        benchmark: '8.0%',
        numValue: cashOnCash,
        benchmarkNum: 8.0,
        higherIsBetter: true,
      },
      {
        name: 'Monthly Cash Flow',
        value: `$${monthlyCashFlow.toLocaleString()}`,
        benchmark: '$300',
        numValue: monthlyCashFlow,
        benchmarkNum: 300,
        higherIsBetter: true,
      },
      {
        name: 'Payback Period',
        value: `${paybackYears.toFixed(1)} yrs`,
        benchmark: '10 yrs',
        numValue: paybackYears,
        benchmarkNum: 10,
        higherIsBetter: false,
      },
    ]
  }, [purchasePrice, effectiveRent, effectiveTaxes, effectiveInsurance,
      effectiveDownPaymentPct, effectiveInterestRate, effectiveLoanTerm,
      effectiveVacancyRate, effectiveManagementPct])

  // Handle price card selection
  const handlePriceCardSelect = useCallback((variant: PriceCardVariant) => {
    setSelectedPriceCard(variant)
  }, [])

  // Initial values for DealMaker popup — reflects current overrides so the
  // popup opens where the user left off, not the original defaults
  const dealMakerInitialValues = useMemo(() => ({
    buyPrice: effectiveBuyPrice,
    downPayment: overrideValues?.downPayment ?? 20,
    closingCosts: overrideValues?.closingCosts ?? 3,
    interestRate: overrideValues?.interestRate ?? 6,
    loanTerm: effectiveLoanTerm,
    rehabBudget: overrideValues?.rehabBudget ?? 0,
    arv: overrideValues?.arv ?? analysis.listPrice ?? property.price,
    propertyTaxes: effectiveTaxes,
    insurance: effectiveInsurance,
    monthlyRent: effectiveRent,
    vacancyRate: overrideValues?.vacancyRate ?? 5,
    managementRate: overrideValues?.managementRate ?? 8,
  }), [effectiveBuyPrice, effectiveLoanTerm, effectiveRent, effectiveTaxes,
       effectiveInsurance, overrideValues, analysis.listPrice, property.price])

  return (
    <>
      <VerdictPageFresh
        property={propertySummary}
        score={analysis.dealScore}
        verdictLabel={getVerdictLabel(analysis.dealScore)}
        verdictSubtitle={getVerdictSubtitle(analysis.dealScore, analysis.discountPercent || 0)}
        quickStats={quickStats}
        confidenceMetrics={confidenceMetrics}
        financingTerms={`${Math.round(effectiveDownPaymentPct * 100)}% down, ${(effectiveInterestRate * 100).toFixed(1)}%`}
        priceCards={priceCards}
        keyMetrics={keyMetrics}
        financialBreakdown={financialBreakdown}
        financialSummary={financialSummary}
        performanceMetrics={performanceMetrics}
        selectedPriceCard={selectedPriceCard}
        onPriceCardSelect={handlePriceCardSelect}
        // Action callbacks
        onDealMakerClick={onDealMakerClick}
        onExportClick={handleExport}
        onChangeTerms={handleOpenTermsPopup}
        onShowMethodology={onShowMethodology}
        isExporting={isExporting}
        // Note: Header callbacks are now handled by global AppHeader
      />

      {/* DealMaker Popup for editing terms/assumptions */}
      <DealMakerPopup
        isOpen={showDealMakerPopup}
        onClose={() => setShowDealMakerPopup(false)}
        onApply={handleApplyDealMakerValues}
        strategyType={currentStrategy}
        onStrategyChange={handleStrategyChange}
        activePriceTarget={activePriceTarget}
        onPriceTargetChange={handlePriceTargetChange}
        initialValues={dealMakerInitialValues}
      />
    </>
  )
}

export default VerdictPageAdapter
