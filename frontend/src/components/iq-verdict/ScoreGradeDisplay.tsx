'use client'

import React from 'react'
import { ScoreDisplay, ScoreGrade, ScoreLabel, getGradeColor } from './types'

interface ScoreGradeDisplayProps {
  display: ScoreDisplay
  title: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * ScoreGradeDisplay Component
 * 
 * Displays a score as a label + letter grade instead of a numeric value.
 * This avoids confusion with percentages and provides clearer meaning.
 * 
 * Layout:
 * ┌─────────────┐
 * │  OPPORTUNITY│  (title)
 * │    STRONG   │  (label)
 * │     A+      │  (grade)
 * └─────────────┘
 */
export function ScoreGradeDisplay({ 
  display, 
  title,
  size = 'md',
  className = '' 
}: ScoreGradeDisplayProps) {
  const gradeColor = display.color || getGradeColor(display.grade)
  
  // Size variants
  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-[10px]',
      label: 'text-lg',
      grade: 'text-2xl',
    },
    md: {
      container: 'p-4',
      title: 'text-xs',
      label: 'text-xl',
      grade: 'text-3xl',
    },
    lg: {
      container: 'p-5',
      title: 'text-sm',
      label: 'text-2xl',
      grade: 'text-4xl',
    },
  }
  
  const sizes = sizeClasses[size]
  
  // Get background class based on grade
  const getBgClass = (grade: ScoreGrade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-500/10 border-green-500/30'
      case 'B':
        return 'bg-lime-500/10 border-lime-500/30'
      case 'C':
      case 'D':
        return 'bg-orange-500/10 border-orange-500/30'
      case 'F':
        return 'bg-red-500/10 border-red-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  return (
    <div 
      className={`
        flex flex-col items-center justify-center text-center
        rounded-xl border
        ${getBgClass(display.grade)}
        ${sizes.container}
        ${className}
      `}
    >
      {/* Title */}
      <p className={`
        font-semibold uppercase tracking-wider
        text-gray-500 dark:text-gray-400
        ${sizes.title}
      `}>
        {title}
      </p>
      
      {/* Label */}
      <p 
        className={`
          font-bold mt-1
          ${sizes.label}
        `}
        style={{ color: gradeColor }}
      >
        {display.label}
      </p>
      
      {/* Grade */}
      <p 
        className={`
          font-extrabold
          ${sizes.grade}
        `}
        style={{ color: gradeColor }}
      >
        {display.grade}
      </p>
    </div>
  )
}

/**
 * Compact inline version for use in lists/cards
 */
export function ScoreGradeInline({ 
  display, 
  showLabel = true,
  className = '' 
}: { 
  display: ScoreDisplay
  showLabel?: boolean
  className?: string 
}) {
  const gradeColor = display.color || getGradeColor(display.grade)
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span 
          className="text-sm font-semibold"
          style={{ color: gradeColor }}
        >
          {display.label}
        </span>
      )}
      <span 
        className="text-lg font-bold"
        style={{ color: gradeColor }}
      >
        {display.grade}
      </span>
    </div>
  )
}

export default ScoreGradeDisplay
