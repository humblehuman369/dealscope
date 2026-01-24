'use client'

import React from 'react'
import { TrendingDown, Clock, Thermometer, AlertTriangle } from 'lucide-react'
import { OpportunityFactors as OpportunityFactorsType } from './types'

interface OpportunityFactorsProps {
  factors: OpportunityFactorsType
  className?: string
}

/**
 * OpportunityFactors Component
 * 
 * Displays the breakdown of factors contributing to the Opportunity score:
 * - Deal Gap: Discount % needed from list to breakeven
 * - Motivation: Seller motivation score
 * - Days on Market: How long the property has been listed
 * - Buyer Market: Market temperature (cold/warm/hot)
 * - Distressed Sale: Whether it's a foreclosure/bank-owned
 */
export function OpportunityFactors({ factors, className = '' }: OpportunityFactorsProps) {
  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  
  const getMotivationColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }
  
  const getMarketColor = (market: string | null) => {
    switch (market) {
      case 'cold': return 'text-blue-500'
      case 'warm': return 'text-amber-500'
      case 'hot': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }
  
  const getMarketLabel = (market: string | null) => {
    switch (market) {
      case 'cold': return 'Cold (Buyer\'s Market)'
      case 'warm': return 'Warm (Balanced)'
      case 'hot': return 'Hot (Seller\'s Market)'
      default: return 'Unknown'
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Opportunity Factors
      </h4>
      
      <div className="space-y-2.5">
        {/* Deal Gap */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Deal Gap</span>
          </div>
          <span className={`text-sm font-semibold ${
            factors.dealGap <= 10 ? 'text-green-500' : 
            factors.dealGap <= 25 ? 'text-amber-500' : 'text-red-500'
          }`}>
            {formatPercent(factors.dealGap)}
          </span>
        </div>
        
        {/* Motivation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 text-center text-xs">💪</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Motivation</span>
          </div>
          <span className={`text-sm font-semibold ${getMotivationColor(factors.motivation)}`}>
            {factors.motivationLabel} ({factors.motivation}%)
          </span>
        </div>
        
        {/* Days on Market */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Days on Market</span>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {factors.daysOnMarket !== null ? `${factors.daysOnMarket} days` : 'N/A'}
          </span>
        </div>
        
        {/* Buyer Market */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Buyer Market</span>
          </div>
          <span className={`text-sm font-semibold ${getMarketColor(factors.buyerMarket)}`}>
            {getMarketLabel(factors.buyerMarket)}
          </span>
        </div>
        
        {/* Distressed Sale */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Distressed Sale</span>
          </div>
          <span className={`text-sm font-semibold ${
            factors.distressedSale ? 'text-green-500' : 'text-gray-400'
          }`}>
            {factors.distressedSale ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default OpportunityFactors
