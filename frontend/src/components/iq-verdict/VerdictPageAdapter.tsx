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
