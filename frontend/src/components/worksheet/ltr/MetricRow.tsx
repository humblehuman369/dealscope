'use client'

import React from 'react'

interface MetricRowProps {
  label: string
  value: string
  good?: boolean
  threshold?: string
}

export function MetricRow({ label, value, good, threshold }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {threshold && (
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
            {threshold}
          </span>
        )}
        <span className="font-bold text-slate-900 dark:text-white min-w-[70px] text-right">
          {value}
        </span>
        {good !== undefined && (
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            good 
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {good ? '\u2713' : '!'}
          </span>
        )}
      </div>
    </div>
  )
}
