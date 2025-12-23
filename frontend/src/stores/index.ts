import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface FinancingAssumptions {
  purchase_price: number | null
  down_payment_pct: number
  interest_rate: number
  loan_term_years: number
  closing_costs_pct: number
}

export interface OperatingAssumptions {
  vacancy_rate: number
  property_management_pct: number
  maintenance_pct: number
  insurance_annual: number
  utilities_monthly: number
  landscaping_annual: number
  pest_control_annual: number
}

export interface STRAssumptions {
  platform_fees_pct: number
  str_management_pct: number
  cleaning_cost_per_turnover: number
  cleaning_fee_revenue: number
  avg_length_of_stay_days: number
  supplies_monthly: number
  additional_utilities_monthly: number
  furniture_setup_cost: number
  str_insurance_annual: number
}

export interface RehabAssumptions {
  renovation_budget: number
  contingency_pct: number
  holding_period_months: number
  monthly_holding_costs: number
}

export interface BRRRRAssumptions {
  purchase_discount_pct: number
  refinance_ltv: number
  refinance_interest_rate: number
  refinance_term_years: number
  refinance_closing_costs: number
  post_rehab_rent_increase_pct: number
}

export interface FlipAssumptions {
  hard_money_ltv: number
  hard_money_rate: number
  selling_costs_pct: number
  holding_period_months: number
}

export interface HouseHackAssumptions {
  fha_down_payment_pct: number
  fha_mip_rate: number
  units_rented_out: number
  room_rent_monthly: number
  owner_unit_market_rent: number
}

export interface WholesaleAssumptions {
  assignment_fee: number
  marketing_costs: number
  earnest_money_deposit: number
  days_to_close: number
  target_purchase_discount_pct: number
}

export interface AllAssumptions {
  financing: FinancingAssumptions
  operating: OperatingAssumptions
  str: STRAssumptions
  rehab: RehabAssumptions
  brrrr: BRRRRAssumptions
  flip: FlipAssumptions
  house_hack: HouseHackAssumptions
  wholesale: WholesaleAssumptions
  appreciation_rate: number
  rent_growth_rate: number
  expense_growth_rate: number
}

// Default values from Excel workbook Assumptions Reference
export const DEFAULT_ASSUMPTIONS: AllAssumptions = {
  financing: {
    purchase_price: null,
    down_payment_pct: 0.20,
    interest_rate: 0.075,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
  },
  operating: {
    vacancy_rate: 0.05,
    property_management_pct: 0.10,
    maintenance_pct: 0.10,
    insurance_annual: 500,
    utilities_monthly: 75,
    landscaping_annual: 500,
    pest_control_annual: 200,
  },
  str: {
    platform_fees_pct: 0.15,
    str_management_pct: 0.20,
    cleaning_cost_per_turnover: 200,
    cleaning_fee_revenue: 75,
    avg_length_of_stay_days: 6,
    supplies_monthly: 100,
    additional_utilities_monthly: 125,
    furniture_setup_cost: 6000,
    str_insurance_annual: 1500,
  },
  rehab: {
    renovation_budget: 40000,
    contingency_pct: 0.10,
    holding_period_months: 4,
    monthly_holding_costs: 2000,
  },
  brrrr: {
    purchase_discount_pct: 0.20,
    refinance_ltv: 0.75,
    refinance_interest_rate: 0.07,
    refinance_term_years: 30,
    refinance_closing_costs: 3500,
    post_rehab_rent_increase_pct: 0.10,
  },
  flip: {
    hard_money_ltv: 0.90,
    hard_money_rate: 0.12,
    selling_costs_pct: 0.08,
    holding_period_months: 6,
  },
  house_hack: {
    fha_down_payment_pct: 0.035,
    fha_mip_rate: 0.0085,
    units_rented_out: 2,
    room_rent_monthly: 900,
    owner_unit_market_rent: 1500,
  },
  wholesale: {
    assignment_fee: 15000,
    marketing_costs: 500,
    earnest_money_deposit: 1000,
    days_to_close: 45,
    target_purchase_discount_pct: 0.30,
  },
  appreciation_rate: 0.05,
  rent_growth_rate: 0.03,
  expense_growth_rate: 0.03,
}

// Store interface
interface AssumptionsStore {
  assumptions: AllAssumptions
  propertyOverrides: Record<string, Partial<AllAssumptions>>
  
  // Actions
  setAssumption: <K extends keyof AllAssumptions>(
    category: K,
    key: keyof AllAssumptions[K],
    value: any
  ) => void
  setPropertyOverride: (propertyId: string, overrides: Partial<AllAssumptions>) => void
  getAssumptionsForProperty: (propertyId: string) => AllAssumptions
  resetToDefaults: () => void
  resetPropertyOverrides: (propertyId: string) => void
}

// Create the store with persistence
export const useAssumptionsStore = create<AssumptionsStore>()(
  persist(
    (set, get) => ({
      assumptions: DEFAULT_ASSUMPTIONS,
      propertyOverrides: {},
      
      setAssumption: (category, key, value) =>
        set((state) => ({
          assumptions: {
            ...state.assumptions,
            [category]: {
              ...(state.assumptions[category] as any),
              [key]: value,
            },
          },
        })),
      
      setPropertyOverride: (propertyId, overrides) =>
        set((state) => ({
          propertyOverrides: {
            ...state.propertyOverrides,
            [propertyId]: {
              ...state.propertyOverrides[propertyId],
              ...overrides,
            },
          },
        })),
      
      getAssumptionsForProperty: (propertyId) => {
        const state = get()
        const overrides = state.propertyOverrides[propertyId]
        if (!overrides) return state.assumptions
        
        return deepMerge(state.assumptions, overrides)
      },
      
      resetToDefaults: () =>
        set({ assumptions: DEFAULT_ASSUMPTIONS }),
      
      resetPropertyOverrides: (propertyId) =>
        set((state) => {
          const { [propertyId]: _, ...rest } = state.propertyOverrides
          return { propertyOverrides: rest }
        }),
    }),
    {
      name: 'investiq-assumptions',
    }
  )
)

// Helper function for deep merging
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as T & Record<string, unknown>
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof T]
      const targetValue = target[key as keyof T]
      
      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        )
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue
      }
    }
  }
  
  return result as T
}

// Current property info for header display
export interface CurrentPropertyInfo {
  propertyId: string
  address: string
  city: string
  state: string
  zipCode: string
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  estimatedValue: number | null
}

// Property store
interface PropertyStore {
  currentPropertyId: string | null
  currentProperty: CurrentPropertyInfo | null
  recentSearches: Array<{ address: string; propertyId: string; timestamp: number }>
  
  setCurrentProperty: (propertyId: string) => void
  setCurrentPropertyInfo: (info: CurrentPropertyInfo) => void
  clearCurrentProperty: () => void
  addRecentSearch: (address: string, propertyId: string) => void
  clearRecentSearches: () => void
}

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set, get) => ({
      currentPropertyId: null,
      currentProperty: null,
      recentSearches: [],
      
      setCurrentProperty: (propertyId) =>
        set({ currentPropertyId: propertyId }),
      
      setCurrentPropertyInfo: (info) =>
        set({ currentPropertyId: info.propertyId, currentProperty: info }),
      
      clearCurrentProperty: () =>
        set({ currentPropertyId: null, currentProperty: null }),
      
      addRecentSearch: (address, propertyId) =>
        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentSearches.filter(
            (s) => s.propertyId !== propertyId
          )
          // Add to front, keep max 10
          return {
            recentSearches: [
              { address, propertyId, timestamp: Date.now() },
              ...filtered,
            ].slice(0, 10),
          }
        }),
      
      clearRecentSearches: () =>
        set({ recentSearches: [] }),
    }),
    {
      name: 'investiq-property',
    }
  )
)

// UI store
interface UIStore {
  activeStrategy: string
  showAssumptionsPanel: boolean
  showDataProvenance: boolean
  
  setActiveStrategy: (strategy: string) => void
  toggleAssumptionsPanel: () => void
  toggleDataProvenance: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeStrategy: 'ltr',
  showAssumptionsPanel: false,
  showDataProvenance: true,
  
  setActiveStrategy: (strategy) =>
    set({ activeStrategy: strategy }),
  
  toggleAssumptionsPanel: () =>
    set((state) => ({ showAssumptionsPanel: !state.showAssumptionsPanel })),
  
  toggleDataProvenance: () =>
    set((state) => ({ showDataProvenance: !state.showDataProvenance })),
}))
