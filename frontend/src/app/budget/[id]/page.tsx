'use client'

/**
 * Budget vs Actual page — the FlipperForce-style comparison table.
 *
 * Columns: Analysis (locked baseline) → Budgeted (current line totals +
 * contingency) → To Date (sum of expenses) → % Complete (user-input) →
 * Projected (forecasted final spend) → Variance (Projected − Budgeted).
 *
 * Surfaces the data model that already exists. The original "we ship the
 * pipeline + budget vs actual features Brad asked for at the start" goal.
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { api } from '@/lib/api-client'
import {
  useAddBudgetExpense,
  useRehabBudgetSummary,
  useUpdateBudgetLinePctComplete,
} from '@/hooks/useSavedProperties'
import type { RehabBudgetLineSummary, RehabBudgetSummary } from '@/types/rehabBudget'

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    typeof n === 'string' ? parseFloat(n) : n,
  )

interface PropertyHeaderInfo {
  id: string
  nickname: string | null
  address_street: string
  address_city: string | null
  address_state: string | null
}

function usePropertyHeader(id: string) {
  return useQuery({
    queryKey: ['saved-properties', 'detail', id],
    queryFn: () => api.get<PropertyHeaderInfo>(`/api/v1/properties/saved/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  })
}

function varianceClass(v: number): string {
  if (v > 0) return 'text-[var(--status-negative)]'
  if (v < 0) return 'text-[var(--status-positive)]'
  return 'text-[var(--text-heading)]'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function BudgetPage({ params }: PageProps) {
  const { id } = use(params)
  return (
    <AuthGuard>
      <BudgetPageContent propertyId={id} />
    </AuthGuard>
  )
}

function BudgetPageContent({ propertyId }: { propertyId: string }) {
  const summary = useRehabBudgetSummary(propertyId)
  const property = usePropertyHeader(propertyId)

  const title =
    property.data?.nickname ||
    property.data?.address_street ||
    'Loading…'
  const subtitle =
    property.data
      ? [property.data.address_city, property.data.address_state].filter(Boolean).join(', ')
      : ''

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 soft-panel rounded-3xl p-5 border border-[var(--border-subtle)]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] mb-2 no-underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">
            Budget vs Actual <span className="text-[var(--text-label)] font-normal">— {title}</span>
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-label)] mt-1">{subtitle}</p>
          )}
        </header>

        <DataBoundary
          isLoading={summary.isLoading}
          error={summary.isError ? 'Could not load this budget' : null}
          onRetry={() => summary.refetch()}
          isEmpty={!summary.isLoading && !summary.data}
          emptyTitle="No budget yet"
          emptyDescription="Seed a rehab budget from the estimator on the Verdict page to start tracking actuals here."
        >
          {summary.data && (
            <BudgetVsActualBoard propertyId={propertyId} summary={summary.data} />
          )}
        </DataBoundary>
      </div>
    </div>
  )
}

function BudgetVsActualBoard({
  propertyId,
  summary,
}: {
  propertyId: string
  summary: RehabBudgetSummary
}) {
  const analysis = parseFloat(summary.baseline_total) || 0
  const budgeted = parseFloat(summary.lines_subtotal) + parseFloat(summary.contingency_amount)
  const toDate = parseFloat(summary.actual_total) || 0
  const projected = parseFloat(summary.projected_total ?? summary.actual_total) || 0
  const variance = parseFloat(summary.variance) || 0
  const variancePct = parseFloat(summary.variance_pct) || 0

  // Group lines by category for the table sections.
  const byCategory = new Map<string, RehabBudgetLineSummary[]>()
  for (const ln of summary.lines) {
    const arr = byCategory.get(ln.category_id) ?? []
    arr.push(ln)
    byCategory.set(ln.category_id, arr)
  }

  return (
    <div className="space-y-6">
      {/* Totals row — the 4 numbers the user is here for. */}
      <section
        className="rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <Stat label="Analysis" hint="Locked deal estimate" value={fmt(analysis)} />
        <Stat label="Budgeted" hint="Lines + contingency" value={fmt(budgeted)} />
        <Stat label="To Date" hint="Actual spend" value={fmt(toDate)} accent="sky" />
        <Stat
          label="Projected"
          hint={`Forecasted final · ${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs Analysis`}
          value={fmt(projected)}
          accent={variance > 0 ? 'negative' : variance < 0 ? 'positive' : undefined}
        />
      </section>

      {summary.unallocated_actual && parseFloat(summary.unallocated_actual) > 0 && (
        <p className="text-xs text-[var(--text-label)]">
          {fmt(summary.unallocated_actual)} of expenses are not yet assigned to a budget line.
        </p>
      )}

      {/* Per-line breakdown grouped by category */}
      {Array.from(byCategory.entries()).map(([cat, lines]) => (
        <CategorySection key={cat} category={cat} lines={lines} propertyId={propertyId} />
      ))}

      <ExpenseAddForm propertyId={propertyId} lines={summary.lines} />
    </div>
  )
}

function Stat({
  label,
  hint,
  value,
  accent,
}: {
  label: string
  hint: string
  value: string
  accent?: 'sky' | 'negative' | 'positive'
}) {
  const valueColor =
    accent === 'sky'
      ? 'text-[var(--accent-sky)]'
      : accent === 'negative'
      ? 'text-[var(--status-negative)]'
      : accent === 'positive'
      ? 'text-[var(--status-positive)]'
      : 'text-[var(--text-heading)]'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-[var(--text-label)] mt-0.5">{hint}</p>
    </div>
  )
}

function CategorySection({
  category,
  lines,
  propertyId,
}: {
  category: string
  lines: RehabBudgetLineSummary[]
  propertyId: string
}) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-2 capitalize">
        {category.replace(/_/g, ' ')}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[var(--surface-elevated)] text-[var(--text-label)]">
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold text-right">Budgeted</th>
              <th className="px-3 py-2 font-semibold text-right">To Date</th>
              <th className="px-3 py-2 font-semibold text-right">% Complete</th>
              <th className="px-3 py-2 font-semibold text-right">Projected</th>
              <th className="px-3 py-2 font-semibold text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <BudgetLineRow key={line.id} line={line} propertyId={propertyId} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function BudgetLineRow({
  line,
  propertyId,
}: {
  line: RehabBudgetLineSummary
  propertyId: string
}) {
  const update = useUpdateBudgetLinePctComplete()
  // Local state lets the user edit without each keystroke firing a request.
  const [pct, setPct] = useState<string>(line.pct_complete ?? '0')

  const variance = parseFloat(line.variance) || 0
  const projected = parseFloat(line.projected_amount ?? line.estimate_amount) || 0
  const budgeted = parseFloat(line.estimate_amount) || 0
  const toDate = parseFloat(line.actual_amount) || 0

  function commitPct() {
    const n = Math.max(0, Math.min(100, parseFloat(pct.replace(/[^\d.]/g, ''))))
    if (!Number.isFinite(n)) return
    if (n.toString() === (line.pct_complete ?? '0')) return
    update.mutate({ propertyId, lineId: line.id, pct_complete: n })
  }

  return (
    <tr className="border-t border-[var(--border-subtle)]">
      <td className="px-3 py-2 text-[var(--text-heading)] font-medium">{line.label}</td>
      <td className="px-3 py-2 tabular-nums text-right">{fmt(budgeted)}</td>
      <td className="px-3 py-2 tabular-nums text-right">{fmt(toDate)}</td>
      <td className="px-3 py-2 text-right">
        <input
          aria-label={`% complete for ${line.label}`}
          className="w-16 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-right text-sm tabular-nums text-[var(--text-heading)]"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          onBlur={commitPct}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          inputMode="decimal"
        />
        <span className="ml-1 text-[var(--text-label)]">%</span>
      </td>
      <td className="px-3 py-2 tabular-nums text-right">{fmt(projected)}</td>
      <td className={`px-3 py-2 tabular-nums text-right ${varianceClass(variance)}`}>
        {variance > 0 ? '+' : ''}
        {fmt(variance)}
      </td>
    </tr>
  )
}

function ExpenseAddForm({
  propertyId,
  lines,
}: {
  propertyId: string
  lines: RehabBudgetLineSummary[]
}) {
  const add = useAddBudgetExpense()
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')
  const [lineId, setLineId] = useState<string>('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n <= 0) return
    add.mutate(
      {
        propertyId,
        amount: n,
        spent_on: spentOn,
        budget_line_id: lineId || null,
        vendor: vendor.trim() || null,
        description: null,
      },
      {
        onSuccess: () => {
          setAmount('')
          setVendor('')
        },
      },
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-5"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)] mb-3">
        Log a new expense
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-[var(--text-label)]">
          Amount
          <input
            className="mt-1 block w-32 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            required
          />
        </label>
        <label className="text-xs text-[var(--text-label)]">
          Date
          <input
            type="date"
            className="mt-1 block rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--text-label)]">
          Vendor
          <input
            className="mt-1 block w-44 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="(optional)"
          />
        </label>
        <label className="text-xs text-[var(--text-label)]">
          Line
          <select
            className="mt-1 block w-56 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
          >
            <option value="">(unassigned)</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={add.isPending || !amount.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] brand-gradient disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add expense
        </button>
      </div>
    </form>
  )
}
