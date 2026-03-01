'use client'

import { Check } from 'lucide-react'
import { PriceHistoryItem } from './types'
import { formatCurrency, formatDate } from './utils'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface PriceHistoryProps {
  history: PriceHistoryItem[]
}

/**
 * PriceHistory Component
 * 
 * Timeline display of property price history.
 * Sold events use green (success), price changes use semantic red/green.
 * All financial values use font-weight 600 + tabular-nums.
 */
export function PriceHistory({ history }: PriceHistoryProps) {
  const cardStyle = {
    backgroundColor: colors.background.card,
    border: `1px solid ${colors.ui.border}`,
    boxShadow: colors.shadow.card,
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
          Price History
        </div>
        <p className="text-sm text-center py-4" style={{ color: '#F1F5F9' }}>
          No price history available
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
        Price History
      </div>

      <div className="space-y-0">
        {history.map((item, i) => {
          const isSold = item.event.toLowerCase().includes('sold')
          return (
            <div key={i} className="relative flex items-start gap-4 pb-4">
              {/* Timeline Line */}
              {i < history.length - 1 && (
                <div
                  className="absolute left-[11px] top-6 bottom-0 w-0.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                />
              )}
              
              {/* Timeline Dot */}
              <div
                className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isSold ? colors.status.positive : colors.background.cardUp }}
              >
                {isSold ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F1F5F9' }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                      {item.event}
                    </div>
                    <div className="text-xs" style={{ color: '#F1F5F9' }}>
                      {formatDate(item.date)} · {item.source}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatCurrency(item.price)}
                    </div>
                    {item.priceChangeRate !== undefined && item.priceChangeRate !== 0 && (
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color: item.priceChangeRate < 0 ? colors.status.negative : colors.status.positive,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.priceChangeRate > 0 ? '+' : ''}{item.priceChangeRate}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="h-3 w-24 rounded animate-pulse mb-4" style={{ backgroundColor: colors.background.cardUp }} />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
            <div className="flex-1">
              <div className="h-4 w-24 rounded animate-pulse mb-1" style={{ backgroundColor: colors.background.cardUp }} />
              <div className="h-3 w-32 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
            </div>
            <div className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
          </div>
        ))}
      </div>
    </div>
  )
}
