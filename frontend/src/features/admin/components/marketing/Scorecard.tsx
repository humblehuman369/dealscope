'use client'

import { useState } from 'react'
import { BarChart3, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useScorecard, type ScorecardCell } from './useMarketingOps'
import { EmptyNote, ErrorNote, Panel, SkeletonRows, SourceBadge, formatNumber } from './shared'

// ===========================================
// Scorecard — funnel by channel, window vs prior window
// ===========================================

const FUNNEL_ORDER = ['sessions', 'signups', 'verdicts', 'activations', 'checkouts_started', 'paid_conversions']
const METRIC_LABELS: Record<string, string> = {
  sessions: 'Sessions',
  signups: 'Signups',
  verdicts: 'Verdicts',
  activations: 'Activated',
  checkouts_started: 'Checkouts',
  paid_conversions: 'Paid',
  spend: 'Spend',
  leads: 'Leads',
  clicks: 'Clicks',
  impressions: 'Impressions',
  search_clicks: 'Search clicks',
  search_impressions: 'Search impressions',
  followers: 'Followers',
  engagements: 'Engagements',
}
const CHANNEL_LABELS: Record<string, string> = {
  site: 'Site',
  linkedin: 'LinkedIn',
  x: 'X',
  blog_seo: 'Blog + SEO',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
}
const CHANNEL_ORDER = ['site', 'linkedin', 'x', 'blog_seo', 'meta_ads', 'google_ads']
const WINDOWS = [7, 28] as const

function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key.replace(/_/g, ' ')
}

function metricSort(a: string, b: string): number {
  const ia = FUNNEL_ORDER.indexOf(a)
  const ib = FUNNEL_ORDER.indexOf(b)
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  return a.localeCompare(b)
}

function Delta({ current, previous, invert = false }: { current: number | null; previous: number | null; invert?: boolean }) {
  if (current === null || previous === null || previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
        <Minus className="w-3 h-3" aria-hidden="true" />
        n/a
      </span>
    )
  }
  const pct = ((current - previous) / previous) * 100
  const up = pct >= 0
  const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${good ? 'text-emerald-300' : 'text-red-300'}`}
      aria-label={`${up ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)} percent vs prior window`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function ChannelCard({ channel, cells }: { channel: string; cells: ScorecardCell[] }) {
  const sorted = [...cells].sort((a, b) => metricSort(a.metric, b.metric))
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[var(--surface-elevated)] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
        {label(CHANNEL_LABELS, channel)}
      </h3>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map((cell) => (
          <div key={cell.metric}>
            <dt className="text-[11px] text-slate-500">{label(METRIC_LABELS, cell.metric)}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-bold text-slate-100 tabular-nums">
                {cell.metric === 'spend' && cell.current !== null ? '$' : ''}
                {formatNumber(cell.current)}
              </span>
              <Delta current={cell.current} previous={cell.previous} invert={cell.metric === 'spend'} />
            </dd>
            <div className="mt-1 flex flex-wrap gap-1">
              {cell.sources.map((s) => (
                <SourceBadge key={s} source={s} />
              ))}
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ScorecardSection() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(7)
  const { data, isLoading, error } = useScorecard(days)

  const byChannel = new Map<string, ScorecardCell[]>()
  for (const cell of data?.cells ?? []) {
    const list = byChannel.get(cell.channel) ?? []
    list.push(cell)
    byChannel.set(cell.channel, list)
  }
  const channels = [...byChannel.keys()].sort(
    (a, b) => (CHANNEL_ORDER.indexOf(a) + 99) % 99 - ((CHANNEL_ORDER.indexOf(b) + 99) % 99),
  )

  return (
    <Panel
      title="Scorecard"
      icon={BarChart3}
      action={
        <div role="radiogroup" aria-label="Window" className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={days === w}
              onClick={() => setDays(w)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                days === w
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-slate-200'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <SkeletonRows rows={4} />}
      {error && <ErrorNote>Could not load the scorecard. {String((error as Error).message ?? '')}</ErrorNote>}
      {data && channels.length === 0 && (
        <EmptyNote>
          No metrics yet. The daily <code className="text-slate-300">marketing-metrics</code> job and the
          Metrics Analyst bot write here. Deltas compare the last {days} days with the {days} before.
        </EmptyNote>
      )}
      {data && channels.length > 0 && (
        <>
          <p className="text-[11px] text-slate-500 mb-3">
            {data.window_start} → {data.window_end}, vs the prior {days} days. Amber badges mark numbers a bot read
            off a third-party dashboard; treat them as unverified.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {channels.map((channel) => (
              <ChannelCard key={channel} channel={channel} cells={byChannel.get(channel) ?? []} />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
