'use client'

/**
 * Portfolio — closed deals as a track record.
 *
 * Shows every saved property whose lifecycle reached a terminal post-purchase
 * stage (Sold for flips/wholesale; Held for BRRRR / LTR / STR / House Hack).
 * Filter by Sold/Held, sort by recency / sale price / days-to-close. Each
 * card opens the full deal workflow page and a short Report link routes
 * straight to the printable summary.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Trophy } from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { useSavedProperties } from '@/hooks/useSavedProperties'
import { STRATEGY_LABELS } from '@/lib/savedPropertyStatus'
import { STAGE_LABELS } from '@/lib/lifecycleStages'
import type { FlipStage, SavedPropertySummary } from '@/types/savedProperty'

const TERMINAL_STAGES: ReadonlySet<FlipStage> = new Set(['Sold', 'Held'])

type Filter = 'all' | 'sold' | 'held'
type Sort = 'recent' | 'sale_price' | 'days_to_close'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  sold: 'Sold',
  held: 'Held',
}

const SORT_LABELS: Record<Sort, string> = {
  recent: 'Most recent',
  sale_price: 'Highest sale price',
  days_to_close: 'Fewest days to close',
}

const fmtMoney = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

const fmtMoneyFull = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null
  return Math.max(0, Math.round((tb - ta) / 86_400_000))
}

function terminalDate(p: SavedPropertySummary): string | null {
  // Most recent terminal-event timestamp we can rely on. ``sold_at`` is
  // explicitly stamped on Sold transition; for Held we fall back to
  // ``flip_stage_entered_at`` (the moment the property entered the Held
  // column). ``updated_at`` is the safety net.
  if (p.flip_stage === 'Sold') return p.sold_at ?? p.flip_stage_entered_at ?? p.updated_at
  if (p.flip_stage === 'Held') return p.flip_stage_entered_at ?? p.updated_at
  return p.updated_at
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <PortfolioContent />
    </AuthGuard>
  )
}

function PortfolioContent() {
  const query = useSavedProperties({
    page: 0,
    pageSize: 100,
    status: 'owned',
    search: '',
  })

  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('recent')

  const closed = useMemo(() => {
    return (query.data ?? []).filter((p) => p.flip_stage && TERMINAL_STAGES.has(p.flip_stage))
  }, [query.data])

  const filtered = useMemo(() => {
    if (filter === 'all') return closed
    if (filter === 'sold') return closed.filter((p) => p.flip_stage === 'Sold')
    return closed.filter((p) => p.flip_stage === 'Held')
  }, [closed, filter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'sale_price') {
      arr.sort((a, b) => Number(b.sold_price ?? 0) - Number(a.sold_price ?? 0))
    } else if (sort === 'days_to_close') {
      arr.sort((a, b) => {
        const da = daysBetween(a.saved_at, terminalDate(a)) ?? Number.POSITIVE_INFINITY
        const db = daysBetween(b.saved_at, terminalDate(b)) ?? Number.POSITIVE_INFINITY
        return da - db
      })
    } else {
      arr.sort((a, b) => {
        const ta = new Date(terminalDate(a) ?? a.updated_at).getTime()
        const tb = new Date(terminalDate(b) ?? b.updated_at).getTime()
        return tb - ta
      })
    }
    return arr
  }, [filtered, sort])

  const stats = useMemo(() => {
    const sold = closed.filter((p) => p.flip_stage === 'Sold')
    const held = closed.filter((p) => p.flip_stage === 'Held')
    const totalSaleValue = sold.reduce((sum, p) => sum + Number(p.sold_price ?? 0), 0)
    const dayCounts = sold
      .map((p) => daysBetween(p.saved_at, terminalDate(p)))
      .filter((d): d is number => d !== null)
    const avgDays =
      dayCounts.length > 0
        ? Math.round(dayCounts.reduce((s, d) => s + d, 0) / dayCounts.length)
        : null
    return {
      totalDeals: closed.length,
      soldCount: sold.length,
      heldCount: held.length,
      totalSaleValue,
      avgDaysToClose: avgDays,
    }
  }, [closed])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8 grid-fade">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 soft-panel rounded-3xl p-5 sm:p-6 border border-[var(--border-subtle)]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-label)] hover:text-[var(--accent-sky)] mb-2 no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-heading)] inline-flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[var(--accent-sky)]" />
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Your track record — every deal that closed or moved into long-term hold.
          </p>
        </header>

        <DataBoundary
          isLoading={query.isLoading}
          error={query.isError ? 'Could not load your portfolio' : null}
          onRetry={() => query.refetch()}
          isEmpty={!query.isLoading && closed.length === 0}
          emptyIcon={<Trophy className="w-8 h-8 text-[var(--text-label)]" />}
          emptyTitle="No closed deals yet"
          emptyDescription="When a deal hits Sold or Held, it shows up here as part of your track record."
        >
          {closed.length > 0 && (
            <>
              {/* Aggregate stats */}
              <section
                className="rounded-2xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <Stat label="Closed deals" value={String(stats.totalDeals)} />
                <Stat
                  label="Sold"
                  value={`${stats.soldCount}${stats.totalSaleValue ? ` · ${fmtMoney(stats.totalSaleValue)}` : ''}`}
                />
                <Stat label="Held long-term" value={String(stats.heldCount)} />
                <Stat
                  label="Avg days to close"
                  hint="Sold deals only"
                  value={stats.avgDaysToClose != null ? `${stats.avgDaysToClose}d` : '—'}
                />
              </section>

              {/* Filter + sort controls */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {(['all', 'sold', 'held'] as Filter[]).map((f) => {
                    const active = filter === f
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          active
                            ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                            : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {FILTER_LABELS[f]}
                      </button>
                    )
                  })}
                </div>
                <label className="ml-auto text-xs text-[var(--text-label)] inline-flex items-center gap-2">
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-xs text-[var(--text-heading)]"
                  >
                    {(['recent', 'sale_price', 'days_to_close'] as Sort[]).map((s) => (
                      <option key={s} value={s}>
                        {SORT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Grid */}
              {sorted.length === 0 ? (
                <p className="text-sm text-[var(--text-label)] text-center py-12">
                  No deals match this filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sorted.map((p) => (
                    <PortfolioCard key={p.id} property={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </DataBoundary>
      </div>
    </div>
  )
}

function Stat({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums text-[var(--text-heading)]">{value}</p>
      {hint && <p className="text-[10px] text-[var(--text-label)] mt-0.5">{hint}</p>}
    </div>
  )
}

function PortfolioCard({ property: p }: { property: SavedPropertySummary }) {
  const stage = p.flip_stage ?? null
  const stageLabel = stage ? STAGE_LABELS[stage] : '—'
  const strategyLabel = p.best_strategy
    ? (STRATEGY_LABELS[p.best_strategy] ?? p.best_strategy)
    : null
  const days = daysBetween(p.saved_at, terminalDate(p))
  const salePrice = stage === 'Sold' ? Number(p.sold_price ?? 0) : null

  return (
    <article className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-focus)] transition-all overflow-hidden flex flex-col">
      <Link href={`/deals/${p.id}`} className="block p-4 no-underline">
        <p className="text-sm font-semibold text-[var(--text-heading)] truncate">
          {p.nickname || p.address_street}
        </p>
        {(p.address_city || p.address_state) && (
          <p className="text-[11px] text-[var(--text-label)] truncate">
            {[p.address_city, p.address_state].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              stage === 'Sold'
                ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300'
                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]'
            }`}
          >
            {stageLabel}
          </span>
          {strategyLabel && (
            <span className="inline-flex text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              {strategyLabel}
            </span>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {salePrice != null && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
                Sale price
              </dt>
              <dd className="font-bold tabular-nums text-[var(--text-heading)]">
                {fmtMoneyFull(salePrice)}
              </dd>
            </div>
          )}
          {days != null && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-[var(--text-label)]">
                Days to close
              </dt>
              <dd className="font-bold tabular-nums text-[var(--text-heading)]">{days}d</dd>
            </div>
          )}
        </dl>
      </Link>
      <div className="border-t border-[var(--border-default)] px-4 py-2 text-right">
        <Link
          href={`/deals/${p.id}/report`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-label)] hover:text-[var(--accent-sky)] no-underline"
        >
          <FileText className="w-3 h-3" />
          {stage === 'Sold' ? 'Final profit statement' : 'Deal report'}
        </Link>
      </div>
    </article>
  )
}
