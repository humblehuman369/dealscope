/**
 * useSensitivityAnalysis Hook
 * Analyzes how changes in key variables affect deal performance
 */

import { useMemo, useCallback } from 'react';
import { AnalyticsInputs, CalculatedMetrics } from '../types';
import { calculateMetrics, calculateDealScore } from '../calculations';

interface SensitivityPoint {
  value: number;
  cashFlow: number;
  cashOnCash: number;
  score: number;
  label: string;
}

interface SensitivityVariable {
  key: keyof AnalyticsInputs;
  label: string;
  range: number[]; // e.g., [-20, -10, 0, 10, 20] for % changes
  points: SensitivityPoint[];
  impact: 'high' | 'medium' | 'low';
  direction: 'positive' | 'negative' | 'neutral';
}

interface BreakEvenPoints {
  vacancyBreakEven: number;
  rateBreakEven: number;
  rentBreakEven: number;
}

interface UseSensitivityResult {
  variables: SensitivityVariable[];
  breakEvenPoints: BreakEvenPoints;
  analyzeSingleVariable: (
    key: keyof AnalyticsInputs,
    percentChanges: number[]
  ) => SensitivityVariable;
  findBreakEven: (key: keyof AnalyticsInputs) => number | null;
  getWorstCase: () => CalculatedMetrics;
  getBestCase: () => CalculatedMetrics;
  getMonteCarloResults: (iterations: number) => MonteCarloResult;
}

interface MonteCarloResult {
  median: number;
  percentile10: number;
  percentile90: number;
  probability: {
    positive: number;
    break500: number;
  };
}

export function useSensitivityAnalysis(inputs: AnalyticsInputs): UseSensitivityResult {
  // Default percent changes to analyze
  const defaultRange = [-20, -10, 0, 10, 20];

  // Analyze a single variable
  const analyzeSingleVariable = useCallback(
    (key: keyof AnalyticsInputs, percentChanges: number[]): SensitivityVariable => {
      const baseValue = inputs[key] as number;
      const baseMetrics = calculateMetrics(inputs);
      const baseScore = calculateDealScore(baseMetrics).score;

      const points: SensitivityPoint[] = percentChanges.map((pct) => {
        const newValue = baseValue * (1 + pct / 100);
        const newInputs = { ...inputs, [key]: newValue };
        const metrics = calculateMetrics(newInputs);
        const score = calculateDealScore(metrics);

        return {
          value: newValue,
          cashFlow: metrics.monthlyCashFlow,
          cashOnCash: metrics.cashOnCash,
          score: score.score,
          label: `${pct >= 0 ? '+' : ''}${pct}%`,
        };
      });

      // Calculate impact
      const maxChange = Math.max(
        ...points.map((p) => Math.abs(p.cashFlow - baseMetrics.monthlyCashFlow))
      );
      const impact: 'high' | 'medium' | 'low' =
        maxChange > 200 ? 'high' : maxChange > 100 ? 'medium' : 'low';

      // Determine direction (does increasing this variable improve or hurt?)
      const posPoint = points.find((p) => p.label === '+20%');
      const direction: 'positive' | 'negative' | 'neutral' =
        posPoint && Math.abs(posPoint.cashFlow - baseMetrics.monthlyCashFlow) > 10
          ? posPoint.cashFlow > baseMetrics.monthlyCashFlow
            ? 'positive'
            : 'negative'
          : 'neutral';

      return {
        key,
        label: getVariableLabel(key),
        range: percentChanges,
        points,
        impact,
        direction,
      };
    },
    [inputs]
  );

  // Analyze key variables
  const variables = useMemo<SensitivityVariable[]>(() => {
    const keysToAnalyze: (keyof AnalyticsInputs)[] = [
      'purchasePrice',
      'monthlyRent',
      'interestRate',
      'vacancyRate',
      'downPaymentPercent',
    ];

    return keysToAnalyze.map((key) => analyzeSingleVariable(key, defaultRange));
  }, [analyzeSingleVariable]);

  // Find break-even point for a variable
  const findBreakEven = useCallback(
    (key: keyof AnalyticsInputs): number | null => {
      const baseValue = inputs[key] as number;
      const baseMetrics = calculateMetrics(inputs);

      if (baseMetrics.monthlyCashFlow <= 0) {
        // Already negative, find when it becomes positive
        for (let pct = 0; pct <= 50; pct += 1) {
          const testValue =
            key === 'purchasePrice' || key === 'interestRate' || key === 'vacancyRate'
              ? baseValue * (1 - pct / 100)
              : baseValue * (1 + pct / 100);
          const testInputs = { ...inputs, [key]: testValue };
          const testMetrics = calculateMetrics(testInputs);
          if (testMetrics.monthlyCashFlow > 0) {
            return testValue;
          }
        }
      } else {
        // Positive, find when it becomes negative
        for (let pct = 0; pct <= 100; pct += 1) {
          const testValue =
            key === 'purchasePrice' || key === 'interestRate' || key === 'vacancyRate'
              ? baseValue * (1 + pct / 100)
              : baseValue * (1 - pct / 100);
          const testInputs = { ...inputs, [key]: testValue };
          const testMetrics = calculateMetrics(testInputs);
          if (testMetrics.monthlyCashFlow <= 0) {
            return testValue;
          }
        }
      }

      return null;
    },
    [inputs]
  );

  // Calculate break-even points
  const breakEvenPoints = useMemo<BreakEvenPoints>(() => {
    // Vacancy break-even
    let vacancyBreakEven = 0;
    for (let vac = 0; vac <= 0.5; vac += 0.01) {
      const testInputs = { ...inputs, vacancyRate: vac };
      const metrics = calculateMetrics(testInputs);
      if (metrics.monthlyCashFlow <= 0) {
        vacancyBreakEven = (vac - 0.01) * 100;
        break;
      }
    }

    // Interest rate break-even
    let rateBreakEven = inputs.interestRate * 100;
    for (let rate = inputs.interestRate; rate <= 0.15; rate += 0.0025) {
      const testInputs = { ...inputs, interestRate: rate };
      const metrics = calculateMetrics(testInputs);
      if (metrics.monthlyCashFlow <= 0) {
        rateBreakEven = (rate - 0.0025) * 100;
        break;
      }
    }

    // Rent break-even
    let rentBreakEven = inputs.monthlyRent;
    for (let rent = inputs.monthlyRent; rent >= 0; rent -= 50) {
      const testInputs = { ...inputs, monthlyRent: rent };
      const metrics = calculateMetrics(testInputs);
      if (metrics.monthlyCashFlow <= 0) {
        rentBreakEven = rent + 50;
        break;
      }
    }

    return { vacancyBreakEven, rateBreakEven, rentBreakEven };
  }, [inputs]);

  // Get worst case scenario
  const getWorstCase = useCallback((): CalculatedMetrics => {
    const worstInputs: AnalyticsInputs = {
      ...inputs,
      vacancyRate: Math.min(0.15, inputs.vacancyRate * 1.5),
      interestRate: Math.min(0.12, inputs.interestRate * 1.15),
      maintenanceRate: Math.min(0.12, inputs.maintenanceRate * 1.5),
      monthlyRent: inputs.monthlyRent * 0.9,
    };
    return calculateMetrics(worstInputs);
  }, [inputs]);

  // Get best case scenario
  const getBestCase = useCallback((): CalculatedMetrics => {
    const bestInputs: AnalyticsInputs = {
      ...inputs,
      vacancyRate: Math.max(0.02, inputs.vacancyRate * 0.5),
      interestRate: Math.max(0.04, inputs.interestRate * 0.85),
      maintenanceRate: Math.max(0.02, inputs.maintenanceRate * 0.5),
      monthlyRent: inputs.monthlyRent * 1.1,
    };
    return calculateMetrics(bestInputs);
  }, [inputs]);

  // Monte Carlo simulation
  const getMonteCarloResults = useCallback(
    (iterations: number): MonteCarloResult => {
      const cashFlows: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Random variations
        const vacVariation = 1 + (Math.random() - 0.5) * 0.4; // ±20%
        const rentVariation = 1 + (Math.random() - 0.5) * 0.2; // ±10%
        const maintVariation = 1 + (Math.random() - 0.5) * 0.4; // ±20%

        const testInputs: AnalyticsInputs = {
          ...inputs,
          vacancyRate: inputs.vacancyRate * vacVariation,
          monthlyRent: inputs.monthlyRent * rentVariation,
          maintenanceRate: inputs.maintenanceRate * maintVariation,
        };

        const metrics = calculateMetrics(testInputs);
        cashFlows.push(metrics.monthlyCashFlow);
      }

      // Sort for percentiles
      cashFlows.sort((a, b) => a - b);

      const median = cashFlows[Math.floor(iterations / 2)];
      const percentile10 = cashFlows[Math.floor(iterations * 0.1)];
      const percentile90 = cashFlows[Math.floor(iterations * 0.9)];
      const positiveCount = cashFlows.filter((cf) => cf > 0).length;
      const break500Count = cashFlows.filter((cf) => cf >= 500).length;

      return {
        median,
        percentile10,
        percentile90,
        probability: {
          positive: (positiveCount / iterations) * 100,
          break500: (break500Count / iterations) * 100,
        },
      };
    },
    [inputs]
  );

  return {
    variables,
    breakEvenPoints,
    analyzeSingleVariable,
    findBreakEven,
    getWorstCase,
    getBestCase,
    getMonteCarloResults,
  };
}

function getVariableLabel(key: keyof AnalyticsInputs): string {
  const labels: Partial<Record<keyof AnalyticsInputs, string>> = {
    purchasePrice: 'Purchase Price',
    monthlyRent: 'Monthly Rent',
    interestRate: 'Interest Rate',
    vacancyRate: 'Vacancy Rate',
    downPaymentPercent: 'Down Payment',
    maintenanceRate: 'Maintenance',
    managementRate: 'Management',
  };
  return labels[key] || key;
}

export default useSensitivityAnalysis;

