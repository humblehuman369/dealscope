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
    <div className="flex items-center justify-between py-2.5 border-b border-surface-100 dark:border-surface-700 last:border-0">
      <span className="text-sm text-surface-500 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        {/* Value with optional target display (DealGapIQ style) */}
        <span className={`text-sm font-semibold num ${
          good === true 
            ? 'text-teal-600 dark:text-teal-400' 
            : good === false 
              ? 'text-navy dark:text-white' 
              : 'text-navy dark:text-white'
        }`}>
          {value}
        </span>
        {threshold && (
          <span className="text-[10px] text-surface-400">
            / {threshold}
          </span>
        )}
      </div>
    </div>
  )
}
