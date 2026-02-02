'use client'

/**
 * VerdictHero Component
 * 
 * Displays the verdict badge with key opportunity factors.
 * Redesigned layout: Oval Badge | Key Metrics | Info Links
 */

import React from 'react'

interface VerdictHeroProps {
  dealScore: number
  verdictLabel: string
  verdictSublabel: string
  dealGap: number
  motivationLevel: string
  motivationScore: number
  onShowMethodology: () => void
  // Optional additional metrics
  marketTemperature?: 'Hot' | 'Warm' | 'Neutral' | 'Cool' | 'Cold'
  vacancyRate?: number
}

// Get verdict label color based on score tier
const getVerdictColor = (score: number): string => {
  if (score >= 80) return '#10B981' // green
  if (score >= 65) return '#0891B2' // teal
  if (score >= 50) return '#F59E0B' // warning
  return '#E11D48' // rose
}

// Get motivation color
const getMotivationColor = (level: string): string => {
  if (level === 'High' || level === 'Very High') return '#10B981'
  if (level === 'Medium') return '#F59E0B'
  return '#64748B'
}

// Get market temperature color
const getMarketTempColor = (temp?: string): string => {
  if (temp === 'Hot') return '#EF4444'
  if (temp === 'Warm') return '#F59E0B'
  if (temp === 'Cool') return '#0891B2'
  if (temp === 'Cold') return '#3B82F6'
  return '#64748B'
}

// Get vacancy health label and color
const getVacancyHealth = (rate?: number): { label: string; color: string } => {
  if (rate === undefined) return { label: 'Unknown', color: '#64748B' }
  if (rate < 5) return { label: '<5% Health', color: '#0891B2' }
  if (rate < 8) return { label: 'Normal', color: '#10B981' }
  if (rate < 12) return { label: 'Elevated', color: '#F59E0B' }
  return { label: 'High Risk', color: '#EF4444' }
}

// Get gap achievability label
const getGapAchievability = (gap: number): string => {
  const absGap = Math.abs(gap)
  if (absGap <= 5) return 'Likely achievable'
  if (absGap <= 10) return 'Negotiable'
  if (absGap <= 15) return 'Aggressive'
  return 'Stretch'
}

export function VerdictHero({
  dealScore,
  verdictLabel,
  verdictSublabel,
  dealGap,
  motivationLevel,
  motivationScore,
  onShowMethodology,
  marketTemperature = 'Warm',
  vacancyRate = 4,
}: VerdictHeroProps) {
  const verdictColor = getVerdictColor(dealScore)
  const vacancyHealth = getVacancyHealth(vacancyRate)
  
  return (
    <div className="bg-white py-5 px-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
      {/* Group 1: Oval Verdict Badge */}
      <div 
        className="flex flex-col items-center justify-center px-6 py-3 border-2 rounded-full flex-shrink-0"
        style={{ borderColor: verdictColor }}
      >
        <span 
          className="text-lg font-extrabold uppercase tracking-wide leading-tight"
          style={{ color: verdictColor }}
        >
          {verdictLabel.split(' ')[0]}
        </span>
        <span className="text-xs text-[#64748B] font-medium">
          {verdictSublabel || 'Opportunity'}
        </span>
      </div>

      {/* Group 2: Key Metrics */}
      <div className="flex flex-col gap-1.5 text-[13px] flex-1">
        {/* Deal Gap */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] font-medium">Deal Gap:</span>
          <span className="font-bold text-[#0891B2]">
            {dealGap > 0 ? '-' : ''}{Math.abs(dealGap).toFixed(1)}%
          </span>
          <span className="text-[#64748B]">{getGapAchievability(dealGap)}</span>
        </div>
        
        {/* Seller Urgency */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] font-medium">Seller Urgency:</span>
          <span 
            className="font-bold"
            style={{ color: getMotivationColor(motivationLevel) }}
          >
            {motivationLevel}
          </span>
        </div>
        
        {/* Market Temperature */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] font-medium">MarketTemperature:</span>
          <span 
            className="font-bold"
            style={{ color: getMarketTempColor(marketTemperature) }}
          >
            {marketTemperature}
          </span>
        </div>
        
        {/* Vacancy Rate */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#475569] font-medium">Vacancy Rate:</span>
          <span 
            className="font-bold"
            style={{ color: vacancyHealth.color }}
          >
            {vacancyHealth.label}
          </span>
        </div>
      </div>

      {/* Group 3: Info Links */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button 
          className="flex items-center gap-1.5 text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer p-0 hover:opacity-75 transition-opacity"
          onClick={onShowMethodology}
        >
          <span className="text-[#0891B2]">•</span>
          How VerdictIQ Works
        </button>
        <button 
          className="flex items-center gap-1.5 text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer p-0 hover:opacity-75 transition-opacity"
          onClick={onShowMethodology}
        >
          <span className="text-[#0891B2]">•</span>
          How We Score
        </button>
      </div>
    </div>
  )
}

export default VerdictHero
