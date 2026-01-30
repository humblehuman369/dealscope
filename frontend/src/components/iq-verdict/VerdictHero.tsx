'use client'

/**
 * VerdictHero Component
 * 
 * Displays the score circle, verdict label, and key opportunity factors.
 * Part of the combined VerdictIQ page.
 */

import React from 'react'
import { TrendingDown, Settings2, Info } from 'lucide-react'
import { formatPrice } from './types'

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
    <div className="bg-white p-5 px-6 border-b border-[#E2E8F0] flex items-center gap-4">
      {/* Score Circle */}
      <div 
        className="w-[72px] h-[72px] rounded-full border-4 flex items-center justify-center flex-shrink-0"
        style={{ 
          borderColor: scoreColor,
          background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' 
        }}
      >
        <span className="text-[28px] font-extrabold" style={{ color: scoreColor }}>
          {dealScore}
        </span>
      </div>
      
      {/* Verdict Details */}
      <div className="flex-1">
        <div className="text-lg font-bold text-[#0891B2] mb-0.5">{verdictLabel}</div>
        <div className="text-[13px] text-[#64748B] mb-2">{verdictSublabel}</div>
        
        {/* Gap & Motivation Pills */}
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
            <TrendingDown className="w-3 h-3 text-[#94A3B8]" />
            Gap: <span className="font-semibold text-[#0891B2]">
              {dealGap > 0 ? '-' : '+'}{Math.abs(dealGap).toFixed(1)}%
            </span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
            <Settings2 className="w-3 h-3 text-[#94A3B8]" />
            Motivation: <span className="font-semibold text-[#0891B2]">{motivationLevel}</span>
          </span>
        </div>
        
        {/* How We Score Link */}
        <button 
          className="flex items-center gap-1 text-[#0891B2] text-xs font-medium mt-1 bg-transparent border-none cursor-pointer p-0 hover:opacity-80 transition-opacity"
          onClick={onShowMethodology}
        >
          <Info className="w-3.5 h-3.5" />
          How we score
        </button>
      </div>
    </div>
  )
}

export default VerdictHero
