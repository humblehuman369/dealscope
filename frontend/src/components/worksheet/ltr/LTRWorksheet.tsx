'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'

// ============================================
// ICONS (minimal line style matching HTML)
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
  onExportExcel?: () => void
  onExportPDF?: () => void
  onShare?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LTRWorksheet({ 
  property, 
  onExportPDF,
}: LTRWorksheetProps) {
  // Property data
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // ============================================
  // STATE
  // ============================================
  const [purchasePrice, setPurchasePrice] = useState(propertyData.listPrice || 723600)
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)
  const [interestRate, setInterestRate] = useState(7.0)
  const [loanTerm, setLoanTerm] = useState(30)
  const [rehabCosts, setRehabCosts] = useState(0)
  const [arv, setArv] = useState(propertyData.arv || propertyData.listPrice * 1.1 || 795960)
  const [monthlyRent, setMonthlyRent] = useState(propertyData.monthlyRent || 8081)
  const [vacancyRate, setVacancyRate] = useState(8)
  const [propertyTaxes, setPropertyTaxes] = useState(propertyData.propertyTaxes || 6471)
  const [insurance, setInsurance] = useState(propertyData.insurance || 2894)
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(0)
  const [maintenancePct, setMaintenancePct] = useState(2)
  const [capExPct, setCapExPct] = useState(0)
  const [hoaFees, setHoaFees] = useState(0)
  
  const [viewMode, setViewMode] = useState<'guided' | 'showall'>('guided')
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))

  // ============================================
  // CALCULATIONS
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
    
    const breakeven = purchasePrice * 1.65
    
    // Deal Score calculation
    const cocScore = Math.min(40, Math.max(0, cashOnCash * 4))
    const capScore = Math.min(30, Math.max(0, capRatePurchase * 5))
    const cfScore = annualCashFlow > 0 ? Math.min(30, (annualCashFlow / 10000) * 10) : 0
    const dealScore = Math.round(Math.min(100, cocScore + capScore + cfScore))
    
    return {
      downPayment, loanAmount, purchaseCosts, totalCashNeeded, ltv, monthlyPayment,
      arvPerSqft, pricePerSqft, equityAtPurchase,
      annualGrossRent, vacancyLoss, grossIncome,
      annualPropertyMgmt, annualMaintenance, annualCapEx, grossExpenses,
      annualLoanPayments, monthlyCashFlow, annualCashFlow, noi,
      capRatePurchase, capRateMarket, cashOnCash, returnOnEquity, returnOnInvestment,
      rentToValue, grossRentMultiplier, breakEvenRatio, dscr, debtYield,
      breakeven, dealScore,
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, interestRate, loanTerm, rehabCosts, arv, monthlyRent, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, capExPct, hoaFees, sqft])

  // ============================================
  // SECTION NAVIGATION
  // ============================================
  const toggleSection = useCallback((index: number) => {
    if (viewMode === 'showall') return
    
    if (currentSection === index) {
      setCurrentSection(null)
    } else {
      setCurrentSection(index)
      setCompletedSections(prev => new Set([...prev, index]))
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
    format: 'currency' | 'percent' | 'years'
    subValue?: string
  }) => {
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : fmt.years(value)
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    
    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-surface-500">{label}</label>
          <div className="text-right">
            <span className="text-sm font-semibold text-navy num">{displayValue}</span>
            {subValue && <span className="text-xs text-surface-400 ml-1.5 num">{subValue}</span>}
          </div>
        </div>
        <div className="relative">
          <div className="h-1.5 bg-surface-200 rounded-full">
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
      default: 'text-navy',
      success: 'text-teal',
      danger: 'text-danger',
      muted: 'text-surface-400',
      teal: 'text-teal',
    }
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-surface-500">{label}</span>
        <span className={`text-sm font-semibold num ${colors[variant]}`}>{value}</span>
      </div>
    )
  }

  const MetricRow = ({ label, value, target, isGood }: {
    label: string
    value: string
    target?: string
    isGood?: boolean
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-100 last:border-0">
      <span className="text-sm text-surface-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold num ${isGood ? 'text-teal' : 'text-navy'}`}>{value}</span>
        {target && <span className="text-[10px] text-surface-400">/ {target}</span>}
      </div>
    </div>
  )

  const SummaryBox = ({ label, value, variant = 'default' }: {
    label: string
    value: string
    variant?: 'default' | 'success' | 'danger' | 'teal'
  }) => {
    const styles = {
      default: 'bg-surface-50 border-surface-200',
      success: 'bg-teal/10 border-teal/20',
      danger: 'bg-danger/10 border-danger/20',
      teal: 'bg-teal/10 border-teal/20',
    }
    const textColor = {
      default: 'text-navy',
      success: 'text-teal',
      danger: 'text-danger',
      teal: 'text-teal',
    }
    return (
      <div className={`rounded-xl border px-4 py-3 ${styles[variant]}`}>
        <div className="section-label text-surface-500 mb-0.5">{label}</div>
        <div className={`text-lg font-bold num ${textColor[variant]}`}>{value}</div>
      </div>
    )
  }

  const NextButton = ({ sectionIndex }: { sectionIndex: number }) => {
    if (sectionIndex >= SECTIONS.length - 1 || viewMode === 'showall') return null
    const nextSection = SECTIONS[sectionIndex + 1]
    return (
      <div className="pt-4 mt-4 border-t border-surface-100">
        <button 
          onClick={goToNextSection}
          className="w-full py-3 px-4 bg-teal/10 hover:bg-teal/20 text-navy border border-teal/20 text-sm font-bold rounded-[40px] flex items-center justify-center gap-2 transition-colors"
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
        className={`bg-white rounded-xl shadow-card overflow-hidden transition-shadow hover:shadow-card-hover ${isOpen ? 'ring-2 ring-teal/20' : ''}`}
      >
        <button 
          onClick={() => toggleSection(index)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-surface-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-teal">{Icons[iconKey]}</span>
            <span className="text-sm font-semibold text-navy">{title}</span>
            {isComplete && (
              <span className="w-4 h-4 rounded-full bg-teal flex items-center justify-center text-white">
                {Icons.check}
              </span>
            )}
          </div>
          <span 
            className="text-surface-400 transition-transform duration-200"
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
  let verdict: string, verdictSub: string
  if (calc.dealScore >= 70 && isProfit) {
    verdict = "Strong Investment"
    verdictSub = "Excellent potential with solid returns"
  } else if (calc.dealScore >= 50 && isProfit) {
    verdict = "Moderate Deal"
    verdictSub = "Acceptable returns, room to optimize"
  } else if (isProfit) {
    verdict = "Marginal Deal"
    verdictSub = "Consider negotiating price"
  } else {
    verdict = "Cash Flow Negative"
    verdictSub = "Deal loses money as structured"
  }

  const targets = [
    { label: 'Cap', actual: calc.capRatePurchase, target: 8, unit: '%', met: calc.capRatePurchase >= 8 },
    { label: 'CoC', actual: calc.cashOnCash, target: 10, unit: '%', met: calc.cashOnCash >= 10 },
    { label: 'DSCR', actual: calc.dscr, target: 1.2, unit: 'x', met: calc.dscr >= 1.2 },
    { label: '1% Rule', actual: calc.rentToValue, target: 1, unit: '%', met: calc.rentToValue >= 1 },
  ]

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-surface-50">
      {/* PAGE HEADER */}
      <header className="bg-white border-b border-surface-200 sticky top-14 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-5">
              <button className="text-teal hover:text-teal-dark transition-colors text-sm font-medium">
                ← Back
              </button>
              <div>
                <h1 className="text-base font-semibold text-navy">{address}</h1>
                <p className="text-sm text-surface-500">
                  {city}{city && state ? ', ' : ''}{state} {zip}
                  {beds > 0 && ` · ${beds} bed`}
                  {baths > 0 && ` · ${baths} bath`}
                  {sqft > 0 && ` · ${sqft.toLocaleString()} sqft`}
                </p>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-surface-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('guided')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'guided' ? 'bg-teal text-white' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                Guided
              </button>
              <button 
                onClick={() => setViewMode('showall')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'showall' ? 'bg-teal text-white' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                Expand All
              </button>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-4">
            {SECTIONS.map((section, i) => {
              const isComplete = completedSections.has(i) && i !== currentSection
              const isActive = i === currentSection
              
              return (
                <div key={section.id} className={`flex items-center gap-2 ${i < SECTIONS.length - 1 ? 'flex-1' : ''}`}>
                  <button 
                    onClick={() => toggleSection(i)}
                    className="relative group"
                    title={section.title}
                  >
                    {isComplete ? (
                      <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center text-white">
                        {Icons.check}
                      </div>
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full bg-teal ring-4 ring-teal/20" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-surface-200" />
                    )}
                  </button>
                  {i < SECTIONS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${
                      (currentSection !== null && i < currentSection) || completedSections.has(i + 1) 
                        ? 'bg-teal/50' 
                        : 'bg-surface-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* KPI strip */}
          <div className="grid grid-cols-6 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(8, 145, 178, 0.15)' }}>
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">List Price</div>
              <div className="text-sm font-bold text-teal num">{fmt.currency(purchasePrice)}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(10, 22, 40, 0.08)' }}>
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">Cash Needed</div>
              <div className="text-sm font-bold text-navy num">{fmt.currency(calc.totalCashNeeded)}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: isProfit ? 'rgba(8, 145, 178, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">Annual Profit</div>
              <div className={`text-sm font-bold num ${isProfit ? 'text-teal' : 'text-danger'}`}>
                {isProfit ? '+' : ''}{fmt.currency(calc.annualCashFlow)}
              </div>
            </div>
            <div className="bg-surface-100 rounded-lg p-3 text-center">
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">Cap Rate</div>
              <div className="text-sm font-bold text-navy num">{fmt.percent(calc.capRatePurchase)}</div>
            </div>
            <div className="bg-surface-100 rounded-lg p-3 text-center">
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">CoC Return</div>
              <div className="text-sm font-bold text-navy num">{fmt.percent(calc.cashOnCash)}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(8, 145, 178, 0.15)' }}>
              <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">Deal Score</div>
              <div className="text-sm font-bold num text-teal">{calc.dealScore}</div>
            </div>
          </div>
        </div>
      </header>
      
      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN - Worksheet */}
          <div className="space-y-3">
            {/* Purchase */}
            <Section index={0} title="Purchase" iconKey="home">
              <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} min={100000} max={2000000} step={5000} format="currency" />
              <DisplayRow label="Loan Amount" value={fmt.currency(calc.loanAmount)} />
              <InputRow label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} min={0} max={100} step={1} format="percent" subValue={fmt.currency(calc.downPayment)} />
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
              <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(purchasePrice * 0.8)} max={Math.round(purchasePrice * 1.5)} step={5000} format="currency" />
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
          
          {/* RIGHT COLUMN - Insight Panel */}
          <div className="sticky top-[208px] space-y-4" style={{ maxHeight: 'calc(100vh - 228px)', overflowY: 'auto' }}>
            {/* IQ Verdict Card */}
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(8, 145, 178, 0.08) 0%, rgba(8, 145, 178, 0.02) 100%)' }}>
                <div className="section-label text-teal mb-3">IQ VERDICT: LONG-TERM RENTAL</div>
                <div className="flex items-center gap-4 bg-white rounded-[40px] px-5 py-3 shadow-card mb-3">
                  <span className="text-3xl font-extrabold num text-teal">{calc.dealScore}</span>
                  <div>
                    <div className="text-base font-bold text-navy">{verdict}</div>
                    <div className="text-xs text-surface-500">Deal Score</div>
                  </div>
                </div>
                <p className="text-sm text-surface-500 text-center">{verdictSub}</p>
              </div>
              
              <div className="px-5 py-4 border-t border-surface-100">
                <div className="section-label text-navy mb-3">RETURNS VS TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                    <span className="text-sm text-surface-500">{t.label}</span>
                    <span className={`text-sm font-semibold num ${t.met ? 'text-teal' : 'text-navy'}`}>
                      {t.actual.toFixed(1)}{t.unit} / {t.target}{t.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Price Position Card */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="section-label text-navy mb-4">PRICE POSITION</div>
              
              {/* Gauge SVG */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <svg width="160" height="85" viewBox="0 0 160 85">
                    <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 15 80 A 65 65 0 0 1 80 15" fill="none" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="14" strokeLinecap="round" />
                    <path d="M 80 15 A 65 65 0 0 1 145 80" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="14" strokeLinecap="round" />
                    <line x1="80" y1="80" x2="115" y2="45" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="80" cy="80" r="5" fill="#0A1628" />
                  </svg>
                  <div className="absolute bottom-0 left-2 text-[9px] font-bold text-danger">LOSS</div>
                  <div className="absolute bottom-0 right-2 text-[9px] font-bold text-success">PROFIT</div>
                </div>
              </div>
              
              {/* Price rows */}
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 px-3 rounded-lg">
                  <span className="text-sm text-surface-500">List Price</span>
                  <span className="text-sm font-semibold text-navy num">{fmt.currency(purchasePrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg">
                  <span className="text-sm text-surface-500">Breakeven</span>
                  <span className="text-sm font-semibold text-navy num">{fmt.currency(calc.breakeven)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-teal/10 border border-teal/20">
                  <span className="text-sm font-medium text-teal">Buy Price</span>
                  <span className="text-sm font-bold text-teal num">{fmt.currency(purchasePrice)}</span>
                </div>
              </div>
            </div>
            
            {/* Key Numbers Card */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="section-label text-navy mb-3">KEY NUMBERS</div>
              
              <div className="space-y-0 divide-y divide-surface-100">
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">Cash Required</span>
                  <span className="text-sm font-semibold text-navy num">{fmt.currency(calc.totalCashNeeded)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">NOI</span>
                  <span className="text-sm font-semibold text-navy num">{fmt.currency(calc.noi)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">Debt Service</span>
                  <span className="text-sm font-semibold text-navy num">{fmt.currency(calc.annualLoanPayments)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">DSCR</span>
                  <span className={`text-sm font-semibold num ${calc.dscr >= 1.25 ? 'text-teal' : 'text-navy'}`}>{fmt.ratio(calc.dscr)}</span>
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <button 
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-teal/10 hover:bg-teal/20 border border-teal/25 rounded-[40px] text-navy font-bold text-sm transition-colors"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
