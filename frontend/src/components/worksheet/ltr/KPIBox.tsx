'use client'

import React from 'react'

interface KPIBoxProps {
  label: string
  value: string
}

export function KPIBox({ label, value }: KPIBoxProps) {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex-1 min-w-[90px]">
      <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
        {label}
      </div>
      <div className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">
        {value}
      </div>
    </div>
  )
}
