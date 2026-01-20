'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useBrrrrWorksheetCalculator } from '@/hooks/useBrrrrWorksheetCalculator'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'

// Chart components
import { CashRecovery } from '../charts/CashRecovery'
import { KeyMetricsGrid } from '../charts/KeyMetricsGrid'
import { CostBreakdownDonut } from '../charts/CostBreakdownDonut'
import { LoanComparison } from '../charts/LoanComparison'

// ============================================
// ICONS (minimal line style)
// ============================================
const Icons = {
  home: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </svg>
  ),
  bank: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
    </svg>
  ),
  tool: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
    </svg>
  ),
  cashflow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
  returns: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
    </svg>
  ),
  check: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  ),
  chevron: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  ),
}

// ============================================
// SECTION DEFINITIONS
// ============================================
const SECTIONS = [
  { id: 'purchase', title: 'Purchase & Rehab', icon: 'home' },
  { id: 'financing', title: 'Financing (Purchase)', icon: 'bank' },
  { id: 'valuation', title: 'Valuation', icon: 'tool' },
  { id: 'holding', title: 'Holding Costs', icon: 'clock' },
  { id: 'refinance', title: 'Refinance', icon: 'refresh' },
  { id: 'cashflow', title: 'Cash Flow', icon: 'cashflow' },
  { id: 'returns', title: 'Returns', icon: 'returns' },
] as const

// ============================================
// FORMATTERS
// ============================================
const fmt = {
  currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
  currencyCompact: (v: number) => {
    const abs = Math.abs(v)
    const sign = v < 0 ? '-' : ''
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 1 : 2)}M`
    if (abs >= 100000) return `${sign}$${(abs / 1000).toFixed(0)}K`
    if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}K`
    return `${sign}$${Math.round(abs).toLocaleString()}`
  },
  percent: (v: number) => `${v.toFixed(1)}%`,
  ratio: (v: number) => `${v.toFixed(2)}x`,
  months: (v: number) => `${v} mo`,
}

// ============================================
// PROPS
// ============================================
interface BrrrrWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportPDF?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function BrrrrWorksheet({ 
  property,
  propertyId,
  onExportPDF,
}: BrrrrWorksheetProps) {
  // Property data
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // Use the BRRRR calculator hook
  const { inputs, updateInput, result } = useBrrrrWorksheetCalculator(property)

  // Original values for slider ranges
  const originalPrice = propertyData.listPrice || inputs.purchase_price || 500000
  const originalRent = propertyData.monthlyRent || inputs.monthly_rent || 2000
  const originalArv = propertyData.arv || inputs.arv || originalPrice * 1.3

  // ============================================
  // VIEW STATE
  // ============================================
  const [viewMode, setViewMode] = useState<'guided' | 'showall'>('guided')
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))

  // ============================================
  // DERIVED CALCULATIONS
  // ============================================
  const calc = useMemo(() => {
    const allInCost = result?.all_in_cost ?? 0
    const arv = result?.arv ?? inputs.arv
    const cashOut = result?.cash_out ?? 0
    const totalCashInvested = result?.total_cash_invested ?? 0
    const recoveryPercent = totalCashInvested > 0 ? (cashOut / totalCashInvested) * 100 : 0
    const allInPctArv = result?.all_in_pct_arv ?? 0
    const equityCreated = result?.equity_created ?? 0
    const capRate = result?.cap_rate_arv ?? 0
    const cashOnCash = result?.cash_on_cash_return ?? 0
    const annualCashFlow = result?.annual_cash_flow ?? 0
    const monthlyCashFlow = result?.monthly_cash_flow ?? 0
    const dealScore = result?.deal_score ?? 0
    const cashLeftInDeal = result?.cash_left_in_deal ?? 0
    const annualDebtService = result?.annual_debt_service ?? 0
    const noi = result?.noi ?? 0
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
    
    // Gauge needle calculation
    const gaugeAngle = 180 - (dealScore * 1.8)
    const gaugeAngleRad = (gaugeAngle * Math.PI) / 180
    const needleLength = 35
    const needleX = 80 + needleLength * Math.cos(gaugeAngleRad)
    const needleY = 80 - needleLength * Math.sin(gaugeAngleRad)

    return {
      allInCost, arv, cashOut, totalCashInvested, recoveryPercent,
      allInPctArv, equityCreated, capRate, cashOnCash, annualCashFlow, monthlyCashFlow,
      dealScore, cashLeftInDeal, dscr, needleX, needleY,
      loanAmount: result?.loan_amount ?? 0,
      refinanceLoanAmount: result?.refinance_loan_amount ?? 0,
      holdingCosts: result?.holding_costs ?? 0,
      noi: result?.noi ?? 0,
      cashToClose: result?.cash_to_close ?? 0,
    }
  }, [result, inputs.arv])

  // ============================================
  // SECTION NAVIGATION
  // ============================================
  const toggleSection = useCallback((index: number) => {
    if (viewMode === 'showall') return
    if (currentSection === index) {
      setCurrentSection(null)
    } else {
      setCurrentSection(index)
      setCompletedSections(prev => new Set([...Array.from(prev), index]))
    }
  }, [viewMode, currentSection])

  const goToNextSection = useCallback(() => {
    if (currentSection !== null && currentSection < SECTIONS.length - 1) {
      toggleSection(currentSection + 1)
    }
  }, [currentSection, toggleSection])

  // ============================================
  // RENDER HELPERS
  // ============================================
  const InputRow = ({ label, value, onChange, min, max, step, format, subValue, badge }: {
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    format: 'currency' | 'percent' | 'months' | 'number'
    subValue?: string
    badge?: string
  }) => {
    const displayValue = format === 'currency' 
      ? fmt.currency(value) 
      : format === 'percent' 
        ? fmt.percent(value * 100) 
        : format === 'months'
          ? fmt.months(value)
          : `${value}`
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    
    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">{label}</label>
            {badge && <span className="text-[9px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">{badge}</span>}
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-slate-800 tabular-nums">{displayValue}</span>
            {subValue && <span className="text-xs text-slate-400 ml-1.5 tabular-nums">{subValue}</span>}
          </div>
        </div>
        <div className="relative">
          <div className="h-1.5 bg-slate-200 rounded-full">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-100" style={{ width: `${percentage}%` }} />
          </div>
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer"
          />
        </div>
      </div>
    )
  }

  const DisplayRow = ({ label, value, variant = 'default' }: {
    label: string
    value: string
    variant?: 'default' | 'success' | 'danger' | 'muted' | 'violet'
  }) => {
    const colors = {
      default: 'text-slate-800',
      success: 'text-emerald-600',
      danger: 'text-red-500',
      muted: 'text-slate-400',
      violet: 'text-violet-600',
    }
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-slate-500">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${colors[variant]}`}>{value}</span>
      </div>
    )
  }

  const MetricRow = ({ label, value, target, isGood }: {
    label: string
    value: string
    target?: string
    isGood?: boolean
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums ${isGood ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</span>
        {target && <span className="text-[10px] text-slate-400">/ {target}</span>}
      </div>
    </div>
  )

  const SummaryBox = ({ label, value, variant = 'default' }: {
    label: string
    value: string
    variant?: 'default' | 'success' | 'danger' | 'violet'
  }) => {
    const styles = {
      default: 'bg-slate-50 border-slate-200',
      success: 'bg-emerald-50 border-emerald-200',
      danger: 'bg-red-50 border-red-200',
      violet: 'bg-violet-50 border-violet-200',
    }
    const textColor = {
      default: 'text-slate-800',
      success: 'text-emerald-600',
      danger: 'text-red-500',
      violet: 'text-violet-600',
    }
    return (
      <div className={`rounded-xl border px-4 py-3 ${styles[variant]}`}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
        <div className={`text-lg font-bold tabular-nums ${textColor[variant]}`}>{value}</div>
      </div>
    )
  }

  const NextButton = ({ sectionIndex }: { sectionIndex: number }) => {
    if (sectionIndex >= SECTIONS.length - 1 || viewMode === 'showall') return null
    const nextSection = SECTIONS[sectionIndex + 1]
    return (
      <div className="pt-4 mt-4 border-t border-slate-100">
        <button 
          onClick={goToNextSection}
          className="w-full py-3 px-4 bg-violet-500/10 hover:bg-violet-500/20 text-slate-800 border border-violet-500/20 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-colors"
        >
          Continue to {nextSection.title} →
        </button>
      </div>
    )
  }

  const Section = ({ index, title, iconKey, badge, children }: {
    index: number
    title: string
    iconKey: keyof typeof Icons
    badge?: string
    children: React.ReactNode
  }) => {
    const section = SECTIONS[index]
    const isOpen = viewMode === 'showall' || currentSection === index
    const isComplete = completedSections.has(index) && currentSection !== index
    
    return (
      <div 
        id={`section-${section.id}`}
        className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden transition-shadow hover:shadow-md ${isOpen ? 'ring-2 ring-violet-500/20' : ''}`}
      >
        <button 
          onClick={() => toggleSection(index)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-violet-500">{Icons[iconKey]}</span>
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            {badge && <span className="text-[9px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">{badge}</span>}
            {isComplete && (
              <span className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-white">
                {Icons.check}
              </span>
            )}
          </div>
          <span 
            className="text-slate-400 transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            {Icons.chevron}
          </span>
        </button>
        <div 
          className={`transition-all duration-300 ease-out overflow-hidden ${
            isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-4 pt-1">
            {children}
            <NextButton sectionIndex={index} />
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // VERDICT LOGIC
  // ============================================
  const isProfit = calc.annualCashFlow >= 0
  const infiniteCoC = calc.cashLeftInDeal <= 0 && calc.annualCashFlow > 0
  let verdict: string, verdictSub: string
  if (calc.dealScore >= 85) {
    verdict = "Excellent BRRRR"
    verdictSub = infiniteCoC ? "Infinite returns - all cash recovered!" : "Strong equity & cash flow"
  } else if (calc.dealScore >= 70) {
    verdict = "Good BRRRR"
    verdictSub = "Solid fundamentals for BRRRR strategy"
  } else if (calc.dealScore >= 55) {
    verdict = "Fair BRRRR"
    verdictSub = "Consider negotiating better terms"
  } else if (isProfit) {
    verdict = "Marginal BRRRR"
    verdictSub = "Thin margins - may need better deal"
  } else {
    verdict = "Risky BRRRR"
    verdictSub = "Cash flow negative after refinance"
  }

  const targets = [
    { label: 'All-In/ARV', actual: calc.allInPctArv, target: 75, unit: '%', met: calc.allInPctArv <= 75 },
    { label: 'Cash Recovery', actual: calc.recoveryPercent, target: 100, unit: '%', met: calc.recoveryPercent >= 100 },
    { label: 'Cap Rate', actual: calc.capRate, target: 8, unit: '%', met: calc.capRate >= 8 },
    { label: 'CoC Return', actual: infiniteCoC ? 999 : calc.cashOnCash, target: 10, unit: '%', met: calc.cashOnCash >= 10 || infiniteCoC },
  ]

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full min-h-screen bg-slate-50 pt-12">
      {/* WORKSHEET TAB NAV */}
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav propertyId={propertyId} strategy="brrrr" />
        </div>
      </div>
      
      {/* PAGE HEADER */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 flex-1">
              <button className="text-violet-500 hover:text-violet-600 transition-colors text-sm font-medium flex-shrink-0">
                ← Back
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{address}</h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate">
                  {city}{city && state ? ', ' : ''}{state} {zip}
                  {beds > 0 && ` · ${beds} bed`}
                  {baths > 0 && ` · ${Math.round(baths * 10) / 10} bath`}
                  {sqft > 0 && ` · ${sqft.toLocaleString()} sqft`}
                </p>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-shrink-0 self-end sm:self-auto">
              <button 
                onClick={() => setViewMode('guided')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'guided' ? 'bg-violet-500 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Guided
              </button>
              <button 
                onClick={() => setViewMode('showall')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  viewMode === 'showall' ? 'bg-violet-500 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Expand All
              </button>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center mb-4 sm:mb-5">
            {SECTIONS.map((section, i) => {
              const isComplete = completedSections.has(i) && i !== currentSection
              const isActive = i === currentSection
              const isPast = currentSection !== null && i < currentSection
              
              return (
                <div key={section.id} className="flex items-center flex-1 last:flex-none">
                  <button 
                    onClick={() => toggleSection(i)}
                    className="relative group flex-shrink-0"
                    title={section.title}
                  >
                    {isComplete ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-violet-500 flex items-center justify-center text-white shadow-sm">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      </div>
                    ) : isActive ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-violet-500 shadow-sm ring-2 sm:ring-4 ring-violet-500/20" />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 border-2 border-slate-300" />
                    )}
                  </button>
                  {i < SECTIONS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-0.5 sm:mx-1 ${
                      isPast || isComplete ? 'bg-violet-500' : 'bg-slate-200'
                    }`} style={{ 
                      backgroundImage: isPast || isComplete ? 'none' : 'repeating-linear-gradient(90deg, #CBD5E1 0, #CBD5E1 4px, transparent 4px, transparent 8px)' 
                    }} />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* KPI strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">All-In Cost</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.allInCost)}</div>
            </div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-emerald-500/10">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">ARV</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-emerald-600 tabular-nums truncate">{fmt.currencyCompact(calc.arv)}</div>
            </div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-violet-500/10">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Out</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-violet-600 tabular-nums truncate">{fmt.currencyCompact(calc.cashOut)}</div>
            </div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Flow</div>
              <div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmt.currencyCompact(calc.monthlyCashFlow)}/mo
              </div>
            </div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-emerald-500/10">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">CoC Return</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-emerald-600 tabular-nums truncate">
                {infiniteCoC ? '∞%' : fmt.percent(calc.cashOnCash)}
              </div>
            </div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${
              calc.dealScore >= 70 ? 'bg-violet-500/15' : calc.dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div>
              <div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${
                calc.dealScore >= 70 ? 'text-violet-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
              }`}>{calc.dealScore}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr,1fr] md:grid-cols-[1.5fr,320px] lg:grid-cols-[1fr,380px] gap-4 sm:gap-6 items-start">
          
          {/* LEFT COLUMN - Worksheet sections */}
          <div className="space-y-3">
            {/* Purchase & Rehab */}
            <Section index={0} title="Purchase & Rehab" iconKey="home">
              <InputRow label="Purchase Price" value={inputs.purchase_price} onChange={(val) => updateInput('purchase_price', val)} min={Math.round(originalPrice * 0.5)} max={Math.round(originalPrice * 1.5)} step={1000} format="currency" />
              <InputRow label="Rehab Costs" value={inputs.rehab_costs} onChange={(val) => updateInput('rehab_costs', val)} min={0} max={Math.round(originalPrice * 0.5)} step={1000} format="currency" />
              <InputRow label="Purchase Costs" value={inputs.purchase_costs} onChange={(val) => updateInput('purchase_costs', val)} min={0} max={Math.round(originalPrice * 0.1)} step={500} format="currency" />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total All-In Cost" value={fmt.currency(calc.allInCost)} variant="violet" />
              </div>
            </Section>
            
            {/* Financing (Purchase) */}
            <Section index={1} title="Financing (Purchase)" iconKey="bank" badge="Hard Money">
              <InputRow label="Loan to Cost" value={inputs.loan_to_cost_pct} onChange={(val) => { updateInput('loan_to_cost_pct', val); updateInput('down_payment_pct', Math.max(0, 1 - val / 100)); }} min={50} max={100} step={1} format="number" subValue="%" />
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <InputRow label="Interest Rate" value={inputs.interest_rate} onChange={(val) => updateInput('interest_rate', val)} min={0.08} max={0.18} step={0.005} format="percent" />
              <InputRow label="Points" value={inputs.points} onChange={(val) => updateInput('points', val)} min={0} max={5} step={0.5} format="number" subValue=" pts" />
              <div className="mt-3 pt-3">
                <SummaryBox label="Cash to Close" value={fmt.currency(calc.cashToClose)} variant="default" />
              </div>
            </Section>
            
            {/* Valuation */}
            <Section index={2} title="Valuation" iconKey="tool">
              <InputRow label="After Repair Value" value={inputs.arv} onChange={(val) => updateInput('arv', val)} min={Math.round(originalArv * 0.7)} max={Math.round(originalArv * 1.5)} step={1000} format="currency" />
              <DisplayRow label="ARV Per Sq Ft" value={fmt.currency(result?.arv_psf ?? 0)} />
              <DisplayRow label="Purchase Per Sq Ft" value={fmt.currency(result?.price_psf ?? 0)} />
              <DisplayRow label="All-In % of ARV" value={fmt.percent(calc.allInPctArv)} variant={calc.allInPctArv <= 75 ? 'success' : 'danger'} />
              <div className="mt-3 pt-3">
                <SummaryBox label="Equity Created" value={fmt.currency(calc.equityCreated)} variant={calc.equityCreated > 0 ? 'success' : 'danger'} />
              </div>
            </Section>
            
            {/* Holding Costs */}
            <Section index={3} title="Holding Costs" iconKey="clock" badge="Rehab Period">
              <InputRow label="Holding Period" value={inputs.holding_months} onChange={(val) => updateInput('holding_months', Math.round(val))} min={1} max={12} step={1} format="months" />
              <DisplayRow label="Loan Interest" value={`−${fmt.currency(result?.holding_interest ?? 0)}`} variant="danger" />
              <InputRow label="Property Taxes" value={inputs.property_taxes_annual} onChange={(val) => updateInput('property_taxes_annual', val)} min={1000} max={30000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Insurance" value={inputs.insurance_annual} onChange={(val) => updateInput('insurance_annual', val)} min={500} max={10000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Utilities" value={inputs.utilities_monthly} onChange={(val) => updateInput('utilities_monthly', val)} min={0} max={500} step={25} format="currency" subValue="/mo" />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total Holding Costs" value={`−${fmt.currency(calc.holdingCosts)}`} variant="danger" />
              </div>
            </Section>
            
            {/* Refinance */}
            <Section index={4} title="Refinance" iconKey="refresh" badge="Cash-Out Refi">
              <InputRow label="Loan to Value" value={inputs.refi_ltv} onChange={(val) => updateInput('refi_ltv', val)} min={0.65} max={0.80} step={0.01} format="percent" />
              <DisplayRow label="New Loan Amount" value={fmt.currency(calc.refinanceLoanAmount)} />
              <InputRow label="Refi Costs" value={inputs.refi_closing_costs} onChange={(val) => updateInput('refi_closing_costs', val)} min={0} max={20000} step={500} format="currency" />
              <DisplayRow label="Payoff Old Loan" value={`−${fmt.currency(calc.loanAmount)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Net Cash Out" value={fmt.currency(calc.cashOut)} variant={calc.cashOut > 0 ? 'success' : 'danger'} />
                <SummaryBox label="Cash Left in Deal" value={fmt.currency(calc.cashLeftInDeal)} variant={calc.cashLeftInDeal <= 0 ? 'success' : 'default'} />
              </div>
            </Section>
            
            {/* Cash Flow */}
            <Section index={5} title="Cash Flow" iconKey="cashflow">
              <InputRow label="Monthly Rent" value={inputs.monthly_rent} onChange={(val) => updateInput('monthly_rent', val)} min={Math.round(originalRent * 0.5)} max={Math.round(originalRent * 2)} step={50} format="currency" />
              <InputRow label="Vacancy" value={inputs.vacancy_rate} onChange={(val) => updateInput('vacancy_rate', val)} min={0} max={0.15} step={0.01} format="percent" />
              <DisplayRow label="Effective Income" value={fmt.currency(result?.effective_income ?? 0)} />
              <DisplayRow label="Operating Expenses" value={`−${fmt.currency(result?.total_expenses ?? 0)}`} variant="danger" />
              <DisplayRow label="NOI" value={fmt.currency(calc.noi)} />
              <DisplayRow label="Debt Service" value={`−${fmt.currency(result?.annual_debt_service ?? 0)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Monthly Cash Flow" value={fmt.currency(calc.monthlyCashFlow)} variant={calc.monthlyCashFlow >= 0 ? 'success' : 'danger'} />
                <SummaryBox label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} />
              </div>
            </Section>
            
            {/* Returns */}
            <Section index={6} title="Returns" iconKey="returns">
              <MetricRow label="Cap Rate (ARV)" value={fmt.percent(calc.capRate)} target="8%" isGood={calc.capRate >= 8} />
              <MetricRow label="Cash on Cash" value={infiniteCoC ? '∞%' : fmt.percent(calc.cashOnCash)} target="10%" isGood={calc.cashOnCash >= 10 || infiniteCoC} />
              <MetricRow label="Return on Equity" value={fmt.percent(result?.return_on_equity ?? 0)} />
              <MetricRow label="Total ROI (Year 1)" value={fmt.percent(result?.total_roi_year1 ?? 0)} />
            </Section>
          </div>
          
          {/* RIGHT COLUMN - Insight Panel */}
          <div className="sm:sticky sm:top-28 space-y-4 sm:max-h-[calc(100vh-8rem)] sm:overflow-y-auto">
            {/* IQ Verdict Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-5" style={{ 
                background: calc.dealScore >= 70 
                  ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.02) 100%)'
                  : calc.dealScore >= 40
                    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.10) 0%, rgba(245, 158, 11, 0.02) 100%)'
                    : 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)'
              }}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                  calc.dealScore >= 70 ? 'text-violet-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>IQ VERDICT: BRRRR</div>
                <div className="flex items-center gap-4 bg-white rounded-full px-5 py-3 shadow-sm mb-3">
                  <span className={`text-3xl font-extrabold tabular-nums ${
                    calc.dealScore >= 70 ? 'text-violet-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                  }`}>{calc.dealScore}</span>
                  <div>
                    <div className="text-base font-bold text-slate-800">{verdict}</div>
                    <div className="text-xs text-slate-500">Deal Score</div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-center">{verdictSub}</p>
              </div>
              
              <div className="px-5 py-4 border-t border-slate-100">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-3">BRRRR TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{t.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${t.met ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.actual === 999 ? '∞' : t.actual.toFixed(1)}{t.unit} / {t.target}{t.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Price Position Card - BRRRR Pricing Ladder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">BRRRR PRICING LADDER</div>
              
              {/* Vertical ladder */}
              <div className="space-y-2">
                {[
                  { label: 'ARV', value: calc.arv, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                  { label: 'Refi Loan (75% LTV)', value: calc.refinanceLoanAmount, color: 'bg-violet-500', textColor: 'text-violet-600' },
                  { label: 'All-In Cost', value: calc.allInCost, color: 'bg-slate-800', textColor: 'text-slate-800', highlight: true },
                  { label: 'MAO (70% ARV)', value: calc.arv * 0.7, color: 'bg-amber-500', textColor: 'text-amber-600' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${item.highlight ? 'bg-slate-100 border border-slate-200' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-slate-500">{item.label}</span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${item.textColor}`}>{fmt.currency(item.value)}</span>
                  </div>
                ))}
              </div>
              
              {/* Recovery indicator */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500">Cash Recovery</span>
                  <span className={`text-xs font-bold ${calc.recoveryPercent >= 100 ? 'text-emerald-600' : 'text-violet-600'}`}>
                    {calc.recoveryPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${calc.recoveryPercent >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${Math.min(100, calc.recoveryPercent)}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Cash Recovery */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">CASH RECOVERY</div>
              <CashRecovery
                cashOut={calc.cashOut}
                cashInvested={calc.totalCashInvested}
                recoveryPercent={calc.recoveryPercent}
              />
            </div>
            
            {/* All-In Cost Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">ALL-IN COST BREAKDOWN</div>
              <CostBreakdownDonut
                items={[
                  { label: 'Purchase', value: inputs.purchase_price, color: '#8b5cf6' },
                  { label: 'Rehab', value: inputs.rehab_costs, color: '#7c3aed' },
                  { label: 'Costs', value: inputs.purchase_costs, color: '#64748b' },
                ]}
                total={calc.allInCost}
                totalLabel="All-In"
              />
            </div>
            
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">KEY BRRRR METRICS</div>
              <KeyMetricsGrid
                metrics={[
                  { value: `${calc.allInPctArv.toFixed(0)}%`, label: 'All-In/ARV', highlight: true },
                  { value: fmt.currencyCompact(calc.equityCreated), label: 'Equity Created' },
                  { value: `${calc.capRate.toFixed(1)}%`, label: 'Cap Rate' },
                  { value: `${calc.recoveryPercent.toFixed(0)}%`, label: 'Cash Recovery' },
                ]}
                accentClass="brrrr"
              />
            </div>
            
            {/* Loan Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">LOAN COMPARISON</div>
              <LoanComparison
                purchaseLoan={calc.loanAmount}
                purchaseRate={inputs.interest_rate}
                purchaseType="HML"
                refinanceLoan={calc.refinanceLoanAmount}
                refinanceRate={inputs.refi_interest_rate}
                refinanceType="Conv"
              />
            </div>
            
            {/* CTA Button */}
            <button 
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 rounded-full text-slate-800 font-bold text-sm transition-colors"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
