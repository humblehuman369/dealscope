/**
 * usePropertyAnalysis - Hook for fetching property analysis from backend
 *
 * Calls the IQ Verdict endpoint to get:
 * - Strategy grades and scores
 * - Deal score / opportunity rating
 * - Target price (breakeven × 0.95)
 * - Return factors for each strategy
 *
 * This replaces the frontend mock calculations with real backend data.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import { StrategyId, TargetAssumptions, PropertyData } from '../components/analytics/redesign/types';

// ============================================
// API RESPONSE TYPES (matches backend IQVerdictResponse)
// ============================================

export interface ScoreDisplayResponse {
  score: number;
  grade: string;
  label: string;
  color: string;
}

export interface OpportunityFactorsResponse {
  dealGap: number;
  motivation: number;
  motivationLabel: string;
  daysOnMarket: number | null;
  buyerMarket: string | null;
  distressedSale: boolean;
}

export interface ReturnFactorsResponse {
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  annualRoi: number | null;
  annualProfit: number | null;
  strategyName: string;
}

export interface StrategyResultResponse {
  id: string;
  name: string;
  metric: string;
  metricLabel: string;
  metricValue: number;
  score: number;
  rank: number;
  badge: string | null;
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  annualCashFlow: number | null;
  monthlyCashFlow: number | null;
}

export interface IQVerdictResponse {
  // Legacy fields
  dealScore: number;
  dealVerdict: string;
  verdictDescription: string;
  discountPercent: number;
  strategies: StrategyResultResponse[];
  purchasePrice: number;
  breakevenPrice: number;
  listPrice: number;
  inputsUsed: Record<string, unknown>;
  defaultsUsed: Record<string, unknown>;
  // New grade-based display
  opportunity: ScoreDisplayResponse;
  opportunityFactors: OpportunityFactorsResponse;
  returnRating: ScoreDisplayResponse;
  returnFactors: ReturnFactorsResponse;
}

export interface VerdictInput {
  listPrice: number;
  monthlyRent?: number;
  propertyTaxes?: number;
  insurance?: number;
  arv?: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  bedrooms?: number;
  listingStatus?: string;
  sellerType?: string;
  isForeclosure?: boolean;
  isBankOwned?: boolean;
  isFsbo?: boolean;
  daysOnMarket?: number;
  marketTemperature?: string;
}

// ============================================
// DERIVED TYPES FOR COMPONENTS
// ============================================

export interface StrategyGrades {
  ltr: { grade: string; score: number };
  str: { grade: string; score: number };
  brrrr: { grade: string; score: number };
  flip: { grade: string; score: number };
  house_hack: { grade: string; score: number };
  wholesale: { grade: string; score: number };
}

export interface PropertyAnalysisResult {
  // The full API response
  raw: IQVerdictResponse | null;
  // Derived data for components
  strategyGrades: StrategyGrades;
  targetPrice: number;
  breakevenPrice: number;
  discountPercent: number;
  dealScore: {
    score: number;
    grade: string;
    label: string;
    color: string;
  };
  opportunityFactors: OpportunityFactorsResponse | null;
  returnFactors: ReturnFactorsResponse | null;
  // Strategy-specific metrics
  strategies: StrategyResultResponse[];
  // Loading state
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePropertyAnalysis(
  property: PropertyData | null,
  assumptions?: Partial<TargetAssumptions>
): PropertyAnalysisResult & { refetch: () => Promise<void> } {
  const [data, setData] = useState<IQVerdictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!property) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build the verdict input from property data
      const input: VerdictInput = {
        listPrice: property.listPrice,
        monthlyRent: assumptions?.monthlyRent ?? property.monthlyRent,
        propertyTaxes: property.propertyTaxes,
        insurance: property.insurance,
        arv: property.arv,
        averageDailyRate: assumptions?.averageDailyRate ?? property.averageDailyRate,
        occupancyRate: assumptions?.occupancyRate ?? property.occupancyRate,
        bedrooms: property.bedrooms,
      };

      const response = await api.post<IQVerdictResponse>(
        '/api/v1/analysis/verdict',
        input
      );

      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis';
      setError(errorMessage);
      console.error('[usePropertyAnalysis] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [property, assumptions]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Convert API response to component-friendly format
  const result = convertToComponentData(data, property, isLoading, error);

  return {
    ...result,
    refetch: fetchAnalysis,
  };
}

// ============================================
// HELPER: Convert API response to component data
// ============================================

function convertToComponentData(
  data: IQVerdictResponse | null,
  property: PropertyData | null,
  isLoading: boolean,
  error: string | null
): PropertyAnalysisResult {
  // Default/fallback values when no data
  const defaultGrades: StrategyGrades = {
    ltr: { grade: '-', score: 0 },
    str: { grade: '-', score: 0 },
    brrrr: { grade: '-', score: 0 },
    flip: { grade: '-', score: 0 },
    house_hack: { grade: '-', score: 0 },
    wholesale: { grade: '-', score: 0 },
  };

  if (!data) {
    return {
      raw: null,
      strategyGrades: defaultGrades,
      targetPrice: property?.listPrice ? Math.round(property.listPrice * 0.80) : 0,
      breakevenPrice: property?.listPrice ? Math.round(property.listPrice * 0.88) : 0,
      discountPercent: 20,
      dealScore: {
        score: 0,
        grade: '-',
        label: 'Loading...',
        color: '#9ca3af',
      },
      opportunityFactors: null,
      returnFactors: null,
      strategies: [],
      isLoading,
      error,
    };
  }

  // Convert strategies array to grade map
  const strategyGrades: StrategyGrades = { ...defaultGrades };
  
  for (const strategy of data.strategies) {
    const id = strategy.id as StrategyId;
    const grade = scoreToGrade(strategy.score);
    
    if (id in strategyGrades) {
      strategyGrades[id] = { grade, score: strategy.score };
    }
  }

  return {
    raw: data,
    strategyGrades,
    targetPrice: data.purchasePrice,
    breakevenPrice: data.breakevenPrice,
    discountPercent: data.discountPercent,
    dealScore: {
      score: data.opportunity.score,
      grade: data.opportunity.grade,
      label: data.opportunity.label,
      color: data.opportunity.color,
    },
    opportunityFactors: data.opportunityFactors,
    returnFactors: data.returnFactors,
    strategies: data.strategies,
    isLoading,
    error,
  };
}

// ============================================
// HELPER: Convert score to letter grade
// ============================================

function scoreToGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'A-';
  if (score >= 55) return 'B+';
  if (score >= 50) return 'B';
  if (score >= 45) return 'B-';
  if (score >= 40) return 'C+';
  if (score >= 35) return 'C';
  if (score >= 30) return 'C-';
  if (score >= 25) return 'D';
  return 'F';
}

export default usePropertyAnalysis;
