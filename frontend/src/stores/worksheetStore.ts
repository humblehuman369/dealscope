import { create } from 'zustand'
import { 
  YearlyProjection, 
  ProjectionAssumptions, 
  calculate10YearProjections,
  calculateProjectionSummary,
  ProjectionSummary
} from '@/lib/projections'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 2000

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
  setActiveSection: (section: string) => void
  setViewMode: (mode: 'monthly' | 'yearly') => void
  markSaved: () => void
  reset: () => void
  saveToBackend: () => Promise<void>
  debouncedSave: () => void
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
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  activeSection: 'analysis',
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
    get().recalculate()
    get().debouncedSave()
  },

  updateMultipleAssumptions: (updates) => {
    set((state) => ({
      assumptions: { ...state.assumptions, ...updates },
      isDirty: true,
    }))
    get().recalculate()
    get().debouncedSave()
  },

  recalculate: () => {
    const { assumptions } = get()
    
    // Calculate 30-year projections
    const projections = calculate10YearProjections(assumptions)
    
    // Calculate total cash invested (down payment + closing costs + rehab)
    const downPayment = assumptions.purchasePrice * (assumptions.downPaymentPct / 100)
    const totalCashInvested = downPayment + assumptions.closingCosts + assumptions.rehabCosts
    
    const summary = calculateProjectionSummary(projections, totalCashInvested)
    
    set({ projections, summary })
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
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      activeSection: 'analysis',
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
      
      const response = await fetch(`${API_BASE_URL}/api/v1/saved-properties/${propertyId}`, {
        method: 'PUT',
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
  const { assumptions, projections } = useWorksheetStore()
  
  // Calculate derived values
  const loanAmount = assumptions.purchasePrice * (1 - assumptions.downPaymentPct)
  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
  const totalCashNeeded = downPayment + assumptions.closingCosts + assumptions.rehabCosts
  
  // Year 1 values
  const year1 = projections[0] || {
    grossRent: assumptions.monthlyRent * 12,
    effectiveRent: assumptions.monthlyRent * 12 * (1 - assumptions.vacancyRate),
    operatingExpenses: 0,
    noi: 0,
    debtService: 0,
    cashFlow: 0,
  }
  
  const annualGrossRent = assumptions.monthlyRent * 12
  const vacancy = annualGrossRent * assumptions.vacancyRate
  const effectiveGrossIncome = annualGrossRent - vacancy
  
  const propertyManagement = effectiveGrossIncome * assumptions.managementPct
  const maintenance = effectiveGrossIncome * assumptions.maintenancePct
  const capex = effectiveGrossIncome * assumptions.capexReservePct
  
  const totalOperatingExpenses = 
    assumptions.propertyTaxes + 
    assumptions.insurance + 
    propertyManagement + 
    maintenance + 
    capex + 
    assumptions.hoaFees + 
    assumptions.utilities + 
    assumptions.landscaping + 
    assumptions.miscExpenses
  
  const noi = effectiveGrossIncome - totalOperatingExpenses
  
  // Financing calculations
  const monthlyRate = assumptions.interestRate / 12
  const numPayments = assumptions.loanTermYears * 12
  const monthlyPayment = loanAmount > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0
  const annualDebtService = monthlyPayment * 12
  
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  
  // Returns
  const capRate = assumptions.purchasePrice > 0 ? (noi / assumptions.purchasePrice) * 100 : 0
  const cashOnCash = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0
  
  // Ratios
  const ltv = assumptions.purchasePrice > 0 ? (loanAmount / assumptions.purchasePrice) * 100 : 0
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  const rentToValue = assumptions.purchasePrice > 0 ? (assumptions.monthlyRent / assumptions.purchasePrice) * 100 : 0
  const grm = assumptions.monthlyRent > 0 ? assumptions.purchasePrice / (assumptions.monthlyRent * 12) : 0
  const breakEvenRatio = annualGrossRent > 0 ? ((totalOperatingExpenses + annualDebtService) / annualGrossRent) * 100 : 0
  
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

