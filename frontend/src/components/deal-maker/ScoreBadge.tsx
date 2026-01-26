/**
 * ScoreBadge - Premium circular score/grade badge component
 * Features: Gradient rings, glow effects, softer color treatment
 */

'use client'

import React from 'react'
import { ScoreBadgeProps, DealGrade, ProfitGrade } from './types'

// =============================================================================
// GRADE COLORS - Softer palette that's less harsh
// =============================================================================

export function getGradeColors(grade: DealGrade | ProfitGrade): { primary: string; glow: string; bg: string } {
  switch (grade) {
    case 'A+':
      return { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.15)' }
    case 'A':
      return { primary: '#4ade80', glow: 'rgba(74, 222, 128, 0.35)', bg: 'rgba(74, 222, 128, 0.12)' }
    case 'B':
      return { primary: '#a3e635', glow: 'rgba(163, 230, 53, 0.35)', bg: 'rgba(163, 230, 53, 0.12)' }
    case 'C':
      return { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.35)', bg: 'rgba(251, 191, 36, 0.12)' }
    case 'D':
      return { primary: '#fb923c', glow: 'rgba(251, 146, 60, 0.3)', bg: 'rgba(251, 146, 60, 0.1)' }
    case 'F':
      return { primary: '#f87171', glow: 'rgba(248, 113, 113, 0.25)', bg: 'rgba(248, 113, 113, 0.08)' }
    default:
      return { primary: '#94a3b8', glow: 'rgba(148, 163, 184, 0.2)', bg: 'rgba(148, 163, 184, 0.1)' }
  }
}

export function getScoreColors(score: number): { primary: string; glow: string; bg: string } {
  if (score >= 85) return { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.15)' }
  if (score >= 70) return { primary: '#4ade80', glow: 'rgba(74, 222, 128, 0.35)', bg: 'rgba(74, 222, 128, 0.12)' }
  if (score >= 55) return { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.35)', bg: 'rgba(251, 191, 36, 0.12)' }
  if (score >= 40) return { primary: '#fb923c', glow: 'rgba(251, 146, 60, 0.3)', bg: 'rgba(251, 146, 60, 0.1)' }
  if (score >= 25) return { primary: '#f87171', glow: 'rgba(248, 113, 113, 0.25)', bg: 'rgba(248, 113, 113, 0.08)' }
  // Very low scores - muted red instead of harsh red
  return { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', bg: 'rgba(239, 68, 68, 0.06)' }
}

export function getScoreGrade(score: number): DealGrade {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

// Legacy exports for compatibility
export function getGradeColor(grade: DealGrade | ProfitGrade): string {
  return getGradeColors(grade).primary
}

export function getScoreColor(score: number): string {
  return getScoreColors(score).primary
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const SIZES = {
  small: { outer: 48, border: 2.5, fontSize: 15, labelSize: 8, gap: 2 },
  medium: { outer: 56, border: 3, fontSize: 18, labelSize: 9, gap: 3 },
  large: { outer: 72, border: 3.5, fontSize: 24, labelSize: 11, gap: 4 },
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ScoreBadge({
  type,
  score,
  grade,
  size = 'medium',
}: ScoreBadgeProps) {
  const sizeConfig = SIZES[size]
  const { outer, border, fontSize, labelSize, gap } = sizeConfig

  // Determine display value and colors
  const isScoreType = type === 'dealScore'
  const displayValue = isScoreType ? (score ?? 0) : (grade ?? 'B')
  const colors = isScoreType 
    ? getScoreColors(score ?? 0)
    : getGradeColors(grade ?? 'B')
  
  const label = isScoreType ? 'DEAL SCORE' : 'PROFIT QUALITY'

  return (
    <div className="flex flex-col items-center">
      {/* Circular badge with glow effect */}
      <div 
        className="relative flex items-center justify-center transition-all duration-300"
        style={{ 
          width: outer, 
          height: outer, 
          borderRadius: outer / 2,
          background: colors.bg,
          boxShadow: `0 0 ${outer / 4}px ${colors.glow}, inset 0 0 ${outer / 6}px ${colors.glow}`,
        }}
      >
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            border: `${border}px solid ${colors.primary}`,
            opacity: 0.9,
          }}
        />
        
        {/* Score/Grade value */}
        <span 
          className="font-extrabold text-center relative z-10"
          style={{ 
            fontSize, 
            color: colors.primary,
            textShadow: `0 0 8px ${colors.glow}`,
          }}
        >
          {displayValue}
        </span>
      </div>

      {/* Label below */}
      <span 
        className="text-white/50 font-semibold text-center uppercase tracking-wider"
        style={{ 
          fontSize: labelSize,
          marginTop: gap,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default ScoreBadge
