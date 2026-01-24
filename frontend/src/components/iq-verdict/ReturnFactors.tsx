'use client'

import React from 'react'
import { Percent, DollarSign, Shield, TrendingUp } from 'lucide-react'
import { ReturnFactors as ReturnFactorsType } from './types'

interface ReturnFactorsProps {
  factors: ReturnFactorsType
  className?: string
}

/**
 * ReturnFactors Component
 * 
 * Displays the breakdown of factors contributing to the Return rating:
 * - Cap Rate: Capitalization rate %
 * - Cash on Cash: Cash-on-Cash return %
 * - DSCR: Debt Service Coverage Ratio
 * - Annual ROI: Annual return in dollars
 * - Annual Profit: Annual profit in dollars
 */
export function ReturnFactors({ factors, className = '' }: ReturnFactorsProps) {
  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A'
    return `${value.toFixed(1)}%`
  }
  
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A'
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${Math.round(value).toLocaleString()}`
  }
  
  const formatDSCR = (value: number | null) => {
    if (value === null) return 'N/A'
    return value.toFixed(2)
  }
  
  const getCapRateColor = (capRate: number | null) => {
    if (capRate === null) return 'text-gray-400'
    if (capRate >= 8) return 'text-green-500'
    if (capRate >= 6) return 'text-amber-500'
    return 'text-red-500'
  }
  
  const getCoCColor = (coc: number | null) => {
    if (coc === null) return 'text-gray-400'
    if (coc >= 10) return 'text-green-500'
    if (coc >= 5) return 'text-amber-500'
    return 'text-red-500'
  }
  
  const getDSCRColor = (dscr: number | null) => {
    if (dscr === null) return 'text-gray-400'
    if (dscr >= 1.25) return 'text-green-500'
    if (dscr >= 1.0) return 'text-amber-500'
    return 'text-red-500'
  }
  
  const getCashFlowColor = (cashFlow: number | null) => {
    if (cashFlow === null) return 'text-gray-400'
    if (cashFlow > 0) return 'text-green-500'
    if (cashFlow === 0) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Return Factors ({factors.strategyName})
      </h4>
      
      <div className="space-y-2.5">
        {/* Cap Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Cap Rate</span>
          </div>
          <span className={`text-sm font-semibold ${getCapRateColor(factors.capRate)}`}>
            {formatPercent(factors.capRate)}
          </span>
        </div>
        
        {/* Cash on Cash */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Cash on Cash</span>
          </div>
          <span className={`text-sm font-semibold ${getCoCColor(factors.cashOnCash)}`}>
            {formatPercent(factors.cashOnCash)}
          </span>
        </div>
        
        {/* DSCR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">DSCR</span>
          </div>
          <span className={`text-sm font-semibold ${getDSCRColor(factors.dscr)}`}>
            {formatDSCR(factors.dscr)}
          </span>
        </div>
        
        {/* Annual ROI */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Annual ROI</span>
          </div>
          <span className={`text-sm font-semibold ${getCashFlowColor(factors.annualRoi)}`}>
            {formatCurrency(factors.annualRoi)}
          </span>
        </div>
        
        {/* Annual Profit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Annual Profit</span>
          </div>
          <span className={`text-sm font-semibold ${getCashFlowColor(factors.annualProfit)}`}>
            {formatCurrency(factors.annualProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ReturnFactors
