'use client'

import React, { useState } from 'react'
import { TrendingDown, Clock, AlertTriangle, Target, ChevronDown, ChevronUp, Scale } from 'lucide-react'
import { OpportunityFactors as OpportunityFactorsType, SellerMotivationData } from './types'

interface OpportunityFactorsProps {
  factors: OpportunityFactorsType
  sellerMotivation?: SellerMotivationData
  className?: string
}

/**
 * OpportunityFactors Component (Deal Score Factors)
 * 
 * Displays the breakdown of factors contributing to the Deal Score:
 * - Deal Gap: Discount % needed from list to breakeven
 * - Seller Motivation: Seller motivation score with expandable details
 * - Long Listing Duration: Whether property has been listed (shows days if yes, "No" if not)
 * - Distressed Sale: Whether it's a foreclosure/bank-owned
 */
export function OpportunityFactors({ factors, sellerMotivation, className = '' }: OpportunityFactorsProps) {
  const [showMotivationDetails, setShowMotivationDetails] = useState(false)
  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  
  const getMotivationColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  const getMotivationBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 40) return 'bg-amber-50 dark:bg-amber-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  // Use seller motivation data if available, otherwise fall back to factors
  const motivationScore = sellerMotivation?.score ?? factors.motivation
  const motivationLabel = sellerMotivation?.label ?? factors.motivationLabel

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Deal Score Factors
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
        
        {/* Motivation - Enhanced with seller motivation integration */}
        <div className="space-y-1">
          <button 
            onClick={() => sellerMotivation && setShowMotivationDetails(!showMotivationDetails)}
            className={`w-full flex items-center justify-between ${sellerMotivation ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Seller Motivation</span>
              {sellerMotivation && (
                showMotivationDetails ? (
                  <ChevronUp className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${getMotivationColor(motivationScore)}`}>
                {motivationLabel}
              </span>
              {sellerMotivation && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${getMotivationBg(motivationScore)} ${getMotivationColor(motivationScore)}`}>
                  {motivationScore}
                </span>
              )}
            </div>
          </button>
          
          {/* Seller Motivation Details - Expandable */}
          {showMotivationDetails && sellerMotivation && (
            <div className="ml-5 mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
              {/* Negotiation leverage */}
              {sellerMotivation.negotiation_leverage && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">Negotiation Leverage</span>
                  </div>
                  <span className={`font-semibold ${
                    sellerMotivation.negotiation_leverage === 'high' ? 'text-green-500' :
                    sellerMotivation.negotiation_leverage === 'medium' ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {sellerMotivation.negotiation_leverage.charAt(0).toUpperCase() + sellerMotivation.negotiation_leverage.slice(1)}
                  </span>
                </div>
              )}
              
              {/* Suggested discount range */}
              {sellerMotivation.suggested_discount_range && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Suggested Discount</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {sellerMotivation.suggested_discount_range.min}% - {sellerMotivation.suggested_discount_range.max}%
                  </span>
                </div>
              )}
              
              {/* Key indicators */}
              {sellerMotivation.indicators && sellerMotivation.indicators.length > 0 && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Key Factors</span>
                  {sellerMotivation.indicators.slice(0, 3).map((indicator, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">{indicator.name}</span>
                      <span className={indicator.detected ? 'text-green-500' : 'text-gray-400'}>
                        {indicator.detected ? '✓' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Long Listing Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Long Listing Duration</span>
          </div>
          <span className={`text-sm font-semibold ${
            factors.daysOnMarket !== null && factors.daysOnMarket > 60 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'
          }`}>
            {factors.daysOnMarket !== null ? `${factors.daysOnMarket} days` : 'No'}
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
