import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── One-time localStorage key migration (rebrand: investiq → dealgapiq) ─────
// Zustand persist uses `name` as the localStorage key.  Changing the key
// orphans previously-saved data.  This block runs once, synchronously, before
// any store hydrates — copying old-key data to the new key and removing the
// old entry so the migration is idempotent.
if (typeof window !== 'undefined') {
  const keyMigrations: [string, string][] = [
    // Zustand persist stores
    ['investiq-assumptions', 'dealgapiq-assumptions'],
    ['investiq-property', 'dealgapiq-property'],
    // Raw localStorage keys
    ['investiq-progressive-profile', 'dealgapiq-progressive-profile'],
    ['investiq_defaults', 'dealgapiq_defaults'],
    ['investiq_defaults_timestamp', 'dealgapiq_defaults_timestamp'],
    ['investiq-scenarios', 'dealgapiq-scenarios'],
    ['investiq-comparisons', 'dealgapiq-comparisons'],
    ['investiq_loi_buyer', 'dealgapiq_loi_buyer'],
  ]
  for (const [oldKey, newKey] of keyMigrations) {
    try {
      const oldData = localStorage.getItem(oldKey)
      if (oldData !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldData)
        localStorage.removeItem(oldKey)
      }
    } catch {
      // Storage access can throw in private/sandboxed contexts — safe to ignore
    }
  }
}

/**
 * IMPORTANT: Default Assumptions Architecture
 * 
 * The DEFAULT_ASSUMPTIONS below are FALLBACK VALUES ONLY.
 * 
 * The actual defaults should always be fetched from the API using:
 *   - useDefaults() hook for components
 *   - defaultsService.getDefaults() for services
 * 
 * These fallback values are used:
 *   1. During initial page load before API responds
 *   2. When offline or API is unavailable
 *   3. For type definitions
 * 
 * DO NOT reference DEFAULT_ASSUMPTIONS directly in components.
 * Always use the useDefaults() hook instead.
 * 
 * See docs/DEFAULTS_ARCHITECTURE.md for full details.
 */

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
  insurance_pct: number  // Percentage of purchase price (was fixed insurance_annual)
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
  str_insurance_pct: number  // Percentage of purchase price (was fixed str_insurance_annual)
  buy_discount_pct: number  // Discount below Income Value (0.05 = 5% below Income Value)
}

export interface RehabAssumptions {
  renovation_budget_pct: number  // Percentage of ARV (was fixed renovation_budget)
  contingency_pct: number
  holding_period_months: number
  holding_costs_pct: number  // Annual percentage of purchase price (was fixed monthly_holding_costs)
}

export interface BRRRRAssumptions {
  buy_discount_pct: number  // Discount below Income Value (0.05 = 5% below Income Value)
  refinance_ltv: number
  refinance_interest_rate: number
  refinance_term_years: number
  refinance_closing_costs_pct: number  // Percentage of refinance amount (was fixed refinance_closing_costs)
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
  buy_discount_pct: number  // Discount below Income Value (0.05 = 5% below Income Value)
  // Note: room_rent_monthly is now calculated as (estimatedRent / bedrooms) * units_rented_out
  // Note: owner_unit_market_rent is now calculated as estimatedRent / bedrooms
}

export interface WholesaleAssumptions {
  assignment_fee: number
  marketing_costs: number
  earnest_money_deposit: number
  days_to_close: number
  target_purchase_discount_pct: number
}

export interface LTRAssumptions {
  buy_discount_pct: number  // Discount below Income Value (0.05 = 5% below Income Value)
}

export interface AllAssumptions {
  financing: FinancingAssumptions
  operating: OperatingAssumptions
  ltr: LTRAssumptions
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

// Default values from updated default_assumptions.csv
export const DEFAULT_ASSUMPTIONS: AllAssumptions = {
  financing: {
    purchase_price: null,
    down_payment_pct: 0.20,        // 20%
    interest_rate: 0.06,           // 6% (was 7.5%)
    loan_term_years: 30,
    closing_costs_pct: 0.03,       // 3%
  },
  operating: {
    vacancy_rate: 0.01,            // 1% (was 5%)
    property_management_pct: 0.00, // 0% (was 10%)
    maintenance_pct: 0.05,         // 5% (was 10%)
    insurance_pct: 0.01,           // 1% of purchase price (was $500 fixed)
    utilities_monthly: 100,        // $100 (was $75)
    landscaping_annual: 0,         // $0 (was $500)
    pest_control_annual: 200,      // $200
  },
  ltr: {
    buy_discount_pct: 0.05,     // 5% below Income Value
  },
  str: {
    platform_fees_pct: 0.15,       // 15%
    str_management_pct: 0.10,      // 10% (was 20%)
    cleaning_cost_per_turnover: 150, // $150 (was $200)
    cleaning_fee_revenue: 75,      // $75
    avg_length_of_stay_days: 6,    // 6 days
    supplies_monthly: 100,         // $100
    additional_utilities_monthly: 0, // $0 (was $125)
    furniture_setup_cost: 6000,    // $6,000
    str_insurance_pct: 0.01,       // 1% of purchase price (was $1,500 fixed)
    buy_discount_pct: 0.05,     // 5% below Income Value
  },
  rehab: {
    renovation_budget_pct: 0.05,   // 5% of ARV (was $40,000 fixed)
    contingency_pct: 0.05,         // 5% (was 10%)
    holding_period_months: 4,      // 4 months
    holding_costs_pct: 0.01,       // 1% of purchase price annually (was $2,000/mo fixed)
  },
  brrrr: {
    buy_discount_pct: 0.05,     // 5% below Income Value (replaced purchase_discount_pct)
    refinance_ltv: 0.75,           // 75%
    refinance_interest_rate: 0.06, // 6% (was 7%)
    refinance_term_years: 30,      // 30 years
    refinance_closing_costs_pct: 0.03, // 3% of refinance amount (was $3,500 fixed)
    post_rehab_rent_increase_pct: 0.10, // 10%
  },
  flip: {
    hard_money_ltv: 0.90,          // 90%
    hard_money_rate: 0.12,         // 12%
    selling_costs_pct: 0.06,       // 6% (was 8%)
    holding_period_months: 6,      // 6 months
  },
  house_hack: {
    fha_down_payment_pct: 0.035,   // 3.5%
    fha_mip_rate: 0.0085,          // 0.85%
    units_rented_out: 2,           // 2 units
    buy_discount_pct: 0.05,     // 5% below Income Value
    // room_rent_monthly now calculated: (estimatedRent / bedrooms) * units_rented_out
    // owner_unit_market_rent now calculated: estimatedRent / bedrooms
  },
  wholesale: {
    assignment_fee: 15000,         // $15,000
    marketing_costs: 500,          // $500
    earnest_money_deposit: 1000,   // $1,000
    days_to_close: 45,             // 45 days
    target_purchase_discount_pct: 0.30, // 30%
  },
  appreciation_rate: 0.05,         // 5%
  rent_growth_rate: 0.05,          // 5% (was 3%)
  expense_growth_rate: 0.03,       // 3%
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
      name: 'dealgapiq-assumptions',
      version: 2, // Increment version to trigger migration
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as AssumptionsStore
        
        if (version === 0 || version === 1) {
          // Migration from v1 to v2: Convert fixed values to percentages
          // Use type assertion through unknown for flexibility with old data shapes
          const assumptions = { ...state.assumptions } as unknown as Record<string, Record<string, unknown>>
          
          // Migrate operating assumptions
          if (assumptions.operating) {
            const operating = assumptions.operating
            // Convert insurance_annual (fixed $) to insurance_pct (%)
            if ('insurance_annual' in operating && !('insurance_pct' in operating)) {
              // Since we don't know the original purchase price, just use the new default
              operating.insurance_pct = 0.01
              delete operating.insurance_annual
            }
          }
          
          // Migrate STR assumptions
          if (assumptions.str) {
            const str = assumptions.str
            if ('str_insurance_annual' in str && !('str_insurance_pct' in str)) {
              str.str_insurance_pct = 0.01
              delete str.str_insurance_annual
            }
            // Add buy_discount_pct if missing
            if (!('buy_discount_pct' in str)) {
              str.buy_discount_pct = 0.05
            }
          }
          
          // Migrate rehab assumptions
          if (assumptions.rehab) {
            const rehab = assumptions.rehab
            if ('renovation_budget' in rehab && !('renovation_budget_pct' in rehab)) {
              rehab.renovation_budget_pct = 0.05
              delete rehab.renovation_budget
            }
            if ('monthly_holding_costs' in rehab && !('holding_costs_pct' in rehab)) {
              rehab.holding_costs_pct = 0.01
              delete rehab.monthly_holding_costs
            }
          }
          
          // Migrate BRRRR assumptions
          if (assumptions.brrrr) {
            const brrrr = assumptions.brrrr
            // Remove old purchase_discount_pct
            if ('purchase_discount_pct' in brrrr) {
              delete brrrr.purchase_discount_pct
            }
            // Add buy_discount_pct if missing
            if (!('buy_discount_pct' in brrrr)) {
              brrrr.buy_discount_pct = 0.05
            }
            // Convert refinance_closing_costs to percentage
            if ('refinance_closing_costs' in brrrr && !('refinance_closing_costs_pct' in brrrr)) {
              brrrr.refinance_closing_costs_pct = 0.03
              delete brrrr.refinance_closing_costs
            }
          }
          
          // Add LTR assumptions if missing
          if (!assumptions.ltr) {
            assumptions.ltr = { buy_discount_pct: 0.05 }
          }
          
          // Migrate house_hack assumptions
          if (assumptions.house_hack) {
            const houseHack = assumptions.house_hack
            // Remove old fixed values (now calculated)
            delete houseHack.room_rent_monthly
            delete houseHack.owner_unit_market_rent
            // Add buy_discount_pct if missing
            if (!('buy_discount_pct' in houseHack)) {
              houseHack.buy_discount_pct = 0.05
            }
          }
          
          return {
            ...state,
            assumptions: assumptions as unknown as AllAssumptions,
          }
        }
        
        return state
      },
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
  zpid: string | null  // Zillow Property ID for photos API
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
      name: 'dealgapiq-property',
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
