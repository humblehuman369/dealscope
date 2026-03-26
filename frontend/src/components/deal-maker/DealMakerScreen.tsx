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
import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'
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
  DealMakerPropertyData,
  // Helpers (extracted)
  getStrategyType,
  formatPrice, formatPercent, formatNumber, calculateMortgagePayment, getValueColor,
} from './types'
import { useDealMakerBackendCalc } from '@/hooks/useDealMakerBackendCalc'
import { DealMakerWorksheet } from './DealMakerWorksheet'
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
      return { label: 'Excellent Deal', color: 'var(--status-positive)', icon: '🟢' }
    case 'good':
      return { label: 'Good Deal', color: 'var(--accent-sky)', icon: '🔵' }
    case 'marginal':
      return { label: 'Marginal Deal', color: 'var(--status-warning)', icon: '🟠' }
    case 'poor':
      return { label: 'Poor Deal', color: 'var(--status-negative)', icon: '🔴' }
    default:
      return { label: 'Unknown', color: 'var(--text-label)', icon: '⚪' }
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
  backTo?: { label: string; href: string }
}




export function DealMakerScreen({ property, listPrice, initialStrategy, savedPropertyId, backTo }: DealMakerScreenProps) {
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
          closingCostsPercent: record.closing_costs_pct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.closingCostsPercent,
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
  // For saved properties: save adjustments first, then Verdict/Strategy use store + sessionStorage
  // For unsaved properties: store values in sessionStorage and pass via URL params
  const [isSavingForNavigate, setIsSavingForNavigate] = useState(false)
  const handleSeeResults = useCallback(async () => {
    const fullAddr = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
    
    if (isSavedPropertyMode && savedPropertyId) {
      // Persist any pending Deal Maker adjustments before navigating so Verdict/Strategy recalculate with latest values
      try {
        setIsSavingForNavigate(true)
        await dealMakerStore.flushAndSave()
      } catch (e) {
        console.error('Failed to save Deal Maker adjustments:', e)
        setIsSavingForNavigate(false)
        return
      } finally {
        setIsSavingForNavigate(false)
      }
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
        sessionStorage.setItem('dealMaker_activeAddress', canonicalizeAddressForIdentity(fullAddr))
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
  }, [router, property, state, isSavedPropertyMode, savedPropertyId, strategyType, dealMakerStore])

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
      // Flip: transform backend snake_case keys to FlipMetrics camelCase
      if (strategyType === 'flip') {
        const br = backendResult as Record<string, number | boolean>
        const purchasePrice = Number(br.purchase_price) || 0
        const loanAmount = Number(br.loan_amount) || 0
        const downPayment = purchasePrice - loanAmount
        const purchaseCosts = Number(br.purchase_costs) || 0
        const pointsCost = Number(br.points_cost) || 0
        const inspectionCosts = Number(br.inspection_costs) || 0
        const holdingMonths = Number(br.holding_months) || 0
        const monthlyPayment = Number(br.monthly_payment) || 0
        const netProfitBefore = Number(br.net_profit_before_tax) || 0
        const netProfitAfter = Number(br.net_profit_after_tax) || 0
        const ds = Number(br.deal_score) || 0
        return {
          loanAmount,
          downPayment,
          closingCosts: purchaseCosts,
          loanPointsCost: pointsCost,
          cashAtPurchase: downPayment + purchaseCosts + pointsCost + inspectionCosts,
          totalRehabCost: Number(br.total_renovation) || 0,
          holdingPeriodMonths: holdingMonths,
          totalHoldingCosts: Number(br.total_holding_costs) || 0,
          interestCosts: monthlyPayment * holdingMonths,
          grossSaleProceeds: Number(br.arv) || 0,
          sellingCosts: Number(br.selling_costs) || 0,
          netSaleProceeds: Number(br.net_sale_proceeds) || 0,
          totalProjectCost: Number(br.total_project_cost) || 0,
          grossProfit: Number(br.gross_profit) || 0,
          capitalGainsTax: Math.max(0, netProfitBefore - netProfitAfter),
          netProfit: netProfitBefore,
          cashRequired: Number(br.total_cash_required) || 0,
          roi: Number(br.roi) || 0,
          annualizedRoi: Number(br.annualized_roi) || 0,
          profitMargin: Number(br.profit_margin) || 0,
          maxAllowableOffer: Number(br.mao) || 0,
          meets70PercentRule: !!br.meets_70_rule,
          dealScore: ds,
          dealGrade: (ds >= 90 ? 'A+' : ds >= 80 ? 'A' : ds >= 70 ? 'B' : ds >= 60 ? 'C' : ds >= 50 ? 'D' : 'F') as FlipMetrics['dealGrade'],
        } as FlipMetrics
      }
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
    if (backTo) {
      router.push(backTo.href)
    } else {
      router.back()
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
      { label: 'Deal Gap', value: `${-ltrMetrics.dealGap >= 0 ? '+' : ''}${formatPercent(-ltrMetrics.dealGap)}`, color: 'cyan' },
      { label: 'Annual Profit', value: formatPrice(ltrMetrics.annualProfit), color: ltrMetrics.annualProfit >= 0 ? 'teal' : 'rose' },
      { label: 'CAP Rate', value: `${ltrMetrics.capRate.toFixed(1)}%`, color: 'white' },
      { label: 'COC Return', value: `${ltrMetrics.cocReturn.toFixed(1)}%`, color: ltrMetrics.cocReturn >= 0 ? 'white' : 'rose' },
    ]
  }, [strategyType, metrics, state])

  return (
    <div className="deal-maker-theme min-h-screen bg-[var(--surface-base)] max-w-[960px] mx-auto font-['Inter',sans-serif]">
      <style>{`
        .deal-maker-theme .text-\\[\\#ffffff\\] { color: var(--text-heading) !important; }
        .deal-maker-theme .text-white { color: var(--text-heading) !important; }
        .deal-maker-theme .text-white\\/75,
        .deal-maker-theme .text-white\\/60 { color: var(--text-secondary) !important; }
        .deal-maker-theme .hover\\:text-white:hover { color: var(--text-heading) !important; }
        .deal-maker-theme .border-white\\/10 { border-color: var(--border-subtle) !important; }
        .deal-maker-theme .border-b.border-white\\/10 { border-color: var(--border-subtle) !important; }
        .deal-maker-theme .bg-white\\/\\[0\\.06\\] { background-color: var(--surface-elevated) !important; }
        .deal-maker-theme .hover\\:bg-white\\/10:hover { background-color: var(--surface-card-hover) !important; }
        .deal-maker-theme .border-\\[rgba\\(14\\,165\\,233\\,0\\.2\\)\\] { border-color: var(--border-default) !important; }
        .deal-maker-theme .border-\\[rgba\\(14\\,165\\,233\\,0\\.25\\)\\] { border-color: var(--border-default) !important; }
        .deal-maker-theme .border-\\[rgba\\(14\\,165\\,233\\,0\\.55\\)\\] { border-color: var(--border-focus) !important; }
        .deal-maker-theme .bg-\\[rgba\\(14\\,165\\,233\\,0\\.05\\)\\] { background-color: var(--surface-elevated) !important; }
        .deal-maker-theme .bg-\\[\\#0EA5E9\\] { background-color: var(--accent-sky) !important; }
        .deal-maker-theme .shadow-\\[0_0_12px_rgba\\(14\\,165\\,233\\,0\\.4\\)\\] { box-shadow: var(--shadow-card) !important; }
        .deal-maker-theme .bg-\\[\\#0EA5E9\\].text-white { color: var(--text-inverse) !important; }
        .deal-maker-theme [style*="#ffffff"] { color: var(--text-heading) !important; }
        .deal-maker-theme [style*="background: #000000"],
        .deal-maker-theme [style*="background:#000000"] { background: var(--surface-base) !important; }
      `}</style>

      {/* Back Navigation + Strategy Selector */}
      <div className="px-4 sm:px-6 pt-3">
        {backTo && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-heading)] transition-colors mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {backTo.label}
          </button>
        )}

        {/* Strategy Selector - responsive grid, expands with worksheet width */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pb-3 w-full">
          {['Long-term', 'Short-term', 'BRRRR', 'Fix & Flip', 'House Hack', 'Wholesale'].map((strategy) => (
            <button
              key={strategy}
              onClick={() => handleStrategyChange(strategy)}
              className={`w-full min-w-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                currentStrategy === strategy
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)] shadow-[var(--shadow-card)]'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-card-hover)]'
              }`}
            >
              {strategy}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div
        className="mx-4 sm:mx-6 mb-4 rounded-xl px-4 sm:px-5 py-3"
        style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {isCalculating && (
          <div className="flex items-center justify-center gap-2 py-1 text-[10px] text-[var(--accent-sky)]">
            <div className="w-2 h-2 bg-[var(--accent-sky)] rounded-full animate-pulse" />
            Recalculating...
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1.5">
          {headerMetrics.map((metric, index) => (
            <div key={index} className="flex justify-between sm:flex-col sm:text-center items-center sm:items-stretch py-0.5 sm:py-1">
              <span className="text-xs text-[var(--text-secondary)]">{metric.label}</span>
              <span 
                className={`text-[13px] sm:text-base font-semibold tabular-nums ${isCalculating ? 'opacity-60' : ''}`}
                style={{ color: getValueColor(metric.color) }}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Worksheet */}
      <DealMakerWorksheet
        strategyType={strategyType}
        state={state}
        metrics={metrics}
        listPrice={listPrice ?? (state as LTRDealMakerState).buyPrice ?? 0}
        updateState={updateState}
        isCalculating={isCalculating || backendCalculating}
      />


      {/* Floating "See Results" Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[960px] mx-auto px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-black via-black to-transparent pointer-events-none z-20">
        <button
          onClick={() => void handleSeeResults()}
          disabled={isSavingForNavigate}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-8 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] pointer-events-auto whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ 
            background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
            boxShadow: '0 0 30px rgba(14, 165, 233, 0.3), 0 4px 20px rgba(14, 165, 233, 0.2)'
          }}
        >
          {isSavingForNavigate ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              See Results
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </>
          )}
        </button>
      </div>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}

export default DealMakerScreen
