/**
 * Assumptions Store — Default financial assumptions for all strategies.
 *
 * Mirrors frontend/src/stores/index.ts (useAssumptionsStore).
 *
 * Persisted to AsyncStorage so user preferences survive app restarts.
 * Property-level overrides allow per-deal customization without
 * touching the global defaults.
 *
 * Values here are FALLBACK defaults only. The worksheet and analysis
 * screens should fetch resolved defaults from the API when available.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FinancingAssumptions {
  purchase_price: number | null;
  down_payment_pct: number;
  interest_rate: number;
  loan_term_years: number;
  closing_costs_pct: number;
}

export interface OperatingAssumptions {
  vacancy_rate: number;
  property_management_pct: number;
  maintenance_pct: number;
  insurance_pct: number;
  utilities_monthly: number;
  landscaping_annual: number;
  pest_control_annual: number;
}

export interface LTRAssumptions {
  buy_discount_pct: number;
}

export interface STRAssumptions {
  platform_fees_pct: number;
  str_management_pct: number;
  cleaning_cost_per_turnover: number;
  cleaning_fee_revenue: number;
  avg_length_of_stay_days: number;
  supplies_monthly: number;
  additional_utilities_monthly: number;
  furniture_setup_cost: number;
  str_insurance_pct: number;
  buy_discount_pct: number;
}

export interface RehabAssumptions {
  renovation_budget_pct: number;
  contingency_pct: number;
  holding_period_months: number;
  holding_costs_pct: number;
}

export interface BRRRRAssumptions {
  buy_discount_pct: number;
  refinance_ltv: number;
  refinance_interest_rate: number;
  refinance_term_years: number;
  refinance_closing_costs_pct: number;
  post_rehab_rent_increase_pct: number;
}

export interface FlipAssumptions {
  hard_money_ltv: number;
  hard_money_rate: number;
  selling_costs_pct: number;
  holding_period_months: number;
}

export interface HouseHackAssumptions {
  fha_down_payment_pct: number;
  fha_mip_rate: number;
  units_rented_out: number;
  buy_discount_pct: number;
}

export interface WholesaleAssumptions {
  assignment_fee: number;
  marketing_costs: number;
  earnest_money_deposit: number;
  days_to_close: number;
  target_purchase_discount_pct: number;
}

export interface AllAssumptions {
  financing: FinancingAssumptions;
  operating: OperatingAssumptions;
  ltr: LTRAssumptions;
  str: STRAssumptions;
  rehab: RehabAssumptions;
  brrrr: BRRRRAssumptions;
  flip: FlipAssumptions;
  house_hack: HouseHackAssumptions;
  wholesale: WholesaleAssumptions;
  appreciation_rate: number;
  rent_growth_rate: number;
  expense_growth_rate: number;
}

// ─── Default values (matches backend/app/core/defaults.py) ───────────────────

export const DEFAULT_ASSUMPTIONS: AllAssumptions = {
  financing: {
    purchase_price: null,
    down_payment_pct: 0.20,
    interest_rate: 0.06,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
  },
  operating: {
    vacancy_rate: 0.01,
    property_management_pct: 0.00,
    maintenance_pct: 0.05,
    insurance_pct: 0.01,
    utilities_monthly: 100,
    landscaping_annual: 0,
    pest_control_annual: 200,
  },
  ltr: {
    buy_discount_pct: 0.05,
  },
  str: {
    platform_fees_pct: 0.15,
    str_management_pct: 0.10,
    cleaning_cost_per_turnover: 150,
    cleaning_fee_revenue: 75,
    avg_length_of_stay_days: 6,
    supplies_monthly: 100,
    additional_utilities_monthly: 0,
    furniture_setup_cost: 6000,
    str_insurance_pct: 0.01,
    buy_discount_pct: 0.05,
  },
  rehab: {
    renovation_budget_pct: 0.05,
    contingency_pct: 0.05,
    holding_period_months: 4,
    holding_costs_pct: 0.01,
  },
  brrrr: {
    buy_discount_pct: 0.05,
    refinance_ltv: 0.75,
    refinance_interest_rate: 0.06,
    refinance_term_years: 30,
    refinance_closing_costs_pct: 0.03,
    post_rehab_rent_increase_pct: 0.10,
  },
  flip: {
    hard_money_ltv: 0.90,
    hard_money_rate: 0.12,
    selling_costs_pct: 0.06,
    holding_period_months: 6,
  },
  house_hack: {
    fha_down_payment_pct: 0.035,
    fha_mip_rate: 0.0085,
    units_rented_out: 2,
    buy_discount_pct: 0.05,
  },
  wholesale: {
    assignment_fee: 15000,
    marketing_costs: 500,
    earnest_money_deposit: 1000,
    days_to_close: 45,
    target_purchase_discount_pct: 0.30,
  },
  appreciation_rate: 0.05,
  rent_growth_rate: 0.05,
  expense_growth_rate: 0.03,
};

// ─── Store ───────────────────────────────────────────────────────────────────

interface AssumptionsStore {
  assumptions: AllAssumptions;
  propertyOverrides: Record<string, Partial<AllAssumptions>>;
  /** True once the store has been hydrated from the defaults API */
  isHydrated: boolean;

  // Actions
  setAssumption: <K extends keyof AllAssumptions>(
    category: K,
    key: keyof AllAssumptions[K],
    value: unknown
  ) => void;
  setPropertyOverride: (propertyId: string, overrides: Partial<AllAssumptions>) => void;
  getAssumptionsForProperty: (propertyId: string) => AllAssumptions;
  resetToDefaults: () => void;
  resetPropertyOverrides: (propertyId: string) => void;
  bulkUpdate: (updates: Partial<AllAssumptions>) => void;
  /**
   * Hydrate the store from the defaults API response.
   * Called once on app launch (or when ZIP code changes) to replace the
   * hardcoded fallback values with the server-resolved defaults.
   */
  hydrateFromAPI: (resolved: AllAssumptions) => void;
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as T & Record<string, unknown>;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof T];
      const targetValue = target[key as keyof T];
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
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  return result as T;
}

export const useAssumptionsStore = create<AssumptionsStore>()(
  persist(
    (set, get) => ({
      assumptions: DEFAULT_ASSUMPTIONS,
      propertyOverrides: {},
      isHydrated: false,

      hydrateFromAPI: (resolved) =>
        set({ assumptions: resolved, isHydrated: true }),

      setAssumption: (category, key, value) =>
        set((state) => ({
          assumptions: {
            ...state.assumptions,
            [category]: {
              ...(state.assumptions[category] as Record<string, unknown>),
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
        const state = get();
        const overrides = state.propertyOverrides[propertyId];
        if (!overrides) return state.assumptions;
        return deepMerge(state.assumptions, overrides);
      },

      resetToDefaults: () =>
        set({ assumptions: DEFAULT_ASSUMPTIONS }),

      resetPropertyOverrides: (propertyId) =>
        set((state) => {
          const { [propertyId]: _, ...rest } = state.propertyOverrides;
          return { propertyOverrides: rest };
        }),

      bulkUpdate: (updates) =>
        set((state) => ({
          assumptions: deepMerge(state.assumptions, updates),
        })),
    }),
    {
      name: 'dealgapiq-assumptions',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as AssumptionsStore;

        if (version === 0 || version === 1) {
          const assumptions = {
            ...state.assumptions,
          } as unknown as Record<string, Record<string, unknown>>;

          if (assumptions.operating) {
            const operating = assumptions.operating;
            if ('insurance_annual' in operating && !('insurance_pct' in operating)) {
              operating.insurance_pct = 0.01;
              delete operating.insurance_annual;
            }
          }

          if (assumptions.str) {
            const str = assumptions.str;
            if ('str_insurance_annual' in str && !('str_insurance_pct' in str)) {
              str.str_insurance_pct = 0.01;
              delete str.str_insurance_annual;
            }
            if (!('buy_discount_pct' in str)) {
              str.buy_discount_pct = 0.05;
            }
          }

          if (assumptions.rehab) {
            const rehab = assumptions.rehab;
            if ('renovation_budget' in rehab && !('renovation_budget_pct' in rehab)) {
              rehab.renovation_budget_pct = 0.05;
              delete rehab.renovation_budget;
            }
            if ('monthly_holding_costs' in rehab && !('holding_costs_pct' in rehab)) {
              rehab.holding_costs_pct = 0.01;
              delete rehab.monthly_holding_costs;
            }
          }

          if (assumptions.brrrr) {
            const brrrr = assumptions.brrrr;
            if ('purchase_discount_pct' in brrrr) {
              delete brrrr.purchase_discount_pct;
            }
            if (!('buy_discount_pct' in brrrr)) {
              brrrr.buy_discount_pct = 0.05;
            }
            if ('refinance_closing_costs' in brrrr && !('refinance_closing_costs_pct' in brrrr)) {
              brrrr.refinance_closing_costs_pct = 0.03;
              delete brrrr.refinance_closing_costs;
            }
          }

          if (!assumptions.ltr) {
            assumptions.ltr = { buy_discount_pct: 0.05 };
          }

          if (assumptions.house_hack) {
            const houseHack = assumptions.house_hack;
            delete houseHack.room_rent_monthly;
            delete houseHack.owner_unit_market_rent;
            if (!('buy_discount_pct' in houseHack)) {
              houseHack.buy_discount_pct = 0.05;
            }
          }

          return {
            ...state,
            assumptions: assumptions as unknown as AllAssumptions,
          };
        }

        return state;
      },
    }
  )
);
