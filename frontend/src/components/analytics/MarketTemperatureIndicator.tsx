'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ThermometerSun, ThermometerSnowflake, Thermometer, Clock, Home, ArrowDown, ArrowUp } from 'lucide-react'

export type MarketTemperature = 'hot' | 'warm' | 'cold'

export interface MarketStats {
  medianDaysOnMarket?: number
  avgDaysOnMarket?: number
  minDaysOnMarket?: number
  maxDaysOnMarket?: number
  totalListings?: number
  newListings?: number
  absorptionRate?: number
  marketTemperature?: MarketTemperature
  medianPrice?: number
  avgPricePerSqft?: number
}

interface MarketTemperatureIndicatorProps {
  stats?: MarketStats
  className?: string
  compact?: boolean
}

/**
 * MarketTemperatureIndicator - Visual indicator of buyer/seller market conditions
 * 
 * Shows:
 * - Hot market (seller's market) - Red/orange, hard to negotiate
 * - Warm market (balanced) - Yellow, some negotiation room
 * - Cold market (buyer's market) - Blue, good negotiation leverage
 */
export function MarketTemperatureIndicator({
  stats,
  className = '',
  compact = false
}: MarketTemperatureIndicatorProps) {
  if (!stats) {
    return null
  }

  const temperature = stats.marketTemperature || 'warm'
  
  // Temperature configuration
  const tempConfig = {
    hot: {
      label: "Seller's Market",
      description: "Properties sell quickly - limited negotiation room",
      icon: ThermometerSun,
      bgColor: 'bg-gradient-to-r from-red-500 to-orange-500',
      textColor: 'text-white',
      borderColor: 'border-red-500',
      indicatorColor: 'bg-red-500',
      negotiationPower: 'Low',
      discountRange: '0-3%',
    },
    warm: {
      label: 'Balanced Market',
      description: "Normal market conditions - moderate negotiation possible",
      icon: Thermometer,
      bgColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
      textColor: 'text-gray-900',
      borderColor: 'border-yellow-500',
      indicatorColor: 'bg-yellow-500',
      negotiationPower: 'Medium',
      discountRange: '3-7%',
    },
    cold: {
      label: "Buyer's Market",
      description: "High inventory, longer days on market - strong negotiation leverage",
      icon: ThermometerSnowflake,
      bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      textColor: 'text-white',
      borderColor: 'border-blue-500',
      indicatorColor: 'bg-blue-500',
      negotiationPower: 'High',
      discountRange: '7-15%',
    },
  }
  
  const config = tempConfig[temperature]
  const TempIcon = config.icon

  // Compact version - just shows badge
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor} ${config.textColor} ${className}`}>
        <TempIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{config.label}</span>
      </div>
    )
  }

  // Format numbers
  const formatNumber = (n?: number) => n?.toLocaleString() ?? '-'
  const formatPercent = (n?: number) => n ? `${(n * 100).toFixed(1)}%` : '-'
  const formatCurrency = (n?: number) => n ? `$${n.toLocaleString()}` : '-'

  return (
    <div className={`rounded-xl border ${config.borderColor} overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`${config.bgColor} ${config.textColor} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TempIcon className="w-5 h-5" />
            <span className="font-semibold">{config.label}</span>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">Negotiation Power</div>
            <div className="font-bold">{config.negotiationPower}</div>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-1">{config.description}</p>
      </div>
      
      {/* Stats Grid */}
      <div className="bg-white dark:bg-gray-900 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Days on Market */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Median DOM</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatNumber(stats.medianDaysOnMarket)}
            </div>
            <div className="text-xs text-gray-500">days</div>
          </div>
          
          {/* Total Listings */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <Home className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatNumber(stats.totalListings)}
            </div>
            <div className="text-xs text-gray-500">listings</div>
          </div>
          
          {/* New Listings */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>New Listings</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatNumber(stats.newListings)}
            </div>
            <div className="text-xs text-gray-500">this month</div>
          </div>
          
          {/* Absorption Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
              {(stats.absorptionRate ?? 0) > 0.1 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span>Absorption</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatPercent(stats.absorptionRate)}
            </div>
            <div className="text-xs text-gray-500">rate</div>
          </div>
        </div>
        
        {/* Negotiation Insight */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className={`w-2 h-2 rounded-full ${config.indicatorColor} mt-1.5`} />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Expected Discount Range: {config.discountRange}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {temperature === 'hot' && 'Expect to pay close to asking price. Focus on speed and clean offers.'}
                {temperature === 'warm' && 'Room for negotiation exists. Start 5-7% below asking.'}
                {temperature === 'cold' && 'Significant negotiation leverage. Consider starting 10-15% below asking.'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Days on Market Range */}
        {(stats.minDaysOnMarket !== undefined || stats.maxDaysOnMarket !== undefined) && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              <span>Min: {formatNumber(stats.minDaysOnMarket)} days</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Max: {formatNumber(stats.maxDaysOnMarket)} days</span>
              <ArrowUp className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact badge version for use in property cards
 */
export function MarketTemperatureBadge({ 
  temperature = 'warm',
  className = '' 
}: { 
  temperature?: MarketTemperature
  className?: string 
}) {
  const config = {
    hot: { label: 'Hot Market', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: TrendingUp },
    warm: { label: 'Balanced', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Minus },
    cold: { label: "Buyer's Market", bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: TrendingDown },
  }
  
  const c = config[temperature]
  const Icon = c.icon
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} ${className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

/**
 * Mini indicator for tight spaces
 */
export function MarketTemperatureDot({ 
  temperature = 'warm',
  showLabel = true,
  className = '' 
}: { 
  temperature?: MarketTemperature
  showLabel?: boolean
  className?: string 
}) {
  const colors = {
    hot: 'bg-red-500',
    warm: 'bg-yellow-500',
    cold: 'bg-blue-500',
  }
  
  const labels = {
    hot: "Seller's",
    warm: 'Balanced',
    cold: "Buyer's",
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${colors[temperature]}`} />
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{labels[temperature]} Market</span>
      )}
    </span>
  )
}

export default MarketTemperatureIndicator
