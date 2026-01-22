'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Home, Landmark, Wrench, DollarSign, FileText, TrendingUp, Target } from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface MobileCompressedViewProps {
  // Purchase data
  purchasePrice: number
  downPaymentPct: number
  purchaseCostsPct: number
  // Calculated values
  calc: {
    totalCashNeeded: number
    downPayment: number
    loanAmount: number
    purchaseCosts: number
    annualCashFlow: number
    monthlyCashFlow: number
    capRatePurchase: number
    cashOnCash: number
    dscr: number
    rentToValue: number
    dealScore: number
    noi: number
    grossIncome: number
    grossExpenses: number
    monthlyPayment: number
    breakeven: number
  }
  // Formatters
  fmt: {
    currency: (v: number) => string
    currencyCompact: (v: number) => string
    percent: (v: number) => string
    ratio: (v: number) => string
  }
  // State setters for accordion expansion
  onNavigateToSection?: (sectionId: string) => void
}

// ============================================
// ACCORDION SECTION COMPONENT
// ============================================
interface AccordionSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
}

function AccordionSection({ title, icon, children, isExpanded, onToggle }: AccordionSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-xs font-medium text-slate-700">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// MINI PROGRESS BAR
// ============================================
function ProgressBar({ value, max, color = 'teal' }: { value: number; max: number; color?: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const colorClass = color === 'teal' ? 'bg-teal' : color === 'green' ? 'bg-green-500' : 'bg-slate-400'
  
  return (
    <div className="w-full bg-slate-100 rounded-full h-1">
      <div 
        className={`${colorClass} h-1 rounded-full transition-all duration-300`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function MobileCompressedView({
  purchasePrice,
  downPaymentPct,
  purchaseCostsPct,
  calc,
  fmt,
  onNavigateToSection,
}: MobileCompressedViewProps) {
  // Accordion state for sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purchase: true, // Purchase card is expanded by default
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Determine deal score rating
  const getDealScoreRating = (score: number) => {
    if (score >= 80) return { label: 'Excellent', sublabel: 'Investment', color: 'text-teal' }
    if (score >= 60) return { label: 'Strong', sublabel: 'Investment', color: 'text-teal' }
    if (score >= 40) return { label: 'Fair', sublabel: 'Investment', color: 'text-amber-500' }
    return { label: 'Weak', sublabel: 'Investment', color: 'text-red-500' }
  }

  const scoreRating = getDealScoreRating(calc.dealScore)
  const isProfit = calc.annualCashFlow > 0

  // Return benchmarks status
  const getReturnStatus = (value: number, target: number) => {
    return value >= target ? 'text-green-600' : value >= target * 0.8 ? 'text-amber-500' : 'text-red-500'
  }

  // Calculate price position for gauge (0-100, where 50 is breakeven)
  const priceRange = purchasePrice * 0.4 // 20% below to 20% above
  const pricePosition = Math.min(100, Math.max(0, 
    50 + ((calc.breakeven - purchasePrice) / priceRange) * 100
  ))

  return (
    <div className="px-3 pb-3 space-y-3">
      {/* ============================================ */}
      {/* SIDE-BY-SIDE CARDS: Purchase + IQ Verdict */}
      {/* ============================================ */}
      <div className="flex gap-2">
        {/* LEFT: Purchase Card - Compressed */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-900">Purchase</span>
            </div>
            <button onClick={() => toggleSection('purchase')}>
              {expandedSections.purchase ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {expandedSections.purchase && (
            <>
              {/* Compressed rows */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Price</span>
                  <span className="font-semibold text-slate-900">{fmt.currency(purchasePrice)}</span>
                </div>
                <ProgressBar value={100} max={100} />
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Loan</span>
                  <span className="font-semibold text-slate-900">{fmt.currency(calc.loanAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Down</span>
                  <span className="font-semibold text-slate-900">
                    {downPaymentPct}% <span className="text-slate-400 font-normal">{fmt.currencyCompact(calc.downPayment)}</span>
                  </span>
                </div>
                <ProgressBar value={downPaymentPct} max={100} />
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Closing</span>
                  <span className="font-semibold text-slate-900">
                    {purchaseCostsPct}% <span className="text-slate-400 font-normal">{fmt.currencyCompact(calc.purchaseCosts)}</span>
                  </span>
                </div>
                <ProgressBar value={purchaseCostsPct * 10} max={100} />
              </div>

              {/* Total Cash Required */}
              <div className="mt-3 bg-teal/10 rounded-lg px-2 py-2">
                <div className="text-[9px] text-teal font-medium uppercase">Total Cash</div>
                <div className="text-base font-bold text-teal">{fmt.currency(calc.totalCashNeeded)}</div>
              </div>

              {/* CTA Button - Compact */}
              <button 
                onClick={() => onNavigateToSection?.('financing')}
                className="w-full mt-2 bg-slate-100 text-slate-700 text-[10px] font-medium py-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Financing →
              </button>
            </>
          )}
        </div>

        {/* RIGHT: IQ Verdict Card - Compressed */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[9px] text-teal font-semibold uppercase tracking-wide mb-2">
            IQ Verdict
          </div>
          
          {/* Score Display - Compact */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-3xl font-bold ${scoreRating.color}`}>{calc.dealScore}</span>
            <div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">{scoreRating.label}</div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">{scoreRating.sublabel}</div>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 mb-3 leading-snug">
            {isProfit 
              ? 'Strong cash flow potential with solid returns'
              : 'Negative cash flow - review expenses or pricing'
            }
          </p>

          {/* Returns vs Targets - Ultra Compact */}
          <div className="text-[9px] text-slate-400 font-semibold uppercase mb-1.5">Returns</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Cap</span>
              <span className={`font-semibold ${getReturnStatus(calc.capRatePurchase, 8)}`}>
                {fmt.percent(calc.capRatePurchase)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CoC</span>
              <span className={`font-semibold ${getReturnStatus(calc.cashOnCash, 10)}`}>
                {fmt.percent(calc.cashOnCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DSCR</span>
              <span className={`font-semibold ${getReturnStatus(calc.dscr, 1.2)}`}>
                {fmt.ratio(calc.dscr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">1% Rule</span>
              <span className={`font-semibold ${getReturnStatus(calc.rentToValue, 1)}`}>
                {fmt.percent(calc.rentToValue)}
              </span>
            </div>
          </div>

          {/* Mini Price Position Gauge */}
          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="text-[9px] text-slate-400 font-semibold uppercase mb-1">Price Position</div>
            <div className="relative h-2 bg-gradient-to-r from-red-200 via-slate-200 to-teal/40 rounded-full">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-teal rounded-full shadow-sm"
                style={{ left: `${pricePosition}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
              <span>Loss</span>
              <span>Profit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ACCORDION SECTIONS */}
      {/* ============================================ */}
      <div className="space-y-2">
        {/* Financing Section */}
        <AccordionSection
          title="Financing"
          icon={<Landmark className="w-4 h-4" />}
          isExpanded={expandedSections.financing || false}
          onToggle={() => toggleSection('financing')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Amount</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly P&I</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.monthlyPayment)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Rehab & Valuation */}
        <AccordionSection
          title="Rehab & Valuation"
          icon={<Wrench className="w-4 h-4" />}
          isExpanded={expandedSections.rehab || false}
          onToggle={() => toggleSection('rehab')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Purchase Price</span>
              <span className="font-semibold text-slate-900">{fmt.currency(purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Breakeven Price</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.breakeven)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Income */}
        <AccordionSection
          title="Income"
          icon={<DollarSign className="w-4 h-4" />}
          isExpanded={expandedSections.income || false}
          onToggle={() => toggleSection('income')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Income</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.grossIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NOI</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.noi)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Expenses */}
        <AccordionSection
          title="Expenses"
          icon={<FileText className="w-4 h-4" />}
          isExpanded={expandedSections.expenses || false}
          onToggle={() => toggleSection('expenses')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Expenses</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.grossExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Debt Service</span>
              <span className="font-semibold text-slate-900">{fmt.currency(calc.monthlyPayment * 12)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Cash Flow */}
        <AccordionSection
          title="Cash Flow"
          icon={<TrendingUp className="w-4 h-4" />}
          isExpanded={expandedSections.cashflow || false}
          onToggle={() => toggleSection('cashflow')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Cash Flow</span>
              <span className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}{fmt.currency(calc.monthlyCashFlow)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Annual Cash Flow</span>
              <span className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}{fmt.currency(calc.annualCashFlow)}
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Returns */}
        <AccordionSection
          title="Returns"
          icon={<Target className="w-4 h-4" />}
          isExpanded={expandedSections.returns || false}
          onToggle={() => toggleSection('returns')}
        >
          <div className="pt-2 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Cap Rate</span>
              <span className="font-semibold text-slate-900">{fmt.percent(calc.capRatePurchase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cash-on-Cash</span>
              <span className="font-semibold text-slate-900">{fmt.percent(calc.cashOnCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DSCR</span>
              <span className="font-semibold text-slate-900">{fmt.ratio(calc.dscr)}</span>
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* ============================================ */}
      {/* VIEW FULL ANALYSIS BUTTON */}
      {/* ============================================ */}
      <button
        onClick={() => onNavigateToSection?.('full')}
        className="w-full bg-teal text-white text-sm font-medium py-3 rounded-xl hover:bg-teal/90 transition-colors"
      >
        View Full Analysis
      </button>
    </div>
  )
}

export default MobileCompressedView
