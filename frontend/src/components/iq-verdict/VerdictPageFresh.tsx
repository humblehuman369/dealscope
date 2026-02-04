'use client'

/**
 * VerdictPageFresh - Complete VerdictIQ Page Layout
 * 
 * A fresh implementation following the design tokens and plan layout:
 * - Section A: Property Summary Bar (collapsible)
 * - Section B: Score Hero (centered score ring + quick stats)
 * - Section C: Confidence Metrics (horizontal progress bars)
 * - Section D: Investment Analysis (price cards + metrics)
 * - Section E: Financial Breakdown (3-column layout)
 * - Section F: Performance Metrics (table with assessments)
 * - Section G: Fixed Bottom Actions
 */

import React, { useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Settings2, 
  ExternalLink,
  Download,
  Info,
} from 'lucide-react'
import { 
  spacing, 
  typography, 
  colors, 
  components, 
  tw,
  layout,
  getScoreColor,
  getAssessment,
  getUrgencyColor,
  getMarketTempColor,
  priceCardStyles,
  type PriceCardVariant,
} from './verdict-design-tokens'
import { VerdictHeader, type VerdictTab } from './VerdictHeader'

// ===================
// TYPES
// ===================

interface PropertySummary {
  address: string
  city: string
  state: string
  zip: string
  beds: number
  baths: number
  sqft: number
  price: number
  monthlyRent: number
  /** Listing status to determine price label */
  listingStatus?: 'FOR_SALE' | 'PENDING' | 'SOLD' | 'OFF_MARKET' | string
  /** Property ID for linking to details page */
  zpid?: string | number
}

interface QuickStats {
  dealGap: number
  sellerUrgency: string
  sellerUrgencyScore: number
  marketTemp: string
  vacancy: number
}

interface ConfidenceMetrics {
  dealProbability: number
  marketAlignment: number
  priceConfidence: number
}

interface PriceCard {
  label: string
  value: number
  variant: PriceCardVariant
}

interface KeyMetric {
  value: string
  label: string
}

interface FinancialColumn {
  title: string
  items: { label: string; value: string; isTotal?: boolean }[]
}

interface PerformanceMetric {
  name: string
  value: string
  benchmark: string
  numValue: number
  benchmarkNum: number
  higherIsBetter: boolean
}

interface VerdictPageFreshProps {
  property: PropertySummary
  score: number
  verdictLabel: string
  verdictSubtitle: string
  quickStats: QuickStats
  confidenceMetrics: ConfidenceMetrics
  financingTerms: string
  priceCards: PriceCard[]
  keyMetrics: KeyMetric[]
  financialBreakdown: FinancialColumn[]
  performanceMetrics: PerformanceMetric[]
  /** Currently selected price card for metrics calculation */
  selectedPriceCard?: PriceCardVariant
  // Action callbacks
  onDealMakerClick?: () => void
  onExportClick?: () => void
  onChangeTerms?: () => void
  onShowMethodology?: () => void
  /** Callback when property address is clicked - navigate to property details */
  onPropertyClick?: () => void
  /** Callback when a price card is selected - triggers metrics recalculation */
  onPriceCardSelect?: (variant: PriceCardVariant) => void
  // Header callbacks
  /** Callback when logo is clicked - navigate to homepage */
  onLogoClick?: () => void
  /** Callback when search icon is clicked */
  onSearchClick?: () => void
  /** Callback when profile icon is clicked */
  onProfileClick?: () => void
  /** Callback when a tab is clicked */
  onTabChange?: (tab: VerdictTab) => void
}

// ===================
// HELPER FUNCTIONS
// ===================

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`
  }
  return `$${price.toLocaleString()}`
}

function formatShortPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `$${Math.round(price / 1000)}K`
  }
  return `$${price.toLocaleString()}`
}

// ===================
// SUB-COMPONENTS
// ===================

/**
 * Section A: Property Summary Bar
 */
function PropertySummaryBar({ 
  property, 
  isExpanded, 
  onToggle,
  onPropertyClick,
}: { 
  property: PropertySummary
  isExpanded: boolean
  onToggle: () => void
  onPropertyClick?: () => void
}) {
  // Determine price label based on listing status
  const isListed = property.listingStatus === 'FOR_SALE' || property.listingStatus === 'PENDING'
  const priceLabel = isListed ? 'List Price' : 'Est. Market'

  return (
    <div 
      className="bg-white border-b"
      style={{ borderColor: colors.ui.border }}
    >
      {/* Collapsed Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Analysis House Icon */}
          <svg 
            viewBox="0 0 131.13 95.2" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 flex-shrink-0"
            style={{ fill: colors.brand.tealBright }}
          >
            <path d="m87.27 65.54c-8.76 0-17-3.41-23.18-9.59s-9.59-14.41-9.59-23.17 3.39-16.94 9.54-23.12l-8.2-8.21c-1.93-1.93-5.06-1.93-6.98 0l-16.31 16.33v-4.2c0-1.39-1.13-2.51-2.52-2.51h-11.09c-1.39 0-2.52 1.13-2.52 2.52v20.35l-15.33 15.33c-2.32 2.32-.7 6.29 2.58 6.33l9.46.09v37.13c0 1.32 1.07 2.38 2.38 2.38h23.44c1.32 0 2.38-1.07 2.38-2.38v-24.79h22.02v24.79c0 1.32 1.07 2.38 2.38 2.38h23.44c1.32 0 2.38-1.07 2.38-2.38v-27.6c-1.43.19-2.86.32-4.3.32z"/>
            <path d="m115.85 53.34c-.88-.88-2.23-1.02-3.26-.43l-4.17-4.17c7.84-10.38 7.04-25.25-2.41-34.7-5-5-11.66-7.76-18.74-7.76s-13.73 2.76-18.74 7.76c-10.33 10.33-10.33 27.14 0 37.47 5.17 5.17 11.95 7.75 18.74 7.75 5.63 0 11.26-1.78 15.96-5.34l4.17 4.17c-.6 1.03-.45 2.38.43 3.26l13.63 13.63c2.21 2.21 5.8 2.21 8.02 0 2.21-2.21 2.21-5.8 0-8.02l-13.63-13.63zm-43.1-6.05c-8.01-8.01-8.01-21.03 0-29.04 3.88-3.88 9.03-6.01 14.52-6.01s10.64 2.14 14.52 6.01c8.01 8.01 8.01 21.03 0 29.04-4 4-9.26 6-14.52 6s-10.52-2-14.52-6z"/>
          </svg>
          <button
            onClick={onPropertyClick}
            className="font-medium text-sm truncate hover:underline transition-colors text-left"
            style={{ color: colors.text.primary }}
            title="View property details"
          >
            {property.address}, {property.city}, {property.state} {property.zip}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-neutral-100 rounded transition-colors flex-shrink-0 ml-2"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>
      </div>

      {/* Expanded Details - 4 columns (removed Rent) */}
      {isExpanded && (
        <div 
          className="grid grid-cols-4 gap-2 px-4 pb-3 border-t"
          style={{ borderColor: colors.ui.border }}
        >
          <div className="text-center pt-3">
            <div className="text-xs text-neutral-500 mb-0.5">Beds</div>
            <div className="font-semibold text-neutral-800">{property.beds}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-neutral-500 mb-0.5">Baths</div>
            <div className="font-semibold text-neutral-800">{property.baths}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-neutral-500 mb-0.5">Sqft</div>
            <div className="font-semibold text-neutral-800">{property.sqft.toLocaleString()}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-neutral-500 mb-0.5">{priceLabel}</div>
            <div className="font-semibold text-neutral-800">{formatShortPrice(property.price)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Section B: Score Hero
 */
function ScoreHero({
  score,
  verdictLabel,
  verdictSubtitle,
  quickStats,
  onShowMethodology,
}: {
  score: number
  verdictLabel: string
  verdictSubtitle: string
  quickStats: QuickStats
  onShowMethodology?: () => void
}) {
  const scoreColor = getScoreColor(score)
  
  // Calculate stroke dash for the progress ring
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="bg-white border-b" style={{ borderColor: colors.ui.border }}>
      {/* Score Circle Section - Centered */}
      <div className="flex flex-col items-center py-8 px-5">
        {/* Score Circle with Progress Ring */}
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={colors.ui.border}
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="font-bold"
              style={{ 
                fontSize: typography.display.size,
                color: scoreColor,
              }}
            >
              {score}
            </span>
            <span 
              className="font-medium"
              style={{ 
                fontSize: typography.caption.size,
                color: colors.text.muted,
              }}
            >
              /100
            </span>
          </div>
        </div>

        {/* Verdict Label */}
        <h2 
          className="font-bold mb-1"
          style={{ 
            fontSize: typography.heading.size + 2,
            color: colors.text.primary,
          }}
        >
          {verdictLabel}
        </h2>
        
        {/* Verdict Subtitle */}
        <p 
          className="text-center mb-3"
          style={{ 
            fontSize: typography.body.size,
            color: colors.text.tertiary,
          }}
        >
          {verdictSubtitle}
        </p>

        {/* How it works link */}
        <button 
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
          style={{ 
            color: colors.brand.tealBright,
            fontSize: typography.caption.size + 2,
          }}
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How Verdict IQ Works
        </button>
      </div>

      {/* Quick Stats Row - 4 columns */}
      <div className="grid grid-cols-4 border-t" style={{ borderColor: colors.ui.border }}>
        {/* Deal Gap */}
        <div className="flex flex-col items-center py-4 border-r" style={{ borderColor: colors.ui.border }}>
          <span 
            className="uppercase tracking-wide font-medium mb-1"
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.tertiary,
            }}
          >
            Deal Gap
          </span>
          <span 
            className="font-bold"
            style={{ 
              fontSize: typography.body.size + 2,
              color: quickStats.dealGap <= 0 ? colors.status.positive : colors.status.warning,
            }}
          >
            {quickStats.dealGap > 0 ? '-' : '+'}{Math.abs(quickStats.dealGap).toFixed(1)}%
          </span>
          <span 
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.muted,
            }}
          >
            {quickStats.dealGap <= 10 ? 'Achievable' : quickStats.dealGap <= 20 ? 'Stretch' : 'Difficult'}
          </span>
        </div>

        {/* Seller Urgency */}
        <div className="flex flex-col items-center py-4 border-r" style={{ borderColor: colors.ui.border }}>
          <span 
            className="uppercase tracking-wide font-medium mb-1"
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.tertiary,
            }}
          >
            Urgency
          </span>
          <span 
            className="font-bold"
            style={{ 
              fontSize: typography.body.size + 2,
              color: getUrgencyColor(quickStats.sellerUrgency),
            }}
          >
            {quickStats.sellerUrgency}
          </span>
          <span 
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.muted,
            }}
          >
            {quickStats.sellerUrgencyScore}/100
          </span>
        </div>

        {/* Market Temp */}
        <div className="flex flex-col items-center py-4 border-r" style={{ borderColor: colors.ui.border }}>
          <span 
            className="uppercase tracking-wide font-medium mb-1"
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.tertiary,
            }}
          >
            Market
          </span>
          <span 
            className="font-bold"
            style={{ 
              fontSize: typography.body.size + 2,
              color: getMarketTempColor(quickStats.marketTemp),
            }}
          >
            {quickStats.marketTemp}
          </span>
          <span 
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.muted,
            }}
          >
            {quickStats.marketTemp === 'Cold' ? "Buyer's" : quickStats.marketTemp === 'Hot' ? "Seller's" : 'Balanced'}
          </span>
        </div>

        {/* Vacancy */}
        <div className="flex flex-col items-center py-4">
          <span 
            className="uppercase tracking-wide font-medium mb-1"
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.tertiary,
            }}
          >
            Vacancy
          </span>
          <span 
            className="font-bold"
            style={{ 
              fontSize: typography.body.size + 2,
              color: quickStats.vacancy <= 5 
                ? colors.status.positive 
                : quickStats.vacancy <= 10 
                  ? colors.status.warning 
                  : colors.status.negative,
            }}
          >
            {'<'}{quickStats.vacancy}%
          </span>
          <span 
            style={{ 
              fontSize: typography.caption.size,
              color: colors.text.muted,
            }}
          >
            {quickStats.vacancy <= 5 ? 'Healthy' : quickStats.vacancy <= 10 ? 'Moderate' : 'High'}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Section C: Confidence Metrics
 */
function ConfidenceMetricsSection({ metrics }: { metrics: ConfidenceMetrics }) {
  const getBarColor = (value: number): string => {
    if (value >= 80) return colors.status.positive
    if (value >= 60) return colors.brand.tealBright
    if (value >= 40) return colors.status.amber
    return colors.status.negative
  }

  const metricItems = [
    { label: 'Deal Probability', value: metrics.dealProbability },
    { label: 'Market Alignment', value: metrics.marketAlignment },
    { label: 'Price Confidence', value: metrics.priceConfidence },
  ]

  return (
    <div className="bg-white px-5 py-4 border-b" style={{ borderColor: colors.ui.border }}>
      <h3 
        className="uppercase tracking-wide mb-3"
        style={{ 
          fontSize: typography.label.size,
          fontWeight: typography.heading.weight,
          color: colors.text.tertiary,
        }}
      >
        Confidence Metrics
      </h3>
      
      <div className="space-y-3">
        {metricItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span 
              className="w-32"
              style={{ 
                fontSize: typography.body.size,
                color: colors.text.secondary,
              }}
            >
              {item.label}
            </span>
            <div 
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ 
                backgroundColor: colors.ui.border,
                height: components.progressBar.height,
              }}
            >
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${item.value}%`,
                  backgroundColor: getBarColor(item.value),
                }}
              />
            </div>
            <span 
              className="w-12 text-right font-semibold"
              style={{ 
                fontSize: typography.body.size,
                color: getBarColor(item.value),
              }}
            >
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Section D: Investment Analysis
 * Redesigned with segmented control price selector and unified metrics card
 */
function InvestmentAnalysisSection({
  financingTerms,
  priceCards,
  keyMetrics,
  selectedPriceCard,
  onPriceCardSelect,
  onChangeTerms,
  onExportClick,
}: {
  financingTerms: string
  priceCards: PriceCard[]
  keyMetrics: KeyMetric[]
  selectedPriceCard: PriceCardVariant
  onPriceCardSelect?: (variant: PriceCardVariant) => void
  onChangeTerms?: () => void
  onExportClick?: () => void
}) {
  return (
    <div className="px-4 py-[30px]">
      {/* White Card Container - Crisp shadow for definition */}
      <div 
        className="bg-white rounded-xl p-5 border"
        style={{ 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', 
          borderColor: colors.ui.border,
        }}
      >
        {/* Section Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 
              className="font-semibold mb-0.5"
              style={{ 
                fontSize: typography.body.size + 2,
                color: colors.text.primary,
              }}
            >
              Investment Analysis
            </h3>
            <p 
              style={{ 
                fontSize: typography.caption.size + 1,
                color: colors.text.tertiary,
              }}
            >
              Based on your terms ({financingTerms})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onExportClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors hover:bg-neutral-50"
              style={{ 
                fontSize: typography.caption.size + 1,
                color: colors.text.secondary,
                borderColor: colors.ui.border,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button 
              onClick={onChangeTerms}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors hover:bg-neutral-50"
              style={{ 
                fontSize: typography.caption.size + 1,
                color: colors.text.secondary,
                borderColor: colors.ui.border,
              }}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Terms
            </button>
          </div>
        </div>

        {/* Price Selector - Segmented Control Style */}
        <div className="bg-neutral-100 rounded-lg p-1 mb-4">
          <div className="grid grid-cols-3 gap-1">
            {priceCards.map((card) => {
              const isSelected = card.variant === selectedPriceCard
              return (
                <button 
                  key={card.label}
                  onClick={() => onPriceCardSelect?.(card.variant)}
                  className={`py-3 px-2 rounded-md transition-all ${
                    isSelected 
                      ? 'bg-white shadow-sm' 
                      : 'hover:bg-neutral-50/50'
                  }`}
                >
                  <div 
                    className="uppercase tracking-wide text-center mb-1"
                    style={{ 
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                    }}
                  >
                    <span className={isSelected ? 'text-neutral-700' : 'text-neutral-500'}>
                      {card.label}
                    </span>
                  </div>
                  <div 
                    className={`text-center font-bold ${isSelected ? 'text-neutral-900' : 'text-neutral-600'}`}
                    style={{ fontSize: 20 }}
                  >
                    {formatPrice(card.value)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Metrics Card - Unified Display */}
        <div className="bg-neutral-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            {keyMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div 
                  className="font-bold text-neutral-900 mb-0.5"
                  style={{ fontSize: 22 }}
                >
                  {metric.value}
                </div>
                <div 
                  className="text-neutral-500 uppercase tracking-wide"
                  style={{ fontSize: 9, fontWeight: 500 }}
                >
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Section E: Financial Breakdown
 */
function FinancialBreakdownSection({
  columns,
}: {
  columns: FinancialColumn[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white border-b" style={{ borderColor: colors.ui.border }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.ui.border }}>
        <h3 
          className="font-semibold"
          style={{ 
            fontSize: typography.body.size + 1,
            color: colors.text.primary,
          }}
        >
          Financial Breakdown
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm transition-colors hover:opacity-75"
          style={{ color: colors.brand.tealBright }}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpanded ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {/* Column Headers - matches Performance Metrics table header style */}
      <div 
        className="grid grid-cols-3 gap-2 px-4 py-2 border-b"
        style={{ borderColor: colors.ui.border }}
      >
        {columns.map((column) => (
          <span 
            key={column.title}
            className="uppercase tracking-wide"
            style={{ 
              fontSize: typography.caption.size,
              fontWeight: typography.heading.weight,
              color: colors.text.tertiary,
            }}
          >
            {column.title}
          </span>
        ))}
      </div>

      {/* Column Content - no vertical separators, matching row height with Performance Metrics */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        {columns.map((column) => (
          <div key={column.title}>
            <div className="space-y-2">
              {column.items
                .slice(0, isExpanded ? undefined : 3)
                .map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex justify-between items-center"
                    style={{
                      borderTop: item.isTotal ? `1px solid ${colors.ui.border}` : undefined,
                      paddingTop: item.isTotal ? spacing.xs : undefined,
                      marginTop: item.isTotal ? spacing.xs : undefined,
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: typography.caption.size + 1,
                        color: colors.text.secondary,
                        fontWeight: item.isTotal ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    <span 
                      style={{ 
                        fontSize: typography.caption.size + 1,
                        color: colors.text.primary,
                        fontWeight: item.isTotal ? 600 : 500,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Section F: Performance Metrics Table
 * Styled to match Financial Breakdown section
 */
function PerformanceMetricsSection({
  metrics,
}: {
  metrics: PerformanceMetric[]
}) {
  return (
    <div className="bg-white border-b" style={{ borderColor: colors.ui.border }}>
      {/* Header - matches Financial Breakdown header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.ui.border }}>
        <h3 
          className="font-semibold"
          style={{ 
            fontSize: typography.body.size + 1,
            color: colors.text.primary,
          }}
        >
          Performance Metrics
        </h3>
      </div>

      {/* Table Header */}
      <div 
        className="grid grid-cols-4 gap-2 px-4 py-2 border-b"
        style={{ borderColor: colors.ui.border }}
      >
        <span 
          className="uppercase tracking-wide"
          style={{ 
            fontSize: typography.caption.size,
            fontWeight: typography.heading.weight,
            color: colors.text.tertiary,
          }}
        >
          Metric
        </span>
        <span 
          className="uppercase tracking-wide text-right"
          style={{ 
            fontSize: typography.caption.size,
            fontWeight: typography.heading.weight,
            color: colors.text.tertiary,
          }}
        >
          Value
        </span>
        <span 
          className="uppercase tracking-wide text-right"
          style={{ 
            fontSize: typography.caption.size,
            fontWeight: typography.heading.weight,
            color: colors.text.tertiary,
          }}
        >
          Benchmark
        </span>
        <span 
          className="uppercase tracking-wide text-center"
          style={{ 
            fontSize: typography.caption.size,
            fontWeight: typography.heading.weight,
            color: colors.text.tertiary,
          }}
        >
          Status
        </span>
      </div>

      {/* Table Rows - font sizes match Financial Breakdown content */}
      <div className="px-4 py-3 space-y-1.5">
        {metrics.map((metric) => {
          const assessment = getAssessment(metric.numValue, metric.benchmarkNum, metric.higherIsBetter)
          return (
            <div key={metric.name} className="grid grid-cols-4 gap-2 items-center">
              <span 
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.secondary,
                }}
              >
                {metric.name}
              </span>
              <span 
                className="text-right"
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.primary,
                  fontWeight: 500,
                }}
              >
                {metric.value}
              </span>
              <span 
                className="text-right"
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.muted,
                }}
              >
                {metric.benchmark}
              </span>
              <div className="flex justify-center">
                <span 
                  className="text-[11px] font-semibold"
                  style={{ color: assessment.color }}
                >
                  {assessment.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Section G: DealMakerIQ Link (bottom right)
 */
function DealMakerLink({
  onDealMakerClick,
}: {
  onDealMakerClick?: () => void
}) {
  return (
    <div className="flex justify-end px-4 py-4">
      <button
        onClick={onDealMakerClick}
        className="flex items-center gap-1.5 font-medium transition-colors hover:opacity-75"
        style={{ 
          color: colors.brand.tealBright,
          fontSize: typography.body.size,
        }}
      >
        Go to DealMakerIQ
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  )
}

// ===================
// MAIN COMPONENT
// ===================

export function VerdictPageFresh({
  property,
  score,
  verdictLabel,
  verdictSubtitle,
  quickStats,
  confidenceMetrics,
  financingTerms,
  priceCards,
  keyMetrics,
  financialBreakdown,
  performanceMetrics,
  selectedPriceCard = 'target',
  onDealMakerClick,
  onExportClick,
  onChangeTerms,
  onShowMethodology,
  onPropertyClick,
  onPriceCardSelect,
  // Header callbacks
  onLogoClick,
  onSearchClick,
  onProfileClick,
  onTabChange,
}: VerdictPageFreshProps) {
  const [activeTab, setActiveTab] = useState<VerdictTab>('analyze')
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(false)

  // Handle tab change - use external handler if provided, otherwise use local state
  const handleTabChange = (tab: VerdictTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: colors.background.light }}
    >
      {/* Header - Full width */}
      <VerdictHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogoClick={onLogoClick}
        onSearchClick={onSearchClick}
        onProfileClick={onProfileClick}
      />

      {/* Content Container - Max width for readability on wide screens */}
      <div 
        className="mx-auto w-full"
        style={{ maxWidth: layout.maxWidth }}
      >
        {/* Section A: Property Summary Bar */}
        <PropertySummaryBar
          property={property}
          isExpanded={isPropertyExpanded}
          onToggle={() => setIsPropertyExpanded(!isPropertyExpanded)}
          onPropertyClick={onPropertyClick}
        />

        {/* Section B: Score Hero */}
        <ScoreHero
          score={score}
          verdictLabel={verdictLabel}
          verdictSubtitle={verdictSubtitle}
          quickStats={quickStats}
          onShowMethodology={onShowMethodology}
        />

        {/* Section C: Confidence Metrics */}
        <ConfidenceMetricsSection metrics={confidenceMetrics} />

        {/* Section D: Investment Analysis */}
        <InvestmentAnalysisSection
          financingTerms={financingTerms}
          priceCards={priceCards}
          keyMetrics={keyMetrics}
          selectedPriceCard={selectedPriceCard}
          onPriceCardSelect={onPriceCardSelect}
          onChangeTerms={onChangeTerms}
          onExportClick={onExportClick}
        />

        {/* Section E: Financial Breakdown */}
        <FinancialBreakdownSection columns={financialBreakdown} />

        {/* Section F: Performance Metrics */}
        <PerformanceMetricsSection metrics={performanceMetrics} />

        {/* Section G: DealMakerIQ Link */}
        <DealMakerLink
          onDealMakerClick={onDealMakerClick}
        />
      </div>
    </div>
  )
}

export default VerdictPageFresh
