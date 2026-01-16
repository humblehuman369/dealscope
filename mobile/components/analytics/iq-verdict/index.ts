/**
 * IQ Verdict Components
 * Export all IQ Verdict flow components and types
 */

// Components
export { IQAnalyzingScreen } from './IQAnalyzingScreen';
export { IQVerdictScreen } from './IQVerdictScreen';
export { IQButton } from './IQButton';

// Types and helpers
export {
  // Types
  type IQProperty,
  type IQStrategy,
  type IQStrategyId,
  type IQStrategyBadge,
  type IQAnalysisResult,
  type IQDealVerdict,
  
  // Constants
  IQ_COLORS,
  STRATEGY_INFO,
  STRATEGY_SCREEN_MAP,
  STRATEGY_TYPE_TO_ID,
  ID_TO_STRATEGY_TYPE,
  
  // Helper functions
  getStrategyBadge,
  getDealVerdict,
  getVerdictDescription,
  formatMetric,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
} from './types';

// Hook to transform existing analysis data
export { useIQAnalysis, createIQInputsFromProperty } from './useIQAnalysis';
