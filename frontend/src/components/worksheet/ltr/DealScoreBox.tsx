'use client'

import React from 'react'
import { getVerdict, getScoreTextClass, getScoreBgClass } from './verdict'

interface DealScoreBoxProps {
  score: number
}

export function DealScoreBox({ score }: DealScoreBoxProps) {
  const verdict = getVerdict(score)
  
  return (
    <div className={`border rounded-lg px-3 py-2 flex-1 min-w-[90px] transition-all duration-500 ${getScoreBgClass(score)}`}>
      <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
        Deal Score
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-base font-bold ${getScoreTextClass(score)}`}>
          {Math.round(score)}
        </span>
        <span className={`text-[9px] uppercase tracking-wider font-semibold ${getScoreTextClass(score)}`}>
          {verdict}
        </span>
      </div>
    </div>
  )
}
