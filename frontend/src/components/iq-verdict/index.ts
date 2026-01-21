/**
 * IQ Verdict Components for Web
 */

export { IQAnalyzingScreen } from './IQAnalyzingScreen'
export { IQVerdictScreen } from './IQVerdictScreen'

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
  STRATEGY_ROUTE_MAP,
  
  // Helper functions
  getStrategyBadge,
  getDealVerdict,
  getVerdictDescription,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
  
  // Analysis generators
  calculateDynamicAnalysis,
  generateMockAnalysis, // @deprecated - use calculateDynamicAnalysis
} from './types'
