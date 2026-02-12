/**
 * useBackendStrategies — Replaces local useAllStrategies with backend calculations
 *
 * Calls POST /api/v1/analytics/calculate to get all 6 strategy results
 * from the backend instead of computing them locally.
 *
 * Architecture: All financial calculations run on the backend.
 * The client only provides inputs and displays results.
 */

import { useState, useEffect, useRef } from 'react';
import { post } from '../services/apiClient';

export type StrategyType =
  | 'longTermRental'
  | 'shortTermRental'
  | 'brrrr'
  | 'fixAndFlip'
  | 'houseHack'
  | 'wholesale';

export interface StrategyResult {
  strategy: StrategyType;
  name: string;
  icon: string;
  score: number;
  grade: string;
  color: string;
  viable: boolean;
  rank: number;
  analysis: {
    strategy: StrategyType;
    score: number;
    grade: string;
    color: string;
    metrics: Record<string, unknown>;
    insights: Array<{ type: string; text: string; icon?: string; highlight?: string }>;
    isViable: boolean;
  };
}

export interface AllStrategiesResult {
  strategies: Record<StrategyType, StrategyResult>;
  bestStrategy: StrategyType;
  rankings: StrategyType[];
  viableStrategies: StrategyType[];
}

export interface StrategyInputs {
  purchasePrice: number;
  monthlyRent: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  downPaymentPercent?: number;
  interestRate?: number;
  loanTermYears?: number;
}

const DEBOUNCE_MS = 300;

const STRATEGY_INFO: Record<StrategyType, { name: string; icon: string }> = {
  longTermRental: { name: 'Long-Term Rental', icon: '🏠' },
  shortTermRental: { name: 'Short-Term Rental', icon: '🏨' },
  brrrr: { name: 'BRRRR', icon: '🔄' },
  fixAndFlip: { name: 'Fix & Flip', icon: '🔨' },
  houseHack: { name: 'House Hack', icon: '🏡' },
  wholesale: { name: 'Wholesale', icon: '📋' },
};

// Map backend strategy keys to frontend StrategyType
const BACKEND_KEY_MAP: Record<string, StrategyType> = {
  ltr: 'longTermRental',
  str: 'shortTermRental',
  brrrr: 'brrrr',
  flip: 'fixAndFlip',
  house_hack: 'houseHack',
  wholesale: 'wholesale',
};

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e';
    case 'B':
      return '#3b82f6';
    case 'C':
      return '#f97316';
    case 'D':
    case 'F':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function getGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function buildEmptyResult(): AllStrategiesResult {
  const allTypes: StrategyType[] = [
    'longTermRental',
    'shortTermRental',
    'brrrr',
    'fixAndFlip',
    'houseHack',
    'wholesale',
  ];

  const strategies = {} as Record<StrategyType, StrategyResult>;
  allTypes.forEach((type, index) => {
    const info = STRATEGY_INFO[type];
    strategies[type] = {
      strategy: type,
      name: info.name,
      icon: info.icon,
      score: 0,
      grade: 'F',
      color: '#6b7280',
      viable: false,
      rank: index + 1,
      analysis: {
        strategy: type,
        score: 0,
        grade: 'F',
        color: '#6b7280',
        metrics: {},
        insights: [],
        isViable: false,
      },
    };
  });

  return {
    strategies,
    bestStrategy: 'longTermRental',
    rankings: allTypes,
    viableStrategies: [],
  };
}

/**
 * Build backend payload from simplified inputs.
 * The backend /api/v1/analytics/calculate expects property_id + assumptions,
 * but we can also send inline values.
 */
function buildPayload(inputs: StrategyInputs): Record<string, unknown> {
  return {
    property_id: 'inline',
    list_price: inputs.purchasePrice,
    monthly_rent: inputs.monthlyRent,
    property_taxes: inputs.annualPropertyTax ?? 3600,
    insurance: inputs.annualInsurance ?? 1500,
    assumptions: {
      financing: {
        purchase_price: inputs.purchasePrice,
        down_payment_pct: (inputs.downPaymentPercent ?? 0.2) * 100,
        interest_rate: (inputs.interestRate ?? 0.06) * 100,
        loan_term_years: inputs.loanTermYears ?? 30,
      },
    },
  };
}

export interface UseBackendStrategiesReturn {
  result: AllStrategiesResult;
  isLoading: boolean;
  error: string | null;
}

export function useBackendStrategies(
  inputs: StrategyInputs,
): UseBackendStrategiesReturn {
  const [result, setResult] = useState<AllStrategiesResult>(buildEmptyResult);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        // Call the IQ Verdict endpoint which returns all strategies scored
        const payload = {
          list_price: inputs.purchasePrice,
          monthly_rent: inputs.monthlyRent,
          property_taxes: inputs.annualPropertyTax ?? 3600,
          insurance: inputs.annualInsurance ?? 1500,
        };

        const response = await post<{
          deal_score: number;
          strategies: Array<{
            id: string;
            name: string;
            score: number;
            badge: string;
            cap_rate: number;
            cash_on_cash: number;
            dscr: number;
            annual_cash_flow: number;
            monthly_cash_flow: number;
            metric_label: string;
            metric_value: string;
          }>;
        }>('/api/v1/analysis/verdict', payload);

        const strategies = {} as Record<StrategyType, StrategyResult>;
        const allTypes: StrategyType[] = [];

        // Map backend strategies to frontend types
        for (const backendStrat of response.strategies) {
          const frontendType = BACKEND_KEY_MAP[backendStrat.id];
          if (!frontendType) continue;

          allTypes.push(frontendType);
          const info = STRATEGY_INFO[frontendType];
          const grade = getGrade(backendStrat.score);
          const viable = backendStrat.monthly_cash_flow > 0 || backendStrat.score >= 40;

          strategies[frontendType] = {
            strategy: frontendType,
            name: info.name,
            icon: info.icon,
            score: backendStrat.score,
            grade,
            color: getGradeColor(grade),
            viable,
            rank: 0,
            analysis: {
              strategy: frontendType,
              score: backendStrat.score,
              grade,
              color: getGradeColor(grade),
              metrics: {
                monthlyCashFlow: backendStrat.monthly_cash_flow,
                annualCashFlow: backendStrat.annual_cash_flow,
                cashOnCash: backendStrat.cash_on_cash * 100,
                capRate: backendStrat.cap_rate * 100,
                dscr: backendStrat.dscr,
                metricLabel: backendStrat.metric_label,
                metricValue: backendStrat.metric_value,
              },
              insights: [],
              isViable: viable,
            },
          };
        }

        // Fill in any missing strategies with empty results
        const allStrategyTypes: StrategyType[] = [
          'longTermRental', 'shortTermRental', 'brrrr',
          'fixAndFlip', 'houseHack', 'wholesale',
        ];
        for (const type of allStrategyTypes) {
          if (!strategies[type]) {
            const info = STRATEGY_INFO[type];
            strategies[type] = {
              strategy: type,
              name: info.name,
              icon: info.icon,
              score: 0,
              grade: 'F',
              color: '#6b7280',
              viable: false,
              rank: 99,
              analysis: {
                strategy: type,
                score: 0,
                grade: 'F',
                color: '#6b7280',
                metrics: {},
                insights: [],
                isViable: false,
              },
            };
          }
        }

        // Rank strategies by score
        const rankings = [...allStrategyTypes].sort((a, b) => {
          const sa = strategies[a];
          const sb = strategies[b];
          if (sa.viable && !sb.viable) return -1;
          if (!sa.viable && sb.viable) return 1;
          return sb.score - sa.score;
        });
        rankings.forEach((s, i) => {
          strategies[s].rank = i + 1;
        });

        setResult({
          strategies,
          bestStrategy: rankings[0],
          rankings,
          viableStrategies: rankings.filter((s) => strategies[s].viable),
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(
          err instanceof Error ? err.message : 'Failed to analyze strategies',
        );
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    inputs.purchasePrice,
    inputs.monthlyRent,
    inputs.annualPropertyTax,
    inputs.annualInsurance,
    inputs.downPaymentPercent,
    inputs.interestRate,
    inputs.loanTermYears,
  ]);

  return { result, isLoading, error };
}
