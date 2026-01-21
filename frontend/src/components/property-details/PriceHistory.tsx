'use client'

import { Check } from 'lucide-react'
import { PriceHistoryItem } from './types'
import { formatCurrency, formatDate } from './utils'

interface PriceHistoryProps {
  history: PriceHistoryItem[]
}

/**
 * PriceHistory Component
 * 
 * Timeline display of property price history including
 * sales, listings, and price changes.
 */
export function PriceHistory({ history }: PriceHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
        <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
          Price History
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No price history available
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Price History
      </div>

      <div className="space-y-0">
        {history.map((item, i) => (
          <div key={i} className="relative flex items-start gap-4 pb-4">
            {/* Timeline Line */}
            {i < history.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            )}
            
            {/* Timeline Dot */}
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.event.toLowerCase().includes('sold') 
                ? 'bg-teal-500' 
                : 'bg-slate-300 dark:bg-slate-600'
            }`}>
              {item.event.toLowerCase().includes('sold') ? (
                <Check size={12} className="text-white" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {item.event}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(item.date)} · {item.source}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatCurrency(item.price)}
                  </div>
                  {item.priceChangeRate !== undefined && item.priceChangeRate !== 0 && (
                    <div className={`text-xs font-medium tabular-nums ${
                      item.priceChangeRate < 0 
                        ? 'text-red-500' 
                        : 'text-teal-600 dark:text-teal-400'
                    }`}>
                      {item.priceChangeRate > 0 ? '+' : ''}{item.priceChangeRate}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * PriceHistorySkeleton
 * Loading state for the price history
 */
export function PriceHistorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
