'use client'

import React from 'react'
import { getVerdict, getScoreTextClass, getScoreBgClass } from './verdict'

interface DealScoreBoxProps {
  score: number
}

export function DealScoreBox({ score }: DealScoreBoxProps) {
  const verdict = getVerdict(score)
  const isPositive = score >= 55
  
  return (
    <div className={`rounded-lg p-3 text-center flex-1 min-w-[90px] transition-all duration-300 ${
      isPositive 
        ? 'bg-teal-600/[0.15] dark:bg-teal-400/[0.15]' 
        : 'bg-surface-100 dark:bg-surface-800'
    }`}>
      <div className="text-[8px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        Deal Score
      </div>
      <div className={`text-sm font-bold num ${
        isPositive 
          ? 'text-teal-600 dark:text-teal-400' 
          : 'text-navy dark:text-white'
      }`}>
        {Math.round(score)}
      </div>
    </div>
  )
}
