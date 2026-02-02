'use client'

/**
 * InvestmentAnalysis Component
 * 
 * Displays price cards (Breakeven, Target Buy, Wholesale) with metrics row.
 * Redesigned with elevated Target Buy card and reordered metrics.
 */

import React, { useState } from 'react'
import { ChevronDown, HelpCircle, Info } from 'lucide-react'
import { formatPrice } from './types'

interface FinancingDefaults {
  down_payment_pct: number
  interest_rate: number
  loan_term_years: number
  closing_costs_pct?: number
}

interface OperatingDefaults {
  vacancy_rate: number
  maintenance_pct: number
  property_management_pct: number
}

interface Strategy {
  short: string
  full: string
}

interface InvestmentAnalysisProps {
  breakevenPrice: number
  targetBuyPrice: number
  wholesalePrice: number
  isOffMarket: boolean
  priceSource: string
  marketValue: number
  financing: FinancingDefaults
  operating: OperatingDefaults
  onEditAssumptions?: () => void
  currentStrategy?: string
  strategies?: Strategy[]
  onStrategyChange?: (strategy: string) => void
  // New props for metrics row
  monthlyCashFlow?: number
  cashNeeded?: number
  capRate?: number
}

// Standard price card (Breakeven, Wholesale)
function PriceCard({ 
  label, 
  value, 
  desc 
}: { 
  label: string
  value: number
  desc: string 
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-2 flex items-center justify-center gap-1">
        {label}
        <Info className="w-3 h-3 text-[#94A3B8]" />
      </div>
      <div className="text-xl font-bold text-[#0A1628] mb-1">
        {formatPrice(value)}
      </div>
      <div className="text-[11px] text-[#94A3B8] leading-tight">{desc}</div>
    </div>
  )
}

// Elevated price card (Target Buy)
function PrimaryPriceCard({ 
  label, 
  value, 
  desc 
}: { 
  label: string
  value: number
  desc: string 
}) {
  return (
    <div className="bg-white border-2 border-[#0891B2] p-4 text-center relative overflow-hidden">
      {/* Teal top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#0891B2]" />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#0891B2] mb-2 flex items-center justify-center gap-1 pt-1">
        {label}
        <Info className="w-3 h-3 text-[#0891B2]" />
      </div>
      <div className="text-2xl font-bold text-[#0891B2] mb-1">
        {formatPrice(value)}
      </div>
      <div className="text-[11px] text-[#94A3B8] leading-tight">{desc}</div>
    </div>
  )
}

// Metric Pill component
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#E2E8F0] p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-1">
        {label}
      </div>
      <div className="text-lg font-bold text-[#0891B2]">
        {value}
      </div>
    </div>
  )
}

const DEFAULT_STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
]

export function InvestmentAnalysis({
  breakevenPrice,
  targetBuyPrice,
  wholesalePrice,
  isOffMarket,
  priceSource,
  marketValue,
  financing,
  operating,
  onEditAssumptions,
  currentStrategy = 'Long-term',
  strategies = DEFAULT_STRATEGIES,
  onStrategyChange,
  monthlyCashFlow = 0,
  cashNeeded = 0,
  capRate = 0,
}: InvestmentAnalysisProps) {
  const [showCalculation, setShowCalculation] = useState(false)
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false)

  // Format cash flow with /mo suffix
  const formatCashFlow = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
    return value < 0 ? `-$${formatted}/mo` : `$${formatted}/mo`
  }

  // Format cash needed
  const formatCashNeeded = (value: number) => {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }

  // Format cap rate
  const formatCapRate = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Header Section */}
      <div className="p-5 pb-3">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-sm font-bold text-[#0A1628] uppercase tracking-wide">
              Your Investment Analysis
            </div>
            <div className="text-[13px] text-[#64748B]">
              Based on YOUR financing terms ({(financing.down_payment_pct * 100).toFixed(0)}% down, {(financing.interest_rate * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button 
              className="text-[#0891B2] text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
              onClick={onEditAssumptions}
            >
              Change terms
            </button>
            {/* Strategy Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2] text-white text-[12px] font-semibold rounded-full cursor-pointer border-none hover:bg-[#0E7490] transition-colors"
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
              >
                {currentStrategy}
                <ChevronDown 
                  className="w-3.5 h-3.5 transition-transform" 
                  style={{ transform: showStrategyDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {showStrategyDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-50 min-w-[140px]">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.short}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-[#F1F5F9] border-none cursor-pointer ${
                        currentStrategy === strategy.short 
                          ? 'bg-[#F0FDFA] text-[#0891B2] font-semibold' 
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

        {/* How Breakeven is calculated link */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <button 
            className="flex items-center gap-1.5 text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
            onClick={() => setShowCalculation(!showCalculation)}
          >
            <Info className="w-3.5 h-3.5" />
            How BREAKEVEN is calculated
          </button>
        </div>

        {/* Calculation Breakdown */}
        {showCalculation && (
          <div className="mb-4 pb-4 border-b border-[#E2E8F0] space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#475569] mb-2">
              BREAKEVEN CALCULATION
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Monthly Gross Rent</span>
                <span className="font-medium text-[#0A1628]">× 12 months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Less: Vacancy ({(operating.vacancy_rate * 100).toFixed(0)}%)</span>
                <span className="font-medium text-[#0A1628]">= Effective Income</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Less: Operating Expenses</span>
                <span className="font-medium text-[#0A1628]">= NOI</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
                <span className="text-[#64748B]">NOI ÷ Mortgage Constant</span>
                <span className="font-bold text-[#0891B2]">= Breakeven Price</span>
              </div>
            </div>
          </div>
        )}

        {/* Price Cards - Grid with Target Buy larger */}
        <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 mb-4">
          <PriceCard 
            label="Breakeven" 
            value={breakevenPrice} 
            desc="Max price for $0 cashflow" 
          />
          <PrimaryPriceCard 
            label="Target Buy" 
            value={targetBuyPrice} 
            desc="Positive Cashflow" 
          />
          <PriceCard 
            label="Wholesale" 
            value={wholesalePrice} 
            desc="30% net discount for assignment" 
          />
        </div>

        {/* Metrics Row - Cash Flow, Cash Needed, Cap Rate */}
        <div className="grid grid-cols-3 gap-3">
          <MetricPill 
            label="Cash Flow" 
            value={formatCashFlow(monthlyCashFlow)} 
          />
          <MetricPill 
            label="Cash Needed" 
            value={formatCashNeeded(cashNeeded)} 
          />
          <MetricPill 
            label="Cap Rate" 
            value={formatCapRate(capRate)} 
          />
        </div>
      </div>
    </div>
  )
}

export default InvestmentAnalysis
