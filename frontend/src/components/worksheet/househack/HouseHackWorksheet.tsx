'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useUIStore } from '@/stores'
import { ArrowLeft, ArrowLeftRight, ChevronDown, CheckCircle2 } from 'lucide-react'

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
// ICONS
// ============================================
const Icons = {
  home: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>),
  bank: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg>),
  users: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>),
  expense: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>),
  cashflow: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>),
  returns: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>),
}

const SECTIONS = [
  { id: 'property', title: 'Property & Purchase', icon: 'home' },
  { id: 'financing', title: 'Financing', icon: 'bank' },
  { id: 'units', title: 'Unit Income', icon: 'users' },
  { id: 'expenses', title: 'Expenses', icon: 'expense' },
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
}

interface HouseHackWorksheetProps { property: SavedProperty; propertyId: string; onExportPDF?: () => void }

export function HouseHackWorksheet({ property, propertyId, onExportPDF }: HouseHackWorksheetProps) {
  const router = useRouter()
  
  // Strategy switcher state
  const [isStrategyDropdownOpen, setIsStrategyDropdownOpen] = useState(false)
  const { activeStrategy, setActiveStrategy } = useUIStore()
  
  // This worksheet's strategy - always House Hack
  const thisStrategy = { id: 'househack', label: 'House Hack' }
  
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
  const [purchasePrice, setPurchasePrice] = useState(propertyData.listPrice || 400000)
  const [downPaymentPct, setDownPaymentPct] = useState(5)
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)
  const [interestRate, setInterestRate] = useState(7.0)
  const [loanTerm, setLoanTerm] = useState(30)
  const [propertyType, setPropertyType] = useState<'duplex' | 'triplex' | 'fourplex'>('duplex')
  const [ownerUnit, setOwnerUnit] = useState(0)
  const [unit1Rent, setUnit1Rent] = useState(1500)
  const [unit2Rent, setUnit2Rent] = useState(1500)
  const [unit3Rent, setUnit3Rent] = useState(1200)
  const [unit4Rent, setUnit4Rent] = useState(1200)
  const [vacancyRate, setVacancyRate] = useState(5)
  const [propertyTaxes, setPropertyTaxes] = useState(propertyData.propertyTaxes || 5000)
  const [insurance, setInsurance] = useState(propertyData.insurance || 2400)
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(0)
  const [maintenancePct, setMaintenancePct] = useState(5)
  const [marketRent, setMarketRent] = useState(1800)
  
  // Hybrid accordion mode
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({})

  const unitCount = propertyType === 'duplex' ? 2 : propertyType === 'triplex' ? 3 : 4
  const unitRents = [unit1Rent, unit2Rent, unit3Rent, unit4Rent].slice(0, unitCount)

  const calc = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPct / 100)
    const loanAmount = purchasePrice - downPayment
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const totalCashNeeded = downPayment + purchaseCosts
    const monthlyRate = (interestRate / 100) / 12
    const numPayments = loanTerm * 12
    const monthlyPayment = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0
    
    const rentalIncome = unitRents.filter((_, i) => i !== ownerUnit).reduce((a, b) => a + b, 0)
    const grossRentalIncome = rentalIncome * (1 - vacancyRate / 100)
    const ownerUnitValue = unitRents[ownerUnit] || 0
    
    const monthlyTaxes = propertyTaxes / 12
    const monthlyInsurance = insurance / 12
    const monthlyMgmt = grossRentalIncome * (propertyMgmtPct / 100)
    const monthlyMaintenance = grossRentalIncome * (maintenancePct / 100)
    const totalExpenses = monthlyTaxes + monthlyInsurance + monthlyMgmt + monthlyMaintenance
    
    const totalPITI = monthlyPayment + monthlyTaxes + monthlyInsurance
    const ownerPortion = totalPITI / unitCount
    const yourHousingCost = ownerPortion + (totalExpenses / unitCount) - grossRentalIncome
    const actualHousingCost = Math.max(yourHousingCost, totalPITI - grossRentalIncome)
    
    const savingsVsRenting = marketRent - actualHousingCost
    const monthlyCashFlow = grossRentalIncome - totalExpenses - monthlyPayment
    const fullRentalCashFlow = (unitRents.reduce((a, b) => a + b, 0) * (1 - vacancyRate / 100)) - totalExpenses - monthlyPayment
    
    const annualCashFlow = monthlyCashFlow * 12
    const cocReturn = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0
    const liveFree = actualHousingCost <= 0
    
    const savingsScore = Math.min(30, Math.max(0, (savingsVsRenting / marketRent) * 60))
    const cocScore = Math.min(25, Math.max(0, (cocReturn / 10) * 25))
    const cfScore = fullRentalCashFlow > 0 ? Math.min(25, Math.max(0, (fullRentalCashFlow / 500) * 25)) : Math.max(-10, (fullRentalCashFlow / 250) * 10)
    const liveFreeScore = liveFree ? 20 : Math.min(15, Math.max(0, 15 - (actualHousingCost / marketRent) * 15))
    const dealScore = Math.round(Math.min(100, Math.max(0, savingsScore + cocScore + cfScore + liveFreeScore)))
    
    return {
      downPayment, loanAmount, purchaseCosts, totalCashNeeded, monthlyPayment,
      rentalIncome, grossRentalIncome, ownerUnitValue,
      monthlyTaxes, monthlyInsurance, monthlyMgmt, monthlyMaintenance, totalExpenses,
      totalPITI, yourHousingCost: actualHousingCost, savingsVsRenting,
      monthlyCashFlow, fullRentalCashFlow, annualCashFlow, cocReturn, liveFree, dealScore,
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, interestRate, loanTerm, unitRents, ownerUnit, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, marketRent, unitCount])

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

  const InputRow = ({ label, value, onChange, min, max, step, format, subValue }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: 'currency' | 'percent' | 'years' | 'number'; subValue?: string }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : format === 'years' ? `${value} yr` : value.toString()
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

  const Section = ({ index, title, iconKey, children }: { index: number; title: string; iconKey: keyof typeof Icons; children: React.ReactNode }) => {
    const isOpen = isSectionOpen(index)
    const isComplete = completedSections.has(index) && !isOpen
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button onClick={() => toggleSection(index)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{Icons[iconKey]}</div><span className="font-semibold text-slate-800">{title}</span></div>
          <div className="flex items-center gap-2">{isComplete && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}<svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
        </button>
        {isOpen && <div className="px-4 pb-4 border-t border-slate-100">{children}</div>}
      </div>
    )
  }

  let verdict: string, verdictSub: string
  if (calc.dealScore >= 85) { verdict = "Excellent Hack"; verdictSub = calc.liveFree ? "Live for FREE!" : "Major housing savings" }
  else if (calc.dealScore >= 70) { verdict = "Great Hack"; verdictSub = "Significant savings vs renting" }
  else if (calc.dealScore >= 55) { verdict = "Good Hack"; verdictSub = "Solid house hack opportunity" }
  else if (calc.yourHousingCost < calc.monthlyPayment) { verdict = "Fair Hack"; verdictSub = "Some savings achieved" }
  else { verdict = "Weak Hack"; verdictSub = "Limited benefit vs renting" }

  const targets = [
    { label: 'Housing Cost', actual: calc.yourHousingCost, target: 0, unit: '$', met: calc.yourHousingCost <= 0 },
    { label: 'Savings vs Rent', actual: calc.savingsVsRenting, target: 500, unit: '$', met: calc.savingsVsRenting >= 500 },
    { label: 'CoC Return', actual: calc.cocReturn, target: 8, unit: '%', met: calc.cocReturn >= 8 },
    { label: 'Move-Out CF', actual: calc.fullRentalCashFlow, target: 200, unit: '$', met: calc.fullRentalCashFlow >= 200 },
  ]

  // Build full address - use property.full_address if available, otherwise construct it
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

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
                      <button key={strategy.id} onClick={() => { setIsStrategyDropdownOpen(false); if (strategy.id !== activeStrategy) { setActiveStrategy(strategy.id); router.push(`/worksheet/${propertyId}/${strategy.id}`); } }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${activeStrategy === strategy.id ? 'bg-teal/10 text-teal' : 'text-slate-700'}`}>
                        <span className="font-medium">{strategy.label}</span>
                        {activeStrategy === strategy.id && <CheckCircle2 className="w-4 h-4 ml-auto text-teal" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200"><div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8"><WorksheetTabNav propertyId={propertyId} strategy="househack" zpid={property.zpid || propertyData.zpid} /></div></div>
      
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.liveFree ? 'bg-emerald-500/15' : calc.yourHousingCost < marketRent ? 'bg-blue-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Housing Cost</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${calc.liveFree ? 'text-emerald-600' : calc.yourHousingCost < marketRent ? 'text-blue-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.yourHousingCost)}/mo</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-emerald-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Rental Income</div><div className="text-xs sm:text-sm lg:text-base font-bold text-emerald-600 tabular-nums truncate">{fmt.currencyCompact(calc.grossRentalIncome)}/mo</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Cash Needed</div><div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(calc.totalCashNeeded)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.fullRentalCashFlow >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Move-Out CF</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${calc.fullRentalCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.fullRentalCashFlow)}/mo</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">CoC Return</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.percent(calc.cocReturn)}</div></div>
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
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-3">
            <Section index={0} title="Property & Purchase" iconKey="home">
              <div className="py-3"><label className="text-sm text-slate-500">Property Type</label><select value={propertyType} onChange={(e) => setPropertyType(e.target.value as typeof propertyType)} className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="duplex">Duplex (2 Units)</option><option value="triplex">Triplex (3 Units)</option><option value="fourplex">Fourplex (4 Units)</option></select></div>
              <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={1500000} step={5000} format="currency" />
              <InputRow label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} min={0} max={25} step={0.5} format="percent" subValue={fmt.currency(calc.downPayment)} />
              <InputRow label="Closing Costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} min={0} max={6} step={0.5} format="percent" subValue={fmt.currency(calc.purchaseCosts)} />
              <div className="mt-3 pt-3"><SummaryBox label="Total Cash Needed" value={fmt.currency(calc.totalCashNeeded)} variant="blue" /></div>
            </Section>
            
            <Section index={1} title="Financing" iconKey="bank">
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} min={3} max={10} step={0.125} format="percent" />
              <InputRow label="Loan Term" value={loanTerm} onChange={setLoanTerm} min={15} max={30} step={5} format="years" />
              <div className="mt-3 pt-3"><SummaryBox label="Monthly Payment" value={fmt.currency(calc.monthlyPayment)} /></div>
            </Section>
            
            <Section index={2} title="Unit Income" iconKey="users">
              <div className="py-3"><label className="text-sm text-slate-500">You Live In</label><select value={ownerUnit} onChange={(e) => setOwnerUnit(parseInt(e.target.value))} className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">{unitRents.map((_, i) => <option key={i} value={i}>Unit {i + 1}</option>)}</select></div>
              {unitRents.map((rent, i) => (
                <InputRow key={i} label={`Unit ${i + 1} Rent${i === ownerUnit ? ' (Your Unit)' : ''}`} value={i === 0 ? unit1Rent : i === 1 ? unit2Rent : i === 2 ? unit3Rent : unit4Rent} onChange={i === 0 ? setUnit1Rent : i === 1 ? setUnit2Rent : i === 2 ? setUnit3Rent : setUnit4Rent} min={500} max={5000} step={50} format="currency" subValue={i === ownerUnit ? 'You' : ''} />
              ))}
              <InputRow label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} min={0} max={15} step={1} format="percent" />
              <div className="mt-3 pt-3"><SummaryBox label="Gross Rental Income" value={`${fmt.currency(calc.grossRentalIncome)}/mo`} variant="success" /></div>
            </Section>
            
            <Section index={3} title="Expenses" iconKey="expense">
              <InputRow label="Property Taxes" value={propertyTaxes} onChange={setPropertyTaxes} min={1000} max={20000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Insurance" value={insurance} onChange={setInsurance} min={500} max={10000} step={100} format="currency" subValue="/yr" />
              <InputRow label="Property Mgmt" value={propertyMgmtPct} onChange={setPropertyMgmtPct} min={0} max={12} step={1} format="percent" />
              <InputRow label="Maintenance" value={maintenancePct} onChange={setMaintenancePct} min={0} max={15} step={1} format="percent" />
              <div className="mt-3 pt-3"><SummaryBox label="Monthly Expenses" value={`−${fmt.currency(calc.totalExpenses)}`} variant="danger" /></div>
            </Section>
            
            <Section index={4} title="Cash Flow" iconKey="cashflow">
              <DisplayRow label="Rental Income" value={`+${fmt.currency(calc.grossRentalIncome)}`} variant="success" />
              <DisplayRow label="Total Expenses" value={`−${fmt.currency(calc.totalExpenses)}`} variant="danger" />
              <DisplayRow label="Mortgage (P&I)" value={`−${fmt.currency(calc.monthlyPayment)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Your Housing Cost" value={`${fmt.currency(calc.yourHousingCost)}/mo`} variant={calc.liveFree ? 'success' : 'default'} />
                <SummaryBox label="If You Move Out" value={`${fmt.currency(calc.fullRentalCashFlow)}/mo`} variant={calc.fullRentalCashFlow >= 0 ? 'success' : 'danger'} />
              </div>
            </Section>
            
            <Section index={5} title="Returns" iconKey="returns">
              <InputRow label="Market Rent (Comparable)" value={marketRent} onChange={setMarketRent} min={500} max={5000} step={50} format="currency" />
              <DisplayRow label="Your Housing Cost" value={`${fmt.currency(calc.yourHousingCost)}/mo`} variant={calc.liveFree ? 'success' : 'default'} />
              <DisplayRow label="Savings vs Renting" value={`+${fmt.currency(calc.savingsVsRenting)}/mo`} variant={calc.savingsVsRenting > 0 ? 'success' : 'danger'} />
              <DisplayRow label="CoC Return" value={fmt.percent(calc.cocReturn)} variant={calc.cocReturn >= 8 ? 'success' : 'default'} />
              <DisplayRow label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} />
            </Section>
          </div>
          
          <div className="space-y-4 sm:sticky sm:top-28">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">IQ VERDICT: HOUSE HACK</div>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6"/><circle cx="40" cy="40" r="34" fill="none" stroke={calc.dealScore >= 70 ? '#3b82f6' : calc.dealScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(calc.dealScore / 100) * 213.6} 213.6`}/></svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className={`text-2xl font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</span></div>
                </div>
                <div><div className={`text-lg font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{verdict}</div><div className="text-sm text-slate-500">{verdictSub}</div></div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">HOUSE HACK TARGETS</div>
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
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">HOUSING COST COMPARISON</div>
              <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full mb-4">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-slate-800" style={{ left: `calc(${Math.min(100, Math.max(0, (calc.yourHousingCost / marketRent) * 100))}% - 8px)` }}/>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Market Rent</span><span className="font-semibold text-slate-800">{fmt.currencyCompact(marketRent)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Your Cost</span><span className={`font-semibold ${calc.liveFree ? 'text-emerald-600' : 'text-blue-600'}`}>{fmt.currencyCompact(calc.yourHousingCost)}</span></div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg col-span-2"><span className="text-slate-500">Monthly Savings</span><span className={`font-semibold ${calc.savingsVsRenting > 0 ? 'text-emerald-600' : 'text-red-500'}`}>+{fmt.currencyCompact(calc.savingsVsRenting)}</span></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">KEY METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`py-3 px-4 rounded-lg ${calc.liveFree ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}><div className="text-xs text-slate-500 mb-1">Housing Cost</div><div className={`text-lg font-bold ${calc.liveFree ? 'text-emerald-600' : 'text-blue-600'}`}>{fmt.currencyCompact(calc.yourHousingCost)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Rental Income</div><div className="text-lg font-bold text-emerald-600">{fmt.currencyCompact(calc.grossRentalIncome)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">CoC Return</div><div className={`text-lg font-bold ${calc.cocReturn >= 8 ? 'text-blue-600' : 'text-slate-800'}`}>{fmt.percent(calc.cocReturn)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Move-Out CF</div><div className={`text-lg font-bold ${calc.fullRentalCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.fullRentalCashFlow)}</div></div>
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
