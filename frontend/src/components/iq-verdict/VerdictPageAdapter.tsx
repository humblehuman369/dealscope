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

// Re-export types for convenience
export type { IQProperty, IQAnalysisResult }

interface VerdictPageAdapterProps {
  property: IQProperty
  analysis: IQAnalysisResult
  // Action callbacks
  onDealMakerClick?: () => void
  onExportClick?: () => void
  onPropertyClick?: () => void
  onChangeTerms?: () => void
  onShowMethodology?: () => void
  // Header callbacks
  onLogoClick?: () => void
  onSearchClick?: () => void
  onProfileClick?: () => void
  // Tab navigation callback
  onTabChange?: (tab: 'analyze' | 'details' | 'sale-comps' | 'rent' | 'dashboard') => void
}

// Helper to get verdict label from score
function getVerdictLabel(score: number): string {
  if (score >= 80) return 'Strong Buy'
  if (score >= 65) return 'Good Opportunity'
  if (score >= 50) return 'Fair Deal'
  if (score >= 35) return 'Proceed with Caution'
  return 'Not Recommended'
}

// Helper to get verdict subtitle
function getVerdictSubtitle(score: number, discountPercent: number): string {
  if (score >= 80) return 'Excellent investment potential'
  if (score >= 65) return discountPercent > 0 
    ? 'Deal gap achievable with negotiation' 
    : 'Solid fundamentals for investment'
  if (score >= 50) return 'Marginal returns, consider alternatives'
  return 'High risk, low reward potential'
}

export function VerdictPageAdapter({
  property,
  analysis,
  onDealMakerClick,
  onExportClick,
  onPropertyClick,
  onChangeTerms,
  onShowMethodology,
  onLogoClick,
  onSearchClick,
  onProfileClick,
  onTabChange,
}: VerdictPageAdapterProps) {
  const [selectedPriceCard, setSelectedPriceCard] = useState<PriceCardVariant>('target')
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)

  // Handle opening the DealMaker popup for editing terms
  const handleOpenTermsPopup = useCallback(() => {
    setShowDealMakerPopup(true)
  }, [])

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

    return [
      { value: `${capRate.toFixed(1)}%`, label: 'Cap Rate' },
      { value: `${Math.max(0, cashOnCash).toFixed(1)}%`, label: 'Cash-on-Cash' },
      { value: `$${Math.round(noi / 12).toLocaleString()}`, label: 'Monthly NOI' },
    ]
  }, [selectedPriceCard, breakevenPrice, purchasePrice, wholesalePrice, property])

  // Financial breakdown columns
  const financialBreakdown = useMemo(() => {
    const rent = property.monthlyRent || (property.price * 0.007)
    const taxes = property.propertyTaxes || (property.price * 0.012)
    const insurance = property.insurance || (property.price * 0.01)

    return [
      {
        title: 'Purchase',
        items: [
          { label: 'List Price', value: `$${listPrice.toLocaleString()}` },
          { label: 'Target Price', value: `$${purchasePrice.toLocaleString()}` },
          { label: 'Down Payment (20%)', value: `$${Math.round(purchasePrice * 0.2).toLocaleString()}` },
          { label: 'Closing Costs', value: `$${Math.round(purchasePrice * 0.03).toLocaleString()}` },
        ],
      },
      {
        title: 'Income',
        items: [
          { label: 'Monthly Rent', value: `$${Math.round(rent).toLocaleString()}` },
          { label: 'Annual Gross', value: `$${Math.round(rent * 12).toLocaleString()}` },
          { label: 'Vacancy (5%)', value: `-$${Math.round(rent * 12 * 0.05).toLocaleString()}` },
          { label: 'Effective Gross', value: `$${Math.round(rent * 12 * 0.95).toLocaleString()}` },
        ],
      },
      {
        title: 'Expenses',
        items: [
          { label: 'Property Tax', value: `$${Math.round(taxes).toLocaleString()}/yr` },
          { label: 'Insurance', value: `$${Math.round(insurance).toLocaleString()}/yr` },
          { label: 'Management (8%)', value: `$${Math.round(rent * 12 * 0.08).toLocaleString()}/yr` },
          { label: 'Maintenance (5%)', value: `$${Math.round(rent * 12 * 0.05).toLocaleString()}/yr` },
        ],
      },
    ]
  }, [property, analysis])

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
        performanceMetrics={performanceMetrics}
        selectedPriceCard={selectedPriceCard}
        onPriceCardSelect={handlePriceCardSelect}
        // Action callbacks
        onDealMakerClick={onDealMakerClick}
        onExportClick={onExportClick}
        onPropertyClick={onPropertyClick}
        onChangeTerms={handleOpenTermsPopup}
        onShowMethodology={onShowMethodology}
        // Header callbacks
        onLogoClick={onLogoClick}
        onSearchClick={onSearchClick}
        onProfileClick={onProfileClick}
        onTabChange={onTabChange}
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
