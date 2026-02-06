/**
 * VerdictIQ Components - Decision-Grade UI
 * Barrel export file
 */

// Utilities
export { rf, rs, rw, rh, isSmallScreen, isLargeScreen, screenWidth, screenHeight } from './responsive';

// Components
export { NavTabs } from './NavTabs';
export type { NavTabId } from './NavTabs';

export { PropertyContextBar } from './PropertyContextBar';
export type { PropertyContextData, PropertyStatus } from './PropertyContextBar';

export { VerdictHero } from './VerdictHero';
export type { SignalIndicator } from './VerdictHero';

export { ArcGauge } from './ArcGauge';

export { InvestmentAnalysis } from './InvestmentAnalysis';
export type { IQPriceId, IQPriceOption, MetricData } from './InvestmentAnalysis';

export { FinancialBreakdown } from './FinancialBreakdown';
export type { BreakdownRow, BreakdownGroup } from './FinancialBreakdown';

export { DealGap } from './DealGap';

export { AtAGlance, PerformanceBenchmarks } from './PerformanceBenchmarks';
export type { GlanceMetric, BenchmarkMetric, BenchmarkGroup } from './PerformanceBenchmarks';
