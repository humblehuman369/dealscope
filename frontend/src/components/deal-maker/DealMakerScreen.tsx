'use client'

/**
 * DealMakerScreen Component
 * 
 * Deal Maker IQ page with CompactHeader integration
 * Features:
 * - CompactHeader with strategy selector
 * - Key metrics row (Buy Price, Cash Needed, Deal Gap, Annual Profit, CAP Rate, COC Return)
 * - Accordion sections for inputs (Buy Price, Financing, Rehab, Income, Expenses)
 * - Interactive sliders for all values
 * 
 * Uses InvestIQ Universal Style Guide colors
 * 
 * NOTE: Default values are loaded from the centralized defaults API.
 * See docs/DEFAULTS_ARCHITECTURE.md for details.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompactHeader, type PropertyData as HeaderPropertyData } from '@/components/layout/CompactHeader'
import { useDefaults } from '@/hooks/useDefaults'
import { useWorksheetStore } from '@/stores/worksheetStore'

// Types
export interface DealMakerPropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  beds: number
  baths: number
  sqft: number
  yearBuilt?: number
  price: number
  rent?: number
  zpid?: string
  image?: string
  propertyTax?: number
  insurance?: number
}

interface DealMakerScreenProps {
  property: DealMakerPropertyData
  listPrice?: number
  initialStrategy?: string
}

interface DealMakerState {
  buyPrice: number
  downPaymentPercent: number
  closingCostsPercent: number
  interestRate: number
  loanTermYears: number
  rehabBudget: number
  arv: number
  monthlyRent: number
  otherIncome: number
  vacancyRate: number
  maintenanceRate: number
  managementRate: number
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
}

interface DealMakerMetrics {
  cashNeeded: number
  dealGap: number
  annualProfit: number
  capRate: number
  cocReturn: number
  monthlyPayment: number
  loanAmount: number
  equityCreated: number
  grossMonthlyIncome: number
  totalMonthlyExpenses: number
}

type AccordionSection = 'buyPrice' | 'financing' | 'rehab' | 'income' | 'expenses' | null

// Helper functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

function calculateMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  return isFinite(payment) ? payment : 0
}

// Accordion section definitions
const accordionSections = [
  {
    id: 'buyPrice' as const,
    title: 'Buy Price',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
      </svg>
    ),
  },
  {
    id: 'financing' as const,
    title: 'Financing',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
      </svg>
    ),
  },
  {
    id: 'rehab' as const,
    title: 'Rehab & Valuation',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
      </svg>
    ),
  },
  {
    id: 'income' as const,
    title: 'Income',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  },
  {
    id: 'expenses' as const,
    title: 'Expenses',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
      </svg>
    ),
  },
]

// Slider Component
interface SliderInputProps {
  label: string
  value: number
  displayValue: string
  min: number
  max: number
  minLabel: string
  maxLabel: string
  onChange: (value: number) => void
}

function SliderInput({ label, value, displayValue, min, max, minLabel, maxLabel, onChange }: SliderInputProps) {
  const fillPercent = ((value - min) / (max - min)) * 100

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-[#0A1628]">{label}</span>
        <span className="text-base font-bold text-[#0891B2] tabular-nums">{displayValue}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full relative">
          <div 
            className="absolute left-0 top-0 h-full bg-[#0891B2] rounded-full"
            style={{ width: `${fillPercent}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="absolute w-4 h-4 bg-[#0891B2] border-2 border-white rounded-full shadow-md -translate-y-1/2 top-1/2"
            style={{ left: `calc(${fillPercent}% - 8px)` }}
          />
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] text-[#94A3B8]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export function DealMakerScreen({ property, listPrice, initialStrategy }: DealMakerScreenProps) {
  const router = useRouter()
  
  // Fetch centralized defaults based on property ZIP code
  const { defaults, loading: defaultsLoading } = useDefaults(property.zipCode)
  
  // State
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')
  const [activeAccordion, setActiveAccordion] = useState<AccordionSection>('buyPrice')
  const [state, setState] = useState<DealMakerState>({
    buyPrice: listPrice ?? property.price ?? 350000,
    downPaymentPercent: 0.20,  // Will be updated from defaults
    closingCostsPercent: 0.03,
    interestRate: 0.06,
    loanTermYears: 30,
    rehabBudget: 0,
    arv: (listPrice ?? property.price ?? 350000) * 1.0,
    monthlyRent: property.rent ?? 2800,
    otherIncome: 0,
    vacancyRate: 0.01,
    maintenanceRate: 0.05,
    managementRate: 0.00,
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance: property.insurance || 1800,
    monthlyHoa: 0,
  })
  
  // Worksheet store for syncing changes to analytics
  const worksheetStore = useWorksheetStore()
  
  // Track if we've initialized the worksheet with this property
  const [worksheetInitialized, setWorksheetInitialized] = useState(false)
  
  // Update state when defaults are loaded from API
  useEffect(() => {
    if (defaults && !defaultsLoading) {
      setState(prev => ({
        ...prev,
        // Only update values that haven't been manually changed
        downPaymentPercent: prev.downPaymentPercent === 0.20 ? (defaults.financing?.down_payment_pct ?? 0.20) : prev.downPaymentPercent,
        closingCostsPercent: defaults.financing?.closing_costs_pct ?? prev.closingCostsPercent,
        interestRate: defaults.financing?.interest_rate ?? prev.interestRate,
        loanTermYears: defaults.financing?.loan_term_years ?? prev.loanTermYears,
        vacancyRate: defaults.operating?.vacancy_rate ?? prev.vacancyRate,
        maintenanceRate: defaults.operating?.maintenance_pct ?? prev.maintenanceRate,
        managementRate: defaults.operating?.property_management_pct ?? prev.managementRate,
      }))
    }
  }, [defaults, defaultsLoading])
  
  // Initialize worksheet store with property data on mount
  useEffect(() => {
    if (!worksheetInitialized && property.zpid) {
      // Create a property object compatible with worksheetStore
      const propertyForWorksheet = {
        id: property.zpid,
        property_data_snapshot: {
          listPrice: listPrice ?? property.price,
          monthlyRent: property.rent,
          propertyTaxes: property.propertyTax,
          insurance: property.insurance,
          sqft: property.sqft,
          zipCode: property.zipCode,
        },
        worksheet_assumptions: {},
      }
      worksheetStore.initializeFromProperty(propertyForWorksheet)
      setWorksheetInitialized(true)
    }
  }, [worksheetInitialized, property, listPrice, worksheetStore])
  
  // Sync Deal Maker state to worksheet store on EVERY change (with debouncing built into worksheetStore)
  useEffect(() => {
    if (!worksheetInitialized) return
    
    // Map Deal Maker state to worksheet assumptions format and sync
    worksheetStore.updateMultipleAssumptions({
      purchasePrice: state.buyPrice,
      downPaymentPct: state.downPaymentPercent,
      closingCostsPct: state.closingCostsPercent,
      closingCosts: state.buyPrice * state.closingCostsPercent,
      interestRate: state.interestRate,
      loanTermYears: state.loanTermYears,
      rehabCosts: state.rehabBudget,
      arv: state.arv,
      monthlyRent: state.monthlyRent,
      vacancyRate: state.vacancyRate,
      maintenancePct: state.maintenanceRate,
      managementPct: state.managementRate,
      propertyTaxes: state.annualPropertyTax,
      insurance: state.annualInsurance,
      hoaFees: state.monthlyHoa * 12,
    })
    // worksheetStore.updateMultipleAssumptions already triggers recalculation with debouncing
  }, [
    worksheetInitialized,
    state.buyPrice,
    state.downPaymentPercent,
    state.closingCostsPercent,
    state.interestRate,
    state.loanTermYears,
    state.rehabBudget,
    state.arv,
    state.monthlyRent,
    state.vacancyRate,
    state.maintenanceRate,
    state.managementRate,
    state.annualPropertyTax,
    state.annualInsurance,
    state.monthlyHoa,
    worksheetStore
  ])
  
  // Sync Deal Maker state to worksheet store and navigate to results
  const handleSeeResults = useCallback(() => {
    // Trigger recalculation with current state
    worksheetStore.recalculate()
    
    // Determine strategy route based on current selection
    const strategyMap: Record<string, string> = {
      'Long-term': 'ltr',
      'Short-term': 'str',
      'BRRRR': 'brrrr',
      'Fix & Flip': 'flip',
      'House Hack': 'househack',
      'Wholesale': 'wholesale',
    }
    const strategySlug = strategyMap[currentStrategy] || 'ltr'
    
    // Navigate to worksheet page - use zpid or encoded address as ID
    const propertyId = property.zpid || encodeURIComponent(property.address)
    router.push(`/worksheet/${propertyId}/${strategySlug}`)
  }, [router, property.zpid, property.address, currentStrategy, worksheetStore])

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  // Convert to CompactHeader format
  const headerPropertyData: HeaderPropertyData = {
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zipCode,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    price: property.price,
    rent: property.rent ?? Math.round(property.price * 0.008),
    status: 'FOR-SALE',
    image: property.image,
    zpid: property.zpid,
  }

  // Get worksheet metrics for live updates (from API calculations)
  const worksheetMetrics = worksheetStore.worksheetMetrics
  const isWorksheetCalculating = worksheetStore.isCalculating
  
  // Calculate metrics - prefer worksheetStore values when available for consistency
  const metrics = useMemo<DealMakerMetrics>(() => {
    const downPaymentAmount = state.buyPrice * state.downPaymentPercent
    const closingCostsAmount = state.buyPrice * state.closingCostsPercent
    const cashNeeded = worksheetMetrics?.total_cash_needed ?? (downPaymentAmount + closingCostsAmount)

    const loanAmount = worksheetMetrics?.loan_amount ?? (state.buyPrice - downPaymentAmount)
    const monthlyPayment = worksheetMetrics?.monthly_payment ?? calculateMortgagePayment(loanAmount, state.interestRate, state.loanTermYears)

    const totalInvestment = state.buyPrice + state.rehabBudget
    const equityCreated = state.arv - totalInvestment

    const grossMonthlyIncome = state.monthlyRent + state.otherIncome

    // Use worksheet values when available
    const annualCashFlow = worksheetMetrics?.annual_cash_flow ?? (() => {
      const vacancy = grossMonthlyIncome * state.vacancyRate
      const maintenance = grossMonthlyIncome * state.maintenanceRate
      const management = grossMonthlyIncome * state.managementRate
      const propertyTaxMonthly = state.annualPropertyTax / 12
      const insuranceMonthly = state.annualInsurance / 12
      const monthlyOperatingExpenses = vacancy + maintenance + management + 
        propertyTaxMonthly + insuranceMonthly + state.monthlyHoa
      const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment
      return (grossMonthlyIncome - totalMonthlyExpenses) * 12
    })()

    // Calculate operating expenses for totalMonthlyExpenses display
    const vacancy = grossMonthlyIncome * state.vacancyRate
    const maintenance = grossMonthlyIncome * state.maintenanceRate
    const management = grossMonthlyIncome * state.managementRate
    const propertyTaxMonthly = state.annualPropertyTax / 12
    const insuranceMonthly = state.annualInsurance / 12
    const monthlyOperatingExpenses = vacancy + maintenance + management + 
      propertyTaxMonthly + insuranceMonthly + state.monthlyHoa
    const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment

    const capRate = worksheetMetrics?.cap_rate ?? (state.buyPrice > 0 
      ? (((grossMonthlyIncome - monthlyOperatingExpenses) * 12) / state.buyPrice) * 100 
      : 0)
    
    const cocReturn = worksheetMetrics?.cash_on_cash_return ?? (cashNeeded > 0 
      ? (annualCashFlow / cashNeeded) * 100 
      : 0)

    const effectiveListPrice = listPrice ?? state.buyPrice
    const dealGap = effectiveListPrice > 0 
      ? (effectiveListPrice - state.buyPrice) / effectiveListPrice 
      : 0

    return {
      cashNeeded,
      dealGap,
      annualProfit: annualCashFlow,
      capRate: worksheetMetrics ? capRate : capRate * 100, // worksheet returns %, local calc returns decimal
      cocReturn: worksheetMetrics ? cocReturn : cocReturn * 100, // worksheet returns %, local calc returns decimal
      monthlyPayment,
      loanAmount,
      equityCreated,
      grossMonthlyIncome,
      totalMonthlyExpenses,
    }
  }, [state, listPrice, worksheetMetrics])

  const updateState = useCallback(<K extends keyof DealMakerState>(key: K, value: DealMakerState[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleStrategyChange = (strategy: string) => {
    setCurrentStrategy(strategy)
  }

  const handleBack = () => {
    router.back()
  }

  const toggleAccordion = (section: AccordionSection) => {
    setActiveAccordion(activeAccordion === section ? null : section)
  }

  const handleContinue = (currentSection: AccordionSection) => {
    const sectionOrder: AccordionSection[] = ['buyPrice', 'financing', 'rehab', 'income', 'expenses']
    const currentIndex = sectionOrder.indexOf(currentSection)
    if (currentIndex < sectionOrder.length - 1) {
      setActiveAccordion(sectionOrder[currentIndex + 1])
    } else {
      // Final step - view analysis
      router.push(`/analysis-iq?address=${encodeURIComponent(fullAddress)}`)
    }
  }

  const getValueColor = (color: string) => {
    switch (color) {
      case 'cyan': return '#00D4FF'
      case 'teal': return '#06B6D4'
      case 'rose': return '#F43F5E'
      default: return '#FFFFFF'
    }
  }

  // Key metrics for header - cap rate and COC are now in % format from worksheetStore
  const headerMetrics = [
    { label: 'Buy Price', value: formatPrice(state.buyPrice), color: 'white' },
    { label: 'Cash Needed', value: formatPrice(metrics.cashNeeded), color: 'white' },
    { label: 'Deal Gap', value: `${metrics.dealGap >= 0 ? '+' : ''}${formatPercent(metrics.dealGap)}`, color: 'cyan' },
    { label: 'Annual Profit', value: formatPrice(metrics.annualProfit), color: metrics.annualProfit >= 0 ? 'teal' : 'rose' },
    { label: 'CAP Rate', value: `${metrics.capRate.toFixed(1)}%`, color: 'white' },
    { label: 'COC Return', value: `${metrics.cocReturn.toFixed(1)}%`, color: metrics.cocReturn >= 0 ? 'white' : 'rose' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      {/* Compact Header */}
      <CompactHeader
        property={headerPropertyData}
        pageTitle="DEAL"
        pageTitleAccent="MAKER IQ"
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onBack={handleBack}
        activeNav="deals"
        defaultPropertyOpen={false}
      />

      {/* Key Metrics Row */}
      <div className="bg-[#0A1628] px-4 pb-4 -mt-1">
        {/* Live calculation indicator */}
        {isWorksheetCalculating && (
          <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] text-[#00D4FF]">
            <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-pulse" />
            Recalculating...
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-3 border-t border-white/10">
          {headerMetrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center py-0.5">
              <span className="text-xs text-[#94A3B8]">{metric.label}</span>
              <span 
                className={`text-[13px] font-semibold tabular-nums ${isWorksheetCalculating ? 'opacity-60' : ''}`}
                style={{ color: getValueColor(metric.color) }}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Accordion Sections */}
      <main className="p-4 pb-8">
        {accordionSections.map((section) => (
          <div
            key={section.id}
            className={`bg-white rounded-xl mb-2.5 shadow-sm border overflow-hidden transition-all ${
              activeAccordion === section.id 
                ? 'border-[#0891B2]/20 shadow-[0_0_0_2px_rgba(8,145,178,0.1)]' 
                : 'border-[#F1F5F9]'
            }`}
          >
            {/* Accordion Header */}
            <button
              className="flex items-center gap-3 p-3.5 w-full text-left"
              onClick={() => toggleAccordion(section.id)}
            >
              <div className="w-6 h-6 text-[#0891B2]">{section.icon}</div>
              <span className="flex-1 text-[15px] font-semibold text-[#0A1628]">{section.title}</span>
              <svg
                className={`w-5 h-5 text-[#94A3B8] transition-transform ${activeAccordion === section.id ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {/* Accordion Content */}
            {activeAccordion === section.id && (
              <div className="px-4 pb-4 border-t border-[#F1F5F9]">
                {/* Buy Price Section */}
                {section.id === 'buyPrice' && (
                  <>
                    <SliderInput
                      label="Buy Price"
                      value={state.buyPrice}
                      displayValue={formatPrice(state.buyPrice)}
                      min={50000}
                      max={2000000}
                      minLabel="$50,000"
                      maxLabel="$2,000,000"
                      onChange={(v) => updateState('buyPrice', v)}
                    />
                    <SliderInput
                      label="Down Payment"
                      value={state.downPaymentPercent * 100}
                      displayValue={`${(state.downPaymentPercent * 100).toFixed(1)}%`}
                      min={5}
                      max={50}
                      minLabel="5.0%"
                      maxLabel="50.0%"
                      onChange={(v) => updateState('downPaymentPercent', v / 100)}
                    />
                    <SliderInput
                      label="Closing Costs"
                      value={state.closingCostsPercent * 100}
                      displayValue={`${(state.closingCostsPercent * 100).toFixed(2)}%`}
                      min={2}
                      max={5}
                      minLabel="2.00%"
                      maxLabel="5.00%"
                      onChange={(v) => updateState('closingCostsPercent', v / 100)}
                    />
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">CASH NEEDED</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice(metrics.cashNeeded)}</div>
                    </div>
                  </>
                )}

                {/* Financing Section */}
                {section.id === 'financing' && (
                  <>
                    <div className="flex justify-between items-center py-3 mt-4 mb-2 border-b border-[#E2E8F0]">
                      <span className="text-sm font-semibold text-[#0A1628]">Loan Amount</span>
                      <span className="text-base font-bold text-[#0891B2] tabular-nums">{formatPrice(metrics.loanAmount)}</span>
                    </div>
                    <SliderInput
                      label="Interest Rate"
                      value={state.interestRate * 100}
                      displayValue={`${(state.interestRate * 100).toFixed(2)}%`}
                      min={5}
                      max={12}
                      minLabel="5.00%"
                      maxLabel="12.00%"
                      onChange={(v) => updateState('interestRate', v / 100)}
                    />
                    <SliderInput
                      label="Loan Term"
                      value={state.loanTermYears}
                      displayValue={`${state.loanTermYears} years`}
                      min={10}
                      max={30}
                      minLabel="10 years"
                      maxLabel="30 years"
                      onChange={(v) => updateState('loanTermYears', Math.round(v))}
                    />
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">MONTHLY PAYMENT</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice(metrics.monthlyPayment)}</div>
                    </div>
                  </>
                )}

                {/* Rehab & Valuation Section */}
                {section.id === 'rehab' && (
                  <>
                    <SliderInput
                      label="Rehab Budget"
                      value={state.rehabBudget}
                      displayValue={formatPrice(state.rehabBudget)}
                      min={0}
                      max={100000}
                      minLabel="$0"
                      maxLabel="$100,000"
                      onChange={(v) => updateState('rehabBudget', v)}
                    />
                    <SliderInput
                      label="ARV"
                      value={state.arv}
                      displayValue={formatPrice(state.arv)}
                      min={state.buyPrice}
                      max={state.buyPrice * 2}
                      minLabel={formatPrice(state.buyPrice)}
                      maxLabel={formatPrice(state.buyPrice * 2)}
                      onChange={(v) => updateState('arv', v)}
                    />
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">EQUITY CAPTURE</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice(metrics.equityCreated)}</div>
                    </div>
                  </>
                )}

                {/* Income Section */}
                {section.id === 'income' && (
                  <>
                    <SliderInput
                      label="Monthly Rent"
                      value={state.monthlyRent}
                      displayValue={formatPrice(state.monthlyRent)}
                      min={500}
                      max={10000}
                      minLabel="$500"
                      maxLabel="$10,000"
                      onChange={(v) => updateState('monthlyRent', v)}
                    />
                    <SliderInput
                      label="Vacancy Rate"
                      value={state.vacancyRate * 100}
                      displayValue={`${(state.vacancyRate * 100).toFixed(0)}%`}
                      min={0}
                      max={20}
                      minLabel="0%"
                      maxLabel="20%"
                      onChange={(v) => updateState('vacancyRate', v / 100)}
                    />
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">ANNUAL INCOME</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice(metrics.grossMonthlyIncome * 12 * (1 - state.vacancyRate))}</div>
                    </div>
                  </>
                )}

                {/* Expenses Section */}
                {section.id === 'expenses' && (
                  <>
                    <SliderInput
                      label="Property Taxes"
                      value={state.annualPropertyTax}
                      displayValue={`${formatPrice(state.annualPropertyTax)}/yr`}
                      min={0}
                      max={20000}
                      minLabel="$0"
                      maxLabel="$20,000"
                      onChange={(v) => updateState('annualPropertyTax', v)}
                    />
                    <SliderInput
                      label="Insurance"
                      value={state.annualInsurance}
                      displayValue={`${formatPrice(state.annualInsurance)}/yr`}
                      min={0}
                      max={10000}
                      minLabel="$0"
                      maxLabel="$10,000"
                      onChange={(v) => updateState('annualInsurance', v)}
                    />
                    <SliderInput
                      label="Management Rate"
                      value={state.managementRate * 100}
                      displayValue={`${(state.managementRate * 100).toFixed(0)}%`}
                      min={0}
                      max={15}
                      minLabel="0%"
                      maxLabel="15%"
                      onChange={(v) => updateState('managementRate', v / 100)}
                    />
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">TOTAL EXPENSES</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice(metrics.totalMonthlyExpenses * 12)}/yr</div>
                    </div>
                  </>
                )}

                {/* Continue Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#0891B2] text-white rounded-xl text-base font-semibold mt-4 hover:bg-[#0E7490] transition-colors"
                  onClick={() => handleContinue(section.id)}
                >
                  {section.id === 'expenses' ? 'View Analysis' : 'Continue to Next'}
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Floating "See Results" Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-[#F1F5F9] via-[#F1F5F9] to-transparent pointer-events-none">
        <button
          onClick={handleSeeResults}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white font-semibold text-base shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] pointer-events-auto"
          style={{ 
            background: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.25)'
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          See Results
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </button>
      </div>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}

export default DealMakerScreen
