'use client'

/**
 * Underwriting vs Actuals — owned properties only.
 *
 * The user records what the property actually rents for and what it actually
 * costs per month (all-in, including the mortgage). The card compares those
 * against the underwriting the deal was bought on (deal_maker_record), so the
 * analysis becomes accountable: "you underwrote $2,400 — you're getting $2,300".
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { api } from '@/lib/api-client'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import type { PropertyActuals, SavedProperty } from '@/types/savedProperty'

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function ActualsCard({ deal }: { deal: SavedProperty }) {
  const qc = useQueryClient()
  const record = (deal.deal_maker_record ?? {}) as Record<string, unknown>
  const metrics = (record.cached_metrics ?? {}) as Record<string, unknown>

  const underwrittenRent = num(record.monthly_rent)
  const underwrittenCashFlow = num(metrics.monthly_cash_flow)

  const stored = deal.actuals ?? null
  const [editing, setEditing] = useState(false)
  const [rent, setRent] = useState('')
  const [expenses, setExpenses] = useState('')

  const save = useMutation({
    mutationFn: (actuals: PropertyActuals) =>
      api.patch(`/api/v1/properties/saved/${deal.id}`, { actuals }),
    onSuccess: () => {
      // Detail + list — Portfolio reads actuals from the summary list.
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.detail(deal.id) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
      setEditing(false)
    },
  })

  function startEdit() {
    setRent(stored?.monthly_rent != null ? String(stored.monthly_rent) : '')
    setExpenses(stored?.monthly_expenses != null ? String(stored.monthly_expenses) : '')
    setEditing(true)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const rentNum = rent.trim() === '' ? null : parseFloat(rent)
    const expNum = expenses.trim() === '' ? null : parseFloat(expenses)
    save.mutate({
      monthly_rent: rentNum !== null && Number.isFinite(rentNum) ? rentNum : null,
      monthly_expenses: expNum !== null && Number.isFinite(expNum) ? expNum : null,
      updated_at: new Date().toISOString(),
    })
  }

  const actualRent = num(stored?.monthly_rent)
  const actualExpenses = num(stored?.monthly_expenses)
  const actualCashFlow =
    actualRent !== null && actualExpenses !== null ? actualRent - actualExpenses : null

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 flex flex-col lg:col-span-2">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-heading)] inline-flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-[var(--accent-sky)]" />
          Underwriting vs Actuals
        </h3>
        {stored && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-[11px] font-semibold text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
          >
            Update actuals
          </button>
        )}
      </header>

      {editing || !stored ? (
        <form onSubmit={submit} className="space-y-2">
          <p className="text-sm text-[var(--text-label)]">
            Record what this property actually does each month to see how it compares to the
            numbers you bought it on.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 text-[11px] text-[var(--text-label)]">
              Actual rent / mo
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder={underwrittenRent !== null ? `Underwrote ${fmtCurrency(underwrittenRent)}` : 'e.g. 2300'}
                className="mt-0.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
              />
            </label>
            <label className="flex-1 text-[11px] text-[var(--text-label)]">
              Actual expenses / mo (all-in, incl. mortgage)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
                placeholder="e.g. 1900"
                className="mt-0.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {stored && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={save.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save actuals'}
            </button>
          </div>
          {save.isError && (
            <p className="text-xs text-[var(--status-negative)]">Couldn&apos;t save — try again.</p>
          )}
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VarianceRow label="Monthly rent" underwritten={underwrittenRent} actual={actualRent} />
          <VarianceRow
            label="Monthly cash flow"
            underwritten={underwrittenCashFlow}
            actual={actualCashFlow}
          />
        </div>
      )}
    </section>
  )
}

function VarianceRow({
  label,
  underwritten,
  actual,
}: {
  label: string
  underwritten: number | null
  actual: number | null
}) {
  const variance =
    underwritten !== null && actual !== null && underwritten !== 0
      ? ((actual - underwritten) / Math.abs(underwritten)) * 100
      : null
  const varianceColor =
    variance === null
      ? 'var(--text-label)'
      : variance >= 0
        ? 'var(--status-positive)'
        : 'var(--status-negative)'

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">{label}</p>
      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-base font-semibold tabular-nums text-[var(--text-heading)]">
          {actual !== null ? fmtCurrency(actual) : '—'}
        </span>
        <span className="text-[11px] text-[var(--text-label)] tabular-nums">
          underwrote {underwritten !== null ? fmtCurrency(underwritten) : '—'}
        </span>
        {variance !== null && (
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: varianceColor }}>
            {variance >= 0 ? '+' : ''}
            {variance.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
