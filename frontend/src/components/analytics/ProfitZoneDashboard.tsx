'use client'

/**
 * ProfitZoneDashboard - Three-column profit/loss visualization
 * Combines key metrics, profit zone visualizer, and actionable tips
 * 
 * Layout:
 * [LEFT: Stacked Metrics] [CENTER: Profit Zone Gradient] [RIGHT: Tips & Actions]
 */

import React from 'react'
import { formatCompactCurrency, formatPercent } from '@/utils/formatters'

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
  incomeValue: number
  listPrice: number
  tips: ProfitZoneTip[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================


const getDealScoreLabel = (score: number): string => {
  if (score >= 90) return 'Strong Opportunity'
  if (score >= 80) return 'Good Opportunity'
  if (score >= 65) return 'Moderate Opportunity'
  if (score >= 50) return 'Marginal Opportunity'
  if (score >= 30) return 'Unlikely Opportunity'
  return 'Pass'
}

const getDealScoreColor = (score: number): string => {
  if (score >= 70) return 'text-[var(--status-positive)]'
  if (score >= 50) return 'text-[var(--status-warning)]'
  return 'text-[var(--status-negative)]'
}

const getValueColor = (value: number, goodThreshold: number, okThreshold: number): string => {
  if (value >= goodThreshold) return 'text-[var(--status-positive)]'
  if (value >= okThreshold) return 'text-[var(--status-warning)]'
  return 'text-[var(--status-negative)]'
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

function MetricBox({ label, value, sublabel, valueColorClass = 'text-[var(--status-positive)]' }: MetricBoxProps) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-center shadow-sm">
      <div className="text-[8px] font-semibold tracking-wider text-[var(--text-label)] uppercase">
        {label}
      </div>
      <div className={`text-base font-bold ${valueColorClass} leading-tight`}>
        {value}
      </div>
      <div className="text-[8px] text-[var(--text-label)]">
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
  incomeValue: number
  listPrice: number
}

function ProfitZoneVisualizer({ projectedProfit, incomeValue, listPrice }: ProfitZoneVisualizerProps) {
  // Calculate position of the profit indicator (0 = bottom/loss, 100 = top/max profit)
  const maxProfit = listPrice * 0.5
  const profitPosition = Math.min(Math.max((projectedProfit / maxProfit) * 100, 15), 85)
  
  const isProfit = projectedProfit > 0
  
  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="text-[9px] font-semibold tracking-wider text-[var(--text-label)] uppercase mb-1">
        PROJECTED OUTCOME
      </div>
      
      {/* Profit Zone Badge */}
      <div className="flex items-center gap-1 mb-2">
        <span className={`text-sm ${isProfit ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
          {isProfit ? '↗' : '↘'}
        </span>
        <span className={`text-[11px] font-bold tracking-wide ${isProfit ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
          {isProfit ? 'PROFIT ZONE' : 'LOSS ZONE'}
        </span>
      </div>
      
      {/* Gradient Bar - Fixed Height */}
      <div className="relative w-24 h-44 mx-auto">
        <div 
          className="absolute inset-0 rounded-xl shadow-inner"
          style={{
            background: 'linear-gradient(to bottom, var(--status-positive) 0%, var(--color-green-dim) 100%)'
          }}
        >
          {/* Profit Value Badge */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md shadow-md z-10 ${
              isProfit ? 'bg-[var(--status-positive)]' : 'bg-[var(--status-negative)]'
            }`}
            style={{ top: `${Math.max(10, 100 - profitPosition)}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-[var(--text-inverse)] text-xs font-bold whitespace-nowrap">
              {formatCompactCurrency(projectedProfit)}
            </span>
          </div>
        </div>
        
        {/* Income Value Line - Below the bar */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <div className="w-20 border-t-2 border-dashed border-[var(--border-default)]" />
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[8px] font-medium text-[var(--text-label)]">
            INCOME VALUE {formatCompactCurrency(incomeValue)}
          </span>
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
  success: { border: 'border-l-[var(--status-positive)]', text: 'text-[var(--status-positive)]' },
  warning: { border: 'border-l-[var(--status-warning)]', text: 'text-[var(--status-warning)]' },
  danger: { border: 'border-l-[var(--status-negative)]', text: 'text-[var(--status-negative)]' },
  tip: { border: 'border-l-[var(--status-info)]', text: 'text-[var(--status-info)]' },
  action: { border: 'border-l-[var(--accent-brand-blue)]', text: 'text-[var(--accent-brand-blue)]' },
}

function TipsSection({ tips }: TipsSectionProps) {
  return (
    <div className="flex flex-col">
      <div className="text-[9px] font-semibold tracking-wider text-[var(--text-label)] uppercase mb-2">
        HELPFUL TIPS
      </div>
      
      <div className="space-y-1.5">
        {tips.slice(0, 3).map((tip, index) => {
          const colors = TIP_COLORS[tip.type] || TIP_COLORS.tip
          return (
            <div 
              key={index} 
              className={`flex items-start gap-2 p-2 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] border-l-[3px] shadow-sm ${colors.border}`}
            >
              <span className="text-xs">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-semibold leading-tight ${colors.text}`}>
                  {tip.title}
                </div>
                {tip.description && (
                  <div className="text-[9px] text-[var(--text-secondary)] leading-snug">
                    {tip.description}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* What's Next Section */}
      <div className="mt-2 p-2 rounded-lg bg-[var(--surface-section)] border border-[var(--border-subtle)]">
        <div className="text-[10px] font-bold text-[var(--status-info)] mb-0.5">
          📋 What&apos;s Next
        </div>
        <div className="text-[9px] text-[var(--text-body)] leading-snug">
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
  incomeValue,
  listPrice,
  tips,
}: ProfitZoneDashboardProps) {
  const { buyPrice, cashNeeded, monthlyCashFlow, cashOnCash, capRate, dealScore } = metrics
  const scoreLabel = getDealScoreLabel(dealScore)
  const scoreColorClass = getDealScoreColor(dealScore)
  
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm">
      {/* Three Column Horizontal Layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start min-h-[280px]">
        
        {/* LEFT COLUMN: Metrics Stack (2x3 grid) */}
        <div className="grid grid-cols-2 gap-1.5">
          <MetricBox 
            label="BUY PRICE" 
            value={formatCompactCurrency(buyPrice)} 
            sublabel="Target" 
          />
          <MetricBox 
            label="CASH NEEDED" 
            value={formatCompactCurrency(cashNeeded)} 
            sublabel="Negotiated" 
          />
          <MetricBox 
            label="CASH FLOW" 
            value={formatCompactCurrency(monthlyCashFlow)} 
            sublabel="Est. Monthly" 
            valueColorClass={monthlyCashFlow >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}
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
        
        {/* CENTER COLUMN: Profit Zone Visualizer */}
        <div className="flex justify-center">
          <ProfitZoneVisualizer 
            projectedProfit={projectedProfit}
            incomeValue={incomeValue}
            listPrice={listPrice}
          />
        </div>
        
        {/* RIGHT COLUMN: Tips & What's Next */}
        <div>
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
