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
 * ARCHITECTURE: This component now uses the centralized dealMakerStore.
 * - For SAVED properties: Load from backend via dealMakerStore.loadRecord(propertyId)
 * - For UNSAVED properties: Use local state with property defaults (legacy mode)
 * - All changes are persisted to backend immediately (for saved properties)
 * - No more fetching defaults on every page load - they're locked in the DealMakerRecord
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompactHeader, type PropertyData as HeaderPropertyData } from '@/components/layout/CompactHeader'
import { useDealMakerStore, useDealMakerDerived, useDealMakerReady } from '@/stores/dealMakerStore'
import { 
  StrategyType,
  STRDealMakerState,
  STRMetrics,
  DEFAULT_STR_DEAL_MAKER_STATE,
} from './types'
import { calculateSTRMetrics } from './calculations/strCalculations'

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
  // If propertyId is provided, load from backend (saved property mode)
  // If not provided, use local state (unsaved property mode)
  savedPropertyId?: string
}

interface LTRDealMakerState {
  buyPrice: number
  downPaymentPercent: number
  closingCostsPercent: number
  loanType?: '15-year' | '30-year' | 'arm'
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

// Union type for any strategy state
type DealMakerState = LTRDealMakerState | STRDealMakerState

// Local type guard for STR state
function isSTRState(state: DealMakerState): state is STRDealMakerState {
  return 'averageDailyRate' in state && 'occupancyRate' in state
}

interface LTRDealMakerMetrics {
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

// Union type for any strategy metrics
type DealMakerMetrics = LTRDealMakerMetrics | STRMetrics

type AccordionSection = 'buyPrice' | 'financing' | 'rehab' | 'income' | 'expenses' | null

// Map display strategy names to internal strategy types
function getStrategyType(displayName: string): StrategyType {
  const map: Record<string, StrategyType> = {
    'Long-term': 'ltr',
    'Long-term Rental': 'ltr',
    'Short-term': 'str',
    'Short-term Rental': 'str',
    'BRRRR': 'brrrr',
    'Fix & Flip': 'flip',
    'House Hack': 'house_hack',
    'Wholesale': 'wholesale',
  }
  return map[displayName] || 'ltr'
}

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

export function DealMakerScreen({ property, listPrice, initialStrategy, savedPropertyId }: DealMakerScreenProps) {
  const router = useRouter()
  
  // Deal Maker Store (for saved properties)
  const dealMakerStore = useDealMakerStore()
  const derived = useDealMakerDerived()
  const { isReady, isLoading: storeLoading, hasRecord } = useDealMakerReady()
  
  // Determine if we're in "saved property mode" (use store) or "unsaved mode" (use local state)
  const isSavedPropertyMode = !!savedPropertyId
  
  // Initialize LTR local state for unsaved properties
  const getInitialLTRState = (): LTRDealMakerState => {
    return {
      buyPrice: listPrice ?? property.price ?? 350000,
      downPaymentPercent: 0.20,
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
    }
  }

  // Initialize STR local state for unsaved properties
  const getInitialSTRState = (): STRDealMakerState => {
    const basePrice = listPrice ?? property.price ?? 350000
    return {
      ...DEFAULT_STR_DEAL_MAKER_STATE,
      buyPrice: basePrice,
      arv: basePrice * 1.0,
      annualPropertyTax: property.propertyTax || 4200,
      annualInsurance: (property.insurance || 1800) * 1.5, // Higher for STR
    }
  }

  // Get initial state based on strategy
  const getInitialLocalState = (strategy: StrategyType): DealMakerState => {
    if (strategy === 'str') {
      return getInitialSTRState()
    }
    return getInitialLTRState()
  }
  
  // State
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')
  const [activeAccordion, setActiveAccordion] = useState<AccordionSection>('buyPrice')
  const strategyType = getStrategyType(currentStrategy)
  const [localLTRState, setLocalLTRState] = useState<LTRDealMakerState>(getInitialLTRState)
  const [localSTRState, setLocalSTRState] = useState<STRDealMakerState>(getInitialSTRState)
  
  // Load Deal Maker record from backend for saved properties
  // Check both hasRecord AND if the loaded record is for the correct property
  // This handles navigation between different saved properties
  useEffect(() => {
    if (isSavedPropertyMode && savedPropertyId) {
      const isWrongProperty = dealMakerStore.propertyId !== savedPropertyId
      if (!hasRecord || isWrongProperty) {
        dealMakerStore.loadRecord(savedPropertyId)
      }
    }
  }, [isSavedPropertyMode, savedPropertyId, hasRecord, dealMakerStore])
  
  // Get the current state (from store for saved properties, local for unsaved)
  const state: DealMakerState = useMemo(() => {
    if (isSavedPropertyMode && hasRecord) {
      const record = dealMakerStore.record!
      
      // For STR strategy, return STR state from store
      if (strategyType === 'str') {
        return {
          buyPrice: record.buy_price,
          downPaymentPercent: record.down_payment_pct,
          closingCostsPercent: record.closing_costs_pct,
          loanType: '30-year' as const,
          interestRate: record.interest_rate,
          loanTermYears: record.loan_term_years,
          rehabBudget: record.rehab_budget,
          arv: record.arv,
          furnitureSetupCost: record.furniture_setup_cost ?? DEFAULT_STR_DEAL_MAKER_STATE.furnitureSetupCost,
          averageDailyRate: record.average_daily_rate ?? DEFAULT_STR_DEAL_MAKER_STATE.averageDailyRate,
          occupancyRate: record.occupancy_rate ?? DEFAULT_STR_DEAL_MAKER_STATE.occupancyRate,
          cleaningFeeRevenue: record.cleaning_fee_revenue ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningFeeRevenue,
          avgLengthOfStayDays: record.avg_length_of_stay_days ?? DEFAULT_STR_DEAL_MAKER_STATE.avgLengthOfStayDays,
          platformFeeRate: record.platform_fee_rate ?? DEFAULT_STR_DEAL_MAKER_STATE.platformFeeRate,
          strManagementRate: record.str_management_rate ?? DEFAULT_STR_DEAL_MAKER_STATE.strManagementRate,
          cleaningCostPerTurnover: record.cleaning_cost_per_turnover ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningCostPerTurnover,
          suppliesMonthly: record.supplies_monthly ?? DEFAULT_STR_DEAL_MAKER_STATE.suppliesMonthly,
          additionalUtilitiesMonthly: record.additional_utilities_monthly ?? DEFAULT_STR_DEAL_MAKER_STATE.additionalUtilitiesMonthly,
          maintenanceRate: record.maintenance_pct,
          annualPropertyTax: record.annual_property_tax,
          annualInsurance: record.annual_insurance,
          monthlyHoa: record.monthly_hoa,
        } as STRDealMakerState
      }
      
      // Default: LTR state
      return {
        buyPrice: record.buy_price,
        downPaymentPercent: record.down_payment_pct,
        closingCostsPercent: record.closing_costs_pct,
        interestRate: record.interest_rate,
        loanTermYears: record.loan_term_years,
        rehabBudget: record.rehab_budget,
        arv: record.arv,
        monthlyRent: record.monthly_rent,
        otherIncome: record.other_income,
        vacancyRate: record.vacancy_rate,
        maintenanceRate: record.maintenance_pct,
        managementRate: record.management_pct,
        annualPropertyTax: record.annual_property_tax,
        annualInsurance: record.annual_insurance,
        monthlyHoa: record.monthly_hoa,
      } as LTRDealMakerState
    }
    
    // For unsaved properties, return the appropriate local state
    if (strategyType === 'str') {
      return localSTRState
    }
    return localLTRState
  }, [isSavedPropertyMode, hasRecord, dealMakerStore.record, strategyType, localLTRState, localSTRState])
  
  // Navigate to Verdict IQ page
  // For saved properties, Verdict will read from the store (same data source)
  // For unsaved properties, store values in sessionStorage and pass via URL params
  const handleSeeResults = useCallback(() => {
    const fullAddr = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
    
    if (isSavedPropertyMode && savedPropertyId) {
      // For saved properties, navigate with just the propertyId
      // Verdict will load the DealMakerRecord from the same store
      router.push(`/verdict?propertyId=${savedPropertyId}&strategy=${strategyType}`)
    } else {
      // For unsaved properties:
      // 1. Store values in sessionStorage so they survive toolbar navigation
      // 2. Also pass via URL params for initial load
      const sessionKey = `dealMaker_${encodeURIComponent(fullAddr)}`
      
      // Build session data based on strategy type
      let sessionData: Record<string, unknown>
      
      if (strategyType === 'str' && isSTRState(state)) {
        // STR-specific session data
        // Calculate equivalent monthly revenue for display purposes
        const nightsOccupied = 365 * state.occupancyRate
        const numberOfTurnovers = Math.floor(nightsOccupied / state.avgLengthOfStayDays)
        const annualRevenue = (state.averageDailyRate * nightsOccupied) + (state.cleaningFeeRevenue * numberOfTurnovers)
        const monthlyRevenue = annualRevenue / 12
        
        sessionData = {
          address: fullAddr,
          purchasePrice: state.buyPrice,
          monthlyRent: monthlyRevenue, // Equivalent monthly revenue for STR
          propertyTaxes: state.annualPropertyTax,
          insurance: state.annualInsurance,
          arv: state.arv,
          zpid: property.zpid,
          strategy: 'str',
          // STR-specific values
          averageDailyRate: state.averageDailyRate,
          occupancyRate: state.occupancyRate,
          cleaningFeeRevenue: state.cleaningFeeRevenue,
          avgLengthOfStayDays: state.avgLengthOfStayDays,
          platformFeeRate: state.platformFeeRate,
          strManagementRate: state.strManagementRate,
          cleaningCostPerTurnover: state.cleaningCostPerTurnover,
          suppliesMonthly: state.suppliesMonthly,
          additionalUtilitiesMonthly: state.additionalUtilitiesMonthly,
          furnitureSetupCost: state.furnitureSetupCost,
          // Shared values
          downPaymentPct: state.downPaymentPercent,
          closingCostsPct: state.closingCostsPercent,
          interestRate: state.interestRate,
          loanTermYears: state.loanTermYears,
          rehabBudget: state.rehabBudget,
          maintenancePct: state.maintenanceRate,
          monthlyHoa: state.monthlyHoa,
          timestamp: Date.now(),
        }
      } else {
        // LTR session data
        const ltrState = state as LTRDealMakerState
        sessionData = {
          address: fullAddr,
          purchasePrice: ltrState.buyPrice,
          monthlyRent: ltrState.monthlyRent,
          propertyTaxes: ltrState.annualPropertyTax,
          insurance: ltrState.annualInsurance,
          arv: ltrState.arv,
          zpid: property.zpid,
          strategy: 'ltr',
          // Include all Deal Maker values for complete persistence
          downPaymentPct: ltrState.downPaymentPercent,
          closingCostsPct: ltrState.closingCostsPercent,
          interestRate: ltrState.interestRate,
          loanTermYears: ltrState.loanTermYears,
          rehabBudget: ltrState.rehabBudget,
          vacancyRate: ltrState.vacancyRate,
          maintenancePct: ltrState.maintenanceRate,
          managementPct: ltrState.managementRate,
          monthlyHoa: ltrState.monthlyHoa,
          timestamp: Date.now(),
        }
      }
      
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(sessionData))
        // Also store the current address as the "active" deal maker session
        sessionStorage.setItem('dealMaker_activeAddress', fullAddr)
      } catch (e) {
        console.warn('Failed to save to sessionStorage:', e)
      }
      
      // Calculate monthly rent/revenue for URL params
      let monthlyRentValue: number
      if (strategyType === 'str' && isSTRState(state)) {
        const nightsOccupied = 365 * state.occupancyRate
        const numberOfTurnovers = Math.floor(nightsOccupied / state.avgLengthOfStayDays)
        const annualRevenue = (state.averageDailyRate * nightsOccupied) + (state.cleaningFeeRevenue * numberOfTurnovers)
        monthlyRentValue = annualRevenue / 12
      } else {
        monthlyRentValue = 'monthlyRent' in state ? state.monthlyRent : 0
      }
      
      // Navigate with URL params (for initial load and bookmarkability)
      const params = new URLSearchParams({
        address: fullAddr,
        purchasePrice: String(state.buyPrice),
        monthlyRent: String(monthlyRentValue),
        propertyTaxes: String(state.annualPropertyTax),
        insurance: String(state.annualInsurance),
        strategy: strategyType,
      })
      
      if (property.zpid) {
        params.set('zpid', property.zpid)
      }
      if (state.arv > 0) {
        params.set('arv', String(state.arv))
      }
      
      router.push(`/verdict?${params.toString()}`)
    }
  }, [router, property, state, isSavedPropertyMode, savedPropertyId, strategyType])

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

  // Get metrics - from store for saved properties, calculate locally for unsaved
  const isCalculating = isSavedPropertyMode ? dealMakerStore.isSaving : false
  
  // Calculate metrics - prefer store values for saved properties
  const metrics = useMemo<DealMakerMetrics>(() => {
    // For STR strategy, use STR calculations
    if (strategyType === 'str' && isSTRState(state)) {
      return calculateSTRMetrics(state)
    }
    
    // For saved properties with LTR, use cached metrics from store
    if (isSavedPropertyMode && hasRecord && dealMakerStore.record?.cached_metrics && strategyType === 'ltr') {
      const cachedMetrics = dealMakerStore.record.cached_metrics
      const effectiveListPrice = dealMakerStore.record.list_price || state.buyPrice
      const dealGap = effectiveListPrice > 0 
        ? (effectiveListPrice - state.buyPrice) / effectiveListPrice 
        : 0
      
      return {
        cashNeeded: cachedMetrics.total_cash_needed || 0,
        dealGap,
        annualProfit: cachedMetrics.annual_cash_flow || 0,
        capRate: (cachedMetrics.cap_rate || 0) * 100, // Convert to percentage
        cocReturn: (cachedMetrics.cash_on_cash || 0) * 100, // Convert to percentage
        monthlyPayment: cachedMetrics.monthly_payment || 0,
        loanAmount: cachedMetrics.loan_amount || 0,
        equityCreated: cachedMetrics.equity_after_rehab || 0,
        grossMonthlyIncome: (cachedMetrics.gross_income || 0) / 12,
        totalMonthlyExpenses: ((cachedMetrics.total_expenses || 0) + (cachedMetrics.monthly_payment || 0) * 12) / 12,
      } as LTRDealMakerMetrics
    }
    
    // For unsaved LTR properties, calculate locally
    const ltrState = state as LTRDealMakerState
    const downPaymentAmount = ltrState.buyPrice * ltrState.downPaymentPercent
    const closingCostsAmount = ltrState.buyPrice * ltrState.closingCostsPercent
    const cashNeeded = downPaymentAmount + closingCostsAmount

    const loanAmount = ltrState.buyPrice - downPaymentAmount
    const monthlyPayment = calculateMortgagePayment(loanAmount, ltrState.interestRate, ltrState.loanTermYears)

    const totalInvestment = ltrState.buyPrice + ltrState.rehabBudget
    const equityCreated = ltrState.arv - totalInvestment

    const grossMonthlyIncome = ltrState.monthlyRent + ltrState.otherIncome

    // Calculate operating expenses
    const vacancy = grossMonthlyIncome * ltrState.vacancyRate
    const maintenance = grossMonthlyIncome * ltrState.maintenanceRate
    const management = grossMonthlyIncome * ltrState.managementRate
    const propertyTaxMonthly = ltrState.annualPropertyTax / 12
    const insuranceMonthly = ltrState.annualInsurance / 12
    const monthlyOperatingExpenses = vacancy + maintenance + management + 
      propertyTaxMonthly + insuranceMonthly + ltrState.monthlyHoa
    const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment

    const annualCashFlow = (grossMonthlyIncome - totalMonthlyExpenses) * 12

    const capRate = ltrState.buyPrice > 0 
      ? (((grossMonthlyIncome - monthlyOperatingExpenses) * 12) / ltrState.buyPrice) * 100 
      : 0
    
    const cocReturn = cashNeeded > 0 
      ? (annualCashFlow / cashNeeded) * 100 
      : 0

    const effectiveListPrice = listPrice ?? ltrState.buyPrice
    const dealGap = effectiveListPrice > 0 
      ? (effectiveListPrice - ltrState.buyPrice) / effectiveListPrice 
      : 0

    return {
      cashNeeded,
      dealGap,
      annualProfit: annualCashFlow,
      capRate,
      cocReturn,
      monthlyPayment,
      loanAmount,
      equityCreated,
      grossMonthlyIncome,
      totalMonthlyExpenses,
    } as LTRDealMakerMetrics
  }, [state, listPrice, isSavedPropertyMode, hasRecord, dealMakerStore.record, strategyType])

  // Update state - use store for saved properties, local state for unsaved
  const updateState = useCallback((key: string, value: number) => {
    if (isSavedPropertyMode && hasRecord) {
      // Map local field names to store field names (includes both LTR and STR fields)
      const fieldMap: Record<string, string> = {
        // Shared fields
        buyPrice: 'buy_price',
        downPaymentPercent: 'down_payment_pct',
        closingCostsPercent: 'closing_costs_pct',
        interestRate: 'interest_rate',
        loanTermYears: 'loan_term_years',
        rehabBudget: 'rehab_budget',
        arv: 'arv',
        maintenanceRate: 'maintenance_pct',
        annualPropertyTax: 'annual_property_tax',
        annualInsurance: 'annual_insurance',
        monthlyHoa: 'monthly_hoa',
        // LTR-specific
        monthlyRent: 'monthly_rent',
        otherIncome: 'other_income',
        vacancyRate: 'vacancy_rate',
        managementRate: 'management_pct',
        // STR-specific
        furnitureSetupCost: 'furniture_setup_cost',
        averageDailyRate: 'average_daily_rate',
        occupancyRate: 'occupancy_rate',
        cleaningFeeRevenue: 'cleaning_fee_revenue',
        avgLengthOfStayDays: 'avg_length_of_stay_days',
        platformFeeRate: 'platform_fee_rate',
        strManagementRate: 'str_management_rate',
        cleaningCostPerTurnover: 'cleaning_cost_per_turnover',
        suppliesMonthly: 'supplies_monthly',
        additionalUtilitiesMonthly: 'additional_utilities_monthly',
      }
      
      const storeField = fieldMap[key]
      if (storeField) {
        dealMakerStore.updateField(storeField as keyof typeof dealMakerStore.pendingUpdates, value)
      }
    } else {
      // Local state for unsaved properties - update the appropriate state based on strategy
      if (strategyType === 'str') {
        setLocalSTRState(prev => ({ ...prev, [key]: value }))
      } else {
        setLocalLTRState(prev => ({ ...prev, [key]: value }))
      }
    }
  }, [isSavedPropertyMode, hasRecord, dealMakerStore, strategyType])

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
      // Final step - view verdict
      router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`)
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

  // Key metrics for header - varies by strategy
  const headerMetrics = useMemo(() => {
    if (strategyType === 'str' && 'revPAR' in metrics) {
      const strMetrics = metrics as STRMetrics
      return [
        { label: 'Buy Price', value: formatPrice(state.buyPrice), color: 'white' },
        { label: 'Cash Needed', value: formatPrice(strMetrics.cashNeeded), color: 'white' },
        { label: 'RevPAR', value: formatPrice(strMetrics.revPAR), color: 'cyan' },
        { label: 'Annual Profit', value: formatPrice(strMetrics.annualCashFlow), color: strMetrics.annualCashFlow >= 0 ? 'teal' : 'rose' },
        { label: 'CAP Rate', value: `${strMetrics.capRate.toFixed(1)}%`, color: 'white' },
        { label: 'COC Return', value: `${strMetrics.cocReturn.toFixed(1)}%`, color: strMetrics.cocReturn >= 0 ? 'white' : 'rose' },
      ]
    }
    
    // LTR metrics
    const ltrMetrics = metrics as LTRDealMakerMetrics
    return [
      { label: 'Buy Price', value: formatPrice(state.buyPrice), color: 'white' },
      { label: 'Cash Needed', value: formatPrice(ltrMetrics.cashNeeded), color: 'white' },
      { label: 'Deal Gap', value: `${ltrMetrics.dealGap >= 0 ? '+' : ''}${formatPercent(ltrMetrics.dealGap)}`, color: 'cyan' },
      { label: 'Annual Profit', value: formatPrice(ltrMetrics.annualProfit), color: ltrMetrics.annualProfit >= 0 ? 'teal' : 'rose' },
      { label: 'CAP Rate', value: `${ltrMetrics.capRate.toFixed(1)}%`, color: 'white' },
      { label: 'COC Return', value: `${ltrMetrics.cocReturn.toFixed(1)}%`, color: ltrMetrics.cocReturn >= 0 ? 'white' : 'rose' },
    ]
  }, [strategyType, metrics, state.buyPrice])

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
        savedPropertyId={savedPropertyId}
      />

      {/* Key Metrics Row */}
      <div className="bg-[#0A1628] px-4 pb-4 -mt-1">
        {/* Live calculation indicator */}
        {isCalculating && (
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
                className={`text-[13px] font-semibold tabular-nums ${isCalculating ? 'opacity-60' : ''}`}
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
                    {/* STR-specific: Furniture & Setup */}
                    {strategyType === 'str' && isSTRState(state) && (
                      <SliderInput
                        label="Furniture & Setup"
                        value={state.furnitureSetupCost}
                        displayValue={formatPrice(state.furnitureSetupCost)}
                        min={0}
                        max={30000}
                        minLabel="$0"
                        maxLabel="$30,000"
                        onChange={(v) => updateState('furnitureSetupCost', v)}
                      />
                    )}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">EQUITY CAPTURE</div>
                      <div className="text-2xl font-bold text-[#0A1628] tabular-nums">
                        {formatPrice('equityCreated' in metrics ? metrics.equityCreated : 0)}
                      </div>
                    </div>
                  </>
                )}

                {/* Income Section */}
                {section.id === 'income' && (
                  <>
                    {strategyType === 'str' && isSTRState(state) ? (
                      // STR Income fields
                      <>
                        <SliderInput
                          label="Average Daily Rate (ADR)"
                          value={state.averageDailyRate}
                          displayValue={formatPrice(state.averageDailyRate)}
                          min={50}
                          max={1000}
                          minLabel="$50"
                          maxLabel="$1,000"
                          onChange={(v) => updateState('averageDailyRate', v)}
                        />
                        <SliderInput
                          label="Occupancy Rate"
                          value={state.occupancyRate * 100}
                          displayValue={`${(state.occupancyRate * 100).toFixed(0)}%`}
                          min={30}
                          max={95}
                          minLabel="30%"
                          maxLabel="95%"
                          onChange={(v) => updateState('occupancyRate', v / 100)}
                        />
                        <SliderInput
                          label="Cleaning Fee (Revenue)"
                          value={state.cleaningFeeRevenue}
                          displayValue={formatPrice(state.cleaningFeeRevenue)}
                          min={0}
                          max={300}
                          minLabel="$0"
                          maxLabel="$300"
                          onChange={(v) => updateState('cleaningFeeRevenue', v)}
                        />
                        <SliderInput
                          label="Avg Length of Stay"
                          value={state.avgLengthOfStayDays}
                          displayValue={`${state.avgLengthOfStayDays} days`}
                          min={1}
                          max={30}
                          minLabel="1 day"
                          maxLabel="30 days"
                          onChange={(v) => updateState('avgLengthOfStayDays', Math.round(v))}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">ANNUAL GROSS REVENUE</div>
                          <div className="text-2xl font-bold text-[#0A1628] tabular-nums">
                            {formatPrice('annualGrossRevenue' in metrics ? (metrics as STRMetrics).annualGrossRevenue : 0)}
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR Income fields
                      <>
                        <SliderInput
                          label="Monthly Rent"
                          value={'monthlyRent' in state ? state.monthlyRent : 0}
                          displayValue={formatPrice('monthlyRent' in state ? state.monthlyRent : 0)}
                          min={500}
                          max={10000}
                          minLabel="$500"
                          maxLabel="$10,000"
                          onChange={(v) => updateState('monthlyRent', v)}
                        />
                        <SliderInput
                          label="Vacancy Rate"
                          value={('vacancyRate' in state ? state.vacancyRate : 0) * 100}
                          displayValue={`${(('vacancyRate' in state ? state.vacancyRate : 0) * 100).toFixed(0)}%`}
                          min={0}
                          max={20}
                          minLabel="0%"
                          maxLabel="20%"
                          onChange={(v) => updateState('vacancyRate', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">ANNUAL INCOME</div>
                          <div className="text-2xl font-bold text-[#0A1628] tabular-nums">
                            {formatPrice('grossMonthlyIncome' in metrics 
                              ? (metrics as LTRDealMakerMetrics).grossMonthlyIncome * 12 * (1 - ('vacancyRate' in state ? state.vacancyRate : 0))
                              : 0)}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Expenses Section */}
                {section.id === 'expenses' && (
                  <>
                    {strategyType === 'str' && isSTRState(state) ? (
                      // STR Expenses fields
                      <>
                        <SliderInput
                          label="Platform Fees (Airbnb/VRBO)"
                          value={state.platformFeeRate * 100}
                          displayValue={`${(state.platformFeeRate * 100).toFixed(0)}%`}
                          min={10}
                          max={20}
                          minLabel="10%"
                          maxLabel="20%"
                          onChange={(v) => updateState('platformFeeRate', v / 100)}
                        />
                        <SliderInput
                          label="STR Management"
                          value={state.strManagementRate * 100}
                          displayValue={`${(state.strManagementRate * 100).toFixed(0)}%`}
                          min={0}
                          max={25}
                          minLabel="0%"
                          maxLabel="25%"
                          onChange={(v) => updateState('strManagementRate', v / 100)}
                        />
                        <SliderInput
                          label="Cleaning Cost (per turnover)"
                          value={state.cleaningCostPerTurnover}
                          displayValue={formatPrice(state.cleaningCostPerTurnover)}
                          min={50}
                          max={400}
                          minLabel="$50"
                          maxLabel="$400"
                          onChange={(v) => updateState('cleaningCostPerTurnover', v)}
                        />
                        <SliderInput
                          label="Supplies & Consumables"
                          value={state.suppliesMonthly}
                          displayValue={`${formatPrice(state.suppliesMonthly)}/mo`}
                          min={0}
                          max={500}
                          minLabel="$0"
                          maxLabel="$500"
                          onChange={(v) => updateState('suppliesMonthly', v)}
                        />
                        <SliderInput
                          label="Additional Utilities"
                          value={state.additionalUtilitiesMonthly}
                          displayValue={`${formatPrice(state.additionalUtilitiesMonthly)}/mo`}
                          min={0}
                          max={500}
                          minLabel="$0"
                          maxLabel="$500"
                          onChange={(v) => updateState('additionalUtilitiesMonthly', v)}
                        />
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
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">TOTAL EXPENSES</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('totalAnnualExpenses' in metrics ? (metrics as STRMetrics).totalAnnualExpenses : 0)}/yr
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">BREAK-EVEN OCC.</div>
                            <div className="text-base font-bold text-[#0891B2] tabular-nums">
                              {formatPercent('breakEvenOccupancy' in metrics ? (metrics as STRMetrics).breakEvenOccupancy : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR Expenses fields
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
                          value={('managementRate' in state ? state.managementRate : 0) * 100}
                          displayValue={`${(('managementRate' in state ? state.managementRate : 0) * 100).toFixed(0)}%`}
                          min={0}
                          max={15}
                          minLabel="0%"
                          maxLabel="15%"
                          onChange={(v) => updateState('managementRate', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">TOTAL EXPENSES</div>
                          <div className="text-2xl font-bold text-[#0A1628] tabular-nums">
                            {formatPrice('totalMonthlyExpenses' in metrics ? (metrics as LTRDealMakerMetrics).totalMonthlyExpenses * 12 : 0)}/yr
                          </div>
                        </div>
                      </>
                    )}
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
