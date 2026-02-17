/**
 * DealGapIQ Analytics Components - Type Definitions
 * 
 * Comprehensive types for the redesigned property analytics UI.
 * These types support all 6 investment strategies with their specific metrics.
 *
 * Core StrategyId type is re-exported from @dealscope/shared for consistency.
 */

// ============================================
// STRATEGY TYPES — re-exported from shared
// ============================================

export type { StrategyId } from '@dealscope/shared'
import type { StrategyId } from '@dealscope/shared'

export interface Strategy {
  id: StrategyId
  name: string
  shortName: string
  description: string
  icon: string
  color: string
  gradient: string
}

// ============================================
// IQ TARGET PRICE
// ============================================

export interface IQTargetResult {
  targetPrice: number
  discountFromList: number
  discountPercent: number
  rationale: string
  cashFlow?: number
  cashOnCash?: number
  equityCreated?: number
  assignmentFee?: number
}

// ============================================
// PRICE LADDER
// ============================================

export type PriceRungType = 'list' | 'ninety' | 'breakeven' | 'target' | 'offer'

export interface PriceRung {
  type: PriceRungType
  name: string
  description: string
  price: number
  percentOfList: number
  isHighlighted?: boolean
}

// ============================================
// PERFORMANCE BENCHMARKS
// ============================================

export type BenchmarkStatus = 'high' | 'average' | 'low'

export interface BenchmarkThreshold {
  low: number      // Below this = "low" status
  average: number  // Below this = "average" status
  // Above average threshold = "high" status
}

export interface BenchmarkConfig {
  id: string
  label: string
  value: number
  formattedValue: string
  status: BenchmarkStatus
  markerPosition: number  // 0-100 percentage position on spectrum
  isInverted?: boolean    // For metrics where lower is better (GRM, Vacancy)
  zones: {
    low: { label: string; range: string }
    average: { label: string; range: string }
    high: { label: string; range: string }
  }
}

// ============================================
// NEGOTIATION PLAN
// ============================================

export interface OfferCard {
  label: string
  price: number
  percentOfList: number
  isRecommended?: boolean
}

export interface LeveragePoint {
  icon: string
  text: string
}

export interface NegotiationPlanData {
  openingOffer: OfferCard
  targetPrice: OfferCard
  walkAway: OfferCard
  leveragePoints: LeveragePoint[]
}

// ============================================
// RETURNS GRID
// ============================================

export interface ReturnMetric {
  value: string
  label: string
  isPositive?: boolean
}

export interface ReturnsData {
  badge: string
  badgeType: 'profitable' | 'infinite' | 'assignable' | 'warning'
  metrics: ReturnMetric[]
}

// ============================================
// TUNE THE DEAL
// ============================================

export interface SliderConfig {
  id: string
  label: string
  value: number
  formattedValue: string
  min: number
  max: number
  step: number
  fillPercent: number
  changeIndicator?: {
    value: string
    isPositive: boolean
  }
  suffix?: string
}

export interface TuneGroup {
  id: string
  title: string
  sliders: SliderConfig[]
  isOpen?: boolean
}

// ============================================
// FORMULA CARDS
// ============================================

export interface FormulaRow {
  label: string
  value: string
  isPositive?: boolean
  isNegative?: boolean
  isTotal?: boolean
}

export interface FormulaCardData {
  title: string
  rows: FormulaRow[]
}

// ============================================
// INSIGHT CARDS
// ============================================

export type InsightType = 'success' | 'warning' | 'danger' | 'tip' | 'info'

export interface InsightData {
  type: InsightType
  icon: string
  content: string
  highlightText?: string
}

// ============================================
// HERO METRIC
// ============================================

export type MetricVariant = 'success' | 'warning' | 'danger' | 'default'

export interface HeroMetricData {
  label: string
  value: string
  subtitle?: string
  badge?: string
  variant?: MetricVariant
}

// ============================================
// SUB-TAB NAVIGATION
// ============================================

export type SubTabId = 'metrics' | 'funding' | '10year' | 'growth' | 'score' | 'whatif' | 'buyer' | 'comps'

export interface SubTab {
  id: SubTabId
  label: string
}

// ============================================
// LOAN & FUNDING
// ============================================

export interface LoanStat {
  value: string
  label: string
}

export interface PieSlice {
  label: string
  amount: number
  formattedAmount: string
  percent: number
  color: 'principal' | 'interest'
}

export interface AmortizationRow {
  year: number
  principal: string
  interest: string
  balance: string
}

// ============================================
// PERFORMANCE SECTION
// ============================================

export interface PerformanceRow {
  label: string
  value: string
  isPositive?: boolean
  isNegative?: boolean
  isHighlight?: boolean
  hasHelp?: boolean
}

// ============================================
// DEAL SCORE (Opportunity-Based)
// ============================================

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface ScoreItem {
  label: string
  score: number
  maxScore: number
  fillPercent: number
}

export interface DealScoreData {
  overall: number
  grade: OpportunityGrade
  label: string  // "Strong Opportunity", "Great Opportunity", etc.
  verdict: string
  discountPercent: number  // How much discount from list needed
  incomeValue: number
  listPrice: number
  items: ScoreItem[]
}

// ============================================
// PROPERTY MINI CARD
// ============================================

export interface PropertyMiniData {
  address: string
  location: string
  price: number
  priceLabel: string
  specs: string
  photoCount?: number
  thumbnailUrl?: string
}

// ============================================
// STRATEGY GRADE
// ============================================

export type GradeLevel = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface StrategyGrade {
  strategyId: StrategyId
  grade: GradeLevel
}

// ============================================
// DEAL GAP CHART
// ============================================

export type DealZoneLabel = 'Loss Zone' | 'High Risk' | 'Income Value / Negotiate' | 'Profit Zone' | 'Deep Value'
export type SellerMotivationLevel = 'Low' | 'Moderate' | 'High'

export interface DealGapData {
  /** Current list/asking price */
  listPrice: number
  /** LTR Income Value (where cash flow = $0) */
  incomeValue: number
  /** Proposed or calculated buy price */
  buyPrice: number
  /** Deal gap percentage: ((listPrice - buyPrice) / listPrice) * 100 */
  dealGapPercent: number
  /** Buy price vs Income Value percentage */
  buyVsIncomeValuePercent: number
  /** List price vs Income Value percentage */
  listVsIncomeValuePercent: number
  /** Current deal zone based on buy position */
  zone: DealZoneLabel
  /** Seller motivation indicator */
  sellerMotivation: SellerMotivationLevel
  /** Deal opportunity score (0-100) */
  dealScore?: number
  /** Deal opportunity grade */
  dealGrade?: OpportunityGrade
}

export interface DealGapChartProps {
  /** Income Value (where cash flow = $0) */
  incomeValue: number
  /** Current list/asking price */
  listPrice: number
  /** Buy price from worksheet (defaults to 90% of Income Value) */
  initialBuyPrice?: number
  /** Threshold percentage for deal gap glow effect */
  thresholdPct?: number
  /** Whether to show the header card (default: true, set false when embedded) */
  showHeader?: boolean
  /** Optional class name */
  className?: string
  /** Whether property is off-market (for price label) */
  isOffMarket?: boolean
  /** Listing status (for price label) */
  listingStatus?: string
}
