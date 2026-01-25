'use client'

import React from 'react'

/**
 * DealMakerBadges - Two circular score badges for Deal Score and Profit Quality
 * Displays prominently at the top of the worksheet panel
 */

interface DealMakerBadgesProps {
  dealScore: number
  profitQualityScore: number // Based on Cash-on-Cash return
  className?: string
}

export function DealMakerBadges({ dealScore, profitQualityScore, className = '' }: DealMakerBadgesProps) {
  return (
    <div className={`flex items-center justify-center gap-6 py-4 ${className}`}>
      <ScoreBadge
        type="dealScore"
        score={dealScore}
        label="DEAL SCORE"
      />
      <ScoreBadge
        type="profitQuality"
        score={profitQualityScore}
        label="Profit Quality"
      />
    </div>
  )
}

// =============================================================================
// SCORE BADGE
// =============================================================================

interface ScoreBadgeProps {
  type: 'dealScore' | 'profitQuality'
  score: number
  label: string
}

function ScoreBadge({ type, score, label }: ScoreBadgeProps) {
  const isScoreType = type === 'dealScore'
  const displayValue = isScoreType ? score : getGrade(score)
  const color = getScoreColor(score)
  
  // SVG ring parameters
  const size = 72
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  
  return (
    <div className="flex flex-col items-center">
      {/* Circular badge with ring */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Ring */}
        <svg 
          className="transform -rotate-90" 
          width={size} 
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-slate-200"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ 
              transition: 'stroke-dashoffset 0.5s ease-out',
              filter: `drop-shadow(0 0 4px ${color}40)`
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-2xl font-extrabold"
            style={{ color }}
          >
            {displayValue}
          </span>
        </div>
      </div>
      
      {/* Label below */}
      <span className="mt-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center whitespace-pre-line leading-tight">
        {label.replace(' ', '\n')}
      </span>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 85) return '#22c55e' // green-500
  if (score >= 70) return '#84cc16' // lime-500
  if (score >= 55) return '#f59e0b' // amber-500
  if (score >= 40) return '#f97316' // orange-500
  return '#ef4444' // red-500
}

function getGrade(score: number): string {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

export default DealMakerBadges
