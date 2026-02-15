'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, DollarSign, Home, Clock, BarChart3 } from 'lucide-react'

export type RentTrend = 'up' | 'down' | 'stable'

export interface RentalStats {
  rentcastEstimate?: number
  zillowEstimate?: number
  iqEstimate?: number          // DealGapIQ proprietary average
  estimateLow?: number
  estimateHigh?: number
  marketAvgRent?: number
  marketMedianRent?: number
  marketMinRent?: number
  marketMaxRent?: number
  marketRentPerSqft?: number
  rentalDaysOnMarket?: number
  rentalTotalListings?: number
  rentalNewListings?: number
  rentTrend?: RentTrend
  trendPctChange?: number
}

interface RentRangeIndicatorProps {
  stats?: RentalStats
  className?: string
  compact?: boolean
}

/**
 * RentRangeIndicator - Visual display of rental estimates and market data
 * 
 * Shows:
 * - IQ Estimate (proprietary average of RentCast + Zillow)
 * - Estimate range slider
 * - Market-wide rent statistics
 * - Year-over-year trend with percentage
 */
export function RentRangeIndicator({
  stats,
  className = '',
  compact = false
}: RentRangeIndicatorProps) {
  if (!stats) {
    return null
  }

  const trend = stats.rentTrend || 'stable'
  const iqEstimate = stats.iqEstimate || stats.rentcastEstimate || stats.zillowEstimate
  
  // Trend configuration
  const trendConfig = {
    up: {
      label: 'Rising',
      description: 'Rents increasing year-over-year',
      icon: TrendingUp,
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-500',
    },
    down: {
      label: 'Falling',
      description: 'Rents decreasing year-over-year',
      icon: TrendingDown,
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-500',
    },
    stable: {
      label: 'Stable',
      description: 'Rents relatively flat (within ±2%)',
      icon: Minus,
      textColor: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      borderColor: 'border-gray-400',
    },
  }
  
  const config = trendConfig[trend]
  const TrendIcon = config.icon
  
  // Format helpers
  const formatCurrency = (n?: number) => n ? `$${Math.round(n).toLocaleString()}` : '-'
  const formatPercent = (n?: number) => {
    if (n === undefined || n === null) return '-'
    const sign = n >= 0 ? '+' : ''
    return `${sign}${(n * 100).toFixed(1)}%`
  }

  // Calculate slider position (0-100%)
  const getSliderPosition = () => {
    const min = stats.marketMinRent || stats.estimateLow || 0
    const max = stats.marketMaxRent || stats.estimateHigh || 0
    const estimate = iqEstimate || 0
    
    if (!min || !max || max <= min) return 50
    const position = ((estimate - min) / (max - min)) * 100
    return Math.max(5, Math.min(95, position))
  }

  // Compact version - just shows estimate with trend
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(iqEstimate)}
        </span>
        {stats.rentTrend && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
            <TrendIcon className="w-3 h-3" />
            {stats.trendPctChange !== undefined && formatPercent(stats.trendPctChange)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">Rental Analysis</span>
          </div>
          {stats.rentTrend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{config.label}</span>
              {stats.trendPctChange !== undefined && (
                <span>{formatPercent(stats.trendPctChange)} YoY</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        {/* IQ Estimate - Featured prominently */}
        <div className="text-center mb-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            IQ Rent Estimate
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(iqEstimate)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            /month
          </div>
        </div>
        
        {/* Estimate Range Slider */}
        {(stats.estimateLow || stats.estimateHigh || stats.marketMinRent || stats.marketMaxRent) && (
          <div className="mb-4">
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible">
              {/* Gradient track */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full opacity-30" />
              
              {/* Estimate position indicator */}
              <div 
                className="absolute -top-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2"
                style={{ left: `${getSliderPosition()}%` }}
              />
            </div>
            
            {/* Range labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatCurrency(stats.marketMinRent || stats.estimateLow)}</span>
              <span className="text-gray-400">Market Range</span>
              <span>{formatCurrency(stats.marketMaxRent || stats.estimateHigh)}</span>
            </div>
          </div>
        )}
        
        {/* Source Breakdown */}
        {(stats.rentcastEstimate || stats.zillowEstimate) && (
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">RentCast</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.rentcastEstimate)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Zillow</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.zillowEstimate)}
              </div>
            </div>
          </div>
        )}
        
        {/* Market Stats Grid */}
        {(stats.marketMedianRent || stats.rentalDaysOnMarket || stats.rentalTotalListings) && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Market Median */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Median</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.marketMedianRent)}
              </div>
            </div>
            
            {/* Rental DOM */}
            {stats.rentalDaysOnMarket !== undefined && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>DOM</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats.rentalDaysOnMarket}
                </div>
                <div className="text-xs text-gray-400">days</div>
              </div>
            )}
            
            {/* Rental Listings */}
            {stats.rentalTotalListings !== undefined && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Home className="w-3.5 h-3.5" />
                  <span>Listings</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats.rentalTotalListings.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Rent per Sqft */}
        {stats.marketRentPerSqft && (
          <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Market avg: {formatCurrency(stats.marketRentPerSqft)}/sqft
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact badge version showing just estimate + trend
 */
export function RentEstimateBadge({ 
  stats,
  className = '' 
}: { 
  stats?: RentalStats
  className?: string 
}) {
  if (!stats) return null
  
  const estimate = stats.iqEstimate || stats.rentcastEstimate || stats.zillowEstimate
  const trend = stats.rentTrend || 'stable'
  
  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-green-600' },
    down: { icon: TrendingDown, color: 'text-red-600' },
    stable: { icon: Minus, color: 'text-gray-500' },
  }
  
  const TrendIcon = trendConfig[trend].icon
  const trendColor = trendConfig[trend].color
  
  if (!estimate) return null
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-medium text-gray-900 dark:text-white">
        ${Math.round(estimate).toLocaleString()}/mo
      </span>
      {stats.rentTrend && (
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
      )}
    </span>
  )
}

/**
 * Mini trend indicator for tight spaces
 */
export function RentTrendDot({ 
  trend = 'stable',
  pctChange,
  showLabel = true,
  className = '' 
}: { 
  trend?: RentTrend
  pctChange?: number
  showLabel?: boolean
  className?: string 
}) {
  const colors = {
    up: 'bg-green-500',
    down: 'bg-red-500',
    stable: 'bg-gray-400',
  }
  
  const labels = {
    up: 'Rising',
    down: 'Falling',
    stable: 'Stable',
  }
  
  const formatPercent = (n?: number) => {
    if (n === undefined || n === null) return ''
    const sign = n >= 0 ? '+' : ''
    return ` (${sign}${(n * 100).toFixed(1)}%)`
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${colors[trend]}`} />
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {labels[trend]}{formatPercent(pctChange)}
        </span>
      )}
    </span>
  )
}

export default RentRangeIndicator
