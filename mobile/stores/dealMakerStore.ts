/**
 * Deal Maker Store
 *
 * Persists deal-maker inputs per property so users don't lose their
 * adjustments when navigating away and returning. Backend is the
 * source of truth for *metrics* — this store only caches the user's
 * input overrides and the last-received metrics snapshot.
 *
 * Mirrors the frontend dealMakerStore with mobile-appropriate storage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PriceTarget = 'breakeven' | 'targetBuy' | 'wholesale';

export interface CachedMetrics {
  cap_rate: number | null;
  cash_on_cash: number | null;
  monthly_cash_flow: number | null;
  annual_cash_flow: number | null;
  loan_amount: number | null;
  down_payment: number | null;
  closing_costs: number | null;
  monthly_payment: number | null;
  total_cash_needed: number | null;
  gross_income: number | null;
  vacancy_loss: number | null;
  total_expenses: number | null;
  noi: number | null;
  dscr: number | null;
  ltv: number | null;
  one_percent_rule: number | null;
  grm: number | null;
  equity: number | null;
  equity_after_rehab: number | null;
  deal_gap_pct: number | null;
  breakeven_price: number | null;
  calculated_at?: string;
}

export interface DealMakerRecord {
  // Property data
  list_price: number;
  rent_estimate: number;
  property_taxes: number;
  insurance: number;
  arv_estimate: number | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;

  // User adjustments (shared)
  buy_price: number;
  down_payment_pct: number;
  closing_costs_pct: number;
  interest_rate: number;
  loan_term_years: number;
  rehab_budget: number;
  arv: number;
  maintenance_pct: number;
  capex_pct: number;
  annual_property_tax: number;
  annual_insurance: number;
  monthly_hoa: number;
  monthly_utilities: number;

  // LTR-specific
  monthly_rent: number;
  other_income: number;
  vacancy_rate: number;
  management_pct: number;

  // Strategy type
  strategy_type?: 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

  // Cached metrics
  cached_metrics: CachedMetrics | null;

  // Metadata
  version: number;
}

export type DealMakerUpdate = Partial<
  Pick<
    DealMakerRecord,
    | 'buy_price'
    | 'down_payment_pct'
    | 'closing_costs_pct'
    | 'interest_rate'
    | 'loan_term_years'
    | 'rehab_budget'
    | 'arv'
    | 'maintenance_pct'
    | 'capex_pct'
    | 'annual_property_tax'
    | 'annual_insurance'
    | 'monthly_hoa'
    | 'monthly_utilities'
    | 'monthly_rent'
    | 'other_income'
    | 'vacancy_rate'
    | 'management_pct'
    | 'strategy_type'
  >
>;

// ─── Debounce ───────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 300;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Store State ────────────────────────────────────────────────────────────

interface DealMakerState {
  propertyId: string | null;
  record: DealMakerRecord | null;
  activePriceTarget: PriceTarget;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isDirty: boolean;
  pendingUpdates: DealMakerUpdate;

  // Actions
  loadRecord: (propertyId: string) => Promise<void>;
  updateField: <K extends keyof DealMakerUpdate>(field: K, value: DealMakerUpdate[K]) => void;
  updateMultipleFields: (updates: DealMakerUpdate) => void;
  saveToBackend: () => Promise<void>;
  debouncedSave: () => void;
  reset: () => void;
  setActivePriceTarget: (target: PriceTarget) => void;

  // Computed helpers
  getMetrics: () => CachedMetrics | null;
  getCashNeeded: () => number;
  getDealGap: () => number;
  getAnnualProfit: () => number;
  getCapRate: () => number;
  getCocReturn: () => number;
  getMonthlyPayment: () => number;
  getActivePriceValue: () => number;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useDealMakerStore = create<DealMakerState>()(
  persist(
    (set, get) => ({
      propertyId: null,
      record: null,
      activePriceTarget: 'targetBuy' as PriceTarget,
      isLoading: false,
      isSaving: false,
      error: null,
      isDirty: false,
      pendingUpdates: {},

      loadRecord: async (propertyId: string) => {
        set({ isLoading: true, error: null });

        try {
          const data = await api.get<{ record: DealMakerRecord }>(
            `/api/v1/properties/saved/${propertyId}/deal-maker`
          );

          set({
            propertyId,
            record: data.record,
            isLoading: false,
            isDirty: false,
            pendingUpdates: {},
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to load Deal Maker record';
          set({ error: message, isLoading: false });
        }
      },

      updateField: (field, value) => {
        const { record, pendingUpdates } = get();
        if (!record) return;

        set({
          record: { ...record, [field]: value },
          isDirty: true,
          pendingUpdates: { ...pendingUpdates, [field]: value },
        });

        get().debouncedSave();
      },

      updateMultipleFields: (updates) => {
        const { record, pendingUpdates } = get();
        if (!record) return;

        set({
          record: { ...record, ...updates },
          isDirty: true,
          pendingUpdates: { ...pendingUpdates, ...updates },
        });

        get().debouncedSave();
      },

      saveToBackend: async () => {
        const { propertyId, pendingUpdates, isDirty } = get();
        if (!propertyId || !isDirty || Object.keys(pendingUpdates).length === 0) return;

        set({ isSaving: true });

        try {
          const data = await api.patch<{ record: DealMakerRecord }>(
            `/api/v1/properties/saved/${propertyId}/deal-maker`,
            pendingUpdates
          );

          set({
            record: data.record,
            isSaving: false,
            isDirty: false,
            pendingUpdates: {},
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to save Deal Maker record';
          set({ error: message, isSaving: false });
        }
      },

      debouncedSave: () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          get().saveToBackend();
        }, SAVE_DEBOUNCE_MS);
      },

      reset: () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        set({
          propertyId: null,
          record: null,
          activePriceTarget: 'targetBuy' as PriceTarget,
          isLoading: false,
          isSaving: false,
          error: null,
          isDirty: false,
          pendingUpdates: {},
        });
      },

      setActivePriceTarget: (target: PriceTarget) => {
        set({ activePriceTarget: target });
      },

      // Computed helpers — safe defaults
      getMetrics: () => get().record?.cached_metrics || null,
      getCashNeeded: () => get().record?.cached_metrics?.total_cash_needed || 0,
      getDealGap: () => get().record?.cached_metrics?.deal_gap_pct || 0,
      getAnnualProfit: () => get().record?.cached_metrics?.annual_cash_flow || 0,
      getCapRate: () => get().record?.cached_metrics?.cap_rate || 0,
      getCocReturn: () => get().record?.cached_metrics?.cash_on_cash || 0,
      getMonthlyPayment: () => get().record?.cached_metrics?.monthly_payment || 0,

      getActivePriceValue: () => {
        const { activePriceTarget, record } = get();
        const metrics = record?.cached_metrics;
        if (!record || !metrics) return 0;

        switch (activePriceTarget) {
          case 'breakeven':
            return metrics.breakeven_price || 0;
          case 'targetBuy':
            return record.buy_price || 0;
          case 'wholesale':
            return Math.round((metrics.breakeven_price || 0) * 0.7);
          default:
            return record.buy_price || 0;
        }
      },
    }),
    {
      name: 'investiq-deal-maker',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        propertyId: state.propertyId,
        record: state.record,
        activePriceTarget: state.activePriceTarget,
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

export const useDealMakerDerived = () => {
  const record = useDealMakerStore((state) => state.record);
  const metrics = record?.cached_metrics;

  return {
    listPrice: safeNumber(record?.list_price),
    rentEstimate: safeNumber(record?.rent_estimate),
    buyPrice: safeNumber(record?.buy_price),
    monthlyRent: safeNumber(record?.monthly_rent),
    arv: safeNumber(record?.arv),
    rehabBudget: safeNumber(record?.rehab_budget),
    loanAmount: safeNumber(metrics?.loan_amount),
    downPayment: safeNumber(metrics?.down_payment),
    totalCashNeeded: safeNumber(metrics?.total_cash_needed),
    monthlyPayment: safeNumber(metrics?.monthly_payment),
    ltv: safeNumber(metrics?.ltv),
    grossIncome: safeNumber(metrics?.gross_income),
    vacancyLoss: safeNumber(metrics?.vacancy_loss),
    totalExpenses: safeNumber(metrics?.total_expenses),
    noi: safeNumber(metrics?.noi),
    annualCashFlow: safeNumber(metrics?.annual_cash_flow),
    monthlyCashFlow: safeNumber(metrics?.monthly_cash_flow),
    capRate: safeNumber(metrics?.cap_rate),
    cashOnCash: safeNumber(metrics?.cash_on_cash),
    dscr: safeNumber(metrics?.dscr),
    onePercentRule: safeNumber(metrics?.one_percent_rule),
    grm: safeNumber(metrics?.grm),
    equity: safeNumber(metrics?.equity),
    equityAfterRehab: safeNumber(metrics?.equity_after_rehab),
    dealGapPct: safeNumber(metrics?.deal_gap_pct),
    breakevenPrice: safeNumber(metrics?.breakeven_price),
    hasRecord: record !== null,
  };
};

export const useDealMakerReady = () => {
  const record = useDealMakerStore((s) => s.record);
  const isLoading = useDealMakerStore((s) => s.isLoading);
  const error = useDealMakerStore((s) => s.error);

  return {
    isReady: record !== null && !isLoading,
    isLoading,
    error,
    hasRecord: record !== null,
  };
};
