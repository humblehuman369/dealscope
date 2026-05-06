'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useActiveFlips, useUpdateFlipStage } from '@/hooks/useSavedProperties'
import type { ActiveFlipSummary, FlipStage } from '@/types/savedProperty'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import {
  STAGES_BY_STRATEGY,
  STAGE_LABELS,
  STRATEGY_HEADER,
  resolveStrategy,
  isTerminalStage,
  type LifecycleStrategy,
} from '@/lib/lifecycleStages'

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

interface StrategySectionProps {
  strategy: LifecycleStrategy
  properties: ActiveFlipSummary[]
  onAdvance: (p: ActiveFlipSummary) => void
  onMoveTo: (p: ActiveFlipSummary, next: FlipStage) => void
}

function StrategySection({ strategy, properties, onAdvance, onMoveTo }: StrategySectionProps) {
  const stages = STAGES_BY_STRATEGY[strategy]

  const grouped = useMemo(() => {
    const empty: Record<FlipStage, ActiveFlipSummary[]> = {
      Acquisition: [], Rehab: [], Listed: [], Sold: [],
      Stabilized: [], Refinanced: [],
      MakeReady: [], Leased: [],
      Setup: [], Live: [],
      Held: [],
    }
    for (const p of properties) {
      const st = p.flip_stage
      if (st && empty[st]) empty[st].push(p)
    }
    return empty
  }, [properties])

  return (
    <section className="mb-10">
      <header className="mb-3 flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-[var(--text-heading)]">
          {STRATEGY_HEADER[strategy]}
        </h2>
        <span className="text-sm text-[var(--text-label)] tabular-nums">
          {properties.length} active
        </span>
      </header>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage) => (
          <div
            key={stage}
            className="rounded-2xl p-3 soft-panel border border-[var(--border-subtle)]"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="brand-gradient -mx-3 -mt-3 mb-3 rounded-t-2xl px-3 py-2 text-white">
              <h3 className="text-sm font-bold">{STAGE_LABELS[stage]}</h3>
              <p className="text-[10px] text-white/85 tabular-nums">
                {grouped[stage].length} active
              </p>
            </div>
            <div className="space-y-2">
              {grouped[stage].length === 0 ? (
                <p className="text-xs text-[var(--text-label)] py-3 text-center">No properties</p>
              ) : (
                grouped[stage].map((p) => {
                  const atTerminal = isTerminalStage(strategy, stage)
                  return (
                    <article
                      key={p.id}
                      className="rounded-xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border-default)]"
                    >
                      <p className="text-sm font-semibold text-[var(--text-heading)] leading-snug">
                        {p.nickname || p.address_street}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {daysInStage(p.flip_stage_entered_at)}d · {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{budgetBadge(p.budget_variance_pct)}</div>
                      <div className="mt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1 w-full rounded-lg py-1.5 text-xs font-semibold text-[var(--text-inverse)] brand-gradient disabled:opacity-40"
                          disabled={atTerminal}
                          onClick={() => onAdvance(p)}
                          title={atTerminal ? 'Already at terminal stage' : 'Advance to next stage'}
                        >
                          Advance <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <select
                          aria-label="Move to stage"
                          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-xs text-[var(--text-heading)]"
                          value={p.flip_stage ?? ''}
                          onChange={(e) => onMoveTo(p, e.target.value as FlipStage)}
                        >
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PipelineBoard() {
  const query = useActiveFlips(true)
  const updateStage = useUpdateFlipStage()

  // Bucket properties by their resolved strategy. Empty strategies don't get
  // their own section — keeps the page short for users who only flip.
  const byStrategy = useMemo(() => {
    const buckets: Record<LifecycleStrategy, ActiveFlipSummary[]> = {
      flip: [], brrrr: [], ltr: [], str: [],
    }
    for (const p of query.data ?? []) {
      buckets[resolveStrategy(p.best_strategy)].push(p)
    }
    return buckets
  }, [query.data])

  const populatedStrategies = (Object.keys(byStrategy) as LifecycleStrategy[]).filter(
    (s) => byStrategy[s].length > 0,
  )

  function advanceOne(p: ActiveFlipSummary) {
    if (!p.flip_stage) return
    const strategy = resolveStrategy(p.best_strategy)
    const stages = STAGES_BY_STRATEGY[strategy]
    const idx = stages.indexOf(p.flip_stage)
    if (idx < 0 || idx >= stages.length - 1) return
    const next = stages[idx + 1]
    updateStage.mutate({ id: p.id, stage: next })
  }

  function moveTo(p: ActiveFlipSummary, next: FlipStage) {
    updateStage.mutate({ id: p.id, stage: next })
  }

  return (
    <DataBoundary
      isLoading={query.isLoading}
      error={query.isError ? 'Could not load active projects' : null}
      onRetry={() => query.refetch()}
      isEmpty={!query.isLoading && (query.data?.length ?? 0) === 0}
      emptyTitle="No active projects yet"
      emptyDescription="When a deal hits the Owned column on the dashboard it shows up here, broken out by strategy."
    >
      {populatedStrategies.map((s) => (
        <StrategySection
          key={s}
          strategy={s}
          properties={byStrategy[s]}
          onAdvance={advanceOne}
          onMoveTo={moveTo}
        />
      ))}
    </DataBoundary>
  )
}

function PipelineContent() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 soft-panel rounded-3xl p-6 border border-[var(--border-subtle)]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] mb-3 no-underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold brand-text-gradient">Active Projects</h1>
          <p className="mt-2 text-[var(--text-secondary)] max-w-2xl">
            Owned deals, grouped by the strategy you're running. Each strategy has its own
            post-purchase progression — flips end at sale, BRRRR ends at hold after refinance,
            rentals end at hold after lease-up.
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
