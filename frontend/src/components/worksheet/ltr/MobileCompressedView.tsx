'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Home, Landmark, Wrench, DollarSign, FileText, TrendingUp, Target } from 'lucide-react'
import { scoreToGradeLabel } from '@/components/iq-verdict/types'

// ============================================
// TYPES
// ============================================
interface MobileCompressedViewProps {
  // Purchase data
  purchasePrice: number
  downPaymentPct: number
  purchaseCostsPct: number
  // Deal Score from backend API (not in calc anymore)
  dealScore: number
  breakeven: number
  // Calculated values (financial metrics only - no Deal Score)
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
    noi: number
    grossIncome: number
    grossExpenses: number
    monthlyPayment: number
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
// MAIN COMPONENT
// ============================================
export function MobileCompressedView({
  purchasePrice,
  downPaymentPct,
  purchaseCostsPct,
  dealScore,
  breakeven,
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

  const scoreRating = getDealScoreRating(dealScore)
  const isProfit = calc.annualCashFlow > 0

  // Return benchmarks status
  const getReturnStatus = (value: number, target: number) => {
    return value >= target ? 'text-green-600' : value >= target * 0.8 ? 'text-amber-500' : 'text-red-500'
  }

  return (
    <div className="px-3 pb-3 space-y-3">
      {/* ============================================ */}
      {/* SIDE-BY-SIDE CARDS: Purchase + IQ Verdict */}
      {/* ============================================ */}
      <div className="flex gap-2">
        {/* LEFT: Purchase Card - Ultra Compact */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-2.5 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-900">Purchase</span>
            </div>
            <button onClick={() => toggleSection('purchase')}>
              {expandedSections.purchase ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {expandedSections.purchase && (
            <>
              {/* Compressed rows */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Price</span>
                  <span className="font-semibold text-slate-900 truncate ml-1">{fmt.currencyCompact(purchasePrice)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Loan</span>
                  <span className="font-semibold text-slate-900 truncate ml-1">{fmt.currencyCompact(calc.loanAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Down</span>
                  <span className="font-semibold text-slate-900 truncate ml-1">{fmt.currencyCompact(calc.downPayment)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Closing</span>
                  <span className="font-semibold text-slate-900 truncate ml-1">{fmt.currencyCompact(calc.purchaseCosts)}</span>
                </div>
              </div>

              {/* Total Cash Required */}
              <div className="mt-2 bg-teal/10 rounded-lg px-2 py-1.5">
                <div className="text-[8px] text-teal font-medium uppercase">Cash Needed</div>
                <div className="text-sm font-bold text-teal">{fmt.currencyCompact(calc.totalCashNeeded)}</div>
              </div>

              {/* CTA Button - Compact */}
              <button 
                onClick={() => onNavigateToSection?.('financing')}
                className="w-full mt-1.5 bg-slate-100 text-slate-600 text-[9px] font-medium py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Details →
              </button>
            </>
          )}
        </div>

        {/* RIGHT: IQ Verdict Card - Ultra Compact */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-2.5 min-w-0">
          <div className="text-[8px] text-teal font-semibold uppercase tracking-wide mb-1.5">
            Verdict
          </div>
          
          {/* Score Display - Grade Based */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span 
              className="text-2xl font-bold"
              style={{ color: scoreToGradeLabel(dealScore).color }}
            >
              {scoreToGradeLabel(dealScore).grade}
            </span>
            <div className="min-w-0">
              <div 
                className="text-[10px] font-semibold leading-tight truncate"
                style={{ color: scoreToGradeLabel(dealScore).color }}
              >
                {scoreToGradeLabel(dealScore).label}
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">Deal Score</div>
            </div>
          </div>

          {/* Returns - Ultra Compact Grid */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Cap</span>
              <span className={`font-semibold ${getReturnStatus(calc.capRatePurchase, 8)}`}>
                {fmt.percent(calc.capRatePurchase)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CoC</span>
              <span className={`font-semibold ${getReturnStatus(calc.cashOnCash, 10)}`}>
                {fmt.percent(calc.cashOnCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DSCR</span>
              <span className={`font-semibold ${getReturnStatus(calc.dscr, 1.2)}`}>
                {fmt.ratio(calc.dscr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">1%</span>
              <span className={`font-semibold ${getReturnStatus(calc.rentToValue, 1)}`}>
                {fmt.percent(calc.rentToValue)}
              </span>
            </div>
          </div>

          {/* Simplified Status Indicator */}
          <div className={`mt-2 py-1.5 px-2 rounded-lg text-center text-[9px] font-medium ${
            isProfit ? 'bg-teal/10 text-teal' : 'bg-red-500/10 text-red-500'
          }`}>
            {isProfit ? 'Positive Cash Flow' : 'Negative Cash Flow'}
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
              <span className="text-slate-500">Buy Price</span>
              <span className="font-semibold text-slate-900">{fmt.currency(purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Breakeven Price</span>
              <span className="font-semibold text-slate-900">{fmt.currency(breakeven)}</span>
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
