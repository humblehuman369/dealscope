'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useUIStore } from '@/stores'
import { ArrowLeft, ArrowLeftRight, ChevronDown, CheckCircle2 } from 'lucide-react'
import { DEFAULT_RENOVATION_BUDGET_PCT, DEFAULT_TARGET_PURCHASE_PCT } from '@/lib/iqTarget'

// Section components for tab navigation
import { SalesCompsSection } from '../sections/SalesCompsSection'
import { RentalCompsSection } from '../sections/RentalCompsSection'
import { MarketDataSection } from '../sections/MarketDataSection'
import { MultiYearProjections } from '../sections/MultiYearProjections'
import { CashFlowChart } from '../charts/CashFlowChart'
import { EquityChart } from '../charts/EquityChart'

// Strategy definitions for switcher
const strategies = [
  { id: 'ltr', label: 'Long-term Rental' },
  { id: 'str', label: 'Short-term Rental' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Fix & Flip' },
  { id: 'househack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
]

// ============================================
// ICONS (minimal line style)
// ============================================
const Icons = {
  home: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </svg>
  ),
  tool: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
    </svg>
  ),
  bank: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  sale: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
    </svg>
  ),
  returns: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
    </svg>
  ),
}

// ============================================
// SECTION DEFINITIONS
// ============================================
const SECTIONS = [
  { id: 'purchase', title: 'Purchase & Rehab', icon: 'home' },
  { id: 'financing', title: 'Financing', icon: 'bank' },
  { id: 'valuation', title: 'Valuation', icon: 'tool' },
  { id: 'holding', title: 'Holding Costs', icon: 'clock' },
  { id: 'sale', title: 'Sale Proceeds', icon: 'sale' },
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
  months: (v: number) => `${v} mo`,
}

// ============================================
// PROPS
// ============================================
interface FlipWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportPDF?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function FlipWorksheet({ 
  property,
  propertyId,
  onExportPDF,
}: FlipWorksheetProps) {
  const router = useRouter()
  
  // Strategy switcher state
  const [isStrategyDropdownOpen, setIsStrategyDropdownOpen] = useState(false)
  const { activeStrategy, setActiveStrategy } = useUIStore()
  
  // This worksheet's strategy - always Fix & Flip
  const thisStrategy = { id: 'flip', label: 'Fix & Flip' }
  
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

  // ============================================
  // STATE - Updated defaults per default_assumptions.csv
  // ============================================
  const listPrice = propertyData.listPrice || 300000
  const defaultArv = propertyData.arv || listPrice * 1.35
  const defaultInsurance = propertyData.insurance || (listPrice * 0.01) // 1% of list price
  const defaultRehabCosts = defaultArv * DEFAULT_RENOVATION_BUDGET_PCT // 5% of ARV
  
  // For flips, estimate breakeven using 70% rule: ARV * 0.70 - Rehab = MAO
  // Then initial purchase price = MAO * 95% (DEFAULT_TARGET_PURCHASE_PCT)
  const mao = (defaultArv * 0.70) - defaultRehabCosts
  const initialPurchasePrice = Math.min(
    Math.max(Math.round(mao * DEFAULT_TARGET_PURCHASE_PCT), listPrice * 0.50),
    listPrice
  )
  
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice)
  const [rehabCosts, setRehabCosts] = useState(defaultRehabCosts)         // 5% of ARV
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)             // 3%
  const [financingPct, setFinancingPct] = useState(80)                    // 80%
  const [interestRate, setInterestRate] = useState(12)                    // 12% hard money
  const [loanPoints, setLoanPoints] = useState(2)
  const [arv, setArv] = useState(defaultArv)
  const [holdingMonths, setHoldingMonths] = useState(6)
  const [propertyTaxes, setPropertyTaxes] = useState(propertyData.propertyTaxes || 4000)
  const [insurance, setInsurance] = useState(defaultInsurance)            // 1% of purchase price
  const [utilities, setUtilities] = useState(100)                         // $100
  const [sellingCostsPct, setSellingCostsPct] = useState(6)               // 6%
  
  // Hybrid accordion mode
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({})

  // ============================================
  // CALCULATIONS
  // ============================================
  const calc = useMemo(() => {
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const allInCost = purchasePrice + rehabCosts + purchaseCosts
    const loanAmount = purchasePrice * (financingPct / 100)
    const downPayment = purchasePrice - loanAmount
    const pointsCost = loanAmount * (loanPoints / 100)
    const cashToClose = downPayment + purchaseCosts + pointsCost
    const monthlyInterest = (loanAmount * (interestRate / 100)) / 12
    const totalInterest = monthlyInterest * holdingMonths
    const monthlyTaxes = propertyTaxes / 12
    const monthlyInsurance = insurance / 12
    const totalHoldingCosts = (monthlyInterest + monthlyTaxes + monthlyInsurance + utilities) * holdingMonths
    const sellingCosts = arv * (sellingCostsPct / 100)
    const grossSaleProceeds = arv - sellingCosts
    const netSaleProceeds = grossSaleProceeds - loanAmount
    const totalCashInvested = cashToClose + rehabCosts + totalHoldingCosts
    const actualProfit = arv - allInCost - totalHoldingCosts - sellingCosts
    const roi = totalCashInvested > 0 ? (actualProfit / totalCashInvested) * 100 : 0
    const annualizedRoi = holdingMonths > 0 ? (roi / holdingMonths) * 12 : 0
    const profitMargin = arv > 0 ? (actualProfit / arv) * 100 : 0
    const mao = (arv * 0.7) - rehabCosts
    const meets70Rule = purchasePrice <= mao
    const allInPctArv = arv > 0 ? (allInCost / arv) * 100 : 0
    const pricePerSqft = sqft > 0 ? purchasePrice / sqft : 0
    const arvPerSqft = sqft > 0 ? arv / sqft : 0
    const breakeven = allInCost + totalHoldingCosts + (allInCost * (sellingCostsPct / 100))
    
    // Deal Score (Opportunity-Based)
    // For Flip, score based on all-in cost as percentage of ARV
    // 70% rule: all-in at 70% or less = strong opportunity
    const discountPercent = Math.max(0, allInPctArv - 55) // 55% all-in = 0% "discount needed", 100% = 45%
    const dealScore = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))))
    
    return {
      purchaseCosts, allInCost, loanAmount, downPayment, pointsCost, cashToClose,
      monthlyInterest, totalInterest, totalHoldingCosts, sellingCosts, grossSaleProceeds, netSaleProceeds,
      totalCashInvested, actualProfit, roi, annualizedRoi, profitMargin,
      mao, meets70Rule, allInPctArv, pricePerSqft, arvPerSqft, breakeven, dealScore,
    }
  }, [purchasePrice, rehabCosts, purchaseCostsPct, financingPct, interestRate, loanPoints, arv, holdingMonths, propertyTaxes, insurance, utilities, sellingCostsPct, sqft])

  // Hybrid toggle
  const isSectionOpen = useCallback((index: number) => {
    if (manualOverrides[index] !== undefined) return manualOverrides[index]
    return currentSection === index
  }, [manualOverrides, currentSection])

  const toggleSection = useCallback((index: number) => {
    const currentlyOpen = isSectionOpen(index)
    setManualOverrides(prev => ({ ...prev, [index]: !currentlyOpen }))
    if (!currentlyOpen) {
      setCurrentSection(index)
      setCompletedSections(prev => new Set([...Array.from(prev), index]))
    }
  }, [isSectionOpen])

  // ============================================
  // RENDER HELPERS
  // ============================================
  const InputRow = ({ label, value, onChange, min, max, step, format, subValue }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: 'currency' | 'percent' | 'months' | 'number'; subValue?: string
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : format === 'months' ? fmt.months(value) : value.toString()
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    
    const handleStartEdit = () => {
      if (format === 'currency') setEditValue(Math.round(value).toString())
      else if (format === 'percent') setEditValue(value.toFixed(1))
      else setEditValue(value.toString())
      setIsEditing(true)
    }
    
    const handleEndEdit = () => {
      setIsEditing(false)
      let parsed = parseFloat(editValue.replace(/[$,%\s]/g, ''))
      if (isNaN(parsed)) return
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
              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEndEdit} onKeyDown={handleKeyDown} autoFocus className="w-24 px-2 py-0.5 text-sm font-semibold text-slate-800 tabular-nums text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"/>
            ) : (
              <span onClick={handleStartEdit} className="text-sm font-semibold text-slate-800 tabular-nums cursor-pointer hover:text-blue-600 hover:underline">{displayValue}</span>
            )}
            {subValue && <span className="text-xs text-slate-400 ml-1.5 tabular-nums">{subValue}</span>}
          </div>
        </div>
        <div className="relative">
          <div className="h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${percentage}%` }} /></div>
          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer"/>
        </div>
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

  const Section = ({ index, title, iconKey, children }: { index: number; title: string; iconKey: keyof typeof Icons; children: React.ReactNode }) => {
    const isOpen = isSectionOpen(index)
    const isComplete = completedSections.has(index) && !isOpen
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button onClick={() => toggleSection(index)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{Icons[iconKey]}</div>
            <span className="font-semibold text-slate-800">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}
            <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </button>
        {isOpen && <div className="px-4 pb-4 border-t border-slate-100">{children}</div>}
      </div>
    )
  }

  const isProfit = calc.actualProfit > 0
  // Opportunity-based verdict using all-in cost % of ARV
  const allInDiscount = Math.max(0, calc.allInPctArv - 55)
  let verdict: string, verdictSub: string
  if (allInDiscount <= 5) { verdict = "Strong Opportunity"; verdictSub = "Excellent deal - great all-in cost" }
  else if (allInDiscount <= 10) { verdict = "Great Opportunity"; verdictSub = "Very good flip fundamentals" }
  else if (allInDiscount <= 15) { verdict = "Moderate Opportunity"; verdictSub = "Good potential - negotiate firmly" }
  else if (allInDiscount <= 25) { verdict = "Potential Opportunity"; verdictSub = "Possible deal - need better purchase price" }
  else if (allInDiscount <= 35) { verdict = "Mild Opportunity"; verdictSub = "Challenging - major price reduction needed" }
  else { verdict = "Weak Opportunity"; verdictSub = "Not recommended - unrealistic discount needed" }

  const targets = [
    { label: 'ROI', actual: calc.roi, target: 20, unit: '%', met: calc.roi >= 20 },
    { label: 'Profit Margin', actual: calc.profitMargin, target: 10, unit: '%', met: calc.profitMargin >= 10 },
    { label: 'All-In/ARV', actual: calc.allInPctArv, target: 70, unit: '%', met: calc.meets70Rule },
    { label: 'Net Profit', actual: calc.actualProfit, target: 30000, unit: '$', met: calc.actualProfit >= 30000 },
  ]

  // ============================================
  // Build full address
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  // RENDER
  // ============================================
  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* PAGE TITLE ROW - Back Arrow + Strategy Title + Strategy Switcher */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">{thisStrategy.label} Analysis</h1>
                <p className="text-sm text-slate-500 truncate">{fullAddress}</p>
              </div>
            </div>
            <div className="relative flex-shrink-0">
              <button onClick={() => setIsStrategyDropdownOpen(!isStrategyDropdownOpen)} className="flex items-center gap-2 bg-white border border-slate-300 hover:border-teal hover:bg-teal/5 text-slate-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors">
                <ArrowLeftRight className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Switch Strategy</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStrategyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStrategyDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStrategyDropdownOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-3 py-2 border-b border-slate-100"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Investment Strategies</span></div>
                    {strategies.map((strategy) => (
                      <button key={strategy.id} onClick={() => { setIsStrategyDropdownOpen(false); if (strategy.id !== thisStrategy.id) { setActiveStrategy(strategy.id); router.push(`/worksheet/${propertyId}/${strategy.id}`); } }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${thisStrategy.id === strategy.id ? 'bg-teal/10 text-teal' : 'text-slate-700'}`}>
                        <span className="font-medium">{strategy.label}</span>
                        {thisStrategy.id === strategy.id && <CheckCircle2 className="w-4 h-4 ml-auto text-teal" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* WORKSHEET TAB NAV */}
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav propertyId={propertyId} strategy="flip" zpid={property.zpid || propertyData.zpid} />
        </div>
      </div>
      
      {/* KPI CARDS ROW */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">All-In Cost</div><div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.allInCost)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">ARV</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.currencyCompact(arv)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Out</div><div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.cashToClose + rehabCosts)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Net Profit</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>{isProfit ? '+' : ''}{fmt.currencyCompact(calc.actualProfit)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">ROI</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.percent(calc.roi)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.dealScore >= 70 ? 'bg-blue-500/15' : calc.dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</div></div>
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
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          
          {/* LEFT COLUMN */}
          <div className="space-y-3">
            <Section index={0} title="Purchase & Rehab" iconKey="home">
              <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={1000000} step={5000} format="currency" />
              <InputRow label="Rehab Costs" value={rehabCosts} onChange={setRehabCosts} min={0} max={200000} step={1000} format="currency" />
              <InputRow label="Closing Costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} min={0} max={5} step={0.5} format="percent" subValue={fmt.currency(calc.purchaseCosts)} />
              <div className="mt-3 pt-3"><SummaryBox label="Total All-In Cost" value={fmt.currency(calc.allInCost)} variant="blue" /></div>
            </Section>
            
            <Section index={1} title="Financing" iconKey="bank">
              <InputRow label="Financing %" value={financingPct} onChange={setFinancingPct} min={0} max={100} step={5} format="percent" />
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <DisplayRow label="Down Payment" value={fmt.currency(calc.downPayment)} />
              <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} min={6} max={18} step={0.5} format="percent" />
              <InputRow label="Points" value={loanPoints} onChange={setLoanPoints} min={0} max={5} step={0.5} format="number" subValue=" pts" />
              <DisplayRow label="Points Cost" value={fmt.currency(calc.pointsCost)} />
              <div className="mt-3 pt-3"><SummaryBox label="Cash to Close" value={fmt.currency(calc.cashToClose)} /></div>
            </Section>
            
            <Section index={2} title="Valuation" iconKey="tool">
              <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(purchasePrice * 0.8)} max={Math.round(purchasePrice * 2)} step={5000} format="currency" />
              <DisplayRow label="Purchase / Sq.Ft." value={`$${Math.round(calc.pricePerSqft)}`} />
              <DisplayRow label="ARV / Sq.Ft." value={`$${Math.round(calc.arvPerSqft)}`} />
              <DisplayRow label="All-In % of ARV" value={fmt.percent(calc.allInPctArv)} variant={calc.meets70Rule ? 'success' : 'danger'} />
              <DisplayRow label="70% Rule MAO" value={fmt.currency(calc.mao)} />
              <div className="mt-3 pt-3"><SummaryBox label={calc.meets70Rule ? "✓ Meets 70% Rule" : "✗ Above 70% Rule"} value={fmt.currency(purchasePrice - calc.mao)} variant={calc.meets70Rule ? 'success' : 'danger'} /></div>
            </Section>
            
            <Section index={3} title="Holding Costs" iconKey="clock">
              <InputRow label="Holding Period" value={holdingMonths} onChange={setHoldingMonths} min={1} max={12} step={1} format="months" />
              <DisplayRow label="Monthly Interest" value={`−${fmt.currency(calc.monthlyInterest)}`} variant="danger" />
              <InputRow label="Property Taxes" value={propertyTaxes} onChange={setPropertyTaxes} min={1000} max={20000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Insurance" value={insurance} onChange={setInsurance} min={500} max={10000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Utilities" value={utilities} onChange={setUtilities} min={0} max={1000} step={50} format="currency" subValue="/mo" />
              <div className="mt-3 pt-3"><SummaryBox label="Total Holding Costs" value={`−${fmt.currency(calc.totalHoldingCosts)}`} variant="danger" /></div>
            </Section>
            
            <Section index={4} title="Sale Proceeds" iconKey="sale">
              <DisplayRow label="ARV (Sale Price)" value={fmt.currency(arv)} variant="blue" />
              <InputRow label="Selling Costs" value={sellingCostsPct} onChange={setSellingCostsPct} min={5} max={12} step={0.5} format="percent" subValue={fmt.currency(calc.sellingCosts)} />
              <DisplayRow label="Gross Proceeds" value={fmt.currency(calc.grossSaleProceeds)} />
              <DisplayRow label="Loan Payoff" value={`−${fmt.currency(calc.loanAmount)}`} variant="danger" />
              <div className="mt-3 pt-3"><SummaryBox label="Net Sale Proceeds" value={fmt.currency(calc.netSaleProceeds)} variant="success" /></div>
            </Section>
            
            <Section index={5} title="Returns" iconKey="returns">
              <DisplayRow label="Total Cash Invested" value={fmt.currency(calc.totalCashInvested)} />
              <DisplayRow label="Net Profit" value={fmt.currency(calc.actualProfit)} variant={isProfit ? 'success' : 'danger'} />
              <DisplayRow label="ROI" value={fmt.percent(calc.roi)} variant={calc.roi >= 20 ? 'success' : 'default'} />
              <DisplayRow label="Annualized ROI" value={fmt.percent(calc.annualizedRoi)} variant={calc.annualizedRoi >= 50 ? 'success' : 'default'} />
              <DisplayRow label="Profit Margin" value={fmt.percent(calc.profitMargin)} variant={calc.profitMargin >= 10 ? 'success' : 'default'} />
              <DisplayRow label="Breakeven Price" value={fmt.currency(calc.breakeven)} />
            </Section>
          </div>
          
          {/* RIGHT COLUMN */}
          <div className="space-y-4 sm:sticky sm:top-28">
            {/* IQ Verdict */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">IQ VERDICT: FLIP</div>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6"/><circle cx="40" cy="40" r="34" fill="none" stroke={calc.dealScore >= 70 ? '#3b82f6' : calc.dealScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(calc.dealScore / 100) * 213.6} 213.6`}/></svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className={`text-2xl font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</span></div>
                </div>
                <div><div className={`text-lg font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{verdict}</div><div className="text-sm text-slate-500">{verdictSub}</div></div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">FLIP TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold tabular-nums ${t.met ? 'text-blue-600' : 'text-slate-800'}`}>{t.unit === '$' ? fmt.currencyCompact(t.actual) : fmt.percent(t.actual)}</span>
                      <span className="text-[10px] text-slate-400">/ {t.unit === '$' ? fmt.currencyCompact(t.target) : `${t.target}%`}</span>
                      {t.met ? <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Price Position */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">PRICE POSITION</div>
              <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full mb-4">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-slate-800" style={{ left: `calc(${Math.min(100, Math.max(0, (calc.allInPctArv / 100) * 100))}% - 8px)` }}/>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: '70%' }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">ARV</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(arv)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">All-In</span><span className={`font-semibold ${calc.meets70Rule ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.allInCost)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">MAO (70%)</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(calc.mao)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Breakeven</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(calc.breakeven)}</span></div>
              </div>
            </div>
            
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">KEY METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="py-3 px-4 rounded-lg bg-blue-50 border border-blue-200"><div className="text-xs text-slate-500 mb-1">Net Profit</div><div className={`text-lg font-bold ${isProfit ? 'text-blue-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.actualProfit)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Cash Invested</div><div className="text-lg font-bold text-slate-800">{fmt.currencyCompact(calc.totalCashInvested)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">ROI</div><div className={`text-lg font-bold ${calc.roi >= 20 ? 'text-blue-600' : 'text-slate-800'}`}>{fmt.percent(calc.roi)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Annualized</div><div className={`text-lg font-bold ${calc.annualizedRoi >= 50 ? 'text-blue-600' : 'text-slate-800'}`}>{fmt.percent(calc.annualizedRoi)}</div></div>
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
