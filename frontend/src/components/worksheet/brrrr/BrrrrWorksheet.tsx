'use client'

import React, { useState, useMemo, useCallback } from 'react'
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

// ============================================
// ICONS
// ============================================
const Icons = {
  home: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>),
  bank: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg>),
  tool: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>),
  clock: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>),
  refresh: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>),
  cashflow: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>),
  returns: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>),
}

const SECTIONS = [
  { id: 'purchase', title: 'Purchase & Rehab', icon: 'home' },
  { id: 'financing', title: 'Financing (Purchase)', icon: 'bank' },
  { id: 'valuation', title: 'Valuation', icon: 'tool' },
  { id: 'holding', title: 'Holding Costs', icon: 'clock' },
  { id: 'refinance', title: 'Refinance', icon: 'refresh' },
  { id: 'cashflow', title: 'Cash Flow', icon: 'cashflow' },
  { id: 'returns', title: 'Returns', icon: 'returns' },
] as const

const fmt = {
  currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
  currencyCompact: (v: number) => {
    const abs = Math.abs(v); const sign = v < 0 ? '-' : ''
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 1 : 2)}M`
    if (abs >= 100000) return `${sign}$${(abs / 1000).toFixed(0)}K`
    if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}K`
    return `${sign}$${Math.round(abs).toLocaleString()}`
  },
  percent: (v: number) => `${v.toFixed(1)}%`,
  months: (v: number) => `${v} mo`,
}

interface BrrrrWorksheetProps { property: SavedProperty; propertyId: string; onExportPDF?: () => void }

export function BrrrrWorksheet({ property, propertyId, onExportPDF }: BrrrrWorksheetProps) {
  // Get active section from store for tab navigation
  const { activeSection } = useWorksheetStore()
  
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // STATE
  const [purchasePrice, setPurchasePrice] = useState(propertyData.listPrice || 200000)
  const [rehabCosts, setRehabCosts] = useState(50000)
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(2)
  const [loanToCostPct, setLoanToCostPct] = useState(90)
  const [interestRate, setInterestRate] = useState(12)
  const [loanPoints, setLoanPoints] = useState(2)
  const [arv, setArv] = useState(propertyData.arv || (propertyData.listPrice || 200000) * 1.35)
  const [holdingMonths, setHoldingMonths] = useState(4)
  const [propertyTaxes, setPropertyTaxes] = useState(propertyData.propertyTaxes || 3000)
  const [insurance, setInsurance] = useState(propertyData.insurance || 1800)
  const [utilities, setUtilities] = useState(200)
  const [refiLtvPct, setRefiLtvPct] = useState(75)
  const [refiInterestRate, setRefiInterestRate] = useState(7.5)
  const [refiClosingCosts, setRefiClosingCosts] = useState(4000)
  const [monthlyRent, setMonthlyRent] = useState(propertyData.monthlyRent || 2200)
  const [vacancyRate, setVacancyRate] = useState(8)
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(8)
  const [maintenancePct, setMaintenancePct] = useState(5)
  
  const [viewMode, setViewMode] = useState<'guided' | 'showall'>('guided')
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))

  const calc = useMemo(() => {
    // Purchase Phase
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const allInCost = purchasePrice + rehabCosts + purchaseCosts
    const loanAmount = purchasePrice * (loanToCostPct / 100)
    const downPayment = purchasePrice - loanAmount
    const pointsCost = loanAmount * (loanPoints / 100)
    const cashToClose = downPayment + purchaseCosts + pointsCost
    
    // Holding Phase
    const monthlyInterest = (loanAmount * (interestRate / 100)) / 12
    const totalHoldingInterest = monthlyInterest * holdingMonths
    const monthlyTaxes = propertyTaxes / 12
    const monthlyInsurance = insurance / 12
    const totalHoldingCosts = (monthlyInterest + monthlyTaxes + monthlyInsurance + utilities) * holdingMonths
    const totalCashInvested = cashToClose + rehabCosts + totalHoldingCosts
    
    // Valuation
    const allInPctArv = arv > 0 ? (allInCost / arv) * 100 : 0
    const equityCreated = arv - allInCost
    const pricePerSqft = sqft > 0 ? purchasePrice / sqft : 0
    const arvPerSqft = sqft > 0 ? arv / sqft : 0
    
    // Refinance Phase
    const refinanceLoanAmount = arv * (refiLtvPct / 100)
    const cashOut = refinanceLoanAmount - loanAmount - refiClosingCosts
    const cashLeftInDeal = totalCashInvested - cashOut
    const cashOutPct = totalCashInvested > 0 ? (cashOut / totalCashInvested) * 100 : 0
    const recoveryPercent = totalCashInvested > 0 ? (cashOut / totalCashInvested) * 100 : 0
    
    // Cash Flow (Post-Refinance)
    const grossMonthlyRent = monthlyRent
    const effectiveRent = grossMonthlyRent * (1 - vacancyRate / 100)
    const annualGrossRent = effectiveRent * 12
    const annualPropertyMgmt = annualGrossRent * (propertyMgmtPct / 100)
    const annualMaintenance = annualGrossRent * (maintenancePct / 100)
    const annualExpenses = propertyTaxes + insurance + annualPropertyMgmt + annualMaintenance
    const noi = annualGrossRent - annualExpenses
    
    // Refi Mortgage Payment (30yr fixed)
    const refiMonthlyRate = (refiInterestRate / 100) / 12
    const refiNumPayments = 30 * 12
    const refiMonthlyPayment = refinanceLoanAmount > 0 
      ? refinanceLoanAmount * (refiMonthlyRate * Math.pow(1 + refiMonthlyRate, refiNumPayments)) / (Math.pow(1 + refiMonthlyRate, refiNumPayments) - 1)
      : 0
    const annualDebtService = refiMonthlyPayment * 12
    
    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = annualCashFlow / 12
    
    // Returns
    const capRate = arv > 0 ? (noi / arv) * 100 : 0
    const cashOnCash = cashLeftInDeal > 0 ? (annualCashFlow / cashLeftInDeal) * 100 : (annualCashFlow > 0 ? 999 : 0)
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
    
    // Deal Score
    const allInScore = allInPctArv <= 75 ? 25 : Math.max(0, 25 - ((allInPctArv - 75) * 2.5))
    const recoveryScore = recoveryPercent >= 100 ? 25 : Math.max(0, (recoveryPercent / 100) * 25)
    const capScore = Math.min(20, Math.max(0, (capRate / 8) * 20))
    const cocScore = cashOnCash >= 10 || cashLeftInDeal <= 0 ? 20 : Math.max(0, (cashOnCash / 10) * 20)
    const cfScore = annualCashFlow > 0 ? Math.min(10, (annualCashFlow / 3000) * 10) : Math.max(-10, (annualCashFlow / 1500) * 5)
    const dealScore = Math.round(Math.min(100, Math.max(0, allInScore + recoveryScore + capScore + cocScore + cfScore)))
    
    return {
      purchaseCosts, allInCost, loanAmount, downPayment, pointsCost, cashToClose,
      totalHoldingInterest, totalHoldingCosts, totalCashInvested,
      allInPctArv, equityCreated, pricePerSqft, arvPerSqft,
      refinanceLoanAmount, cashOut, cashLeftInDeal, cashOutPct, recoveryPercent,
      effectiveRent, annualGrossRent, annualExpenses, noi,
      refiMonthlyPayment, annualDebtService, annualCashFlow, monthlyCashFlow,
      capRate, cashOnCash, dscr, dealScore,
    }
  }, [purchasePrice, rehabCosts, purchaseCostsPct, loanToCostPct, interestRate, loanPoints, arv, holdingMonths, propertyTaxes, insurance, utilities, refiLtvPct, refiInterestRate, refiClosingCosts, monthlyRent, vacancyRate, propertyMgmtPct, maintenancePct, sqft])

  const toggleSection = useCallback((index: number) => {
    if (viewMode === 'showall') return
    if (currentSection === index) setCurrentSection(null)
    else { setCurrentSection(index); setCompletedSections(prev => new Set([...Array.from(prev), index])) }
  }, [viewMode, currentSection])

  // Render Helpers
  const InputRow = ({ label, value, onChange, min, max, step, format, subValue }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: 'currency' | 'percent' | 'months' | 'number'; subValue?: string }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : format === 'months' ? fmt.months(value) : value.toString()
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    const handleStartEdit = () => { setEditValue(format === 'currency' ? Math.round(value).toString() : format === 'percent' ? value.toFixed(1) : value.toString()); setIsEditing(true) }
    const handleEndEdit = () => { setIsEditing(false); let parsed = parseFloat(editValue.replace(/[$,%\s]/g, '')); if (isNaN(parsed)) return; parsed = Math.min(max, Math.max(min, parsed)); onChange(parsed) }
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleEndEdit(); else if (e.key === 'Escape') setIsEditing(false) }
    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-500">{label}</label><div className="text-right">{isEditing ? (<input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEndEdit} onKeyDown={handleKeyDown} autoFocus className="w-24 px-2 py-0.5 text-sm font-semibold text-slate-800 tabular-nums text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"/>) : (<span onClick={handleStartEdit} className="text-sm font-semibold text-slate-800 tabular-nums cursor-pointer hover:text-blue-600 hover:underline">{displayValue}</span>)}{subValue && <span className="text-xs text-slate-400 ml-1.5 tabular-nums">{subValue}</span>}</div></div>
        <div className="relative"><div className="h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${percentage}%` }} /></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer"/></div>
      </div>
    )
  }

  const DisplayRow = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'danger' | 'muted' | 'blue' }) => {
    const colors = { default: 'text-slate-800', success: 'text-emerald-600', danger: 'text-red-500', muted: 'text-slate-400', blue: 'text-blue-600' }
    return <div className="flex items-center justify-between py-2.5"><span className="text-sm text-slate-500">{label}</span><span className={`text-sm font-semibold tabular-nums ${colors[variant]}`}>{value}</span></div>
  }

  const SummaryBox = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'danger' | 'blue' }) => {
    const styles = { default: 'bg-slate-50 border-slate-200', success: 'bg-emerald-50 border-emerald-200', danger: 'bg-red-50 border-red-200', blue: 'bg-blue-50 border-blue-200' }
    const textColor = { default: 'text-slate-800', success: 'text-emerald-600', danger: 'text-red-500', blue: 'text-blue-600' }
    return <div className={`flex items-center justify-between p-3 rounded-lg border ${styles[variant]}`}><span className="text-sm font-medium text-slate-600">{label}</span><span className={`text-base font-bold tabular-nums ${textColor[variant]}`}>{value}</span></div>
  }

  const Section = ({ index, title, iconKey, badge, children }: { index: number; title: string; iconKey: keyof typeof Icons; badge?: string; children: React.ReactNode }) => {
    const isOpen = viewMode === 'showall' || currentSection === index
    const isComplete = completedSections.has(index) && currentSection !== index
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button onClick={() => toggleSection(index)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{Icons[iconKey]}</div>
            <span className="font-semibold text-slate-800">{title}</span>
            {badge && <span className="text-[9px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{badge}</span>}
          </div>
          <div className="flex items-center gap-2">{isComplete && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}<svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
        </button>
        {isOpen && <div className="px-4 pb-4 border-t border-slate-100">{children}</div>}
      </div>
    )
  }

  const isProfit = calc.annualCashFlow >= 0
  const infiniteCoC = calc.cashLeftInDeal <= 0 && calc.annualCashFlow > 0
  let verdict: string, verdictSub: string
  if (calc.dealScore >= 85) { verdict = "Excellent BRRRR"; verdictSub = infiniteCoC ? "Infinite returns - all cash recovered!" : "Strong equity & cash flow" }
  else if (calc.dealScore >= 70) { verdict = "Good BRRRR"; verdictSub = "Solid fundamentals for BRRRR strategy" }
  else if (calc.dealScore >= 55) { verdict = "Fair BRRRR"; verdictSub = "Consider negotiating better terms" }
  else if (isProfit) { verdict = "Marginal BRRRR"; verdictSub = "Thin margins - may need better deal" }
  else { verdict = "Risky BRRRR"; verdictSub = "Cash flow negative after refinance" }

  const targets = [
    { label: 'All-In/ARV', actual: calc.allInPctArv, target: 75, unit: '%', met: calc.allInPctArv <= 75, inverse: true },
    { label: 'Cash Recovery', actual: calc.recoveryPercent, target: 100, unit: '%', met: calc.recoveryPercent >= 100 },
    { label: 'Cap Rate', actual: calc.capRate, target: 8, unit: '%', met: calc.capRate >= 8 },
    { label: 'CoC Return', actual: infiniteCoC ? 999 : calc.cashOnCash, target: 10, unit: '%', met: calc.cashOnCash >= 10 || infiniteCoC },
  ]

  // Build full address
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  return (
    <div className="w-full min-h-screen bg-slate-50 pt-12">
      {/* PROPERTY ADDRESS BAR */}
      <div className="w-full bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-blue-500 hover:text-blue-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-800">{fullAddress}</h1>
          </div>
        </div>
      </div>
      
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200"><div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8"><WorksheetTabNav propertyId={propertyId} strategy="brrrr" zpid={property.zpid || propertyData.zpid} /></div></div>
      
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">All-In Cost</div><div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.allInCost)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">ARV</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.currencyCompact(arv)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.cashOut > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Out</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${calc.cashOut > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.cashOut)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Flow</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.monthlyCashFlow)}/mo</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">CoC Return</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{infiniteCoC ? '∞%' : fmt.percent(calc.cashOnCash)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.dealScore >= 70 ? 'bg-blue-500/15' : calc.dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</div></div>
          </div>
        </div>
      </div>
      
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
              <button onClick={() => setViewMode('guided')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'guided' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Guided</button>
              <button onClick={() => setViewMode('showall')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${viewMode === 'showall' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Expand All</button>
            </div>
          </div>
          
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-3">
            <Section index={0} title="Purchase & Rehab" iconKey="home">
              <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} min={50000} max={500000} step={5000} format="currency" />
              <InputRow label="Rehab Costs" value={rehabCosts} onChange={setRehabCosts} min={0} max={150000} step={1000} format="currency" />
              <InputRow label="Purchase Costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} min={0} max={5} step={0.5} format="percent" subValue={fmt.currency(calc.purchaseCosts)} />
              <div className="mt-3 pt-3"><SummaryBox label="Total All-In Cost" value={fmt.currency(calc.allInCost)} variant="blue" /></div>
            </Section>
            
            <Section index={1} title="Financing (Purchase)" iconKey="bank" badge="Hard Money">
              <InputRow label="Loan to Cost" value={loanToCostPct} onChange={setLoanToCostPct} min={50} max={100} step={5} format="percent" />
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <DisplayRow label="Down Payment" value={fmt.currency(calc.downPayment)} />
              <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} min={8} max={18} step={0.5} format="percent" />
              <InputRow label="Points" value={loanPoints} onChange={setLoanPoints} min={0} max={5} step={0.5} format="number" subValue=" pts" />
              <DisplayRow label="Points Cost" value={fmt.currency(calc.pointsCost)} />
              <div className="mt-3 pt-3"><SummaryBox label="Cash to Close" value={fmt.currency(calc.cashToClose)} /></div>
            </Section>
            
            <Section index={2} title="Valuation" iconKey="tool">
              <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(purchasePrice * 0.8)} max={Math.round(purchasePrice * 2)} step={5000} format="currency" />
              <DisplayRow label="Purchase / Sq.Ft." value={`$${Math.round(calc.pricePerSqft)}`} />
              <DisplayRow label="ARV / Sq.Ft." value={`$${Math.round(calc.arvPerSqft)}`} />
              <DisplayRow label="All-In % of ARV" value={fmt.percent(calc.allInPctArv)} variant={calc.allInPctArv <= 75 ? 'success' : 'danger'} />
              <div className="mt-3 pt-3"><SummaryBox label="Equity Created" value={fmt.currency(calc.equityCreated)} variant={calc.equityCreated > 0 ? 'success' : 'danger'} /></div>
            </Section>
            
            <Section index={3} title="Holding Costs" iconKey="clock" badge="Rehab Period">
              <InputRow label="Holding Period" value={holdingMonths} onChange={setHoldingMonths} min={1} max={12} step={1} format="months" />
              <DisplayRow label="Loan Interest" value={`−${fmt.currency(calc.totalHoldingInterest)}`} variant="danger" />
              <InputRow label="Property Taxes" value={propertyTaxes} onChange={setPropertyTaxes} min={1000} max={15000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Insurance" value={insurance} onChange={setInsurance} min={500} max={8000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Utilities" value={utilities} onChange={setUtilities} min={0} max={500} step={25} format="currency" subValue="/mo" />
              <div className="mt-3 pt-3"><SummaryBox label="Total Holding Costs" value={`−${fmt.currency(calc.totalHoldingCosts)}`} variant="danger" /></div>
            </Section>
            
            <Section index={4} title="Refinance" iconKey="refresh" badge="Cash-Out Refi">
              <InputRow label="Loan to Value" value={refiLtvPct} onChange={setRefiLtvPct} min={65} max={80} step={1} format="percent" />
              <DisplayRow label="New Loan Amount" value={fmt.currency(calc.refinanceLoanAmount)} variant="blue" />
              <InputRow label="Interest Rate" value={refiInterestRate} onChange={setRefiInterestRate} min={5} max={10} step={0.125} format="percent" />
              <InputRow label="Closing Costs" value={refiClosingCosts} onChange={setRefiClosingCosts} min={0} max={15000} step={500} format="currency" />
              <DisplayRow label="Payoff Old Loan" value={`−${fmt.currency(calc.loanAmount)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Cash Out" value={fmt.currency(calc.cashOut)} variant={calc.cashOut > 0 ? 'success' : 'danger'} />
                <SummaryBox label="Cash Left in Deal" value={fmt.currency(Math.max(0, calc.cashLeftInDeal))} variant={calc.cashLeftInDeal <= 0 ? 'success' : 'default'} />
              </div>
            </Section>
            
            <Section index={5} title="Cash Flow" iconKey="cashflow" badge="Post-Refi">
              <InputRow label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} min={500} max={5000} step={50} format="currency" />
              <InputRow label="Vacancy" value={vacancyRate} onChange={setVacancyRate} min={0} max={15} step={1} format="percent" />
              <DisplayRow label="Effective Rent" value={`${fmt.currency(calc.effectiveRent)}/mo`} variant="success" />
              <InputRow label="Property Mgmt" value={propertyMgmtPct} onChange={setPropertyMgmtPct} min={0} max={12} step={1} format="percent" />
              <InputRow label="Maintenance" value={maintenancePct} onChange={setMaintenancePct} min={0} max={15} step={1} format="percent" />
              <DisplayRow label="Mortgage Payment" value={`−${fmt.currency(calc.refiMonthlyPayment)}/mo`} variant="danger" />
              <div className="mt-3 pt-3"><SummaryBox label="Monthly Cash Flow" value={`${fmt.currency(calc.monthlyCashFlow)}/mo`} variant={isProfit ? 'success' : 'danger'} /></div>
            </Section>
            
            <Section index={6} title="Returns" iconKey="returns">
              <DisplayRow label="Total Cash Invested" value={fmt.currency(calc.totalCashInvested)} />
              <DisplayRow label="Cash Recovered" value={fmt.currency(calc.cashOut)} variant={calc.cashOut > 0 ? 'success' : 'default'} />
              <DisplayRow label="Cash Left in Deal" value={fmt.currency(Math.max(0, calc.cashLeftInDeal))} variant={calc.cashLeftInDeal <= 0 ? 'success' : 'default'} />
              <DisplayRow label="Cash-Out %" value={fmt.percent(calc.cashOutPct)} variant={calc.cashOutPct >= 100 ? 'success' : 'default'} />
              <DisplayRow label="Cap Rate (on ARV)" value={fmt.percent(calc.capRate)} variant={calc.capRate >= 8 ? 'success' : 'default'} />
              <DisplayRow label="CoC After Refi" value={infiniteCoC ? '∞%' : fmt.percent(calc.cashOnCash)} variant={calc.cashOnCash >= 10 || infiniteCoC ? 'success' : 'default'} />
              <DisplayRow label="DSCR" value={calc.dscr.toFixed(2)} variant={calc.dscr >= 1.2 ? 'success' : calc.dscr >= 1 ? 'default' : 'danger'} />
              <DisplayRow label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={isProfit ? 'success' : 'danger'} />
            </Section>
          </div>
          
          <div className="space-y-4 sm:sticky sm:top-28">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">IQ VERDICT: BRRRR</div>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6"/><circle cx="40" cy="40" r="34" fill="none" stroke={calc.dealScore >= 70 ? '#3b82f6' : calc.dealScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(calc.dealScore / 100) * 213.6} 213.6`}/></svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className={`text-2xl font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</span></div>
                </div>
                <div><div className={`text-lg font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{verdict}</div><div className="text-sm text-slate-500">{verdictSub}</div></div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">BRRRR TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold tabular-nums ${t.met ? 'text-blue-600' : 'text-slate-800'}`}>{t.actual >= 999 ? '∞%' : fmt.percent(t.actual)}</span>
                      <span className="text-[10px] text-slate-400">/ {t.inverse ? `≤${t.target}%` : `${t.target}%`}</span>
                      {t.met ? <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">PRICE POSITION</div>
              <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full mb-4">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-slate-800" style={{ left: `calc(${Math.min(100, Math.max(0, (calc.allInPctArv / 100) * 100))}% - 8px)` }}/>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: '75%' }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">ARV</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(arv)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">All-In</span><span className={`font-semibold ${calc.allInPctArv <= 75 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.allInCost)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">75% Target</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(arv * 0.75)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Equity</span><span className={`font-semibold ${calc.equityCreated > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.equityCreated)}</span></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">KEY METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`py-3 px-4 rounded-lg ${calc.cashLeftInDeal <= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}><div className="text-xs text-slate-500 mb-1">Cash Left In</div><div className={`text-lg font-bold ${calc.cashLeftInDeal <= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>{fmt.currencyCompact(Math.max(0, calc.cashLeftInDeal))}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Equity Captured</div><div className={`text-lg font-bold ${calc.equityCreated > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.equityCreated)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Cash-Out %</div><div className={`text-lg font-bold ${calc.cashOutPct >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>{fmt.percent(calc.cashOutPct)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">CoC After Refi</div><div className={`text-lg font-bold ${calc.cashOnCash >= 10 || infiniteCoC ? 'text-blue-600' : 'text-slate-800'}`}>{infiniteCoC ? '∞%' : fmt.percent(calc.cashOnCash)}</div></div>
              </div>
            </div>
            
            <button onClick={onExportPDF} className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Export PDF Report
            </button>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}
