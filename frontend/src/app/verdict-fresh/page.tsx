'use client'

/**
 * VerdictIQ Fresh Preview Route
 * 
 * Demo page for the fresh VerdictIQ design implementation.
 * Uses sample data to showcase all components and sections.
 */

import { useState } from 'react'
import { VerdictPageFresh } from '@/components/iq-verdict/VerdictPageFresh'
import type { PriceCardVariant } from '@/components/iq-verdict/verdict-design-tokens'

// ===================
// SAMPLE DATA
// ===================

const sampleProperty = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  monthlyRent: 5555,
  listingStatus: 'FOR_SALE' as const,
  zpid: '123456789',
}

const sampleQuickStats = {
  dealGap: 5.5,
  sellerUrgency: 'Medium',
  sellerUrgencyScore: 62,
  marketTemp: 'Warm',
  vacancy: 5,
}

const sampleConfidenceMetrics = {
  dealProbability: 78,
  marketAlignment: 65,
  priceConfidence: 82,
}

const samplePriceCards = [
  { label: 'Breakeven', value: 784458, variant: 'breakeven' as const },
  { label: 'Target Buy', value: 745235, variant: 'target' as const },
  { label: 'Wholesale', value: 549121, variant: 'wholesale' as const },
]

// Metrics vary based on selected price card
const metricsForPrice: Record<PriceCardVariant, { value: string; label: string }[]> = {
  breakeven: [
    { value: '5.2%', label: 'Cap Rate' },
    { value: '0.0%', label: 'Cash-on-Cash' },
    { value: '1.00', label: 'DSCR' },
  ],
  target: [
    { value: '10.7%', label: 'Cap Rate' },
    { value: '21.7%', label: 'Cash-on-Cash' },
    { value: '1.87', label: 'DSCR' },
  ],
  wholesale: [
    { value: '18.4%', label: 'Cap Rate' },
    { value: '52.3%', label: 'Cash-on-Cash' },
    { value: '2.45', label: 'DSCR' },
  ],
}

const sampleFinancialBreakdown = [
  {
    title: 'Purchase',
    items: [
      { label: 'Target Price', value: '$736K' },
      { label: 'Down Payment', value: '$184K' },
      { label: 'Loan Amount', value: '$552K' },
      { label: 'Interest Rate', value: '7.00%' },
      { label: 'Closing Costs', value: '$22K' },
    ],
  },
  {
    title: 'Rental Income',
    items: [
      { label: 'Monthly Rent', value: '$5,800' },
      { label: 'Vacancy Loss', value: '-$290' },
      { label: 'Effective Rent', value: '$5,510', isTotal: true },
    ],
  },
  {
    title: 'Monthly Expenses',
    items: [
      { label: 'Taxes', value: '$613' },
      { label: 'Insurance', value: '$245' },
      { label: 'Repairs', value: '$580' },
      { label: 'Total', value: '$1,902', isTotal: true },
    ],
  },
]

const samplePerformanceMetrics = [
  { 
    name: 'Monthly Cash Flow', 
    value: '$482', 
    benchmark: '> $200/mo', 
    numValue: 482, 
    benchmarkNum: 200, 
    higherIsBetter: true 
  },
  { 
    name: 'Cap Rate', 
    value: '5.69%', 
    benchmark: '> 5.0%', 
    numValue: 5.69, 
    benchmarkNum: 5.0, 
    higherIsBetter: true 
  },
  { 
    name: 'Cash-on-Cash', 
    value: '3.14%', 
    benchmark: '> 8.0%', 
    numValue: 3.14, 
    benchmarkNum: 8.0, 
    higherIsBetter: true 
  },
  { 
    name: 'DSCR', 
    value: '1.08', 
    benchmark: '> 1.20', 
    numValue: 1.08, 
    benchmarkNum: 1.20, 
    higherIsBetter: true 
  },
]

// ===================
// PAGE COMPONENT
// ===================

export default function VerdictFreshPage() {
  const [selectedPriceCard, setSelectedPriceCard] = useState<PriceCardVariant>('target')

  const handleDealMakerClick = () => {
    console.log('Navigate to DealMakerIQ')
  }

  const handleExportClick = () => {
    console.log('Export analysis')
  }

  const handleChangeTerms = () => {
    console.log('Open change terms modal')
  }

  const handleShowMethodology = () => {
    console.log('Show methodology sheet')
  }

  const handlePropertyClick = () => {
    // Navigate to property details page
    console.log('Navigate to property details:', sampleProperty.zpid)
    // In real usage: router.push(`/property/${sampleProperty.zpid}`)
  }

  const handlePriceCardSelect = (variant: PriceCardVariant) => {
    setSelectedPriceCard(variant)
    console.log('Selected price card:', variant)
    // In real usage, this would trigger a recalculation of metrics
  }

  return (
    <VerdictPageFresh
      property={sampleProperty}
      score={78}
      verdictLabel="Good Opportunity"
      verdictSubtitle="Deal gap achievable with negotiation"
      quickStats={sampleQuickStats}
      confidenceMetrics={sampleConfidenceMetrics}
      financingTerms="20% down, 6.0%"
      priceCards={samplePriceCards}
      keyMetrics={metricsForPrice[selectedPriceCard]}
      selectedPriceCard={selectedPriceCard}
      financialBreakdown={sampleFinancialBreakdown}
      performanceMetrics={samplePerformanceMetrics}
      onDealMakerClick={handleDealMakerClick}
      onExportClick={handleExportClick}
      onChangeTerms={handleChangeTerms}
      onShowMethodology={handleShowMethodology}
      onPropertyClick={handlePropertyClick}
      onPriceCardSelect={handlePriceCardSelect}
    />
  )
}
