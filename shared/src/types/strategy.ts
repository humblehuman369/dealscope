/**
 * Strategy Types — Single Source of Truth
 *
 * These types define the investment strategy identifiers and metadata
 * used across frontend, mobile, and backend.
 *
 * IMPORTANT: When modifying these types, you MUST update both
 * frontend and mobile codebases. See DIVERGENCES.md for intentional
 * platform-specific differences.
 */

// =============================================================================
// STRATEGY IDENTIFIERS
// =============================================================================

/**
 * Backend-compatible strategy ID (snake_case, matches API endpoints).
 * Used in API payloads, URL paths, and database records.
 */
export type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

/**
 * Frontend display strategy type (camelCase, used in UI components).
 * Maps 1:1 with StrategyId but uses component-friendly naming.
 */
export type StrategyType =
  | 'longTermRental'
  | 'shortTermRental'
  | 'brrrr'
  | 'fixAndFlip'
  | 'houseHack'
  | 'wholesale';

/**
 * All valid strategy IDs as a runtime array (useful for iteration/validation).
 */
export const ALL_STRATEGY_IDS: readonly StrategyId[] = [
  'ltr',
  'str',
  'brrrr',
  'flip',
  'house_hack',
  'wholesale',
] as const;

// =============================================================================
// STRATEGY METADATA
// =============================================================================

export interface StrategyInfo {
  id: StrategyId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  grade?: string;
  score?: number;
}

/**
 * Mapping from StrategyId → StrategyType for converting between
 * API format and UI component format.
 */
export const STRATEGY_ID_TO_TYPE: Record<StrategyId, StrategyType> = {
  ltr: 'longTermRental',
  str: 'shortTermRental',
  brrrr: 'brrrr',
  flip: 'fixAndFlip',
  house_hack: 'houseHack',
  wholesale: 'wholesale',
};

export const STRATEGY_TYPE_TO_ID: Record<StrategyType, StrategyId> = {
  longTermRental: 'ltr',
  shortTermRental: 'str',
  brrrr: 'brrrr',
  fixAndFlip: 'flip',
  houseHack: 'house_hack',
  wholesale: 'wholesale',
};

// =============================================================================
// API ENDPOINT PATTERNS
// =============================================================================

/**
 * Backend worksheet calculation endpoint for each strategy.
 */
export const WORKSHEET_ENDPOINTS: Record<StrategyId, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};
