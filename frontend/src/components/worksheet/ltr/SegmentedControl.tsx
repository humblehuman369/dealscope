'use client'

import React from 'react'

interface SegmentedControlOption {
  value: number | string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: number | string
  onChange: (value: number | string) => void
  label?: string
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm text-slate-700 dark:text-slate-200 font-medium">{label}</label>
      )}
      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
        {options.map((opt) => (
          <button 
            key={opt.value} 
            onClick={() => onChange(opt.value)} 
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
              value === opt.value 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
