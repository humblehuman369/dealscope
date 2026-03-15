'use client'

/**
 * VerdictScoreHero Component
 * 
 * Centered, vertically stacked score display with:
 * - Large score circle with gradient ring (centered)
 * - Verdict label and subtitle (centered)
 * - 4-column quick stats row
 * - Confidence metrics with progress bars
 */

import React from 'react'
import { Info } from 'lucide-react'

interface VerdictScoreHeroProps {
  score: number
  verdictLabel: string
  verdictSubtitle: string
  dealGap: number
  sellerUrgency: string
  sellerUrgencyScore: number
  marketTemp: string
  vacancy: number
  confidenceMetrics: {
    dealProbability: number
    marketAlignment: number
    priceConfidence: number
  }
  onShowMethodology?: () => void
}

// Get score color based on tier
// Unified color system across all VerdictIQ pages
function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--accent-sky)' // Teal - Strong/Good (A+/A)
  if (score >= 50) return 'var(--status-warning)' // Amber - Average/Marginal (B/C)
  return 'var(--status-negative)'                  // Red - Unlikely/Pass (D/F)
}

// Get urgency color
function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'high': return 'var(--status-positive)'
    case 'medium': return 'var(--status-warning)'
    case 'low': return 'var(--text-heading)'
    default: return 'var(--text-heading)'
  }
}

// Get market temp color
function getMarketTempColor(temp: string): string {
  switch (temp.toLowerCase()) {
    case 'cold': return 'var(--accent-sky)'
    case 'warm': return 'var(--status-warning)'
    case 'hot': return 'var(--status-negative)'
    default: return 'var(--text-heading)'
  }
}

// Get bar color for confidence metrics
function getBarColor(value: number): string {
  if (value >= 80) return 'var(--status-positive)'
  if (value >= 60) return 'var(--accent-sky)'
  if (value >= 40) return 'var(--status-warning)'
  return 'var(--status-negative)'
}

// ── DealGap Gauge ────────────────────────────────────────────
const GAUGE_MAX = 30
const GAUGE_R = 36
const GAUGE_CX = 50
const GAUGE_CY = 44
const GAUGE_SW = 7
const ARC_LEN = Math.PI * GAUGE_R

function getDealGapTier(gap: number): { color: string; label: string } {
  if (gap <= 10) return { color: 'var(--status-positive)', label: 'Achievable' }
  if (gap <= 20) return { color: 'var(--status-warning)', label: 'Stretch' }
  return { color: 'var(--status-negative)', label: 'Difficult' }
}

function DealGapGauge({ dealGap }: { dealGap: number }) {
  const absGap = Math.abs(dealGap)
  const progress = Math.min(absGap / GAUGE_MAX, 1)
  const tier = getDealGapTier(absGap)

  const arcD = `M ${GAUGE_CX - GAUGE_R} ${GAUGE_CY} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${GAUGE_CX + GAUGE_R} ${GAUGE_CY}`
  const dashOffset = ARC_LEN * (1 - progress)

  const needleAngle = Math.PI * (1 - progress)
  const nx = GAUGE_CX + GAUGE_R * Math.cos(needleAngle)
  const ny = GAUGE_CY - GAUGE_R * Math.sin(needleAngle)

  const gapText = `${dealGap > 0 ? '-' : '+'}${absGap.toFixed(1)}%`

  return (
    <div
      className="flex flex-col items-center"
      role="meter"
      aria-label={`Deal Gap ${gapText}, ${tier.label}`}
      aria-valuenow={absGap}
      aria-valuemin={0}
      aria-valuemax={GAUGE_MAX}
    >
      <svg viewBox="0 0 100 52" className="w-[68px] h-[36px]">
        {/* Track */}
        <path d={arcD} fill="none" stroke="var(--border-subtle)" strokeWidth={GAUGE_SW} strokeLinecap="round" />
        {/* Progress */}
        <path
          d={arcD}
          fill="none"
          stroke={tier.color}
          strokeWidth={GAUGE_SW}
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
        {/* Needle */}
        <circle cx={nx} cy={ny} r={4.5} fill={tier.color} stroke="var(--surface-card)" strokeWidth={2} className="transition-all duration-500" />
      </svg>
      <span className="text-sm font-bold leading-tight" style={{ color: tier.color }}>
        {gapText}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {tier.label}
      </span>
    </div>
  )
}

export function VerdictScoreHero({
  score,
  verdictLabel,
  verdictSubtitle,
  dealGap,
  sellerUrgency,
  sellerUrgencyScore,
  marketTemp,
  vacancy,
  confidenceMetrics,
  onShowMethodology,
}: VerdictScoreHeroProps) {
  const scoreColor = getScoreColor(score)
  
  // Calculate stroke dash for the progress ring
  const circumference = 2 * Math.PI * 54 // radius 54
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="border-b" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
      {/* Score Circle Section - Centered */}
      <div className="flex flex-col items-center py-8 px-5">
        {/* Score Circle with Progress Ring */}
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: scoreColor }}>
              {score}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-heading)' }}>/100</span>
          </div>
        </div>

        {/* Verdict Label */}
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
          {verdictLabel}
        </h2>
        
        {/* Verdict Subtitle */}
        <p className="text-sm text-center mb-3" style={{ color: 'var(--text-heading)' }}>
          {verdictSubtitle}
        </p>

        {/* How it works link */}
        <button 
          className="flex items-center gap-1.5 text-xs font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
          style={{ color: 'var(--accent-sky)' }}
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How Verdict IQ Works
        </button>
      </div>

      {/* Quick Stats Row - 4 columns */}
      <div className="grid grid-cols-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        {/* Deal Gap — semicircle gauge */}
        <div className="flex flex-col items-center justify-center py-3 border-r" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-[10px] uppercase tracking-wide font-medium mb-0.5" style={{ color: 'var(--text-heading)' }}>
            Deal Gap
          </span>
          <DealGapGauge dealGap={dealGap} />
        </div>

        {/* Seller Urgency */}
        <div className="flex flex-col items-center py-4 border-r" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
            Seller Urgency
          </span>
          <span className="text-base font-bold" style={{ color: getUrgencyColor(sellerUrgency) }}>
            {sellerUrgency}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {sellerUrgencyScore}/100
          </span>
        </div>

        {/* Market Temp */}
        <div className="flex flex-col items-center py-4 border-r" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
            Market Temp
          </span>
          <span className="text-base font-bold" style={{ color: getMarketTempColor(marketTemp) }}>
            {marketTemp}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {marketTemp === 'Cold' ? "Buyer's" : marketTemp === 'Hot' ? "Seller's" : 'Balanced'}
          </span>
        </div>

        {/* Vacancy */}
        <div className="flex flex-col items-center py-4">
          <span className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
            Vacancy
          </span>
          <span className={`text-base font-bold ${vacancy <= 5 ? 'text-[var(--status-positive)]' : vacancy <= 10 ? 'text-[var(--status-warning)]' : 'text-[var(--status-negative)]'}`}>
            {'<'}{vacancy}%
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {vacancy <= 5 ? 'Healthy' : vacancy <= 10 ? 'Moderate' : 'High'}
          </span>
        </div>
      </div>

      {/* Confidence Metrics Section */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-heading)' }}>
          Confidence Metrics
        </h3>
        
        <div className="space-y-3">
          {/* Deal Probability */}
          <div className="flex items-center gap-3">
            <span className="text-sm w-32" style={{ color: 'var(--text-heading)' }}>Deal Probability</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${confidenceMetrics.dealProbability}%`,
                  backgroundColor: getBarColor(confidenceMetrics.dealProbability)
                }}
              />
            </div>
            <span className="text-sm font-semibold w-12 text-right" style={{ color: getBarColor(confidenceMetrics.dealProbability) }}>
              {confidenceMetrics.dealProbability}%
            </span>
          </div>

          {/* Market Alignment */}
          <div className="flex items-center gap-3">
            <span className="text-sm w-32" style={{ color: 'var(--text-heading)' }}>Market Alignment</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${confidenceMetrics.marketAlignment}%`,
                  backgroundColor: getBarColor(confidenceMetrics.marketAlignment)
                }}
              />
            </div>
            <span className="text-sm font-semibold w-12 text-right" style={{ color: getBarColor(confidenceMetrics.marketAlignment) }}>
              {confidenceMetrics.marketAlignment}%
            </span>
          </div>

          {/* Price Confidence */}
          <div className="flex items-center gap-3">
            <span className="text-sm w-32" style={{ color: 'var(--text-heading)' }}>Price Confidence</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${confidenceMetrics.priceConfidence}%`,
                  backgroundColor: getBarColor(confidenceMetrics.priceConfidence)
                }}
              />
            </div>
            <span className="text-sm font-semibold w-12 text-right" style={{ color: getBarColor(confidenceMetrics.priceConfidence) }}>
              {confidenceMetrics.priceConfidence}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerdictScoreHero
