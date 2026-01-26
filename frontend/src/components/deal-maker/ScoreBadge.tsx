/**
 * ScoreBadge - Circular score/grade badge component for Deal Maker header
 * Displays either a numeric score (0-100) or a letter grade (A+, A, B, C, D, F)
 */

'use client'

import React from 'react'
import { ScoreBadgeProps, DealGrade, ProfitGrade } from './types'

// =============================================================================
// GRADE COLORS
// =============================================================================

export function getGradeColor(grade: DealGrade | ProfitGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e' // green-500
    case 'B':
      return '#84cc16' // lime-500
    case 'C':
      return '#f59e0b' // amber-500
    case 'D':
      return '#f97316' // orange-500
    case 'F':
      return '#ef4444' // red-500
    default:
      return '#94a3b8' // slate-400
  }
}

export function getScoreColor(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#84cc16'
  if (score >= 55) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function getScoreGrade(score: number): DealGrade {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const SIZES = {
  small: { outer: 50, border: 3, fontSize: 16, labelSize: 8 },
  medium: { outer: 64, border: 3, fontSize: 20, labelSize: 9 },
  large: { outer: 80, border: 4, fontSize: 26, labelSize: 11 },
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
  const { outer, border, fontSize, labelSize } = sizeConfig

  // Determine display value and color
  const isScoreType = type === 'dealScore'
  const displayValue = isScoreType ? (score ?? 0) : (grade ?? 'B')
  const accentColor = isScoreType 
    ? getScoreColor(score ?? 0)
    : getGradeColor(grade ?? 'B')
  
  const label = isScoreType ? 'DEAL\nSCORE' : 'Profit\nQuality'

  return (
    <div className="flex flex-col items-center">
      {/* Circular badge */}
      <div 
        className="flex items-center justify-center bg-white/5"
        style={{ 
          width: outer, 
          height: outer, 
          borderRadius: outer / 2,
          borderWidth: border,
          borderStyle: 'solid',
          borderColor: accentColor,
        }}
      >
        <span 
          className="font-extrabold text-center"
          style={{ fontSize, color: accentColor }}
        >
          {displayValue}
        </span>
      </div>

      {/* Label below */}
      <span 
        className="text-white/60 font-semibold text-center mt-1 whitespace-pre-line leading-tight"
        style={{ fontSize: labelSize }}
      >
        {label}
      </span>
    </div>
  )
}

export default ScoreBadge
