/**
 * IQ Verdict Components for Web
 *
 * ARCHITECTURE: All financial calculations are performed by the backend API
 * (/api/v1/analysis/verdict). Frontend components are display-only.
 *
 * ACTIVE components: PropertyAddressBar, ScoreMethodologySheet,
 * IQEstimateSelector, verdict-design-tokens, IQAnalyzingScreen, and types/constants.
 */

export { IQAnalyzingScreen } from './IQAnalyzingScreen'
export { OpportunityFactors } from './OpportunityFactors'
export { ReturnFactors } from './ReturnFactors'

export { PropertyContextBar } from './PropertyContextBar'
export { PropertyAddressBar } from './PropertyAddressBar'
export { NavTabs } from './NavTabs'

// IQ Estimate 3-value source selector
export { IQEstimateSelector, useIQSourceSelection, type IQEstimateSources, type DataSourceId } from './IQEstimateSelector'

// Design tokens used across verdict and strategy pages
export * from './verdict-design-tokens'

export {
  // Types
  type IQProperty,
  type IQStrategy,
  type IQStrategyId,
  type IQStrategyBadge,
  type IQAnalysisResult,
  type IQDealVerdict,
  // Grade-based scoring types
  type ScoreDisplay,
  type ScoreLabel,
  type ScoreGrade,
  type OpportunityFactors as OpportunityFactorsType,
  type ReturnFactors as ReturnFactorsType,
  
  // Constants
  IQ_COLORS,
  STRATEGY_INFO,
  STRATEGY_ROUTE_MAP,
  
  // Helper functions (display only - no calculations)
  getStrategyBadge,
  getVerdictDescription,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
  scoreToGradeLabel,
  getGradeColor,
  getGradeBgClass,
  getGradeTextClass,
  
  // @deprecated - Use backend API /api/v1/analysis/verdict instead
  calculateDynamicAnalysis,
  generateMockAnalysis,
} from './types'
