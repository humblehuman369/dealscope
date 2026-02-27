/**
 * IQ Verdict Components for Web
 *
 * ARCHITECTURE: All financial calculations are performed by the backend API
 * (/api/v1/analysis/verdict). Frontend components are display-only.
 *
 * ACTIVE components: PropertyAddressBar, VerdictScoreCard, verdict-design-tokens,
 * ScoreMethodologySheet, IQAnalyzingScreen, and types/constants.
 *
 * DEPRECATED components (not imported by any page route — retained for reference only):
 * IQVerdictScreen, VerdictIQCombined, VerdictPageFresh, VerdictPageAdapter,
 * VerdictIQPageNew, FinancialBreakdown, FinancialBreakdownColumns.
 * These contain inline financial calculations that duplicate the backend and
 * MUST NOT be used for new features.
 */

export { IQAnalyzingScreen } from './IQAnalyzingScreen'
export { OpportunityFactors } from './OpportunityFactors'
export { ReturnFactors } from './ReturnFactors'
export { ScoreGradeDisplay, ScoreGradeInline } from './ScoreGradeDisplay'

// @deprecated — Not imported by any page route. Do not use for new features.
export { IQVerdictScreen } from './IQVerdictScreen'
export { VerdictIQCombined } from './VerdictIQCombined'

// @deprecated — Legacy sub-components (only used by deprecated VerdictIQCombined)
export { VerdictHero } from './VerdictHero'
export { HowWeScoreDropdown } from './HowWeScoreDropdown'
export { InvestmentAnalysis } from './InvestmentAnalysis'
export { SummarySnapshot } from './SummarySnapshot'
export { AtAGlanceSection } from './AtAGlanceSection'
export { PerformanceBenchmarksSection, NATIONAL_RANGES } from './PerformanceBenchmarksSection'
export { FinancialBreakdown } from './FinancialBreakdown'

// @deprecated — Legacy "fresh" layout (not imported by any page route)
export { VerdictIQPageNew } from './VerdictIQPageNew'
export { VerdictScoreHero } from './VerdictScoreHero'
export { PropertyInfoDropdown } from './PropertyInfoDropdown'
export { InvestmentAnalysisNew } from './InvestmentAnalysisNew'
export { FinancialBreakdownColumns } from './FinancialBreakdownColumns'
export { PerformanceMetricsTable, generateDefaultMetrics } from './PerformanceMetricsTable'

// Active: Decision-Grade UI Components (used by verdict/page.tsx)
export { PropertyContextBar } from './PropertyContextBar'
export { PropertyAddressBar } from './PropertyAddressBar'
export { VerdictScoreCard, DealGapCallout, DealFactorsList, VerdictScoreExplainer } from './VerdictScoreCard'
export type { VerdictScoreExplainerProps } from './VerdictScoreCard'
export { NavTabs } from './NavTabs'

// @deprecated — Legacy VerdictIQ v2 components (not imported by any page route)
export { VerdictHeader, type VerdictTab } from './VerdictHeader'
export { VerdictPageFresh } from './VerdictPageFresh'
export { VerdictPageAdapter } from './VerdictPageAdapter'

// Active: IQ Estimate 3-value source selector
export { IQEstimateSelector, useIQSourceSelection, type IQEstimateSources, type DataSourceId } from './IQEstimateSelector'

// Active: Design tokens used across verdict and strategy pages
export * from './verdict-design-tokens'

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
