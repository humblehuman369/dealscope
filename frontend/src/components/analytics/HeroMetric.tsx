'use client'

import React from 'react'
import { HeroMetricData, MetricVariant } from './types'

/**
 * HeroMetric Component
 * 
 * Displays a single large metric prominently.
 * Used for key performance indicators like Net Cash Flow, 10-Year ROI, etc.
 * 
 * Variants:
 * - success (green): Positive metrics
 * - warning (yellow): Metrics requiring attention
 * - danger (red): Negative or risky metrics
 * - default (teal): Standard metrics
 */

interface HeroMetricProps {
  data: HeroMetricData
}

export function HeroMetric({ data }: HeroMetricProps) {
  const variant = data.variant || 'success'
  
  const getColorClasses = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-green-500/15 to-emerald-500/10',
          border: 'border-green-500/25',
          value: 'text-green-500',
          badge: 'bg-green-500/20 text-green-500'
        }
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-yellow-500/15 to-amber-500/10',
          border: 'border-yellow-500/25',
          value: 'text-yellow-500',
          badge: 'bg-yellow-500/20 text-yellow-500'
        }
      case 'danger':
        return {
          bg: 'bg-gradient-to-br from-red-500/15 to-rose-500/10',
          border: 'border-red-500/25',
          value: 'text-red-500',
          badge: 'bg-red-500/20 text-red-500'
        }
      case 'default':
      default:
        return {
          bg: 'bg-gradient-to-br from-teal/15 to-cyan-500/10',
          border: 'border-teal/25',
          value: 'text-teal',
          badge: 'bg-teal/20 text-teal'
        }
    }
  }

  const colors = getColorClasses()

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-2xl p-4 text-center mb-3.5`}>
      {/* Label */}
      <div className="text-[0.65rem] font-semibold text-white/50 uppercase tracking-wide mb-1">
        {data.label}
      </div>

      {/* Value */}
      <div className={`text-[1.8rem] font-extrabold ${colors.value} leading-tight`}>
        {data.value}
      </div>

      {/* Subtitle */}
      {data.subtitle && (
        <div className="text-[0.72rem] text-white/50 mt-0.5">
          {data.subtitle}
        </div>
      )}

      {/* Badge */}
      {data.badge && (
        <div className={`inline-block px-2.5 py-1 ${colors.badge} text-[0.65rem] font-bold rounded-lg mt-2`}>
          {data.badge}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to create cash flow hero
 */
export function createCashFlowHero(
  monthlyCashFlow: number,
  annualCashFlow: number,
  cashOnCash: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return {
    label: 'Net Cash Flow at IQ Target',
    value: `${formatCurrency(monthlyCashFlow)}/mo`,
    subtitle: `${formatCurrency(annualCashFlow)} annually · ${(cashOnCash * 100).toFixed(1)}% CoC`,
    variant: monthlyCashFlow > 0 ? 'success' : 'danger'
  }
}

/**
 * Helper function to create 10-year ROI hero
 */
export function create10YearROIHero(
  roiPercent: number,
  initialInvestment: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return {
    label: '10-Year ROI',
    value: `${Math.round(roiPercent)}%`,
    subtitle: `On initial ${formatCurrency(initialInvestment)} investment`,
    variant: 'success'
  }
}

/**
 * Helper function to create cash recovery hero (BRRRR)
 */
export function createCashRecoveryHero(
  recoveryPercent: number,
  cashLeftInDeal: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const isFullRecovery = recoveryPercent >= 100

  return {
    label: 'Cash Recovery at Refinance',
    value: `${Math.round(recoveryPercent)}%`,
    subtitle: isFullRecovery 
      ? `${formatCurrency(cashLeftInDeal)} left in deal · Infinite returns`
      : `${formatCurrency(cashLeftInDeal)} still invested`,
    variant: recoveryPercent >= 100 ? 'success' : recoveryPercent >= 80 ? 'default' : 'warning'
  }
}

/**
 * Helper function to create housing cost hero (House Hack)
 */
export function createHousingCostHero(
  effectiveCost: number,
  marketRent: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const isFree = effectiveCost <= 0
  const savings = marketRent - effectiveCost

  return {
    label: 'Your Housing Cost',
    value: isFree ? '$0/mo' : `${formatCurrency(effectiveCost)}/mo`,
    subtitle: `Save ${formatCurrency(savings)}/mo vs renting`,
    variant: isFree ? 'success' : effectiveCost < marketRent * 0.5 ? 'success' : 'default'
  }
}

/**
 * Helper function to create assignment fee hero (Wholesale)
 */
export function createAssignmentFeeHero(
  fee: number,
  roi: number,
  cashAtRisk: number,
  timelineDays: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return {
    label: 'Assignment Fee',
    value: formatCurrency(fee),
    subtitle: `${Math.round(roi)}% ROI · ${timelineDays} days · ${formatCurrency(cashAtRisk)} at risk`,
    variant: fee >= 10000 ? 'success' : fee >= 5000 ? 'default' : 'warning'
  }
}

/**
 * Helper function to create flip profit hero
 */
export function createFlipProfitHero(
  netProfit: number,
  roi: number,
  holdingMonths: number
): HeroMetricData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return {
    label: 'Net Profit',
    value: formatCurrency(netProfit),
    subtitle: `${Math.round(roi * 100)}% ROI · ${holdingMonths} months`,
    variant: netProfit > 0 ? 'success' : 'danger'
  }
}

/**
 * HeroMetricCompact Component
 * 
 * A smaller version for grid layouts.
 */

interface HeroMetricCompactProps {
  label: string
  value: string
  variant?: MetricVariant
}

export function HeroMetricCompact({ label, value, variant = 'default' }: HeroMetricCompactProps) {
  const getValueColor = () => {
    switch (variant) {
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'danger': return 'text-red-500'
      default: return 'text-teal'
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
      <div className={`text-lg font-bold ${getValueColor()}`}>{value}</div>
      <div className="text-[0.6rem] text-white/50 uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default HeroMetric
