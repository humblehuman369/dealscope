/**
 * InvestIQ Analytics Redesign - Mobile Components
 * Export all redesigned analytics components for React Native
 */

// Types
export * from './types';

// IQ Target Hero
export { IQTargetHero } from './IQTargetHero';

// Price Ladder
export { PriceLadder, generatePriceLadder } from './PriceLadder';

// Spectrum Bar & Benchmarks
export { SpectrumBar, PerformanceBenchmarks } from './SpectrumBar';

// Negotiation Plan
export { 
  NegotiationPlan, 
  generateNegotiationPlan, 
  LEVERAGE_POINTS 
} from './NegotiationPlan';

// Strategy Selector
export { StrategySelectorNew, SubTabNav } from './StrategySelectorNew';

// Strategy Grid (2x3 layout)
export { StrategyGrid, StrategyPrompt } from './StrategyGrid';

// Welcome Section
export { WelcomeSection } from './WelcomeSection';

// Tune Section
export { 
  TuneSectionNew, 
  createSliderConfig,
  formatCurrency,
  formatPercent 
} from './TuneSectionNew';

// Deal Score Display
export { DealScoreDisplayNew } from './DealScoreDisplayNew';

// Insight Card
export { InsightCard, createIQInsight } from './InsightCard';

// Compare Toggle
export { CompareToggle } from './CompareToggle';

// Returns Grid
export { 
  ReturnsGrid, 
  createLTRReturns, 
  createSTRReturns, 
  createBRRRRReturns 
} from './ReturnsGrid';

// Property Mini Card
export { PropertyMiniCardNew } from './PropertyMiniCardNew';

// Tab Content Components
export { FundingTabContent } from './FundingTabContent';
export { TenYearTabContent } from './TenYearTabContent';
export { GrowthTabContent } from './GrowthTabContent';

// Profit Zone Dashboard
export { 
  ProfitZoneDashboard,
  type ProfitZoneMetrics, 
  type ProfitZoneTip, 
  type ProfitZoneDashboardProps 
} from './ProfitZoneDashboard';

// Main Container View
export { StrategyAnalyticsView } from './StrategyAnalyticsView';

// Context
export { AnalysisProvider, useAnalysis } from './AnalysisContext';
