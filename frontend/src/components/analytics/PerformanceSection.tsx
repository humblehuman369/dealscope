'use client'

import React from 'react'
import { HelpCircle } from 'lucide-react'
import { PerformanceRow } from './types'

/**
 * PerformanceSection Component
 * 
 * Displays a series of label/value rows in a bordered section.
 * Used for Monthly Breakdown, 10-Year Projections, Cash Flow Details, etc.
 * 
 * Features:
 * - Section title
 * - Alternating row backgrounds (optional)
 * - Highlighted total rows
 * - Help icons with tooltips
 */

interface PerformanceSectionProps {
  title: string
  rows: PerformanceRow[]
  variant?: 'default' | 'highlight' | 'compact'
  showDividers?: boolean
}

export function PerformanceSection({ 
  title, 
  rows, 
  variant = 'default',
  showDividers = true 
}: PerformanceSectionProps) {
  const getContainerClasses = () => {
    switch (variant) {
      case 'highlight':
        return 'bg-teal/[0.06] border-teal/20'
      case 'compact':
        return 'bg-white/[0.01] border-white/[0.04]'
      default:
        return 'bg-white/[0.02] border-white/[0.06]'
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden mb-3.5 ${getContainerClasses()}`}>
      {/* Header */}
      <div className="bg-white/[0.03] px-3 py-2">
        <h4 className="text-[0.68rem] font-bold text-white/60 uppercase tracking-wide">
          {title}
        </h4>
      </div>

      {/* Rows */}
      <div className="px-3">
        {rows.map((row, index) => (
          <PerformanceRowComponent 
            key={index} 
            row={row}
            showDivider={showDividers && index < rows.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

interface PerformanceRowComponentProps {
  row: PerformanceRow
  showDivider: boolean
}

function PerformanceRowComponent({ row, showDivider }: PerformanceRowComponentProps) {
  const getValueClasses = () => {
    if (row.isPositive) return 'text-green-500 font-bold'
    if (row.isNegative) return 'text-red-500/80'
    if (row.isHighlight) return 'text-teal font-bold'
    return 'text-white font-medium'
  }

  const getLabelClasses = () => {
    if (row.isHighlight) return 'text-white font-semibold'
    return 'text-white/60'
  }

  const rowClasses = row.isHighlight 
    ? 'bg-white/[0.02] -mx-3 px-3 py-2 mt-1'
    : 'py-1.5'

  return (
    <div className={`flex justify-between items-center ${rowClasses} ${showDivider && !row.isHighlight ? 'border-b border-white/[0.04]' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className={`text-[0.78rem] ${getLabelClasses()}`}>
          {row.label}
        </span>
        {row.hasHelp && (
          <HelpCircle className="w-3 h-3 text-white/30 cursor-help" />
        )}
      </div>
      <span className={`text-[0.78rem] ${getValueClasses()}`}>
        {row.value}
      </span>
    </div>
  )
}

/**
 * Helper function to create monthly breakdown rows (LTR)
 */
export function createMonthlyBreakdown(
  grossRent: number,
  vacancy: number,
  management: number,
  maintenance: number,
  insurance: number,
  taxes: number,
  piti: number,
  netCashFlow: number
): PerformanceRow[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return [
    { label: 'Gross Rent', value: formatCurrency(grossRent), isPositive: true },
    { label: '− Vacancy', value: `−${formatCurrency(vacancy)}`, isNegative: true },
    { label: '− Management', value: `−${formatCurrency(management)}`, isNegative: true },
    { label: '− Maintenance', value: `−${formatCurrency(maintenance)}`, isNegative: true },
    { label: '− Insurance', value: `−${formatCurrency(insurance)}`, isNegative: true },
    { label: '− Property Taxes', value: `−${formatCurrency(taxes)}`, isNegative: true },
    { label: '− PITI (Mortgage)', value: `−${formatCurrency(piti)}`, isNegative: true },
    { label: 'Net Cash Flow', value: formatCurrency(netCashFlow), isHighlight: true, isPositive: netCashFlow > 0 }
  ]
}

/**
 * Helper function to create 10-year projection rows
 */
export function create10YearProjection(
  totalCashFlow: number,
  totalPrincipalPaid: number,
  propertyAppreciation: number,
  totalEquityBuilt: number,
  roi: number
): PerformanceRow[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return [
    { label: 'Total Cash Flow', value: formatCurrency(totalCashFlow), isPositive: true },
    { label: 'Principal Paid Down', value: formatCurrency(totalPrincipalPaid), isPositive: true },
    { label: 'Property Appreciation', value: formatCurrency(propertyAppreciation), isPositive: true },
    { label: 'Total Equity Built', value: formatCurrency(totalEquityBuilt), isHighlight: true },
    { label: '10-Year ROI', value: `${Math.round(roi)}%`, isHighlight: true }
  ]
}

/**
 * Helper function to create STR income breakdown
 */
export function createSTRIncomeBreakdown(
  grossNightly: number,
  occupancy: number,
  grossMonthly: number,
  cleaningFees: number,
  platformFees: number,
  utilities: number,
  supplies: number,
  netIncome: number
): PerformanceRow[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return [
    { label: 'Average Nightly Rate', value: formatCurrency(grossNightly) },
    { label: `Occupancy (${Math.round(occupancy * 100)}%)`, value: '' },
    { label: 'Gross Monthly Revenue', value: formatCurrency(grossMonthly), isPositive: true },
    { label: '− Cleaning Fees', value: `−${formatCurrency(cleaningFees)}`, isNegative: true },
    { label: '− Platform Fees (15%)', value: `−${formatCurrency(platformFees)}`, isNegative: true },
    { label: '− Utilities', value: `−${formatCurrency(utilities)}`, isNegative: true },
    { label: '− Supplies', value: `−${formatCurrency(supplies)}`, isNegative: true },
    { label: 'Net Operating Income', value: formatCurrency(netIncome), isHighlight: true, isPositive: netIncome > 0 }
  ]
}

/**
 * PerformanceSectionGrid Component
 * 
 * A 2-column grid variant for compact layouts.
 */

interface PerformanceSectionGridProps {
  title: string
  items: { label: string; value: string }[]
}

export function PerformanceSectionGrid({ title, items }: PerformanceSectionGridProps) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 mb-3.5">
      <h4 className="text-[0.68rem] font-bold text-white/60 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div key={index} className="text-center p-2 bg-white/[0.02] rounded-lg">
            <div className="text-[0.85rem] font-bold text-teal">{item.value}</div>
            <div className="text-[0.55rem] text-white/50 uppercase">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PerformanceSection
