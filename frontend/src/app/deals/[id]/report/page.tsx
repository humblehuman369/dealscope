'use client'

/**
 * Deal Report page — a printable end-to-end snapshot of one deal.
 *
 * Frames as "Final Profit Statement" when the deal is closed (Sold/Held),
 * "Deal Report" otherwise. Same template either way; the difference is
 * whether the numbers are projections or final.
 *
 * Print-to-PDF via the browser — no server-side renderer dependency. The
 * print stylesheet hides the page chrome (nav, back link, print button)
 * so the saved PDF is just the report content.
 */

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { api } from '@/lib/api-client'
import { useTasks } from '@/hooks/useTasks'
import { useTimeline } from '@/hooks/useTimeline'
import { useRehabBudgetSummary } from '@/hooks/useSavedProperties'
import { STATUS_CONFIG, STRATEGY_LABELS } from '@/lib/savedPropertyStatus'
import { STAGE_LABELS } from '@/lib/lifecycleStages'
import type { FlipStage, PropertyStatus } from '@/types/savedProperty'

interface DealDetail {
  id: string
  nickname: string | null
  address_street: string
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  full_address: string | null
  status: PropertyStatus
  flip_stage: FlipStage | null
  flip_stage_entered_at: string | null
  status_changed_at: string | null
  acquired_at: string | null
  rehab_started_at: string | null
  listed_at: string | null
  sold_at: string | null
  sold_price: string | number | null
  best_strategy: string | null
  best_cash_flow: number | null
  best_coc_return: number | null
  saved_at: string
  updated_at: string
}

function useDeal(id: string) {
  return useQuery({
    queryKey: ['saved-properties', 'detail', id],
    queryFn: () => api.get<DealDetail>(`/api/v1/properties/saved/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  })
}

const fmtMoney = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null
  return Math.max(0, Math.round((tb - ta) / 86_400_000))
}

export default function DealReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGuard>
      <DealReportContent propertyId={id} />
    </AuthGuard>
  )
}

function DealReportContent({ propertyId }: { propertyId: string }) {
  const deal = useDeal(propertyId)
  const summary = useRehabBudgetSummary(propertyId)
  const tasks = useTasks(propertyId)
  const events = useTimeline(propertyId)

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-6 px-4 sm:px-6 lg:px-8 grid-fade print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          /* Hide the dashboard chrome the layout might inject. */
          header[data-app-nav],
          nav[data-app-nav],
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-card {
            border: 1px solid #d1d5db !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          .print-page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Page chrome — hidden when printing */}
        <div className="no-print mb-4 flex items-center justify-between">
          <Link
            href={`/deals/${propertyId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] no-underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to deal
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>

        <DataBoundary
          isLoading={deal.isLoading}
          error={deal.isError ? 'Could not load this report' : null}
          onRetry={() => deal.refetch()}
          isEmpty={!deal.isLoading && !deal.data}
          emptyTitle="Deal not found"
          emptyDescription="The property may have been removed."
        >
          {deal.data && (
            <ReportBody
              deal={deal.data}
              budget={summary.data ?? null}
              taskOpen={tasks.data?.filter((t) => t.completed_at === null).length ?? 0}
              taskDone={tasks.data?.filter((t) => t.completed_at !== null).length ?? 0}
              eventCount={events.data?.length ?? 0}
            />
          )}
        </DataBoundary>
      </div>
    </div>
  )
}

function ReportBody({
  deal,
  budget,
  taskOpen,
  taskDone,
  eventCount,
}: {
  deal: DealDetail
  budget: {
    baseline_total: string
    actual_total: string
    projected_total?: string
    variance: string
    variance_pct: string
    contingency_pct: string
    lines: Array<{
      id: string
      category_id: string
      label: string
      estimate_amount: string
      actual_amount: string
      pct_complete?: string
      projected_amount?: string
      variance: string
    }>
  } | null
  taskOpen: number
  taskDone: number
  eventCount: number
}) {
  const isClosed =
    deal.status === 'owned' && (deal.flip_stage === 'Sold' || deal.flip_stage === 'Held')
  const title = isClosed ? 'Final Profit Statement' : 'Deal Report'
  const fullAddress =
    deal.full_address ||
    [deal.address_street, deal.address_city, deal.address_state, deal.address_zip]
      .filter(Boolean)
      .join(', ')

  const stageLabel = deal.flip_stage
    ? `${STATUS_CONFIG[deal.status].label} · ${STAGE_LABELS[deal.flip_stage]}`
    : STATUS_CONFIG[deal.status].label

  // Lifecycle dates — best effort. We have explicit timestamps for the flip
  // milestones; everything before "acquired" comes from saved_at and
  // status_changed_at as the only signals available.
  const lifecycle = [
    { label: 'Saved', when: deal.saved_at },
    { label: 'Status changed', when: deal.status_changed_at },
    { label: 'Acquired', when: deal.acquired_at },
    { label: 'Rehab started', when: deal.rehab_started_at },
    { label: 'Listed', when: deal.listed_at },
    { label: 'Sold', when: deal.sold_at },
  ].filter((row) => row.when)

  const totalDays = daysBetween(deal.saved_at, deal.sold_at ?? deal.updated_at)

  // Budget rollups when present.
  const analysis = budget ? parseFloat(budget.baseline_total) : null
  const projected = budget ? parseFloat(budget.projected_total ?? budget.actual_total) : null
  const toDate = budget ? parseFloat(budget.actual_total) : null
  const variance = budget ? parseFloat(budget.variance) : null
  const variancePct = budget ? parseFloat(budget.variance_pct) : null

  const soldPrice =
    deal.sold_price != null
      ? typeof deal.sold_price === 'string'
        ? parseFloat(deal.sold_price)
        : deal.sold_price
      : null

  const netProfit =
    soldPrice != null && analysis != null && projected != null ? soldPrice - projected : null

  return (
    <article className="space-y-6">
      {/* Title block */}
      <header className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-6 print:bg-white print-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-label)]">
          {title}
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
          {deal.nickname || deal.address_street}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{fullAddress}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-label)]">
          <span>
            Strategy:{' '}
            <span className="font-semibold text-[var(--text-body)]">
              {deal.best_strategy
                ? (STRATEGY_LABELS[deal.best_strategy] ?? deal.best_strategy)
                : '—'}
            </span>
          </span>
          <span>
            Stage: <span className="font-semibold text-[var(--text-body)]">{stageLabel}</span>
          </span>
          <span>
            Generated:{' '}
            <span className="font-semibold text-[var(--text-body)]">
              {fmtDate(new Date().toISOString())}
            </span>
          </span>
        </div>
      </header>

      {/* Headline numbers */}
      <section className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-6 print-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ReportStat label="Analysis" value={fmtMoney(analysis)} />
          <ReportStat label={isClosed ? 'Final spend' : 'Projected'} value={fmtMoney(projected)} />
          <ReportStat label="To date" value={fmtMoney(toDate)} />
          <ReportStat
            label={isClosed ? 'Final variance' : 'Variance'}
            value={
              variance != null
                ? `${variance > 0 ? '+' : ''}${fmtMoney(variance)}${variancePct !== null ? ` (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%)` : ''}`
                : '—'
            }
            tone={
              variance == null
                ? 'neutral'
                : variance > 0
                  ? 'negative'
                  : variance < 0
                    ? 'positive'
                    : 'neutral'
            }
          />
        </div>
        {soldPrice != null && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[var(--border-default)]">
            <ReportStat label="Sale price" value={fmtMoney(soldPrice)} />
            <ReportStat
              label="Net profit"
              value={fmtMoney(netProfit)}
              tone={
                netProfit == null
                  ? 'neutral'
                  : netProfit > 0
                    ? 'positive'
                    : netProfit < 0
                      ? 'negative'
                      : 'neutral'
              }
            />
            <ReportStat label="Days to close" value={totalDays != null ? `${totalDays}d` : '—'} />
            <ReportStat label="Activity logged" value={`${eventCount} events`} />
          </div>
        )}
      </section>

      {/* Lifecycle */}
      <section className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-6 print-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-3">
          Lifecycle
        </h2>
        {lifecycle.length === 0 ? (
          <p className="text-sm text-[var(--text-label)]">No milestones recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-label)] text-[10px] uppercase tracking-wide">
                <th className="py-1 text-left font-semibold">Milestone</th>
                <th className="py-1 text-right font-semibold">Date</th>
                <th className="py-1 text-right font-semibold">Days from save</th>
              </tr>
            </thead>
            <tbody>
              {lifecycle.map((row, idx) => {
                const days = daysBetween(deal.saved_at, row.when)
                return (
                  <tr key={idx} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-heading)] font-medium">{row.label}</td>
                    <td className="py-2 tabular-nums text-right text-[var(--text-body)]">
                      {fmtDate(row.when)}
                    </td>
                    <td className="py-2 tabular-nums text-right text-[var(--text-label)]">
                      {days != null ? `${days}d` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Budget breakdown */}
      {budget && budget.lines.length > 0 && (
        <section className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-6 print-card print-page-break">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-3">
            Budget breakdown
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-label)] text-[10px] uppercase tracking-wide">
                <th className="py-1 text-left font-semibold">Item</th>
                <th className="py-1 text-right font-semibold">Budgeted</th>
                <th className="py-1 text-right font-semibold">To date</th>
                <th className="py-1 text-right font-semibold">% Complete</th>
                <th className="py-1 text-right font-semibold">Projected</th>
                <th className="py-1 text-right font-semibold">Variance</th>
              </tr>
            </thead>
            <tbody>
              {budget.lines.map((line) => {
                const v = parseFloat(line.variance) || 0
                return (
                  <tr key={line.id} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-heading)]">{line.label}</td>
                    <td className="py-2 tabular-nums text-right">
                      {fmtMoney(parseFloat(line.estimate_amount))}
                    </td>
                    <td className="py-2 tabular-nums text-right">
                      {fmtMoney(parseFloat(line.actual_amount))}
                    </td>
                    <td className="py-2 tabular-nums text-right text-[var(--text-label)]">
                      {line.pct_complete ?? '0'}%
                    </td>
                    <td className="py-2 tabular-nums text-right">
                      {fmtMoney(parseFloat(line.projected_amount ?? line.estimate_amount))}
                    </td>
                    <td
                      className={`py-2 tabular-nums text-right ${
                        v > 0
                          ? 'text-[var(--status-negative)]'
                          : v < 0
                            ? 'text-[var(--status-positive)]'
                            : 'text-[var(--text-body)]'
                      }`}
                    >
                      {v > 0 ? '+' : ''}
                      {fmtMoney(v)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Activity counts (lightweight; full timeline lives on the deal page) */}
      <section className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] p-6 print-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] mb-3">
          Execution
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ReportStat label="Open tasks" value={String(taskOpen)} />
          <ReportStat label="Completed tasks" value={String(taskDone)} />
          <ReportStat label="Activity events" value={String(eventCount)} />
          <ReportStat
            label="Contingency"
            value={
              budget?.contingency_pct
                ? `${(parseFloat(budget.contingency_pct) * 100).toFixed(1)}%`
                : '—'
            }
          />
        </div>
      </section>

      {/* Print footer */}
      <p className="text-[10px] text-[var(--text-label)] text-center pt-2 print:text-black">
        Generated by DealGapIQ · Numbers reflect data as of {fmtDate(new Date().toISOString())}
      </p>
    </article>
  )
}

function ReportStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'neutral'
}) {
  const valueColor =
    tone === 'positive'
      ? 'text-[var(--status-positive)]'
      : tone === 'negative'
        ? 'text-[var(--status-negative)]'
        : 'text-[var(--text-heading)]'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
        {label}
      </p>
      <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  )
}
