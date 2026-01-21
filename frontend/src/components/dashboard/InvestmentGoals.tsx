'use client'

import { Target } from 'lucide-react'
import Link from 'next/link'

interface Goal {
  label: string
  current: number
  target: number
  unit: '' | '$' | 'M' | '%'
}

interface InvestmentGoalsProps {
  goals: Goal[]
  isLoading?: boolean
}

export function InvestmentGoals({ goals, isLoading }: InvestmentGoalsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 dark:bg-navy-700 rounded w-32"></div>
          <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-10"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-28"></div>
                <div className="h-3 bg-gray-200 dark:bg-navy-700 rounded w-16"></div>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-navy-700 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const formatValue = (value: number, unit: string): string => {
    if (unit === '$') return `$${value.toLocaleString()}`
    if (unit === 'M') return `$${value}M`
    if (unit === '%') return `${value}%`
    return value.toString()
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-100 dark:border-navy-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-teal-500 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Investment Goals</h3>
        </div>
        <Link 
          href="/profile"
          className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300"
        >
          Edit
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="py-6 text-center">
          <Target className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No goals set yet</p>
          <Link 
            href="/profile"
            className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700"
          >
            Set your goals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100)
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{goal.label}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 dark:bg-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
