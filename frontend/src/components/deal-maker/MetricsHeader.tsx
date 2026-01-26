/**
 * MetricsHeader - Fixed header with 6 key metrics and 2 score badges
 * Layout matches the Deal Maker mockup design
 */

'use client'

import React from 'react'
import { MetricsHeaderProps, DealMakerMetrics, DealMakerState } from './types'
import { ScoreBadge } from './ScoreBadge'

// =============================================================================
// FORMATTERS
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatPercentWithSign(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(0)}%`
}

function getProfitQualityGrade(cocReturn: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const cocPercent = cocReturn * 100
  if (cocPercent >= 12) return 'A+'
  if (cocPercent >= 10) return 'A'
  if (cocPercent >= 8) return 'B'
  if (cocPercent >= 5) return 'C'
  if (cocPercent >= 2) return 'D'
  return 'F'
}

// =============================================================================
// METRIC ROW
// =============================================================================

interface MetricRowProps {
  label: string
  value: string
  valueColor?: string
}

function MetricRow({ label, value, valueColor }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[13px] text-white/60 font-medium">{label}</span>
      <span 
        className="text-sm font-bold"
        style={{ color: valueColor || 'white' }}
      >
        {value}
      </span>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MetricsHeader({ state, metrics }: MetricsHeaderProps) {
  // Derive profit quality grade from COC Return
  const profitGrade = getProfitQualityGrade(metrics.cocReturn)

  // Color helpers
  const profitColor = '#22c55e'  // green
  const lossColor = '#ef4444'    // red

  return (
    <div className="bg-[#0A1628] px-4 md:px-6 pt-2 pb-4">
      {/* Title */}
      <div className="flex justify-center items-center gap-2 mb-3">
        <span className="text-xl font-extrabold text-white tracking-wider">DEAL</span>
        <span className="text-xl font-extrabold text-cyan-400 tracking-wider">MAKER</span>
      </div>

      {/* Metrics + Badges Row */}
      <div className="flex justify-between">
        {/* Left: 6 Metrics */}
        <div className="flex-1 pr-3">
          <MetricRow 
            label="Buy Price" 
            value={formatCurrency(state.buyPrice)} 
          />
          <MetricRow 
            label="Cash Needed" 
            value={formatCurrency(metrics.cashNeeded)} 
          />
          <MetricRow 
            label="Deal Gap" 
            value={formatPercentWithSign(metrics.dealGap)} 
            valueColor={metrics.dealGap >= 0 ? profitColor : lossColor}
          />
          <MetricRow 
            label="Annual Profit" 
            value={formatCurrency(metrics.annualProfit)} 
            valueColor={metrics.annualProfit >= 0 ? profitColor : lossColor}
          />
          <MetricRow 
            label="CAP Rate" 
            value={formatPercent(metrics.capRate)} 
          />
          <MetricRow 
            label="COC Return" 
            value={formatPercent(metrics.cocReturn)} 
          />
        </div>

        {/* Right: 2 Score Badges */}
        <div className="flex flex-col items-center justify-center pl-4 ml-2 border-l border-white/10 min-w-[80px]">
          <ScoreBadge 
            type="dealScore" 
            score={metrics.dealScore} 
            size="medium" 
          />
          <div className="h-3" />
          <ScoreBadge 
            type="profitQuality" 
            grade={profitGrade} 
            size="medium" 
          />
        </div>
      </div>
    </div>
  )
}

export default MetricsHeader
