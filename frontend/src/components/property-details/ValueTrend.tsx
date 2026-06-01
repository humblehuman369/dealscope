'use client'

import { formatCurrency } from './utils'

interface ValueTrendPoint {
  date: string
  value: number
}

interface ValueTrendProps {
  history: ValueTrendPoint[]
}

/**
 * Compact Zestimate value trend — hide when fewer than 2 points.
 */
export function ValueTrend({ history }: ValueTrendProps) {
  if (!history || history.length < 2) return null

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const earliest = sorted[0]
  const change = latest.value - earliest.value
  const changePct = earliest.value > 0 ? (change / earliest.value) * 100 : 0
  const isUp = change >= 0

  const cardStyle = {
    backgroundColor: 'var(--surface-base)',
    border: `1px solid var(--border-subtle)`,
    boxShadow: 'var(--shadow-card)',
  }

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div
        className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
        style={{ color: 'var(--accent-sky)' }}
      >
        Value Trend
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-label)' }}>
            Latest Zestimate
          </div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>
            {formatCurrency(latest.value)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-label)' }}>
            Since {earliest.date.slice(0, 7)}
          </div>
          <div
            className="text-sm font-semibold tabular-nums"
            style={{ color: isUp ? 'var(--status-positive)' : 'var(--status-negative)' }}
          >
            {isUp ? '+' : ''}
            {formatCurrency(change)} ({changePct >= 0 ? '+' : ''}
            {changePct.toFixed(1)}%)
          </div>
        </div>
      </div>
    </div>
  )
}
