/**
 * useDealScore — Hook for calculating Deal Score via backend API
 * Matches frontend/src/hooks/useDealScore.ts
 *
 * All financial calculations run on the backend.
 * This hook provides the bridge with AbortController and debouncing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { post } from '../services/apiClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DealScoreInput {
  listPrice: number;
  purchasePrice: number;
  monthlyRent: number;
  propertyTaxes: number;
  insurance: number;
  // Optional overrides
  vacancyRate?: number;
  maintenancePct?: number;
  managementPct?: number;
  downPaymentPct?: number;
  interestRate?: number;
  loanTermYears?: number;
  // Enhanced Deal Opportunity Score — Listing Context (optional)
  listingStatus?: string | null;
  sellerType?: string | null;
  isForeclosure?: boolean;
  isBankOwned?: boolean;
  isFsbo?: boolean;
  isAuction?: boolean;
  priceReductions?: number;
  daysOnMarket?: number | null;
}

export interface DealScoreFactors {
  dealGapScore: number;
  dealGapPercent: number;
  availabilityScore: number;
  availabilityStatus: string;
  availabilityLabel: string;
  availabilityMotivation: 'high' | 'medium' | 'low';
  domScore: number;
  domLeverage: 'high' | 'medium' | 'low' | 'unknown';
  daysOnMarket: number | null;
}

export interface DealScoreResult {
  dealScore: number;
  dealVerdict: string;
  discountPercent: number;
  incomeValue: number;  // Price where cash flow = $0 (from API breakeven_price)
  purchasePrice: number;
  listPrice: number;
  // Enhanced scoring (populated when listing context provided)
  factors?: DealScoreFactors;
  grade?: string;
  color?: string;
  calculationDetails?: Record<string, number>;
}

interface UseDealScoreOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

export interface UseDealScoreReturn {
  result: DealScoreResult | null;
  isLoading: boolean;
  error: string | null;
  recalculate: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDealScore(
  input: DealScoreInput,
  options: UseDealScoreOptions = {},
): UseDealScoreReturn {
  const { debounceMs = 300 } = options;

  const [result, setResult] = useState<DealScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDealScore = useCallback(async () => {
    // Cancel pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Validate required inputs
    if (!input.listPrice || !input.purchasePrice || !input.monthlyRent) {
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await post<Record<string, any>>(
        '/api/v1/worksheet/deal-score',
        {
          list_price: input.listPrice,
          purchase_price: input.purchasePrice,
          monthly_rent: input.monthlyRent,
          property_taxes: input.propertyTaxes,
          insurance: input.insurance,
          vacancy_rate: input.vacancyRate,
          maintenance_pct: input.maintenancePct,
          management_pct: input.managementPct,
          down_payment_pct: input.downPaymentPct,
          interest_rate: input.interestRate,
          loan_term_years: input.loanTermYears,
          // Enhanced Deal Opportunity Score — Listing Context
          listing_status: input.listingStatus,
          seller_type: input.sellerType,
          is_foreclosure: input.isForeclosure,
          is_bank_owned: input.isBankOwned,
          is_fsbo: input.isFsbo,
          is_auction: input.isAuction,
          price_reductions: input.priceReductions,
          days_on_market: input.daysOnMarket,
        },
      );

      setResult({
        dealScore: data.deal_score,
        dealVerdict: data.deal_verdict,
        discountPercent: data.discount_percent,
        incomeValue: data.income_value ?? data.breakeven_price ?? 0,
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
        calculationDetails: data.calculation_details,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(
        err instanceof Error ? err.message : 'Failed to calculate deal score',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    input.listPrice,
    input.purchasePrice,
    input.monthlyRent,
    input.propertyTaxes,
    input.insurance,
    input.vacancyRate,
    input.maintenancePct,
    input.managementPct,
    input.downPaymentPct,
    input.interestRate,
    input.loanTermYears,
    input.listingStatus,
    input.sellerType,
    input.isForeclosure,
    input.isBankOwned,
    input.isFsbo,
    input.isAuction,
    input.priceReductions,
    input.daysOnMarket,
  ]);

  // Debounced fetch
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fetchDealScore, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchDealScore, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return { result, isLoading, error, recalculate: fetchDealScore };
}

// ─── Display Utilities ──────────────────────────────────────────────────────

/** Get Deal Score color based on score value. */
export function getDealScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#3B82F6'; // Blue
  if (score >= 40) return '#F59E0B'; // Amber
  if (score >= 20) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

/** Get Deal Score gauge angle for display. */
export function getDealScoreGaugeAngle(score: number): number {
  return 180 - score * 1.8;
}

export type DealScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type DealScoreLabel =
  | 'STRONG'
  | 'GOOD'
  | 'MODERATE'
  | 'POTENTIAL'
  | 'WEAK'
  | 'POOR';

export interface DealScoreGradeDisplay {
  grade: DealScoreGrade;
  label: DealScoreLabel;
  color: string;
}

/**
 * Convert a numeric deal score to a grade display.
 * Grade mapping:
 * - 85-100: A+ / STRONG / green
 * - 70-84:  A  / GOOD / green
 * - 55-69:  B  / MODERATE / lime
 * - 40-54:  C  / POTENTIAL / orange
 * - 25-39:  D  / WEAK / orange
 * - 0-24:   F  / POOR / red
 */
export function getDealScoreGrade(score: number): DealScoreGradeDisplay {
  if (score >= 85) return { grade: 'A+', label: 'STRONG', color: '#22c55e' };
  if (score >= 70) return { grade: 'A', label: 'GOOD', color: '#22c55e' };
  if (score >= 55) return { grade: 'B', label: 'MODERATE', color: '#84cc16' };
  if (score >= 40) return { grade: 'C', label: 'POTENTIAL', color: '#f97316' };
  if (score >= 25) return { grade: 'D', label: 'WEAK', color: '#f97316' };
  return { grade: 'F', label: 'POOR', color: '#ef4444' };
}
