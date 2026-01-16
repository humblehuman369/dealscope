/**
 * useIQAnalysis - Hook to transform existing strategy analysis into IQ Verdict format
 * Bridges the existing useAllStrategies hook with the IQ Verdict screen
 */

import { useMemo } from 'react';
import { useAllStrategies, AllStrategiesResult, StrategyResult } from '../hooks/useAllStrategies';
import { AnalyticsInputs, StrategyType, CalculatedMetrics } from '../types';
import {
  IQAnalysisResult,
  IQStrategy,
  IQStrategyId,
  STRATEGY_TYPE_TO_ID,
  STRATEGY_INFO,
  getStrategyBadge,
  getDealVerdict,
  getVerdictDescription,
  formatMetric,
} from './types';

interface UseIQAnalysisResult {
  analysis: IQAnalysisResult;
  isLoading: boolean;
  rawData: AllStrategiesResult;
}

/**
 * Transform strategy type to primary display metric value
 */
function getStrategyMetricValue(
  strategyType: StrategyType,
  result: StrategyResult
): number {
  const metrics = result.analysis.metrics as any;
  
  switch (strategyType) {
    case 'longTermRental':
      return (metrics as CalculatedMetrics).cashOnCash * 100 || 0;
    case 'shortTermRental':
      return metrics.cashOnCash * 100 || 0;
    case 'brrrr':
      return metrics.cashOnCash * 100 || 0;
    case 'fixAndFlip':
      return metrics.netProfit || 0;
    case 'houseHack':
      return metrics.housingCostReductionPercent * 100 || 0;
    case 'wholesale':
      return metrics.netProfit || metrics.assignmentFee || 0;
    default:
      return 0;
  }
}

/**
 * Hook to transform existing analysis into IQ Verdict format
 */
export function useIQAnalysis(baseInputs: AnalyticsInputs): UseIQAnalysisResult {
  // Use existing all strategies hook
  const allStrategies = useAllStrategies(baseInputs);

  const analysis = useMemo((): IQAnalysisResult => {
    // Transform each strategy into IQ format
    const strategies: IQStrategy[] = allStrategies.rankings.map((strategyType) => {
      const result = allStrategies.strategies[strategyType];
      const strategyId = STRATEGY_TYPE_TO_ID[strategyType];
      const info = STRATEGY_INFO[strategyId];
      
      // Get the primary metric value for this strategy
      const metricValue = getStrategyMetricValue(strategyType, result);
      const { metric, metricLabel } = formatMetric(strategyId, metricValue);
      
      // Get badge based on rank and score
      const badge = getStrategyBadge(result.rank, result.score);
      
      return {
        id: strategyId,
        name: info.name,
        icon: info.icon,
        metric,
        metricLabel,
        metricValue,
        score: result.score,
        rank: result.rank,
        badge,
      };
    });

    // Calculate overall deal score (average of top 3 viable strategies or all strategies)
    const viableStrategies = strategies.filter((s, i) => 
      allStrategies.strategies[allStrategies.rankings[i]].viable
    );
    
    const scoringStrategies = viableStrategies.length >= 3 
      ? viableStrategies.slice(0, 3) 
      : strategies.slice(0, 3);
    
    const dealScore = Math.round(
      scoringStrategies.reduce((sum, s) => sum + s.score, 0) / scoringStrategies.length
    );

    // Get verdict and description
    const dealVerdict = getDealVerdict(dealScore);
    const topStrategy = strategies[0];
    const verdictDescription = getVerdictDescription(dealScore, topStrategy);

    return {
      analyzedAt: new Date().toISOString(),
      dealScore,
      dealVerdict,
      verdictDescription,
      strategies,
    };
  }, [allStrategies]);

  return {
    analysis,
    isLoading: false,
    rawData: allStrategies,
  };
}

/**
 * Create IQ analysis from property data without inputs
 * Uses default assumptions based on property details
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
  // Estimate monthly rent if not provided (0.8% of price as rough estimate)
  const estimatedRent = property.monthlyRent || Math.round(property.price * 0.008);
  
  // Estimate taxes if not provided (1.2% of price annually)
  const estimatedTaxes = property.propertyTaxes || Math.round(property.price * 0.012);
  
  // Estimate insurance if not provided ($1,500 base + $3 per sqft for Florida)
  const estimatedInsurance = property.insurance || 
    Math.round(1500 + (property.sqft || 1500) * 3);

  return {
    purchasePrice: property.price,
    downPaymentPercent: 0.20,
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
