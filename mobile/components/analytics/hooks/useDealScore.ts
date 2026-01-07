/**
 * useDealScore Hook
 * Manages deal score calculation with memoization
 */

import { useMemo, useCallback } from 'react';
import { AnalyticsInputs, CalculatedMetrics, DealScore, ScoreBreakdown } from '../types';
import { calculateMetrics, calculateDealScore } from '../calculations';
import { getScoreGrade } from '../benchmarks';

interface UseDealScoreResult {
  metrics: CalculatedMetrics;
  score: DealScore;
  recalculate: (inputs: AnalyticsInputs) => DealScore;
  getBreakdownForCategory: (category: string) => ScoreBreakdown | undefined;
  isGoodDeal: boolean;
  improvementSuggestions: ImprovementSuggestion[];
}

interface ImprovementSuggestion {
  category: string;
  currentPoints: number;
  maxPoints: number;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

export function useDealScore(inputs: AnalyticsInputs): UseDealScoreResult {
  // Calculate metrics and score
  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);
  const score = useMemo(() => calculateDealScore(metrics), [metrics]);

  // Get breakdown for specific category
  const getBreakdownForCategory = useCallback(
    (category: string) => {
      return score.breakdown.find(b => b.category.toLowerCase() === category.toLowerCase());
    },
    [score.breakdown]
  );

  // Recalculate with new inputs
  const recalculate = useCallback((newInputs: AnalyticsInputs) => {
    const newMetrics = calculateMetrics(newInputs);
    return calculateDealScore(newMetrics);
  }, []);

  // Determine if this is a good deal
  const isGoodDeal = useMemo(() => score.score >= 60, [score.score]);

  // Generate improvement suggestions
  const improvementSuggestions = useMemo(() => {
    const suggestions: ImprovementSuggestion[] = [];

    score.breakdown.forEach((item) => {
      const percentAchieved = (item.points / item.maxPoints) * 100;
      
      if (percentAchieved < 50) {
        const suggestion = getImprovementSuggestion(item.category, metrics, inputs);
        if (suggestion) {
          suggestions.push({
            category: item.category,
            currentPoints: item.points,
            maxPoints: item.maxPoints,
            suggestion,
            impact: item.maxPoints >= 20 ? 'high' : item.maxPoints >= 15 ? 'medium' : 'low',
          });
        }
      }
    });

    // Sort by impact
    return suggestions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.impact] - order[b.impact];
    });
  }, [score.breakdown, metrics, inputs]);

  return {
    metrics,
    score,
    recalculate,
    getBreakdownForCategory,
    isGoodDeal,
    improvementSuggestions,
  };
}

function getImprovementSuggestion(
  category: string,
  metrics: CalculatedMetrics,
  inputs: AnalyticsInputs
): string | null {
  switch (category.toLowerCase()) {
    case 'cash flow':
      if (metrics.monthlyCashFlow <= 0) {
        const needed = Math.ceil((-metrics.monthlyCashFlow + 200) / 50) * 50;
        return `Increase rent by $${needed}/mo or reduce purchase price by ${Math.round(needed * 200)}`;
      }
      return 'Negotiate a lower purchase price or find higher rent potential';

    case 'cash-on-cash':
      return 'Reduce down payment or negotiate seller credits to improve returns';

    case 'cap rate':
      const currentCap = metrics.capRate;
      if (currentCap < 5) {
        return 'Price is high relative to income - negotiate or find value-add opportunities';
      }
      return 'Look for properties with higher income relative to price';

    case '1% rule':
      if (metrics.onePercentRule < 0.8) {
        return 'Property is priced high relative to rent - typical in appreciation markets';
      }
      return 'Consider markets with better rent-to-price ratios';

    case 'dscr':
      if (metrics.dscr < 1.25) {
        return 'Increase rent or reduce debt to meet lender requirements';
      }
      return 'Debt coverage is tight - build in more margin';

    case 'equity potential':
      return 'Look for value-add opportunities or markets with stronger appreciation';

    case 'risk buffer':
      return 'Build in more reserves and target higher DSCR for safety';

    default:
      return null;
  }
}

export default useDealScore;

