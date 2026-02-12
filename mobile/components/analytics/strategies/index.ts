/**
 * Strategy Calculations Index
 *
 * Calculation functions have been removed — all financial math now runs
 * on the backend via useStrategyWorksheet / useBackendStrategies hooks.
 *
 * This barrel re-exports TYPES and DEFAULT INPUTS only, which are still
 * used by strategy screen components for building input payloads.
 */

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

// Re-export default inputs (used to seed backend payloads)
export { DEFAULT_STR_INPUTS } from './strCalculations';
export { DEFAULT_BRRRR_INPUTS } from './brrrrCalculations';
export { DEFAULT_FLIP_INPUTS } from './flipCalculations';
export { DEFAULT_HOUSE_HACK_INPUTS } from './houseHackCalculations';
export { DEFAULT_WHOLESALE_INPUTS } from './wholesaleCalculations';
