'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useUIStore } from '@/stores'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SalesCompsSection } from '../sections/SalesCompsSection'
import { RentalCompsSection } from '../sections/RentalCompsSection'
import { MarketDataSection } from '../sections/MarketDataSection'
import { MultiYearProjections } from '../sections/MultiYearProjections'
import { CashFlowChart } from '../charts/CashFlowChart'
import { EquityChart } from '../charts/EquityChart'
import { MobileCompressedView } from './MobileCompressedView'
import { ArrowLeft, ChevronRight, Calculator } from 'lucide-react'
import { calculateInitialPurchasePrice, DEFAULT_RENOVATION_BUDGET_PCT } from '@/lib/iqTarget'
import { useDealScore, getDealScoreColor, getDealScoreGrade } from '@/hooks/useDealScore'
import { scoreToGradeLabel } from '@/components/iq-verdict/types'
import { DealGapChart } from '@/components/analytics/DealGapChart'
import { LTRMetricsChart, buildLTRMetricsData } from './LTRMetricsChart'
import { DealMakerBadges } from './DealMakerBadges'

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
  income: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
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
  ratios: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"/>
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
  { id: 'purchase', title: 'Purchase', icon: 'home' },
  { id: 'financing', title: 'Financing', icon: 'bank' },
  { id: 'rehab', title: 'Rehab & Valuation', icon: 'tool' },
  { id: 'income', title: 'Income', icon: 'income' },
  { id: 'expenses', title: 'Expenses', icon: 'expense' },
  { id: 'cashflow', title: 'Cash Flow', icon: 'cashflow' },
  { id: 'returns', title: 'Returns', icon: 'returns' },
  { id: 'ratios', title: 'Ratios', icon: 'ratios' },
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
  percent2: (v: number) => `${v.toFixed(2)}%`,
  years: (v: number) => `${v} yr`,
  ratio: (v: number) => `${v.toFixed(2)}x`,
}

// ============================================
// PROPS
// ============================================
interface LTRWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportPDF?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LTRWorksheet({ 
  property,
  propertyId,
  onExportPDF,
}: LTRWorksheetProps) {
  const router = useRouter()
  
  // Strategy from UI store
  const { activeStrategy } = useUIStore()
  
  // This worksheet's strategy - always LTR
  const thisStrategy = { id: 'ltr', label: 'Long-term Rental' }
  
  // Mobile compressed view - show below 640px (sm breakpoint)
  const isMobileCompressed = useIsMobile(640)
  const [showFullViewOnMobile, setShowFullViewOnMobile] = useState(false)
  
  // Get active section from store for tab navigation
  const { activeSection } = useWorksheetStore()
  
  // Property data - use snapshot as primary source for reliability
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = propertyData.street || property.address_street || getDisplayAddress(property)
  // Use snapshot city/state/zip first, fall back to property fields
  const city = propertyData.city || property.address_city || ''
  const state = propertyData.state || property.address_state || ''
  const zip = propertyData.zipCode || property.address_zip || ''

  // ============================================
  // STATE
  // ============================================
  // Calculate initial values based on property data
  const listPrice = propertyData.listPrice || 723600
  const defaultMonthlyRent = propertyData.monthlyRent || 8081
  const defaultPropertyTaxes = propertyData.propertyTaxes || 6471
  const defaultInsurance = propertyData.insurance || (listPrice * 0.01) // 1% of list price
  const defaultArv = propertyData.arv || listPrice * 1.1 || 795960
  
  // Calculate initial purchase price as 95% of estimated breakeven
  const initialPurchasePrice = calculateInitialPurchasePrice({
    monthlyRent: defaultMonthlyRent,
    propertyTaxes: defaultPropertyTaxes,
    insurance: defaultInsurance,
    listPrice: listPrice,
    vacancyRate: 0.01,      // 1%
    maintenancePct: 0.05,   // 5%
    managementPct: 0,       // 0%
    downPaymentPct: 0.20,   // 20%
    interestRate: 0.06,     // 6%
    loanTermYears: 30,
  })
  
  // Calculate initial rehab budget as 5% of ARV
  const initialRehabBudget = Math.round(defaultArv * DEFAULT_RENOVATION_BUDGET_PCT)
  
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice)
  const [downPaymentPct, setDownPaymentPct] = useState(20)              // 20%
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)           // 3%
  const [interestRate, setInterestRate] = useState(6.0)                 // 6%
  const [loanTerm, setLoanTerm] = useState(30)
  const [rehabCosts, setRehabCosts] = useState(initialRehabBudget)      // 5% of ARV
  const [arv, setArv] = useState(defaultArv)
  const [monthlyRent, setMonthlyRent] = useState(defaultMonthlyRent)
  const [vacancyRate, setVacancyRate] = useState(1)                     // 1%
  const [propertyTaxes, setPropertyTaxes] = useState(defaultPropertyTaxes)
  const [insurance, setInsurance] = useState(defaultInsurance)          // 1% of purchase price
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(0)             // 0%
  const [maintenancePct, setMaintenancePct] = useState(5)               // 5%
  const [capExPct, setCapExPct] = useState(0)
  const [hoaFees, setHoaFees] = useState(0)
  
  // Hybrid accordion mode: guided by default, but manual clicks override
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({})
  
  // Mobile swipe panels state
  const [activeMobilePanel, setActiveMobilePanel] = useState<'verdict' | 'worksheet'>('verdict')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  const minSwipeDistance = 50
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe && activeMobilePanel === 'verdict') {
      setActiveMobilePanel('worksheet')
    }
    if (isRightSwipe && activeMobilePanel === 'worksheet') {
      setActiveMobilePanel('verdict')
    }
  }

  // ============================================
  // DEAL OPPORTUNITY SCORE FROM BACKEND API
  // ============================================
  // Measures: How obtainable is this deal? (discount from list to breakeven)
  const { result: dealScoreResult, isLoading: isDealScoreLoading } = useDealScore({
    listPrice: listPrice,
    purchasePrice: purchasePrice,
    monthlyRent: monthlyRent,
    propertyTaxes: propertyTaxes,
    insurance: insurance,
    vacancyRate: vacancyRate / 100,      // Convert from % to decimal
    maintenancePct: maintenancePct / 100,
    managementPct: propertyMgmtPct / 100,
    downPaymentPct: downPaymentPct / 100,
    interestRate: interestRate / 100,
    loanTermYears: loanTerm,
  })
  
  // Extract Deal Opportunity Score from backend result
  const opportunityScore = dealScoreResult?.dealScore ?? 0
  const breakeven = dealScoreResult?.breakevenPrice ?? purchasePrice
  // Remove "Opportunity" suffix from backend verdict for cleaner display
  const opportunityVerdict = (dealScoreResult?.dealVerdict ?? 'Calculating...').replace(' Opportunity', '')

  // ============================================
  // CALCULATIONS (Financial metrics only - NO Deal Score)
  // ============================================
  const calc = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPct / 100)
    const loanAmount = purchasePrice - downPayment
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const totalCashNeeded = downPayment + purchaseCosts + rehabCosts
    
    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTerm * 12
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const ltv = (loanAmount / purchasePrice) * 100
    
    const arvPerSqft = arv / sqft
    const pricePerSqft = purchasePrice / sqft
    const equityAtPurchase = arv - purchasePrice - rehabCosts
    
    const annualGrossRent = monthlyRent * 12
    const vacancyLoss = annualGrossRent * (vacancyRate / 100)
    const grossIncome = annualGrossRent - vacancyLoss
    
    const annualPropertyMgmt = grossIncome * (propertyMgmtPct / 100)
    const annualMaintenance = grossIncome * (maintenancePct / 100)
    const annualCapEx = grossIncome * (capExPct / 100)
    const annualHOA = hoaFees * 12
    const grossExpenses = propertyTaxes + insurance + annualPropertyMgmt + annualMaintenance + annualCapEx + annualHOA
    
    const annualLoanPayments = monthlyPayment * 12
    const noi = grossIncome - grossExpenses
    const monthlyCashFlow = (noi - annualLoanPayments) / 12
    const annualCashFlow = monthlyCashFlow * 12
    
    const capRatePurchase = (noi / purchasePrice) * 100
    const capRateMarket = (noi / arv) * 100
    const cashOnCash = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0
    const returnOnEquity = equityAtPurchase > 0 ? (annualCashFlow / equityAtPurchase) * 100 : 0
    const returnOnInvestment = totalCashNeeded > 0 ? ((annualCashFlow + (arv - purchasePrice)) / totalCashNeeded) * 100 : 0
    
    const rentToValue = (monthlyRent / purchasePrice) * 100
    const grossRentMultiplier = purchasePrice / annualGrossRent
    const breakEvenRatio = grossIncome > 0 ? ((grossExpenses + annualLoanPayments) / grossIncome) * 100 : 0
    const dscr = annualLoanPayments > 0 ? noi / annualLoanPayments : 0
    const debtYield = loanAmount > 0 ? (noi / loanAmount) * 100 : 0
    
    // NOTE: Deal Score and Breakeven are now calculated by the backend API
    // See useDealScore hook above - NO financial calculations here
    
    return {
      downPayment, loanAmount, purchaseCosts, totalCashNeeded, ltv, monthlyPayment,
      arvPerSqft, pricePerSqft, equityAtPurchase,
      annualGrossRent, vacancyLoss, grossIncome,
      annualPropertyMgmt, annualMaintenance, annualCapEx, grossExpenses,
      annualLoanPayments, monthlyCashFlow, annualCashFlow, noi,
      capRatePurchase, capRateMarket, cashOnCash, returnOnEquity, returnOnInvestment,
      rentToValue, grossRentMultiplier, breakEvenRatio, dscr, debtYield,
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, interestRate, loanTerm, rehabCosts, arv, monthlyRent, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, capExPct, hoaFees, sqft])

  // ============================================
  // STRATEGY PERFORMANCE SCORE (LTR-specific)
  // ============================================
  // Measures: How well does LTR perform at this purchase price?
  // Based on Cash-on-Cash return: 10% CoC = 100, 0% = 50, -10% = 0
  const performanceScore = Math.max(0, Math.min(100, Math.round(50 + (calc.cashOnCash * 5))))
  
  // Performance verdict based on CoC return
  const getPerformanceVerdict = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 50) return 'Fair'
    if (score >= 25) return 'Weak'
    return 'Poor'
  }
  const performanceVerdict = getPerformanceVerdict(performanceScore)
  
  // Combined Deal Score (average of both for backward compatibility)
  const dealScore = Math.round((opportunityScore + performanceScore) / 2)
  
  // Gauge needle calculation for display (uses combined score)
  const gaugeAngle = 180 - (dealScore * 1.8)
  const gaugeAngleRad = (gaugeAngle * Math.PI) / 180
  const needleLength = 35
  const needleX = 80 + needleLength * Math.cos(gaugeAngleRad)
  const needleY = 80 - needleLength * Math.sin(gaugeAngleRad)

  // ============================================
  // SECTION NAVIGATION
  // ============================================
  // Hybrid toggle: check if section is currently open, then toggle manual override
  const isSectionOpen = useCallback((index: number) => {
    // If user has manually set this section, use their preference
    if (manualOverrides[index] !== undefined) {
      return manualOverrides[index]
    }
    // Otherwise, use guided logic (current section is open)
    return currentSection === index
  }, [manualOverrides, currentSection])

  const toggleSection = useCallback((index: number) => {
    const currentlyOpen = isSectionOpen(index)
    // Set manual override to opposite of current state
    setManualOverrides(prev => ({ ...prev, [index]: !currentlyOpen }))
    // Track as completed and update current section when opened
    if (!currentlyOpen) {
      setCurrentSection(index)
      setCompletedSections(prev => new Set([...Array.from(prev), index]))
    }
  }, [isSectionOpen])

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
    format: 'currency' | 'percent' | 'years'
    subValue?: string
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : fmt.years(value)
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    
    const handleStartEdit = () => {
      // Set initial edit value without formatting symbols
      if (format === 'currency') {
        setEditValue(Math.round(value).toString())
      } else if (format === 'percent') {
        setEditValue(value.toFixed(1))
      } else {
        setEditValue(value.toString())
      }
      setIsEditing(true)
    }
    
    const handleEndEdit = () => {
      setIsEditing(false)
      // Parse the input value
      let parsed = parseFloat(editValue.replace(/[$,%\s]/g, ''))
      if (isNaN(parsed)) {
        return // Keep original value if invalid
      }
      // Clamp to min/max
      parsed = Math.min(max, Math.max(min, parsed))
      onChange(parsed)
    }
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEndEdit()
      } else if (e.key === 'Escape') {
        setIsEditing(false)
      }
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
    if (sectionIndex >= SECTIONS.length - 1) return null
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
    const isOpen = isSectionOpen(index)
    const isComplete = completedSections.has(index) && !isOpen
    
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
            isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
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
  // Opportunity-based verdict using discount percentage
  const discountNeeded = purchasePrice > 0 
    ? Math.max(0, ((purchasePrice - breakeven) / purchasePrice) * 100)
    : 0
  let verdict: string, verdictSub: string
  if (discountNeeded <= 5) {
    verdict = "Strong"
    verdictSub = "Excellent deal - minimal negotiation needed"
  } else if (discountNeeded <= 10) {
    verdict = "Great"
    verdictSub = "Very good deal - reasonable negotiation required"
  } else if (discountNeeded <= 15) {
    verdict = "Moderate"
    verdictSub = "Good potential - negotiate firmly"
  } else if (discountNeeded <= 25) {
    verdict = "Potential"
    verdictSub = "Possible deal - significant discount needed"
  } else if (discountNeeded <= 35) {
    verdict = "Mild"
    verdictSub = "Challenging deal - major price reduction required"
  } else {
    verdict = "Weak"
    verdictSub = "Not recommended - unrealistic discount needed"
  }

  const targets = [
    { label: 'Cap', actual: calc.capRatePurchase, target: 8, unit: '%', met: calc.capRatePurchase >= 8 },
    { label: 'CoC', actual: calc.cashOnCash, target: 10, unit: '%', met: calc.cashOnCash >= 10 },
    { label: 'DSCR', actual: calc.dscr, target: 1.2, unit: 'x', met: calc.dscr >= 1.2 },
    { label: '1% Rule', actual: calc.rentToValue, target: 1, unit: '%', met: calc.rentToValue >= 1 },
  ]

  // Build full address - use property.full_address if available, otherwise construct it
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* PAGE TITLE ROW - Photo + Title + Price/Badges + Strategy Dropdown */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back Arrow + Photo + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => router.back()}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              
              {/* Property Photo Thumbnail */}
              <div className="hidden sm:block flex-shrink-0">
                <img 
                  src={property.property_data_snapshot?.photos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop'}
                  alt="Property"
                  className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                />
              </div>
              
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                  {thisStrategy.label} Analysis
                </h1>
                <p className="text-sm text-slate-500 truncate">
                  {fullAddress}
                </p>
              </div>
            </div>
            
            {/* Center: Price + Status Badges */}
            <div className="hidden md:flex items-center gap-5 flex-shrink-0">
              {/* Price Display */}
              <div className="text-right">
                <div className="text-xl font-bold text-slate-900">
                  {fmt.currency(property.property_data_snapshot?.zestimate || property.property_data_snapshot?.listPrice || listPrice)}
                </div>
                <div className="text-xs text-slate-500">Est. Value</div>
              </div>
              
              {/* Seller Type Badge (Bank Owned, etc.) */}
              {property.property_data_snapshot?.isBankOwned && (
                <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-slate-800 text-white rounded">
                  Bank Owned
                </span>
              )}
              {property.property_data_snapshot?.isForeclosure && !property.property_data_snapshot?.isBankOwned && (
                <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-amber-500 text-white rounded">
                  Foreclosure
                </span>
              )}
              {property.property_data_snapshot?.isAuction && (
                <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-purple-600 text-white rounded">
                  Auction
                </span>
              )}
              
              {/* Status Badge - Display actual homeStatus from API */}
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
                return (
                  <span className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wide border-2 ${config.border} ${config.text} rounded`}>
                    {config.label}
                  </span>
                )
              })()}
            </div>
            
            {/* Right: Deal Maker Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  // Encode address for URL
                  const encodedAddress = encodeURIComponent(fullAddress.replace(/\s+/g, '-'))
                  const params = new URLSearchParams({
                    listPrice: String(listPrice),
                    rentEstimate: String(monthlyRent),
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
      
      {/* WORKSHEET TAB NAV - Full width, sticky below global header */}
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav propertyId={propertyId} strategy="ltr" zpid={property.zpid || propertyData.zpid} />
        </div>
      </div>
      
      {/* KPI CARDS ROW */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-teal/10">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Buy Price</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-teal tabular-nums truncate">{fmt.currencyCompact(purchasePrice)}</div>
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
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums">{fmt.percent(calc.capRatePurchase)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">CoC Return</div>
              <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums">{fmt.percent(calc.cashOnCash)}</div>
            </div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${
              dealScore >= 70 ? 'bg-teal/15' : dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div>
              <div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${
                dealScore >= 70 ? 'text-teal' : dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
              }`}>{dealScore}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Compressed View - shown on small screens when not in full view mode */}
        {isMobileCompressed && !showFullViewOnMobile && activeSection === 'worksheet' ? (
          <MobileCompressedView
            purchasePrice={purchasePrice}
            downPaymentPct={downPaymentPct}
            purchaseCostsPct={purchaseCostsPct}
            dealScore={dealScore}
            breakeven={breakeven}
            calc={calc}
            fmt={fmt}
            onNavigateToSection={(sectionId) => {
              if (sectionId === 'full') {
                setShowFullViewOnMobile(true)
              } else {
                // Toggle to the requested section
                const sectionIndex = SECTIONS.findIndex(s => s.id === sectionId)
                if (sectionIndex !== -1) {
                  setShowFullViewOnMobile(true)
                  toggleSection(sectionIndex)
                }
              }
            }}
          />
        ) : (
        <>
        {/* Desktop / Full View Content */}
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
        ) : activeSection === 'deal-gap' ? (
          <div className="max-w-xl mx-auto">
            <DealGapChart
              breakeven={breakeven}
              listPrice={listPrice}
              initialBuyPrice={purchasePrice}
              showHeader={false}
            />
          </div>
        ) : activeSection === 'metrics' ? (
          <LTRMetricsChart 
            data={buildLTRMetricsData({
              capRatePurchase: calc.capRatePurchase,
              cashOnCash: calc.cashOnCash,
              dscr: calc.dscr,
              noi: calc.noi,
              grossExpenses: calc.grossExpenses,
              grossIncome: calc.grossIncome,
              breakEvenRatio: calc.breakEvenRatio,
              equityAtPurchase: calc.equityAtPurchase,
              totalCashNeeded: calc.totalCashNeeded,
            })}
          />
        ) : (
        <>
          {/* Mobile: Back to compressed view button */}
          {isMobileCompressed && showFullViewOnMobile && (
            <button
              onClick={() => setShowFullViewOnMobile(false)}
              className="mb-4 flex items-center gap-2 text-teal text-sm font-medium hover:underline"
            >
              ← Back to Summary
            </button>
          )}
          
          {/* Mobile: Swipeable panels */}
          <div className="sm:hidden overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${activeMobilePanel === 'worksheet' ? '-100%' : '0'})` }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Panel 1: IQ Verdict */}
              <div className="w-full flex-shrink-0 px-1">
                <div className="space-y-4">
                  {/* IQ Verdict Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="p-5" style={{ 
                      background: dealScore >= 70 
                        ? 'linear-gradient(180deg, rgba(8, 145, 178, 0.10) 0%, rgba(8, 145, 178, 0.02) 100%)'
                        : dealScore >= 40
                          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.10) 0%, rgba(245, 158, 11, 0.02) 100%)'
                          : 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)'
                    }}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                        dealScore >= 70 ? 'text-teal' : dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>IQ VERDICT: LONG-TERM RENTAL</div>
                      
                      {/* Two-Score Display - Grade Based */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Deal Opportunity Score */}
                        <div className="bg-white rounded-lg px-3 py-2 shadow-sm text-center">
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
                        {/* Strategy Return Score */}
                        <div className="bg-white rounded-lg px-3 py-2 shadow-sm text-center">
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
                            x2={needleX} y2={needleY} 
                            stroke={dealScore >= 50 ? '#0891B2' : '#EF4444'} 
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
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(listPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-3 rounded-lg">
                        <span className="text-sm text-slate-500">Breakeven Price</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(breakeven)}</span>
                      </div>
                      <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg border ${
                        purchasePrice <= breakeven 
                          ? 'bg-teal/10 border-teal/20' 
                          : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <span className={`text-sm font-medium ${purchasePrice <= breakeven ? 'text-teal' : 'text-red-500'}`}>
                          Your Price
                        </span>
                        <span className={`text-sm font-bold tabular-nums ${purchasePrice <= breakeven ? 'text-teal' : 'text-red-500'}`}>
                          {fmt.currency(purchasePrice)}
                        </span>
                      </div>
                      {purchasePrice > breakeven && (
                        <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-xs text-amber-600 font-medium">
                            Price is {fmt.currency(purchasePrice - breakeven)} above breakeven
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Key Numbers Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-3">KEY NUMBERS</div>
                    
                    <div className="space-y-0 divide-y divide-slate-100">
                      <div className="flex justify-between py-2.5">
                        <span className="text-sm text-slate-500">Cash Required</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.totalCashNeeded)}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-sm text-slate-500">NOI</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.noi)}/yr</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-sm text-slate-500">Debt Service</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.annualLoanPayments)}/yr</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-sm text-slate-500">DSCR</span>
                        <span className={`text-sm font-semibold tabular-nums ${calc.dscr >= 1.25 ? 'text-teal' : 'text-slate-800'}`}>{fmt.ratio(calc.dscr)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <button 
                    onClick={onExportPDF}
                    className="w-full py-4 px-6 bg-teal/10 hover:bg-teal/20 border border-teal/25 rounded-full text-slate-800 font-bold text-sm transition-colors"
                  >
                    Export PDF Report →
                  </button>
                </div>
                
                {/* Modify Hint - only on verdict panel */}
                {activeMobilePanel === 'verdict' && (
                  <div className="flex items-center justify-center gap-2 py-4 text-teal animate-bounce">
                    <span className="text-sm font-medium">Modify</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              {/* Panel 2: Worksheet sections */}
              <div className="w-full flex-shrink-0 px-1">
                <div className="space-y-3">
                  {/* Deal Maker Badges */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <DealMakerBadges 
                      dealScore={opportunityScore} 
                      profitQualityScore={performanceScore} 
                    />
                  </div>
                  
                  {/* Purchase */}
                  <Section index={0} title="Purchase" iconKey="home">
                    <InputRow label="Buy Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={2000000} step={5000} format="currency" />
                    <InputRow label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} min={0} max={100} step={1} format="percent" subValue={fmt.currency(calc.downPayment)} />
                    <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
                    <InputRow label="Closing Costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} min={0} max={10} step={0.5} format="percent" subValue={fmt.currency(calc.purchaseCosts)} />
                    <div className="mt-3 pt-3">
                      <SummaryBox label="Total Cash Required" value={fmt.currency(calc.totalCashNeeded)} variant="teal" />
                    </div>
                  </Section>
                  
                  {/* Financing */}
                  <Section index={1} title="Financing" iconKey="bank">
                    <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
                    <DisplayRow label="Loan Type" value="30-Year Fixed" variant="muted" />
                    <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} min={3} max={12} step={0.125} format="percent" />
                    <InputRow label="Loan Term" value={loanTerm} onChange={setLoanTerm} min={10} max={30} step={5} format="years" />
                    <div className="mt-3 pt-3">
                      <SummaryBox label="Monthly Payment" value={fmt.currency(calc.monthlyPayment)} />
                    </div>
                  </Section>
                  
                  {/* Rehab & Valuation */}
                  <Section index={2} title="Rehab & Valuation" iconKey="tool">
                    <InputRow label="Rehab Budget" value={rehabCosts} onChange={setRehabCosts} min={0} max={200000} step={1000} format="currency" />
                    <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(listPrice * 0.7)} max={Math.round(listPrice * 1.8)} step={5000} format="currency" />
                    <DisplayRow label="Price / Sq.Ft." value={`$${Math.round(calc.pricePerSqft)}`} />
                    <DisplayRow label="ARV / Sq.Ft." value={`$${Math.round(calc.arvPerSqft)}`} />
                    <div className="mt-3 pt-3">
                      <SummaryBox label="Instant Equity" value={fmt.currency(calc.equityAtPurchase)} variant="success" />
                    </div>
                  </Section>
                  
                  {/* Income */}
                  <Section index={3} title="Income" iconKey="income">
                    <InputRow label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} min={1000} max={20000} step={50} format="currency" subValue={`${fmt.currency(calc.annualGrossRent)}/yr`} />
                    <InputRow label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} min={0} max={20} step={1} format="percent" subValue={`−${fmt.currency(calc.vacancyLoss)}/yr`} />
                    <div className="mt-3 pt-3">
                      <SummaryBox label="Effective Gross Income" value={fmt.currency(calc.grossIncome)} variant="success" />
                    </div>
                  </Section>
                  
                  {/* Expenses */}
                  <Section index={4} title="Expenses" iconKey="expense">
                    <InputRow label="Property Taxes" value={propertyTaxes} onChange={setPropertyTaxes} min={0} max={30000} step={100} format="currency" />
                    <InputRow label="Insurance" value={insurance} onChange={setInsurance} min={0} max={15000} step={100} format="currency" />
                    <InputRow label="Management" value={propertyMgmtPct} onChange={setPropertyMgmtPct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualPropertyMgmt)} />
                    <InputRow label="Maintenance" value={maintenancePct} onChange={setMaintenancePct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualMaintenance)} />
                    <InputRow label="CapEx Reserve" value={capExPct} onChange={setCapExPct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualCapEx)} />
                    <InputRow label="HOA" value={hoaFees} onChange={setHoaFees} min={0} max={1000} step={25} format="currency" />
                    <div className="mt-3 pt-3">
                      <SummaryBox label="Total Operating Expenses" value={fmt.currency(calc.grossExpenses)} variant="danger" />
                    </div>
                  </Section>
                  
                  {/* Cash Flow */}
                  <Section index={5} title="Cash Flow" iconKey="cashflow">
                    <DisplayRow label="Gross Income" value={fmt.currency(calc.grossIncome)} />
                    <DisplayRow label="Operating Expenses" value={`−${fmt.currency(calc.grossExpenses)}`} variant="danger" />
                    <DisplayRow label="Debt Service" value={`−${fmt.currency(calc.annualLoanPayments)}`} variant="danger" />
                    <div className="mt-3 pt-3 space-y-2">
                      <SummaryBox label="Monthly Cash Flow" value={fmt.currency(calc.monthlyCashFlow)} variant={calc.monthlyCashFlow >= 0 ? 'success' : 'danger'} />
                      <SummaryBox label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} />
                    </div>
                  </Section>
                  
                  {/* Returns */}
                  <Section index={6} title="Returns" iconKey="returns">
                    <MetricRow label="Cap Rate (Purchase)" value={fmt.percent2(calc.capRatePurchase)} target="8%" isGood={calc.capRatePurchase >= 8} />
                    <MetricRow label="Cap Rate (ARV)" value={fmt.percent2(calc.capRateMarket)} target="8%" isGood={calc.capRateMarket >= 8} />
                    <MetricRow label="Cash on Cash" value={fmt.percent2(calc.cashOnCash)} target="10%" isGood={calc.cashOnCash >= 10} />
                    <MetricRow label="Return on Equity" value={fmt.percent2(calc.returnOnEquity)} />
                    <MetricRow label="Total ROI (Year 1)" value={fmt.percent2(calc.returnOnInvestment)} />
                  </Section>
                  
                  {/* Ratios */}
                  <Section index={7} title="Ratios" iconKey="ratios">
                    <MetricRow label="1% Rule (Rent/Value)" value={fmt.percent2(calc.rentToValue)} target="1%" isGood={calc.rentToValue >= 1} />
                    <MetricRow label="Gross Rent Multiplier" value={fmt.ratio(calc.grossRentMultiplier)} target="12x" isGood={calc.grossRentMultiplier <= 12} />
                    <MetricRow label="Break-Even Ratio" value={fmt.percent2(calc.breakEvenRatio)} target="85%" isGood={calc.breakEvenRatio <= 85} />
                    <MetricRow label="DSCR" value={fmt.ratio(calc.dscr)} target="1.2x" isGood={calc.dscr >= 1.2} />
                    <MetricRow label="Debt Yield" value={fmt.percent2(calc.debtYield)} />
                  </Section>
                </div>
              </div>
            </div>
            
            {/* Panel indicator dots */}
            <div className="flex justify-center gap-2 mt-4">
              <button 
                className={`w-2 h-2 rounded-full transition-colors ${activeMobilePanel === 'verdict' ? 'bg-teal' : 'bg-slate-300'}`}
                onClick={() => setActiveMobilePanel('verdict')}
              />
              <button 
                className={`w-2 h-2 rounded-full transition-colors ${activeMobilePanel === 'worksheet' ? 'bg-teal' : 'bg-slate-300'}`}
                onClick={() => setActiveMobilePanel('worksheet')}
              />
            </div>
          </div>
          
          {/* Desktop: Side-by-side grid */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-6 items-start">
          
          {/* LEFT COLUMN - Insight Panel */}
          <div className="sm:sticky sm:top-20 space-y-4">
            {/* IQ Verdict Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-5" style={{ 
                background: dealScore >= 70 
                  ? 'linear-gradient(180deg, rgba(8, 145, 178, 0.10) 0%, rgba(8, 145, 178, 0.02) 100%)'
                  : dealScore >= 40
                    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.10) 0%, rgba(245, 158, 11, 0.02) 100%)'
                    : 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)'
              }}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                  dealScore >= 70 ? 'text-teal' : dealScore >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>IQ VERDICT: LONG-TERM RENTAL</div>
                
                {/* Two-Score Display - Grade Based */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Deal Opportunity Score */}
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm text-center">
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
                  {/* Strategy Return Score */}
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm text-center">
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
                      x2={needleX} y2={needleY} 
                      stroke={dealScore >= 50 ? '#0891B2' : '#EF4444'} 
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
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(listPrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg">
                  <span className="text-sm text-slate-500">Breakeven Price</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(breakeven)}</span>
                </div>
                <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg border ${
                  purchasePrice <= breakeven 
                    ? 'bg-teal/10 border-teal/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <span className={`text-sm font-medium ${purchasePrice <= breakeven ? 'text-teal' : 'text-red-500'}`}>
                    Your Price
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${purchasePrice <= breakeven ? 'text-teal' : 'text-red-500'}`}>
                    {fmt.currency(purchasePrice)}
                  </span>
                </div>
                {purchasePrice > breakeven && (
                  <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 font-medium">
                      Price is {fmt.currency(purchasePrice - breakeven)} above breakeven
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Key Numbers Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 mb-3">KEY NUMBERS</div>
              
              <div className="space-y-0 divide-y divide-slate-100">
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-slate-500">Cash Required</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.totalCashNeeded)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-slate-500">NOI</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.noi)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-slate-500">Debt Service</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt.currency(calc.annualLoanPayments)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-slate-500">DSCR</span>
                  <span className={`text-sm font-semibold tabular-nums ${calc.dscr >= 1.25 ? 'text-teal' : 'text-slate-800'}`}>{fmt.ratio(calc.dscr)}</span>
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <button 
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-teal/10 hover:bg-teal/20 border border-teal/25 rounded-full text-slate-800 font-bold text-sm transition-colors"
            >
              Export PDF Report →
            </button>
          </div>
          
          {/* RIGHT COLUMN - Worksheet sections */}
          <div className="space-y-3">
            {/* Deal Maker Badges */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <DealMakerBadges 
                dealScore={opportunityScore} 
                profitQualityScore={performanceScore} 
              />
            </div>
            
            {/* Purchase */}
            <Section index={0} title="Purchase" iconKey="home">
              <InputRow label="Buy Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={2000000} step={5000} format="currency" />
              <InputRow label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} min={0} max={100} step={1} format="percent" subValue={fmt.currency(calc.downPayment)} />
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <InputRow label="Closing Costs" value={purchaseCostsPct} onChange={setPurchaseCostsPct} min={0} max={10} step={0.5} format="percent" subValue={fmt.currency(calc.purchaseCosts)} />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total Cash Required" value={fmt.currency(calc.totalCashNeeded)} variant="teal" />
              </div>
            </Section>
            
            {/* Financing */}
            <Section index={1} title="Financing" iconKey="bank">
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <DisplayRow label="Loan Type" value="30-Year Fixed" variant="muted" />
              <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} min={3} max={12} step={0.125} format="percent" />
              <InputRow label="Loan Term" value={loanTerm} onChange={setLoanTerm} min={10} max={30} step={5} format="years" />
              <div className="mt-3 pt-3">
                <SummaryBox label="Monthly Payment" value={fmt.currency(calc.monthlyPayment)} />
              </div>
            </Section>
            
            {/* Rehab & Valuation */}
            <Section index={2} title="Rehab & Valuation" iconKey="tool">
              <InputRow label="Rehab Budget" value={rehabCosts} onChange={setRehabCosts} min={0} max={200000} step={1000} format="currency" />
              <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(listPrice * 0.7)} max={Math.round(listPrice * 1.8)} step={5000} format="currency" />
              <DisplayRow label="Price / Sq.Ft." value={`$${Math.round(calc.pricePerSqft)}`} />
              <DisplayRow label="ARV / Sq.Ft." value={`$${Math.round(calc.arvPerSqft)}`} />
              <div className="mt-3 pt-3">
                <SummaryBox label="Instant Equity" value={fmt.currency(calc.equityAtPurchase)} variant="success" />
              </div>
            </Section>
            
            {/* Income */}
            <Section index={3} title="Income" iconKey="income">
              <InputRow label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} min={1000} max={20000} step={50} format="currency" subValue={`${fmt.currency(calc.annualGrossRent)}/yr`} />
              <InputRow label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} min={0} max={20} step={1} format="percent" subValue={`−${fmt.currency(calc.vacancyLoss)}/yr`} />
              <div className="mt-3 pt-3">
                <SummaryBox label="Effective Gross Income" value={fmt.currency(calc.grossIncome)} variant="success" />
              </div>
            </Section>
            
            {/* Expenses */}
            <Section index={4} title="Expenses" iconKey="expense">
              <InputRow label="Property Taxes" value={propertyTaxes} onChange={setPropertyTaxes} min={0} max={30000} step={100} format="currency" />
              <InputRow label="Insurance" value={insurance} onChange={setInsurance} min={0} max={15000} step={100} format="currency" />
              <InputRow label="Management" value={propertyMgmtPct} onChange={setPropertyMgmtPct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualPropertyMgmt)} />
              <InputRow label="Maintenance" value={maintenancePct} onChange={setMaintenancePct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualMaintenance)} />
              <InputRow label="CapEx Reserve" value={capExPct} onChange={setCapExPct} min={0} max={15} step={1} format="percent" subValue={fmt.currency(calc.annualCapEx)} />
              <InputRow label="HOA" value={hoaFees} onChange={setHoaFees} min={0} max={1000} step={25} format="currency" />
              <div className="mt-3 pt-3">
                <SummaryBox label="Total Operating Expenses" value={fmt.currency(calc.grossExpenses)} variant="danger" />
              </div>
            </Section>
            
            {/* Cash Flow */}
            <Section index={5} title="Cash Flow" iconKey="cashflow">
              <DisplayRow label="Gross Income" value={fmt.currency(calc.grossIncome)} />
              <DisplayRow label="Operating Expenses" value={`−${fmt.currency(calc.grossExpenses)}`} variant="danger" />
              <DisplayRow label="Debt Service" value={`−${fmt.currency(calc.annualLoanPayments)}`} variant="danger" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Monthly Cash Flow" value={fmt.currency(calc.monthlyCashFlow)} variant={calc.monthlyCashFlow >= 0 ? 'success' : 'danger'} />
                <SummaryBox label="Annual Cash Flow" value={fmt.currency(calc.annualCashFlow)} variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} />
              </div>
            </Section>
            
            {/* Returns */}
            <Section index={6} title="Returns" iconKey="returns">
              <MetricRow label="Cap Rate (Purchase)" value={fmt.percent2(calc.capRatePurchase)} target="8%" isGood={calc.capRatePurchase >= 8} />
              <MetricRow label="Cap Rate (ARV)" value={fmt.percent2(calc.capRateMarket)} target="8%" isGood={calc.capRateMarket >= 8} />
              <MetricRow label="Cash on Cash" value={fmt.percent2(calc.cashOnCash)} target="10%" isGood={calc.cashOnCash >= 10} />
              <MetricRow label="Return on Equity" value={fmt.percent2(calc.returnOnEquity)} />
              <MetricRow label="Total ROI (Year 1)" value={fmt.percent2(calc.returnOnInvestment)} />
            </Section>
            
            {/* Ratios */}
            <Section index={7} title="Ratios" iconKey="ratios">
              <MetricRow label="1% Rule (Rent/Value)" value={fmt.percent2(calc.rentToValue)} target="1%" isGood={calc.rentToValue >= 1} />
              <MetricRow label="Gross Rent Multiplier" value={fmt.ratio(calc.grossRentMultiplier)} target="12x" isGood={calc.grossRentMultiplier <= 12} />
              <MetricRow label="Break-Even Ratio" value={fmt.percent2(calc.breakEvenRatio)} target="85%" isGood={calc.breakEvenRatio <= 85} />
              <MetricRow label="DSCR" value={fmt.ratio(calc.dscr)} target="1.2x" isGood={calc.dscr >= 1.2} />
              <MetricRow label="Debt Yield" value={fmt.percent2(calc.debtYield)} />
            </Section>
          </div>
        </div>
        </>
        )}
        </>
        )}
      </main>
    </div>
  )
}
