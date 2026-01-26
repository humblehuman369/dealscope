/**
 * MetricsHeader - Premium header with key metrics and score badges
 * Features: Better spacing, visual hierarchy, gradient accents
 */

'use client'

import React from 'react'
import { MetricsHeaderProps } from './types'
import { ScoreBadge } from './ScoreBadge'

// =============================================================================
// FORMATTERS
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 1,
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
// METRIC ITEM
// =============================================================================

interface MetricItemProps {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative'
}

function MetricItem({ label, value, variant = 'default' }: MetricItemProps) {
  const valueColors = {
    default: 'text-white',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
  }

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[13px] text-white/50 font-medium">{label}</span>
      <span className={`text-[15px] font-bold tabular-nums ${valueColors[variant]}`}>
        {value}
      </span>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MetricsHeader({ state, metrics }: MetricsHeaderProps) {
  const profitGrade = getProfitQualityGrade(metrics.cocReturn)

  return (
    <div className="bg-gradient-to-b from-[#0A1628] to-[#0d1d35]">
      {/* Title Row */}
      <div className="flex justify-center items-center gap-3 pt-3 pb-4">
        <span className="text-[22px] font-black text-white tracking-wide">DEAL</span>
        <span className="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 tracking-wide">
          MAKER
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

      {/* Metrics + Badges Grid */}
      <div className="px-4 md:px-6 py-4">
        <div className="flex gap-4">
          {/* Left: Metrics Grid (2 columns on mobile) */}
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <MetricItem 
              label="Buy Price" 
              value={formatCurrency(state.buyPrice)} 
            />
            <MetricItem 
              label="Cash Needed" 
              value={formatCurrency(metrics.cashNeeded)} 
            />
            <MetricItem 
              label="Deal Gap" 
              value={formatPercentWithSign(metrics.dealGap)} 
              variant={metrics.dealGap >= 0 ? 'positive' : 'negative'}
            />
            <MetricItem 
              label="Annual Profit" 
              value={formatCurrency(metrics.annualProfit)} 
              variant={metrics.annualProfit >= 0 ? 'positive' : 'negative'}
            />
            <MetricItem 
              label="CAP Rate" 
              value={formatPercent(metrics.capRate)} 
            />
            <MetricItem 
              label="COC Return" 
              value={formatPercent(metrics.cocReturn)} 
              variant={metrics.cocReturn >= 0.08 ? 'positive' : metrics.cocReturn < 0 ? 'negative' : 'default'}
            />
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-white/10 self-stretch" />

          {/* Right: Score Badges */}
          <div className="flex flex-col items-center justify-center gap-3 pl-2 min-w-[72px]">
            <ScoreBadge 
              type="dealScore" 
              score={metrics.dealScore} 
              size="medium" 
            />
            <ScoreBadge 
              type="profitQuality" 
              grade={profitGrade} 
              size="medium" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsHeader
