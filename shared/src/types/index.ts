/**
 * Shared Types — Barrel Export
 *
 * Import all shared types from '@dealscope/shared/types' or
 * from this file directly.
 */

export type {
  StrategyId,
  StrategyType,
  StrategyInfo,
} from './strategy';

export {
  ALL_STRATEGY_IDS,
  STRATEGY_ID_TO_TYPE,
  STRATEGY_TYPE_TO_ID,
  WORKSHEET_ENDPOINTS,
} from './strategy';

export type {
  InitialAssumptions,
  CachedMetrics,
  DealMakerRecord,
  DealMakerRecordUpdate,
  DealMakerResponse,
} from './deal-maker';

export type {
  AnalyticsInputs,
  CalculatedMetrics,
  OpportunityGrade,
  ScoreBreakdown,
  DealScore,
  Insight,
  AmortizationRow,
  YearProjection,
  StrategyAnalysisType,
  StrategyAnalysis,
} from './analytics';
