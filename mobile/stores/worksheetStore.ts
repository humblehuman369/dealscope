/**
 * Worksheet Store
 *
 * Persists worksheet inputs per property/strategy so users can
 * navigate away and return without losing their edits. Backend
 * handles all calculations — this store caches inputs and the
 * last-received results snapshot.
 *
 * Mirrors the frontend worksheetStore with mobile-appropriate storage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

export interface WorksheetMetrics {
  gross_income: number;
  annual_gross_rent: number;
  vacancy_loss: number;
  gross_expenses: number;
  property_taxes: number;
  insurance: number;
  property_management: number;
  maintenance: number;
  maintenance_only: number;
  capex: number;
  hoa_fees: number;
  loan_amount: number;
  down_payment: number;
  closing_costs: number;
  monthly_payment: number;
  annual_debt_service: number;
  noi: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cap_rate: number;
  cash_on_cash_return: number;
  dscr: number;
  grm: number;
  one_percent_rule: number;
  arv: number;
  arv_psf: number;
  price_psf: number;
  rehab_psf: number;
  equity: number;
  equity_after_rehab: number;
  mao: number;
  total_cash_needed: number;
  ltv: number;
  deal_score: number;
}

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

const STRATEGY_ENDPOINTS: Record<StrategyId, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/house_hack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

// ─── Debounce ───────────────────────────────────────────────────────────────

const CALC_DEBOUNCE_MS = 500;
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

        // If we already have an entry for this combo, re-use its inputs
        // but allow new initial inputs to fill any gaps
        const mergedInputs = existing
          ? { ...initialInputs, ...existing.inputs }
          : { ...initialInputs };

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

        const endpoint = STRATEGY_ENDPOINTS[activeStrategy];
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
        } catch (err: any) {
          set({
            isCalculating: false,
            calculationError: err?.message || 'Calculation failed',
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
      name: 'investiq-worksheets',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
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
