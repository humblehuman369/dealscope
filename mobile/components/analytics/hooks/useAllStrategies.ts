/**
 * useAllStrategies - Hook to analyze all 6 strategies for a property
 */

import { useMemo } from 'react';
import { AnalyticsInputs, StrategyType, StrategyAnalysis } from '../types';
import { calculateMetrics, calculateDealScore, generateInsights } from '../calculations';
import { 
  analyzeSTR, 
  analyzeBRRRR, 
  analyzeFlip, 
  analyzeHouseHack, 
  analyzeWholesale,
  DEFAULT_STR_INPUTS,
  DEFAULT_BRRRR_INPUTS,
  DEFAULT_FLIP_INPUTS,
  DEFAULT_HOUSE_HACK_INPUTS,
  DEFAULT_WHOLESALE_INPUTS,
} from '../strategies';

export interface StrategyResult {
  strategy: StrategyType;
  name: string;
  icon: string;
  score: number;
  grade: string;
  color: string;
  viable: boolean;
  rank: number;
  analysis: StrategyAnalysis<unknown>;
}

export interface AllStrategiesResult {
  strategies: Record<StrategyType, StrategyResult>;
  bestStrategy: StrategyType;
  rankings: StrategyType[];
  viableStrategies: StrategyType[];
}

const STRATEGY_INFO: Record<StrategyType, { name: string; icon: string }> = {
  longTermRental: { name: 'Long-Term Rental', icon: '🏠' },
  shortTermRental: { name: 'Short-Term Rental', icon: '🏨' },
  brrrr: { name: 'BRRRR', icon: '🔄' },
  fixAndFlip: { name: 'Fix & Flip', icon: '🔨' },
  houseHack: { name: 'House Hack', icon: '🏡' },
  wholesale: { name: 'Wholesale', icon: '📋' },
};

export function useAllStrategies(baseInputs: AnalyticsInputs): AllStrategiesResult {
  return useMemo(() => {
    // 1. Long-Term Rental (base case)
    const ltrMetrics = calculateMetrics(baseInputs);
    const ltrScore = calculateDealScore(ltrMetrics);
    const ltrInsights = generateInsights(ltrMetrics, baseInputs);
    const ltrViable = ltrMetrics.monthlyCashFlow > 0 && ltrMetrics.dscr >= 1.0;

    // 2. Short-Term Rental
    const strInputs = {
      ...DEFAULT_STR_INPUTS,
      purchasePrice: baseInputs.purchasePrice,
      downPaymentPercent: baseInputs.downPaymentPercent,
      closingCostsPercent: baseInputs.closingCostsPercent,
      interestRate: baseInputs.interestRate,
      loanTermYears: baseInputs.loanTermYears,
      annualPropertyTax: baseInputs.annualPropertyTax,
      annualInsurance: baseInputs.annualInsurance,
      monthlyHoa: baseInputs.monthlyHoa,
      // Estimate ADR from monthly rent (STR typically 2-3x monthly rent daily)
      averageDailyRate: Math.round(baseInputs.monthlyRent / 15),
    };
    const strAnalysis = analyzeSTR(strInputs);

    // 3. BRRRR
    const brrrrInputs = {
      ...DEFAULT_BRRRR_INPUTS,
      purchasePrice: baseInputs.purchasePrice * 0.75, // Assume distressed at 75%
      closingCostsPercent: baseInputs.closingCostsPercent,
      arv: baseInputs.purchasePrice, // ARV = current market value
      monthlyRent: baseInputs.monthlyRent,
      annualPropertyTax: baseInputs.annualPropertyTax,
      annualInsurance: baseInputs.annualInsurance,
      monthlyHoa: baseInputs.monthlyHoa,
    };
    const brrrrAnalysis = analyzeBRRRR(brrrrInputs);

    // 4. Fix & Flip
    const flipInputs = {
      ...DEFAULT_FLIP_INPUTS,
      purchasePrice: baseInputs.purchasePrice * 0.70, // Buy at 70% of ARV
      closingCostsPercent: baseInputs.closingCostsPercent,
      arv: baseInputs.purchasePrice * 1.15, // ARV after rehab = 115% of market
    };
    const flipAnalysis = analyzeFlip(flipInputs);

    // 5. House Hack
    const houseHackInputs = {
      ...DEFAULT_HOUSE_HACK_INPUTS,
      purchasePrice: baseInputs.purchasePrice,
      downPaymentPercent: 0.05, // FHA loan
      closingCostsPercent: baseInputs.closingCostsPercent,
      interestRate: baseInputs.interestRate,
      loanTermYears: baseInputs.loanTermYears,
      monthlyRent: baseInputs.monthlyRent * 0.75, // 75% of units rented
      annualPropertyTax: baseInputs.annualPropertyTax,
      annualInsurance: baseInputs.annualInsurance,
      monthlyHoa: baseInputs.monthlyHoa,
    };
    const houseHackAnalysis = analyzeHouseHack(houseHackInputs);

    // 6. Wholesale
    const wholesaleInputs = {
      ...DEFAULT_WHOLESALE_INPUTS,
      contractPrice: baseInputs.purchasePrice * 0.65,
      arv: baseInputs.purchasePrice,
      estimatedRepairs: baseInputs.purchasePrice * 0.15,
    };
    const wholesaleAnalysis = analyzeWholesale(wholesaleInputs);

    // Build strategies object
    const strategies: Record<StrategyType, StrategyResult> = {
      longTermRental: {
        strategy: 'longTermRental',
        ...STRATEGY_INFO.longTermRental,
        score: ltrScore.score,
        grade: ltrScore.grade,
        color: ltrScore.color,
        viable: ltrViable,
        rank: 0,
        analysis: {
          strategy: 'longTermRental',
          score: ltrScore.score,
          grade: ltrScore.grade,
          color: ltrScore.color,
          metrics: ltrMetrics,
          insights: ltrInsights,
          isViable: ltrViable,
        },
      },
      shortTermRental: {
        strategy: 'shortTermRental',
        ...STRATEGY_INFO.shortTermRental,
        score: strAnalysis.score,
        grade: strAnalysis.grade,
        color: strAnalysis.color,
        viable: strAnalysis.isViable,
        rank: 0,
        analysis: strAnalysis,
      },
      brrrr: {
        strategy: 'brrrr',
        ...STRATEGY_INFO.brrrr,
        score: brrrrAnalysis.score,
        grade: brrrrAnalysis.grade,
        color: brrrrAnalysis.color,
        viable: brrrrAnalysis.isViable,
        rank: 0,
        analysis: brrrrAnalysis,
      },
      fixAndFlip: {
        strategy: 'fixAndFlip',
        ...STRATEGY_INFO.fixAndFlip,
        score: flipAnalysis.score,
        grade: flipAnalysis.grade,
        color: flipAnalysis.color,
        viable: flipAnalysis.isViable,
        rank: 0,
        analysis: flipAnalysis,
      },
      houseHack: {
        strategy: 'houseHack',
        ...STRATEGY_INFO.houseHack,
        score: houseHackAnalysis.score,
        grade: houseHackAnalysis.grade,
        color: houseHackAnalysis.color,
        viable: houseHackAnalysis.isViable,
        rank: 0,
        analysis: houseHackAnalysis,
      },
      wholesale: {
        strategy: 'wholesale',
        ...STRATEGY_INFO.wholesale,
        score: wholesaleAnalysis.score,
        grade: wholesaleAnalysis.grade,
        color: wholesaleAnalysis.color,
        viable: wholesaleAnalysis.isViable,
        rank: 0,
        analysis: wholesaleAnalysis,
      },
    };

    // Calculate rankings (sort by score, viable first)
    const rankings = (Object.keys(strategies) as StrategyType[])
      .sort((a, b) => {
        // Viable strategies first
        if (strategies[a].viable !== strategies[b].viable) {
          return strategies[a].viable ? -1 : 1;
        }
        // Then by score
        return strategies[b].score - strategies[a].score;
      });

    // Assign ranks
    rankings.forEach((strategy, index) => {
      strategies[strategy].rank = index + 1;
    });

    const viableStrategies = rankings.filter(s => strategies[s].viable);
    const bestStrategy = rankings[0];

    return {
      strategies,
      bestStrategy,
      rankings,
      viableStrategies,
    };
  }, [baseInputs]);
}

// Export strategy scores for the selector
export function getStrategyScores(result: AllStrategiesResult): Record<StrategyType, { score: number; viable: boolean }> {
  const scores: Record<StrategyType, { score: number; viable: boolean }> = {} as any;
  
  for (const [key, value] of Object.entries(result.strategies)) {
    scores[key as StrategyType] = {
      score: value.score,
      viable: value.viable,
    };
  }
  
  return scores;
}

