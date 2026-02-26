'use client'

/**
 * InvestmentAnalysisNew Component
 * 
 * Clean investment analysis section with:
 * - Title + subtitle + "Change terms" + strategy dropdown
 * - "Three ways to approach this deal" + calculation link
 * - 3 price cards (Breakeven, Target Buy, Wholesale)
 * - 3-column summary metrics below (Cap Rate, Cash-on-Cash, DSCR)
 * - 3-column secondary metrics (Cash Flow, Annual NOI, Cash Needed)
 */

import React, { useState } from 'react'
import { ChevronDown, HelpCircle, Info } from 'lucide-react'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'

interface Strategy {
  short: string
  full: string
}

interface InvestmentAnalysisNewProps {
  // Financing terms
  downPaymentPct: number
  interestRate: number
  
  // Prices
  incomeValue: number
  targetBuyPrice: number
  wholesalePrice: number
  
  // Metrics
  capRate: number
  cashOnCash: number
  dscr: number
  monthlyCashFlow: number
  annualNoi: number
  cashNeeded: number
  
  // Strategy
  currentStrategy?: string
  strategies?: Strategy[]
  onStrategyChange?: (strategy: string) => void
  onChangeTerms?: () => void
}

const DEFAULT_STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
]

// Price Card Component
function PriceCard({ 
  label, 
  value, 
  description, 
  isRecommended = false 
}: { 
  label: string
  value: number
  description: string
  isRecommended?: boolean 
}) {
  return (
    <div className={`rounded-xl p-4 text-center border ${
      isRecommended 
        ? 'bg-white border-2 border-[#0EA5E9]' 
        : 'bg-[#F8FAFC] border-[#E2E8F0]'
    }`}>
      <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
        isRecommended ? 'text-[#0EA5E9]' : 'text-[#64748B]'
      }`}>
        {label}
        <HelpCircle className="w-3 h-3 text-[#E2E8F0]" />
      </div>
      <div className={`text-xl font-bold mb-1 ${isRecommended ? 'text-[#0EA5E9]' : 'text-[#0A1628]'}`}>
        {formatCurrency(value)}
      </div>
      <div className="text-[10px] text-[#94A3B8] leading-tight">{description}</div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ 
  value, 
  label, 
  isPositive = true,
  isCurrency = false,
}: { 
  value: string | number
  label: string
  isPositive?: boolean
  isCurrency?: boolean
}) {
  const displayValue = typeof value === 'number' 
    ? (isCurrency ? formatCompactCurrency(value) : value.toFixed(1) + '%')
    : value

  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-bold tabular-nums ${isPositive ? 'text-[#0EA5E9]' : 'text-[#E11D48]'}`}>
        {displayValue}
      </span>
      <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide">{label}</span>
    </div>
  )
}

export function InvestmentAnalysisNew({
  downPaymentPct,
  interestRate,
  incomeValue,
  targetBuyPrice,
  wholesalePrice,
  capRate,
  cashOnCash,
  dscr,
  monthlyCashFlow,
  annualNoi,
  cashNeeded,
  currentStrategy = 'Long-term',
  strategies = DEFAULT_STRATEGIES,
  onStrategyChange,
  onChangeTerms,
}: InvestmentAnalysisNewProps) {
  const [showCalculation, setShowCalculation] = useState(false)
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false)

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Header Section */}
      <div className="px-5 py-4">
        {/* Title Row */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="text-base font-bold text-[#0A1628]">YOUR INVESTMENT ANALYSIS</h3>
            <p className="text-xs text-[#64748B]">
              Based on YOUR financing terms ({downPaymentPct}% down, {interestRate}%)
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button 
              className="text-[#0EA5E9] text-sm font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
              onClick={onChangeTerms}
            >
              Change terms
            </button>
            {/* Strategy Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0EA5E9] text-white text-xs font-medium rounded-full cursor-pointer border-none hover:bg-[#0E7490] transition-colors"
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
              >
                {currentStrategy}
                <ChevronDown 
                  className="w-3.5 h-3.5 transition-transform" 
                  style={{ transform: showStrategyDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {showStrategyDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-50 min-w-[140px]">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.short}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F8FAFC] border-none cursor-pointer ${
                        currentStrategy === strategy.short 
                          ? 'bg-[#F0FDFA] text-[#0EA5E9] font-semibold' 
                          : 'bg-transparent text-[#475569]'
                      }`}
                      onClick={() => {
                        onStrategyChange?.(strategy.short)
                        setShowStrategyDropdown(false)
                      }}
                    >
                      {strategy.full}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calculation Info Row */}
        <div className="flex items-center justify-between mt-3 mb-4">
          <span className="text-sm text-[#64748B]">Three ways to approach this deal:</span>
          <button 
            className="flex items-center gap-1.5 text-[#0EA5E9] text-sm font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
            onClick={() => setShowCalculation(!showCalculation)}
          >
            <Info className="w-3.5 h-3.5" />
            How INCOME VALUE is calculated
          </button>
        </div>

        {/* Calculation Breakdown - Expandable */}
        {showCalculation && (
          <div className="mb-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
              Income Value Calculation
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Monthly Gross Rent</span>
                <span className="font-medium text-[#0A1628]">× 12 months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Less: Vacancy & Operating Expenses</span>
                <span className="font-medium text-[#0A1628]">= NOI</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
                <span className="text-[#64748B]">NOI ÷ Mortgage Constant</span>
                <span className="font-bold text-[#0EA5E9]">= Income Value</span>
              </div>
            </div>
          </div>
        )}

        {/* Price Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <PriceCard 
            label="Income Value" 
            value={incomeValue} 
            description="Max price for $0 cashflow (LTR model)" 
          />
          <PriceCard 
            label="Target Buy" 
            value={targetBuyPrice} 
            description="Max Price for\nPositive Cashflow" 
            isRecommended 
          />
          <PriceCard 
            label="Wholesale" 
            value={wholesalePrice} 
            description="30% discount for assignment" 
          />
        </div>

        {/* Primary Metrics Row */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-[#E2E8F0]">
          <MetricCard value={capRate} label="Cap Rate" isPositive={capRate >= 5} />
          <MetricCard value={cashOnCash} label="Cash-on-Cash" isPositive={cashOnCash >= 8} />
          <MetricCard value={dscr.toFixed(2)} label="DSCR" isPositive={dscr >= 1.2} />
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-[#E2E8F0]">
          <MetricCard 
            value={`${formatCompactCurrency(monthlyCashFlow)}/mo`} 
            label="Cash Flow" 
            isPositive={monthlyCashFlow >= 0} 
          />
          <MetricCard 
            value={formatCompactCurrency(annualNoi)} 
            label="Annual NOI" 
            isPositive={annualNoi > 0} 
          />
          <MetricCard 
            value={formatCompactCurrency(cashNeeded)} 
            label="Cash Needed" 
            isPositive={true} 
          />
        </div>
      </div>
    </div>
  )
}

export default InvestmentAnalysisNew
