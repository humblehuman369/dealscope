import { create } from 'zustand'
import { 
  YearlyProjection, 
  ProjectionAssumptions, 
  calculate10YearProjections,
  calculateProjectionSummary,
  ProjectionSummary
} from '@/lib/projections'

// Use relative paths for API calls to go through Next.js API routes
const API_BASE_URL = ''
const WORKSHEET_API_URL = '/api/v1/worksheet/ltr/calculate'
const CALC_DEBOUNCE_MS = 150

// Debounce helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_MS = 2000
let calcTimeout: ReturnType<typeof setTimeout> | null = null

// Extended assumptions for worksheet
export interface WorksheetAssumptions extends ProjectionAssumptions {
  // Additional worksheet-specific fields
  rehabCosts: number
  closingCosts: number
  arv: number
  hoaFees: number
  utilities: number
  landscaping: number
  miscExpenses: number
  
  // Tax assumptions
  incomeTaxRate: number
  depreciationYears: number
  landValuePercent: number
}

export interface WorksheetState {
  propertyId: string | null
  propertyData: any | null
  assumptions: WorksheetAssumptions
  projections: YearlyProjection[]
  summary: ProjectionSummary | null
  worksheetMetrics: WorksheetMetrics | null
  isCalculating: boolean
  calculationError: string | null
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  activeSection: string
  viewMode: 'monthly' | 'yearly'
  
  // Actions
  initializeFromProperty: (property: any) => void
  updateAssumption: <K extends keyof WorksheetAssumptions>(key: K, value: WorksheetAssumptions[K]) => void
  updateMultipleAssumptions: (updates: Partial<WorksheetAssumptions>) => void
  recalculate: () => void
  recalculateProjections: () => void
  recalculateWorksheetMetrics: () => void
  setActiveSection: (section: string) => void
  setViewMode: (mode: 'monthly' | 'yearly') => void
  markSaved: () => void
  reset: () => void
  saveToBackend: () => Promise<void>
  debouncedSave: () => void
}

export interface WorksheetMetrics {
  gross_income: number
  annual_gross_rent: number
  vacancy_loss: number
  gross_expenses: number
  property_taxes: number
  insurance: number
  property_management: number
  maintenance: number
  maintenance_only: number
  capex: number
  hoa_fees: number
  loan_amount: number
  down_payment: number
  closing_costs: number
  monthly_payment: number
  annual_debt_service: number
  noi: number
  monthly_cash_flow: number
  annual_cash_flow: number
  cap_rate: number
  cash_on_cash_return: number
  dscr: number
  grm: number
  one_percent_rule: number
  arv: number
  arv_psf: number
  price_psf: number
  rehab_psf: number
  equity: number
  equity_after_rehab: number
  mao: number
  total_cash_needed: number
  ltv: number
  deal_score: number
}

const defaultAssumptions: WorksheetAssumptions = {
  // Property
  purchasePrice: 0,
  downPaymentPct: 0.20,
  closingCostsPct: 0.03,
  closingCosts: 0,
  rehabCosts: 0,
  arv: 0,
  
  // Financing
  interestRate: 0.07,
  loanTermYears: 30,
  
  // Income
  monthlyRent: 0,
  annualRentGrowth: 0.03,
  vacancyRate: 0.08,
  
  // Expenses
  propertyTaxes: 0,
  insurance: 0,
  propertyTaxGrowth: 0.02,
  insuranceGrowth: 0.03,
  managementPct: 0.08,
  maintenancePct: 0.05,
  capexReservePct: 0.05,
  hoaFees: 0,
  utilities: 0,
  landscaping: 0,
  miscExpenses: 0,
  
  // Appreciation
  annualAppreciation: 0.03,
  
  // Tax
  incomeTaxRate: 0.25,
  depreciationYears: 27.5,
  landValuePercent: 0.20,
}

export const useWorksheetStore = create<WorksheetState>((set, get) => ({
  propertyId: null,
  propertyData: null,
  assumptions: { ...defaultAssumptions },
  projections: [],
  summary: null,
  worksheetMetrics: null,
  isCalculating: false,
  calculationError: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  activeSection: 'property-details',
  viewMode: 'yearly',

  initializeFromProperty: (property: any) => {
    const data = property.property_data_snapshot || {}
    const savedAssumptions = property.worksheet_assumptions || {}
    
    const assumptions: WorksheetAssumptions = {
      ...defaultAssumptions,
      purchasePrice: data.listPrice || 0,
      monthlyRent: data.monthlyRent || 0,
      propertyTaxes: data.propertyTaxes || 0,
      insurance: data.insurance || 0,
      arv: data.arv || data.listPrice || 0,
      closingCosts: (data.listPrice || 0) * 0.03,
      ...savedAssumptions,
    }
    
    set({
      propertyId: property.id,
      propertyData: property,
      assumptions,
      isDirty: false,
    })
    
    // Trigger initial calculation
    get().recalculate()
  },

  updateAssumption: (key, value) => {
    set((state) => ({
      assumptions: { ...state.assumptions, [key]: value },
      isDirty: true,
    }))
    get().recalculateProjections()
    get().recalculateWorksheetMetrics()
    get().debouncedSave()
  },

  updateMultipleAssumptions: (updates) => {
    set((state) => ({
      assumptions: { ...state.assumptions, ...updates },
      isDirty: true,
    }))
    get().recalculateProjections()
    get().recalculateWorksheetMetrics()
    get().debouncedSave()
  },

  recalculate: () => {
    get().recalculateProjections()
    get().recalculateWorksheetMetrics()
  },

  recalculateProjections: () => {
    const { assumptions } = get()
    
    // Calculate 30-year projections
    const projections = calculate10YearProjections(assumptions)
    
    // Calculate total cash invested (down payment + closing costs + rehab)
    const downPayment = assumptions.purchasePrice * (assumptions.downPaymentPct / 100)
    const totalCashInvested = downPayment + assumptions.closingCosts + assumptions.rehabCosts
    
    const summary = calculateProjectionSummary(projections, totalCashInvested)
    
    set({ projections, summary })
  },

  recalculateWorksheetMetrics: () => {
    if (calcTimeout) {
      clearTimeout(calcTimeout)
    }

    calcTimeout = setTimeout(async () => {
      const { assumptions, propertyData } = get()
      if (!assumptions.purchasePrice) {
        set({ worksheetMetrics: null })
        return
      }

      const sqft = propertyData?.property_data_snapshot?.sqft || undefined
      const payload = {
        purchase_price: assumptions.purchasePrice,
        monthly_rent: assumptions.monthlyRent,
        property_taxes_annual: assumptions.propertyTaxes,
        insurance_annual: assumptions.insurance,
        down_payment_pct: assumptions.downPaymentPct,
        interest_rate: assumptions.interestRate,
        loan_term_years: assumptions.loanTermYears,
        closing_costs: assumptions.closingCosts,
        rehab_costs: assumptions.rehabCosts,
        vacancy_rate: assumptions.vacancyRate,
        property_management_pct: assumptions.managementPct,
        maintenance_pct: assumptions.maintenancePct,
        capex_pct: assumptions.capexReservePct,
        hoa_monthly: assumptions.hoaFees,
        arv: assumptions.arv,
        sqft,
      }

      set({ isCalculating: true, calculationError: null })

      try {
        const response = await fetch(WORKSHEET_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Failed to calculate worksheet metrics')
        }

        set({
          worksheetMetrics: data,
          isCalculating: false,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate worksheet metrics'
        set({
          calculationError: message,
          isCalculating: false,
        })
      }
    }, CALC_DEBOUNCE_MS)
  },

  setActiveSection: (section) => {
    set({ activeSection: section })
  },

  setViewMode: (mode) => {
    set({ viewMode: mode })
  },

  markSaved: () => {
    set({ isDirty: false, isSaving: false, lastSaved: new Date() })
  },

  reset: () => {
    set({
      propertyId: null,
      propertyData: null,
      assumptions: { ...defaultAssumptions },
      projections: [],
      summary: null,
      worksheetMetrics: null,
      isCalculating: false,
      calculationError: null,
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      activeSection: 'property-details',
      viewMode: 'yearly',
    })
  },

  saveToBackend: async () => {
    const { propertyId, assumptions, isDirty } = get()
    
    if (!propertyId || !isDirty) return
    
    set({ isSaving: true })
    
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.warn('No auth token, skipping save')
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${propertyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          worksheet_assumptions: assumptions,
        }),
      })
      
      if (response.ok) {
        set({ isDirty: false, isSaving: false, lastSaved: new Date() })
      } else {
        console.error('Failed to save worksheet:', await response.text())
        set({ isSaving: false })
      }
    } catch (error) {
      console.error('Error saving worksheet:', error)
      set({ isSaving: false })
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
}))

// Derived values / selectors
export const useWorksheetDerived = () => {
  const { assumptions, projections, worksheetMetrics } = useWorksheetStore()
  
  // Safe number function that handles NaN, Infinity, and extremely large values
  const safeNumber = (value?: number | null, maxAbs: number = 1e12): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    // Clamp to reasonable bounds to prevent display overflow
    if (Math.abs(value) > maxAbs) return value > 0 ? maxAbs : -maxAbs
    return value
  }
  const metrics = worksheetMetrics
  
  // Worksheet-calculated values (API-driven)
  const loanAmount = safeNumber(metrics?.loan_amount)
  const downPayment = safeNumber(metrics?.down_payment)
  const totalCashNeeded = safeNumber(metrics?.total_cash_needed)
  
  // Year 1 values
  const year1 = projections[0] || {
    grossRent: assumptions.monthlyRent * 12,
    effectiveRent: assumptions.monthlyRent * 12 * (1 - assumptions.vacancyRate),
    operatingExpenses: 0,
    noi: 0,
    debtService: 0,
    cashFlow: 0,
  }
  
  const annualGrossRent = safeNumber(metrics?.annual_gross_rent)
  const vacancy = safeNumber(metrics?.vacancy_loss)
  const effectiveGrossIncome = safeNumber(metrics?.gross_income)
  
  const propertyManagement = safeNumber(metrics?.property_management)
  const maintenance = safeNumber(metrics?.maintenance_only)
  const capex = safeNumber(metrics?.capex)
  
  const totalOperatingExpenses = safeNumber(metrics?.gross_expenses)
  const noi = safeNumber(metrics?.noi)
  
  const monthlyPayment = safeNumber(metrics?.monthly_payment)
  const annualDebtService = safeNumber(metrics?.annual_debt_service)
  
  const annualCashFlow = safeNumber(metrics?.annual_cash_flow)
  const monthlyCashFlow = safeNumber(metrics?.monthly_cash_flow)
  
  // Returns
  const capRate = safeNumber(metrics?.cap_rate)
  const cashOnCash = safeNumber(metrics?.cash_on_cash_return)
  
  // Ratios
  const ltv = safeNumber(metrics?.ltv)
  const dscr = safeNumber(metrics?.dscr)
  const rentToValue = safeNumber(metrics?.one_percent_rule) * 100
  const grm = safeNumber(metrics?.grm)
  const breakEvenRatio = annualGrossRent > 0
    ? ((totalOperatingExpenses + annualDebtService) / annualGrossRent) * 100
    : 0
  
  return {
    // Financing
    loanAmount,
    downPayment,
    totalCashNeeded,
    ltv,
    monthlyPayment,
    annualDebtService,
    
    // Income
    annualGrossRent,
    vacancy,
    effectiveGrossIncome,
    
    // Expenses breakdown
    propertyManagement,
    maintenance,
    capex,
    totalOperatingExpenses,
    
    // Cash Flow
    noi,
    annualCashFlow,
    monthlyCashFlow,
    
    // Returns
    capRate,
    cashOnCash,
    
    // Ratios
    dscr,
    rentToValue,
    grm,
    breakEvenRatio,
  }
}

