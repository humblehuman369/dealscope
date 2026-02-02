'use client'

/**
 * VerdictHero Component
 * 
 * Displays the score circle, verdict label, and key opportunity factors.
 * Redesigned with full-width row layout: Score+Title | Gap+Motivation | Links
 */

import React from 'react'
import { Info } from 'lucide-react'

interface VerdictHeroProps {
  dealScore: number
  verdictLabel: string
  verdictSublabel: string
  dealGap: number
  motivationLevel: string
  motivationScore: number
  onShowMethodology: () => void
}

// Get score color based on score tier
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981' // green
  if (score >= 65) return '#0891B2' // teal
  if (score >= 50) return '#F59E0B' // warning
  return '#E11D48' // rose
}

export function VerdictHero({
  dealScore,
  verdictLabel,
  verdictSublabel,
  dealGap,
  motivationLevel,
  motivationScore,
  onShowMethodology,
}: VerdictHeroProps) {
  const scoreColor = getScoreColor(dealScore)
  
  return (
    <div className="bg-white py-4 px-5 border-b border-[#E2E8F0] flex items-center justify-between gap-5">
      {/* Group 1: Score + Title */}
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div 
          className="w-[56px] h-[56px] rounded-full border-[3px] flex items-center justify-center flex-shrink-0"
          style={{ 
            borderColor: scoreColor,
            background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' 
          }}
        >
          <span className="text-[20px] font-extrabold" style={{ color: scoreColor }}>
            {dealScore}
          </span>
        </div>
        
        {/* Title & Subtitle */}
        <div className="flex flex-col">
          <div className="text-lg font-bold text-[#0891B2]">{verdictLabel}</div>
          <div className="text-[13px] text-[#64748B]">{verdictSublabel}</div>
        </div>
      </div>

      {/* Group 2: Gap & Motivation (stacked) */}
      <div className="flex flex-col gap-0.5 text-[13px] text-[#64748B]">
        <div className="flex items-center gap-1">
          <span>Gap:</span>
          <span className="font-semibold text-[#0891B2]">
            {dealGap > 0 ? '-' : '+'}{Math.abs(dealGap).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>Motivation:</span>
          <span className="font-semibold text-[#F59E0B]">{motivationLevel}</span>
        </div>
      </div>

      {/* Group 3: Links (stacked, right-aligned) */}
      <div className="flex flex-col items-end gap-1">
        <button 
          className="flex items-center gap-1 text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer p-0 hover:opacity-75 transition-opacity"
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How Verdict IQ Works
        </button>
        <button 
          className="flex items-center gap-1 text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer p-0 hover:opacity-75 transition-opacity"
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How We Score
        </button>
      </div>
    </div>
  )
}

export default VerdictHero
