'use client'

import React from 'react'
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import type { STRMarketStats } from '@dealscope/shared/types'

interface STRConfidenceLabelProps {
  stats: STRMarketStats
  className?: string
}

const CONFIDENCE_CONFIG: Record<string, { label: string; dotColor: string; textColor: string }> = {
  high: {
    label: 'High confidence',
    dotColor: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
  },
  medium: {
    label: 'Moderate confidence',
    dotColor: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
  low: {
    label: 'Limited data',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
}

export function STRConfidenceLabel({ stats, className = '' }: STRConfidenceLabelProps) {
  const confidence = stats.confidence || 'low'
  const config = CONFIDENCE_CONFIG[confidence] || CONFIDENCE_CONFIG.low
  const sampleSize = stats.sample_size

  const yoyOcc = stats.yoy_occupancy_change
  const showYoy = yoyOcc != null && Math.abs(yoyOcc) > 5

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {/* Confidence + comp count */}
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <BarChart3 className="w-3 h-3" />
        {sampleSize != null ? (
          <>
            <span className={`font-medium ${config.textColor}`}>
              {sampleSize} Airbnb comps
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          </>
        ) : (
          <span className={`font-medium ${config.textColor}`}>{config.label}</span>
        )}
      </span>

      {/* City-level fallback warning */}
      {stats.city_insights_fallback && (
        <span className="inline-flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400">
          <AlertTriangle className="w-3 h-3" />
          City-level avg
        </span>
      )}

      {/* YoY occupancy trend */}
      {showYoy && (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
          yoyOcc! < 0
            ? 'text-red-500 dark:text-red-400'
            : 'text-green-500 dark:text-green-400'
        }`}>
          {yoyOcc! < 0
            ? <TrendingDown className="w-3 h-3" />
            : <TrendingUp className="w-3 h-3" />
          }
          {Math.abs(yoyOcc!).toFixed(0)}% YoY occupancy
        </span>
      )}
    </div>
  )
}

export default STRConfidenceLabel
