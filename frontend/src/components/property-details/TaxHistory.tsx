'use client'

import { TaxHistoryItem } from './types'
import { formatCurrency } from './utils'

interface TaxHistoryProps {
  history: TaxHistoryItem[]
}

/**
 * TaxHistory Component
 * 
 * Table display of property tax history including assessed values,
 * land values, and improvement values.
 */
export function TaxHistory({ history }: TaxHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
        <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
          Tax History
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No tax history available
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Tax History
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="text-left py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Year
              </th>
              <th className="text-right py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Tax Paid
              </th>
              <th className="text-right py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Assessed Value
              </th>
              <th className="text-right py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Land
              </th>
              <th className="text-right py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Improvements
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                <td className="py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {item.year}
                </td>
                <td className="py-3 text-sm font-semibold text-red-500 text-right tabular-nums">
                  {formatCurrency(item.taxPaid)}
                </td>
                <td className="py-3 text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums">
                  {formatCurrency(item.assessedValue)}
                </td>
                <td className="py-3 text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums">
                  {item.landValue ? formatCurrency(item.landValue) : 'N/A'}
                </td>
                <td className="py-3 text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums">
                  {item.improvementValue ? formatCurrency(item.improvementValue) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * TaxHistorySkeleton
 * Loading state for the tax history
 */
export function TaxHistorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
