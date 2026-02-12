/**
 * @deprecated LOCAL STRATEGY CALCULATIONS — MIGRATION IN PROGRESS
 *
 * Primary screens have been migrated to backend-only calculations.
 * These exports are still consumed by secondary analytics tabs
 * (CashFlowTab, WhatIfTab, CompareTab, etc.) and will be removed
 * once those are also migrated.
 *
 * DO NOT add new calculation logic to any of these files.
 */

// Short-Term Rental
export {
  calculateSTRMetrics,
  generateSTRInsights,
  calculateSTRScore,
  analyzeSTR,
  DEFAULT_STR_INPUTS,
} from './strCalculations';

// BRRRR
export {
  calculateBRRRRMetrics,
  generateBRRRRInsights,
  calculateBRRRRScore,
  analyzeBRRRR,
  DEFAULT_BRRRR_INPUTS,
} from './brrrrCalculations';

// Fix & Flip
export {
  calculateFlipMetrics,
  generateFlipInsights,
  calculateFlipScore,
  analyzeFlip,
  DEFAULT_FLIP_INPUTS,
} from './flipCalculations';

// House Hack
export {
  calculateHouseHackMetrics,
  generateHouseHackInsights,
  calculateHouseHackScore,
  analyzeHouseHack,
  DEFAULT_HOUSE_HACK_INPUTS,
} from './houseHackCalculations';

// Wholesale
export {
  calculateWholesaleMetrics,
  generateWholesaleInsights,
  calculateWholesaleScore,
  analyzeWholesale,
  DEFAULT_WHOLESALE_INPUTS,
} from './wholesaleCalculations';

// Re-export types
export type {
  STRInputs,
  STRMetrics,
  BRRRRInputs,
  BRRRRMetrics,
  FlipInputs,
  FlipMetrics,
  HouseHackInputs,
  HouseHackMetrics,
  WholesaleInputs,
  WholesaleMetrics,
  StrategyAnalysis,
  StrategyType,
} from '../types';

