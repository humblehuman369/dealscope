/**
 * useIQAnalysis - Hook to fetch IQ Verdict from backend API
 *
 * Replaces the previous local-calculation approach (useAllStrategies) with
 * a backend call to POST /api/v1/analysis/verdict, ensuring mobile and
 * frontend always show identical numbers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../services/apiClient';
import { AnalyticsInputs } from '../types';
import type {
  IQAnalysisResult,
  IQStrategy,
  IQStrategyBadge,
  IQDealVerdict,
} from './types';
import {
  STRATEGY_INFO,
  getDealVerdict as localGetDealVerdict,
} from './types';

// ============================================
// Backend response shape (matches IQVerdictResponse)
// ============================================

interface BackendStrategy {
  id: string;
  name: string;
  metric: string;
  metric_label?: string;
  metricLabel?: string;
  metric_value?: number;
  metricValue?: number;
  score: number;
  rank: number;
  badge: string | null;
}

interface BackendVerdictResponse {
  deal_score?: number;
  dealScore?: number;
  deal_verdict?: string;
  dealVerdict?: string;
  verdict_description?: string;
  verdictDescription?: string;
  discount_percent?: number;
  discountPercent?: number;
  strategies: BackendStrategy[];
  purchase_price?: number;
  purchasePrice?: number;
  breakeven_price?: number;
  breakevenPrice?: number;
  list_price?: number;
  listPrice?: number;
  // Component scores — flat top-level fields from backend (both key formats)
  deal_gap_score?: number; dealGapScore?: number;
  return_quality_score?: number; returnQualityScore?: number;
  market_alignment_score?: number; marketAlignmentScore?: number;
  deal_probability_score?: number; dealProbabilityScore?: number;
}

// ============================================
// Hook return type
// ============================================

export interface UseIQAnalysisResult {
  analysis: IQAnalysisResult;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Mapping helpers
// ============================================

function mapBadge(raw: string | null): IQStrategyBadge | null {
  if (raw === 'Strong' || raw === 'Good' || raw === 'Best Match') {
    return raw as IQStrategyBadge;
  }
  return null;
}

function mapStrategies(strategies: BackendStrategy[]): IQStrategy[] {
  return strategies.map((s) => {
    const id = s.id as IQStrategy['id'];
    const info = STRATEGY_INFO[id] ?? { name: s.name, icon: '📊' };
    return {
      id,
      name: info.name,
      icon: info.icon,
      metric: s.metric,
      metricLabel: s.metric_label ?? s.metricLabel ?? '',
      metricValue: s.metric_value ?? s.metricValue ?? 0,
      score: s.score,
      rank: s.rank,
      badge: mapBadge(s.badge),
    };
  });
}

function buildEmptyAnalysis(): IQAnalysisResult {
  return {
    analyzedAt: new Date().toISOString(),
    dealScore: 0,
    dealVerdict: 'Poor Investment',
    verdictDescription: 'Analyzing...',
    strategies: [],
  };
}

/** Max displayable score — no deal is ever 100% certain */
const SCORE_CAP = 95;

function mapResponse(res: BackendVerdictResponse): IQAnalysisResult {
  const rawScore = res.deal_score ?? res.dealScore ?? 0;
  // Hard-cap: no property should ever show 100 — there is always risk
  const dealScore = Math.min(SCORE_CAP, Math.max(0, rawScore));
  const dealVerdict = (res.deal_verdict ?? res.dealVerdict ?? localGetDealVerdict(dealScore)) as IQDealVerdict;
  const verdictDescription = res.verdict_description ?? res.verdictDescription ?? '';

  return {
    analyzedAt: new Date().toISOString(),
    dealScore,
    dealVerdict,
    verdictDescription,
    strategies: mapStrategies(res.strategies),
    componentScores: {
      dealGapScore: Number(res.dealGapScore ?? res.deal_gap_score ?? 0),
      returnQualityScore: Number(res.returnQualityScore ?? res.return_quality_score ?? 0),
      marketAlignmentScore: Number(res.marketAlignmentScore ?? res.market_alignment_score ?? 0),
      dealProbabilityScore: Number(res.dealProbabilityScore ?? res.deal_probability_score ?? 0),
    },
  };
}

// ============================================
// Hook
// ============================================

const DEBOUNCE_MS = 200;

export function useIQAnalysis(baseInputs: AnalyticsInputs): UseIQAnalysisResult {
  const [analysis, setAnalysis] = useState<IQAnalysisResult>(buildEmptyAnalysis);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Debounce: clear any pending request
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const payload = {
          list_price: baseInputs.purchasePrice,
          monthly_rent: baseInputs.monthlyRent,
          property_taxes: baseInputs.annualPropertyTax,
          insurance: baseInputs.annualInsurance,
        };

        const res = await api.post<BackendVerdictResponse>(
          '/api/v1/analysis/verdict',
          payload,
        );

        if (!controller.signal.aborted) {
          setAnalysis(mapResponse(res));
          setError(null);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch verdict';
          setError(msg);
          // Keep stale data visible; don't reset analysis
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    baseInputs.purchasePrice,
    baseInputs.monthlyRent,
    baseInputs.annualPropertyTax,
    baseInputs.annualInsurance,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { analysis, isLoading, error };
}

/**
 * Create IQ analysis inputs from property data using default assumptions.
 * Display/fallback only — no financial calculations. Backend verdict uses
 * GET /api/v1/defaults (backend/app/core/defaults.py) when optional fields are omitted.
 * These values should match backend; prefer fetching GET /api/v1/defaults for consistency.
 */
export function createIQInputsFromProperty(property: {
  price: number;
  monthlyRent?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyTaxes?: number;
  insurance?: number;
}): AnalyticsInputs {
  const estimatedRent = property.monthlyRent || Math.round(property.price * 0.008);
  const estimatedTaxes = property.propertyTaxes || Math.round(property.price * 0.012);
  const estimatedInsurance =
    property.insurance || Math.round(1500 + (property.sqft || 1500) * 3);

  return {
    purchasePrice: property.price,
    downPaymentPercent: 0.2,
    closingCostsPercent: 0.03,
    interestRate: 0.0685,
    loanTermYears: 30,
    monthlyRent: estimatedRent,
    otherIncome: 0,
    vacancyRate: 0.05,
    maintenanceRate: 0.05,
    managementRate: 0,
    annualPropertyTax: estimatedTaxes,
    annualInsurance: estimatedInsurance,
    monthlyHoa: 0,
    appreciationRate: 0.03,
    rentGrowthRate: 0.03,
    expenseGrowthRate: 0.02,
  };
}

export default useIQAnalysis;
