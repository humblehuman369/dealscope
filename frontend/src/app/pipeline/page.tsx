'use client'

import { useMemo } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useActiveFlips, useUpdateFlipStage } from '@/hooks/useSavedProperties'
import type { ActiveFlipSummary, FlipStage } from '@/types/savedProperty'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { ChevronRight } from 'lucide-react'

const FLIP_STAGES: FlipStage[] = ['Acquisition', 'Rehab', 'Listed', 'Sold']

function budgetBadge(vp: string | null | undefined) {
  if (vp === undefined || vp === null || vp === '') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">
        No budget
      </span>
    )
  }
  const n = parseFloat(vp)
  let cls =
    'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 '
  if (n <= 0) cls += 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300'
  else if (n <= 10) cls += 'bg-amber-500/10 text-amber-900 ring-amber-500/25 dark:text-amber-200'
  else cls += 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300'
  return (
    <span className={cls}>
      {n > 0 ? '+' : ''}
      {vp}% vs est.
    </span>
  )
}

function daysInStage(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function PipelineBoard() {
  const query = useActiveFlips(false)
  const updateStage = useUpdateFlipStage()

  const grouped = useMemo(() => {
    const empty: Record<FlipStage, ActiveFlipSummary[]> = {
      Acquisition: [],
      Rehab: [],
      Listed: [],
      Sold: [],
    }
    for (const p of query.data ?? []) {
      const st = p.flip_stage
      if (st && empty[st]) empty[st].push(p)
    }
    return empty
  }, [query.data])

  function advanceOne(p: ActiveFlipSummary) {
    const idx = FLIP_STAGES.indexOf(p.flip_stage!)
    if (idx < 0 || idx >= FLIP_STAGES.length - 1) return
    const next = FLIP_STAGES[idx + 1]
    updateStage.mutate({
      id: p.id,
      stage: next,
      sold_price: next === 'Sold' ? undefined : undefined,
    })
  }

  function moveTo(event: React.ChangeEvent<HTMLSelectElement>, p: ActiveFlipSummary) {
    const next = event.target.value as FlipStage
    updateStage.mutate({
      id: p.id,
      stage: next,
      sold_price: next === 'Sold' ? undefined : undefined,
    })
  }

  return (
    <DataBoundary
      isLoading={query.isLoading}
      error={query.isError ? 'Could not load active flips' : null}
      onRetry={() => query.refetch()}
      isEmpty={!query.isLoading && (query.data?.length ?? 0) === 0}
      emptyTitle="No active flips yet"
      emptyDescription="Mark a saved property as Owned to start the flip pipeline, or move an owned property into Acquisition."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        {FLIP_STAGES.map((stage) => (
          <section
            key={stage}
            className="rounded-3xl p-4 soft-panel border border-[var(--border-subtle)]"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="brand-gradient -mx-4 -mt-4 mb-3 rounded-t-3xl px-4 py-3 text-white">
              <h2 className="text-lg font-bold">{stage}</h2>
              <p className="text-xs text-white/85">{grouped[stage].length} active</p>
            </div>
            <div className="space-y-3">
              {grouped[stage].map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl bg-[var(--surface-elevated)] p-3 border border-[var(--border-default)]"
                >
                  <p className="font-semibold text-[var(--text-heading)] leading-snug">
                    {p.nickname || p.address_street}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {daysInStage(p.flip_stage_entered_at)}d in stage ·{' '}
                    {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">{budgetBadge(p.budget_variance_pct)}</div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1 w-full rounded-xl py-2 text-sm font-semibold text-[var(--text-inverse)] brand-gradient disabled:opacity-40"
                      disabled={stage === 'Sold'}
                      onClick={() => advanceOne(p)}
                    >
                      Advance <ChevronRight className="w-4 h-4" />
                    </button>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
                      Move to
                      <select
                        className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
                        value={p.flip_stage ?? ''}
                        onChange={(e) => moveTo(e, p)}
                      >
                        {FLIP_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DataBoundary>
  )
}

function PipelineContent() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 soft-panel rounded-3xl p-6 border border-[var(--border-subtle)]">
          <h1 className="text-3xl font-bold brand-text-gradient">Active Flips</h1>
          <p className="mt-2 text-[var(--text-secondary)] max-w-2xl">
            Track each owned deal through Acquisition → Rehab → Listed → Sold. This is separate from your pre-purchase{' '}
            <strong className="text-[var(--text-heading)]">Lead Pipeline</strong> on the Dashboard.
          </p>
        </header>
        <PipelineBoard />
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <AuthGuard>
      <PipelineContent />
    </AuthGuard>
  )
}
