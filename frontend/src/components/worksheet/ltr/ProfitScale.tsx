'use client'

import React from 'react'

interface ProfitScaleProps {
  grossRent: number
  vacancy: number
  expenses: number
  mortgage: number
  cashFlow: number
}

interface Segment {
  label: string
  value: number
  color: string
  type: 'income' | 'deduction'
}

export function ProfitScale({ grossRent, vacancy, expenses, mortgage, cashFlow }: ProfitScaleProps) {
  const total = grossRent
  const scale = (v: number) => Math.max(0, (v / total) * 100)
  
  const segments: Segment[] = [
    { label: 'Gross Rent', value: grossRent, color: '#10b981', type: 'income' },
    { label: 'Vacancy', value: vacancy, color: '#f59e0b', type: 'deduction' },
    { label: 'Operating Expenses', value: expenses, color: '#f97316', type: 'deduction' },
    { label: 'Mortgage (P&I)', value: mortgage, color: '#ef4444', type: 'deduction' },
  ]
  
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm dark:shadow-none">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
        <span>Profit Scale</span>
        <span className="text-xs text-slate-500 font-normal">Monthly</span>
      </h3>
      
      <div className="space-y-3 mb-4">
        {segments.map((seg) => (
          <div key={seg.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300 font-medium">{seg.label}</span>
              <span className={seg.type === 'income' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                {seg.type === 'income' ? '+' : '-'}${Math.round(seg.value).toLocaleString()}
              </span>
            </div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
              <div 
                className="h-full rounded-lg transition-all duration-500" 
                style={{ width: `${scale(seg.value)}%`, backgroundColor: seg.color }} 
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className={`p-4 rounded-xl border-2 ${
        cashFlow >= 0 
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
          : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <div className={`text-sm font-semibold ${
              cashFlow >= 0 
                ? 'text-emerald-700 dark:text-emerald-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              Net Cash Flow
            </div>
            <div className="text-xs text-slate-500">
              ${(cashFlow * 12).toLocaleString()}/year
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            cashFlow >= 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            ${Math.round(cashFlow).toLocaleString()}<span className="text-base">/mo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
