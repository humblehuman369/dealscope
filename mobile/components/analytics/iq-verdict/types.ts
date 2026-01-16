/**
 * IQ Verdict Types
 * Type definitions for the IQ Verdict flow
 */

import { StrategyType } from '../types';

// ===================
// PROPERTY TYPES
// ===================

export interface IQProperty {
  id?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  imageUrl?: string;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: 'single_family' | 'multi_family' | 'condo' | 'townhouse';
  mlsNumber?: string;
}

// ===================
// STRATEGY TYPES
// ===================

export type IQStrategyId = 
  | 'long-term-rental'
  | 'short-term-rental'
  | 'brrrr'
  | 'fix-and-flip'
  | 'house-hack'
  | 'wholesale';

// Map between StrategyType and IQStrategyId
export const STRATEGY_TYPE_TO_ID: Record<StrategyType, IQStrategyId> = {
  longTermRental: 'long-term-rental',
  shortTermRental: 'short-term-rental',
  brrrr: 'brrrr',
  fixAndFlip: 'fix-and-flip',
  houseHack: 'house-hack',
  wholesale: 'wholesale',
};

export const ID_TO_STRATEGY_TYPE: Record<IQStrategyId, StrategyType> = {
  'long-term-rental': 'longTermRental',
  'short-term-rental': 'shortTermRental',
  'brrrr': 'brrrr',
  'fix-and-flip': 'fixAndFlip',
  'house-hack': 'houseHack',
  'wholesale': 'wholesale',
};

export interface IQStrategy {
  id: IQStrategyId;
  name: string;
  metric: string;           // Display value: "18.1%", "$52K", "75%"
  metricLabel: string;      // "CoC Return", "Profit", "Savings"
  metricValue: number;      // Raw value for sorting/calculations
  score: number;            // 0-100 Deal Score for this strategy
  rank: number;             // 1-6 ranking
  badge: IQStrategyBadge | null;
  icon: string;             // Emoji icon
}

export type IQStrategyBadge = 'Best Match' | 'Strong' | 'Good';

// ===================
// ANALYSIS RESULT
// ===================

export interface IQAnalysisResult {
  propertyId?: string;
  analyzedAt: string;       // ISO timestamp
  dealScore: number;        // Overall score 0-100
  dealVerdict: IQDealVerdict;
  verdictDescription: string;
  strategies: IQStrategy[];   // Sorted by rank (1-6)
}

export type IQDealVerdict = 
  | 'Excellent Investment'
  | 'Strong Investment'
  | 'Good Investment'
  | 'Fair Investment'
  | 'Weak Investment'
  | 'Poor Investment';

// ===================
// BRAND COLORS
// ===================

export const IQ_COLORS = {
  deepNavy: '#0A1628',
  electricCyan: '#00D4FF',
  pacificTeal: '#0891B2',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  slate: '#64748B',
  slateLight: '#94A3B8',
  light: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
} as const;

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Get the appropriate badge for a strategy based on rank and score
 */
export const getStrategyBadge = (rank: number, score: number): IQStrategyBadge | null => {
  if (rank === 1 && score >= 70) return 'Best Match';
  if (rank === 2 && score >= 70) return 'Strong';
  if (rank === 3 && score >= 60) return 'Good';
  return null;
};

/**
 * Get deal verdict based on overall score
 */
export const getDealVerdict = (score: number): IQDealVerdict => {
  if (score >= 90) return 'Excellent Investment';
  if (score >= 75) return 'Strong Investment';
  if (score >= 60) return 'Good Investment';
  if (score >= 45) return 'Fair Investment';
  if (score >= 30) return 'Weak Investment';
  return 'Poor Investment';
};

/**
 * Get verdict description based on score and top strategy
 */
export const getVerdictDescription = (
  score: number, 
  topStrategy: IQStrategy
): string => {
  if (score >= 80) {
    return `Excellent potential across multiple strategies. ${topStrategy.name} shows best returns.`;
  }
  if (score >= 60) {
    return `Good investment opportunity. ${topStrategy.name} is your strongest option at ${topStrategy.metric} ${topStrategy.metricLabel}.`;
  }
  if (score >= 40) {
    return `Moderate opportunity. Consider ${topStrategy.name} for best results, but review numbers carefully.`;
  }
  return `This property shows limited investment potential. ${topStrategy.name} is the best option available.`;
};

/**
 * Format strategy metric for display
 */
export const formatMetric = (
  strategyId: IQStrategyId, 
  value: number
): { metric: string; metricLabel: string } => {
  switch (strategyId) {
    case 'long-term-rental':
    case 'short-term-rental':
    case 'brrrr':
      return { 
        metric: `${value.toFixed(1)}%`, 
        metricLabel: 'CoC Return' 
      };
    case 'fix-and-flip':
      return { 
        metric: `$${Math.round(value / 1000)}K`, 
        metricLabel: 'Profit' 
      };
    case 'house-hack':
      return { 
        metric: `${Math.round(value)}%`, 
        metricLabel: 'Savings' 
      };
    case 'wholesale':
      return { 
        metric: `$${Math.round(value / 1000)}K`, 
        metricLabel: 'Assignment' 
      };
    default:
      return { metric: String(value), metricLabel: 'Return' };
  }
};

/**
 * Get badge colors based on rank
 */
export const getBadgeColors = (rank: number) => {
  if (rank === 1) return { bg: IQ_COLORS.success + '20', text: IQ_COLORS.success };
  if (rank <= 3) return { bg: IQ_COLORS.pacificTeal + '20', text: IQ_COLORS.pacificTeal };
  return { bg: IQ_COLORS.slate + '20', text: IQ_COLORS.slate };
};

/**
 * Get rank indicator color
 */
export const getRankColor = (rank: number) => {
  if (rank === 1) return IQ_COLORS.success;
  if (rank <= 3) return IQ_COLORS.pacificTeal;
  return IQ_COLORS.border;
};

/**
 * Get deal score color
 */
export const getDealScoreColor = (score: number) => {
  if (score >= 80) return IQ_COLORS.success;
  if (score >= 60) return IQ_COLORS.pacificTeal;
  if (score >= 40) return IQ_COLORS.warning;
  return IQ_COLORS.danger;
};

/**
 * Format price for display
 */
export const formatPrice = (price: number) => {
  return '$' + price.toLocaleString();
};

// ===================
// STRATEGY INFO
// ===================

export const STRATEGY_INFO: Record<IQStrategyId, { name: string; icon: string }> = {
  'long-term-rental': { name: 'Long-Term Rental', icon: '🏠' },
  'short-term-rental': { name: 'Short-Term Rental', icon: '🏨' },
  'brrrr': { name: 'BRRRR', icon: '🔄' },
  'fix-and-flip': { name: 'Fix & Flip', icon: '🔨' },
  'house-hack': { name: 'House Hack', icon: '🏡' },
  'wholesale': { name: 'Wholesale', icon: '📋' },
};

// ===================
// SCREEN NAMES
// ===================

export const STRATEGY_SCREEN_MAP: Record<IQStrategyId, string> = {
  'long-term-rental': '/analytics',
  'short-term-rental': '/strategy/str',
  'brrrr': '/strategy/brrrr',
  'fix-and-flip': '/strategy/flip',
  'house-hack': '/strategy/househack',
  'wholesale': '/strategy/wholesale',
};
