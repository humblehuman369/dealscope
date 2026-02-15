'use client'

import React from 'react'

type ResultBoxVariant = 'default' | 'highlight' | 'success' | 'warning' | 'danger' | 'teal'
type ResultBoxSize = 'normal' | 'large'

interface ResultBoxProps {
  label: string
  value: string
  variant?: ResultBoxVariant
  size?: ResultBoxSize
}

// DealGapIQ Summary Box Pattern
const variants: Record<ResultBoxVariant, string> = {
  default: 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700',
  highlight: 'bg-teal-600/10 dark:bg-teal-400/10 border-teal-600/20 dark:border-teal-400/20',
  success: 'bg-teal-600/10 dark:bg-teal-400/10 border-teal-600/20 dark:border-teal-400/20',
  teal: 'bg-teal-600/10 dark:bg-teal-400/10 border-teal-600/20 dark:border-teal-400/20',
  warning: 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20 dark:border-amber-400/20',
  danger: 'bg-red-500/10 dark:bg-red-400/10 border-red-500/20 dark:border-red-400/20',
}

const textColors: Record<ResultBoxVariant, string> = {
  default: 'text-navy dark:text-white',
  highlight: 'text-teal-600 dark:text-teal-400',
  success: 'text-teal-600 dark:text-teal-400',
  teal: 'text-teal-600 dark:text-teal-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
}

export function ResultBox({ label, value, variant = 'default', size = 'normal' }: ResultBoxProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${variants[variant]}`}>
      <div className="section-label text-surface-500 dark:text-surface-400 mb-0.5">
        {label}
      </div>
      <div className={`${size === 'large' ? 'text-lg' : 'text-base'} font-bold num ${textColors[variant]}`}>
        {value}
      </div>
    </div>
  )
}
