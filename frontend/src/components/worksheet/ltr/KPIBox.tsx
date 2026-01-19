'use client'

import React from 'react'

type KPIBoxVariant = 'teal' | 'navy' | 'neutral' | 'danger'

interface KPIBoxProps {
  label: string
  value: string
  variant?: KPIBoxVariant
}

const variantStyles: Record<KPIBoxVariant, { bg: string; text: string }> = {
  teal: {
    bg: 'bg-teal-600/[0.15] dark:bg-teal-400/[0.15]',
    text: 'text-teal-600 dark:text-teal-400'
  },
  navy: {
    bg: 'bg-[rgba(10,22,40,0.08)] dark:bg-white/[0.08]',
    text: 'text-navy dark:text-white'
  },
  neutral: {
    bg: 'bg-surface-100 dark:bg-surface-800',
    text: 'text-navy dark:text-white'
  },
  danger: {
    bg: 'bg-red-500/[0.12] dark:bg-red-500/[0.15]',
    text: 'text-red-600 dark:text-red-400'
  }
}

export function KPIBox({ label, value, variant = 'neutral' }: KPIBoxProps) {
  const styles = variantStyles[variant]
  
  return (
    <div className={`rounded-lg p-3 text-center flex-1 min-w-[90px] ${styles.bg}`}>
      <div className="text-[8px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-sm font-bold num whitespace-nowrap ${styles.text}`}>
        {value}
      </div>
    </div>
  )
}
