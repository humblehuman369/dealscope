'use client'

/**
 * DealMakerPopup Component
 * 
 * Slide-up popup modal for adjusting investment terms.
 * Contains sliders for all DealMaker parameters organized by section.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { X, RotateCcw, Check, Info } from 'lucide-react'
import { SliderInput } from './SliderInput'

// Strategy type - matches VerdictIQ header options
export type PopupStrategyType = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'

// Strategy display labels
export const STRATEGY_LABELS: Record<PopupStrategyType, string> = {
  ltr: 'LTR',
  str: 'STR',
  brrrr: 'BRRRR',
  flip: 'Flip',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
}

export interface DealMakerValues {
  // Common fields (all strategies)
  buyPrice: number
  downPayment: number
  closingCosts: number
  interestRate: number
  loanTerm: number
  rehabBudget: number
  arv: number
  propertyTaxes: number
  insurance: number
  
  // LTR-specific fields
  monthlyRent: number
  vacancyRate: number
  managementRate: number
  
  // STR-specific fields
  averageDailyRate: number
  occupancyRate: number
  cleaningFeeRevenue: number
  avgLengthOfStayDays: number
  platformFeeRate: number
  strManagementRate: number
  cleaningCostPerTurnover: number
  suppliesMonthly: number
  additionalUtilitiesMonthly: number
  furnitureSetupCost: number
  
  // BRRRR-specific fields
  buyDiscountPct: number
  hardMoneyRate: number
  holdingPeriodMonths: number
  holdingCostsMonthly: number
  postRehabMonthlyRent: number
  refinanceLtv: number
  refinanceInterestRate: number
  refinanceTermYears: number
  refinanceClosingCostsPct: number
  contingencyPct: number
  maintenanceRate: number
  monthlyHoa: number
  
  // Fix & Flip-specific fields
  financingType: 'cash' | 'hardMoney'
  hardMoneyLtv: number
  loanPoints: number
  rehabTimeMonths: number
  daysOnMarket: number
  sellingCostsPct: number
  capitalGainsRate: number
  
  // House Hack-specific fields
  totalUnits: number
  ownerOccupiedUnits: number
  ownerUnitMarketRent: number
  loanType: 'fha' | 'conventional' | 'va'
  pmiRate: number
  avgRentPerUnit: number
  currentHousingPayment: number
  utilitiesMonthly: number
  capexRate: number
  
  // Wholesale-specific fields
  estimatedRepairs: number
  squareFootage: number
  contractPrice: number
  earnestMoney: number
  inspectionPeriodDays: number
  daysToClose: number
  assignmentFee: number
  marketingCosts: number
  wholesaleClosingCosts: number
}

// Tab identifiers for scrolling to sections
export type DealMakerTab = 'buy-price' | 'financing' | 'income' | 'expenses' | 'rehab'

interface DealMakerPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (values: DealMakerValues) => void
  initialValues?: Partial<DealMakerValues>
  strategyType?: PopupStrategyType
  onStrategyChange?: (strategy: PopupStrategyType) => void
  initialTab?: DealMakerTab
}

// Base default values shared across all strategies
const BASE_DEFAULTS: DealMakerValues = {
  // Common fields
  buyPrice: 350000,
  downPayment: 20,
  closingCosts: 3,
  interestRate: 6,
  loanTerm: 30,
  rehabBudget: 0,
  arv: 350000,
  propertyTaxes: 4200,
  insurance: 1800,
  // LTR
  monthlyRent: 2800,
  vacancyRate: 5,
  managementRate: 8,
  // STR
  averageDailyRate: 200,
  occupancyRate: 65,
  cleaningFeeRevenue: 150,
  avgLengthOfStayDays: 3,
  platformFeeRate: 15,
  strManagementRate: 20,
  cleaningCostPerTurnover: 100,
  suppliesMonthly: 150,
  additionalUtilitiesMonthly: 200,
  furnitureSetupCost: 6000,
  // BRRRR
  buyDiscountPct: 15,
  hardMoneyRate: 12,
  holdingPeriodMonths: 6,
  holdingCostsMonthly: 1500,
  postRehabMonthlyRent: 2800,
  refinanceLtv: 75,
  refinanceInterestRate: 6.5,
  refinanceTermYears: 30,
  refinanceClosingCostsPct: 2,
  contingencyPct: 10,
  maintenanceRate: 5,
  monthlyHoa: 0,
  // Fix & Flip
  financingType: 'hardMoney',
  hardMoneyLtv: 90,
  loanPoints: 2,
  rehabTimeMonths: 4,
  daysOnMarket: 45,
  sellingCostsPct: 8,
  capitalGainsRate: 25,
  // House Hack
  totalUnits: 4,
  ownerOccupiedUnits: 1,
  ownerUnitMarketRent: 1500,
  loanType: 'fha',
  pmiRate: 0.85,
  avgRentPerUnit: 1500,
  currentHousingPayment: 2000,
  utilitiesMonthly: 200,
  capexRate: 5,
  // Wholesale
  estimatedRepairs: 40000,
  squareFootage: 1500,
  contractPrice: 170000,
  earnestMoney: 1000,
  inspectionPeriodDays: 14,
  daysToClose: 45,
  assignmentFee: 15000,
  marketingCosts: 500,
  wholesaleClosingCosts: 500,
}

// Default values for LTR strategy
const DEFAULT_LTR_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  vacancyRate: 5,
  managementRate: 0,
}

// Default values for STR strategy
const DEFAULT_STR_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  insurance: 2400, // Higher for STR
}

// Default values for BRRRR strategy
const DEFAULT_BRRRR_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  downPayment: 20, // Hard money typically 10-30%
  buyDiscountPct: 15,
  hardMoneyRate: 12,
  holdingPeriodMonths: 6,
  holdingCostsMonthly: 1500,
  postRehabMonthlyRent: 2800,
  refinanceLtv: 75,
  refinanceInterestRate: 6.5,
  refinanceTermYears: 30,
  refinanceClosingCostsPct: 2,
  contingencyPct: 10,
}

// Default values for Fix & Flip strategy
const DEFAULT_FLIP_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  financingType: 'hardMoney',
  hardMoneyLtv: 90,
  hardMoneyRate: 12,
  loanPoints: 2,
  rehabTimeMonths: 4,
  daysOnMarket: 45,
  sellingCostsPct: 8,
  capitalGainsRate: 25,
  contingencyPct: 10,
}

// Default values for House Hack strategy
const DEFAULT_HOUSEHACK_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  buyPrice: 400000,
  totalUnits: 4,
  ownerOccupiedUnits: 1,
  ownerUnitMarketRent: 1500,
  loanType: 'fha',
  downPayment: 3.5, // FHA minimum
  pmiRate: 0.85,
  avgRentPerUnit: 1500,
  currentHousingPayment: 2000,
  utilitiesMonthly: 200,
  capexRate: 5,
}

// Default values for Wholesale strategy
const DEFAULT_WHOLESALE_VALUES: DealMakerValues = {
  ...BASE_DEFAULTS,
  arv: 300000,
  estimatedRepairs: 40000,
  squareFootage: 1500,
  contractPrice: 170000,
  earnestMoney: 1000,
  inspectionPeriodDays: 14,
  daysToClose: 45,
  assignmentFee: 15000,
  marketingCosts: 500,
  wholesaleClosingCosts: 500,
}

// Get defaults based on strategy
function getDefaultValues(strategy: PopupStrategyType): DealMakerValues {
  switch (strategy) {
    case 'str': return DEFAULT_STR_VALUES
    case 'brrrr': return DEFAULT_BRRRR_VALUES
    case 'flip': return DEFAULT_FLIP_VALUES
    case 'house_hack': return DEFAULT_HOUSEHACK_VALUES
    case 'wholesale': return DEFAULT_WHOLESALE_VALUES
    default: return DEFAULT_LTR_VALUES
  }
}

// Calculate monthly mortgage payment
function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
}

// Section divider component
function SectionDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center my-6">
      <div className="flex-1 h-px bg-[#E2E8F0]" />
      <span className="px-3 text-[11px] font-bold text-[#0891B2] uppercase tracking-wide">
        {text}
      </span>
      <div className="flex-1 h-px bg-[#E2E8F0]" />
    </div>
  )
}

// Calculated field display
function CalculatedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3.5 px-4 bg-[#F8FAFC] rounded-xl mb-5 border border-[#E2E8F0]">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-base font-bold text-[#0891B2]">{value}</span>
    </div>
  )
}

export function DealMakerPopup({
  isOpen,
  onClose,
  onApply,
  initialValues = {},
  strategyType = 'ltr',
  onStrategyChange,
  initialTab,
}: DealMakerPopupProps) {
  // Get defaults based on strategy
  const defaults = useMemo(() => getDefaultValues(strategyType), [strategyType])
  
  // Merge initial values with defaults
  const [values, setValues] = useState<DealMakerValues>({
    ...defaults,
    ...initialValues,
  })

  // Refs for scrolling to sections
  const contentRef = React.useRef<HTMLDivElement>(null)
  const purchaseTermsRef = React.useRef<HTMLDivElement>(null)
  const financingRef = React.useRef<HTMLDivElement>(null)
  const incomeRef = React.useRef<HTMLDivElement>(null)
  const expensesRef = React.useRef<HTMLDivElement>(null)
  const rehabRef = React.useRef<HTMLDivElement>(null)

  // Reset to initial values when popup opens or strategy changes
  useEffect(() => {
    if (isOpen) {
      setValues({
        ...defaults,
        ...initialValues,
      })
    }
  }, [isOpen, initialValues, defaults])

  // Scroll to initial tab when popup opens
  useEffect(() => {
    if (isOpen && initialTab && contentRef.current) {
      const scrollToRef = () => {
        let targetRef: React.RefObject<HTMLDivElement> | null = null
        switch (initialTab) {
          case 'buy-price':
            targetRef = purchaseTermsRef
            break
          case 'financing':
            targetRef = financingRef
            break
          case 'income':
            targetRef = incomeRef
            break
          case 'expenses':
            targetRef = expensesRef
            break
          case 'rehab':
            targetRef = rehabRef
            break
        }
        if (targetRef?.current && contentRef.current) {
          // Small delay to ensure content is rendered
          setTimeout(() => {
            targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }
      }
      scrollToRef()
    }
  }, [isOpen, initialTab])

  // Calculate derived values
  const loanAmount = values.buyPrice * (1 - values.downPayment / 100)
  
  // STR-specific calculations
  const strCalculations = useMemo(() => {
    if (strategyType !== 'str') return null
    
    const nightsOccupied = Math.round(365 * (values.occupancyRate / 100))
    const turnovers = values.avgLengthOfStayDays > 0 
      ? Math.round(nightsOccupied / values.avgLengthOfStayDays) 
      : 0
    const rentalRevenue = values.averageDailyRate * nightsOccupied
    const cleaningRevenue = values.cleaningFeeRevenue * turnovers
    const annualGrossRevenue = rentalRevenue + cleaningRevenue
    const monthlyGrossRevenue = annualGrossRevenue / 12
    
    // Calculate break-even occupancy
    // Fixed monthly costs
    const monthlyMortgage = calculateMonthlyMortgage(
      values.buyPrice * (1 - values.downPayment / 100),
      values.interestRate / 100,
      values.loanTerm
    )
    const monthlyTaxes = values.propertyTaxes / 12
    const monthlyInsurance = values.insurance / 12
    const fixedMonthlyCosts = monthlyMortgage + monthlyTaxes + monthlyInsurance + values.suppliesMonthly + values.additionalUtilitiesMonthly
    
    // Variable costs per night
    const platformFeePerNight = values.averageDailyRate * (values.platformFeeRate / 100)
    const managementPerNight = values.averageDailyRate * (values.strManagementRate / 100)
    const cleaningCostPerNight = values.avgLengthOfStayDays > 0 
      ? values.cleaningCostPerTurnover / values.avgLengthOfStayDays 
      : 0
    const variableCostPerNight = platformFeePerNight + managementPerNight + cleaningCostPerNight
    
    // Net revenue per night
    const revenuePerNight = values.averageDailyRate + (values.avgLengthOfStayDays > 0 ? values.cleaningFeeRevenue / values.avgLengthOfStayDays : 0)
    const netRevenuePerNight = revenuePerNight - variableCostPerNight
    
    // Break-even nights per month
    const breakEvenNightsPerMonth = netRevenuePerNight > 0 
      ? fixedMonthlyCosts / netRevenuePerNight 
      : 999
    const breakEvenOccupancy = Math.min(100, Math.round((breakEvenNightsPerMonth / 30.4) * 100))
    
    return {
      nightsOccupied,
      turnovers,
      annualGrossRevenue,
      monthlyGrossRevenue,
      breakEvenOccupancy,
    }
  }, [strategyType, values])

  // BRRRR-specific calculations
  const brrrrCalculations = useMemo(() => {
    if (strategyType !== 'brrrr') return null
    
    // Total acquisition cost
    const totalRehabCost = values.rehabBudget * (1 + values.contingencyPct / 100)
    const holdingCosts = values.holdingCostsMonthly * values.holdingPeriodMonths
    const acquisitionCost = values.buyPrice + values.closingCosts / 100 * values.buyPrice
    const totalInvestment = acquisitionCost + totalRehabCost + holdingCosts
    
    // Refinance
    const refinanceLoanAmount = values.arv * (values.refinanceLtv / 100)
    const refinanceClosingCosts = refinanceLoanAmount * (values.refinanceClosingCostsPct / 100)
    const cashOutAtRefi = refinanceLoanAmount - refinanceClosingCosts
    const moneyLeftInDeal = Math.max(0, totalInvestment - cashOutAtRefi)
    
    return {
      totalInvestment,
      cashOutAtRefi,
      moneyLeftInDeal,
    }
  }, [strategyType, values])

  // Fix & Flip-specific calculations
  const flipCalculations = useMemo(() => {
    if (strategyType !== 'flip') return null
    
    // Costs
    const totalRehabCost = values.rehabBudget * (1 + values.contingencyPct / 100)
    const acquisitionCost = values.buyPrice * (1 + values.closingCosts / 100)
    const holdingMonths = values.rehabTimeMonths + (values.daysOnMarket / 30)
    const holdingCosts = values.holdingCostsMonthly * holdingMonths
    
    // Financing costs (if hard money)
    let financingCosts = 0
    if (values.financingType === 'hardMoney') {
      const loanAmount = values.buyPrice * (values.hardMoneyLtv / 100)
      const points = loanAmount * (values.loanPoints / 100)
      const interest = loanAmount * (values.hardMoneyRate / 100 / 12) * holdingMonths
      financingCosts = points + interest
    }
    
    const totalCost = acquisitionCost + totalRehabCost + holdingCosts + financingCosts
    
    // Sale
    const salePrice = values.arv
    const sellingCosts = salePrice * (values.sellingCostsPct / 100)
    const grossProfit = salePrice - sellingCosts - totalCost
    const taxes = grossProfit > 0 ? grossProfit * (values.capitalGainsRate / 100) : 0
    const netProfit = grossProfit - taxes
    
    // 70% Rule
    const maxAllowableOffer = values.arv * 0.70 - values.rehabBudget
    const meets70PercentRule = values.buyPrice <= maxAllowableOffer
    
    // ROI
    const cashInvested = values.financingType === 'cash' 
      ? totalCost 
      : acquisitionCost * (1 - values.hardMoneyLtv / 100) + totalRehabCost + holdingCosts + financingCosts
    const roi = cashInvested > 0 ? (netProfit / cashInvested) * 100 : 0
    
    return {
      totalCost,
      netProfit,
      roi,
      meets70PercentRule,
    }
  }, [strategyType, values])

  // House Hack-specific calculations
  const houseHackCalculations = useMemo(() => {
    if (strategyType !== 'house_hack') return null
    
    // Calculate PITI
    const loanAmount = values.buyPrice * (1 - values.downPayment / 100)
    const monthlyMortgage = calculateMonthlyMortgage(loanAmount, values.interestRate / 100, values.loanTerm)
    const monthlyTaxes = values.propertyTaxes / 12
    const monthlyInsurance = values.insurance / 12
    const monthlyPMI = loanAmount * (values.pmiRate / 100) / 12
    const monthlyPITI = monthlyMortgage + monthlyTaxes + monthlyInsurance + monthlyPMI
    
    // Rental income from rented units only
    const rentedUnits = values.totalUnits - values.ownerOccupiedUnits
    const grossRentalIncome = values.avgRentPerUnit * rentedUnits
    const effectiveRentalIncome = grossRentalIncome * (1 - values.vacancyRate / 100)
    
    // Operating expenses
    const operatingExpenses = values.utilitiesMonthly
    
    // Net rental income
    const netRentalIncome = effectiveRentalIncome - operatingExpenses
    
    // Effective housing cost
    const effectiveHousingCost = monthlyPITI - netRentalIncome
    const livesForFree = effectiveHousingCost <= 0
    
    // Housing offset percentage
    const housingOffsetPercent = monthlyPITI > 0 
      ? (netRentalIncome / monthlyPITI) * 100 
      : 0
    
    // Savings vs current housing
    const housingCostSavings = values.currentHousingPayment - effectiveHousingCost
    
    return {
      monthlyPITI,
      effectiveHousingCost,
      livesForFree,
      housingOffsetPercent,
      housingCostSavings,
    }
  }, [strategyType, values])

  // Wholesale-specific calculations
  const wholesaleCalculations = useMemo(() => {
    if (strategyType !== 'wholesale') return null
    
    // 70% Rule MAO
    const maxAllowableOffer = values.arv * 0.70 - values.estimatedRepairs
    const meets70PercentRule = values.contractPrice <= maxAllowableOffer
    
    // End buyer analysis
    const endBuyerPrice = values.contractPrice + values.assignmentFee
    const endBuyerAllIn = endBuyerPrice + values.estimatedRepairs + (endBuyerPrice * 0.03)
    const buyerSellingCosts = values.arv * 0.08
    const endBuyerProfit = values.arv - buyerSellingCosts - endBuyerAllIn
    
    // Your profit
    const totalCashAtRisk = values.earnestMoney + values.marketingCosts + values.wholesaleClosingCosts
    const netProfit = values.assignmentFee - values.marketingCosts - values.wholesaleClosingCosts
    const roi = totalCashAtRisk > 0 ? (netProfit / totalCashAtRisk) * 100 : 0
    
    return {
      maxAllowableOffer,
      meets70PercentRule,
      endBuyerProfit,
      netProfit,
      roi,
    }
  }, [strategyType, values])

  // Handle value change (accepts number or string for special fields like financingType, loanType)
  const handleChange = useCallback((field: keyof DealMakerValues, value: number | string) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  // Handle apply
  const handleApply = useCallback(() => {
    onApply(values)
    onClose()
  }, [values, onApply, onClose])

  // Handle reset
  const handleReset = useCallback(() => {
    setValues({
      ...defaults,
      ...initialValues,
    })
  }, [initialValues, defaults])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center animate-fadeIn"
      style={{ 
        background: 'rgba(10, 22, 40, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="w-full max-w-[480px] max-h-[90vh] bg-white rounded-t-[20px] flex flex-col animate-slideUp"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 pb-2">
          <div className="w-12 h-1 bg-[#E2E8F0] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
            >
              <svg width="20" height="20" fill="none" stroke="#00D4FF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">
                <span className="text-[#0A1628]">Deal Maker</span>
                <span className="text-[#0891B2]">IQ</span>
              </h2>
              {/* Strategy Toggle */}
              <div className="flex flex-wrap items-center gap-0.5 mt-1">
                {(['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale'] as PopupStrategyType[]).map((s, idx, arr) => (
                  <button
                    key={s}
                    onClick={() => onStrategyChange?.(s)}
                    className={`px-2 py-1 text-[10px] font-semibold transition-colors ${
                      idx === 0 ? 'rounded-l-md' : ''
                    } ${idx === arr.length - 1 ? 'rounded-r-md' : ''} ${
                      strategyType === s
                        ? 'bg-[#0891B2] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {STRATEGY_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-[#F1F5F9] rounded-xl text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0A1628] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="flex items-start gap-2.5 px-5 py-3.5 bg-[#F0FDFA] border-b border-[#E2E8F0] flex-shrink-0">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-[#0891B2]" />
          </div>
          <p className="text-[13px] text-[#0E7490] leading-relaxed">
            Adjust the sliders or tap values to edit. Changes will recalculate your deal analytics in real-time.
          </p>
        </div>

        {/* Scrollable Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 pb-5 overscroll-contain scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          
          {/* ============================================================== */}
          {/* LTR / STR SECTIONS */}
          {/* ============================================================== */}
          {(strategyType === 'ltr' || strategyType === 'str') && (
            <>
              {/* Purchase Terms Section */}
              <div ref={purchaseTermsRef}>
                <SectionDivider text="Purchase Terms" />
              </div>
              
              <SliderInput
                label="Buy Price"
                value={values.buyPrice}
                min={50000}
                max={2000000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('buyPrice', val)}
              />
              
              <SliderInput
                label="Down Payment"
                value={values.downPayment}
                min={5}
                max={50}
                step={0.5}
                format="percent"
                onChange={(val) => handleChange('downPayment', val)}
              />
              
              <SliderInput
                label="Closing Costs"
                value={values.closingCosts}
                min={2}
                max={5}
                step={0.25}
                format="percent"
                onChange={(val) => handleChange('closingCosts', val)}
              />

              {/* Financing Section */}
              <div ref={financingRef}>
                <SectionDivider text="Financing" />
              </div>
              
              <CalculatedField 
                label="Loan Amount" 
                value={`$${loanAmount.toLocaleString()}`} 
              />
              
              <SliderInput
                label="Interest Rate"
                value={values.interestRate}
                min={5}
                max={12}
                step={0.125}
                format="percent"
                onChange={(val) => handleChange('interestRate', val)}
              />
              
              <SliderInput
                label="Loan Term"
                value={values.loanTerm}
                min={10}
                max={30}
                step={5}
                format="years"
                onChange={(val) => handleChange('loanTerm', val)}
              />

              {/* Rehab & Value Section */}
              <div ref={rehabRef}>
                <SectionDivider text="Rehab & Value" />
              </div>
              
              <SliderInput
                label="Rehab Budget"
                value={values.rehabBudget}
                min={0}
                max={100000}
                step={1000}
                format="currency"
                onChange={(val) => handleChange('rehabBudget', val)}
              />
              
              <SliderInput
                label="ARV"
                sublabel="After Repair Value"
                value={values.arv}
                min={values.buyPrice}
                max={Math.max(700000, values.buyPrice * 1.5)}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('arv', val)}
              />
              
              {/* Furniture & Setup - STR only */}
              {strategyType === 'str' && (
                <SliderInput
                  label="Furniture & Setup"
                  sublabel="STR furnishing costs"
                  value={values.furnitureSetupCost}
                  min={0}
                  max={30000}
                  step={1000}
                  format="currency"
                  onChange={(val) => handleChange('furnitureSetupCost', val)}
                />
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* BRRRR SECTIONS */}
          {/* ============================================================== */}
          {strategyType === 'brrrr' && (
            <>
              {/* Phase 1: Buy */}
              <SectionDivider text="Phase 1: Buy" />
              
              <SliderInput
                label="Purchase Price"
                value={values.buyPrice}
                min={50000}
                max={2000000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('buyPrice', val)}
              />
              
              <SliderInput
                label="Buy Discount"
                sublabel="Below market value"
                value={values.buyDiscountPct}
                min={0}
                max={30}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('buyDiscountPct', val)}
              />
              
              <SliderInput
                label="Hard Money Rate"
                value={values.hardMoneyRate}
                min={8}
                max={15}
                step={0.5}
                format="percent"
                onChange={(val) => handleChange('hardMoneyRate', val)}
              />
              
              <SliderInput
                label="Down Payment"
                sublabel="Hard money LTV"
                value={values.downPayment}
                min={10}
                max={30}
                step={5}
                format="percent-int"
                onChange={(val) => handleChange('downPayment', val)}
              />

              {/* Phase 2: Rehab */}
              <SectionDivider text="Phase 2: Rehab" />
              
              <SliderInput
                label="Rehab Budget"
                value={values.rehabBudget}
                min={0}
                max={200000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('rehabBudget', val)}
              />
              
              <SliderInput
                label="Contingency"
                value={values.contingencyPct}
                min={0}
                max={25}
                step={5}
                format="percent-int"
                onChange={(val) => handleChange('contingencyPct', val)}
              />
              
              <SliderInput
                label="Holding Period"
                value={values.holdingPeriodMonths}
                min={2}
                max={12}
                step={1}
                format="currency-month"
                onChange={(val) => handleChange('holdingPeriodMonths', val)}
              />
              
              <SliderInput
                label="ARV"
                sublabel="After Repair Value"
                value={values.arv}
                min={values.buyPrice}
                max={Math.max(1000000, values.buyPrice * 1.5)}
                step={10000}
                format="currency"
                onChange={(val) => handleChange('arv', val)}
              />

              {/* Phase 3: Rent */}
              <SectionDivider text="Phase 3: Rent" />
              
              <SliderInput
                label="Post-Rehab Rent"
                value={values.postRehabMonthlyRent}
                min={500}
                max={10000}
                step={50}
                format="currency"
                onChange={(val) => handleChange('postRehabMonthlyRent', val)}
              />
              
              <SliderInput
                label="Vacancy Rate"
                value={values.vacancyRate}
                min={0}
                max={15}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('vacancyRate', val)}
              />
              
              <SliderInput
                label="Management Rate"
                value={values.managementRate}
                min={0}
                max={12}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('managementRate', val)}
              />

              {/* Phase 4: Refinance */}
              <SectionDivider text="Phase 4: Refinance" />
              
              <SliderInput
                label="Refinance LTV"
                value={values.refinanceLtv}
                min={65}
                max={80}
                step={5}
                format="percent-int"
                onChange={(val) => handleChange('refinanceLtv', val)}
              />
              
              <SliderInput
                label="Refinance Rate"
                value={values.refinanceInterestRate}
                min={4}
                max={10}
                step={0.125}
                format="percent"
                onChange={(val) => handleChange('refinanceInterestRate', val)}
              />
              
              <SliderInput
                label="Loan Term"
                value={values.refinanceTermYears}
                min={15}
                max={30}
                step={5}
                format="years"
                onChange={(val) => handleChange('refinanceTermYears', val)}
              />
              
              {brrrrCalculations && (
                <>
                  <CalculatedField 
                    label="Cash Out at Refi" 
                    value={`$${brrrrCalculations.cashOutAtRefi.toLocaleString()}`} 
                  />
                  <CalculatedField 
                    label="Money Left in Deal" 
                    value={`$${brrrrCalculations.moneyLeftInDeal.toLocaleString()}`} 
                  />
                </>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* FIX & FLIP SECTIONS */}
          {/* ============================================================== */}
          {strategyType === 'flip' && (
            <>
              {/* Phase 1: Buy */}
              <SectionDivider text="Phase 1: Buy" />
              
              <SliderInput
                label="Purchase Price"
                value={values.buyPrice}
                min={50000}
                max={2000000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('buyPrice', val)}
              />
              
              <SliderInput
                label="Closing Costs"
                value={values.closingCosts}
                min={2}
                max={5}
                step={0.25}
                format="percent"
                onChange={(val) => handleChange('closingCosts', val)}
              />

              {/* Phase 2: Financing */}
              <SectionDivider text="Phase 2: Financing" />
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleChange('financingType', 'cash')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                    values.financingType === 'cash'
                      ? 'bg-[#0891B2] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => handleChange('financingType', 'hardMoney')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                    values.financingType === 'hardMoney'
                      ? 'bg-[#0891B2] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  Hard Money
                </button>
              </div>
              
              {values.financingType === 'hardMoney' && (
                <>
                  <SliderInput
                    label="Loan-to-Value"
                    value={values.hardMoneyLtv}
                    min={70}
                    max={100}
                    step={5}
                    format="percent-int"
                    onChange={(val) => handleChange('hardMoneyLtv', val)}
                  />
                  
                  <SliderInput
                    label="Interest Rate"
                    value={values.hardMoneyRate}
                    min={8}
                    max={18}
                    step={0.5}
                    format="percent"
                    onChange={(val) => handleChange('hardMoneyRate', val)}
                  />
                  
                  <SliderInput
                    label="Loan Points"
                    value={values.loanPoints}
                    min={0}
                    max={5}
                    step={0.5}
                    format="percent-int"
                    onChange={(val) => handleChange('loanPoints', val)}
                  />
                </>
              )}

              {/* Phase 3: Rehab */}
              <SectionDivider text="Phase 3: Rehab" />
              
              <SliderInput
                label="Rehab Budget"
                value={values.rehabBudget}
                min={0}
                max={200000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('rehabBudget', val)}
              />
              
              <SliderInput
                label="Contingency"
                value={values.contingencyPct}
                min={0}
                max={25}
                step={5}
                format="percent-int"
                onChange={(val) => handleChange('contingencyPct', val)}
              />
              
              <SliderInput
                label="Rehab Timeline"
                value={values.rehabTimeMonths}
                min={1}
                max={12}
                step={1}
                format="currency-month"
                onChange={(val) => handleChange('rehabTimeMonths', val)}
              />
              
              <SliderInput
                label="ARV"
                sublabel="After Repair Value"
                value={values.arv}
                min={values.buyPrice}
                max={Math.max(1000000, values.buyPrice * 1.5)}
                step={10000}
                format="currency"
                onChange={(val) => handleChange('arv', val)}
              />

              {/* Phase 4: Hold & Sell */}
              <SectionDivider text="Phase 4: Hold & Sell" />
              
              <SliderInput
                label="Holding Costs"
                sublabel="Monthly"
                value={values.holdingCostsMonthly}
                min={0}
                max={5000}
                step={100}
                format="currency"
                onChange={(val) => handleChange('holdingCostsMonthly', val)}
              />
              
              <SliderInput
                label="Days on Market"
                value={values.daysOnMarket}
                min={15}
                max={180}
                step={15}
                format="days"
                onChange={(val) => handleChange('daysOnMarket', val)}
              />
              
              <SliderInput
                label="Selling Costs"
                sublabel="Agent + closing"
                value={values.sellingCostsPct}
                min={4}
                max={10}
                step={0.5}
                format="percent"
                onChange={(val) => handleChange('sellingCostsPct', val)}
              />
              
              <SliderInput
                label="Capital Gains Tax"
                value={values.capitalGainsRate}
                min={0}
                max={40}
                step={5}
                format="percent-int"
                onChange={(val) => handleChange('capitalGainsRate', val)}
              />
              
              {flipCalculations && (
                <>
                  <CalculatedField 
                    label="Net Profit" 
                    value={`$${flipCalculations.netProfit.toLocaleString()}`} 
                  />
                  <CalculatedField 
                    label="ROI" 
                    value={`${flipCalculations.roi.toFixed(1)}%`} 
                  />
                  <CalculatedField 
                    label="70% Rule" 
                    value={flipCalculations.meets70PercentRule ? 'PASS' : 'FAIL'} 
                  />
                </>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* HOUSE HACK SECTIONS */}
          {/* ============================================================== */}
          {strategyType === 'house_hack' && (
            <>
              {/* Phase 1: Property */}
              <SectionDivider text="Phase 1: Property" />
              
              <SliderInput
                label="Purchase Price"
                value={values.buyPrice}
                min={100000}
                max={2000000}
                step={10000}
                format="currency"
                onChange={(val) => handleChange('buyPrice', val)}
              />
              
              <SliderInput
                label="Total Units"
                value={values.totalUnits}
                min={2}
                max={8}
                step={1}
                format="currency"
                onChange={(val) => handleChange('totalUnits', val)}
              />
              
              <SliderInput
                label="Owner Units"
                value={values.ownerOccupiedUnits}
                min={1}
                max={2}
                step={1}
                format="currency"
                onChange={(val) => handleChange('ownerOccupiedUnits', val)}
              />

              {/* Phase 2: Financing */}
              <SectionDivider text="Phase 2: Financing" />
              
              <div className="flex gap-2 mb-4">
                {(['fha', 'conventional', 'va'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleChange('loanType', type)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                      values.loanType === type
                        ? 'bg-[#0891B2] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              
              <SliderInput
                label="Down Payment"
                value={values.downPayment}
                min={values.loanType === 'va' ? 0 : values.loanType === 'fha' ? 3.5 : 5}
                max={25}
                step={0.5}
                format="percent"
                onChange={(val) => handleChange('downPayment', val)}
              />
              
              <SliderInput
                label="Interest Rate"
                value={values.interestRate}
                min={4}
                max={10}
                step={0.125}
                format="percent"
                onChange={(val) => handleChange('interestRate', val)}
              />
              
              <SliderInput
                label="PMI/MIP Rate"
                value={values.pmiRate}
                min={0}
                max={1.5}
                step={0.1}
                format="percent"
                onChange={(val) => handleChange('pmiRate', val)}
              />

              {/* Phase 3: Rent */}
              <SectionDivider text="Phase 3: Rent" />
              
              <SliderInput
                label="Avg Rent Per Unit"
                value={values.avgRentPerUnit}
                min={500}
                max={5000}
                step={50}
                format="currency"
                onChange={(val) => handleChange('avgRentPerUnit', val)}
              />
              
              <SliderInput
                label="Vacancy Rate"
                value={values.vacancyRate}
                min={0}
                max={15}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('vacancyRate', val)}
              />
              
              <SliderInput
                label="Current Housing Cost"
                sublabel="What you pay now"
                value={values.currentHousingPayment}
                min={0}
                max={5000}
                step={100}
                format="currency"
                onChange={(val) => handleChange('currentHousingPayment', val)}
              />

              {/* Phase 4: Expenses */}
              <SectionDivider text="Phase 4: Expenses" />
              
              <SliderInput
                label="Property Taxes"
                value={values.propertyTaxes}
                min={0}
                max={30000}
                step={500}
                format="currency-year"
                onChange={(val) => handleChange('propertyTaxes', val)}
              />
              
              <SliderInput
                label="Insurance"
                value={values.insurance}
                min={0}
                max={10000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('insurance', val)}
              />
              
              <SliderInput
                label="Utilities"
                sublabel="Owner paid"
                value={values.utilitiesMonthly}
                min={0}
                max={1000}
                step={25}
                format="currency-month"
                onChange={(val) => handleChange('utilitiesMonthly', val)}
              />
              
              {houseHackCalculations && (
                <>
                  <CalculatedField 
                    label="Effective Housing Cost" 
                    value={houseHackCalculations.livesForFree ? 'FREE!' : `$${houseHackCalculations.effectiveHousingCost.toLocaleString()}/mo`} 
                  />
                  <CalculatedField 
                    label="Housing Offset" 
                    value={`${houseHackCalculations.housingOffsetPercent.toFixed(0)}%`} 
                  />
                </>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* WHOLESALE SECTIONS */}
          {/* ============================================================== */}
          {strategyType === 'wholesale' && (
            <>
              {/* Phase 1: Property Analysis */}
              <SectionDivider text="Phase 1: Property" />
              
              <SliderInput
                label="ARV"
                sublabel="After Repair Value"
                value={values.arv}
                min={50000}
                max={2000000}
                step={10000}
                format="currency"
                onChange={(val) => handleChange('arv', val)}
              />
              
              <SliderInput
                label="Estimated Repairs"
                value={values.estimatedRepairs}
                min={0}
                max={200000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('estimatedRepairs', val)}
              />
              
              {wholesaleCalculations && (
                <CalculatedField 
                  label="70% Rule MAO" 
                  value={`$${wholesaleCalculations.maxAllowableOffer.toLocaleString()}`} 
                />
              )}

              {/* Phase 2: Contract */}
              <SectionDivider text="Phase 2: Contract" />
              
              <SliderInput
                label="Contract Price"
                value={values.contractPrice}
                min={25000}
                max={1500000}
                step={5000}
                format="currency"
                onChange={(val) => handleChange('contractPrice', val)}
              />
              
              <SliderInput
                label="Earnest Money"
                value={values.earnestMoney}
                min={100}
                max={10000}
                step={100}
                format="currency"
                onChange={(val) => handleChange('earnestMoney', val)}
              />
              
              <SliderInput
                label="Inspection Period"
                value={values.inspectionPeriodDays}
                min={7}
                max={30}
                step={1}
                format="days"
                onChange={(val) => handleChange('inspectionPeriodDays', val)}
              />
              
              <SliderInput
                label="Days to Close"
                value={values.daysToClose}
                min={21}
                max={90}
                step={7}
                format="days"
                onChange={(val) => handleChange('daysToClose', val)}
              />
              
              {wholesaleCalculations && (
                <CalculatedField 
                  label="70% Rule" 
                  value={wholesaleCalculations.meets70PercentRule ? 'PASS' : 'FAIL'} 
                />
              )}

              {/* Phase 3: Assignment */}
              <SectionDivider text="Phase 3: Assignment" />
              
              <SliderInput
                label="Assignment Fee"
                value={values.assignmentFee}
                min={5000}
                max={50000}
                step={1000}
                format="currency"
                onChange={(val) => handleChange('assignmentFee', val)}
              />
              
              <SliderInput
                label="Marketing Costs"
                value={values.marketingCosts}
                min={0}
                max={5000}
                step={100}
                format="currency"
                onChange={(val) => handleChange('marketingCosts', val)}
              />
              
              <SliderInput
                label="Closing Costs"
                value={values.wholesaleClosingCosts}
                min={0}
                max={2000}
                step={100}
                format="currency"
                onChange={(val) => handleChange('wholesaleClosingCosts', val)}
              />
              
              {wholesaleCalculations && (
                <>
                  <CalculatedField 
                    label="Net Profit" 
                    value={`$${wholesaleCalculations.netProfit.toLocaleString()}`} 
                  />
                  <CalculatedField 
                    label="ROI" 
                    value={`${wholesaleCalculations.roi.toFixed(0)}%`} 
                  />
                  <CalculatedField 
                    label="Buyer Profit" 
                    value={`$${wholesaleCalculations.endBuyerProfit.toLocaleString()}`} 
                  />
                </>
              )}
            </>
          )}

          {/* Rental Income Section - Conditional based on strategy */}
          {strategyType === 'str' ? (
            <>
              {/* STR Income Section */}
              <SectionDivider text="STR Income" />
              
              <SliderInput
                label="Average Daily Rate"
                sublabel="ADR"
                value={values.averageDailyRate}
                min={50}
                max={1000}
                step={10}
                format="currency"
                onChange={(val) => handleChange('averageDailyRate', val)}
              />
              
              <SliderInput
                label="Occupancy Rate"
                value={values.occupancyRate}
                min={30}
                max={95}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('occupancyRate', val)}
              />
              
              <SliderInput
                label="Cleaning Fee"
                sublabel="Revenue per stay"
                value={values.cleaningFeeRevenue}
                min={0}
                max={300}
                step={25}
                format="currency"
                onChange={(val) => handleChange('cleaningFeeRevenue', val)}
              />
              
              <SliderInput
                label="Avg Length of Stay"
                value={values.avgLengthOfStayDays}
                min={1}
                max={30}
                step={1}
                format="days"
                onChange={(val) => handleChange('avgLengthOfStayDays', val)}
              />
              
              {strCalculations && (
                <CalculatedField 
                  label="Annual Gross Revenue" 
                  value={`$${strCalculations.annualGrossRevenue.toLocaleString()}`} 
                />
              )}
            </>
          ) : (
            <>
              {/* LTR Income Section */}
              <div ref={incomeRef}>
                <SectionDivider text="Rental Income" />
              </div>
              
              <SliderInput
                label="Monthly Rent"
                value={values.monthlyRent}
                min={500}
                max={10000}
                step={50}
                format="currency"
                onChange={(val) => handleChange('monthlyRent', val)}
              />
              
              <SliderInput
                label="Vacancy Rate"
                value={values.vacancyRate}
                min={0}
                max={20}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('vacancyRate', val)}
              />
            </>
          )}

          {/* Operating Expenses Section - Conditional based on strategy */}
          {strategyType === 'str' ? (
            <>
              {/* STR Expenses Section */}
              <SectionDivider text="STR Expenses" />
              
              <SliderInput
                label="Platform Fees"
                sublabel="Airbnb/VRBO"
                value={values.platformFeeRate}
                min={10}
                max={20}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('platformFeeRate', val)}
              />
              
              <SliderInput
                label="STR Management"
                value={values.strManagementRate}
                min={0}
                max={25}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('strManagementRate', val)}
              />
              
              <SliderInput
                label="Cleaning Cost"
                sublabel="Per turnover"
                value={values.cleaningCostPerTurnover}
                min={50}
                max={400}
                step={25}
                format="currency"
                onChange={(val) => handleChange('cleaningCostPerTurnover', val)}
              />
              
              <SliderInput
                label="Supplies & Consumables"
                value={values.suppliesMonthly}
                min={0}
                max={500}
                step={25}
                format="currency-month"
                onChange={(val) => handleChange('suppliesMonthly', val)}
              />
              
              <SliderInput
                label="Additional Utilities"
                value={values.additionalUtilitiesMonthly}
                min={0}
                max={500}
                step={25}
                format="currency-month"
                onChange={(val) => handleChange('additionalUtilitiesMonthly', val)}
              />
              
              <SliderInput
                label="Property Taxes"
                value={values.propertyTaxes}
                min={0}
                max={20000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('propertyTaxes', val)}
              />
              
              <SliderInput
                label="Insurance"
                sublabel="STR coverage"
                value={values.insurance}
                min={0}
                max={12000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('insurance', val)}
              />
              
              {strCalculations && (
                <CalculatedField 
                  label="Break-Even Occupancy" 
                  value={`${strCalculations.breakEvenOccupancy}%`} 
                />
              )}
            </>
          ) : (
            <>
              {/* LTR Expenses Section */}
              <div ref={expensesRef}>
                <SectionDivider text="Operating Expenses" />
              </div>
              
              <SliderInput
                label="Property Taxes"
                value={values.propertyTaxes}
                min={0}
                max={20000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('propertyTaxes', val)}
              />
              
              <SliderInput
                label="Insurance"
                value={values.insurance}
                min={0}
                max={10000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('insurance', val)}
              />
              
              <SliderInput
                label="Management Rate"
                value={values.managementRate}
                min={0}
                max={15}
                step={0.5}
                format="percent-int"
                onChange={(val) => handleChange('managementRate', val)}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#E2E8F0] bg-white flex-shrink-0">
          <button 
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B] text-[13px] font-medium hover:bg-[#F1F5F9] hover:text-[#0A1628] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-[#0891B2] rounded-xl text-white text-[15px] font-semibold hover:bg-[#0E7490] active:scale-[0.98] transition-all"
          >
            Apply Changes
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default DealMakerPopup
