/**
 * Property Analytics Components Index
 */

// Types
export * from './types';

// Calculations
export * from './calculations';

// Formatters & Benchmarks
export * from './formatters';
export * from './benchmarks';

// Hooks
export * from './hooks';

// Strategy Calculations
export * from './strategies';

// Components
export { DealScoreCard } from './DealScoreCard';
export { MetricsGrid } from './MetricsGrid';
export { ProfitQualityCard } from './ProfitQualityCard';
export type { ProfitQualityData, ProfitFactor } from './ProfitQualityCard';
export { MetricsAccordion } from './MetricsAccordion';
export type { MetricItem, MetricGrade, MetricGradeLabel, MetricsAccordionProps } from './MetricsAccordion';
export { SmartInsights } from './SmartInsights';
export { TuneSliders } from './TuneSliders';
export { BestStrategyCard, STRATEGIES } from './BestStrategyCard';
export { PropertyMiniCard } from './PropertyMiniCard';
export { StrategySelector, STRATEGY_LIST } from './StrategySelector';

// Tabs
export { CashFlowTab } from './tabs/CashFlowTab';
export { TenYearTab } from './tabs/TenYearTab';
export { ScoreTab } from './tabs/ScoreTab';
export { WhatIfTab } from './tabs/WhatIfTab';
export { LoanTab } from './tabs/LoanTab';
export { CompareTab } from './tabs/CompareTab';

// Strategy Components
export {
  StrategyHeader,
  MetricCard,
  CostBreakdownChart,
  TimelineCard,
  InsightsSection,
} from './strategies/components';

