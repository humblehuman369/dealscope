'use client'

/**
 * InvestmentAnalysis Component
 * 
 * Displays price cards (Breakeven, Target Buy, Wholesale) with assumptions dropdown.
 */

import React, { useState } from 'react'
import { ChevronDown, HelpCircle, AlertCircle, Settings2 } from 'lucide-react'
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
}

interface PriceCardProps {
  label: string
  value: number
  desc: string
  recommended?: boolean
}

function PriceCard({ label, value, desc, recommended = false }: PriceCardProps) {
  return (
    <div className={`rounded-lg p-3 text-center border ${
      recommended 
        ? 'bg-white border-2 border-[#0891B2]' 
        : 'bg-[#F8FAFC] border-[#E2E8F0]'
    }`}>
      <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
        recommended ? 'text-[#0891B2]' : 'text-[#64748B]'
      }`}>
        {label}
        <HelpCircle className="w-3 h-3 text-[#CBD5E1]" />
      </div>
      <div className={`text-base font-bold mb-1 ${recommended ? 'text-[#0891B2]' : 'text-[#0A1628]'}`}>
        {formatPrice(value)}
      </div>
      <div className="text-[9px] text-[#94A3B8] leading-tight">{desc}</div>
    </div>
  )
}

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
}: InvestmentAnalysisProps) {
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showCalculation, setShowCalculation] = useState(false)

  return (
    <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-[15px] font-bold text-[#0A1628]">YOUR INVESTMENT ANALYSIS</div>
          <div className="text-xs text-[#64748B]">
            Based on YOUR financing terms ({(financing.down_payment_pct * 100).toFixed(0)}% down, {(financing.interest_rate * 100).toFixed(1)}%)
          </div>
        </div>
        <button 
          className="text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer hover:opacity-80"
          onClick={onEditAssumptions}
        >
          Change terms
        </button>
      </div>

      <div className="text-xs font-semibold text-[#0891B2] mt-2 mb-3">
        WHAT PRICE MAKES THIS DEAL WORK?
      </div>

      {/* Off-Market Info Banner */}
      {isOffMarket && (
        <div className="flex items-start gap-2.5 p-3 bg-[#F1F5F9] rounded-lg mb-4 border-l-[3px] border-l-[#0891B2]">
          <AlertCircle className="w-[18px] h-[18px] text-[#0891B2] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#475569] leading-relaxed">
            <strong className="text-[#0891B2]">Off-Market Property:</strong> No asking price available. Using {priceSource} of {formatPrice(marketValue)} for Deal Gap calculation.
          </div>
        </div>
      )}

      {/* Price Cards */}
      <div className="text-[13px] text-[#64748B] mb-3">Three ways to approach this deal:</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <PriceCard 
          label="Breakeven" 
          value={breakevenPrice} 
          desc="Max price for $0 cashflow (LTR model)" 
        />
        <PriceCard 
          label="Target Buy" 
          value={targetBuyPrice} 
          desc="5% discount for profit" 
          recommended 
        />
        <PriceCard 
          label="Wholesale" 
          value={wholesalePrice} 
          desc="30% discount for assignment" 
        />
      </div>

      {/* See Calculation Toggle */}
      <button 
        className="flex items-center justify-center gap-1.5 w-full py-2 text-[#64748B] text-xs font-medium bg-transparent border-none cursor-pointer hover:text-[#475569]"
        onClick={() => setShowCalculation(!showCalculation)}
      >
        <ChevronDown 
          className="w-3.5 h-3.5 transition-transform" 
          style={{ transform: showCalculation ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        See how we calculated this
      </button>

      {/* Calculation Breakdown */}
      {showCalculation && (
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] space-y-2">
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

      {/* Expandable Assumptions Panel */}
      {showAssumptions && (
        <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
              YOUR ASSUMPTIONS
            </span>
            {onEditAssumptions && (
              <button 
                onClick={onEditAssumptions}
                className="flex items-center gap-1 text-[10px] font-medium text-[#0891B2] hover:opacity-80 bg-transparent border-none cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                Edit in Deal Maker
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">FINANCING</div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Down Payment</span>
                  <span className="font-medium text-[#0A1628]">{(financing.down_payment_pct * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Interest Rate</span>
                  <span className="font-medium text-[#0A1628]">{(financing.interest_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Loan Term</span>
                  <span className="font-medium text-[#0A1628]">{financing.loan_term_years} years</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">EXPENSES</div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Vacancy</span>
                  <span className="font-medium text-[#0A1628]">{(operating.vacancy_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Management</span>
                  <span className="font-medium text-[#0A1628]">{(operating.property_management_pct * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Maintenance</span>
                  <span className="font-medium text-[#0A1628]">{(operating.maintenance_pct * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestmentAnalysis
