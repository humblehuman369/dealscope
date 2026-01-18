'use client'

import React from 'react'

type ResultBoxVariant = 'default' | 'highlight' | 'success' | 'warning' | 'danger'
type ResultBoxSize = 'normal' | 'large'

interface ResultBoxProps {
  label: string
  value: string
  variant?: ResultBoxVariant
  size?: ResultBoxSize
}

const variants: Record<ResultBoxVariant, string> = {
  default: 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600',
  highlight: 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/40',
  success: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40',
  warning: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/40',
  danger: 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/40',
}

const textColors: Record<ResultBoxVariant, string> = {
  default: 'text-slate-900 dark:text-white',
  highlight: 'text-cyan-700 dark:text-cyan-400',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-red-700 dark:text-red-400',
}

export function ResultBox({ label, value, variant = 'default', size = 'normal' }: ResultBoxProps) {
  return (
    <div className={`rounded-xl p-3 border ${variants[variant]}`}>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className={`${size === 'large' ? 'text-xl' : 'text-lg'} font-bold ${textColors[variant]}`}>
        {value}
      </div>
    </div>
  )
}
