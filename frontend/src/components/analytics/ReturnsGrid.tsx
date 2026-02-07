'use client'

import React from 'react'
import { CheckCircle } from 'lucide-react'
import { ReturnsData, ReturnMetric } from './types'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'

/**
 * ReturnsGrid Component
 * 
 * Displays a grid of return metrics at the IQ Buy Price.
 * Shows 4 key metrics in a 2x2 grid with a profitability badge.
 * 
 * Common metrics by strategy:
 * - LTR: Cash Flow, CoC, Cap Rate, DSCR
 * - STR: Cash Flow, CoC, Annual Revenue, Occupancy
 * - BRRRR: Cash Left, CoC (∞), Equity Created, Monthly Cash Flow
 * - Wholesale: Assignment Fee, ROI on EMD, Cash at Risk, Timeline
 */

interface ReturnsGridProps {
  /** Title for the section */
  title?: string
  /** Returns data with metrics and badge */
  data: ReturnsData
}

export function ReturnsGrid({
  title = 'Returns at IQ Target',
  data
}: ReturnsGridProps) {
  return (
    <div className="border-2 border-teal dark:border-accent-500 rounded-2xl p-4 mb-4 bg-white dark:bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[1.1rem] font-bold text-navy-900 dark:text-white flex items-center gap-1.5">
          <CheckCircle className="w-5 h-5 text-teal dark:text-accent-500" />
          {title}
        </div>
        <ReturnsBadge type={data.badgeType} text={data.badge} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {data.metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>
    </div>
  )
}

interface ReturnsBadgeProps {
  type: ReturnsData['badgeType']
  text: string
}

function ReturnsBadge({ type, text }: ReturnsBadgeProps) {
  const getClasses = () => {
    switch (type) {
      case 'profitable':
        return 'bg-green-500/20 border-green-500/30 text-green-500'
      case 'infinite':
        return 'bg-teal/20 border-teal/30 text-teal'
      case 'assignable':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500'
    }
  }

  return (
    <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-xl border ${getClasses()}`}>
      {text}
    </span>
  )
}

interface MetricCardProps {
  metric: ReturnMetric
}

function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="bg-gray-100 dark:bg-white/[0.03] rounded-xl p-3 text-center">
      <div className="text-[1.2rem] font-bold text-green-500 mb-0.5">
        {metric.value}
      </div>
      <div className="text-[0.6rem] text-gray-500 dark:text-white/50 uppercase tracking-wide">
        {metric.label}
      </div>
    </div>
  )
}

/**
 * Helper function to create LTR returns data
 */
export function createLTRReturns(
  monthlyCashFlow: number,
  cashOnCash: number,
  capRate: number,
  dscr: number
): ReturnsData {

  return {
    badge: 'PROFITABLE',
    badgeType: monthlyCashFlow > 0 ? 'profitable' : 'warning',
    metrics: [
      { value: formatCurrency(monthlyCashFlow), label: 'Monthly Cash Flow' },
      { value: `${(cashOnCash * 100).toFixed(1)}%`, label: 'Cash-on-Cash' },
      { value: `${(capRate * 100).toFixed(1)}%`, label: 'Cap Rate' },
      { value: dscr.toFixed(2), label: 'Debt Ratio' }
    ]
  }
}

/**
 * Helper function to create STR returns data
 */
export function createSTRReturns(
  monthlyCashFlow: number,
  cashOnCash: number,
  annualRevenue: number,
  occupancy: number
): ReturnsData {

  return {
    badge: 'PROFITABLE',
    badgeType: monthlyCashFlow > 0 ? 'profitable' : 'warning',
    metrics: [
      { value: formatCurrency(monthlyCashFlow), label: 'Monthly Cash Flow' },
      { value: `${(cashOnCash * 100).toFixed(1)}%`, label: 'Cash-on-Cash' },
      { value: formatCurrency(annualRevenue), label: 'Annual Revenue' },
      { value: `${Math.round(occupancy * 100)}%`, label: 'Occupancy' }
    ]
  }
}

/**
 * Helper function to create BRRRR returns data
 */
export function createBRRRRReturns(
  cashLeftInDeal: number,
  equityCreated: number,
  monthlyCashFlow: number,
  isInfiniteCOC: boolean = false
): ReturnsData {


  return {
    badge: isInfiniteCOC ? 'INFINITE CoC' : 'PROFITABLE',
    badgeType: isInfiniteCOC ? 'infinite' : 'profitable',
    metrics: [
      { value: formatCurrency(cashLeftInDeal), label: 'Cash Left in Deal' },
      { value: isInfiniteCOC ? '∞' : 'High', label: 'Cash-on-Cash' },
      { value: formatCompactCurrency(equityCreated), label: 'Equity Created' },
      { value: formatCurrency(monthlyCashFlow), label: 'Monthly Cash Flow' }
    ]
  }
}

/**
 * Helper function to create Wholesale returns data
 */
export function createWholesaleReturns(
  assignmentFee: number,
  roiOnEMD: number,
  cashAtRisk: number,
  timelineDays: number
): ReturnsData {

  return {
    badge: 'ASSIGNABLE',
    badgeType: 'assignable',
    metrics: [
      { value: formatCurrency(assignmentFee), label: 'Assignment Fee' },
      { value: `${Math.round(roiOnEMD)}%`, label: 'ROI on EMD' },
      { value: formatCurrency(cashAtRisk), label: 'Cash at Risk' },
      { value: `${timelineDays} days`, label: 'Timeline' }
    ]
  }
}

/**
 * Helper function to create House Hack returns data
 */
export function createHouseHackReturns(
  effectiveHousingCost: number,
  monthlySavings: number,
  rentalIncome: number,
  housingOffset: number
): ReturnsData {

  const isFreeHousing = effectiveHousingCost <= 0

  return {
    badge: isFreeHousing ? 'FREE HOUSING' : 'REDUCED COST',
    badgeType: isFreeHousing ? 'infinite' : 'profitable',
    metrics: [
      { value: formatCurrency(Math.abs(effectiveHousingCost)), label: isFreeHousing ? 'Monthly Profit' : 'Housing Cost' },
      { value: formatCurrency(monthlySavings), label: 'Monthly Savings' },
      { value: formatCurrency(rentalIncome), label: 'Rental Income' },
      { value: `${Math.round(housingOffset * 100)}%`, label: 'Housing Offset' }
    ]
  }
}

/**
 * ReturnsGridCompact Component
 * 
 * A single-row compact version showing key metrics inline.
 */

interface ReturnsGridCompactProps {
  metrics: ReturnMetric[]
}

export function ReturnsGridCompact({ metrics }: ReturnsGridCompactProps) {
  return (
    <div className="flex items-center justify-between border-2 border-teal dark:border-accent-500 rounded-xl p-2.5 bg-white dark:bg-transparent">
      {metrics.slice(0, 4).map((metric, index) => (
        <React.Fragment key={index}>
          <div className="text-center px-2">
            <div className="text-sm font-bold text-green-500">{metric.value}</div>
            <div className="text-[0.55rem] text-gray-500 dark:text-white/50 uppercase">{metric.label}</div>
          </div>
          {index < Math.min(metrics.length, 4) - 1 && (
            <div className="w-px h-8 bg-gray-300 dark:bg-white/10" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default ReturnsGrid
