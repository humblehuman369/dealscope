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

  // Handle applying values from DealMaker popup
  const handleApplyDealMakerValues = useCallback((values: DealMakerValues) => {
    setShowDealMakerPopup(false)
    // In a full implementation, this would recalculate metrics based on new values
    console.log('Applied DealMaker values:', values)
  }, [])

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
    monthlyRent: property.monthlyRent || (property.price * 0.007),
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

  // Price cards with fallbacks
  const breakevenPrice = analysis.breakevenPrice || property.price
  const purchasePrice = analysis.purchasePrice || Math.round(property.price * 0.95)
  const listPrice = analysis.listPrice || property.price

  const priceCards = useMemo(() => [
    {
      label: 'Breakeven',
      value: breakevenPrice,
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
  ], [breakevenPrice, purchasePrice, wholesalePrice])

  // Key metrics based on selected price card
  const keyMetrics = useMemo(() => {
    const rent = property.monthlyRent || (property.price * 0.007)
    const selectedPrice = selectedPriceCard === 'breakeven' 
      ? breakevenPrice 
      : selectedPriceCard === 'target' 
        ? purchasePrice 
        : wholesalePrice

    const annualRent = rent * 12
    const expenses = (property.propertyTaxes || property.price * 0.012) + 
                     (property.insurance || property.price * 0.01) + 
                     (rent * 12 * 0.08) // 8% management
    const noi = annualRent - expenses
    const capRate = selectedPrice > 0 ? (noi / selectedPrice) * 100 : 0
    const cashOnCash = selectedPrice > 0 ? ((noi - (selectedPrice * 0.8 * 0.07)) / (selectedPrice * 0.2)) * 100 : 0

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
      { value: `$${Math.round(rent).toLocaleString()}`, label: 'Monthly Rent' },
    ]
  }, [selectedPriceCard, breakevenPrice, purchasePrice, wholesalePrice, property])

  // Financial breakdown columns - Two-column mini financial statement
  const financialBreakdown = useMemo(() => {
    const rent = property.monthlyRent || (property.price * 0.007)
    const taxes = property.propertyTaxes || (property.price * 0.012)
    const insurance = property.insurance || (property.price * 0.01)

    const downPaymentPct = 0.20
    const closingCostsPct = 0.03
    const interestRate = 0.06
    const loanTermYears = 30

    const downPayment = purchasePrice * downPaymentPct
    const closingCosts = purchasePrice * closingCostsPct
    const loanAmount = purchasePrice - downPayment
    const monthlyRate = interestRate / 12
    const numPayments = loanTermYears * 12
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    const annualDebtService = monthlyPI * 12

    const vacancyRate = 0.05
    const managementPct = 0.08
    const maintenancePct = 0.05
    const capexPct = 0.05

    const annualRent = rent * 12
    const vacancyLoss = annualRent * vacancyRate
    const effectiveGross = annualRent - vacancyLoss
    const management = annualRent * managementPct
    const maintenance = annualRent * maintenancePct
    const capex = annualRent * capexPct
    const totalExpenses = taxes + insurance + management + maintenance + capex

    return [
      {
        title: 'Purchase & Financing',
        items: [
          { label: 'PURCHASE', value: '', isSubHeader: true },
          { label: 'List Price', value: `$${listPrice.toLocaleString()}` },
          { label: 'Target Buy Price', value: `$${purchasePrice.toLocaleString()}`, isTeal: true },
          { label: `Down Payment (${Math.round(downPaymentPct * 100)}%)`, value: `$${Math.round(downPayment).toLocaleString()}` },
          { label: `Closing Costs (${Math.round(closingCostsPct * 100)}%)`, value: `$${Math.round(closingCosts).toLocaleString()}` },
          { label: 'Loan Amount', value: `$${Math.round(loanAmount).toLocaleString()}` },
          { label: 'FINANCING', value: '', isSubHeader: true },
          { label: 'Interest Rate', value: `${(interestRate * 100).toFixed(1)}%` },
          { label: 'Loan Term', value: `${loanTermYears} years` },
          { label: 'Monthly P&I', value: `$${Math.round(monthlyPI).toLocaleString()}` },
          { label: 'Annual Debt Service', value: `$${Math.round(annualDebtService).toLocaleString()}`, isTotal: true },
        ],
      },
      {
        title: 'Income & Expenses',
        items: [
          { label: 'INCOME', value: '', isSubHeader: true },
          { label: 'Monthly Rent', value: `$${Math.round(rent).toLocaleString()}` },
          { label: 'Annual Gross', value: `$${Math.round(annualRent).toLocaleString()}` },
          { label: `Vacancy (${Math.round(vacancyRate * 100)}%)`, value: `($${Math.round(vacancyLoss).toLocaleString()})`, isNegative: true },
          { label: 'Eff. Gross Income', value: `$${Math.round(effectiveGross).toLocaleString()}`, isTotal: true },
          { label: 'EXPENSES', value: '', isSubHeader: true },
          { label: 'Property Tax', value: `$${Math.round(taxes).toLocaleString()}/yr` },
          { label: 'Insurance', value: `$${Math.round(insurance).toLocaleString()}/yr` },
          { label: `Mgmt (${Math.round(managementPct * 100)}%)`, value: `$${Math.round(management).toLocaleString()}/yr` },
          { label: `Maintenance (${Math.round(maintenancePct * 100)}%)`, value: `$${Math.round(maintenance).toLocaleString()}/yr` },
          { label: `CapEx (${Math.round(capexPct * 100)}%)`, value: `$${Math.round(capex).toLocaleString()}/yr` },
          { label: 'Total Expenses', value: `$${Math.round(totalExpenses).toLocaleString()}/yr`, isTotal: true },
        ],
      },
    ]
  }, [property, analysis, listPrice, purchasePrice])

  // Financial summary (NOI & Cashflow) for full-width boxes
  const financialSummary = useMemo(() => {
    const rent = property.monthlyRent || (property.price * 0.007)
    const taxes = property.propertyTaxes || (property.price * 0.012)
    const insurance = property.insurance || (property.price * 0.01)

    const annualRent = rent * 12
    const effectiveGross = annualRent * 0.95
    const totalExpenses = taxes + insurance + (annualRent * 0.08) + (annualRent * 0.05) + (annualRent * 0.05)
    const noi = effectiveGross - totalExpenses

    const loanAmount = purchasePrice * 0.80
    const monthlyRate = 0.06 / 12
    const numPayments = 360
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
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
  }, [property, purchasePrice])

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const capRate = analysis.returnFactors?.capRate || 5.5
    const cashOnCash = analysis.returnFactors?.cashOnCash || 8.0
    // Calculate monthly net from annualProfit or annualRoi, fallback to estimate
    const annualProfit = analysis.returnFactors?.annualProfit || analysis.returnFactors?.annualRoi || 5400
    const monthlyNet = Math.round(annualProfit / 12)

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
        value: `$${monthlyNet.toLocaleString()}`,
        benchmark: '$300',
        numValue: monthlyNet,
        benchmarkNum: 300,
        higherIsBetter: true,
      },
      {
        name: 'Payback Period',
        value: '8.2 yrs',
        benchmark: '10 yrs',
        numValue: 8.2,
        benchmarkNum: 10,
        higherIsBetter: false,
      },
    ]
  }, [analysis])

  // Handle price card selection
  const handlePriceCardSelect = useCallback((variant: PriceCardVariant) => {
    setSelectedPriceCard(variant)
  }, [])

  // Get initial values for DealMaker popup from analysis data
  const dealMakerInitialValues = useMemo(() => ({
    buyPrice: analysis.purchasePrice || property.price,
    downPayment: 20,
    closingCosts: 3,
    interestRate: 6,
    loanTerm: 30,
    rehabBudget: 0,
    arv: analysis.listPrice || property.price,
    propertyTaxes: property.propertyTaxes || 4200,
    insurance: 1800,
    monthlyRent: property.monthlyRent || 2800,
    vacancyRate: 5,
    managementRate: 8,
  }), [analysis, property])

  return (
    <>
      <VerdictPageFresh
        property={propertySummary}
        score={analysis.dealScore}
        verdictLabel={getVerdictLabel(analysis.dealScore)}
        verdictSubtitle={getVerdictSubtitle(analysis.dealScore, analysis.discountPercent || 0)}
        quickStats={quickStats}
        confidenceMetrics={confidenceMetrics}
        financingTerms="20% down, 6.0%"
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
        strategyType="ltr"
        initialValues={dealMakerInitialValues}
      />
    </>
  )
}

export default VerdictPageAdapter
