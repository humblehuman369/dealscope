/**
 * Worksheet Store
 *
 * Persists worksheet inputs per property/strategy so users can
 * navigate away and return without losing their edits. Backend
 * handles all calculations — this store caches inputs and the
 * last-received results snapshot.
 *
 * ARCHITECTURAL NOTE (M10 parity audit):
 * The mobile store uses a multi-property map (`entries: Record<string, WorksheetEntry>`)
 * keyed by "propertyId::strategy", while the frontend store is single-property focused.
 * This is an intentional divergence — mobile needs offline persistence for multiple
 * properties so users can switch between deals without losing edits. The frontend
 * doesn't need this because tab-based navigation keeps a single property in context.
 * Both platforms call the same backend worksheet calculation endpoints with the same
 * payload shape.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/apiClient';
import { getResolvedDefaults } from '../services/defaultsService';
import { WORKSHEET_ENDPOINTS } from '@dealscope/shared';
import type { StrategyId } from '../types/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────

import type { WorksheetMetrics } from '@dealscope/shared';
export type { WorksheetMetrics };

/** One entry per property+strategy combo */
export interface WorksheetEntry {
  propertyId: string;
  strategy: StrategyId;
  inputs: Record<string, number>;
  results: Record<string, unknown> | null;
  lastCalculatedAt: number | null;
  lastEditedAt: number;
}

// ─── API endpoints per strategy ─────────────────────────────────────────────
// Imported from @dealscope/shared (WORKSHEET_ENDPOINTS) — single source of truth.
// Previously had a bug: house_hack used '/house_hack/' instead of '/househack/'.

// ─── Default worksheet inputs (matches frontend/src/stores/worksheetStore.ts)
// Used as fallback when initialInputs are incomplete.
// Values match backend/app/core/defaults.py to minimize visual jumps.

const DEFAULT_WORKSHEET_INPUTS: Record<string, number> = {
  purchase_price: 0,
  down_payment_pct: 0.20,
  closing_costs_pct: 0.03,
  closing_costs: 0,
  rehab_costs: 0,
  arv: 0,
  interest_rate: 0.06,
  loan_term_years: 30,
  monthly_rent: 0,
  annual_rent_growth: 0.05,
  vacancy_rate: 0.01,
  property_taxes: 0,
  insurance: 0,
  property_tax_growth: 0.02,
  insurance_growth: 0.03,
  management_pct: 0.00,
  maintenance_pct: 0.05,
  capex_reserve_pct: 0.05,
  hoa_fees: 0,
  utilities: 0,
  landscaping: 0,
  misc_expenses: 0,
  annual_appreciation: 0.05,
  income_tax_rate: 0.25,
  depreciation_years: 27.5,
  land_value_percent: 0.20,
};

// ─── Debounce ───────────────────────────────────────────────────────────────

const CALC_DEBOUNCE_MS = 200;
const SAVE_DEBOUNCE_MS = 2000;
let calcTimeout: ReturnType<typeof setTimeout> | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Creates a unique key for the entries map */
function entryKey(propertyId: string, strategy: StrategyId): string {
  return `${propertyId}::${strategy}`;
}

// ─── Store State ────────────────────────────────────────────────────────────

interface WorksheetState {
  /** Map of "propertyId::strategy" → entry */
  entries: Record<string, WorksheetEntry>;

  // Current active worksheet
  activePropertyId: string | null;
  activeStrategy: StrategyId | null;
  isCalculating: boolean;
  calculationError: string | null;
  isSaving: boolean;

  // Actions
  initWorksheet: (propertyId: string, strategy: StrategyId, initialInputs: Record<string, number>) => void;
  updateInput: (key: string, value: number) => void;
  updateMultipleInputs: (updates: Record<string, number>) => void;
  getEntry: (propertyId: string, strategy: StrategyId) => WorksheetEntry | null;
  getActiveEntry: () => WorksheetEntry | null;
  calculateNow: () => Promise<void>;
  debouncedCalculate: () => void;
  saveToBackend: () => Promise<void>;
  debouncedSave: () => void;
  clearEntry: (propertyId: string, strategy: StrategyId) => void;
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWorksheetStore = create<WorksheetState>()(
  persist(
    (set, get) => ({
      entries: {},
      activePropertyId: null,
      activeStrategy: null,
      isCalculating: false,
      calculationError: null,
      isSaving: false,

      initWorksheet: (propertyId, strategy, initialInputs) => {
        const key = entryKey(propertyId, strategy);
        const existing = get().entries[key];

        // Layer defaults → caller-provided → previously saved inputs
        // so no field is ever undefined in a calculation payload.
        const mergedInputs = existing
          ? { ...DEFAULT_WORKSHEET_INPUTS, ...initialInputs, ...existing.inputs }
          : { ...DEFAULT_WORKSHEET_INPUTS, ...initialInputs };

        set((state) => ({
          activePropertyId: propertyId,
          activeStrategy: strategy,
          entries: {
            ...state.entries,
            [key]: {
              propertyId,
              strategy,
              inputs: mergedInputs,
              results: existing?.results ?? null,
              lastCalculatedAt: existing?.lastCalculatedAt ?? null,
              lastEditedAt: Date.now(),
            },
          },
        }));

        // Async: fetch resolved defaults from API and merge (matches frontend)
        const zipCode = (initialInputs as Record<string, unknown>).zip_code as string | undefined;
        if (!existing) {
          getResolvedDefaults(zipCode).then((resp) => {
            if (!resp?.resolved) return;
            const r = resp.resolved;
            const apiDefaults: Record<string, number> = {};
            if (r.financing?.down_payment_pct != null) apiDefaults.down_payment_pct = r.financing.down_payment_pct;
            if (r.financing?.closing_costs_pct != null) apiDefaults.closing_costs_pct = r.financing.closing_costs_pct;
            if (r.financing?.interest_rate != null) apiDefaults.interest_rate = r.financing.interest_rate;
            if (r.financing?.loan_term_years != null) apiDefaults.loan_term_years = r.financing.loan_term_years;
            if (r.operating?.vacancy_rate != null) apiDefaults.vacancy_rate = r.operating.vacancy_rate;
            if (r.operating?.property_management_pct != null) apiDefaults.management_pct = r.operating.property_management_pct;
            if (r.operating?.maintenance_pct != null) apiDefaults.maintenance_pct = r.operating.maintenance_pct;
            if (r.appreciation_rate != null) apiDefaults.annual_appreciation = r.appreciation_rate as number;
            if (r.rent_growth_rate != null) apiDefaults.annual_rent_growth = r.rent_growth_rate as number;

            if (Object.keys(apiDefaults).length === 0) return;

            set((state) => {
              const entry = state.entries[key];
              if (!entry) return state;
              return {
                entries: {
                  ...state.entries,
                  [key]: {
                    ...entry,
                    inputs: { ...apiDefaults, ...entry.inputs },
                  },
                },
              };
            });

            get().debouncedCalculate();
          }).catch(() => {
            // Silently fall back to static defaults
          });
        }
      },

      updateInput: (inputKey, value) => {
        const { activePropertyId, activeStrategy } = get();
        if (!activePropertyId || !activeStrategy) return;

        const key = entryKey(activePropertyId, activeStrategy);

        set((state) => {
          const entry = state.entries[key];
          if (!entry) return state;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...entry,
                inputs: { ...entry.inputs, [inputKey]: value },
                lastEditedAt: Date.now(),
              },
            },
          };
        });

        get().debouncedCalculate();
        get().debouncedSave();
      },

      updateMultipleInputs: (updates) => {
        const { activePropertyId, activeStrategy } = get();
        if (!activePropertyId || !activeStrategy) return;

        const key = entryKey(activePropertyId, activeStrategy);

        set((state) => {
          const entry = state.entries[key];
          if (!entry) return state;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...entry,
                inputs: { ...entry.inputs, ...updates },
                lastEditedAt: Date.now(),
              },
            },
          };
        });

        get().debouncedCalculate();
        get().debouncedSave();
      },

      getEntry: (propertyId, strategy) => {
        return get().entries[entryKey(propertyId, strategy)] ?? null;
      },

      getActiveEntry: () => {
        const { activePropertyId, activeStrategy, entries } = get();
        if (!activePropertyId || !activeStrategy) return null;
        return entries[entryKey(activePropertyId, activeStrategy)] ?? null;
      },

      calculateNow: async () => {
        const { activePropertyId, activeStrategy } = get();
        if (!activePropertyId || !activeStrategy) return;

        const key = entryKey(activePropertyId, activeStrategy);
        const entry = get().entries[key];
        if (!entry) return;

        const endpoint = WORKSHEET_ENDPOINTS[activeStrategy];
        set({ isCalculating: true, calculationError: null });

        try {
          const data = await api.post<Record<string, unknown>>(endpoint, entry.inputs);

          set((state) => ({
            isCalculating: false,
            entries: {
              ...state.entries,
              [key]: {
                ...entry,
                results: data,
                lastCalculatedAt: Date.now(),
              },
            },
          }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          set({
            isCalculating: false,
            calculationError: message || 'Calculation failed',
          });
        }
      },

      debouncedCalculate: () => {
        if (calcTimeout) clearTimeout(calcTimeout);
        calcTimeout = setTimeout(() => {
          get().calculateNow();
        }, CALC_DEBOUNCE_MS);
      },

      saveToBackend: async () => {
        const { activePropertyId, activeStrategy } = get();
        if (!activePropertyId || !activeStrategy) return;

        const key = entryKey(activePropertyId, activeStrategy);
        const entry = get().entries[key];
        if (!entry) return;

        set({ isSaving: true });

        try {
          await api.patch(`/api/v1/properties/saved/${activePropertyId}`, {
            worksheet_assumptions: entry.inputs,
          });
          set({ isSaving: false });
        } catch (error) {
          console.warn('Failed to save worksheet to backend:', error);
          set({ isSaving: false });
        }
      },

      debouncedSave: () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          get().saveToBackend();
        }, SAVE_DEBOUNCE_MS);
      },

      clearEntry: (propertyId, strategy) => {
        const key = entryKey(propertyId, strategy);
        set((state) => {
          const { [key]: _, ...rest } = state.entries;
          return { entries: rest };
        });
      },

      reset: () => {
        if (calcTimeout) clearTimeout(calcTimeout);
        if (saveTimeout) clearTimeout(saveTimeout);
        set({
          activePropertyId: null,
          activeStrategy: null,
          isCalculating: false,
          calculationError: null,
          isSaving: false,
        });
      },
    }),
    {
      name: 'dealgapiq-worksheets',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as WorksheetState;
        return state;
      },
      partialize: (state) => ({
        entries: state.entries,
      }),
    }
  )
);

// ─── Selectors ──────────────────────────────────────────────────────────────

const safeNumber = (value?: number | null, maxAbs: number = 1e12): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (Math.abs(value) > maxAbs) return value > 0 ? maxAbs : -maxAbs;
  return value;
};

export const useWorksheetInputs = () =>
  useWorksheetStore((s) => {
    if (!s.activePropertyId || !s.activeStrategy) return null;
    const key = `${s.activePropertyId}::${s.activeStrategy}`;
    return s.entries[key]?.inputs ?? null;
  });

export const useWorksheetCalculating = () =>
  useWorksheetStore((s) => s.isCalculating);

export const useWorksheetError = () =>
  useWorksheetStore((s) => s.calculationError);

/** Convenience hook returning derived metrics for the active worksheet */
export const useWorksheetDerived = () => {
  const entry = useWorksheetStore((s) => s.getActiveEntry());
  const metrics = entry?.results as WorksheetMetrics | null | undefined;

  return {
    loanAmount: safeNumber(metrics?.loan_amount),
    downPayment: safeNumber(metrics?.down_payment),
    totalCashNeeded: safeNumber(metrics?.total_cash_needed),
    monthlyPayment: safeNumber(metrics?.monthly_payment),
    ltv: safeNumber(metrics?.ltv),
    annualGrossRent: safeNumber(metrics?.annual_gross_rent),
    vacancyLoss: safeNumber(metrics?.vacancy_loss),
    effectiveGrossIncome: safeNumber(metrics?.gross_income),
    propertyManagement: safeNumber(metrics?.property_management),
    maintenance: safeNumber(metrics?.maintenance_only),
    capex: safeNumber(metrics?.capex),
    totalOperatingExpenses: safeNumber(metrics?.gross_expenses),
    noi: safeNumber(metrics?.noi),
    annualDebtService: safeNumber(metrics?.annual_debt_service),
    annualCashFlow: safeNumber(metrics?.annual_cash_flow),
    monthlyCashFlow: safeNumber(metrics?.monthly_cash_flow),
    capRate: safeNumber(metrics?.cap_rate),
    cashOnCash: safeNumber(metrics?.cash_on_cash_return),
    dscr: safeNumber(metrics?.dscr),
    grm: safeNumber(metrics?.grm),
    onePercentRule: safeNumber(metrics?.one_percent_rule),
    dealScore: safeNumber(metrics?.deal_score),
    hasResults: metrics !== null && metrics !== undefined,
  };
};
