'use client'

/**
 * Budget vs Actual panel — Analysis · Budgeted · To Date · % Complete ·
 * Projected · Variance comparison table plus inline expense form (with AI
 * receipt parsing). Used by the legacy ``/budget/[id]`` page and the new
 * ``/deals/[id]?tab=budget`` workflow tab.
 */

import { useRef, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus, Sparkles, X } from 'lucide-react'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { ApiError } from '@/lib/api-client'
import { buildRehabUrl } from '@/lib/rehabNavigation'
import {
  useAddBudgetExpense,
  useParseReceipt,
  useRehabBudgetSummary,
  useUpdateBudgetLinePctComplete,
} from '@/hooks/useSavedProperties'
import type { RehabBudgetLineSummary, RehabBudgetSummary } from '@/types/rehabBudget'

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(typeof n === 'string' ? parseFloat(n) : n)

function varianceClass(v: number): string {
  if (v > 0) return 'text-[var(--status-negative)]'
  if (v < 0) return 'text-[var(--status-positive)]'
  return 'text-[var(--text-heading)]'
}

export function BudgetPanel({ propertyId }: { propertyId: string }) {
  const summary = useRehabBudgetSummary(propertyId)

  // A 404 means no budget has been created yet — that's an empty state, not an
  // error. Only surface a real failure (network, 5xx, etc.) as an error.
  const noBudgetYet =
    summary.isError && summary.error instanceof ApiError && summary.error.status === 404

  return (
    <DataBoundary
      isLoading={summary.isLoading}
      error={summary.isError && !noBudgetYet ? 'Could not load this budget' : null}
      onRetry={() => summary.refetch()}
      isEmpty={!summary.isLoading && !summary.data}
      emptyTitle="No budget created yet"
      emptyDescription="Build a rehab estimate in the Estimator and save it to this property to start tracking budget vs. actual spend."
      emptyAction={
        <Link
          href={buildRehabUrl({ savedPropertyId: propertyId })}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] brand-gradient transition-opacity hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Create a Budget
        </Link>
      }
    >
      {summary.data && <BudgetVsActualBoard propertyId={propertyId} summary={summary.data} />}
    </DataBoundary>
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

  const byCategory = new Map<string, RehabBudgetLineSummary[]>()
  for (const ln of summary.lines) {
    const arr = byCategory.get(ln.category_id) ?? []
    arr.push(ln)
    byCategory.set(ln.category_id, arr)
  }

  return (
    <div className="space-y-6">
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

      <ExpenseAddForm propertyId={propertyId} lines={summary.lines} />

      {Array.from(byCategory.entries()).map(([cat, lines]) => (
        <CategorySection key={cat} category={cat} lines={lines} propertyId={propertyId} />
      ))}
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

function BudgetLineRow({ line, propertyId }: { line: RehabBudgetLineSummary; propertyId: string }) {
  const update = useUpdateBudgetLinePctComplete()
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
  const parse = useParseReceipt(propertyId)
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [vendor, setVendor] = useState('')
  const [lineId, setLineId] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [showAiBanner, setShowAiBanner] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
        description: description.trim() || null,
        receipt_document_id: receiptId,
      },
      {
        onSuccess: () => {
          setAmount('')
          setVendor('')
          setDescription('')
          setReceiptId(null)
          setShowAiBanner(false)
        },
      },
    )
  }

  function pickReceipt() {
    fileInputRef.current?.click()
  }

  function onReceiptSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    parse.mutate(file, {
      onSuccess: ({ document_id, parsed }) => {
        setReceiptId(document_id)
        if (parsed) {
          if (parsed.amount) setAmount(parsed.amount)
          if (parsed.vendor) setVendor(parsed.vendor)
          if (parsed.spent_on) setSpentOn(parsed.spent_on)
          if (parsed.description) setDescription(parsed.description)
          if (parsed.suggested_line_id) setLineId(parsed.suggested_line_id)
        }
        setShowAiBanner(true)
      },
    })
  }

  function clearReceipt() {
    setReceiptId(null)
    setShowAiBanner(false)
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
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">
          Log a new expense
        </p>
        <button
          type="button"
          onClick={pickReceipt}
          disabled={parse.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] disabled:opacity-50 transition-colors"
          title="Upload a receipt; we'll fill in the details"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {parse.isPending ? 'Parsing receipt…' : 'Upload receipt (AI)'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={onReceiptSelected}
          className="hidden"
        />
      </div>
      {parse.isError && (
        <p className="mb-3 text-xs text-[var(--status-negative)]">
          Couldn&apos;t parse that file: {(parse.error as Error)?.message ?? 'unknown error'}
        </p>
      )}
      {showAiBanner && receiptId && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'var(--color-sky-dim)', color: 'var(--accent-sky)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Receipt attached.{' '}
            {parse.data?.parsed
              ? 'AI pre-filled what it could — review before saving.'
              : 'AI couldn’t read it; type the values yourself.'}
          </span>
          <button
            type="button"
            onClick={clearReceipt}
            aria-label="Detach receipt"
            className="p-1 rounded hover:bg-[var(--surface-elevated)]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
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
        <label className="text-xs text-[var(--text-label)] flex-1 min-w-[180px]">
          Description
          <input
            className="mt-1 block w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
