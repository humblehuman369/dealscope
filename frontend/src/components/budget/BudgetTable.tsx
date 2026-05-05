'use client'

/**
 * Line-item rehab budget: estimate vs actual with variance and quick expense logging.
 */

import { useMemo, useState } from 'react'
import type { RehabBudgetSummary } from '@/types/rehabBudget'
import { useAddBudgetExpense } from '@/hooks/useSavedProperties'

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    typeof n === 'string' ? parseFloat(n) : n,
  )

function statusPill(status: string) {
  const map = {
    good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/25',
    warn: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/25',
    bad: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-500/25',
  }
  const cls = map[status as keyof typeof map] ?? map.warn
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status === 'good' ? 'On track' : status === 'warn' ? 'Watch' : 'Over'}
    </span>
  )
}

export function BudgetTable({
  propertyId,
  summary,
  onRefresh,
}: {
  propertyId: string
  summary: RehabBudgetSummary
  onRefresh: () => void
}) {
  const addExpense = useAddBudgetExpense()
  const [openLineId, setOpenLineId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')

  const byCategory = useMemo(() => {
    const m = new Map<string, typeof summary.lines>()
    for (const line of summary.lines) {
      const arr = m.get(line.category_id) ?? []
      arr.push(line)
      m.set(line.category_id, arr)
    }
    return m
  }, [summary.lines])

  async function submitForLine(lineId: string | null) {
    const n = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n <= 0) return
    await addExpense.mutateAsync({
      propertyId,
      amount: n,
      spent_on: spentOn,
      budget_line_id: lineId,
      vendor: vendor.trim() || undefined,
      description: undefined,
    })
    setAmount('')
    setVendor('')
    setOpenLineId(null)
    onRefresh()
  }

  const ratio =
    parseFloat(summary.baseline_total) > 0
      ? (parseFloat(summary.actual_total) / parseFloat(summary.baseline_total)) * 100
      : 0

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-4 flex flex-wrap gap-4 justify-between items-start"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">Baseline (est. + contingency)</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-heading)]">{fmt(summary.baseline_total)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">Actual spend</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--accent-sky)]">{fmt(summary.actual_total)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">Variance</p>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{
              color:
                parseFloat(summary.variance) > 0
                  ? 'var(--status-negative)'
                  : parseFloat(summary.variance) < 0
                    ? 'var(--status-positive)'
                    : 'var(--text-heading)',
            }}
          >
            {fmt(summary.variance)} ({summary.variance_pct}%)
          </p>
        </div>
        <div className="min-w-[140px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)] mb-1">Spend vs baseline</p>
          <div className="h-2 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full brand-gradient"
              style={{ width: `${Math.min(100, ratio)}%` }}
            />
          </div>
        </div>
      </div>

      {Array.from(byCategory.entries()).map(([cat, lines]) => (
        <div key={cat}>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-2 capitalize">
            {cat.replace(/_/g, ' ')}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--surface-elevated)] text-[var(--text-label)]">
                  <th className="px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Estimate</th>
                  <th className="px-3 py-2 font-semibold">Actual</th>
                  <th className="px-3 py-2 font-semibold">Variance</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Log</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2 text-[var(--text-heading)] font-medium">{line.label}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(line.estimate_amount)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(line.actual_amount)}</td>
                    <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">
                      {fmt(line.variance)} ({line.variance_pct}%)
                    </td>
                    <td className="px-3 py-2">{statusPill(line.status)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[var(--accent-sky)] hover:underline"
                        onClick={() => {
                          setOpenLineId(openLineId === line.id ? null : line.id)
                        }}
                      >
                        {openLineId === line.id ? 'Close' : '+ Expense'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {openLineId && (
        <div
          className="flex flex-wrap gap-2 items-end p-4 rounded-xl"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="w-full text-xs font-semibold text-[var(--text-label)]">Add expense for selected line</p>
          <label className="text-xs text-[var(--text-label)]">
            Amount
            <input
              className="mt-1 block rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-[var(--text-heading)]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="text-xs text-[var(--text-label)]">
            Date
            <input
              type="date"
              className="mt-1 block rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-[var(--text-heading)]"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--text-label)]">
            Vendor
            <input
              className="mt-1 block rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-[var(--text-heading)]"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white brand-gradient"
            disabled={addExpense.isPending}
            onClick={() => submitForLine(openLineId)}
          >
            Save expense
          </button>
        </div>
      )}

      <div className="rounded-xl p-3 text-sm text-[var(--text-secondary)]">
        Upload receipts from the property Documents tab and link document IDs in a future update; for now, vendor + date
        keeps your actuals auditable.
      </div>
    </div>
  )
}
