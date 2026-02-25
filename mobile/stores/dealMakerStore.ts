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
//
// Types are imported from the canonical types/dealMaker.ts which matches the
// backend schema exactly. This ensures the store handles ALL strategy-specific
// fields (STR, BRRRR, Flip, HouseHack, Wholesale) — not just LTR.

import type {
  DealMakerRecord,
  DealMakerRecordUpdate,
  CachedMetrics,
  DealMakerResponse,
} from '../types/dealMaker';

// Re-export for backward compatibility with existing consumers
export type { DealMakerRecord, CachedMetrics };

// Alias DealMakerRecordUpdate → DealMakerUpdate (matches frontend export name)
export type DealMakerUpdate = DealMakerRecordUpdate;

export type PriceTarget = 'breakeven' | 'targetBuy' | 'wholesale';

// ─── Debounce ───────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 300;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Store State ────────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface DealMakerState {
  propertyId: string | null;
  record: DealMakerRecord | null;
  activePriceTarget: PriceTarget;
  lastFetchedAt: number | null;
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
      lastFetchedAt: null,
      isLoading: false,
      isSaving: false,
      error: null,
      isDirty: false,
      pendingUpdates: {},

      loadRecord: async (propertyId: string) => {
        // Skip network if we have fresh data for this property
        const state = get();
        const isFresh =
          state.propertyId === propertyId &&
          state.record &&
          state.lastFetchedAt &&
          Date.now() - state.lastFetchedAt < STALE_THRESHOLD_MS;
        if (isFresh) return;

        set({ isLoading: true, error: null });

        try {
          const data = await api.get<DealMakerResponse>(
            `/api/v1/properties/saved/${propertyId}/deal-maker`
          );

          set({
            propertyId,
            record: data.record,
            lastFetchedAt: Date.now(),
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
          const data = await api.patch<DealMakerResponse>(
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
          lastFetchedAt: null,
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
            return metrics.income_value ?? metrics.breakeven_price ?? 0;
          case 'targetBuy':
            return record.buy_price ?? 0;
          case 'wholesale':
            return Math.round((metrics.income_value ?? 0) * 0.70);
          default:
            return record.buy_price ?? 0;
        }
      },
    }),
    {
      name: 'dealgapiq-deal-maker',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as DealMakerState;
        return state;
      },
      partialize: (state) => ({
        propertyId: state.propertyId,
        record: state.record,
        activePriceTarget: state.activePriceTarget,
        lastFetchedAt: state.lastFetchedAt,
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
    incomeValue: safeNumber(metrics?.income_value ?? metrics?.breakeven_price),
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
