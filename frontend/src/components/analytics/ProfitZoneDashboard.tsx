'use client'

/**
 * ProfitZoneDashboard - Three-column profit/loss visualization
 * Combines key metrics, profit zone visualizer, and actionable tips
 * 
 * Layout:
 * [LEFT: Stacked Metrics] [CENTER: Profit Zone Gradient] [RIGHT: Tips & Actions]
 */

import React, { useMemo } from 'react'

// ============================================
// TYPES
// ============================================

export interface ProfitZoneMetrics {
  buyPrice: number
  cashNeeded: number
  monthlyCashFlow: number
  cashOnCash: number  // As percentage (e.g., 4.4 for 4.4%)
  capRate: number     // As percentage
  dealScore: number
}

export interface ProfitZoneTip {
  type: 'success' | 'warning' | 'danger' | 'tip' | 'action'
  icon: string
  title: string
  description?: string
}

export interface ProfitZoneDashboardProps {
  metrics: ProfitZoneMetrics
  projectedProfit: number
  breakevenPrice: number
  listPrice: number
  tips: ProfitZoneTip[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCompact = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`
  }
  return formatCurrency(value)
}

const formatPercent = (value: number): string => `${value.toFixed(1)}%`

const getDealScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 50) return 'Average'
  if (score >= 40) return 'Fair'
  return 'Weak'
}

const getDealScoreColor = (score: number): string => {
  if (score >= 70) return 'text-green-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

const getValueColor = (value: number, goodThreshold: number, okThreshold: number): string => {
  if (value >= goodThreshold) return 'text-green-500'
  if (value >= okThreshold) return 'text-amber-500'
  return 'text-red-500'
}

// ============================================
// METRIC BOX COMPONENT
// ============================================

interface MetricBoxProps {
  label: string
  value: string
  sublabel: string
  valueColorClass?: string
}

function MetricBox({ label, value, sublabel, valueColorClass = 'text-green-500' }: MetricBoxProps) {
  return (
    <div className="bg-white/5 dark:bg-white/[0.03] border border-slate-200/20 dark:border-white/[0.08] rounded-xl p-3 text-center">
      <div className="text-[9px] font-semibold tracking-wide text-slate-500 dark:text-white/50 uppercase mb-1">
        {label}
      </div>
      <div className={`text-lg font-extrabold ${valueColorClass}`}>
        {value}
      </div>
      <div className="text-[9px] text-slate-400 dark:text-white/40 mt-0.5">
        {sublabel}
      </div>
    </div>
  )
}

// ============================================
// PROFIT ZONE VISUALIZER COMPONENT
// ============================================

interface ProfitZoneVisualizerProps {
  projectedProfit: number
  breakevenPrice: number
  listPrice: number
}

function ProfitZoneVisualizer({ projectedProfit, breakevenPrice, listPrice }: ProfitZoneVisualizerProps) {
  // Calculate position of the profit indicator (0 = bottom/loss, 100 = top/max profit)
  const maxProfit = listPrice * 0.5
  const profitPosition = Math.min(Math.max((projectedProfit / maxProfit) * 100, 5), 95)
  
  // Breakeven position on the scale
  const breakevenPosition = Math.min(Math.max((breakevenPrice / listPrice) * 50, 10), 90)
  
  const isProfit = projectedProfit > 0
  
  return (
    <div className="flex flex-col items-center h-full">
      {/* Header */}
      <div className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-white/60 mb-1.5">
        PROJECTED OUTCOME
      </div>
      
      {/* Profit Zone Badge */}
      <div className="flex items-center gap-1 mb-3">
        <span className={isProfit ? 'text-green-500' : 'text-red-500'}>
          {isProfit ? '↗' : '↘'}
        </span>
        <span className={`text-xs font-bold tracking-wide ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
          {isProfit ? 'PROFIT ZONE' : 'LOSS ZONE'}
        </span>
      </div>
      
      {/* Gradient Bar */}
      <div className="relative flex-1 w-[70%] min-h-[180px] max-h-[220px]">
        <div 
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, #22c55e 0%, #4ade80 15%, #86efac 30%, #bbf7d0 45%, #dcfce7 60%, #f0fdf4 80%, #ffffff 100%)'
          }}
        >
          {/* Profit Value Badge */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg shadow-lg ${
              isProfit ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ top: `${100 - profitPosition}%` }}
          >
            <span className="text-white text-sm font-extrabold">
              {formatCompact(projectedProfit)}
            </span>
          </div>
          
          {/* Breakeven Line */}
          <div 
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${100 - breakevenPosition}%` }}
          >
            <div className="flex-1 border-t-2 border-dashed border-slate-400/50" />
            <span className="ml-2 text-[8px] font-semibold text-slate-500 dark:text-white/60 whitespace-nowrap">
              BREAKEVEN {formatCompact(breakevenPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TIPS SECTION COMPONENT
// ============================================

interface TipsSectionProps {
  tips: ProfitZoneTip[]
}

const TIP_COLORS: Record<string, { border: string; text: string }> = {
  success: { border: 'border-l-green-500', text: 'text-green-600 dark:text-green-400' },
  warning: { border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  danger: { border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' },
  tip: { border: 'border-l-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
  action: { border: 'border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
}

function TipsSection({ tips }: TipsSectionProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-white/60 mb-2.5">
        HELPFUL TIPS
      </div>
      
      <div className="space-y-2 flex-1">
        {tips.slice(0, 3).map((tip, index) => {
          const colors = TIP_COLORS[tip.type] || TIP_COLORS.tip
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2 p-2.5 rounded-lg bg-white/5 dark:bg-white/[0.03] border-l-[3px] ${colors.border}`}
            >
              <span className="text-sm">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-semibold ${colors.text}`}>
                  {tip.title}
                </div>
                {tip.description && (
                  <div className="text-[10px] text-slate-500 dark:text-white/60 mt-0.5 leading-tight">
                    {tip.description}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* What's Next Section */}
      <div className="mt-3 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <div className="text-[11px] font-bold text-cyan-500 mb-1">
          📋 What&apos;s Next
        </div>
        <div className="text-[10px] text-slate-600 dark:text-white/70 leading-tight">
          Review the metrics and adjust assumptions to see how they impact your returns.
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProfitZoneDashboard({
  metrics,
  projectedProfit,
  breakevenPrice,
  listPrice,
  tips,
}: ProfitZoneDashboardProps) {
  const { buyPrice, cashNeeded, monthlyCashFlow, cashOnCash, capRate, dealScore } = metrics
  const scoreLabel = getDealScoreLabel(dealScore)
  const scoreColorClass = getDealScoreColor(dealScore)
  
  return (
    <div className="bg-white/[0.02] dark:bg-white/[0.02] border border-slate-200/10 dark:border-white/[0.06] rounded-2xl p-4">
      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* LEFT COLUMN - Metrics Stack */}
        <div className="space-y-1.5">
          <MetricBox 
            label="BUY PRICE" 
            value={formatCompact(buyPrice)} 
            sublabel="Target" 
          />
          <MetricBox 
            label="CASH NEEDED" 
            value={formatCompact(cashNeeded)} 
            sublabel="Negotiated" 
          />
          <MetricBox 
            label="CASH FLOW" 
            value={formatCompact(monthlyCashFlow)} 
            sublabel="Est. Monthly" 
            valueColorClass={monthlyCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}
          />
          <MetricBox 
            label="CASH ON CASH" 
            value={formatPercent(cashOnCash)} 
            sublabel="Annual" 
            valueColorClass={getValueColor(cashOnCash, 8, 5)}
          />
          <MetricBox 
            label="CAP RATE" 
            value={formatPercent(capRate)} 
            sublabel="Annual" 
            valueColorClass={getValueColor(capRate, 6, 4)}
          />
          <MetricBox 
            label="Deal Score" 
            value={String(Math.round(dealScore))} 
            sublabel={scoreLabel} 
            valueColorClass={scoreColorClass}
          />
        </div>
        
        {/* CENTER COLUMN - Profit Zone Visualizer */}
        <div className="flex flex-col">
          <ProfitZoneVisualizer 
            projectedProfit={projectedProfit}
            breakevenPrice={breakevenPrice}
            listPrice={listPrice}
          />
        </div>
        
        {/* RIGHT COLUMN - Tips & What's Next */}
        <div className="flex flex-col">
          <TipsSection tips={tips} />
        </div>
        
      </div>
    </div>
  )
}

// ============================================
// HELPER: Generate Tips from Metrics
// ============================================

export function generateProfitZoneTips(metrics: ProfitZoneMetrics, projectedProfit: number): ProfitZoneTip[] {
  const tips: ProfitZoneTip[] = []
  
  // Cash flow tip
  if (metrics.monthlyCashFlow > 500) {
    tips.push({
      type: 'success',
      icon: '💰',
      title: 'Strong cash flow',
      description: 'Monthly returns exceed typical benchmarks',
    })
  } else if (metrics.monthlyCashFlow > 0) {
    tips.push({
      type: 'tip',
      icon: '💡',
      title: 'Positive cash flow',
      description: 'Consider ways to increase rental income',
    })
  } else {
    tips.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Negative cash flow',
      description: 'This property may require additional capital each month',
    })
  }
  
  // Cash on cash tip
  if (metrics.cashOnCash >= 10) {
    tips.push({
      type: 'success',
      icon: '📈',
      title: 'Excellent CoC return',
      description: 'Above average for most markets',
    })
  } else if (metrics.cashOnCash < 5) {
    tips.push({
      type: 'warning',
      icon: '📉',
      title: 'Low CoC return',
      description: 'Consider negotiating a lower purchase price',
    })
  }
  
  // Deal score tip
  if (metrics.dealScore >= 70) {
    tips.push({
      type: 'success',
      icon: '⭐',
      title: 'Strong deal score',
      description: 'This property meets most investment criteria',
    })
  } else if (metrics.dealScore < 50) {
    tips.push({
      type: 'danger',
      icon: '🚨',
      title: 'Low deal score',
      description: 'Review assumptions carefully before proceeding',
    })
  }
  
  // Profit tip
  if (projectedProfit > 100000) {
    tips.push({
      type: 'success',
      icon: '🎯',
      title: 'High profit potential',
      description: 'Projected returns are well above target',
    })
  }
  
  // Always add an action tip
  tips.push({
    type: 'action',
    icon: '📋',
    title: 'Get pre-approval',
    description: 'Strengthen your offer with financing in place',
  })
  
  return tips.slice(0, 4) // Return max 4 tips
}

export default ProfitZoneDashboard
