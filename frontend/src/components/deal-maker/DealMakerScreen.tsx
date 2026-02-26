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
 * Uses DealGapIQ Universal Style Guide colors
 * 
 * ARCHITECTURE: This component now uses the centralized dealMakerStore.
 * - For SAVED properties: Load from backend via dealMakerStore.loadRecord(propertyId)
 * - For UNSAVED properties: Use local state with property defaults (legacy mode)
 * - All changes are persisted to backend immediately (for saved properties)
 * - No more fetching defaults on every page load - they're locked in the DealMakerRecord
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDealMakerStore, useDealMakerDerived, useDealMakerReady } from '@/stores/dealMakerStore'
import {
  // Strategy types & defaults
  StrategyType,
  STRDealMakerState, STRMetrics, DEFAULT_STR_DEAL_MAKER_STATE,
  BRRRRDealMakerState, BRRRRMetrics, DEFAULT_BRRRR_DEAL_MAKER_STATE,
  FlipDealMakerState, FlipMetrics, DEFAULT_FLIP_DEAL_MAKER_STATE,
  HouseHackDealMakerState, HouseHackMetrics, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  WholesaleDealMakerState, WholesaleMetrics, DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
  // LTR types (extracted)
  LTRDealMakerState, LTRDealMakerMetrics,
  AnyStrategyState, AnyStrategyMetrics,
  DealMakerPropertyData, AccordionSection,
  // Helpers (extracted)
  getStrategyType,
  formatPrice, formatPercent, formatNumber, calculateMortgagePayment, getValueColor,
} from './types'
import { useDealMakerBackendCalc } from '@/hooks/useDealMakerBackendCalc'
import {
  buildInitialState,
  buildLTRState,
  buildSTRState,
  buildBRRRRState,
  buildFlipState,
  buildHouseHackState,
  buildWholesaleState,
} from './strategyDefaults'

// Re-export for consumers that import from this file
export type { DealMakerPropertyData }

// Wholesale viability display helper (was in deleted wholesaleCalculations.ts)
function getViabilityDisplay(viability: string): { label: string; color: string; icon: string } {
  switch (viability) {
    case 'excellent':
      return { label: 'Excellent Deal', color: '#22c55e', icon: '🟢' }
    case 'good':
      return { label: 'Good Deal', color: '#3b82f6', icon: '🔵' }
    case 'marginal':
      return { label: 'Marginal Deal', color: '#f97316', icon: '🟠' }
    case 'poor':
      return { label: 'Poor Deal', color: '#ef4444', icon: '🔴' }
    default:
      return { label: 'Unknown', color: '#6b7280', icon: '⚪' }
  }
}

// Local type guards — narrower than the ones in types.ts, scoped to this component's union
function isSTRState(state: AnyStrategyState): state is STRDealMakerState {
  return 'averageDailyRate' in state && 'occupancyRate' in state
}
function isBRRRRState(state: AnyStrategyState): state is BRRRRDealMakerState {
  return 'refinanceLtv' in state && 'holdingPeriodMonths' in state
}
function isFlipState(state: AnyStrategyState): state is FlipDealMakerState {
  return 'financingType' in state && 'sellingCostsPct' in state && 'daysOnMarket' in state
}
function isHouseHackState(state: AnyStrategyState): state is HouseHackDealMakerState {
  return 'totalUnits' in state && 'ownerOccupiedUnits' in state && 'pmiRate' in state
}
function isWholesaleState(state: AnyStrategyState): state is WholesaleDealMakerState {
  return 'assignmentFee' in state && 'earnestMoney' in state && 'contractPrice' in state && !('sellingCostsPct' in state)
}

interface DealMakerScreenProps {
  property: DealMakerPropertyData
  listPrice?: number
  initialStrategy?: string
  savedPropertyId?: string
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
        <span className="text-base font-bold text-[#0EA5E9] tabular-nums">{displayValue}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full relative">
          <div 
            className="absolute left-0 top-0 h-full bg-[#0EA5E9] rounded-full"
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
            className="absolute w-4 h-4 bg-[#0EA5E9] border-2 border-white rounded-full shadow-md -translate-y-1/2 top-1/2"
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
  
  // Get initial state for a strategy (unsaved property mode).
  // Logic extracted to ./strategyDefaults.ts for maintainability.
  const getInitialLocalState = (strategy: StrategyType): AnyStrategyState =>
    buildInitialState(strategy, property, listPrice)
  
  // State
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')
  const [activeAccordion, setActiveAccordion] = useState<AccordionSection>('buyPrice')
  const strategyType = getStrategyType(currentStrategy)
  const [localLTRState, setLocalLTRState] = useState<LTRDealMakerState>(() => buildLTRState(property, listPrice))
  const [localSTRState, setLocalSTRState] = useState<STRDealMakerState>(() => buildSTRState(property, listPrice))
  const [localFlipState, setLocalFlipState] = useState<FlipDealMakerState>(() => buildFlipState(property, listPrice))
  const [localHouseHackState, setLocalHouseHackState] = useState<HouseHackDealMakerState>(() => buildHouseHackState(property, listPrice))
  const [localWholesaleState, setLocalWholesaleState] = useState<WholesaleDealMakerState>(() => buildWholesaleState(property, listPrice))
  const [localBRRRRState, setLocalBRRRRState] = useState<BRRRRDealMakerState>(() => buildBRRRRState(property, listPrice))
  
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
  const state: AnyStrategyState = useMemo(() => {
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
      
      // For BRRRR strategy, return BRRRR state from store
      if (strategyType === 'brrrr') {
        return {
          purchasePrice: record.buy_price,
          buyDiscountPct: record.buy_discount_pct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.buyDiscountPct,
          downPaymentPercent: record.down_payment_pct,
          closingCostsPercent: record.closing_costs_pct,
          hardMoneyRate: record.hard_money_rate ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.hardMoneyRate,
          rehabBudget: record.rehab_budget,
          contingencyPct: record.contingency_pct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.contingencyPct,
          holdingPeriodMonths: record.holding_period_months ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingPeriodMonths,
          holdingCostsMonthly: record.holding_costs_monthly ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingCostsMonthly,
          arv: record.arv,
          postRehabMonthlyRent: record.post_rehab_monthly_rent ?? record.monthly_rent ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabMonthlyRent,
          postRehabRentIncreasePct: record.post_rehab_rent_increase_pct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabRentIncreasePct,
          refinanceLtv: record.refinance_ltv ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceLtv,
          refinanceInterestRate: record.refinance_interest_rate ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceInterestRate,
          refinanceTermYears: record.refinance_term_years ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceTermYears,
          refinanceClosingCostsPct: record.refinance_closing_costs_pct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceClosingCostsPct,
          vacancyRate: record.vacancy_rate,
          maintenanceRate: record.maintenance_pct,
          managementRate: record.management_pct,
          annualPropertyTax: record.annual_property_tax,
          annualInsurance: record.annual_insurance,
          monthlyHoa: record.monthly_hoa,
        } as BRRRRDealMakerState
      }
      
      // For Flip strategy, return Flip state from store
      if (strategyType === 'flip') {
        return {
          purchasePrice: record.buy_price,
          purchaseDiscountPct: record.purchase_discount_pct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.purchaseDiscountPct,
          closingCostsPercent: record.closing_costs_pct,
          financingType: (record.financing_type as 'cash' | 'hardMoney' | 'conventional') ?? DEFAULT_FLIP_DEAL_MAKER_STATE.financingType,
          hardMoneyLtv: record.hard_money_ltv ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyLtv,
          hardMoneyRate: record.hard_money_rate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyRate,
          loanPoints: record.loan_points ?? DEFAULT_FLIP_DEAL_MAKER_STATE.loanPoints,
          rehabBudget: record.rehab_budget,
          contingencyPct: record.contingency_pct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.contingencyPct,
          rehabTimeMonths: record.rehab_time_months ?? DEFAULT_FLIP_DEAL_MAKER_STATE.rehabTimeMonths,
          arv: record.arv,
          holdingCostsMonthly: record.holding_costs_monthly ?? DEFAULT_FLIP_DEAL_MAKER_STATE.holdingCostsMonthly,
          daysOnMarket: record.days_on_market ?? DEFAULT_FLIP_DEAL_MAKER_STATE.daysOnMarket,
          sellingCostsPct: record.selling_costs_pct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.sellingCostsPct,
          capitalGainsRate: record.capital_gains_rate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.capitalGainsRate,
        } as FlipDealMakerState
      }
      
      // For HouseHack strategy, return HouseHack state from store
      if (strategyType === 'house_hack') {
        return {
          purchasePrice: record.buy_price,
          totalUnits: record.total_units ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.totalUnits,
          ownerOccupiedUnits: record.owner_occupied_units ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.ownerOccupiedUnits,
          ownerUnitMarketRent: record.owner_unit_market_rent ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.ownerUnitMarketRent,
          loanType: (record.loan_type as 'fha' | 'conventional' | 'va') ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.loanType,
          downPaymentPercent: record.down_payment_pct,
          interestRate: record.interest_rate,
          loanTermYears: record.loan_term_years,
          pmiRate: record.pmi_rate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.pmiRate,
          closingCostsPercent: record.closing_costs_pct,
          avgRentPerUnit: record.avg_rent_per_unit ?? record.monthly_rent ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.avgRentPerUnit,
          vacancyRate: record.vacancy_rate,
          currentHousingPayment: record.current_housing_payment ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.currentHousingPayment,
          annualPropertyTax: record.annual_property_tax,
          annualInsurance: record.annual_insurance,
          monthlyHoa: record.monthly_hoa,
          utilitiesMonthly: record.utilities_monthly ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.utilitiesMonthly,
          maintenanceRate: record.maintenance_pct,
          capexRate: record.capex_rate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.capexRate,
        } as HouseHackDealMakerState
      }
      
      // For Wholesale strategy, return Wholesale state from store
      if (strategyType === 'wholesale') {
        return {
          arv: record.arv,
          estimatedRepairs: record.estimated_repairs ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.estimatedRepairs,
          squareFootage: record.sqft ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.squareFootage,
          contractPrice: record.contract_price ?? record.buy_price ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.contractPrice,
          earnestMoney: record.earnest_money ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.earnestMoney,
          inspectionPeriodDays: record.inspection_period_days ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.inspectionPeriodDays,
          daysToClose: record.days_to_close ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.daysToClose,
          assignmentFee: record.assignment_fee ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.assignmentFee,
          marketingCosts: record.marketing_costs ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.marketingCosts,
          closingCosts: record.wholesale_closing_costs ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.closingCosts,
        } as WholesaleDealMakerState
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
    if (strategyType === 'brrrr') {
      return localBRRRRState
    }
    if (strategyType === 'flip') {
      return localFlipState
    }
    if (strategyType === 'house_hack') {
      return localHouseHackState
    }
    if (strategyType === 'wholesale') {
      return localWholesaleState
    }
    return localLTRState
  }, [isSavedPropertyMode, hasRecord, dealMakerStore.record, strategyType, localLTRState, localSTRState, localBRRRRState, localFlipState, localHouseHackState, localWholesaleState])
  
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
      
      if (strategyType === 'wholesale' && isWholesaleState(state)) {
        // Wholesale-specific session data
        const wsMetrics = metrics as WholesaleMetrics
        sessionData = {
          address: fullAddr,
          purchasePrice: state.contractPrice,
          monthlyRent: 0, // Wholesale has no rental income
          propertyTaxes: 0,
          insurance: 0,
          arv: state.arv,
          zpid: property.zpid,
          strategy: 'wholesale',
          // Wholesale-specific values
          contractPrice: state.contractPrice,
          estimatedRepairs: state.estimatedRepairs,
          earnestMoney: state.earnestMoney,
          assignmentFee: state.assignmentFee,
          marketingCosts: state.marketingCosts,
          closingCosts: state.closingCosts,
          daysToClose: state.daysToClose,
          maxAllowableOffer: wsMetrics.maxAllowableOffer,
          meets70PercentRule: wsMetrics.meets70PercentRule,
          endBuyerProfit: wsMetrics.endBuyerProfit,
          netProfit: wsMetrics.netProfit,
          roi: wsMetrics.roi,
          timestamp: Date.now(),
        }
      } else if (strategyType === 'house_hack' && isHouseHackState(state)) {
        // HouseHack-specific session data
        const hhMetrics = metrics as HouseHackMetrics
        sessionData = {
          address: fullAddr,
          purchasePrice: state.purchasePrice,
          monthlyRent: state.avgRentPerUnit * (state.totalUnits - state.ownerOccupiedUnits),
          propertyTaxes: state.annualPropertyTax,
          insurance: state.annualInsurance,
          arv: 0,
          zpid: property.zpid,
          strategy: 'house_hack',
          // HouseHack-specific values
          totalUnits: state.totalUnits,
          ownerOccupiedUnits: state.ownerOccupiedUnits,
          ownerUnitMarketRent: state.ownerUnitMarketRent,
          loanType: state.loanType,
          pmiRate: state.pmiRate,
          avgRentPerUnit: state.avgRentPerUnit,
          currentHousingPayment: state.currentHousingPayment,
          utilitiesMonthly: state.utilitiesMonthly,
          capexRate: state.capexRate,
          effectiveHousingCost: hhMetrics.effectiveHousingCost,
          housingOffsetPercent: hhMetrics.housingOffsetPercent,
          livesForFree: hhMetrics.livesForFree,
          downPaymentPct: state.downPaymentPercent,
          closingCostsPct: state.closingCostsPercent,
          vacancyRate: state.vacancyRate,
          maintenancePct: state.maintenanceRate,
          monthlyHoa: state.monthlyHoa,
          timestamp: Date.now(),
        }
      } else if (strategyType === 'flip' && isFlipState(state)) {
        // Flip-specific session data
        sessionData = {
          address: fullAddr,
          purchasePrice: state.purchasePrice,
          monthlyRent: 0, // Flip has no rental income
          propertyTaxes: 0,
          insurance: 0,
          arv: state.arv,
          zpid: property.zpid,
          strategy: 'flip',
          // Flip-specific values
          purchaseDiscountPct: state.purchaseDiscountPct,
          closingCostsPct: state.closingCostsPercent,
          financingType: state.financingType,
          hardMoneyLtv: state.hardMoneyLtv,
          hardMoneyRate: state.hardMoneyRate,
          loanPoints: state.loanPoints,
          rehabBudget: state.rehabBudget,
          contingencyPct: state.contingencyPct,
          rehabTimeMonths: state.rehabTimeMonths,
          holdingCostsMonthly: state.holdingCostsMonthly,
          daysOnMarket: state.daysOnMarket,
          sellingCostsPct: state.sellingCostsPct,
          capitalGainsRate: state.capitalGainsRate,
          timestamp: Date.now(),
        }
      } else if (strategyType === 'brrrr' && isBRRRRState(state)) {
        // BRRRR-specific session data
        sessionData = {
          address: fullAddr,
          purchasePrice: state.purchasePrice,
          monthlyRent: state.postRehabMonthlyRent,
          propertyTaxes: state.annualPropertyTax,
          insurance: state.annualInsurance,
          arv: state.arv,
          zpid: property.zpid,
          strategy: 'brrrr',
          // BRRRR-specific values
          buyDiscountPct: state.buyDiscountPct,
          hardMoneyRate: state.hardMoneyRate,
          contingencyPct: state.contingencyPct,
          holdingPeriodMonths: state.holdingPeriodMonths,
          holdingCostsMonthly: state.holdingCostsMonthly,
          postRehabMonthlyRent: state.postRehabMonthlyRent,
          refinanceLtv: state.refinanceLtv,
          refinanceInterestRate: state.refinanceInterestRate,
          refinanceTermYears: state.refinanceTermYears,
          refinanceClosingCostsPct: state.refinanceClosingCostsPct,
          // Shared values
          downPaymentPct: state.downPaymentPercent,
          closingCostsPct: state.closingCostsPercent,
          rehabBudget: state.rehabBudget,
          vacancyRate: state.vacancyRate,
          maintenancePct: state.maintenanceRate,
          managementPct: state.managementRate,
          monthlyHoa: state.monthlyHoa,
          timestamp: Date.now(),
        }
      } else if (strategyType === 'str' && isSTRState(state)) {
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
      
      // Calculate monthly rent/revenue and purchase price for URL params
      let monthlyRentValue: number
      let purchasePriceValue: number
      
      if (strategyType === 'wholesale' && isWholesaleState(state)) {
        monthlyRentValue = 0 // Wholesale has no rental income
        purchasePriceValue = state.contractPrice
      } else if (strategyType === 'house_hack' && isHouseHackState(state)) {
        monthlyRentValue = state.avgRentPerUnit * (state.totalUnits - state.ownerOccupiedUnits)
        purchasePriceValue = state.purchasePrice
      } else if (strategyType === 'flip' && isFlipState(state)) {
        monthlyRentValue = 0 // Flip has no rental income
        purchasePriceValue = state.purchasePrice
      } else if (strategyType === 'brrrr' && isBRRRRState(state)) {
        monthlyRentValue = state.postRehabMonthlyRent
        purchasePriceValue = state.purchasePrice
      } else if (strategyType === 'str' && isSTRState(state)) {
        const nightsOccupied = 365 * state.occupancyRate
        const numberOfTurnovers = Math.floor(nightsOccupied / state.avgLengthOfStayDays)
        const annualRevenue = (state.averageDailyRate * nightsOccupied) + (state.cleaningFeeRevenue * numberOfTurnovers)
        monthlyRentValue = annualRevenue / 12
        purchasePriceValue = state.buyPrice
      } else {
        const ltrState = state as LTRDealMakerState
        monthlyRentValue = ltrState.monthlyRent ?? 0
        purchasePriceValue = ltrState.buyPrice
      }
      
      // Navigate with URL params (for initial load and bookmarkability)
      // Get property tax and insurance values based on strategy
      let propertyTaxValue = 0
      let insuranceValue = 0
      let arvValue = 0
      
      if (strategyType === 'wholesale' && isWholesaleState(state)) {
        propertyTaxValue = 0
        insuranceValue = 0
        arvValue = state.arv
      } else if (strategyType === 'house_hack' && isHouseHackState(state)) {
        propertyTaxValue = state.annualPropertyTax
        insuranceValue = state.annualInsurance
        arvValue = 0
      } else if (strategyType === 'flip' && isFlipState(state)) {
        // Flip doesn't have annual property tax/insurance fields, use defaults
        propertyTaxValue = 0
        insuranceValue = 0
        arvValue = state.arv
      } else if (strategyType === 'brrrr' && isBRRRRState(state)) {
        propertyTaxValue = state.annualPropertyTax
        insuranceValue = state.annualInsurance
        arvValue = state.arv
      } else {
        const otherState = state as LTRDealMakerState | STRDealMakerState
        propertyTaxValue = otherState.annualPropertyTax
        insuranceValue = otherState.annualInsurance
        arvValue = otherState.arv
      }
      
      const params = new URLSearchParams({
        address: fullAddr,
        purchasePrice: String(purchasePriceValue),
        monthlyRent: String(monthlyRentValue),
        propertyTaxes: String(propertyTaxValue),
        insurance: String(insuranceValue),
        strategy: strategyType,
      })
      
      if (property.zpid) {
        params.set('zpid', property.zpid)
      }
      if (arvValue > 0) {
        params.set('arv', String(arvValue))
      }
      
      router.push(`/verdict?${params.toString()}`)
    }
  }, [router, property, state, isSavedPropertyMode, savedPropertyId, strategyType])

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  // Note: Header is now handled by global AppHeader

  // Get metrics - from store for saved properties, calculate locally for unsaved
  const isCalculating = isSavedPropertyMode ? dealMakerStore.isSaving : false
  
  // Calculate metrics via backend worksheet endpoints (debounced)
  const { result: backendResult, isCalculating: backendCalculating } = useDealMakerBackendCalc<Record<string, unknown>>(
    strategyType as 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale',
    state as unknown as Record<string, unknown>,
  )
  
  // Map backend result to the metrics shape the UI expects
  const metrics = useMemo<AnyStrategyMetrics>(() => {
    // If backend result available for non-LTR strategies, use it directly
    if (backendResult && strategyType !== 'ltr') {
      return backendResult as unknown as AnyStrategyMetrics
    }
    
    // For saved properties with LTR, use cached metrics from store
    if (isSavedPropertyMode && hasRecord && dealMakerStore.record?.cached_metrics && strategyType === 'ltr') {
      const ltrState = state as LTRDealMakerState
      const cachedMetrics = dealMakerStore.record.cached_metrics
      const effectiveListPrice = dealMakerStore.record.list_price || ltrState.buyPrice
      const dealGap = effectiveListPrice > 0 
        ? (effectiveListPrice - ltrState.buyPrice) / effectiveListPrice 
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
  const updateState = useCallback((key: string, value: number | string) => {
    if (isSavedPropertyMode && hasRecord) {
      // Map local field names to store field names (includes LTR, STR, and BRRRR fields)
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
        vacancyRate: 'vacancy_rate',
        managementRate: 'management_pct',
        // LTR-specific
        monthlyRent: 'monthly_rent',
        otherIncome: 'other_income',
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
        // BRRRR-specific
        purchasePrice: 'buy_price',  // Maps to same field
        buyDiscountPct: 'buy_discount_pct',
        hardMoneyRate: 'hard_money_rate',
        contingencyPct: 'contingency_pct',
        holdingPeriodMonths: 'holding_period_months',
        holdingCostsMonthly: 'holding_costs_monthly',
        postRehabMonthlyRent: 'post_rehab_monthly_rent',
        postRehabRentIncreasePct: 'post_rehab_rent_increase_pct',
        refinanceLtv: 'refinance_ltv',
        refinanceInterestRate: 'refinance_interest_rate',
        refinanceTermYears: 'refinance_term_years',
        refinanceClosingCostsPct: 'refinance_closing_costs_pct',
        // Flip-specific
        purchaseDiscountPct: 'purchase_discount_pct',
        financingType: 'financing_type',
        hardMoneyLtv: 'hard_money_ltv',
        loanPoints: 'loan_points',
        rehabTimeMonths: 'rehab_time_months',
        daysOnMarket: 'days_on_market',
        sellingCostsPct: 'selling_costs_pct',
        capitalGainsRate: 'capital_gains_rate',
        // HouseHack-specific
        totalUnits: 'total_units',
        ownerOccupiedUnits: 'owner_occupied_units',
        ownerUnitMarketRent: 'owner_unit_market_rent',
        loanType: 'loan_type',
        pmiRate: 'pmi_rate',
        avgRentPerUnit: 'avg_rent_per_unit',
        currentHousingPayment: 'current_housing_payment',
        utilitiesMonthly: 'utilities_monthly',
        capexRate: 'capex_rate',
        // Wholesale-specific (note: closingCosts maps to wholesale_closing_costs to avoid collision with other strategies)
        estimatedRepairs: 'estimated_repairs',
        squareFootage: 'sqft',
        contractPrice: 'contract_price',
        earnestMoney: 'earnest_money',
        inspectionPeriodDays: 'inspection_period_days',
        daysToClose: 'days_to_close',
        assignmentFee: 'assignment_fee',
        marketingCosts: 'marketing_costs',
        closingCosts: 'wholesale_closing_costs',
      }
      
      const storeField = fieldMap[key]
      if (storeField) {
        dealMakerStore.updateField(storeField as keyof typeof dealMakerStore.pendingUpdates, value)
      }
    } else {
      // Local state for unsaved properties - update the appropriate state based on strategy
      if (strategyType === 'str') {
        setLocalSTRState(prev => ({ ...prev, [key]: value }))
      } else if (strategyType === 'brrrr') {
        setLocalBRRRRState(prev => ({ ...prev, [key]: value }))
      } else if (strategyType === 'flip') {
        setLocalFlipState(prev => ({ ...prev, [key]: value }))
      } else if (strategyType === 'house_hack') {
        setLocalHouseHackState(prev => ({ ...prev, [key]: value }))
      } else if (strategyType === 'wholesale') {
        setLocalWholesaleState(prev => ({ ...prev, [key]: value }))
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

  // getValueColor imported from ./types

  // Key metrics for header - varies by strategy
  const headerMetrics = useMemo(() => {
    if (strategyType === 'str' && 'revPAR' in metrics) {
      const strMetrics = metrics as STRMetrics
      const strState = state as STRDealMakerState
      return [
        { label: 'Buy Price', value: formatPrice(strState.buyPrice), color: 'white' },
        { label: 'Cash Needed', value: formatPrice(strMetrics.cashNeeded), color: 'white' },
        { label: 'RevPAR', value: formatPrice(strMetrics.revPAR), color: 'cyan' },
        { label: 'Annual Profit', value: formatPrice(strMetrics.annualCashFlow), color: strMetrics.annualCashFlow >= 0 ? 'teal' : 'rose' },
        { label: 'CAP Rate', value: `${strMetrics.capRate.toFixed(1)}%`, color: 'white' },
        { label: 'COC Return', value: `${strMetrics.cocReturn.toFixed(1)}%`, color: strMetrics.cocReturn >= 0 ? 'white' : 'rose' },
      ]
    }
    
    // BRRRR metrics - focus on capital recycling
    if (strategyType === 'brrrr' && 'capitalRecycledPct' in metrics) {
      const brrrrMetrics = metrics as BRRRRMetrics
      const brrrrState = state as BRRRRDealMakerState
      const cocDisplay = isFinite(brrrrMetrics.postRefiCashOnCash) 
        ? `${brrrrMetrics.postRefiCashOnCash.toFixed(1)}%` 
        : 'Infinite'
      return [
        { label: 'All-In Cost', value: formatPrice(brrrrMetrics.allInCost), color: 'white' },
        { label: 'Cash Invested', value: formatPrice(brrrrMetrics.totalCashInvested), color: 'white' },
        { label: 'Cash Out', value: formatPrice(brrrrMetrics.cashOutAtRefinance), color: brrrrMetrics.cashOutAtRefinance > 0 ? 'cyan' : 'rose' },
        { label: 'Cash Left', value: formatPrice(brrrrMetrics.cashLeftInDeal), color: brrrrMetrics.infiniteRoiAchieved ? 'teal' : 'white' },
        { label: 'Capital Recycled', value: `${brrrrMetrics.capitalRecycledPct.toFixed(0)}%`, color: brrrrMetrics.capitalRecycledPct >= 100 ? 'teal' : brrrrMetrics.capitalRecycledPct >= 80 ? 'cyan' : 'white' },
        { label: 'Post-Refi CoC', value: cocDisplay, color: brrrrMetrics.infiniteRoiAchieved ? 'teal' : 'white' },
      ]
    }
    
    // Flip metrics - focus on profit
    if (strategyType === 'flip' && 'maxAllowableOffer' in metrics) {
      const flipMetrics = metrics as FlipMetrics
      const flipState = state as FlipDealMakerState
      return [
        { label: 'Total Cost', value: formatPrice(flipMetrics.totalProjectCost), color: 'white' },
        { label: 'ARV', value: formatPrice(flipState.arv), color: 'white' },
        { label: 'Net Profit', value: formatPrice(flipMetrics.netProfit), color: flipMetrics.netProfit >= 0 ? 'teal' : 'rose' },
        { label: 'ROI', value: `${flipMetrics.roi.toFixed(1)}%`, color: flipMetrics.roi >= 20 ? 'teal' : flipMetrics.roi >= 10 ? 'cyan' : 'white' },
        { label: 'Ann. ROI', value: `${flipMetrics.annualizedRoi.toFixed(0)}%`, color: flipMetrics.annualizedRoi >= 30 ? 'teal' : 'white' },
        { label: '70% Rule', value: flipMetrics.meets70PercentRule ? 'PASS' : 'FAIL', color: flipMetrics.meets70PercentRule ? 'teal' : 'rose' },
      ]
    }
    
    // HouseHack metrics - focus on housing cost reduction
    if (strategyType === 'house_hack' && 'effectiveHousingCost' in metrics) {
      const hhMetrics = metrics as HouseHackMetrics
      const effectiveCostDisplay = hhMetrics.livesForFree 
        ? (hhMetrics.effectiveHousingCost < 0 ? `+${formatPrice(Math.abs(hhMetrics.effectiveHousingCost))}` : 'FREE')
        : formatPrice(hhMetrics.effectiveHousingCost)
      return [
        { label: 'Eff. Housing', value: effectiveCostDisplay, color: hhMetrics.livesForFree ? 'teal' : 'white' },
        { label: 'Savings/Mo', value: formatPrice(hhMetrics.housingCostSavings), color: hhMetrics.housingCostSavings > 0 ? 'teal' : 'rose' },
        { label: 'Offset %', value: `${hhMetrics.housingOffsetPercent.toFixed(0)}%`, color: hhMetrics.housingOffsetPercent >= 75 ? 'teal' : hhMetrics.housingOffsetPercent >= 50 ? 'cyan' : 'white' },
        { label: 'Cash to Close', value: formatPrice(hhMetrics.cashToClose), color: 'white' },
        { label: 'CoC Return', value: `${hhMetrics.cashOnCashReturn.toFixed(1)}%`, color: hhMetrics.cashOnCashReturn >= 10 ? 'teal' : 'white' },
        { label: 'Full CF', value: formatPrice(hhMetrics.fullRentalCashFlow), color: hhMetrics.fullRentalCashFlow > 0 ? 'cyan' : 'rose' },
      ]
    }
    
    // Wholesale metrics - focus on assignment profit
    if (strategyType === 'wholesale' && 'endBuyerPrice' in metrics) {
      const wsMetrics = metrics as WholesaleMetrics
      return [
        { label: 'Net Profit', value: formatPrice(wsMetrics.netProfit), color: wsMetrics.netProfit > 0 ? 'teal' : 'rose' },
        { label: 'ROI', value: `${wsMetrics.roi.toFixed(0)}%`, color: wsMetrics.roi >= 500 ? 'teal' : wsMetrics.roi >= 200 ? 'cyan' : 'white' },
        { label: '70% Rule', value: wsMetrics.meets70PercentRule ? 'PASS' : 'FAIL', color: wsMetrics.meets70PercentRule ? 'teal' : 'rose' },
        { label: 'Buyer Profit', value: formatPrice(wsMetrics.endBuyerProfit), color: wsMetrics.endBuyerProfit >= 20000 ? 'teal' : wsMetrics.endBuyerProfit >= 10000 ? 'cyan' : 'rose' },
        { label: 'Cash at Risk', value: formatPrice(wsMetrics.totalCashAtRisk), color: 'white' },
        { label: 'Timeline', value: `${(state as WholesaleDealMakerState).daysToClose} days`, color: 'white' },
      ]
    }
    
    // LTR metrics
    const ltrMetrics = metrics as LTRDealMakerMetrics
    const ltrState = state as LTRDealMakerState
    return [
      { label: 'Buy Price', value: formatPrice(ltrState.buyPrice), color: 'white' },
      { label: 'Cash Needed', value: formatPrice(ltrMetrics.cashNeeded), color: 'white' },
      { label: 'Deal Gap', value: `${ltrMetrics.dealGap >= 0 ? '+' : ''}${formatPercent(ltrMetrics.dealGap)}`, color: 'cyan' },
      { label: 'Annual Profit', value: formatPrice(ltrMetrics.annualProfit), color: ltrMetrics.annualProfit >= 0 ? 'teal' : 'rose' },
      { label: 'CAP Rate', value: `${ltrMetrics.capRate.toFixed(1)}%`, color: 'white' },
      { label: 'COC Return', value: `${ltrMetrics.cocReturn.toFixed(1)}%`, color: ltrMetrics.cocReturn >= 0 ? 'white' : 'rose' },
    ]
  }, [strategyType, metrics, state])

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      {/* Header is now handled by global AppHeader in layout */}

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
                ? 'border-[#0EA5E9]/20 shadow-[0_0_0_2px_rgba(14,165,233,0.1)]' 
                : 'border-[#F1F5F9]'
            }`}
          >
            {/* Accordion Header */}
            <button
              className="flex items-center gap-3 p-3.5 w-full text-left"
              onClick={() => toggleAccordion(section.id)}
            >
              <div className="w-6 h-6 text-[#0EA5E9]">{section.icon}</div>
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
                    {strategyType === 'brrrr' && isBRRRRState(state) ? (
                      // BRRRR Phase 1: Buy
                      <>
                        <SliderInput
                          label="Purchase Price"
                          value={state.purchasePrice}
                          displayValue={formatPrice(state.purchasePrice)}
                          min={50000}
                          max={2000000}
                          minLabel="$50,000"
                          maxLabel="$2,000,000"
                          onChange={(v) => updateState('purchasePrice', v)}
                        />
                        <SliderInput
                          label="Discount from Market"
                          value={state.buyDiscountPct * 100}
                          displayValue={`${(state.buyDiscountPct * 100).toFixed(0)}%`}
                          min={0}
                          max={30}
                          minLabel="0%"
                          maxLabel="30%"
                          onChange={(v) => updateState('buyDiscountPct', v / 100)}
                        />
                        <SliderInput
                          label="Down Payment (Hard Money)"
                          value={state.downPaymentPercent * 100}
                          displayValue={`${(state.downPaymentPercent * 100).toFixed(0)}%`}
                          min={10}
                          max={30}
                          minLabel="10%"
                          maxLabel="30%"
                          onChange={(v) => updateState('downPaymentPercent', v / 100)}
                        />
                        <SliderInput
                          label="Hard Money Rate"
                          value={state.hardMoneyRate * 100}
                          displayValue={`${(state.hardMoneyRate * 100).toFixed(1)}%`}
                          min={8}
                          max={15}
                          minLabel="8%"
                          maxLabel="15%"
                          onChange={(v) => updateState('hardMoneyRate', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">PHASE 1 CASH NEEDED</div>
                          <div className="text-2xl font-bold text-[#0A1628] tabular-nums">
                            {formatPrice('cashRequiredPhase1' in metrics ? (metrics as BRRRRMetrics).cashRequiredPhase1 : 0)}
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'flip' && isFlipState(state) ? (
                      // Flip Phase 1: Buy
                      <>
                        <SliderInput
                          label="Purchase Price"
                          value={state.purchasePrice}
                          displayValue={formatPrice(state.purchasePrice)}
                          min={50000}
                          max={2000000}
                          minLabel="$50,000"
                          maxLabel="$2,000,000"
                          onChange={(v) => updateState('purchasePrice', v)}
                        />
                        <SliderInput
                          label="Discount from ARV"
                          value={state.purchaseDiscountPct * 100}
                          displayValue={`${(state.purchaseDiscountPct * 100).toFixed(0)}%`}
                          min={0}
                          max={40}
                          minLabel="0%"
                          maxLabel="40%"
                          onChange={(v) => updateState('purchaseDiscountPct', v / 100)}
                        />
                        <SliderInput
                          label="Closing Costs"
                          value={state.closingCostsPercent * 100}
                          displayValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`}
                          min={2}
                          max={5}
                          minLabel="2%"
                          maxLabel="5%"
                          onChange={(v) => updateState('closingCostsPercent', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">CASH AT PURCHASE</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('cashAtPurchase' in metrics ? (metrics as FlipMetrics).cashAtPurchase : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">70% RULE MAO</div>
                            <div className={`text-base font-bold tabular-nums ${'meets70PercentRule' in metrics && (metrics as FlipMetrics).meets70PercentRule ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                              {formatPrice('maxAllowableOffer' in metrics ? (metrics as FlipMetrics).maxAllowableOffer : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'house_hack' && isHouseHackState(state) ? (
                      // HouseHack Phase 1: Buy
                      <>
                        <SliderInput
                          label="Purchase Price"
                          value={state.purchasePrice}
                          displayValue={formatPrice(state.purchasePrice)}
                          min={100000}
                          max={2000000}
                          minLabel="$100,000"
                          maxLabel="$2,000,000"
                          onChange={(v) => updateState('purchasePrice', v)}
                        />
                        <SliderInput
                          label="Total Units"
                          value={state.totalUnits}
                          displayValue={`${state.totalUnits} units`}
                          min={2}
                          max={8}
                          minLabel="2"
                          maxLabel="8"
                          onChange={(v) => updateState('totalUnits', Math.round(v))}
                        />
                        <SliderInput
                          label="Owner Units"
                          value={state.ownerOccupiedUnits}
                          displayValue={`${state.ownerOccupiedUnits} unit${state.ownerOccupiedUnits > 1 ? 's' : ''}`}
                          min={1}
                          max={2}
                          minLabel="1"
                          maxLabel="2"
                          onChange={(v) => updateState('ownerOccupiedUnits', Math.round(v))}
                        />
                        <SliderInput
                          label="Owner Unit Market Rent"
                          value={state.ownerUnitMarketRent}
                          displayValue={`${formatPrice(state.ownerUnitMarketRent)}/mo`}
                          min={500}
                          max={5000}
                          minLabel="$500"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('ownerUnitMarketRent', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">RENTED UNITS</div>
                            <div className="text-xl font-bold text-[#0EA5E9] tabular-nums">
                              {'rentedUnits' in metrics ? (metrics as HouseHackMetrics).rentedUnits : state.totalUnits - state.ownerOccupiedUnits}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'wholesale' && isWholesaleState(state) ? (
                      // Wholesale Phase 1: Property Analysis
                      <>
                        <SliderInput
                          label="After Repair Value (ARV)"
                          value={state.arv}
                          displayValue={formatPrice(state.arv)}
                          min={50000}
                          max={2000000}
                          minLabel="$50,000"
                          maxLabel="$2,000,000"
                          onChange={(v) => updateState('arv', v)}
                        />
                        <SliderInput
                          label="Estimated Repairs"
                          value={state.estimatedRepairs}
                          displayValue={formatPrice(state.estimatedRepairs)}
                          min={0}
                          max={200000}
                          minLabel="$0"
                          maxLabel="$200,000"
                          onChange={(v) => updateState('estimatedRepairs', v)}
                        />
                        <SliderInput
                          label="Square Footage"
                          value={state.squareFootage}
                          displayValue={`${state.squareFootage.toLocaleString()} sqft`}
                          min={500}
                          max={5000}
                          minLabel="500"
                          maxLabel="5,000"
                          onChange={(v) => updateState('squareFootage', Math.round(v))}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">70% RULE MAO</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('maxAllowableOffer' in metrics ? (metrics as WholesaleMetrics).maxAllowableOffer : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">REPAIR $/SQFT</div>
                            <div className="text-base font-bold text-[#64748B] tabular-nums">
                              {formatPrice(state.squareFootage > 0 ? state.estimatedRepairs / state.squareFootage : 0)}/sqft
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR/STR Buy Price
                      (() => {
                        const ltrStrState = state as LTRDealMakerState | STRDealMakerState
                        return (
                          <>
                            <SliderInput
                              label="Buy Price"
                              value={ltrStrState.buyPrice}
                              displayValue={formatPrice(ltrStrState.buyPrice)}
                              min={50000}
                              max={2000000}
                              minLabel="$50,000"
                              maxLabel="$2,000,000"
                              onChange={(v) => updateState('buyPrice', v)}
                            />
                            <SliderInput
                              label="Down Payment"
                              value={ltrStrState.downPaymentPercent * 100}
                              displayValue={`${(ltrStrState.downPaymentPercent * 100).toFixed(1)}%`}
                              min={5}
                              max={50}
                              minLabel="5.0%"
                              maxLabel="50.0%"
                              onChange={(v) => updateState('downPaymentPercent', v / 100)}
                            />
                            <SliderInput
                              label="Closing Costs"
                              value={ltrStrState.closingCostsPercent * 100}
                              displayValue={`${(ltrStrState.closingCostsPercent * 100).toFixed(2)}%`}
                              min={2}
                              max={5}
                              minLabel="2.00%"
                              maxLabel="5.00%"
                              onChange={(v) => updateState('closingCostsPercent', v / 100)}
                            />
                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">CASH NEEDED</div>
                              <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice('cashNeeded' in metrics ? metrics.cashNeeded : 0)}</div>
                            </div>
                          </>
                        )
                      })()
                    )}
                  </>
                )}

                {/* Financing Section */}
                {section.id === 'financing' && (
                  <>
                    {strategyType === 'brrrr' && isBRRRRState(state) ? (
                      // BRRRR: Show refinance loan details preview
                      <>
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mt-4">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">FINANCING OVERVIEW</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">Initial Hard Money Loan</span>
                              <span className="font-bold text-[#0EA5E9] tabular-nums">
                                {formatPrice('initialLoanAmount' in metrics ? (metrics as BRRRRMetrics).initialLoanAmount : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">Hard Money Rate</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {(state.hardMoneyRate * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                              <span className="text-sm text-[#64748B]">Refinance Loan (at ARV)</span>
                              <span className="font-bold text-[#10B981] tabular-nums">
                                {formatPrice('refinanceLoanAmount' in metrics ? (metrics as BRRRRMetrics).refinanceLoanAmount : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">New Monthly Payment</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice('newMonthlyPayment' in metrics ? (metrics as BRRRRMetrics).newMonthlyPayment : 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-[#64748B] mt-2 italic">
                          BRRRR uses hard money for purchase + refinance after rehab. Adjust rates in Buy and Income sections.
                        </p>
                      </>
                    ) : strategyType === 'flip' && isFlipState(state) ? (
                      // Flip Financing
                      <>
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mt-4 mb-4">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">FINANCING TYPE</div>
                          <div className="flex gap-2">
                            {(['cash', 'hardMoney'] as const).map((type) => (
                              <button
                                key={type}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                                  state.financingType === type
                                    ? 'bg-[#0EA5E9] text-white'
                                    : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                                }`}
                                onClick={() => updateState('financingType', type)}
                              >
                                {type === 'cash' ? 'Cash' : 'Hard Money'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {state.financingType !== 'cash' && (
                          <>
                            <SliderInput
                              label="Loan-to-Value (LTV)"
                              value={state.hardMoneyLtv * 100}
                              displayValue={`${(state.hardMoneyLtv * 100).toFixed(0)}%`}
                              min={70}
                              max={100}
                              minLabel="70%"
                              maxLabel="100%"
                              onChange={(v) => updateState('hardMoneyLtv', v / 100)}
                            />
                            <SliderInput
                              label="Interest Rate"
                              value={state.hardMoneyRate * 100}
                              displayValue={`${(state.hardMoneyRate * 100).toFixed(1)}%`}
                              min={8}
                              max={18}
                              minLabel="8%"
                              maxLabel="18%"
                              onChange={(v) => updateState('hardMoneyRate', v / 100)}
                            />
                            <SliderInput
                              label="Loan Points"
                              value={state.loanPoints}
                              displayValue={`${state.loanPoints.toFixed(1)} pts`}
                              min={0}
                              max={5}
                              minLabel="0 pts"
                              maxLabel="5 pts"
                              onChange={(v) => updateState('loanPoints', v)}
                            />
                          </>
                        )}
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">LOAN AMOUNT</div>
                            <div className="text-xl font-bold text-[#0EA5E9] tabular-nums">
                              {formatPrice('loanAmount' in metrics ? (metrics as FlipMetrics).loanAmount : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">INTEREST COSTS</div>
                            <div className="text-base font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('interestCosts' in metrics ? (metrics as FlipMetrics).interestCosts : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'house_hack' && isHouseHackState(state) ? (
                      // HouseHack Phase 2: Financing
                      <>
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mt-4 mb-4">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">LOAN TYPE</div>
                          <div className="flex gap-2">
                            {(['fha', 'conventional', 'va'] as const).map((type) => (
                              <button
                                key={type}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                                  state.loanType === type
                                    ? 'bg-[#0EA5E9] text-white'
                                    : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                                }`}
                                onClick={() => updateState('loanType', type)}
                              >
                                {type.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                        <SliderInput
                          label="Down Payment"
                          value={state.downPaymentPercent * 100}
                          displayValue={`${(state.downPaymentPercent * 100).toFixed(1)}%`}
                          min={state.loanType === 'va' ? 0 : state.loanType === 'fha' ? 3.5 : 5}
                          max={25}
                          minLabel={state.loanType === 'va' ? '0%' : state.loanType === 'fha' ? '3.5%' : '5%'}
                          maxLabel="25%"
                          onChange={(v) => updateState('downPaymentPercent', v / 100)}
                        />
                        <SliderInput
                          label="Interest Rate"
                          value={state.interestRate * 100}
                          displayValue={`${(state.interestRate * 100).toFixed(2)}%`}
                          min={4}
                          max={10}
                          minLabel="4%"
                          maxLabel="10%"
                          onChange={(v) => updateState('interestRate', v / 100)}
                        />
                        <SliderInput
                          label="PMI/MIP Rate"
                          value={state.pmiRate * 100}
                          displayValue={`${(state.pmiRate * 100).toFixed(2)}%`}
                          min={0}
                          max={1.5}
                          minLabel="0%"
                          maxLabel="1.5%"
                          onChange={(v) => updateState('pmiRate', v / 100)}
                        />
                        <SliderInput
                          label="Closing Costs"
                          value={state.closingCostsPercent * 100}
                          displayValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`}
                          min={2}
                          max={5}
                          minLabel="2%"
                          maxLabel="5%"
                          onChange={(v) => updateState('closingCostsPercent', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">CASH TO CLOSE</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('cashToClose' in metrics ? (metrics as HouseHackMetrics).cashToClose : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">MONTHLY PITI</div>
                            <div className="text-base font-bold text-[#0EA5E9] tabular-nums">
                              {formatPrice('monthlyPITI' in metrics ? (metrics as HouseHackMetrics).monthlyPITI : 0)}/mo
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'wholesale' && isWholesaleState(state) ? (
                      // Wholesale Phase 2: Contract Terms
                      <>
                        <SliderInput
                          label="Contract Price"
                          value={state.contractPrice}
                          displayValue={formatPrice(state.contractPrice)}
                          min={25000}
                          max={1500000}
                          minLabel="$25,000"
                          maxLabel="$1,500,000"
                          onChange={(v) => updateState('contractPrice', v)}
                        />
                        <SliderInput
                          label="Earnest Money"
                          value={state.earnestMoney}
                          displayValue={formatPrice(state.earnestMoney)}
                          min={100}
                          max={10000}
                          minLabel="$100"
                          maxLabel="$10,000"
                          onChange={(v) => updateState('earnestMoney', v)}
                        />
                        <SliderInput
                          label="Inspection Period"
                          value={state.inspectionPeriodDays}
                          displayValue={`${state.inspectionPeriodDays} days`}
                          min={7}
                          max={30}
                          minLabel="7 days"
                          maxLabel="30 days"
                          onChange={(v) => updateState('inspectionPeriodDays', Math.round(v))}
                        />
                        <SliderInput
                          label="Days to Close"
                          value={state.daysToClose}
                          displayValue={`${state.daysToClose} days`}
                          min={21}
                          max={90}
                          minLabel="21 days"
                          maxLabel="90 days"
                          onChange={(v) => updateState('daysToClose', Math.round(v))}
                        />
                        <div className={`border rounded-lg p-3 mt-4 ${'meets70PercentRule' in metrics && (metrics as WholesaleMetrics).meets70PercentRule ? 'bg-[#ECFDF5] border-[#10B981]' : 'bg-[#FEF2F2] border-[#F43F5E]'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'meets70PercentRule' in metrics && (metrics as WholesaleMetrics).meets70PercentRule ? '#10B981' : '#F43F5E' }}>
                              70% RULE: {'meets70PercentRule' in metrics && (metrics as WholesaleMetrics).meets70PercentRule ? 'PASS ✓' : 'FAIL ✗'}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-[#64748B]">
                              {'contractVsMAO' in metrics && (metrics as WholesaleMetrics).contractVsMAO <= 0 ? 'Under MAO by' : 'Over MAO by'}
                            </div>
                            <div className={`font-bold tabular-nums ${'contractVsMAO' in metrics && (metrics as WholesaleMetrics).contractVsMAO <= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                              {formatPrice(Math.abs('contractVsMAO' in metrics ? (metrics as WholesaleMetrics).contractVsMAO : 0))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR/STR Financing
                      (() => {
                        const ltrStrState = state as LTRDealMakerState | STRDealMakerState
                        const ltrStrMetrics = metrics as LTRDealMakerMetrics | STRMetrics
                        return (
                          <>
                            <div className="flex justify-between items-center py-3 mt-4 mb-2 border-b border-[#E2E8F0]">
                              <span className="text-sm font-semibold text-[#0A1628]">Loan Amount</span>
                              <span className="text-base font-bold text-[#0EA5E9] tabular-nums">{formatPrice('loanAmount' in ltrStrMetrics ? ltrStrMetrics.loanAmount : 0)}</span>
                            </div>
                            <SliderInput
                              label="Interest Rate"
                              value={ltrStrState.interestRate * 100}
                              displayValue={`${(ltrStrState.interestRate * 100).toFixed(2)}%`}
                              min={5}
                              max={12}
                              minLabel="5.00%"
                              maxLabel="12.00%"
                              onChange={(v) => updateState('interestRate', v / 100)}
                            />
                            <SliderInput
                              label="Loan Term"
                              value={ltrStrState.loanTermYears}
                              displayValue={`${ltrStrState.loanTermYears} years`}
                              min={10}
                              max={30}
                              minLabel="10 years"
                              maxLabel="30 years"
                              onChange={(v) => updateState('loanTermYears', Math.round(v))}
                            />
                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4 text-right">
                              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">MONTHLY PAYMENT</div>
                              <div className="text-2xl font-bold text-[#0A1628] tabular-nums">{formatPrice('monthlyPayment' in ltrStrMetrics ? ltrStrMetrics.monthlyPayment : 0)}</div>
                            </div>
                          </>
                        )
                      })()
                    )}
                  </>
                )}

                {/* Rehab & Valuation Section */}
                {section.id === 'rehab' && (
                  <>
                    {strategyType === 'brrrr' && isBRRRRState(state) ? (
                      // BRRRR Phase 2: Rehab
                      <>
                        <SliderInput
                          label="Rehab Budget"
                          value={state.rehabBudget}
                          displayValue={formatPrice(state.rehabBudget)}
                          min={0}
                          max={200000}
                          minLabel="$0"
                          maxLabel="$200,000"
                          onChange={(v) => updateState('rehabBudget', v)}
                        />
                        <SliderInput
                          label="Contingency"
                          value={state.contingencyPct * 100}
                          displayValue={`${(state.contingencyPct * 100).toFixed(0)}%`}
                          min={0}
                          max={25}
                          minLabel="0%"
                          maxLabel="25%"
                          onChange={(v) => updateState('contingencyPct', v / 100)}
                        />
                        <SliderInput
                          label="Holding Period"
                          value={state.holdingPeriodMonths}
                          displayValue={`${state.holdingPeriodMonths} months`}
                          min={2}
                          max={12}
                          minLabel="2 mo"
                          maxLabel="12 mo"
                          onChange={(v) => updateState('holdingPeriodMonths', Math.round(v))}
                        />
                        <SliderInput
                          label="Monthly Holding Costs"
                          value={state.holdingCostsMonthly}
                          displayValue={`${formatPrice(state.holdingCostsMonthly)}/mo`}
                          min={0}
                          max={3000}
                          minLabel="$0"
                          maxLabel="$3,000"
                          onChange={(v) => updateState('holdingCostsMonthly', v)}
                        />
                        <SliderInput
                          label="After Repair Value (ARV)"
                          value={state.arv}
                          displayValue={formatPrice(state.arv)}
                          min={state.purchasePrice}
                          max={state.purchasePrice * 2}
                          minLabel={formatPrice(state.purchasePrice)}
                          maxLabel={formatPrice(state.purchasePrice * 2)}
                          onChange={(v) => updateState('arv', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">TOTAL REHAB COST</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('totalRehabCost' in metrics ? (metrics as BRRRRMetrics).totalRehabCost : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">HOLDING COSTS</div>
                            <div className="text-base font-bold text-[#0EA5E9] tabular-nums">
                              {formatPrice('holdingCosts' in metrics ? (metrics as BRRRRMetrics).holdingCosts : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'flip' && isFlipState(state) ? (
                      // Flip Rehab
                      <>
                        <SliderInput
                          label="Rehab Budget"
                          value={state.rehabBudget}
                          displayValue={formatPrice(state.rehabBudget)}
                          min={0}
                          max={200000}
                          minLabel="$0"
                          maxLabel="$200,000"
                          onChange={(v) => updateState('rehabBudget', v)}
                        />
                        <SliderInput
                          label="Contingency"
                          value={state.contingencyPct * 100}
                          displayValue={`${(state.contingencyPct * 100).toFixed(0)}%`}
                          min={0}
                          max={25}
                          minLabel="0%"
                          maxLabel="25%"
                          onChange={(v) => updateState('contingencyPct', v / 100)}
                        />
                        <SliderInput
                          label="Rehab Time"
                          value={state.rehabTimeMonths}
                          displayValue={`${state.rehabTimeMonths} months`}
                          min={1}
                          max={12}
                          minLabel="1 mo"
                          maxLabel="12 mo"
                          onChange={(v) => updateState('rehabTimeMonths', Math.round(v))}
                        />
                        <SliderInput
                          label="After Repair Value (ARV)"
                          value={state.arv}
                          displayValue={formatPrice(state.arv)}
                          min={state.purchasePrice}
                          max={state.purchasePrice * 2}
                          minLabel={formatPrice(state.purchasePrice)}
                          maxLabel={formatPrice(state.purchasePrice * 2)}
                          onChange={(v) => updateState('arv', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">TOTAL REHAB COST</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('totalRehabCost' in metrics ? (metrics as FlipMetrics).totalRehabCost : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">GROSS PROFIT (before costs)</div>
                            <div className={`text-base font-bold tabular-nums ${'grossProfit' in metrics && (metrics as FlipMetrics).grossProfit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                              {formatPrice('grossProfit' in metrics ? (metrics as FlipMetrics).grossProfit : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'house_hack' && isHouseHackState(state) ? (
                      // HouseHack: This section becomes "Rent" - no rehab for house hack
                      <>
                        <p className="text-sm text-[#64748B] mb-4 italic">
                          House Hack typically doesn&apos;t require major rehab. Set rental income for your rented units below.
                        </p>
                        <SliderInput
                          label="Avg Rent Per Unit"
                          value={state.avgRentPerUnit}
                          displayValue={`${formatPrice(state.avgRentPerUnit)}/mo`}
                          min={500}
                          max={5000}
                          minLabel="$500"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('avgRentPerUnit', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">TOTAL RENTAL INCOME</div>
                            <div className="text-xl font-bold text-[#10B981] tabular-nums">
                              {formatPrice('grossRentalIncome' in metrics ? (metrics as HouseHackMetrics).grossRentalIncome : 0)}/mo
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">RENTED UNITS × AVG RENT</div>
                            <div className="text-sm text-[#64748B]">
                              {state.totalUnits - state.ownerOccupiedUnits} × {formatPrice(state.avgRentPerUnit)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'wholesale' && isWholesaleState(state) ? (
                      // Wholesale: Assignment Fee
                      <>
                        <SliderInput
                          label="Assignment Fee"
                          value={state.assignmentFee}
                          displayValue={formatPrice(state.assignmentFee)}
                          min={5000}
                          max={50000}
                          minLabel="$5,000"
                          maxLabel="$50,000"
                          onChange={(v) => updateState('assignmentFee', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">END BUYER PRICE</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('endBuyerPrice' in metrics ? (metrics as WholesaleMetrics).endBuyerPrice : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">FEE AS % OF ARV</div>
                            <div className="text-base font-bold text-[#64748B] tabular-nums">
                              {state.arv > 0 ? ((state.assignmentFee / state.arv) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR/STR Rehab
                      (() => {
                        const ltrStrState = state as LTRDealMakerState | STRDealMakerState
                        return (
                          <>
                            <SliderInput
                              label="Rehab Budget"
                              value={ltrStrState.rehabBudget}
                              displayValue={formatPrice(ltrStrState.rehabBudget)}
                              min={0}
                              max={100000}
                              minLabel="$0"
                              maxLabel="$100,000"
                              onChange={(v) => updateState('rehabBudget', v)}
                            />
                            <SliderInput
                              label="ARV"
                              value={ltrStrState.arv}
                              displayValue={formatPrice(ltrStrState.arv)}
                              min={ltrStrState.buyPrice}
                              max={ltrStrState.buyPrice * 2}
                              minLabel={formatPrice(ltrStrState.buyPrice)}
                              maxLabel={formatPrice(ltrStrState.buyPrice * 2)}
                              onChange={(v) => updateState('arv', v)}
                            />
                            {/* STR-specific: Furniture & Setup */}
                            {strategyType === 'str' && isSTRState(state) && (
                              <SliderInput
                                label="Furniture & Setup"
                                value={(state as STRDealMakerState).furnitureSetupCost}
                                displayValue={formatPrice((state as STRDealMakerState).furnitureSetupCost)}
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
                                {formatPrice('equityCreated' in metrics ? metrics.equityCreated : ('equityPosition' in metrics ? (metrics as BRRRRMetrics).equityPosition : 0))}
                              </div>
                            </div>
                          </>
                        )
                      })()
                    )}
                  </>
                )}

                {/* Income Section */}
                {section.id === 'income' && (
                  <>
                    {strategyType === 'brrrr' && isBRRRRState(state) ? (
                      // BRRRR Phase 3: Rent + Phase 4: Refinance
                      <>
                        <SliderInput
                          label="Post-Rehab Monthly Rent"
                          value={state.postRehabMonthlyRent}
                          displayValue={formatPrice(state.postRehabMonthlyRent)}
                          min={500}
                          max={10000}
                          minLabel="$500"
                          maxLabel="$10,000"
                          onChange={(v) => updateState('postRehabMonthlyRent', v)}
                        />
                        <SliderInput
                          label="Vacancy Rate"
                          value={state.vacancyRate * 100}
                          displayValue={`${(state.vacancyRate * 100).toFixed(0)}%`}
                          min={0}
                          max={15}
                          minLabel="0%"
                          maxLabel="15%"
                          onChange={(v) => updateState('vacancyRate', v / 100)}
                        />
                        <SliderInput
                          label="Property Management"
                          value={state.managementRate * 100}
                          displayValue={`${(state.managementRate * 100).toFixed(0)}%`}
                          min={0}
                          max={12}
                          minLabel="0%"
                          maxLabel="12%"
                          onChange={(v) => updateState('managementRate', v / 100)}
                        />
                        <SliderInput
                          label="Refinance LTV"
                          value={state.refinanceLtv * 100}
                          displayValue={`${(state.refinanceLtv * 100).toFixed(0)}%`}
                          min={65}
                          max={80}
                          minLabel="65%"
                          maxLabel="80%"
                          onChange={(v) => updateState('refinanceLtv', v / 100)}
                        />
                        <SliderInput
                          label="Refinance Rate"
                          value={state.refinanceInterestRate * 100}
                          displayValue={`${(state.refinanceInterestRate * 100).toFixed(2)}%`}
                          min={4}
                          max={10}
                          minLabel="4%"
                          maxLabel="10%"
                          onChange={(v) => updateState('refinanceInterestRate', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">REFINANCE LOAN</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('refinanceLoanAmount' in metrics ? (metrics as BRRRRMetrics).refinanceLoanAmount : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">CASH OUT AT REFI</div>
                            <div className={`text-base font-bold tabular-nums ${'cashOutAtRefinance' in metrics && (metrics as BRRRRMetrics).cashOutAtRefinance > 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                              {formatPrice('cashOutAtRefinance' in metrics ? (metrics as BRRRRMetrics).cashOutAtRefinance : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'flip' && isFlipState(state) ? (
                      // Flip: Hold & Sell
                      <>
                        <SliderInput
                          label="Monthly Holding Costs"
                          value={state.holdingCostsMonthly}
                          displayValue={`${formatPrice(state.holdingCostsMonthly)}/mo`}
                          min={0}
                          max={5000}
                          minLabel="$0"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('holdingCostsMonthly', v)}
                        />
                        <SliderInput
                          label="Days on Market"
                          value={state.daysOnMarket}
                          displayValue={`${state.daysOnMarket} days`}
                          min={15}
                          max={180}
                          minLabel="15 days"
                          maxLabel="180 days"
                          onChange={(v) => updateState('daysOnMarket', Math.round(v))}
                        />
                        <SliderInput
                          label="Selling Costs"
                          value={state.sellingCostsPct * 100}
                          displayValue={`${(state.sellingCostsPct * 100).toFixed(0)}%`}
                          min={4}
                          max={10}
                          minLabel="4%"
                          maxLabel="10%"
                          onChange={(v) => updateState('sellingCostsPct', v / 100)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">TOTAL HOLDING COSTS</div>
                            <div className="text-xl font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('totalHoldingCosts' in metrics ? (metrics as FlipMetrics).totalHoldingCosts : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">SELLING COSTS</div>
                            <div className="text-base font-bold text-[#0A1628] tabular-nums">
                              {formatPrice('sellingCosts' in metrics ? (metrics as FlipMetrics).sellingCosts : 0)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">HOLDING PERIOD</div>
                            <div className="text-base font-bold text-[#0EA5E9] tabular-nums">
                              {'holdingPeriodMonths' in metrics ? `${(metrics as FlipMetrics).holdingPeriodMonths.toFixed(1)} months` : '0 months'}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'house_hack' && isHouseHackState(state) ? (
                      // HouseHack: Vacancy and current housing comparison
                      <>
                        <SliderInput
                          label="Vacancy Rate"
                          value={state.vacancyRate * 100}
                          displayValue={`${(state.vacancyRate * 100).toFixed(0)}%`}
                          min={0}
                          max={15}
                          minLabel="0%"
                          maxLabel="15%"
                          onChange={(v) => updateState('vacancyRate', v / 100)}
                        />
                        <SliderInput
                          label="Current Housing Payment"
                          value={state.currentHousingPayment}
                          displayValue={`${formatPrice(state.currentHousingPayment)}/mo`}
                          min={0}
                          max={5000}
                          minLabel="$0"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('currentHousingPayment', v)}
                        />
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">EFFECTIVE RENTAL INCOME</div>
                            <div className="text-xl font-bold text-[#10B981] tabular-nums">
                              {formatPrice('effectiveRentalIncome' in metrics ? (metrics as HouseHackMetrics).effectiveRentalIncome : 0)}/mo
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">VS CURRENT HOUSING</div>
                            <div className={`text-base font-bold tabular-nums ${'housingCostSavings' in metrics && (metrics as HouseHackMetrics).housingCostSavings > 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                              {'housingCostSavings' in metrics && (metrics as HouseHackMetrics).housingCostSavings > 0 ? '+' : ''}
                              {formatPrice('housingCostSavings' in metrics ? (metrics as HouseHackMetrics).housingCostSavings : 0)}/mo
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'wholesale' && isWholesaleState(state) ? (
                      // Wholesale: End Buyer Analysis (read-only)
                      <>
                        <SliderInput
                          label="Marketing Costs"
                          value={state.marketingCosts}
                          displayValue={formatPrice(state.marketingCosts)}
                          min={0}
                          max={5000}
                          minLabel="$0"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('marketingCosts', v)}
                        />
                        <SliderInput
                          label="Closing Costs"
                          value={state.closingCosts}
                          displayValue={formatPrice(state.closingCosts)}
                          min={0}
                          max={2000}
                          minLabel="$0"
                          maxLabel="$2,000"
                          onChange={(v) => updateState('closingCosts', v)}
                        />
                        
                        {/* End Buyer Perspective */}
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mt-4">
                          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">END BUYER ANALYSIS</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">Assignment Sale Price</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice('endBuyerPrice' in metrics ? (metrics as WholesaleMetrics).endBuyerPrice : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">+ Repairs</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice(state.estimatedRepairs)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">+ Purchase Costs (3%)</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice('endBuyerPrice' in metrics ? (metrics as WholesaleMetrics).endBuyerPrice * 0.03 : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                              <span className="text-sm font-semibold text-[#0A1628]">Buyer All-In Cost</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice('endBuyerAllIn' in metrics ? (metrics as WholesaleMetrics).endBuyerAllIn : 0)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-[#E2E8F0] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">ARV (Sale Price)</span>
                              <span className="font-bold text-[#0A1628] tabular-nums">
                                {formatPrice(state.arv)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">- Selling Costs (8%)</span>
                              <span className="font-bold text-[#F43F5E] tabular-nums">
                                -{formatPrice(state.arv * 0.08)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                              <span className="text-sm font-semibold text-[#0A1628]">Buyer Profit</span>
                              <span className={`text-lg font-bold tabular-nums ${'endBuyerProfit' in metrics && (metrics as WholesaleMetrics).endBuyerProfit >= 20000 ? 'text-[#10B981]' : (metrics as WholesaleMetrics).endBuyerProfit >= 10000 ? 'text-[#0EA5E9]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('endBuyerProfit' in metrics ? (metrics as WholesaleMetrics).endBuyerProfit : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#64748B]">Buyer ROI</span>
                              <span className="font-bold text-[#64748B] tabular-nums">
                                {'endBuyerROI' in metrics ? `${(metrics as WholesaleMetrics).endBuyerROI.toFixed(1)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'str' && isSTRState(state) ? (
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
                    {strategyType === 'brrrr' && isBRRRRState(state) ? (
                      // BRRRR Phase 5: Results Summary
                      <>
                        <SliderInput
                          label="Maintenance Rate"
                          value={state.maintenanceRate * 100}
                          displayValue={`${(state.maintenanceRate * 100).toFixed(0)}%`}
                          min={3}
                          max={10}
                          minLabel="3%"
                          maxLabel="10%"
                          onChange={(v) => updateState('maintenanceRate', v / 100)}
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
                          max={5000}
                          minLabel="$0"
                          maxLabel="$5,000"
                          onChange={(v) => updateState('annualInsurance', v)}
                        />
                        <SliderInput
                          label="HOA"
                          value={state.monthlyHoa}
                          displayValue={`${formatPrice(state.monthlyHoa)}/mo`}
                          min={0}
                          max={500}
                          minLabel="$0"
                          maxLabel="$500"
                          onChange={(v) => updateState('monthlyHoa', v)}
                        />
                        
                        {/* BRRRR Capital Recycling Summary */}
                        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-4 mt-4 text-white">
                          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">CAPITAL RECYCLING SUMMARY</div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Total Cash Invested</span>
                              <span className="font-bold tabular-nums">
                                {formatPrice('totalCashInvested' in metrics ? (metrics as BRRRRMetrics).totalCashInvested : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Cash Out at Refi</span>
                              <span className="font-bold text-[#22D3EE] tabular-nums">
                                {formatPrice('cashOutAtRefinance' in metrics ? (metrics as BRRRRMetrics).cashOutAtRefinance : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                              <span className="text-sm text-[#94A3B8]">Cash Left in Deal</span>
                              <span className={`font-bold tabular-nums ${'infiniteRoiAchieved' in metrics && (metrics as BRRRRMetrics).infiniteRoiAchieved ? 'text-[#10B981]' : ''}`}>
                                {formatPrice('cashLeftInDeal' in metrics ? (metrics as BRRRRMetrics).cashLeftInDeal : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Capital Recycled</span>
                              <span className={`font-bold tabular-nums ${'capitalRecycledPct' in metrics && (metrics as BRRRRMetrics).capitalRecycledPct >= 100 ? 'text-[#10B981]' : (metrics as BRRRRMetrics).capitalRecycledPct >= 80 ? 'text-[#22D3EE]' : ''}`}>
                                {'capitalRecycledPct' in metrics ? `${(metrics as BRRRRMetrics).capitalRecycledPct.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                          
                          {'infiniteRoiAchieved' in metrics && (metrics as BRRRRMetrics).infiniteRoiAchieved && (
                            <div className="mt-3 pt-3 border-t border-[#334155] text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-sm font-semibold">
                                ✓ Infinite ROI Achieved
                              </span>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-[#334155] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Equity Position</span>
                              <span className="font-bold text-[#22D3EE] tabular-nums">
                                {formatPrice('equityPosition' in metrics ? (metrics as BRRRRMetrics).equityPosition : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Monthly Cash Flow</span>
                              <span className={`font-bold tabular-nums ${'postRefiMonthlyCashFlow' in metrics && (metrics as BRRRRMetrics).postRefiMonthlyCashFlow >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('postRefiMonthlyCashFlow' in metrics ? (metrics as BRRRRMetrics).postRefiMonthlyCashFlow : 0)}/mo
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'wholesale' && isWholesaleState(state) ? (
                      // Wholesale: Results Summary
                      <>
                        {/* Wholesale Profit Summary */}
                        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-4 mt-4 text-white">
                          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">YOUR WHOLESALE PROFIT</div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Assignment Fee</span>
                              <span className="font-bold text-[#10B981] tabular-nums">
                                {formatPrice(state.assignmentFee)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">- Marketing Costs</span>
                              <span className="font-bold text-[#F43F5E] tabular-nums">
                                -{formatPrice(state.marketingCosts)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">- Closing Costs</span>
                              <span className="font-bold text-[#F43F5E] tabular-nums">
                                -{formatPrice(state.closingCosts)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                              <span className="text-sm font-semibold text-white">NET PROFIT</span>
                              <span className={`text-xl font-bold tabular-nums ${'netProfit' in metrics && (metrics as WholesaleMetrics).netProfit > 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('netProfit' in metrics ? (metrics as WholesaleMetrics).netProfit : 0)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-[#334155] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Cash at Risk</span>
                              <span className="font-bold text-[#22D3EE] tabular-nums">
                                {formatPrice('totalCashAtRisk' in metrics ? (metrics as WholesaleMetrics).totalCashAtRisk : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">ROI</span>
                              <span className={`font-bold tabular-nums ${'roi' in metrics && (metrics as WholesaleMetrics).roi >= 500 ? 'text-[#10B981]' : 'text-[#22D3EE]'}`}>
                                {'roi' in metrics ? `${(metrics as WholesaleMetrics).roi.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Annualized ROI</span>
                              <span className="font-bold tabular-nums">
                                {'annualizedROI' in metrics ? `${(metrics as WholesaleMetrics).annualizedROI.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                          
                          {'dealViability' in metrics && (
                            <div className="mt-3 pt-3 border-t border-[#334155] text-center">
                              {(() => {
                                const viability = getViabilityDisplay((metrics as WholesaleMetrics).dealViability)
                                return (
                                  <span 
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                                    style={{ backgroundColor: `${viability.color}20`, color: viability.color }}
                                  >
                                    {viability.icon} {viability.label}
                                  </span>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </>
                    ) : strategyType === 'house_hack' && isHouseHackState(state) ? (
                      // HouseHack: Expenses + Results Summary
                      <>
                        <SliderInput
                          label="Property Taxes"
                          value={state.annualPropertyTax}
                          displayValue={`${formatPrice(state.annualPropertyTax)}/yr`}
                          min={0}
                          max={30000}
                          minLabel="$0"
                          maxLabel="$30,000"
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
                          label="HOA"
                          value={state.monthlyHoa}
                          displayValue={`${formatPrice(state.monthlyHoa)}/mo`}
                          min={0}
                          max={1000}
                          minLabel="$0"
                          maxLabel="$1,000"
                          onChange={(v) => updateState('monthlyHoa', v)}
                        />
                        <SliderInput
                          label="Shared Utilities"
                          value={state.utilitiesMonthly}
                          displayValue={`${formatPrice(state.utilitiesMonthly)}/mo`}
                          min={0}
                          max={1000}
                          minLabel="$0"
                          maxLabel="$1,000"
                          onChange={(v) => updateState('utilitiesMonthly', v)}
                        />
                        <SliderInput
                          label="Maintenance"
                          value={state.maintenanceRate * 100}
                          displayValue={`${(state.maintenanceRate * 100).toFixed(0)}%`}
                          min={0}
                          max={15}
                          minLabel="0%"
                          maxLabel="15%"
                          onChange={(v) => updateState('maintenanceRate', v / 100)}
                        />
                        <SliderInput
                          label="CapEx Reserve"
                          value={state.capexRate * 100}
                          displayValue={`${(state.capexRate * 100).toFixed(0)}%`}
                          min={0}
                          max={10}
                          minLabel="0%"
                          maxLabel="10%"
                          onChange={(v) => updateState('capexRate', v / 100)}
                        />
                        
                        {/* HouseHack Results Summary */}
                        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-4 mt-4 text-white">
                          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">HOUSING COST ANALYSIS</div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Monthly PITI</span>
                              <span className="font-bold tabular-nums">
                                {formatPrice('monthlyPITI' in metrics ? (metrics as HouseHackMetrics).monthlyPITI : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Net Rental Income</span>
                              <span className="font-bold text-[#10B981] tabular-nums">
                                -{formatPrice('netRentalIncome' in metrics ? (metrics as HouseHackMetrics).netRentalIncome : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                              <span className="text-sm font-semibold text-white">EFFECTIVE HOUSING COST</span>
                              <span className={`text-xl font-bold tabular-nums ${'livesForFree' in metrics && (metrics as HouseHackMetrics).livesForFree ? 'text-[#10B981]' : ''}`}>
                                {'livesForFree' in metrics && (metrics as HouseHackMetrics).livesForFree 
                                  ? ((metrics as HouseHackMetrics).effectiveHousingCost < 0 
                                    ? `+${formatPrice(Math.abs((metrics as HouseHackMetrics).effectiveHousingCost))}/mo` 
                                    : 'FREE!')
                                  : `${formatPrice('effectiveHousingCost' in metrics ? (metrics as HouseHackMetrics).effectiveHousingCost : 0)}/mo`
                                }
                              </span>
                            </div>
                          </div>
                          
                          {'livesForFree' in metrics && (metrics as HouseHackMetrics).livesForFree && (
                            <div className="mt-3 pt-3 border-t border-[#334155] text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-sm font-semibold">
                                🎉 Live For Free!
                              </span>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-[#334155] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Housing Offset</span>
                              <span className={`font-bold tabular-nums ${'housingOffsetPercent' in metrics && (metrics as HouseHackMetrics).housingOffsetPercent >= 75 ? 'text-[#10B981]' : 'text-[#22D3EE]'}`}>
                                {'housingOffsetPercent' in metrics ? `${(metrics as HouseHackMetrics).housingOffsetPercent.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Cash-on-Cash Return</span>
                              <span className="font-bold tabular-nums">
                                {'cashOnCashReturn' in metrics ? `${(metrics as HouseHackMetrics).cashOnCashReturn.toFixed(1)}%` : '0%'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Full Rental Cash Flow</span>
                              <span className={`font-bold tabular-nums ${'fullRentalCashFlow' in metrics && (metrics as HouseHackMetrics).fullRentalCashFlow > 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('fullRentalCashFlow' in metrics ? (metrics as HouseHackMetrics).fullRentalCashFlow : 0)}/mo
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'flip' && isFlipState(state) ? (
                      // Flip: Profit Summary
                      <>
                        <SliderInput
                          label="Capital Gains Tax Rate"
                          value={state.capitalGainsRate * 100}
                          displayValue={`${(state.capitalGainsRate * 100).toFixed(0)}%`}
                          min={0}
                          max={40}
                          minLabel="0%"
                          maxLabel="40%"
                          onChange={(v) => updateState('capitalGainsRate', v / 100)}
                        />
                        
                        {/* Flip Profit Summary */}
                        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-4 mt-4 text-white">
                          <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">PROFIT ANALYSIS</div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Total Project Cost</span>
                              <span className="font-bold tabular-nums">
                                {formatPrice('totalProjectCost' in metrics ? (metrics as FlipMetrics).totalProjectCost : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Sale Price (ARV)</span>
                              <span className="font-bold tabular-nums">
                                {formatPrice(state.arv)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                              <span className="text-sm text-[#94A3B8]">Gross Profit</span>
                              <span className={`font-bold tabular-nums ${'grossProfit' in metrics && (metrics as FlipMetrics).grossProfit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('grossProfit' in metrics ? (metrics as FlipMetrics).grossProfit : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Selling Costs</span>
                              <span className="font-bold text-[#F43F5E] tabular-nums">
                                -{formatPrice('sellingCosts' in metrics ? (metrics as FlipMetrics).sellingCosts : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Capital Gains Tax</span>
                              <span className="font-bold text-[#F43F5E] tabular-nums">
                                -{formatPrice('capitalGainsTax' in metrics ? (metrics as FlipMetrics).capitalGainsTax : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                              <span className="text-sm font-semibold text-white">NET PROFIT</span>
                              <span className={`text-xl font-bold tabular-nums ${'netProfit' in metrics && (metrics as FlipMetrics).netProfit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                {formatPrice('netProfit' in metrics ? (metrics as FlipMetrics).netProfit : 0)}
                              </span>
                            </div>
                          </div>
                          
                          {'meets70PercentRule' in metrics && (metrics as FlipMetrics).meets70PercentRule && (
                            <div className="mt-3 pt-3 border-t border-[#334155] text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-sm font-semibold">
                                ✓ Meets 70% Rule
                              </span>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-[#334155] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Cash Required</span>
                              <span className="font-bold text-[#22D3EE] tabular-nums">
                                {formatPrice('cashRequired' in metrics ? (metrics as FlipMetrics).cashRequired : 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">ROI</span>
                              <span className={`font-bold tabular-nums ${'roi' in metrics && (metrics as FlipMetrics).roi >= 20 ? 'text-[#10B981]' : (metrics as FlipMetrics).roi >= 10 ? 'text-[#22D3EE]' : ''}`}>
                                {'roi' in metrics ? `${(metrics as FlipMetrics).roi.toFixed(1)}%` : '0%'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-[#94A3B8]">Annualized ROI</span>
                              <span className="font-bold tabular-nums">
                                {'annualizedRoi' in metrics ? `${(metrics as FlipMetrics).annualizedRoi.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : strategyType === 'str' && isSTRState(state) ? (
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
                            <div className="text-base font-bold text-[#0EA5E9] tabular-nums">
                              {formatPercent('breakEvenOccupancy' in metrics ? (metrics as STRMetrics).breakEvenOccupancy : 0)}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // LTR Expenses fields
                      (() => {
                        const ltrState = state as LTRDealMakerState
                        return (
                          <>
                            <SliderInput
                              label="Property Taxes"
                              value={ltrState.annualPropertyTax}
                              displayValue={`${formatPrice(ltrState.annualPropertyTax)}/yr`}
                              min={0}
                              max={20000}
                              minLabel="$0"
                              maxLabel="$20,000"
                              onChange={(v) => updateState('annualPropertyTax', v)}
                            />
                            <SliderInput
                              label="Insurance"
                              value={ltrState.annualInsurance}
                              displayValue={`${formatPrice(ltrState.annualInsurance)}/yr`}
                              min={0}
                              max={10000}
                              minLabel="$0"
                              maxLabel="$10,000"
                              onChange={(v) => updateState('annualInsurance', v)}
                            />
                            <SliderInput
                              label="Management Rate"
                              value={(ltrState.managementRate ?? 0) * 100}
                              displayValue={`${((ltrState.managementRate ?? 0) * 100).toFixed(0)}%`}
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
                        )
                      })()
                    )}
                  </>
                )}

                {/* Continue Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#0EA5E9] text-white rounded-xl text-base font-semibold mt-4 hover:bg-[#0EA5E9] transition-colors"
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
            background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
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
