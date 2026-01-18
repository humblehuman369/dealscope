/**
 * InvestIQ Analytics Component Library
 * 
 * A comprehensive set of components for the redesigned property analytics UI.
 * These components support all 6 investment strategies with their specific metrics,
 * benchmarks, and interactive features.
 * 
 * @module @/components/analytics
 */

// ============================================
// TYPE EXPORTS
// ============================================
export * from './types'

// ============================================
// CORE METRIC COMPONENTS
// ============================================

// IQ Target Hero - The crown jewel showing recommended entry point
export { IQTargetHero, IQTargetHeroCompact } from './IQTargetHero'

// Price Ladder - Visual ladder of price positions
export { 
  PriceLadder, 
  PriceLadderCompact, 
  generatePriceLadder 
} from './PriceLadder'

// Spectrum Bar - Visual gauge for benchmarks
export { SpectrumBar, MiniSpectrum } from './SpectrumBar'

// Performance Benchmarks - Container for multiple spectrum bars
export {
  PerformanceBenchmarks,
  calculateBenchmarkStatus,
  calculateMarkerPosition,
  LTR_BENCHMARKS,
  STR_BENCHMARKS,
  BRRRR_BENCHMARKS
} from './PerformanceBenchmarks'

// Returns Grid - Profitability metrics display
export {
  ReturnsGrid,
  ReturnsGridCompact,
  createLTRReturns,
  createSTRReturns,
  createBRRRRReturns,
  createWholesaleReturns,
  createHouseHackReturns
} from './ReturnsGrid'

// Hero Metric - Large single metric display
export {
  HeroMetric,
  HeroMetricCompact,
  createCashFlowHero,
  create10YearROIHero,
  createCashRecoveryHero,
  createHousingCostHero,
  createAssignmentFeeHero,
  createFlipProfitHero
} from './HeroMetric'

// ============================================
// NEGOTIATION & DEAL PLANNING
// ============================================

// Negotiation Plan - Offer cards and leverage points
export {
  NegotiationPlan,
  NegotiationPlanCompact,
  generateNegotiationPlan,
  LEVERAGE_POINTS
} from './NegotiationPlan'

// Formula Cards - Calculation breakdowns
export {
  FormulaCard,
  createCapitalStackFormula,
  createRefinanceFormula,
  create70PercentRuleFormula,
  createWholesaleMathFormula,
  createFlipPLFormula
} from './FormulaCard'

// ============================================
// TUNING & INTERACTIVITY
// ============================================

// Tune Section - Collapsible slider groups
export {
  TuneSection,
  StandaloneSlider,
  createSliderConfig,
  formatters,
  createLTRTuneGroups
} from './TuneSection'

// Compare Toggle - Target vs List price toggle
export {
  CompareToggle,
  CompareToggleInline,
  PriceComparisonHeader
} from './CompareToggle'

// ============================================
// NAVIGATION COMPONENTS
// ============================================

// Strategy Selector - Horizontal strategy pills
export {
  StrategySelector,
  StrategySelectorCompact,
  DEFAULT_STRATEGIES
} from './StrategySelector'

// Strategy Grid - 2x3 grid layout for strategy selection
export {
  StrategyGrid,
  StrategyPrompt
} from './StrategyGrid'

// Welcome Section - Expandable intro message
export { WelcomeSection } from './WelcomeSection'

// IQ Welcome Modal - Pop-up intro on page load
export { IQWelcomeModal } from './IQWelcomeModal'

// Sub Tab Navigation - Tab navigation within strategies
export {
  SubTabNav,
  SubTabNavCompact,
  SubTabDropdown,
  LTR_TABS,
  STR_TABS,
  BRRRR_TABS,
  FLIP_TABS,
  HOUSE_HACK_TABS,
  WHOLESALE_TABS,
  getStrategyTabs
} from './SubTabNav'

// ============================================
// INSIGHTS & FEEDBACK
// ============================================

// Insight Cards - Tips, warnings, and success messages
export {
  InsightCard,
  InsightCardInline,
  createIQInsight,
  createPayoffInsight,
  createExitInsight,
  createRiskWarning
} from './InsightCard'

// Deal Score Display - Comprehensive scoring view
export {
  DealScoreDisplay,
  DealScoreCompact,
  calculateDealScoreData
} from './DealScoreDisplay'

// ============================================
// FUNDING & LOAN COMPONENTS
// ============================================

// Loan Summary - Key loan statistics
export {
  LoanSummary,
  createLoanStats,
  PieChartBreakdown,
  createPieSlices,
  AmortizationTable,
  generateAmortizationSchedule,
  FundingOverview
} from './LoanSummary'

// ============================================
// PERFORMANCE SECTIONS
// ============================================

// Performance Sections - Row-based breakdowns
export {
  PerformanceSection,
  PerformanceSectionGrid,
  createMonthlyBreakdown,
  create10YearProjection,
  createSTRIncomeBreakdown
} from './PerformanceSection'

// ============================================
// PROPERTY DISPLAY
// ============================================

// Property Hero - Immersive property showcase
export { PropertyHero } from './PropertyHero'

// Property Premium Page - World-class property analysis landing page
export { PropertyPremiumPage } from './PropertyPremiumPage'

// Property Mini Card - Compact property header
export {
  PropertyMiniCard,
  PropertyMiniCardCompact,
  PropertyStickyHeader
} from './PropertyMiniCard'

// ============================================
// NAVIGATION - BOTTOM BAR
// ============================================

// Bottom Navigation - Mobile bottom bar
export {
  BottomNav,
  BottomNavSpacer,
  AnalyticsBottomBar
} from './BottomNav'

// ============================================
// LOADING STATES
// ============================================

// Loading & Skeleton Components
export {
  SkeletonBox,
  SkeletonText,
  SkeletonCard,
  IQTargetHeroSkeleton,
  PriceLadderSkeleton,
  ReturnsGridSkeleton,
  BenchmarksSkeleton,
  StrategySelectorSkeleton,
  PropertyMiniCardSkeleton,
  AnalyticsPageSkeleton,
  LoadingSpinner,
  LoadingOverlay,
  CalculatingIndicator,
  ErrorCard,
  EmptyState
} from './LoadingStates'

// ============================================
// MAIN CONTAINER
// ============================================

// Strategy Analytics Container - Main page component
export { 
  StrategyAnalyticsContainer,
  type PropertyData as AnalyticsPropertyData
} from './StrategyAnalyticsContainer'

// Responsive Analytics Container - Auto-switches between mobile/desktop
export {
  ResponsiveAnalyticsContainer,
  useAnalyticsViewMode,
  type PropertyData as ResponsivePropertyData
} from './ResponsiveAnalyticsContainer'

// Desktop Components
export * from './desktop'

// Strategy-specific metrics content
export {
  STRMetricsContent,
  BRRRRMetricsContent,
  FlipMetricsContent,
  HouseHackMetricsContent,
  WholesaleMetricsContent
} from './StrategyMetricsContent'

// Profit Zone Dashboard - Three-column profit/loss visualization
export {
  ProfitZoneDashboard,
  generateProfitZoneTips,
  type ProfitZoneMetrics,
  type ProfitZoneTip,
  type ProfitZoneDashboardProps
} from './ProfitZoneDashboard'

// ============================================
// DEFAULT EXPORT - All components
// ============================================

import { IQTargetHero, IQTargetHeroCompact } from './IQTargetHero'
import { PriceLadder, PriceLadderCompact } from './PriceLadder'
import { SpectrumBar, MiniSpectrum } from './SpectrumBar'
import { PerformanceBenchmarks } from './PerformanceBenchmarks'
import { ReturnsGrid, ReturnsGridCompact } from './ReturnsGrid'
import { HeroMetric, HeroMetricCompact } from './HeroMetric'
import { NegotiationPlan, NegotiationPlanCompact } from './NegotiationPlan'
import { FormulaCard } from './FormulaCard'
import { TuneSection, StandaloneSlider } from './TuneSection'
import { CompareToggle, CompareToggleInline, PriceComparisonHeader } from './CompareToggle'
import { StrategySelector, StrategySelectorCompact } from './StrategySelector'
import { SubTabNav, SubTabNavCompact } from './SubTabNav'
import { InsightCard, InsightCardInline } from './InsightCard'
import { DealScoreDisplay, DealScoreCompact } from './DealScoreDisplay'
import { LoanSummary, PieChartBreakdown, AmortizationTable, FundingOverview } from './LoanSummary'
import { PerformanceSection, PerformanceSectionGrid } from './PerformanceSection'
import { PropertyMiniCard, PropertyMiniCardCompact, PropertyStickyHeader } from './PropertyMiniCard'
import { BottomNav, BottomNavSpacer, AnalyticsBottomBar } from './BottomNav'
import { 
  SkeletonBox, 
  SkeletonCard, 
  AnalyticsPageSkeleton, 
  LoadingSpinner, 
  LoadingOverlay,
  ErrorCard,
  EmptyState 
} from './LoadingStates'

const AnalyticsComponents = {
  // Core Metrics
  IQTargetHero,
  IQTargetHeroCompact,
  PriceLadder,
  PriceLadderCompact,
  SpectrumBar,
  MiniSpectrum,
  PerformanceBenchmarks,
  ReturnsGrid,
  ReturnsGridCompact,
  HeroMetric,
  HeroMetricCompact,
  
  // Negotiation
  NegotiationPlan,
  NegotiationPlanCompact,
  FormulaCard,
  
  // Tuning
  TuneSection,
  StandaloneSlider,
  CompareToggle,
  CompareToggleInline,
  PriceComparisonHeader,
  
  // Navigation
  StrategySelector,
  StrategySelectorCompact,
  SubTabNav,
  SubTabNavCompact,
  
  // Insights
  InsightCard,
  InsightCardInline,
  DealScoreDisplay,
  DealScoreCompact,
  
  // Funding
  LoanSummary,
  PieChartBreakdown,
  AmortizationTable,
  FundingOverview,
  
  // Performance
  PerformanceSection,
  PerformanceSectionGrid,
  
  // Property
  PropertyMiniCard,
  PropertyMiniCardCompact,
  PropertyStickyHeader,
  
  // Bottom Nav
  BottomNav,
  BottomNavSpacer,
  AnalyticsBottomBar,
  
  // Loading States
  SkeletonBox,
  SkeletonCard,
  AnalyticsPageSkeleton,
  LoadingSpinner,
  LoadingOverlay,
  ErrorCard,
  EmptyState
}

export default AnalyticsComponents
