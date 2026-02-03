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
function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981' // green
  if (score >= 65) return '#0891B2' // teal
  if (score >= 50) return '#F59E0B' // amber
  return '#E11D48' // rose
}

// Get urgency color
function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'high': return '#10B981'
    case 'medium': return '#D97706'
    case 'low': return '#64748B'
    default: return '#64748B'
  }
}

// Get market temp color
function getMarketTempColor(temp: string): string {
  switch (temp.toLowerCase()) {
    case 'cold': return '#0891B2'
    case 'warm': return '#D97706'
    case 'hot': return '#E11D48'
    default: return '#64748B'
  }
}

// Get bar color for confidence metrics
function getBarColor(value: number): string {
  if (value >= 80) return '#10B981'
  if (value >= 60) return '#0891B2'
  if (value >= 40) return '#F59E0B'
  return '#E11D48'
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
    <div className="bg-white border-b border-[#E2E8F0]">
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
              stroke="#E2E8F0"
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
            <span className="text-xs text-[#94A3B8] font-medium">/100</span>
          </div>
        </div>

        {/* Verdict Label */}
        <h2 className="text-xl font-bold text-[#0A1628] mb-1">
          {verdictLabel}
        </h2>
        
        {/* Verdict Subtitle */}
        <p className="text-sm text-[#64748B] text-center mb-3">
          {verdictSubtitle}
        </p>

        {/* How it works link */}
        <button 
          className="flex items-center gap-1.5 text-[#0891B2] text-xs font-medium bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity"
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How Verdict IQ Works
        </button>
      </div>

      {/* Quick Stats Row - 4 columns */}
      <div className="grid grid-cols-4 border-t border-[#E2E8F0]">
        {/* Deal Gap */}
        <div className="flex flex-col items-center py-4 border-r border-[#E2E8F0]">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium mb-1">
            Deal Gap
          </span>
          <span className={`text-base font-bold ${dealGap <= 0 ? 'text-[#10B981]' : 'text-[#D97706]'}`}>
            {dealGap > 0 ? '-' : '+'}{Math.abs(dealGap).toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            {dealGap <= 10 ? 'Achievable' : dealGap <= 20 ? 'Stretch' : 'Difficult'}
          </span>
        </div>

        {/* Seller Urgency */}
        <div className="flex flex-col items-center py-4 border-r border-[#E2E8F0]">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium mb-1">
            Seller Urgency
          </span>
          <span className="text-base font-bold" style={{ color: getUrgencyColor(sellerUrgency) }}>
            {sellerUrgency}
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            {sellerUrgencyScore}/100
          </span>
        </div>

        {/* Market Temp */}
        <div className="flex flex-col items-center py-4 border-r border-[#E2E8F0]">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium mb-1">
            Market Temp
          </span>
          <span className="text-base font-bold" style={{ color: getMarketTempColor(marketTemp) }}>
            {marketTemp}
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            {marketTemp === 'Cold' ? "Buyer's" : marketTemp === 'Hot' ? "Seller's" : 'Balanced'}
          </span>
        </div>

        {/* Vacancy */}
        <div className="flex flex-col items-center py-4">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium mb-1">
            Vacancy
          </span>
          <span className={`text-base font-bold ${vacancy <= 5 ? 'text-[#10B981]' : vacancy <= 10 ? 'text-[#D97706]' : 'text-[#E11D48]'}`}>
            {'<'}{vacancy}%
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            {vacancy <= 5 ? 'Healthy' : vacancy <= 10 ? 'Moderate' : 'High'}
          </span>
        </div>
      </div>

      {/* Confidence Metrics Section */}
      <div className="px-5 py-4 border-t border-[#E2E8F0]">
        <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
          Confidence Metrics
        </h3>
        
        <div className="space-y-3">
          {/* Deal Probability */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#475569] w-32">Deal Probability</span>
            <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
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
            <span className="text-sm text-[#475569] w-32">Market Alignment</span>
            <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
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
            <span className="text-sm text-[#475569] w-32">Price Confidence</span>
            <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
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
