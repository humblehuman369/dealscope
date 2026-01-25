'use client'

import React from 'react'
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Home, 
  Clock, 
  DollarSign,
  MapPin,
  User,
  FileWarning,
  Gavel,
  Building,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react'
import type { SellerMotivationScore, SellerMotivationIndicator as IndicatorType } from '../property-details/types'

interface SellerMotivationIndicatorProps {
  motivation?: SellerMotivationScore
  className?: string
  compact?: boolean
}

/**
 * SellerMotivationIndicator - Visual display of seller motivation analysis
 * 
 * Shows:
 * - Overall motivation score and grade
 * - Individual indicator breakdown
 * - Negotiation leverage recommendations
 */
export function SellerMotivationIndicator({
  motivation,
  className = '',
  compact = false
}: SellerMotivationIndicatorProps) {
  if (!motivation) {
    return null
  }

  // Get icon for each indicator type
  const getIndicatorIcon = (name: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'Days on Market': Clock,
      'Price Reductions': TrendingDown,
      'Withdrawn/Expired Listing': FileWarning,
      'Foreclosure/Distress': Gavel,
      'Absentee Ownership': Building,
      'Out-of-State Owner': MapPin,
      'Likely Vacant': Home,
      'Poor Condition': AlertTriangle,
      'Possibly Inherited': User,
      'For Sale By Owner': User,
      'Owner-Occupied': Home,
      'Selling Soon Prediction': TrendingUp,
    }
    return iconMap[name] || Info
  }

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-lime-600 dark:text-lime-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 20) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Get background color for grade badge
  const getGradeBgColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (grade === 'B') return 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
    if (grade === 'C') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  // Compact version - just shows score badge
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getGradeBgColor(motivation.grade)} ${className}`}>
        <span className="text-sm font-bold">{motivation.grade}</span>
        <span className="text-xs">{motivation.label}</span>
      </div>
    )
  }

  // Get detected indicators sorted by score
  const detectedIndicators = motivation.indicators
    .filter(i => i.detected)
    .sort((a, b) => b.score - a.score)

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${getGradeBgColor(motivation.grade)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{motivation.grade}</span>
              <span className="font-semibold">{motivation.label}</span>
            </div>
            <p className="text-sm opacity-80 mt-0.5">
              Score: {motivation.score}/100 | {motivation.totalSignalsDetected} signals detected
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">Negotiation Leverage</div>
            <div className="font-bold capitalize">{motivation.negotiationLeverage}</div>
          </div>
        </div>
      </div>

      {/* Recommended Discount */}
      <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Suggested Starting Discount: {motivation.recommendedDiscountRange}
          </span>
        </div>
      </div>

      {/* Key Leverage Points */}
      {motivation.keyLeveragePoints.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            KEY LEVERAGE POINTS
          </div>
          <ul className="space-y-1">
            {motivation.keyLeveragePoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Indicators Breakdown */}
      <div className="p-4">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
          MOTIVATION SIGNALS ({detectedIndicators.length} detected)
        </div>
        
        <div className="space-y-2">
          {detectedIndicators.map((indicator, idx) => {
            const Icon = getIndicatorIcon(indicator.name)
            const isHighSignal = indicator.signalStrength === 'high'
            
            return (
              <div 
                key={idx}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isHighSignal 
                    ? 'bg-green-50 dark:bg-green-900/20' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className={`p-1.5 rounded-full ${
                  isHighSignal 
                    ? 'bg-green-100 dark:bg-green-800' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isHighSignal 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {indicator.name}
                    </span>
                    {isHighSignal && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 font-medium">
                        HIGH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {indicator.description}
                  </p>
                </div>
                
                <div className={`text-sm font-bold ${getScoreColor(indicator.score)}`}>
                  {indicator.score}
                </div>
              </div>
            )
          })}

          {/* Show not-detected indicators as muted */}
          {motivation.indicators.filter(i => !i.detected).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Not detected ({motivation.indicators.filter(i => !i.detected).length})
              </div>
              <div className="flex flex-wrap gap-2">
                {motivation.indicators.filter(i => !i.detected).map((indicator, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500"
                  >
                    {indicator.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with data quality */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Data completeness: {motivation.dataCompleteness}%</span>
          {motivation.domVsMarketAvg && (
            <span>DOM vs Market: {motivation.domVsMarketAvg.toFixed(1)}x</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact badge version for use in property cards
 */
export function SellerMotivationBadge({ 
  motivation,
  className = '' 
}: { 
  motivation?: SellerMotivationScore
  className?: string 
}) {
  if (!motivation) return null

  const getBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (score >= 50) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
    if (score >= 30) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getBgColor(motivation.score)} ${className}`}>
      <TrendingDown className="w-3 h-3" />
      {motivation.negotiationLeverage} leverage
    </span>
  )
}

export default SellerMotivationIndicator
