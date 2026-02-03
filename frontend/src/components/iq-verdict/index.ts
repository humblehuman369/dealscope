/**
 * IQ Verdict Components for Web
 * 
 * IMPORTANT: All financial calculations should be done by the backend API.
 * Use /api/v1/analysis/verdict for multi-strategy analysis.
 * The frontend calculation functions are kept for backwards compatibility
 * but should be considered DEPRECATED.
 */

export { IQAnalyzingScreen } from './IQAnalyzingScreen'
export { IQVerdictScreen } from './IQVerdictScreen'
export { VerdictIQCombined } from './VerdictIQCombined'
export { OpportunityFactors } from './OpportunityFactors'
export { ReturnFactors } from './ReturnFactors'
export { ScoreGradeDisplay, ScoreGradeInline } from './ScoreGradeDisplay'

// Sub-components for VerdictIQCombined
export { VerdictHero } from './VerdictHero'
export { HowWeScoreDropdown } from './HowWeScoreDropdown'
export { InvestmentAnalysis } from './InvestmentAnalysis'
export { SummarySnapshot } from './SummarySnapshot'
export { AtAGlanceSection } from './AtAGlanceSection'
export { PerformanceBenchmarksSection, NATIONAL_RANGES } from './PerformanceBenchmarksSection'
export { FinancialBreakdown } from './FinancialBreakdown'

// NEW Fresh Layout Components
export { VerdictIQPageNew } from './VerdictIQPageNew'
export { VerdictScoreHero } from './VerdictScoreHero'
export { PropertyInfoDropdown } from './PropertyInfoDropdown'
export { InvestmentAnalysisNew } from './InvestmentAnalysisNew'
export { FinancialBreakdownColumns } from './FinancialBreakdownColumns'
export { PerformanceMetricsTable, generateDefaultMetrics } from './PerformanceMetricsTable'

// Decision-Grade UI Components
export { PropertyContextBar } from './PropertyContextBar'
export { NavTabs } from './NavTabs'

export {
  // Types
  type IQProperty,
  type IQStrategy,
  type IQStrategyId,
  type IQStrategyBadge,
  type IQAnalysisResult,
  type IQDealVerdict,
  // NEW: Grade-based scoring types
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
  getDealVerdict,
  getVerdictDescription,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
  // NEW: Grade-based helpers
  scoreToGradeLabel,
  getGradeColor,
  getGradeBgClass,
  getGradeTextClass,
  
  // @deprecated - Use backend API /api/v1/analysis/verdict instead
  // These are kept for backwards compatibility only
  calculateDynamicAnalysis,
  generateMockAnalysis,
} from './types'
