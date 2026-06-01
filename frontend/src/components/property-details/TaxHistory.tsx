'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TaxHistoryItem } from './types'
import { formatCurrency } from './utils'

const COLLAPSED_COUNT = 3

interface TaxHistoryProps {
  history: TaxHistoryItem[]
}

/**
 * TaxHistory Component
 *
 * Table display of property tax history. Tax paid uses red (expense/negative),
 * all financial columns use tabular-nums for clean column alignment.
 */
export function TaxHistory({ history }: TaxHistoryProps) {
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
          Tax History
        </div>
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
          No tax history available
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
            Tax History
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
          Tax History
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr style={{ borderBottom: `1px solid var(--border-subtle)` }}>
              <th
                className="text-left py-2 text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Year
              </th>
              <th
                className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Tax Paid
              </th>
              <th
                className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Assessed Value
              </th>
              <th
                className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Land
              </th>
              <th
                className="text-right py-2 text-[10px] font-bold uppercase tracking-[0.04em]"
                style={{ color: 'var(--text-label)' }}
              >
                Improvements
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleHistory.map((item, i) => (
              <tr key={`${item.year}-${i}`} style={{ borderBottom: `1px solid var(--border-subtle)` }}>
                <td className="py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {item.year}
                </td>
                <td
                  className="py-3 text-sm font-semibold text-right"
                  style={{ color: 'var(--status-negative)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCurrency(item.taxPaid)}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{
                    color: 'var(--text-body)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(item.assessedValue)}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{
                    color: 'var(--text-body)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {item.landValue ? formatCurrency(item.landValue) : 'N/A'}
                </td>
                <td
                  className="py-3 text-sm text-right"
                  style={{
                    color: 'var(--text-body)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}
                >
                  {item.improvementValue ? formatCurrency(item.improvementValue) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canExpand && !expanded && (
        <button
          type="button"
          className="mt-3 text-xs font-semibold transition-colors hover:brightness-110"
          style={{ color: 'var(--accent-sky)' }}
          onClick={() => setExpanded(true)}
        >
          Show all {history.length} years
        </button>
      )}
    </div>
  )
}

/**
 * TaxHistorySkeleton
 * Loading state for the tax history
 */
export function TaxHistorySkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div
        className="h-3 w-20 rounded animate-pulse mb-4"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="space-y-3">
        <div
          className="flex justify-between pb-2"
          style={{ borderBottom: `1px solid var(--border-subtle)` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-16 rounded animate-pulse"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="h-4 w-16 rounded animate-pulse"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
