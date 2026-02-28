'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useUIStore } from '@/stores'
import { ArrowLeft, Calculator } from 'lucide-react'
import { calculateInitialPurchasePrice } from '@/lib/iqTarget'
import { useDealScore } from '@/hooks/useDealScore'
import { scoreToGradeLabel } from '@/components/iq-verdict/types'

// Section components for tab navigation
import { SalesCompsSection } from '../sections/SalesCompsSection'
import { RentalCompsSection } from '../sections/RentalCompsSection'
import { MarketDataSection } from '../sections/MarketDataSection'
import { MultiYearProjections } from '../sections/MultiYearProjections'
import { CashFlowChart } from '../charts/CashFlowChart'
import { EquityChart } from '../charts/EquityChart'
import { HouseHackMetricsChart, buildHouseHackMetricsData } from './HouseHackMetricsChart'
import { ProGate } from '@/components/ProGate'

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
  
  // Strategy from UI store
  const { activeStrategy } = useUIStore()
  
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

  // STATE - Updated defaults per default_assumptions.csv
  const listPrice = propertyData.listPrice || 400000
  const defaultInsurance = propertyData.insurance || (listPrice * 0.01) // 1% of list price
  const defaultBedrooms = propertyData.bedrooms || 4
  const defaultMonthlyRent = propertyData.monthlyRent || 2400 // Total rent for property
  const defaultPropertyTaxes = propertyData.propertyTaxes || 5000
  // Room rent formula: (monthlyRent / bedrooms) * units_rented_out
  const rentPerRoom = defaultMonthlyRent / defaultBedrooms
  const defaultRoomRent = Math.round(rentPerRoom * 2) // 2 units rented out by default
  const defaultMarketRent = Math.round(rentPerRoom)   // Owner unit market rent = rent per room
  
  // Calculate initial purchase price as 95% of estimated breakeven
  const initialPurchasePrice = calculateInitialPurchasePrice({
    monthlyRent: defaultRoomRent,  // Use rental income from rented units
    propertyTaxes: defaultPropertyTaxes,
    insurance: defaultInsurance,
    listPrice: listPrice,
    vacancyRate: 0.01,
    maintenancePct: 0.05,
    managementPct: 0,
    downPaymentPct: 0.035,   // FHA down payment
    interestRate: 0.06,
    loanTermYears: 30,
  })
  
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice)
  const [downPaymentPct, setDownPaymentPct] = useState(3.5)               // 3.5% FHA
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)
  const [interestRate, setInterestRate] = useState(6.0)                   // 6%
  const [loanTerm, setLoanTerm] = useState(30)
  const [propertyType, setPropertyType] = useState<'duplex' | 'triplex' | 'fourplex'>('duplex')
  const [ownerUnit, setOwnerUnit] = useState(0)
  const [unit1Rent, setUnit1Rent] = useState(defaultRoomRent)             // Calculated from formula
  const [unit2Rent, setUnit2Rent] = useState(Math.round(rentPerRoom))     // Rent per room
  const [unit3Rent, setUnit3Rent] = useState(Math.round(rentPerRoom))
  const [unit4Rent, setUnit4Rent] = useState(Math.round(rentPerRoom))
  const [vacancyRate, setVacancyRate] = useState(1)                       // 1%
  const [propertyTaxes, setPropertyTaxes] = useState(defaultPropertyTaxes)
  const [insurance, setInsurance] = useState(defaultInsurance)            // 1% of purchase price
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(0)
  const [maintenancePct, setMaintenancePct] = useState(5)
  const [marketRent, setMarketRent] = useState(defaultMarketRent)         // Rent per room
  
  // Hybrid accordion mode
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({})

  const unitCount = propertyType === 'duplex' ? 2 : propertyType === 'triplex' ? 3 : 4
  const unitRents = [unit1Rent, unit2Rent, unit3Rent, unit4Rent].slice(0, unitCount)
  
  // ============================================
  // DEAL OPPORTUNITY SCORE FROM BACKEND API
  // ============================================
  // Measures: How obtainable is this deal? (discount from list to breakeven)
  const totalRentalIncome = unitRents.filter((_, i) => i !== ownerUnit).reduce((a, b) => a + b, 0)
  
  const { result: dealScoreResult } = useDealScore({
    listPrice: listPrice,
    purchasePrice: purchasePrice,
    monthlyRent: totalRentalIncome,
    propertyTaxes: propertyTaxes,
    insurance: insurance,
    vacancyRate: vacancyRate / 100,
    maintenancePct: maintenancePct / 100,
    managementPct: propertyMgmtPct / 100,
    downPaymentPct: downPaymentPct / 100,
    interestRate: interestRate / 100,
    loanTermYears: loanTerm,
  })
  
  // Extract Deal Opportunity Score from backend result
  const opportunityScore = dealScoreResult?.dealScore ?? 0
  const incomeValue = dealScoreResult?.incomeValue ?? purchasePrice
  const opportunityVerdict = dealScoreResult?.dealVerdict ?? 'Calculating...'

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
    
    // Housing Offset % for Performance Score
    const housingOffsetPct = marketRent > 0 ? Math.max(0, ((marketRent - actualHousingCost) / marketRent) * 100) : 0
    
    return {
      downPayment, loanAmount, purchaseCosts, totalCashNeeded, monthlyPayment,
      rentalIncome, grossRentalIncome, ownerUnitValue,
      monthlyTaxes, monthlyInsurance, monthlyMgmt, monthlyMaintenance, totalExpenses,
      totalPITI, yourHousingCost: actualHousingCost, savingsVsRenting,
      monthlyCashFlow, fullRentalCashFlow, annualCashFlow, cocReturn, liveFree, housingOffsetPct,
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, interestRate, loanTerm, unitRents, ownerUnit, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, marketRent, unitCount])

  // ============================================
  // STRATEGY PERFORMANCE SCORE (House Hack-specific)
  // ============================================
  // Measures: How well does House Hack perform at this purchase price?
  // Based on Housing Offset %: 100% (live free) = 100, 0% (pay full market) = 50, -100% (pay double) = 0
  const performanceScore = Math.max(0, Math.min(100, Math.round(50 + (calc.housingOffsetPct / 2))))
  
  // Performance verdict based on Housing Offset
  const getPerformanceVerdict = (score: number): string => {
    if (score >= 90) return 'Live Free!'
    if (score >= 75) return 'Great Savings'
    if (score >= 50) return 'Fair Savings'
    if (score >= 25) return 'Limited Savings'
    return 'No Savings'
  }
  const performanceVerdict = getPerformanceVerdict(performanceScore)
  
  // Combined Deal Score (average of both)
  const dealScore = Math.round((opportunityScore + performanceScore) / 2)

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

  // Opportunity-based verdict using housing cost offset
  const housingCostPercent = marketRent > 0 ? Math.max(0, (calc.yourHousingCost / marketRent) * 100) : 0
  let verdict: string, verdictSub: string
  if (housingCostPercent <= 5 || calc.liveFree) { verdict = "Strong Opportunity"; verdictSub = calc.liveFree ? "Live for FREE!" : "Excellent deal - minimal housing cost" }
  else if (housingCostPercent <= 15) { verdict = "Good Opportunity"; verdictSub = "Very good - major housing savings" }
  else if (housingCostPercent <= 25) { verdict = "Moderate Opportunity"; verdictSub = "Good potential - significant savings" }
  else if (housingCostPercent <= 40) { verdict = "Marginal Opportunity"; verdictSub = "Possible deal - some savings" }
  else if (housingCostPercent <= 60) { verdict = "Unlikely Opportunity"; verdictSub = "Limited savings vs renting" }
  else { verdict = "Pass"; verdictSub = "Not recommended - little benefit" }

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
      {/* PAGE TITLE ROW - Photo + Title + Price/Badges + Strategy Dropdown */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div className="hidden sm:block flex-shrink-0 w-16 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden">
                {property.property_data_snapshot?.photos?.[0] ? (
                  <img src={property.property_data_snapshot.photos[0]} alt="Property" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400" aria-hidden>—</div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{thisStrategy.label} Analysis</h1>
                <p className="text-sm text-slate-500 truncate">{fullAddress}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-5 flex-shrink-0">
              <div className="text-right">
                <div className="text-xl font-bold text-slate-900">{fmt.currency(property.property_data_snapshot?.zestimate || property.property_data_snapshot?.listPrice || listPrice)}</div>
                <div className="text-xs text-slate-500">Est. Value</div>
              </div>
              {property.property_data_snapshot?.isBankOwned && <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-slate-800 text-white rounded">Bank Owned</span>}
              {property.property_data_snapshot?.isForeclosure && !property.property_data_snapshot?.isBankOwned && <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-amber-500 text-white rounded">Foreclosure</span>}
              {property.property_data_snapshot?.isAuction && <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-purple-600 text-white rounded">Auction</span>}
              {(() => {
                const status = property.property_data_snapshot?.listingStatus
                const statusConfig: Record<string, { label: string; border: string; text: string }> = {
                  'FOR_SALE': { label: 'For Sale', border: 'border-teal', text: 'text-teal' },
                  'FOR_RENT': { label: 'For Rent', border: 'border-blue-500', text: 'text-blue-500' },
                  'PENDING': { label: 'Pending', border: 'border-amber-500', text: 'text-amber-500' },
                  'SOLD': { label: 'Sold', border: 'border-slate-500', text: 'text-slate-500' },
                  'OFF_MARKET': { label: 'Off-Market', border: 'border-red-500', text: 'text-red-500' },
                }
                const config = statusConfig[status || 'OFF_MARKET'] || statusConfig['OFF_MARKET']
                return <span className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wide border-2 ${config.border} ${config.text} rounded`}>{config.label}</span>
              })()}
            </div>
            {/* Right: Deal Maker Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const encodedAddress = encodeURIComponent(fullAddress.replace(/\s+/g, '-'))
                  const params = new URLSearchParams({
                    listPrice: String(listPrice),
                    rentEstimate: String(defaultMonthlyRent),
                    propertyTax: String(propertyTaxes),
                    insurance: String(insurance),
                  })
                  router.push(`/deal-maker/${encodedAddress}?${params.toString()}`)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-teal/10 hover:bg-teal/20 border border-teal/30 text-teal rounded-lg transition-colors"
                title="Open Deal Maker"
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-semibold">Deal Maker</span>
              </button>
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
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${dealScore >= 70 ? 'bg-blue-500/15' : dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${dealScore >= 70 ? 'text-blue-600' : dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{dealScore}</div></div>
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
        ) : activeSection === 'metrics' ? (
          <HouseHackMetricsChart 
            data={buildHouseHackMetricsData({
              actualHousingCost: calc.yourHousingCost,
              savingsVsRenting: calc.savingsVsRenting,
              housingOffsetPct: calc.housingOffsetPct,
              totalCashNeeded: calc.totalCashNeeded,
              downPayment: calc.downPayment,
              purchaseCosts: calc.purchaseCosts,
              monthlyPayment: calc.monthlyPayment,
              totalExpenses: calc.totalExpenses,
              rentalIncome: calc.grossRentalIncome,
              marketRent: marketRent,
              liveFree: calc.liveFree,
              listPrice: listPrice,
              purchasePrice: purchasePrice,
              unitCount: unitCount,
            }, unitRents, ownerUnit)}
          />
        ) : (
        <>
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-3">
            <Section index={0} title="Property & Purchase" iconKey="home">
              <div className="py-3"><label className="text-sm text-slate-500">Property Type</label><select value={propertyType} onChange={(e) => setPropertyType(e.target.value as typeof propertyType)} className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="duplex">Duplex (2 Units)</option><option value="triplex">Triplex (3 Units)</option><option value="fourplex">Fourplex (4 Units)</option></select></div>
              <InputRow label="Buy Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={1500000} step={5000} format="currency" />
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
              
              {/* Two-Score Display - Grade Based */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Deal Opportunity Score */}
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                  <span 
                    className="text-2xl font-extrabold"
                    style={{ color: scoreToGradeLabel(opportunityScore).color }}
                  >
                    {scoreToGradeLabel(opportunityScore).grade}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">Opportunity</div>
                  <div 
                    className="text-[9px] font-semibold"
                    style={{ color: scoreToGradeLabel(opportunityScore).color }}
                  >
                    {scoreToGradeLabel(opportunityScore).label}
                  </div>
                </div>
                {/* Strategy Performance Score */}
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                  <span 
                    className="text-2xl font-extrabold"
                    style={{ color: scoreToGradeLabel(performanceScore).color }}
                  >
                    {scoreToGradeLabel(performanceScore).grade}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">Return</div>
                  <div 
                    className="text-[9px] font-semibold"
                    style={{ color: scoreToGradeLabel(performanceScore).color }}
                  >
                    {scoreToGradeLabel(performanceScore).label}
                  </div>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <div className={`text-base font-bold ${dealScore >= 70 ? 'text-blue-600' : dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{verdict}</div>
                <div className="text-xs text-slate-500">{verdictSub}</div>
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
            
            <ProGate feature="Export PDF Report" mode="inline">
              <button onClick={onExportPDF} className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                Export PDF Report
              </button>
            </ProGate>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}
