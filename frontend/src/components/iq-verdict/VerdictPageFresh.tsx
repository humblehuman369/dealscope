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
  Loader2,
} from 'lucide-react'
import { 
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
import { ScoreMethodologySheet } from './ScoreMethodologySheet'
// Note: VerdictHeader and PropertySummaryBar are now handled by the global AppHeader in layout

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

interface FinancialItem {
  label: string
  value: string
  isTotal?: boolean
  isSubHeader?: boolean
  isNegative?: boolean
  isTeal?: boolean
}

interface FinancialColumn {
  title: string
  items: FinancialItem[]
}

interface FinancialSummary {
  noi: { label: string; value: string }
  cashflow: {
    annual: { label: string; value: string; isNegative: boolean }
    monthly: { label: string; value: string; isNegative: boolean }
  }
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
  financialSummary?: FinancialSummary
  performanceMetrics: PerformanceMetric[]
  /** Currently selected price card for metrics calculation */
  selectedPriceCard?: PriceCardVariant
  // Action callbacks
  onDealMakerClick?: () => void
  onExportClick?: () => void
  onChangeTerms?: () => void
  onShowMethodology?: () => void
  /** Callback when a price card is selected - triggers metrics recalculation */
  onPriceCardSelect?: (variant: PriceCardVariant) => void
  /** Whether an export is currently in progress */
  isExporting?: boolean
  // Note: Header callbacks (logo, search, profile, tabs) are now handled by global AppHeader
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
 * Section B: Score Hero (Polished)
 * Gradient bg, progress ring with glow, pill verdict label
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

  // Pill background based on score
  const getPillBg = (s: number) => {
    if (s >= 80) return 'bg-teal-500/10'
    if (s >= 50) return 'bg-amber-500/10'
    return 'bg-red-500/10'
  }

  return (
    <div className="bg-white border-b relative overflow-hidden" style={{ borderColor: colors.ui.border }}>
      {/* Score Section - Compact horizontal layout */}
      <div className="flex items-center gap-5 py-5 px-5 relative">
        {/* Score Circle - Smaller, subdued */}
        <div className="relative w-20 h-20 flex-shrink-0" style={{ filter: `drop-shadow(0 0 8px ${scoreColor}20)` }}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(229,229,229,0.4)"
              strokeWidth="7"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="font-bold leading-none"
              style={{ 
                fontSize: 24,
                color: scoreColor,
              }}
            >
              {score}
            </span>
            <span 
              className="font-medium"
              style={{ 
                fontSize: 9,
                color: colors.text.muted,
              }}
            >
              /100
            </span>
          </div>
        </div>

        {/* Verdict Info - Right side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold" style={{ color: colors.text.primary }}>
              Verdict<span style={{ color: colors.brand.tealBright }}>IQ</span>
            </span>
            <div className={`${getPillBg(score)} px-3 py-0.5 rounded-full`}>
              <span 
                className="font-bold"
                style={{ 
                  fontSize: 14,
                  color: scoreColor,
                }}
              >
                {verdictLabel}
              </span>
            </div>
          </div>
          <p 
            className="mb-1.5"
            style={{ 
              fontSize: typography.body.size - 1,
              color: colors.text.tertiary,
            }}
          >
            {verdictSubtitle}
          </p>
          <button 
            className="flex items-center gap-1 bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity p-0"
            style={{ 
              color: colors.brand.tealBright,
              fontSize: typography.caption.size + 1,
            }}
            onClick={onShowMethodology}
          >
            <Info className="w-3 h-3" />
            How Verdict IQ Works
          </button>
        </div>
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
 * Section C: Confidence Metrics (Polished)
 * Smoother bars with animated fills
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
          color: colors.text.secondary,
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
              className="flex-1 rounded-full overflow-hidden"
              style={{ 
                backgroundColor: 'rgba(229,229,229,0.5)',
                height: 7,
              }}
            >
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${item.value}%`,
                  backgroundColor: getBarColor(item.value),
                }}
              />
            </div>
            <span 
              className="w-12 text-right font-bold tabular-nums"
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
 * Section D: Investment Analysis (Redesigned)
 * Gradient card, pill-style price selector with RECOMMENDED badge,
 * white metric cards with teal accents, dynamic context label
 */
function InvestmentAnalysisSection({
  financingTerms,
  priceCards,
  keyMetrics,
  selectedPriceCard,
  onPriceCardSelect,
  onChangeTerms,
  onExportClick,
  isExporting = false,
}: {
  financingTerms: string
  priceCards: PriceCard[]
  keyMetrics: KeyMetric[]
  selectedPriceCard: PriceCardVariant
  onPriceCardSelect?: (variant: PriceCardVariant) => void
  onChangeTerms?: () => void
  onExportClick?: () => void
  isExporting?: boolean
}) {
  const selectedLabel = selectedPriceCard === 'target' ? 'TARGET BUY'
    : selectedPriceCard === 'breakeven' ? 'BREAKEVEN' : 'WHOLESALE'

  return (
    <div className="px-4 pt-0 pb-8">
      {/* Gradient Card Container */}
      <div 
        className={tw.investmentCard}
      >
        {/* Section Header with Icon */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke={colors.brand.tealBright} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
            </div>
            <div>
              <h3 
                className="font-bold tracking-wide mb-0.5"
                style={{ 
                  fontSize: typography.body.size,
                  color: colors.text.primary,
                  letterSpacing: '0.3px',
                }}
              >
                YOUR INVESTMENT ANALYSIS
              </h3>
              <p 
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.secondary,
                }}
              >
                Based on your terms ({financingTerms})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onExportClick}
              disabled={isExporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                fontSize: typography.caption.size + 1,
                color: colors.text.secondary,
                borderColor: colors.ui.border,
              }}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export
                </>
              )}
            </button>
            <button 
              onClick={onChangeTerms}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white transition-colors hover:bg-neutral-50"
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

        {/* Price Selector - Pill Style with RECOMMENDED badge */}
        <div className="bg-neutral-100 rounded-xl p-1 mb-5">
          <div className="grid grid-cols-3 gap-1">
            {priceCards.map((card) => {
              const isSelected = card.variant === selectedPriceCard
              const isTarget = card.variant === 'target'
              return (
                <button 
                  key={card.label}
                  onClick={() => onPriceCardSelect?.(card.variant)}
                  className={`relative py-3.5 px-2 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-white shadow-md' 
                      : 'hover:bg-neutral-50/60'
                  }`}
                >
                  {/* RECOMMENDED badge for Target Buy */}
                  {isTarget && (
                    <span 
                      className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded text-[7px] font-bold tracking-wide uppercase"
                      style={{ 
                        backgroundColor: 'rgba(8,145,178,0.12)',
                        color: colors.brand.tealBright,
                      }}
                    >
                      Recommended
                    </span>
                  )}
                  <div 
                    className="uppercase tracking-wide text-center mb-1"
                    style={{ 
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      marginTop: isTarget ? 6 : 0,
                    }}
                  >
                    <span className={isSelected ? 'text-neutral-800 font-bold' : 'text-neutral-500'}>
                      {card.label}
                    </span>
                  </div>
                  <div 
                    className="text-center font-bold transition-all"
                    style={{ 
                      fontSize: isSelected ? 22 : 17,
                      color: isSelected ? colors.brand.tealBright : colors.text.tertiary,
                    }}
                  >
                    {formatPrice(card.value)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Metrics Cards - Individual white cards with teal accent */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {keyMetrics.map((metric) => (
            <div 
              key={metric.label} 
              className="bg-white rounded-lg p-4 text-center relative overflow-hidden border border-neutral-200/60"
              style={{ boxShadow: colors.shadow.metricCard }}
            >
              {/* Teal top accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg"
                style={{ backgroundColor: colors.brand.tealBright }}
              />
              <div 
                className="text-neutral-500 uppercase tracking-wide mb-1.5"
                style={{ fontSize: 9, fontWeight: 600 }}
              >
                {metric.label}
              </div>
              <div 
                className="font-bold tabular-nums transition-all duration-300"
                style={{ 
                  fontSize: 20,
                  color: colors.brand.tealBright,
                }}
              >
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Context Label */}
        <div className="flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-neutral-400" />
          <span 
            style={{ 
              fontSize: typography.caption.size + 1,
              color: colors.text.tertiary,
            }}
          >
            Based on <strong style={{ color: colors.brand.tealBright, fontWeight: 700 }}>{selectedLabel}</strong> price
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Section E: Financial Breakdown (Two-Column Mini Financial Statement)
 * Always expanded, sub-group headers with teal accents, full-width NOI/Cashflow summary
 */
function FinancialBreakdownSection({
  columns,
  summary,
}: {
  columns: FinancialColumn[]
  summary?: FinancialSummary
}) {
  return (
    <div className="bg-white border-b" style={{ borderColor: colors.ui.border }}>
      {/* Header with Icon */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.ui.border }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.background.deepNavy }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
            </svg>
          </div>
          <div>
            <h3 
              className="font-semibold"
              style={{ 
                fontSize: typography.body.size + 1,
                color: colors.text.primary,
              }}
            >
              Financial Breakdown
            </h3>
            <span style={{ fontSize: typography.caption.size, color: colors.text.tertiary }}>
              Mini proforma statement
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-2 gap-6 px-5 py-4">
        {columns.map((column) => (
          <div key={column.title}>
            {/* Column items */}
            <div className="space-y-0">
              {column.items.map((item, idx) => {
                // Sub-header rendering
                if (item.isSubHeader) {
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 pb-1.5 mb-1"
                      style={{ 
                        borderBottom: `2px solid ${colors.brand.tealBright}`,
                        marginTop: idx > 0 ? 16 : 0,
                      }}
                    >
                      <div 
                        className="w-[3px] h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors.brand.tealBright }}
                      />
                      <span 
                        className="uppercase tracking-wider"
                        style={{ 
                          fontSize: 10,
                          fontWeight: 700,
                          color: colors.brand.tealBright,
                          letterSpacing: '0.5px',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                }

                // Total row rendering
                if (item.isTotal) {
                  return (
                    <div 
                      key={idx}
                      className="flex justify-between items-center py-1.5 mt-1"
                      style={{
                        borderTop: `1.5px solid ${colors.brand.tealBright}`,
                      }}
                    >
                      <span 
                        style={{ 
                          fontSize: typography.caption.size + 1,
                          color: colors.text.primary,
                          fontWeight: 700,
                        }}
                      >
                        {item.label}
                      </span>
                      <span 
                        style={{ 
                          fontSize: typography.caption.size + 1,
                          color: colors.brand.tealBright,
                          fontWeight: 700,
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  )
                }

                // Normal row
                return (
                  <div 
                    key={idx}
                    className="flex justify-between items-center"
                    style={{
                      padding: '5px 0',
                      borderBottom: `1px solid ${colors.ui.border}40`,
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: typography.caption.size + 1,
                        color: colors.text.secondary,
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </span>
                    <span 
                      style={{ 
                        fontSize: typography.caption.size + 1,
                        color: item.isNegative 
                          ? colors.status.negative 
                          : item.isTeal 
                            ? colors.brand.tealBright 
                            : colors.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row: Resources (left) + NOI/Cashflow (right) */}
      {summary && (
        <div className="grid grid-cols-2 gap-6 px-5 pb-4">
          {/* Left: Resources */}
          <div>
            {/* Resources sub-header (matches FINANCING style) */}
            <div 
              className="flex items-center gap-2 pb-1.5 mb-3"
              style={{ borderBottom: `2px solid ${colors.brand.tealBright}` }}
            >
              <div 
                className="w-[3px] h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors.brand.tealBright }}
              />
              <span 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.brand.tealBright,
                  letterSpacing: '0.5px',
                }}
              >
                Resources
              </span>
            </div>

            <div className="space-y-2">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] bg-white transition-colors hover:bg-teal-50/40"
                style={{ borderColor: colors.brand.tealBright }}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={colors.brand.tealBright} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span 
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: 10, color: colors.brand.tealBright, letterSpacing: '0.4px' }}
                >
                  Get Funding
                </span>
              </button>

              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] bg-white transition-colors hover:bg-teal-50/40"
                style={{ borderColor: colors.brand.tealBright }}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={colors.brand.tealBright} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span 
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: 10, color: colors.brand.tealBright, letterSpacing: '0.4px' }}
                >
                  Talk to an Agent
                </span>
              </button>

              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] bg-white transition-colors hover:bg-teal-50/40"
                style={{ borderColor: colors.brand.tealBright }}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={colors.brand.tealBright} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span 
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: 10, color: colors.brand.tealBright, letterSpacing: '0.4px' }}
                >
                  Need a Contractor
                </span>
              </button>
            </div>
          </div>

          {/* Right: NOI + Cashflow */}
          <div className="space-y-2">
            {/* NOI Highlight Box */}
            <div 
              className="flex justify-between items-center rounded-xl px-3.5 py-3 relative overflow-hidden"
              style={{ 
                backgroundColor: 'rgba(8,145,178,0.05)',
                border: '1px solid rgba(8,145,178,0.20)',
              }}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: colors.brand.tealBright }}
              />
              <span 
                className="font-bold pl-2"
                style={{ 
                  fontSize: typography.caption.size + 2,
                  color: colors.text.primary,
                }}
              >
                {summary.noi.label}
              </span>
              <span 
                className="font-extrabold tabular-nums"
                style={{ 
                  fontSize: typography.body.size + 2,
                  color: colors.brand.tealBright,
                }}
              >
                {summary.noi.value}
              </span>
            </div>

            {/* Cashflow Box */}
            <div 
              className="rounded-xl px-3.5 py-3"
              style={{ 
                backgroundColor: summary.cashflow.annual.isNegative 
                  ? 'rgba(220,38,38,0.05)' 
                  : 'rgba(8,145,178,0.05)',
                border: `1px solid ${
                  summary.cashflow.annual.isNegative 
                    ? 'rgba(220,38,38,0.20)' 
                    : 'rgba(8,145,178,0.20)'
                }`,
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <svg 
                    className="w-3.5 h-3.5" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke={summary.cashflow.annual.isNegative ? colors.status.negative : colors.brand.tealBright} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    {summary.cashflow.annual.isNegative ? (
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    ) : (
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    )}
                  </svg>
                  <span 
                    className="font-bold"
                    style={{ 
                      fontSize: typography.caption.size + 2,
                      color: colors.text.primary,
                    }}
                  >
                    {summary.cashflow.annual.label}
                  </span>
                </div>
                <span 
                  className="font-extrabold tabular-nums"
                  style={{ 
                    fontSize: typography.body.size + 2,
                    color: summary.cashflow.annual.isNegative 
                      ? colors.status.negative 
                      : colors.brand.tealBright,
                  }}
                >
                  {summary.cashflow.annual.value}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span 
                  style={{ 
                    fontSize: typography.caption.size + 1,
                    color: colors.text.tertiary,
                  }}
                >
                  {summary.cashflow.monthly.label}
                </span>
                <span 
                  className="font-semibold tabular-nums"
                  style={{ 
                    fontSize: typography.caption.size + 2,
                    color: summary.cashflow.monthly.isNegative 
                      ? colors.status.negative 
                      : colors.brand.tealBright,
                  }}
                >
                  {summary.cashflow.monthly.value}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Section F: Performance Metrics Table (Polished)
 * Icon header, colored assessment pills
 */
function PerformanceMetricsSection({
  metrics,
}: {
  metrics: PerformanceMetric[]
}) {
  return (
    <div className="bg-white border-b" style={{ borderColor: colors.ui.border }}>
      {/* Header with Icon */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.ui.border }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.background.deepNavy }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h3 
              className="font-semibold"
              style={{ 
                fontSize: typography.body.size + 1,
                color: colors.text.primary,
              }}
            >
              Performance Metrics
            </h3>
            <span style={{ fontSize: typography.caption.size, color: colors.text.tertiary }}>
              How this deal compares
            </span>
          </div>
        </div>
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

      {/* Table Rows with colored assessment pills */}
      <div className="px-4 py-3 space-y-1.5">
        {metrics.map((metric) => {
          const assessment = getAssessment(metric.numValue, metric.benchmarkNum, metric.higherIsBetter)
          return (
            <div key={metric.name} className="grid grid-cols-4 gap-2 items-center py-0.5">
              <span 
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.secondary,
                }}
              >
                {metric.name}
              </span>
              <span 
                className="text-right font-medium tabular-nums"
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.primary,
                }}
              >
                {metric.value}
              </span>
              <span 
                className="text-right tabular-nums"
                style={{ 
                  fontSize: typography.caption.size + 1,
                  color: colors.text.muted,
                }}
              >
                {metric.benchmark}
              </span>
              <div className="flex justify-center">
                <span className={`${assessment.bgClass} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
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
  financialSummary,
  performanceMetrics,
  selectedPriceCard = 'target',
  onDealMakerClick,
  onExportClick,
  onChangeTerms,
  onShowMethodology,
  onPriceCardSelect,
  isExporting = false,
}: VerdictPageFreshProps) {
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)

  // Handle methodology popup
  const handleMethodologyClick = () => {
    setIsMethodologyOpen(true)
    onShowMethodology?.()
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: colors.background.light }}
    >
      {/* Header and Property Bar are now handled by global AppHeader in layout */}

      {/* Content Container - Max width for readability on wide screens */}
      <div 
        className="mx-auto w-full"
        style={{ maxWidth: layout.maxWidth }}
      >
        {/* Investment Analysis FIRST (Star of the show - conversion driver) */}
        <InvestmentAnalysisSection
          financingTerms={financingTerms}
          priceCards={priceCards}
          keyMetrics={keyMetrics}
          selectedPriceCard={selectedPriceCard}
          onPriceCardSelect={onPriceCardSelect}
          onChangeTerms={onChangeTerms}
          onExportClick={onExportClick}
          isExporting={isExporting}
        />

        {/* Breathing room */}
        <div className="h-1" style={{ backgroundColor: colors.background.light }} />

        {/* Score Hero - Supporting confidence section */}
        <ScoreHero
          score={score}
          verdictLabel={verdictLabel}
          verdictSubtitle={verdictSubtitle}
          quickStats={quickStats}
          onShowMethodology={handleMethodologyClick}
        />

        {/* Confidence Metrics */}
        <ConfidenceMetricsSection metrics={confidenceMetrics} />

        {/* Breathing room */}
        <div className="h-1" style={{ backgroundColor: colors.background.light }} />

        {/* Section E: Financial Breakdown */}
        <FinancialBreakdownSection columns={financialBreakdown} summary={financialSummary} />

        {/* Subtle divider */}
        <div className="h-px mx-4" style={{ backgroundColor: colors.ui.border }} />

        {/* Section F: Performance Metrics */}
        <PerformanceMetricsSection metrics={performanceMetrics} />

        {/* Section G: DealMakerIQ Link */}
        <DealMakerLink
          onDealMakerClick={onDealMakerClick}
        />
      </div>

      {/* Score Methodology Popup */}
      <ScoreMethodologySheet
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        currentScore={score}
        scoreType="verdict"
      />
    </div>
  )
}

export default VerdictPageFresh
