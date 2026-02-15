/**
 * Strategy Metrics Configuration — matches frontend/src/config/strategyMetrics.ts
 *
 * Defines which 3 metrics to display per strategy and price target combination.
 * Used by InvestmentAnalysis and VerdictIQ to dynamically show the most
 * relevant metrics based on the user's current selection.
 */

import type { PriceTarget } from '../lib/priceUtils';
import type { StrategyId } from '../types/analytics';

// =============================================================================
// TYPES
// =============================================================================

/**
 * StrategyType used within the metrics engine.
 * Matches frontend's StrategyType alias 1:1.
 */
export type StrategyType = StrategyId;

export type MetricId =
  // LTR/STR Metrics
  | 'cashFlow'
  | 'cashNeeded'
  | 'capRate'
  | 'occupancy'
  | 'revpar'
  // BRRRR Metrics
  | 'cashRecoup'
  | 'equityCreated'
  | 'postRefiCashFlow'
  | 'cashLeftInDeal'
  // Flip Metrics
  | 'netProfit'
  | 'roi'
  | 'annualizedRoi'
  | 'holdingCosts'
  | 'profitMargin'
  // House Hack Metrics
  | 'effectiveHousingCost'
  | 'savings'
  | 'reduction'
  | 'liveFreeThreshold'
  // Wholesale Metrics
  | 'assignmentFee'
  | 'expenses'
  | 'arv'
  | 'dealViability';

export interface MetricDefinition {
  id: MetricId;
  label: string;
  format: 'currency' | 'currencyMonthly' | 'percent' | 'percentInt' | 'number' | 'text';
  description?: string;
}

// =============================================================================
// METRIC DEFINITIONS
// =============================================================================

export const METRIC_DEFINITIONS: Record<MetricId, MetricDefinition> = {
  // LTR/STR Metrics
  cashFlow: {
    id: 'cashFlow',
    label: 'Cash Flow',
    format: 'currencyMonthly',
    description: 'Monthly cash flow after all expenses',
  },
  cashNeeded: {
    id: 'cashNeeded',
    label: 'Cash Needed',
    format: 'currency',
    description: 'Total cash required to close',
  },
  capRate: {
    id: 'capRate',
    label: 'Cap Rate',
    format: 'percent',
    description: 'Capitalization rate (NOI / Purchase Price)',
  },
  occupancy: {
    id: 'occupancy',
    label: 'Break-Even Occ.',
    format: 'percentInt',
    description: 'Minimum occupancy to break even',
  },
  revpar: {
    id: 'revpar',
    label: 'RevPAR',
    format: 'currency',
    description: 'Revenue per available room',
  },

  // BRRRR Metrics
  cashRecoup: {
    id: 'cashRecoup',
    label: 'Cash Recoup',
    format: 'percent',
    description: 'Percentage of cash recovered at refinance',
  },
  equityCreated: {
    id: 'equityCreated',
    label: 'Equity Created',
    format: 'currency',
    description: 'Equity position after rehab and refinance',
  },
  postRefiCashFlow: {
    id: 'postRefiCashFlow',
    label: 'Post-Refi Cash Flow',
    format: 'currencyMonthly',
    description: 'Monthly cash flow after refinancing',
  },
  cashLeftInDeal: {
    id: 'cashLeftInDeal',
    label: 'Cash Left in Deal',
    format: 'currency',
    description: 'Cash remaining after refinance',
  },

  // Flip Metrics
  netProfit: {
    id: 'netProfit',
    label: 'Net Profit',
    format: 'currency',
    description: 'Total profit after all costs',
  },
  roi: {
    id: 'roi',
    label: 'ROI',
    format: 'percent',
    description: 'Return on investment',
  },
  annualizedRoi: {
    id: 'annualizedRoi',
    label: 'Annualized ROI',
    format: 'percent',
    description: 'Annualized return on investment',
  },
  holdingCosts: {
    id: 'holdingCosts',
    label: 'Holding Costs',
    format: 'currency',
    description: 'Total costs while holding the property',
  },
  profitMargin: {
    id: 'profitMargin',
    label: 'Profit Margin',
    format: 'percent',
    description: 'Profit as percentage of ARV',
  },

  // House Hack Metrics
  effectiveHousingCost: {
    id: 'effectiveHousingCost',
    label: 'Net Housing Cost',
    format: 'currencyMonthly',
    description: 'Your out-of-pocket housing cost after rent income',
  },
  savings: {
    id: 'savings',
    label: 'Monthly Savings',
    format: 'currency',
    description: 'Savings compared to current housing cost',
  },
  reduction: {
    id: 'reduction',
    label: 'Cost Reduction',
    format: 'percent',
    description: 'Percentage reduction in housing cost',
  },
  liveFreeThreshold: {
    id: 'liveFreeThreshold',
    label: 'Live Free',
    format: 'text',
    description: 'Whether rental income covers all costs',
  },

  // Wholesale Metrics
  assignmentFee: {
    id: 'assignmentFee',
    label: 'Assignment Fee',
    format: 'currency',
    description: 'Fee earned from assigning the contract',
  },
  expenses: {
    id: 'expenses',
    label: 'Total Expenses',
    format: 'currency',
    description: 'Marketing and closing costs',
  },
  arv: {
    id: 'arv',
    label: 'ARV',
    format: 'currency',
    description: 'After Repair Value',
  },
  dealViability: {
    id: 'dealViability',
    label: 'Deal Score',
    format: 'text',
    description: 'Overall viability assessment',
  },
};

// =============================================================================
// STRATEGY METRICS CONFIGURATION
// =============================================================================

/**
 * Defines which 3 metrics to show for each strategy + price target combination.
 */
export const STRATEGY_METRICS: Record<StrategyType, Record<PriceTarget, MetricId[]>> = {
  ltr: {
    breakeven: ['cashFlow', 'cashNeeded', 'capRate'],
    targetBuy: ['cashFlow', 'cashNeeded', 'capRate'],
    wholesale: ['assignmentFee', 'expenses', 'arv'],
  },
  str: {
    breakeven: ['cashFlow', 'cashNeeded', 'occupancy'],
    targetBuy: ['cashFlow', 'cashNeeded', 'revpar'],
    wholesale: ['assignmentFee', 'expenses', 'arv'],
  },
  brrrr: {
    breakeven: ['cashRecoup', 'equityCreated', 'postRefiCashFlow'],
    targetBuy: ['cashRecoup', 'cashLeftInDeal', 'postRefiCashFlow'],
    wholesale: ['assignmentFee', 'expenses', 'arv'],
  },
  flip: {
    breakeven: ['netProfit', 'roi', 'holdingCosts'],
    targetBuy: ['netProfit', 'annualizedRoi', 'profitMargin'],
    wholesale: ['assignmentFee', 'expenses', 'arv'],
  },
  house_hack: {
    breakeven: ['effectiveHousingCost', 'savings', 'cashFlow'],
    targetBuy: ['effectiveHousingCost', 'reduction', 'liveFreeThreshold'],
    wholesale: ['assignmentFee', 'expenses', 'arv'],
  },
  wholesale: {
    breakeven: ['assignmentFee', 'roi', 'dealViability'],
    targetBuy: ['assignmentFee', 'roi', 'dealViability'],
    wholesale: ['assignmentFee', 'roi', 'dealViability'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the metric definitions for a given strategy and price target.
 */
export function getMetricsForStrategy(
  strategy: StrategyType,
  priceTarget: PriceTarget,
): MetricDefinition[] {
  const metricIds = STRATEGY_METRICS[strategy]?.[priceTarget] || STRATEGY_METRICS.ltr.targetBuy;
  return metricIds.map((id) => METRIC_DEFINITIONS[id]);
}

/**
 * Map header strategy name to StrategyType.
 */
export function headerStrategyToType(headerStrategy: string): StrategyType {
  switch (headerStrategy) {
    case 'Short-term':
      return 'str';
    case 'BRRRR':
      return 'brrrr';
    case 'Fix & Flip':
      return 'flip';
    case 'House Hack':
      return 'house_hack';
    case 'Wholesale':
      return 'wholesale';
    default:
      return 'ltr';
  }
}

/**
 * Map StrategyType to header strategy name.
 */
export function strategyTypeToHeader(strategyType: StrategyType): string {
  switch (strategyType) {
    case 'str':
      return 'Short-term';
    case 'brrrr':
      return 'BRRRR';
    case 'flip':
      return 'Fix & Flip';
    case 'house_hack':
      return 'House Hack';
    case 'wholesale':
      return 'Wholesale';
    default:
      return 'Long-term';
  }
}

/**
 * Format a metric value based on its format type.
 */
export function formatMetricValueByDef(
  value: number | string | null,
  format: MetricDefinition['format'],
): string {
  if (value === null || value === undefined) return '\u2014';

  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return `$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'currencyMonthly': {
      const formatted = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
      return value < 0 ? `-$${formatted}/mo` : `$${formatted}/mo`;
    }
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'percentInt':
      return `${Math.round(value * 100)}%`;
    case 'number':
      return value.toFixed(2);
    case 'text':
      return String(value);
    default:
      return String(value);
  }
}
