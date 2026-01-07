/**
 * usePropertyCalculations Hook
 * Main hook orchestrating all property calculations
 */

import { useMemo, useState, useCallback } from 'react';
import { AnalyticsInputs, CalculatedMetrics, DealScore, Insight, YearProjection } from '../types';
import {
  calculateMetrics,
  calculateDealScore,
  generateInsights,
  projectTenYears,
  calculateAmortizationSchedule,
} from '../calculations';
import { useDealScore } from './useDealScore';
import { useScenarios } from './useScenarios';
import { useSensitivityAnalysis } from './useSensitivityAnalysis';

interface UsePropertyCalculationsResult {
  // Core data
  inputs: AnalyticsInputs;
  metrics: CalculatedMetrics;
  score: DealScore;
  insights: Insight[];
  projections: YearProjection[];
  amortization: ReturnType<typeof calculateAmortizationSchedule>;
  
  // Input management
  updateInput: <K extends keyof AnalyticsInputs>(key: K, value: AnalyticsInputs[K]) => void;
  updateInputs: (updates: Partial<AnalyticsInputs>) => void;
  resetInputs: () => void;
  
  // Scenario management
  scenarios: ReturnType<typeof useScenarios>;
  
  // Sensitivity analysis
  sensitivity: ReturnType<typeof useSensitivityAnalysis>;
  
  // Deal score utilities
  dealScore: ReturnType<typeof useDealScore>;
  
  // Summary data
  summary: DealSummary;
}

interface DealSummary {
  isPositiveCashFlow: boolean;
  meetsOnePercentRule: boolean;
  meetsDSCRRequirement: boolean;
  yearOneROI: number;
  paybackPeriod: number;
  tenYearWealth: number;
}

export function usePropertyCalculations(
  initialInputs: AnalyticsInputs
): UsePropertyCalculationsResult {
  const [inputs, setInputs] = useState<AnalyticsInputs>(initialInputs);

  // Core calculations
  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);
  const score = useMemo(() => calculateDealScore(metrics), [metrics]);
  const insights = useMemo(() => generateInsights(metrics, inputs), [metrics, inputs]);
  const projections = useMemo(() => projectTenYears(inputs, metrics), [inputs, metrics]);
  const amortization = useMemo(
    () => calculateAmortizationSchedule(metrics.loanAmount, inputs.interestRate, inputs.loanTermYears),
    [metrics.loanAmount, inputs.interestRate, inputs.loanTermYears]
  );

  // Hooks
  const dealScore = useDealScore(inputs);
  const scenarios = useScenarios(inputs);
  const sensitivity = useSensitivityAnalysis(inputs);

  // Input management
  const updateInput = useCallback(
    <K extends keyof AnalyticsInputs>(key: K, value: AnalyticsInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateInputs = useCallback((updates: Partial<AnalyticsInputs>) => {
    setInputs((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetInputs = useCallback(() => {
    setInputs(initialInputs);
  }, [initialInputs]);

  // Summary calculations
  const summary = useMemo<DealSummary>(() => {
    // Payback period (years to recover initial investment)
    const paybackPeriod =
      metrics.annualCashFlow > 0
        ? metrics.totalCashRequired / metrics.annualCashFlow
        : Infinity;

    // Year 1 ROI (cash flow + equity growth) / investment
    const yearOneROI =
      metrics.totalCashRequired > 0
        ? ((metrics.annualCashFlow + metrics.yearOneEquityGrowth) / metrics.totalCashRequired) * 100
        : 0;

    // 10-year wealth accumulation
    const tenYearWealth = projections[9]?.totalWealth || 0;

    return {
      isPositiveCashFlow: metrics.monthlyCashFlow > 0,
      meetsOnePercentRule: metrics.onePercentRule >= 1.0,
      meetsDSCRRequirement: metrics.dscr >= 1.25,
      yearOneROI,
      paybackPeriod,
      tenYearWealth,
    };
  }, [metrics, projections]);

  return {
    inputs,
    metrics,
    score,
    insights,
    projections,
    amortization,
    updateInput,
    updateInputs,
    resetInputs,
    scenarios,
    sensitivity,
    dealScore,
    summary,
  };
}

export default usePropertyCalculations;

