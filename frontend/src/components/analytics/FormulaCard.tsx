'use client'

import React from 'react'
import { FormulaCardData, FormulaRow } from './types'

/**
 * FormulaCard Component
 * 
 * Displays a breakdown of calculations showing the math behind key metrics.
 * Used for showing capital stacks, refinance analysis, 70% rule, etc.
 * 
 * Features:
 * - Labeled rows with values
 * - Color-coded positive/negative values
 * - Total row with emphasis
 */

interface FormulaCardProps {
  data: FormulaCardData
}

export function FormulaCard({ data }: FormulaCardProps) {
  return (
    <div className="bg-blue-500/[0.08] border border-blue-500/15 rounded-xl p-3.5 mb-3.5">
      {/* Title */}
      <h4 className="text-[0.65rem] font-bold text-teal uppercase tracking-wide mb-2.5">
        {data.title}
      </h4>

      {/* Rows */}
      <div className="space-y-0">
        {data.rows.map((row, index) => (
          <FormulaRowComponent key={index} row={row} />
        ))}
      </div>
    </div>
  )
}

interface FormulaRowComponentProps {
  row: FormulaRow
}

function FormulaRowComponent({ row }: FormulaRowComponentProps) {
  const isTotal = row.isTotal

  // Value color classes
  const getValueClasses = () => {
    if (row.isPositive) return 'text-green-500'
    if (row.isNegative) return 'text-red-500'
    if (isTotal) return 'text-teal font-bold'
    return 'text-white font-semibold'
  }

  // Label classes
  const getLabelClasses = () => {
    if (isTotal) return 'text-white font-bold'
    return 'text-white/60'
  }

  // Row wrapper classes
  const getRowClasses = () => {
    if (isTotal) {
      return 'border-t border-white/10 mt-1.5 pt-2'
    }
    return ''
  }

  return (
    <div className={`flex justify-between py-1 text-[0.78rem] ${getRowClasses()}`}>
      <span className={getLabelClasses()}>{row.label}</span>
      <span className={getValueClasses()}>{row.value}</span>
    </div>
  )
}

/**
 * Helper function to create a capital stack formula
 */
export function createCapitalStackFormula(
  purchasePrice: number,
  rehabCost: number,
  closingCosts: number
): FormulaCardData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const allInCost = purchasePrice + rehabCost + closingCosts

  return {
    title: 'Capital Stack at IQ Target',
    rows: [
      { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
      { label: '+ Rehab Costs', value: formatCurrency(rehabCost) },
      { label: '+ Closing/Holding', value: formatCurrency(closingCosts) },
      { label: '= All-In Cost', value: formatCurrency(allInCost), isTotal: true }
    ]
  }
}

/**
 * Helper function to create a refinance analysis formula
 */
export function createRefinanceFormula(
  arv: number,
  ltv: number,
  allInCost: number
): FormulaCardData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const refiAmount = arv * ltv
  const cashOutSurplus = refiAmount - allInCost

  return {
    title: 'Refinance Analysis',
    rows: [
      { label: 'After Repair Value', value: formatCurrency(arv) },
      { label: `× ${Math.round(ltv * 100)}% LTV`, value: formatCurrency(refiAmount) },
      { label: '− All-In Cost', value: `-${formatCurrency(allInCost)}`, isNegative: true },
      { 
        label: '= Cash Out Surplus', 
        value: cashOutSurplus >= 0 ? `+${formatCurrency(cashOutSurplus)}` : formatCurrency(cashOutSurplus),
        isTotal: true,
        isPositive: cashOutSurplus >= 0,
        isNegative: cashOutSurplus < 0
      }
    ]
  }
}

/**
 * Helper function to create a 70% rule formula (for wholesale)
 */
export function create70PercentRuleFormula(
  arv: number,
  rehabCost: number,
  investorProfit: number
): FormulaCardData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const arvMultiple = arv * 0.70
  const mao = arvMultiple - rehabCost - investorProfit

  return {
    title: '70% Rule Formula',
    rows: [
      { label: 'ARV × 70%', value: formatCurrency(arvMultiple) },
      { label: '− Repair Costs', value: `−${formatCurrency(rehabCost)}`, isNegative: true },
      { label: '− End Buyer Profit', value: `−${formatCurrency(investorProfit)}`, isNegative: true },
      { label: '= MAO (End Buyer Pays)', value: formatCurrency(mao), isTotal: true }
    ]
  }
}

/**
 * Helper function to create wholesale math formula
 */
export function createWholesaleMathFormula(
  mao: number,
  contractPrice: number
): FormulaCardData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const assignmentFee = mao - contractPrice

  return {
    title: 'Your Wholesale Math',
    rows: [
      { label: 'End Buyer Pays (MAO)', value: formatCurrency(mao) },
      { label: '− Your Contract Price', value: `−${formatCurrency(contractPrice)}`, isNegative: true },
      { 
        label: '= Your Assignment Fee', 
        value: formatCurrency(assignmentFee),
        isTotal: true,
        isPositive: true
      }
    ]
  }
}

/**
 * Helper function to create flip P&L formula
 */
export function createFlipPLFormula(
  arv: number,
  purchasePrice: number,
  rehabCost: number,
  holdingCosts: number,
  sellingCosts: number
): FormulaCardData {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const totalCosts = purchasePrice + rehabCost + holdingCosts + sellingCosts
  const netProfit = arv - totalCosts

  return {
    title: 'Fix & Flip P&L',
    rows: [
      { label: 'Sale Price (ARV)', value: formatCurrency(arv) },
      { label: '− Purchase Price', value: `−${formatCurrency(purchasePrice)}`, isNegative: true },
      { label: '− Rehab Costs', value: `−${formatCurrency(rehabCost)}`, isNegative: true },
      { label: '− Holding Costs', value: `−${formatCurrency(holdingCosts)}`, isNegative: true },
      { label: '− Selling Costs', value: `−${formatCurrency(sellingCosts)}`, isNegative: true },
      { 
        label: '= Net Profit', 
        value: netProfit >= 0 ? formatCurrency(netProfit) : `−${formatCurrency(Math.abs(netProfit))}`,
        isTotal: true,
        isPositive: netProfit >= 0,
        isNegative: netProfit < 0
      }
    ]
  }
}

export default FormulaCard
