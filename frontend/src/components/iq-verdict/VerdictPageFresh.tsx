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
  onDealMakerClick?: () => void
  onExportClick?: () => void
  onChangeTerms?: () => void
  onShowMethodology?: () => void
  /** Callback when property address is clicked - navigate to property details */
  onPropertyClick?: () => void
  /** Callback when a price card is selected - triggers metrics recalculation */
  onPriceCardSelect?: (variant: PriceCardVariant) => void
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
          <span className="text-slate-400 flex-shrink-0">📍</span>
          <button
            onClick={onPropertyClick}
            className="font-medium text-sm truncate hover:underline transition-colors text-left"
            style={{ color: colors.brand.teal }}
            title="View property details"
          >
            {property.address}, {property.city}, {property.state} {property.zip}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0 ml-2"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
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
            <div className="text-xs text-slate-500 mb-0.5">Beds</div>
            <div className="font-semibold text-slate-800">{property.beds}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-slate-500 mb-0.5">Baths</div>
            <div className="font-semibold text-slate-800">{property.baths}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-slate-500 mb-0.5">Sqft</div>
            <div className="font-semibold text-slate-800">{property.sqft.toLocaleString()}</div>
          </div>
          <div className="text-center pt-3">
            <div className="text-xs text-slate-500 mb-0.5">{priceLabel}</div>
            <div className="font-semibold text-slate-800">{formatShortPrice(property.price)}</div>
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
            color: colors.brand.teal,
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
    if (value >= 60) return colors.brand.teal
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
 */
function InvestmentAnalysisSection({
  financingTerms,
  priceCards,
  keyMetrics,
  selectedPriceCard,
  onPriceCardSelect,
  onChangeTerms,
}: {
  financingTerms: string
  priceCards: PriceCard[]
  keyMetrics: KeyMetric[]
  selectedPriceCard: PriceCardVariant
  onPriceCardSelect?: (variant: PriceCardVariant) => void
  onChangeTerms?: () => void
}) {
  // Get the label of the selected card for display
  const selectedCard = priceCards.find(c => c.variant === selectedPriceCard)
  const selectedLabel = selectedCard?.label || 'Target Buy'

  return (
    <div 
      className="px-4 py-5"
      style={{ backgroundColor: colors.background.light }}
    >
      {/* Section Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 
            className="uppercase tracking-wide mb-1"
            style={{ 
              fontSize: typography.label.size,
              fontWeight: typography.heading.weight,
              color: colors.text.tertiary,
            }}
          >
            Your Investment Analysis
          </h3>
          <p 
            style={{ 
              fontSize: typography.caption.size + 1,
              color: colors.text.tertiary,
            }}
          >
            Based on YOUR financing terms ({financingTerms})
          </p>
        </div>
        <button 
          onClick={onChangeTerms}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors hover:bg-slate-50"
          style={{ 
            fontSize: typography.caption.size + 1,
            color: colors.text.secondary,
            borderColor: colors.ui.border,
          }}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Change terms
        </button>
      </div>

      {/* Price Cards - selectable, square corners, full border */}
      <div className="grid grid-cols-3 gap-3">
        {priceCards.map((card) => {
          const isSelected = card.variant === selectedPriceCard
          return (
            <button 
              key={card.label}
              onClick={() => onPriceCardSelect?.(card.variant)}
              className={`p-3 border transition-all ${
                isSelected 
                  ? 'bg-cyan-50 border-slate-300 shadow-sm' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div 
                className="uppercase tracking-wide text-center mb-1"
                style={{ 
                  fontSize: typography.caption.size,
                  fontWeight: typography.label.weight,
                }}
              >
                <span className={isSelected ? 'text-cyan-700' : 'text-slate-600'}>
                  {card.label}
                </span>
              </div>
              <div 
                className="text-center font-bold"
                style={{ fontSize: typography.heading.size }}
              >
                <span className={isSelected ? 'text-cyan-900' : 'text-slate-800'}>
                  {formatPrice(card.value)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Key Metrics Row - shaded, shows metrics for selected price */}
      <div className="border border-slate-200 overflow-hidden bg-cyan-50">
        {/* Selected indicator - white background */}
        <div 
          className="text-center py-1.5 border-b border-slate-200 bg-white"
          style={{ fontSize: typography.caption.size }}
        >
          <span className="text-slate-500">
            Metrics based on <span className="font-semibold text-cyan-600">{selectedLabel}</span> price
          </span>
        </div>
        
        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-4 py-4 px-3">
          {keyMetrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div 
                className="font-bold mb-0.5 text-cyan-900"
                style={{ fontSize: typography.heading.size }}
              >
                {metric.value}
              </div>
              <div 
                className="text-cyan-700"
                style={{ fontSize: typography.caption.size }}
              >
                {metric.label}
              </div>
            </div>
          ))}
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
          style={{ color: colors.brand.teal }}
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
          <div key={column.title}>
            <span 
              className="uppercase tracking-wide"
              style={{ 
                fontSize: typography.caption.size,
                fontWeight: typography.heading.weight,
                color: colors.text.tertiary,
              }}
            >
              {column.title}
            </span>
          </div>
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
 * Section G: Fixed Bottom Actions
 */
function BottomActions({
  onDealMakerClick,
  onExportClick,
}: {
  onDealMakerClick?: () => void
  onExportClick?: () => void
}) {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4"
      style={{ 
        borderColor: colors.ui.border,
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onDealMakerClick}
          className="w-full flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors"
          style={{ 
            height: components.button.primaryHeight,
            backgroundColor: colors.brand.teal,
            color: colors.text.white,
          }}
        >
          Go to DealMakerIQ
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={onExportClick}
          className="w-full mt-2 flex items-center justify-center gap-2 font-medium transition-colors hover:opacity-75"
          style={{ 
            height: components.button.secondaryHeight,
            color: colors.text.secondary,
          }}
        >
          <Download className="w-4 h-4" />
          Export Analysis
        </button>
      </div>
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
}: VerdictPageFreshProps) {
  const [activeTab, setActiveTab] = useState<VerdictTab>('analyze')
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(false)

  return (
    <div 
      className="min-h-screen pb-32"
      style={{ backgroundColor: colors.background.light }}
    >
      {/* Header */}
      <VerdictHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
      />

      {/* Section E: Financial Breakdown */}
      <FinancialBreakdownSection columns={financialBreakdown} />

      {/* Section F: Performance Metrics */}
      <PerformanceMetricsSection metrics={performanceMetrics} />

      {/* Section G: Fixed Bottom Actions */}
      <BottomActions
        onDealMakerClick={onDealMakerClick}
        onExportClick={onExportClick}
      />
    </div>
  )
}

export default VerdictPageFresh
