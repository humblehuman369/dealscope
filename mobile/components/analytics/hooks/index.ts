/**
 * Analytics Hooks Barrel Export
 */

export { useDealScore } from './useDealScore';
export { useScenarios } from './useScenarios';
export { useSensitivityAnalysis } from './useSensitivityAnalysis';
export { usePropertyCalculations } from './usePropertyCalculations';

// useAllStrategies has been replaced by:
//   - hooks/useBackendStrategies.ts  (POST /api/v1/analysis/verdict)
//   - hooks/useStrategyWorksheet.ts  (POST /api/v1/worksheet/{strategy}/calculate)
// Types are re-exported from useBackendStrategies for backward compat.
export type { StrategyResult, AllStrategiesResult } from '../../hooks/useBackendStrategies';

