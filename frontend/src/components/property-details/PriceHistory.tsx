'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PriceHistoryItem } from './types'
import { formatCurrency, formatDate } from './utils'

const COLLAPSED_COUNT = 3

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
  const [expanded, setExpanded] = useState(false)
  const cardStyle = {
    backgroundColor: 'var(--surface-base)',
    border: `1px solid var(--border-subtle)`,
    boxShadow: 'var(--shadow-card)',
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div
          className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
          style={{ color: 'var(--accent-sky)' }}
        >
          Price History
        </div>
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
          No price history available
        </p>
      </div>
    )
  }

  const canExpand = history.length > COLLAPSED_COUNT
  const visibleHistory = expanded ? history : history.slice(0, COLLAPSED_COUNT)

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      {canExpand ? (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 mb-4 text-left"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span
            className="text-xs font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--accent-sky)' }}
          >
            Price History
          </span>
          <ChevronDown
            size={16}
            className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden
          />
        </button>
      ) : (
        <div
          className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
          style={{ color: 'var(--accent-sky)' }}
        >
          Price History
        </div>
      )}

      <div className="space-y-0">
        {visibleHistory.map((item, i) => {
          const isSold = item.event.toLowerCase().includes('sold')
          const isPriceChange = item.event.toLowerCase().includes('price change')
          const isLastVisible = i === visibleHistory.length - 1
          return (
            <div key={`${item.date}-${item.event}-${i}`} className="relative flex items-start gap-4 pb-4">
              {/* Timeline Line */}
              {!isLastVisible && (
                <div
                  className="absolute left-[11px] top-6 bottom-0 w-0.5"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
              )}

              {/* Timeline Dot */}
              <div
                className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isSold ? 'var(--status-positive)' : 'var(--surface-elevated)',
                }}
              >
                {isSold ? (
                  <Check size={12} className="text-[var(--text-inverse)]" />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div
                      className={`text-sm font-semibold${isPriceChange ? ' uppercase' : ''}`}
                      style={{ color: isPriceChange ? 'var(--status-negative)' : 'var(--text-heading)' }}
                    >
                      {item.event}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(item.date)} · {item.source}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold${isPriceChange ? ' uppercase' : ''}`}
                      style={{
                        color: isPriceChange ? 'var(--status-negative)' : 'var(--text-heading)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(item.price)}
                    </div>
                    {item.priceChangeRate !== undefined && item.priceChangeRate !== 0 && (
                      <div
                        className="text-xs font-semibold"
                        style={{
                          color:
                            item.priceChangeRate < 0
                              ? 'var(--status-negative)'
                              : 'var(--status-positive)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.priceChangeRate > 0 ? '+' : ''}
                        {item.priceChangeRate}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {canExpand && !expanded && (
        <button
          type="button"
          className="mt-1 text-xs font-semibold transition-colors hover:brightness-110"
          style={{ color: 'var(--accent-sky)' }}
          onClick={() => setExpanded(true)}
        >
          Show all {history.length} events
        </button>
      )}
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
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div
        className="h-3 w-24 rounded animate-pulse mb-4"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <div
              className="w-6 h-6 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
            <div className="flex-1">
              <div
                className="h-4 w-24 rounded animate-pulse mb-1"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              />
              <div
                className="h-3 w-32 rounded animate-pulse"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              />
            </div>
            <div
              className="h-5 w-20 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
