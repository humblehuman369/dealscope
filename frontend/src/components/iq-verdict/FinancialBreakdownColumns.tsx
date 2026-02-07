'use client'

/**
 * FinancialBreakdownColumns Component
 * 
 * 3-column side-by-side layout for financial breakdown:
 * - Purchase Terms | Rental Income | Expenses
 * - Each column has "Adjust →" link
 * - "Expand All" toggle in header
 */

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/utils/formatters'

interface FinancialBreakdownColumnsProps {
  // Purchase Terms
  targetBuyPrice: number
  downPayment: number
  downPaymentPct: number
  loanAmount: number
  interestRate: number
  loanTermYears: number
  
  // Rental Income
  monthlyRent: number
  vacancyRate: number
  vacancyAmount: number
  effectiveIncome: number
  otherIncome?: number
  
  // Expenses
  propertyTaxes: number
  insurance: number
  repairsCapex: number
  management?: number
  hoa?: number
  totalExpenses: number
  
  onAdjustPurchase?: () => void
  onAdjustIncome?: () => void
  onAdjustExpenses?: () => void
}

export function FinancialBreakdownColumns({
  targetBuyPrice,
  downPayment,
  downPaymentPct,
  loanAmount,
  interestRate,
  loanTermYears,
  monthlyRent,
  vacancyRate,
  vacancyAmount,
  effectiveIncome,
  otherIncome = 0,
  propertyTaxes,
  insurance,
  repairsCapex,
  management = 0,
  hoa = 0,
  totalExpenses,
  onAdjustPurchase,
  onAdjustIncome,
  onAdjustExpenses,
}: FinancialBreakdownColumnsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
        <h3 className="text-base font-semibold text-[#0A1628]">Financial Breakdown</h3>
        <button 
          className="flex items-center gap-1.5 text-[#0891B2] text-sm font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
          {isExpanded ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-3 divide-x divide-[#E2E8F0]">
        {/* Column 1: Purchase Terms */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#0891B2] uppercase tracking-wide">
              Purchase Terms
            </span>
            <button 
              className="text-[11px] text-[#64748B] hover:text-[#0891B2] transition-colors cursor-pointer bg-transparent border-none"
              onClick={onAdjustPurchase}
            >
              Adjust →
            </button>
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Target Buy Price</span>
              <span className="text-sm font-semibold text-[#0891B2]">{formatCurrency(targetBuyPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Down Payment</span>
              <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(downPayment)}</span>
            </div>
            {isExpanded && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">Down Payment %</span>
                  <span className="text-sm font-medium text-[#0A1628]">{formatPercent(downPaymentPct)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">Loan Amount</span>
                  <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">Interest Rate</span>
                  <span className="text-sm font-medium text-[#0A1628]">{formatPercent(interestRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">Loan Term</span>
                  <span className="text-sm font-medium text-[#0A1628]">{loanTermYears} years</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 2: Rental Income */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#0891B2] uppercase tracking-wide">
              Rental Income
            </span>
            <button 
              className="text-[11px] text-[#64748B] hover:text-[#0891B2] transition-colors cursor-pointer bg-transparent border-none"
              onClick={onAdjustIncome}
            >
              Adjust →
            </button>
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Monthly Rent</span>
              <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(monthlyRent)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Vacancy ({vacancyRate}%)</span>
              <span className="text-sm font-medium text-[#E11D48]">-{formatCurrency(vacancyAmount)}</span>
            </div>
            {isExpanded && otherIncome > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#475569]">Other Income</span>
                <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(otherIncome)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
              <span className="text-sm font-medium text-[#475569]">Effective Income</span>
              <span className="text-sm font-semibold text-[#10B981]">{formatCurrency(effectiveIncome)}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Expenses */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#0891B2] uppercase tracking-wide">
              Expenses
            </span>
            <button 
              className="text-[11px] text-[#64748B] hover:text-[#0891B2] transition-colors cursor-pointer bg-transparent border-none"
              onClick={onAdjustExpenses}
            >
              Adjust →
            </button>
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Property Taxes</span>
              <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(propertyTaxes / 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#475569]">Insurance</span>
              <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(insurance / 12)}</span>
            </div>
            {isExpanded && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">Repairs & CapEx</span>
                  <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(repairsCapex / 12)}</span>
                </div>
                {management > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#475569]">Management</span>
                    <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(management / 12)}</span>
                  </div>
                )}
                {hoa > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#475569]">HOA</span>
                    <span className="text-sm font-medium text-[#0A1628]">{formatCurrency(hoa / 12)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
              <span className="text-sm font-medium text-[#475569]">Total Expenses</span>
              <span className="text-sm font-semibold text-[#0A1628]">{formatCurrency(totalExpenses / 12)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinancialBreakdownColumns
