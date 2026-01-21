'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useStrWorksheetCalculator } from '@/hooks/useStrWorksheetCalculator'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'

// Section components for tab navigation
import { SalesCompsSection } from '../sections/SalesCompsSection'
import { RentalCompsSection } from '../sections/RentalCompsSection'
import { MarketDataSection } from '../sections/MarketDataSection'
import { MultiYearProjections } from '../sections/MultiYearProjections'
import { CashFlowChart } from '../charts/CashFlowChart'
import { EquityChart } from '../charts/EquityChart'

// Chart components
import { StrRevenueBreakdown } from '../charts/StrRevenueBreakdown'
import { KeyMetricsGrid } from '../charts/KeyMetricsGrid'
import { StrVsLtrComparison } from '../charts/StrVsLtrComparison'

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
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
    </svg>
  ),
  expense: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
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
  { id: 'purchase', title: 'Purchase & Setup', icon: 'home' },
  { id: 'financing', title: 'Financing', icon: 'bank' },
  { id: 'revenue', title: 'Revenue', icon: 'calendar' },
  { id: 'expenses', title: 'Expenses', icon: 'expense' },
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
  percent: (v: number) => `${(v * 100).toFixed(1)}%`,
  percentRaw: (v: number) => `${v.toFixed(1)}%`,
  years: (v: number) => `${v} yr`,
  ratio: (v: number) => `${v.toFixed(2)}x`,
  nights: (v: number) => `${v.toFixed(0)} nights`,
}

// ============================================
// PROPS
// ============================================
interface StrWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportExcel?: () => void
  onExportPDF?: () => void
  onShare?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function StrWorksheet({ 
  property,
  propertyId,
  onExportPDF,
}: StrWorksheetProps) {
  // Get active section from store for tab navigation
  const { activeSection } = useWorksheetStore()
  
  // Property data
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // Use the STR calculator hook
  const { inputs, updateInput, result, derived } = useStrWorksheetCalculator(property)

  // Original values for slider ranges
  const originalPrice = propertyData.listPrice || inputs.purchase_price || 500000
  const originalAdr = propertyData.averageDailyRate || inputs.average_daily_rate || 200

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
    const grossRevenue = result?.gross_revenue ?? 0
    const grossExpenses = result?.gross_expenses ?? 0
    const noi = result?.noi ?? 0
    const annualDebtService = derived.annualDebtService ?? 0
    const annualCashFlow = result?.annual_cash_flow ?? 0
    const monthlyCashFlow = result?.monthly_cash_flow ?? 0
    const totalCashNeeded = result?.total_cash_needed ?? 0
    const dealScore = result?.deal_score ?? 0
    const capRate = result?.cap_rate ?? 0
    const cashOnCash = result?.cash_on_cash_return ?? 0
    const dscr = result?.dscr ?? 0
    const grm = grossRevenue > 0 ? inputs.purchase_price / grossRevenue : 0
    
    const breakevenPrice = result?.breakeven_price ?? inputs.purchase_price
    
    // Gauge needle calculation
    const gaugeAngle = 180 - (dealScore * 1.8)
    const gaugeAngleRad = (gaugeAngle * Math.PI) / 180
    const needleLength = 35
    const needleX = 80 + needleLength * Math.cos(gaugeAngleRad)
    const needleY = 80 - needleLength * Math.sin(gaugeAngleRad)

    return {
      grossRevenue, grossExpenses, noi, annualDebtService, annualCashFlow, monthlyCashFlow,
      totalCashNeeded, dealScore, capRate, cashOnCash, dscr, grm, breakevenPrice,
      needleX, needleY,
      loanAmount: result?.loan_amount ?? 0,
      monthlyPayment: result?.monthly_payment ?? 0,
      rentalRevenue: result?.rental_revenue ?? 0,
      cleaningFeeRevenue: result?.cleaning_fee_revenue ?? 0,
      revpar: result?.revpar ?? 0,
      bookedNights: result?.nights_occupied ?? 0,
    }
  }, [result, derived, inputs.purchase_price])

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
  const InputRow = ({ label, value, onChange, min, max, step, format, subValue }: {
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    format: 'currency' | 'percent' | 'years' | 'nights'
    subValue?: string
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    
    const displayValue = format === 'currency' 
      ? fmt.currency(value) 
      : format === 'percent' 
        ? fmt.percent(value) 
        : format === 'years'
          ? fmt.years(value)
          : fmt.nights(value)
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    
    const handleStartEdit = () => {
      if (format === 'currency') {
        setEditValue(Math.round(value).toString())
      } else if (format === 'percent') {
        setEditValue((value * 100).toFixed(1))
      } else {
        setEditValue(value.toString())
      }
      setIsEditing(true)
    }
    
    const handleEndEdit = () => {
      setIsEditing(false)
      let parsed = parseFloat(editValue.replace(/[$,%\s]/g, ''))
      if (isNaN(parsed)) return
      // Convert percent back to decimal if needed
      if (format === 'percent') {
        parsed = parsed / 100
      }
      parsed = Math.min(max, Math.max(min, parsed))
      onChange(parsed)
    }
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleEndEdit()
      else if (e.key === 'Escape') setIsEditing(false)
    }
    
    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-500">{label}</label>
          <div className="text-right">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEndEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-24 px-2 py-0.5 text-sm font-semibold text-slate-800 tabular-nums text-right border border-teal rounded focus:outline-none focus:ring-1 focus:ring-teal"
              />
            ) : (
              <span 
                onClick={handleStartEdit}
                className="text-sm font-semibold text-slate-800 tabular-nums cursor-pointer hover:text-teal hover:underline"
              >
                {displayValue}
              </span>
            )}
            {subValue && <span className="text-xs text-slate-400 ml-1.5 tabular-nums">{subValue}</span>}
          </div>
        </div>
        <div className="relative">
          <div className="h-1.5 bg-slate-200 rounded-full">
            <div className="h-full bg-teal rounded-full transition-all duration-100" style={{ width: `${percentage}%` }} />
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
    variant?: 'default' | 'success' | 'danger' | 'muted' | 'teal'
  }) => {
    const colors = {
      default: 'text-slate-800',
      success: 'text-teal',
      danger: 'text-red-500',
      muted: 'text-slate-400',
      teal: 'text-teal',
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
        <span className={`text-sm font-semibold tabular-nums ${isGood ? 'text-teal' : 'text-slate-800'}`}>{value}</span>
        {target && <span className="text-[10px] text-slate-400">/ {target}</span>}
      </div>
    </div>
  )

  const SummaryBox = ({ label, value, variant = 'default' }: {
    label: string
    value: string
    variant?: 'default' | 'success' | 'danger' | 'teal'
  }) => {
    const styles = {
      default: 'bg-slate-50 border-slate-200',
      success: 'bg-teal/10 border-teal/20',
      danger: 'bg-red-50 border-red-200',
      teal: 'bg-teal/10 border-teal/20',
    }
    const textColor = {
      default: 'text-slate-800',
      success: 'text-teal',
      danger: 'text-red-500',
      teal: 'text-teal',
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
          className="w-full py-3 px-4 bg-teal/10 hover:bg-teal/20 text-slate-800 border border-teal/20 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-colors"
        >
          Continue to {nextSection.title} →
        </button>
      </div>
    )
  }

  const Section = ({ index, title, iconKey, children }: {
    index: number
    title: string
    iconKey: keyof typeof Icons
    children: React.ReactNode
  }) => {
    const section = SECTIONS[index]
    const isOpen = viewMode === 'showall' || currentSection === index
    const isComplete = completedSections.has(index) && currentSection !== index
    
    return (
      <div 
        id={`section-${section.id}`}
        className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden transition-shadow hover:shadow-md ${isOpen ? 'ring-2 ring-teal/20' : ''}`}
      >
        <button 
          onClick={() => toggleSection(index)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-teal">{Icons[iconKey]}</span>
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            {isComplete && (
              <span className="w-4 h-4 rounded-full bg-teal flex items-center justify-center text-white">
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
  let verdict: string, verdictSub: string
  if (calc.dealScore >= 85) {
    verdict = "Great STR"
    verdictSub = "Excellent short-term rental potential"
  } else if (calc.dealScore >= 70) {
    verdict = "Good STR"
    verdictSub = "Solid STR fundamentals"
  } else if (calc.dealScore >= 55) {
    verdict = "Fair STR"
    verdictSub = "Consider market conditions carefully"
  } else if (isProfit) {
    verdict = "Marginal STR"
    verdictSub = "Thin margins - proceed with caution"
  } else {
    verdict = "Risky STR"
    verdictSub = "Deal loses money as structured"
  }

  const targets = [
    { label: 'Cap', actual: calc.capRate, target: 8, unit: '%', met: calc.capRate >= 8 },
    { label: 'CoC', actual: calc.cashOnCash, target: 10, unit: '%', met: calc.cashOnCash >= 10 },
    { label: 'DSCR', actual: calc.dscr, target: 1.2, unit: 'x', met: calc.dscr >= 1.2 },
    { label: 'GRM', actual: calc.grm, target: 10, unit: '', met: calc.grm <= 10 && calc.grm > 0 },
  ]

  // Estimated LTR comparison
  const estLTRMonthlyRent = (calc.grossRevenue / 12) * 0.35
  const estLTRCashFlow = estLTRMonthlyRent - calc.monthlyPayment - (inputs.supplies_monthly * 0.2) - (inputs.insurance_annual / 12) * 0.6 - (inputs.property_taxes_annual / 12)

  // Build full address - use property.full_address if available, otherwise construct it
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full min-h-screen bg-slate-50 pt-12">
      {/* PROPERTY ADDRESS BAR - Above worksheet tabs */}
      <div className="w-full bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-teal hover:text-teal/80 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-800">{fullAddress}</h1>
          </div>
        </div>
      </div>
      
      {/* WORKSHEET TAB NAV - Full width, sticky below global header */}
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav propertyId={propertyId} strategy="str" zpid={property.zpid || propertyData.zpid} />
        </div>
      </div>
      
      {/* PAGE HEADER - KPIs only */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* KPI strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-teal/10">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Gross Revenue</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-teal tabular-nums truncate">{fmt.currencyCompact(calc.grossRevenue)}</div>
            </div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Needed</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.totalCashNeeded)}</div>
            </div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${isProfit ? 'bg-teal/10' : 'bg-red-500/10'}`}>
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Annual Profit</div>
              <div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${isProfit ? 'text-teal' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}{fmt.currencyCompact(calc.annualCashFlow)}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cap Rate</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums">{calc.capRate.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">CoC Return</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums">{calc.cashOnCash.toFixed(1)}%</div>
            </div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${
              calc.dealScore >= 70 ? 'bg-teal/15' : calc.dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div>
              <div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${
                calc.dealScore >= 70 ? 'text-teal' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
              }`}>{calc.dealScore}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Render different content based on active tab */}
        {activeSection === 'sales-comps' ? (
          <SalesCompsSection />
        ) : activeSection === 'rental-comps' ? (
          <RentalCompsSection />
        ) : activeSection === 'market-data' ? (
          <MarketDataSection />
        ) : activeSection === 'projections' ? (
          <>
            <MultiYearProjections />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CashFlowChart />
              <EquityChart />
            </div>
          </>
        ) : (
        <>
          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('guided')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'guided' ? 'bg-teal text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Guided
              </button>
              <button 
                onClick={() => setViewMode('showall')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  viewMode === 'showall' ? 'bg-teal text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Expand All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          
          {/* LEFT COLUMN - Worksheet sections */}
          <div className="space-y-3">
            {/* Purchase & Setup */}
            <Section index={0} title="Purchase & Setup" iconKey="home">
              <InputRow 
                label="Purchase Price" 
                value={inputs.purchase_price} 
                onChange={(val) => updateInput('purchase_price', val)} 
                min={Math.round(originalPrice * 0.5)} 
                max={Math.round(originalPrice * 1.5)} 
                step={5000} 
                format="currency" 
              />
              <InputRow 
                label="Closing Costs" 
                value={inputs.purchase_costs} 
                onChange={(val) => updateInput('purchase_costs', val)} 
                min={0} 
                max={Math.round(originalPrice * 0.1)} 
                step={500} 
                format="currency" 
              />
              <InputRow 
                label="Furnishing Budget" 
                value={inputs.furnishing_budget} 
                onChange={(val) => updateInput('furnishing_budget', val)} 
                min={0} 
                max={50000} 
                step={500} 
                format="currency" 
              />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total Cash Required" value={fmt.currency(calc.totalCashNeeded)} variant="teal" />
              </div>
            </Section>
            
            {/* Financing */}
            <Section index={1} title="Financing" iconKey="bank">
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <InputRow 
                label="Down Payment" 
                value={inputs.down_payment_pct} 
                onChange={(val) => updateInput('down_payment_pct', val)} 
                min={0} 
                max={1} 
                step={0.01} 
                format="percent" 
                subValue={fmt.currency(inputs.purchase_price * inputs.down_payment_pct)}
              />
              <InputRow 
                label="Interest Rate" 
                value={inputs.interest_rate} 
                onChange={(val) => updateInput('interest_rate', val)} 
                min={0.04} 
                max={0.12} 
                step={0.00125} 
                format="percent" 
              />
              <InputRow 
                label="Loan Term" 
                value={inputs.loan_term_years} 
                onChange={(val) => updateInput('loan_term_years', val)} 
                min={10} 
                max={30} 
                step={5} 
                format="years" 
              />
              <div className="mt-3 pt-3">
                <SummaryBox label="Monthly Payment" value={fmt.currency(calc.monthlyPayment)} variant="default" />
              </div>
            </Section>
            
            {/* Revenue */}
            <Section index={2} title="Revenue" iconKey="calendar">
              <InputRow 
                label="Average Daily Rate" 
                value={inputs.average_daily_rate} 
                onChange={(val) => updateInput('average_daily_rate', val)} 
                min={Math.round(originalAdr * 0.5)} 
                max={Math.round(originalAdr * 2)} 
                step={5} 
                format="currency" 
              />
              <InputRow 
                label="Occupancy Rate" 
                value={inputs.occupancy_rate} 
                onChange={(val) => updateInput('occupancy_rate', val)} 
                min={0.3} 
                max={0.95} 
                step={0.01} 
                format="percent" 
                subValue={`${Math.round(inputs.occupancy_rate * 365)} nights`}
              />
              <InputRow 
                label="Cleaning Fee Revenue" 
                value={inputs.cleaning_fee_revenue} 
                onChange={(val) => updateInput('cleaning_fee_revenue', val)} 
                min={50} 
                max={500} 
                step={10} 
                format="currency" 
              />
              <InputRow 
                label="Avg Booking Length" 
                value={inputs.avg_booking_length} 
                onChange={(val) => updateInput('avg_booking_length', val)} 
                min={1} 
                max={14} 
                step={0.5} 
                format="nights" 
              />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Gross Revenue" value={`${fmt.currency(calc.grossRevenue)}/yr`} variant="teal" />
              </div>
            </Section>
            
            {/* Expenses */}
            <Section index={3} title="Expenses" iconKey="expense">
              <InputRow 
                label="Platform Fees" 
                value={inputs.platform_fees_pct} 
                onChange={(val) => updateInput('platform_fees_pct', val)} 
                min={0} 
                max={0.20} 
                step={0.01} 
                format="percent" 
              />
              <InputRow 
                label="Property Management" 
                value={inputs.property_management_pct} 
                onChange={(val) => updateInput('property_management_pct', val)} 
                min={0} 
                max={0.30} 
                step={0.01} 
                format="percent" 
              />
              <InputRow 
                label="Cleaning Cost/Turn" 
                value={inputs.cleaning_cost_per_turn} 
                onChange={(val) => updateInput('cleaning_cost_per_turn', val)} 
                min={50} 
                max={300} 
                step={10} 
                format="currency" 
              />
              <InputRow 
                label="Supplies & Amenities" 
                value={inputs.supplies_monthly} 
                onChange={(val) => updateInput('supplies_monthly', val)} 
                min={0} 
                max={500} 
                step={25} 
                format="currency" 
                subValue="/mo"
              />
              <InputRow 
                label="Utilities" 
                value={inputs.utilities_monthly} 
                onChange={(val) => updateInput('utilities_monthly', val)} 
                min={0} 
                max={500} 
                step={25} 
                format="currency" 
                subValue="/mo"
              />
              <InputRow 
                label="Insurance (Annual)" 
                value={inputs.insurance_annual} 
                onChange={(val) => updateInput('insurance_annual', val)} 
                min={1000} 
                max={10000} 
                step={100} 
                format="currency" 
              />
              <InputRow 
                label="Property Taxes" 
                value={inputs.property_taxes_annual} 
                onChange={(val) => updateInput('property_taxes_annual', val)} 
                min={1000} 
                max={30000} 
                step={100} 
                format="currency" 
              />
              <InputRow 
                label="Maintenance" 
                value={inputs.maintenance_pct} 
                onChange={(val) => updateInput('maintenance_pct', val)} 
                min={0} 
                max={0.10} 
                step={0.01} 
                format="percent" 
              />
              <InputRow 
                label="CapEx Reserve" 
                value={inputs.capex_pct} 
                onChange={(val) => updateInput('capex_pct', val)} 
                min={0} 
                max={0.10} 
                step={0.01} 
                format="percent" 
              />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total Operating Expenses" value={`${fmt.currency(calc.grossExpenses)}/yr`} variant="danger" />
              </div>
            </Section>
            
            {/* Cash Flow */}
            <Section index={4} title="Cash Flow" iconKey="cashflow">
              <DisplayRow label="Gross Revenue" value={`${fmt.currency(calc.grossRevenue)}/yr`} variant="teal" />
              <DisplayRow label="Operating Expenses" value={`−${fmt.currency(calc.grossExpenses)}`} variant="danger" />
              <DisplayRow label="Net Operating Income" value={fmt.currency(calc.noi)} />
              <DisplayRow label="Annual Debt Service" value={`−${fmt.currency(calc.annualDebtService)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Monthly Cash Flow" value={fmt.currency(calc.monthlyCashFlow)} variant={calc.monthlyCashFlow >= 0 ? 'success' : 'danger'} />
                <SummaryBox label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} />
              </div>
            </Section>
            
            {/* Returns */}
            <Section index={5} title="Returns" iconKey="returns">
              <MetricRow label="Cap Rate" value={`${calc.capRate.toFixed(1)}%`} target="8%" isGood={calc.capRate >= 8} />
              <MetricRow label="Cash on Cash" value={`${calc.cashOnCash.toFixed(1)}%`} target="10%" isGood={calc.cashOnCash >= 10} />
              <MetricRow label="DSCR" value={fmt.ratio(calc.dscr)} target="1.2x" isGood={calc.dscr >= 1.2} />
              <MetricRow label="Gross Rent Multiplier" value={calc.grm.toFixed(1)} target="10" isGood={calc.grm <= 10 && calc.grm > 0} />
              <MetricRow label="RevPAR" value={fmt.currency(calc.revpar)} />
            </Section>
          </div>
          
          {/* RIGHT COLUMN - Insight Panel */}
          <div className="sm:sticky sm:top-28 space-y-4 sm:max-h-[calc(100vh-8rem)] sm:overflow-y-auto">
            {/* IQ Verdict Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-5" style={{ 
                background: calc.dealScore >= 70 
                  ? 'linear-gradient(180deg, rgba(8, 145, 178, 0.10) 0%, rgba(8, 145, 178, 0.02) 100%)'
                  : calc.dealScore >= 40
                    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.10) 0%, rgba(245, 158, 11, 0.02) 100%)'
                    : 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)'
              }}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                  calc.dealScore >= 70 ? 'text-teal' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>IQ VERDICT: SHORT-TERM RENTAL</div>
                <div className="flex items-center gap-4 bg-white rounded-full px-5 py-3 shadow-sm mb-3">
                  <span className={`text-3xl font-extrabold tabular-nums ${
                    calc.dealScore >= 70 ? 'text-teal' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                  }`}>{calc.dealScore}</span>
                  <div>
                    <div className="text-base font-bold text-slate-800">{verdict}</div>
                    <div className="text-xs text-slate-500">Deal Score</div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-center">{verdictSub}</p>
              </div>
              
              <div className="px-5 py-4 border-t border-slate-100">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-3">RETURNS VS TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{t.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${t.met ? 'text-teal' : 'text-slate-800'}`}>
                      {t.actual.toFixed(1)}{t.unit} / {t.target}{t.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Price Position Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">PRICE POSITION</div>
              
              {/* Gauge SVG */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <svg width="160" height="90" viewBox="0 0 160 90">
                    <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 15 80 A 65 65 0 0 1 80 15" fill="none" stroke="rgba(239, 68, 68, 0.35)" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 80 15 A 65 65 0 0 1 145 80" fill="none" stroke="rgba(8, 145, 178, 0.35)" strokeWidth="14" strokeLinecap="round" />
                    <line 
                      x1="80" y1="80" 
                      x2={calc.needleX} y2={calc.needleY} 
                      stroke={calc.dealScore >= 50 ? '#0891B2' : '#EF4444'} 
                      strokeWidth="3" strokeLinecap="round"
                      style={{ transition: 'all 0.3s ease-out' }}
                    />
                    <circle cx="80" cy="80" r="6" fill="#0f172a" />
                    <circle cx="80" cy="80" r="3" fill="#fff" />
                  </svg>
                  <div className="absolute bottom-0 left-1 text-[9px] font-bold text-red-500">LOSS</div>
                  <div className="absolute bottom-0 right-1 text-[9px] font-bold text-teal">PROFIT</div>
                </div>
              </div>
              
              {/* Price rows */}
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg">
                  <span className="text-sm text-slate-500">List Price</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(inputs.purchase_price)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg">
                  <span className="text-sm text-slate-500">Breakeven Price</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.breakevenPrice)}</span>
                </div>
                <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg border ${
                  inputs.purchase_price <= calc.breakevenPrice 
                    ? 'bg-teal/10 border-teal/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <span className={`text-sm font-medium ${inputs.purchase_price <= calc.breakevenPrice ? 'text-teal' : 'text-red-500'}`}>
                    Your Price
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${inputs.purchase_price <= calc.breakevenPrice ? 'text-teal' : 'text-red-500'}`}>
                    {fmt.currency(inputs.purchase_price)}
                  </span>
                </div>
                {inputs.purchase_price > calc.breakevenPrice && (
                  <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 font-medium">
                      Price is {fmt.currency(inputs.purchase_price - calc.breakevenPrice)} above breakeven
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">REVENUE BREAKDOWN</div>
              <StrRevenueBreakdown
                grossRevenue={calc.grossRevenue}
                nightlyRevenue={calc.rentalRevenue}
                cleaningFees={calc.cleaningFeeRevenue}
                revpar={calc.revpar}
              />
            </div>
            
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">KEY METRICS</div>
              <KeyMetricsGrid
                metrics={[
                  { value: `${calc.capRate.toFixed(1)}%`, label: 'Cap Rate', highlight: true },
                  { value: `${calc.cashOnCash.toFixed(1)}%`, label: 'CoC Return' },
                  { value: `${calc.dscr.toFixed(2)}x`, label: 'DSCR' },
                  { value: `${calc.grm.toFixed(1)}`, label: 'GRM' },
                ]}
                accentClass="str"
              />
            </div>
            
            {/* STR vs LTR Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-4">STR VS LTR COMPARISON</div>
              <StrVsLtrComparison
                strCashFlow={calc.monthlyCashFlow}
                ltrCashFlow={estLTRCashFlow}
              />
            </div>
            
            {/* CTA Button */}
            <button 
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-teal/10 hover:bg-teal/20 border border-teal/25 rounded-full text-slate-800 font-bold text-sm transition-colors"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}
