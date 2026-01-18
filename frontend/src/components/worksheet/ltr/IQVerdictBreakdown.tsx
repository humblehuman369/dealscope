'use client'

import React from 'react'
import { getVerdict, getScoreTextClass } from './verdict'

interface IQFactor {
  label: string
  score: number
  max: number
}

interface Suggestion {
  action: string
  delta: number
}

interface IQVerdictBreakdownProps {
  score: number
  factors: IQFactor[]
  suggestions: Suggestion[]
}

export function IQVerdictBreakdown({ score, factors, suggestions }: IQVerdictBreakdownProps) {
  const verdict = getVerdict(score)
  
  const getBarColor = (factor: IQFactor): string => {
    const ratio = factor.score / factor.max
    if (ratio >= 0.7) return '#10b981'
    if (ratio >= 0.4) return '#f59e0b'
    return '#ef4444'
  }

  const getVerdictDescription = (): string => {
    if (score >= 55) {
      return 'Solid fundamentals with healthy cash flow and returns.'
    } else if (score >= 40) {
      return 'Breakeven territory - analyze further before deciding.'
    }
    return 'Below target thresholds on key metrics.'
  }
  
  return (
    <div className="bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl p-5 shadow-sm dark:shadow-none">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">IQ Verdict Breakdown</h3>
      
      <div className="space-y-3 mb-4">
        {factors.map((factor) => (
          <div key={factor.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">{factor.label}</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {factor.score}/{factor.max}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(factor.score / factor.max) * 100}%`, 
                  backgroundColor: getBarColor(factor) 
                }} 
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This deal scores <strong className={getScoreTextClass(score)}>{verdict}</strong>. {getVerdictDescription()}
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Improve This Deal</div>
        {suggestions.map((sug, i) => (
          <button 
            key={i} 
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 rounded-xl transition-colors border border-slate-200 dark:border-slate-600"
          >
            <span className="text-sm text-slate-700 dark:text-slate-200">{sug.action}</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">+{sug.delta} pts</span>
          </button>
        ))}
      </div>
    </div>
  )
}
