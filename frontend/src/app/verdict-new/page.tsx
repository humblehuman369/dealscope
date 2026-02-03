'use client'

/**
 * VerdictIQ New Layout Preview
 * 
 * Preview route for the fresh VerdictIQ layout.
 * Uses mock data to demonstrate the new visual patterns.
 */

import React from 'react'
import { VerdictIQPageNew } from '@/components/iq-verdict/VerdictIQPageNew'
import { IQProperty, IQAnalysisResult } from '@/components/iq-verdict/types'

// Mock property data
const MOCK_PROPERTY: IQProperty = {
  id: 'mock-001',
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  monthlyRent: 5555,
  listingStatus: 'OFF_MARKET',
  zestimate: 797400,
  propertyTaxes: 9850,
  insurance: 4200,
  imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
}

// Mock analysis result
const MOCK_ANALYSIS: IQAnalysisResult = {
  propertyId: 'mock-001',
  dealScore: 78,
  dealVerdict: 'Strong Opportunity',
  verdictDescription: 'Deal gap likely achievable with negotiation',
  purchasePrice: 736665,
  breakevenPrice: 784458,
  discountPercent: 10.3,
  strategies: [
    {
      id: 'ltr',
      name: 'Long-Term Rental',
      icon: '🏠',
      metric: '10.7%',
      metricLabel: 'Cap Rate',
      metricValue: 10.7,
      score: 82,
      rank: 1,
      badge: 'Best Match',
    },
    {
      id: 'str',
      name: 'Short-Term Rental',
      icon: '🏖️',
      metric: '21.7%',
      metricLabel: 'CoC Return',
      metricValue: 21.7,
      score: 76,
      rank: 2,
      badge: 'Strong',
    },
    {
      id: 'brrrr',
      name: 'BRRRR',
      icon: '🔄',
      metric: '35%',
      metricLabel: 'Cash Recoup',
      metricValue: 35,
      score: 68,
      rank: 3,
      badge: 'Good',
    },
  ],
  opportunityFactors: {
    dealGap: -5.5,
    motivation: 55,
    motivationLabel: 'Medium',
    daysOnMarket: 45,
    buyerMarket: 'warm',
    distressedSale: false,
  },
  analyzedAt: new Date().toISOString(),
}

export default function VerdictNewPage() {
  return (
    <VerdictIQPageNew
      property={MOCK_PROPERTY}
      analysis={MOCK_ANALYSIS}
    />
  )
}
