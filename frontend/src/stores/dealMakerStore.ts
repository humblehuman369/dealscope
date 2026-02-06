import { create } from 'zustand'
import { PriceTarget } from '@/lib/priceUtils'
import { getAccessToken } from '@/lib/api'

/**
 * Deal Maker Store
 * 
 * The central store for Deal Maker data. This is the single source of truth for:
 * - Deal Maker screen
 * - IQ Verdict
 * - Strategy worksheets
 * - Dashboard cards
 * 
 * Key principles:
 * - Loads from backend (never computes defaults locally)
 * - All changes persist immediately to backend
 * - initial_assumptions are immutable (locked at save time)
 * - Metrics are recalculated on every update (backend-driven)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const SAVE_DEBOUNCE_MS = 300

// Debounce helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// ============================================
// Types matching backend schemas
// ============================================

export interface InitialAssumptions {
  down_payment_pct: number
  closing_costs_pct: number
  interest_rate: number
  loan_term_years: number
  vacancy_rate: number
  maintenance_pct: number
  management_pct: number
  insurance_pct: number
  capex_pct: number
  appreciation_rate: number
  rent_growth_rate: number
  expense_growth_rate: number
  resolved_at?: string
  zip_code?: string
  market_region?: string
  str_defaults?: Record<string, unknown>
  brrrr_defaults?: Record<string, unknown>
  flip_defaults?: Record<string, unknown>
}

export interface CachedMetrics {
  cap_rate: number | null
  cash_on_cash: number | null
  monthly_cash_flow: number | null
  annual_cash_flow: number | null
  loan_amount: number | null
  down_payment: number | null
  closing_costs: number | null
  monthly_payment: number | null
  total_cash_needed: number | null
  gross_income: number | null
  vacancy_loss: number | null
  total_expenses: number | null
  noi: number | null
  dscr: number | null
  ltv: number | null
  one_percent_rule: number | null
  grm: number | null
  equity: number | null
  equity_after_rehab: number | null
  deal_gap_pct: number | null
  breakeven_price: number | null
  calculated_at?: string
}

export interface DealMakerRecord {
  // Property data (from API at search time)
  list_price: number
  rent_estimate: number
  property_taxes: number
  insurance: number
  arv_estimate: number | null
  sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  year_built: number | null
  property_type: string | null
  
  // Initial assumptions (locked at creation)
  initial_assumptions: InitialAssumptions
  
  // User adjustments (editable via Deal Maker) - Shared fields
  buy_price: number
  down_payment_pct: number
  closing_costs_pct: number
  interest_rate: number
  loan_term_years: number
  rehab_budget: number
  arv: number
  maintenance_pct: number
  capex_pct: number
  annual_property_tax: number
  annual_insurance: number
  monthly_hoa: number
  monthly_utilities: number
  
  // LTR-specific adjustments
  monthly_rent: number
  other_income: number
  vacancy_rate: number
  management_pct: number
  
  // STR-specific adjustments (optional - only present for STR strategy)
  furniture_setup_cost?: number
  average_daily_rate?: number
  occupancy_rate?: number
  cleaning_fee_revenue?: number
  avg_length_of_stay_days?: number
  platform_fee_rate?: number
  str_management_rate?: number
  cleaning_cost_per_turnover?: number
  supplies_monthly?: number
  additional_utilities_monthly?: number
  
  // BRRRR-specific adjustments (optional - only present for BRRRR strategy)
  buy_discount_pct?: number
  hard_money_rate?: number
  contingency_pct?: number
  holding_period_months?: number
  holding_costs_monthly?: number
  post_rehab_monthly_rent?: number
  post_rehab_rent_increase_pct?: number
  refinance_ltv?: number
  refinance_interest_rate?: number
  refinance_term_years?: number
  refinance_closing_costs_pct?: number
  
  // Flip-specific adjustments (optional - only present for Flip strategy)
  purchase_discount_pct?: number
  financing_type?: string
  hard_money_ltv?: number
  loan_points?: number
  rehab_time_months?: number
  days_on_market?: number
  selling_costs_pct?: number
  capital_gains_rate?: number
  
  // HouseHack-specific adjustments (optional - only present for HouseHack strategy)
  total_units?: number
  owner_occupied_units?: number
  owner_unit_market_rent?: number
  loan_type?: string
  pmi_rate?: number
  avg_rent_per_unit?: number
  current_housing_payment?: number
  utilities_monthly?: number
  capex_rate?: number
  
  // Wholesale-specific adjustments (optional - only present for Wholesale strategy)
  estimated_repairs?: number
  contract_price?: number
  earnest_money?: number
  inspection_period_days?: number
  days_to_close?: number
  assignment_fee?: number
  marketing_costs?: number
  wholesale_closing_costs?: number
  
  // Strategy type
  strategy_type?: 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'
  
  // Cached metrics
  cached_metrics: CachedMetrics | null
  
  // Metadata
  created_at?: string
  updated_at?: string
  version: number
}

export interface DealMakerResponse {
  record: DealMakerRecord
  cash_needed: number | null
  deal_gap: number | null
  annual_profit: number | null
  cap_rate: number | null
  coc_return: number | null
  monthly_payment: number | null
}

// Update payload (only user-adjustable fields)
export interface DealMakerUpdate {
  // Shared fields
  buy_price?: number
  down_payment_pct?: number
  closing_costs_pct?: number
  interest_rate?: number
  loan_term_years?: number
  rehab_budget?: number
  arv?: number
  maintenance_pct?: number
  capex_pct?: number
  annual_property_tax?: number
  annual_insurance?: number
  monthly_hoa?: number
  monthly_utilities?: number
  
  // LTR-specific fields
  monthly_rent?: number
  other_income?: number
  vacancy_rate?: number
  management_pct?: number
  
  // STR-specific fields
  furniture_setup_cost?: number
  average_daily_rate?: number
  occupancy_rate?: number
  cleaning_fee_revenue?: number
  avg_length_of_stay_days?: number
  platform_fee_rate?: number
  str_management_rate?: number
  cleaning_cost_per_turnover?: number
  supplies_monthly?: number
  additional_utilities_monthly?: number
  
  // BRRRR-specific fields
  buy_discount_pct?: number
  hard_money_rate?: number
  contingency_pct?: number
  holding_period_months?: number
  holding_costs_monthly?: number
  post_rehab_monthly_rent?: number
  post_rehab_rent_increase_pct?: number
  refinance_ltv?: number
  refinance_interest_rate?: number
  refinance_term_years?: number
  refinance_closing_costs_pct?: number
  
  // Flip-specific fields
  purchase_discount_pct?: number
  financing_type?: string
  hard_money_ltv?: number
  loan_points?: number
  rehab_time_months?: number
  days_on_market?: number
  selling_costs_pct?: number
  capital_gains_rate?: number
  
  // HouseHack-specific fields
  total_units?: number
  owner_occupied_units?: number
  owner_unit_market_rent?: number
  loan_type?: string
  pmi_rate?: number
  avg_rent_per_unit?: number
  current_housing_payment?: number
  utilities_monthly?: number
  capex_rate?: number
  
  // Wholesale-specific fields
  estimated_repairs?: number
  contract_price?: number
  earnest_money?: number
  inspection_period_days?: number
  days_to_close?: number
  assignment_fee?: number
  marketing_costs?: number
  wholesale_closing_costs?: number
  
  // Strategy type
  strategy_type?: 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'
}

// ============================================
// Store State
// ============================================

export interface DealMakerState {
  // Current property
  propertyId: string | null
  record: DealMakerRecord | null
  
  // Active price target for dynamic recalculation
  activePriceTarget: PriceTarget
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // Dirty tracking
  isDirty: boolean
  pendingUpdates: DealMakerUpdate
  
  // Actions
  loadRecord: (propertyId: string) => Promise<void>
  updateField: <K extends keyof DealMakerUpdate>(field: K, value: DealMakerUpdate[K]) => void
  updateMultipleFields: (updates: DealMakerUpdate) => void
  saveToBackend: () => Promise<void>
  debouncedSave: () => void
  reset: () => void
  setActivePriceTarget: (target: PriceTarget) => void
  
  // Computed helpers
  getMetrics: () => CachedMetrics | null
  getCashNeeded: () => number
  getDealGap: () => number
  getAnnualProfit: () => number
  getCapRate: () => number
  getCocReturn: () => number
  getMonthlyPayment: () => number
  getActivePriceValue: () => number
}

// ============================================
// Store Implementation
// ============================================

export const useDealMakerStore = create<DealMakerState>((set, get) => ({
  propertyId: null,
  record: null,
  activePriceTarget: 'targetBuy' as PriceTarget,
  isLoading: false,
  isSaving: false,
  error: null,
  isDirty: false,
  pendingUpdates: {},

  loadRecord: async (propertyId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/saved/${propertyId}/deal-maker`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to load Deal Maker record')
      }
      
      const data: DealMakerResponse = await response.json()
      
      set({
        propertyId,
        record: data.record,
        isLoading: false,
        isDirty: false,
        pendingUpdates: {},
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Deal Maker record'
      set({
        error: message,
        isLoading: false,
      })
      console.error('Failed to load Deal Maker record:', error)
    }
  },

  updateField: (field, value) => {
    const { record, pendingUpdates } = get()
    
    if (!record) return
    
    // Update local state immediately for responsive UI
    const updatedRecord = {
      ...record,
      [field]: value,
    }
    
    // Track pending updates for debounced save
    const newPendingUpdates = {
      ...pendingUpdates,
      [field]: value,
    }
    
    set({
      record: updatedRecord,
      isDirty: true,
      pendingUpdates: newPendingUpdates,
    })
    
    // Trigger debounced save
    get().debouncedSave()
  },

  updateMultipleFields: (updates) => {
    const { record, pendingUpdates } = get()
    
    if (!record) return
    
    // Update local state immediately
    const updatedRecord = {
      ...record,
      ...updates,
    }
    
    // Track pending updates
    const newPendingUpdates = {
      ...pendingUpdates,
      ...updates,
    }
    
    set({
      record: updatedRecord,
      isDirty: true,
      pendingUpdates: newPendingUpdates,
    })
    
    // Trigger debounced save
    get().debouncedSave()
  },

  saveToBackend: async () => {
    const { propertyId, pendingUpdates, isDirty } = get()
    
    if (!propertyId || !isDirty || Object.keys(pendingUpdates).length === 0) {
      return
    }
    
    set({ isSaving: true })
    
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/properties/saved/${propertyId}/deal-maker`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pendingUpdates),
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to save Deal Maker record')
      }
      
      const data: DealMakerResponse = await response.json()
      
      // Update with server response (includes recalculated metrics)
      set({
        record: data.record,
        isSaving: false,
        isDirty: false,
        pendingUpdates: {},
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Deal Maker record'
      set({
        error: message,
        isSaving: false,
      })
      console.error('Failed to save Deal Maker record:', error)
    }
  },

  debouncedSave: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(() => {
      get().saveToBackend()
    }, SAVE_DEBOUNCE_MS)
  },

  reset: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    set({
      propertyId: null,
      record: null,
      activePriceTarget: 'targetBuy' as PriceTarget,
      isLoading: false,
      isSaving: false,
      error: null,
      isDirty: false,
      pendingUpdates: {},
    })
  },

  setActivePriceTarget: (target: PriceTarget) => {
    set({ activePriceTarget: target })
  },

  // Computed helpers with safe defaults
  getMetrics: () => {
    return get().record?.cached_metrics || null
  },

  getCashNeeded: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.total_cash_needed || 0
  },

  getDealGap: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.deal_gap_pct || 0
  },

  getAnnualProfit: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.annual_cash_flow || 0
  },

  getCapRate: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.cap_rate || 0
  },

  getCocReturn: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.cash_on_cash || 0
  },

  getMonthlyPayment: () => {
    const metrics = get().record?.cached_metrics
    return metrics?.monthly_payment || 0
  },

  getActivePriceValue: () => {
    const { activePriceTarget, record } = get()
    const metrics = record?.cached_metrics
    
    if (!record || !metrics) return 0
    
    switch (activePriceTarget) {
      case 'breakeven':
        return metrics.breakeven_price || 0
      case 'targetBuy':
        return record.buy_price || 0
      case 'wholesale':
        // Wholesale is typically 70% of breakeven
        return Math.round((metrics.breakeven_price || 0) * 0.70)
      default:
        return record.buy_price || 0
    }
  },
}))

// ============================================
// Selectors / Derived State
// ============================================

/**
 * Hook to get derived Deal Maker values with safe number handling
 */
export const useDealMakerDerived = () => {
  const record = useDealMakerStore((state) => state.record)
  const metrics = record?.cached_metrics
  
  // Safe number function that handles NaN, Infinity, and extremely large values
  const safeNumber = (value?: number | null, maxAbs: number = 1e12): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    if (Math.abs(value) > maxAbs) return value > 0 ? maxAbs : -maxAbs
    return value
  }
  
  return {
    // Property data
    listPrice: safeNumber(record?.list_price),
    rentEstimate: safeNumber(record?.rent_estimate),
    
    // User adjustments
    buyPrice: safeNumber(record?.buy_price),
    monthlyRent: safeNumber(record?.monthly_rent),
    arv: safeNumber(record?.arv),
    rehabBudget: safeNumber(record?.rehab_budget),
    
    // Financing
    loanAmount: safeNumber(metrics?.loan_amount),
    downPayment: safeNumber(metrics?.down_payment),
    totalCashNeeded: safeNumber(metrics?.total_cash_needed),
    monthlyPayment: safeNumber(metrics?.monthly_payment),
    ltv: safeNumber(metrics?.ltv),
    
    // Income
    grossIncome: safeNumber(metrics?.gross_income),
    vacancyLoss: safeNumber(metrics?.vacancy_loss),
    
    // Expenses
    totalExpenses: safeNumber(metrics?.total_expenses),
    
    // Cash Flow
    noi: safeNumber(metrics?.noi),
    annualCashFlow: safeNumber(metrics?.annual_cash_flow),
    monthlyCashFlow: safeNumber(metrics?.monthly_cash_flow),
    
    // Returns
    capRate: safeNumber(metrics?.cap_rate),
    cashOnCash: safeNumber(metrics?.cash_on_cash),
    
    // Ratios
    dscr: safeNumber(metrics?.dscr),
    onePercentRule: safeNumber(metrics?.one_percent_rule),
    grm: safeNumber(metrics?.grm),
    
    // Equity
    equity: safeNumber(metrics?.equity),
    equityAfterRehab: safeNumber(metrics?.equity_after_rehab),
    
    // Deal Analysis
    dealGapPct: safeNumber(metrics?.deal_gap_pct),
    breakevenPrice: safeNumber(metrics?.breakeven_price),
    
    // Has record loaded?
    hasRecord: record !== null,
  }
}

/**
 * Hook to check if Deal Maker is ready
 */
export const useDealMakerReady = () => {
  const { record, isLoading, error } = useDealMakerStore()
  return {
    isReady: record !== null && !isLoading,
    isLoading,
    error,
    hasRecord: record !== null,
  }
}
