/**
 * useDealScore — Backend-powered Deal Score hook
 *
 * Calls POST /api/v1/worksheet/deal-score to compute the deal score,
 * matching the frontend implementation. No local financial math.
 *
 * This hook is exported via the analytics barrel but is NOT actively used
 * by any screen. Keeping it backend-powered for consistency in case future
 * screens reference it.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../services/apiClient';
import { AnalyticsInputs, DealScore, ScoreBreakdown } from '../types';

// ============================================
// Types
// ============================================

export interface DealScoreInput {
  listPrice: number;
  purchasePrice: number;
  monthlyRent: number;
  propertyTaxes: number;
  insurance: number;
  vacancyRate?: number;
  maintenancePct?: number;
  managementPct?: number;
  downPaymentPct?: number;
  interestRate?: number;
  loanTermYears?: number;
  listingStatus?: string | null;
  sellerType?: string | null;
  isForeclosure?: boolean;
  isBankOwned?: boolean;
  isFsbo?: boolean;
  isAuction?: boolean;
  priceReductions?: number;
  daysOnMarket?: number | null;
}

export interface DealScoreResult {
  dealScore: number;
  dealVerdict: string;
  discountPercent: number;
  breakevenPrice: number;
  purchasePrice: number;
  listPrice: number;
  grade?: string;
  color?: string;
  factors?: {
    dealGapScore: number;
    dealGapPercent: number;
    availabilityScore: number;
    availabilityStatus: string;
    availabilityLabel: string;
    availabilityMotivation: string;
    domScore: number;
    domLeverage: string;
    daysOnMarket: number | null;
  };
}

// ============================================
// Legacy-compatible interface
// ============================================

interface ImprovementSuggestion {
  category: string;
  currentPoints: number;
  maxPoints: number;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

interface UseDealScoreResult {
  /** Backend deal score result (null while loading or on error) */
  result: DealScoreResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Manually trigger a recalculation */
  recalculate: () => void;

  // Legacy fields (kept for backward compat if anything still references them)
  metrics: null;
  score: DealScore;
  getBreakdownForCategory: (category: string) => ScoreBreakdown | undefined;
  isGoodDeal: boolean;
  improvementSuggestions: ImprovementSuggestion[];
}

// ============================================
// Hook
// ============================================

const DEBOUNCE_MS = 300;

export function useDealScore(inputs: AnalyticsInputs): UseDealScoreResult {
  const [result, setResult] = useState<DealScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDealScore = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!inputs.purchasePrice || !inputs.monthlyRent) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.post<Record<string, any>>(
        '/api/v1/worksheet/deal-score',
        {
          list_price: inputs.purchasePrice,
          purchase_price: inputs.purchasePrice,
          monthly_rent: inputs.monthlyRent,
          property_taxes: inputs.annualPropertyTax,
          insurance: inputs.annualInsurance,
          vacancy_rate: inputs.vacancyRate,
          maintenance_pct: inputs.maintenanceRate,
          management_pct: inputs.managementRate,
          down_payment_pct: inputs.downPaymentPercent,
          interest_rate: inputs.interestRate,
          loan_term_years: inputs.loanTermYears,
        },
      );

      if (!controller.signal.aborted) {
        setResult({
          dealScore: data.deal_score,
          dealVerdict: data.deal_verdict,
          discountPercent: data.discount_percent,
          breakevenPrice: data.breakeven_price,
          purchasePrice: data.purchase_price,
          listPrice: data.list_price,
          grade: data.grade,
          color: data.color,
          factors: data.factors
            ? {
                dealGapScore: data.factors.deal_gap_score,
                dealGapPercent: data.factors.deal_gap_percent,
                availabilityScore: data.factors.availability_score,
                availabilityStatus: data.factors.availability_status,
                availabilityLabel: data.factors.availability_label,
                availabilityMotivation: data.factors.availability_motivation,
                domScore: data.factors.dom_score,
                domLeverage: data.factors.dom_leverage,
                daysOnMarket: data.factors.days_on_market,
              }
            : undefined,
        });
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch deal score');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [
    inputs.purchasePrice,
    inputs.monthlyRent,
    inputs.annualPropertyTax,
    inputs.annualInsurance,
    inputs.vacancyRate,
    inputs.maintenanceRate,
    inputs.managementRate,
    inputs.downPaymentPercent,
    inputs.interestRate,
    inputs.loanTermYears,
  ]);

  // Debounced fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchDealScore, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchDealScore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Build a legacy-shaped DealScore from the backend result for backward compat
  const legacyScore: DealScore = result
    ? {
        score: result.dealScore,
        grade: (result.grade || 'C') as DealScore['grade'],
        label: result.dealVerdict || 'Calculating',
        verdict: result.dealVerdict || '',
        color: result.color || '#f97316',
        discountPercent: result.discountPercent,
        breakevenPrice: result.breakevenPrice,
        listPrice: result.listPrice,
        breakdown: [],
      }
    : {
        score: 0,
        grade: 'F' as DealScore['grade'],
        label: 'Loading',
        verdict: '',
        color: '#ef4444',
        discountPercent: 0,
        breakevenPrice: 0,
        listPrice: 0,
        breakdown: [],
      };

  return {
    result,
    isLoading,
    error,
    recalculate: fetchDealScore,

    // Legacy compat
    metrics: null,
    score: legacyScore,
    getBreakdownForCategory: () => undefined,
    isGoodDeal: (result?.dealScore ?? 0) >= 60,
    improvementSuggestions: [],
  };
}

export default useDealScore;
