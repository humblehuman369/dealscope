'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity, ExternalLink, RefreshCw } from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { EmptyNote, ErrorNote, Panel, SkeletonRows, formatNumber } from '../marketing/shared'
import {
  useRefreshTrafficBoard,
  useTrafficBoard,
  type TrafficBoard as TrafficBoardData,
  type TrafficSeries,
  type TrafficSource,
  type TrafficWindow,
} from './useTrafficBoard'

// ===========================================
// Traffic Board — /admin/traffic
// ===========================================
// The founder's one page: where visitors come from and what they do.
// Same dark-fintech vocabulary as /admin/marketing. Numbers are live from
// PostHog (consented visitors only); GA4 opens in its own tab.
// ===========================================

const WINDOWS: TrafficWindow[] = [7, 14, 28]
const GA4_PROPERTY = 'p553039247'
const POSTHOG_PROJECT = '463676'

// Small multiples in this order; anything else the backend returns is appended.
const SERIES_ORDER = ['Visitors', 'Analyses', 'Signups', 'Activated', 'Checkouts', 'Paid']

function pct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—'
  return `${Math.round(v * 10) / 10}%`
}

function duration(s: number | null): string {
  if (s === null || Number.isNaN(s)) return '—'
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ---- KPI tiles ---------------------------------------------------------

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--surface-card)] border border-white/[0.07] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-2xl text-slate-100 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{note}</div>
    </div>
  )
}

// ---- Sparkline ---------------------------------------------------------

function Sparkline({ series, total }: { series: TrafficSeries; total: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const data = series.data
  const w = 300
  const h = 56
  const padT = 6
  const padB = 2
  const max = Math.max(1, ...data)
  const n = data.length
  const step = n > 1 ? w / (n - 1) : w
  const y = (v: number) => padT + (h - padT - padB) * (1 - v / max)
  const pts = data.map((v, i) => [i * step, y(v)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${((n - 1) * step).toFixed(1)} ${h} L0 ${h} Z`
  const last = pts[pts.length - 1]
  const first = series.days[0]
  const lastDay = series.days[series.days.length - 1]
  const label =
    series.name === 'Visitors' ? 'Unique visitors per day' : `${series.name} per day`

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="font-mono text-sm text-slate-100 tabular-nums">
          {hover === null
            ? formatNumber(total)
            : `${shortDay(series.days[hover] ?? '')} · ${formatNumber(data[hover] ?? null)}`}
        </span>
      </div>
      {n === 0 ? (
        <EmptyNote>No data in this window.</EmptyNote>
      ) : (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="mt-1 block h-16 w-full overflow-visible"
          aria-hidden="true"
          onMouseLeave={() => setHover(null)}
        >
          <line x1="0" x2={w} y1={y(max).toFixed(1)} y2={y(max).toFixed(1)} stroke="rgba(255,255,255,0.07)" />
          <line x1="0" x2={w} y1={y(max / 2).toFixed(1)} y2={y(max / 2).toFixed(1)} stroke="rgba(255,255,255,0.07)" />
          <path d={area} fill="rgb(56 189 248)" fillOpacity="0.14" />
          <path
            d={line}
            fill="none"
            stroke="rgb(56 189 248)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {last && (
            <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="3.5" fill="rgb(56 189 248)" stroke="var(--surface-card)" strokeWidth="2" />
          )}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p[0].toFixed(1)}
              cy={p[1].toFixed(1)}
              r="9"
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{first ? shortDay(first) : ''}</span>
        <span>{lastDay ? shortDay(lastDay) : ''}</span>
      </div>
    </div>
  )
}

// ---- Funnel ------------------------------------------------------------

function Funnel({ board }: { board: TrafficBoardData }) {
  const byName = Object.fromEntries(board.series.map((s) => [s.name, s.total]))
  const visitors = board.overview.visitors ?? 0
  const steps: { label: string; value: number | null; people: boolean; note?: string }[] = [
    { label: 'Visitors', value: board.overview.visitors, people: true, note: 'unique people' },
    { label: 'Analyses', value: byName.Analyses ?? null, people: false, note: 'verdicts viewed (events)' },
    { label: 'Signups', value: byName.Signups ?? null, people: true },
    { label: 'Activated', value: byName.Activated ?? null, people: true },
    { label: 'Checkouts', value: byName.Checkouts ?? null, people: true },
    { label: 'Paid', value: byName.Paid ?? null, people: true },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {steps.map((s, i) => {
        const v = s.value ?? 0
        const rate = i > 0 && s.people && visitors ? Math.round((v / visitors) * 100) : null
        const width = visitors ? Math.min(100, Math.max(2, Math.round((v / visitors) * 100))) : 0
        return (
          <div key={s.label} className="rounded-lg bg-white/[0.04] px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
            <div className="font-mono text-xl text-slate-100 tabular-nums">{formatNumber(s.value)}</div>
            <div className="text-xs text-slate-500">
              {s.note ?? (rate === null ? '—' : `${rate}% of visitors`)}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded bg-white/[0.07]">
              <div className="h-full rounded bg-sky-400" style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Sources table -----------------------------------------------------

function SourcesTable({ rows }: { rows: TrafficSource[] }) {
  if (rows.length === 0) return <EmptyNote>No sessions in this window yet.</EmptyNote>
  const untagged = rows.filter((r) => !r.tagged).reduce((a, r) => a + (r.share_pct ?? 0), 0)
  return (
    <div>
      {untagged >= 50 && (
        <p className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {Math.round(untagged)}% of visitors arrived with no UTM tag. Every link posted off-site needs one — see
          docs/marketing/TRACKING_PLAN.md.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-2 py-1.5">Source</th>
              <th className="px-2 py-1.5 text-right">Visitors</th>
              <th className="px-2 py-1.5 text-right">Views</th>
              <th className="px-2 py-1.5 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const detail = r.tagged
                ? [r.medium, r.campaign].filter(Boolean).join(' · ') || 'tagged, no medium'
                : r.source === 'Direct'
                  ? 'no referrer, no UTM'
                  : 'referral, no UTM'
              return (
                <tr key={`${r.source}-${i}`} className="border-t border-white/[0.07]">
                  <td className="px-2 py-2">
                    <div className="font-semibold text-slate-200">{r.source}</div>
                    <div className="text-xs text-slate-500">{detail}</div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-200">{formatNumber(r.visitors)}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-200">{formatNumber(r.views)}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-200">{pct(r.share_pct)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---- Page --------------------------------------------------------------

function ToolLink({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-transparent bg-white/[0.04] px-3 py-2.5 hover:border-sky-400/40"
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
        {title}
        <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      </div>
      <div className="text-xs text-slate-500">{note}</div>
    </a>
  )
}

export function TrafficBoardPage() {
  const [days, setDays] = useState<TrafficWindow>(14)
  const [refreshing, setRefreshing] = useState(false)
  const { data, isLoading, error } = useTrafficBoard(days)
  const refresh = useRefreshTrafficBoard(days)

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const series = data
    ? [...data.series].sort((a, b) => {
        const ia = SERIES_ORDER.indexOf(a.name)
        const ib = SERIES_ORDER.indexOf(b.name)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
    : []

  return (
    <AuthGuard requireAdmin>
      <div
        className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-3">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Admin
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-400/10 rounded-lg border border-sky-400/20">
                  <Activity className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Traffic</h1>
                  <p className="text-slate-400 text-sm">Where visitors come from and what they do. Live from PostHog.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-white/[0.07]" role="group" aria-label="Window">
                  {WINDOWS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={days === w}
                      onClick={() => setDays(w)}
                      className={`px-3 py-1.5 text-sm font-semibold ${
                        days === w ? 'bg-sky-400/10 text-sky-300' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {w} days
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[var(--surface-card)] px-3 py-1.5 text-sm font-semibold text-slate-300 hover:text-slate-100 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Refresh
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data
                ? `${data.cached ? 'Cached' : 'Fetched'} ${new Date(data.generated_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })} · last ${data.days} days · consented visitors only`
                : 'Loading…'}
            </p>
          </div>

          {error && <ErrorNote>Could not load traffic: {(error as Error).message}</ErrorNote>}
          {data && !data.configured && (
            <ErrorNote>
              PostHog is not configured on the backend. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID, then redeploy.
            </ErrorNote>
          )}
          {data && data.configured && data.error && <ErrorNote>{data.error}</ErrorNote>}

          {isLoading && <SkeletonRows rows={4} />}

          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <Kpi label="Visitors" value={formatNumber(data.overview.visitors)} note="unique, this window" />
                <Kpi label="Sessions" value={formatNumber(data.overview.sessions)} note={`avg ${duration(data.overview.session_duration_s)}`} />
                <Kpi label="Bounce rate" value={pct(data.overview.bounce_rate_pct)} note="left after one page" />
                <Kpi label="Signups" value={formatNumber(series.find((s) => s.name === 'Signups')?.total ?? null)} note="free accounts" />
                <Kpi label="Analyses" value={formatNumber(series.find((s) => s.name === 'Analyses')?.total ?? null)} note="verdicts viewed" />
                <Kpi label="Paid" value={formatNumber(series.find((s) => s.name === 'Paid')?.total ?? null)} note="Pro subscriptions" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Day by day" icon={Activity}>
                  <p className="mb-3 text-xs text-slate-500">Each chart has its own scale. The number on the right is the window total; hover a point for a day.</p>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    {series.map((s) => (
                      <Sparkline key={s.name} series={s} total={s.name === 'Visitors' ? data.overview.visitors : s.total} />
                    ))}
                  </div>
                </Panel>
                <Panel title="Free-to-paid funnel" icon={Activity}>
                  <p className="mb-3 text-xs text-slate-500">
                    Window totals as a share of unique visitors. A visitor can run an analysis before creating an account, so analyses count events, not people.
                  </p>
                  <Funnel board={data} />
                </Panel>
              </div>

              <Panel title="Where visitors came from" icon={Activity}>
                <p className="mb-3 text-xs text-slate-500">First-touch source · medium · campaign for the window.</p>
                <SourcesTable rows={data.sources} />
              </Panel>

              <Panel title="Open the full tools" icon={ExternalLink}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ToolLink
                    href={`https://analytics.google.com/analytics/web/#/${GA4_PROPERTY}/realtime/overview`}
                    title="GA4 Realtime"
                    note="Is the tag firing right now?"
                  />
                  <ToolLink
                    href={`https://analytics.google.com/analytics/web/#/${GA4_PROPERTY}/reports/explorer?params=_u..nav%3Dmaui&r=lifecycle-traffic-acquisition-v2`}
                    title="GA4 Traffic acquisition"
                    note="Source / medium with key events"
                  />
                  <ToolLink
                    href={`https://us.posthog.com/project/${POSTHOG_PROJECT}/web`}
                    title="PostHog Web analytics"
                    note="Full breakdowns, replays, funnels"
                  />
                </div>
              </Panel>

              <p className="text-xs text-slate-500 max-w-3xl">
                Counts include only visitors who accepted analytics cookies, so they run below ad-platform numbers. Treat the ratios as solid and the absolute counts as a floor.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
