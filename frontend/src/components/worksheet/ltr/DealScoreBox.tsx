'use client'

import React from 'react'
import { scoreToGradeLabel, getGradeBgClass, getGradeTextClass } from '@/components/iq-verdict/types'

interface DealScoreBoxProps {
  score: number
  /** If true, shows just the grade (compact); if false, shows grade + label */
  compact?: boolean
}

/**
 * DealScoreBox - Displays deal score as a grade (A+, A, B, etc.) instead of numeric
 * 
 * This avoids confusion with percentages and provides clearer meaning:
 * - A+/STRONG: 85-100
 * - A/GOOD: 70-84
 * - B/MODERATE: 55-69
 * - C/POTENTIAL: 40-54
 * - D/WEAK: 25-39
 * - F/POOR: 0-24
 */
export function DealScoreBox({ score, compact = false }: DealScoreBoxProps) {
  const display = scoreToGradeLabel(score)
  
  return (
    <div className={`rounded-lg p-3 text-center flex-1 min-w-[90px] transition-all duration-300 border ${getGradeBgClass(display.grade)}`}>
      <div className="text-[8px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        Deal Score
      </div>
      {compact ? (
        <div className={`text-lg font-bold ${getGradeTextClass(display.grade)}`}>
          {display.grade}
        </div>
      ) : (
        <>
          <div className={`text-xs font-semibold ${getGradeTextClass(display.grade)}`}>
            {display.label}
          </div>
          <div className={`text-lg font-bold ${getGradeTextClass(display.grade)}`}>
            {display.grade}
          </div>
        </>
      )}
    </div>
  )
}
