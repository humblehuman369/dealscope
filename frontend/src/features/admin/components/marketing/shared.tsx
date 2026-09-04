'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Bot } from 'lucide-react'
import type { MetricSource } from './useMarketingOps'

// ===========================================
// Marketing Ops Hub — shared primitives
// ===========================================
// Same dark-fintech vocabulary as the rest of /admin:
// --surface-card panels, white/7% borders, sky accent.
// ===========================================

export function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: LucideIcon
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 bg-[var(--surface-card)] rounded-xl border border-white/[0.07]">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-b border-white/[0.07]">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Icon className="w-4 h-4 text-sky-400" aria-hidden="true" />
          {title}
        </h2>
        {action && <div className="min-w-0 max-w-full">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 py-2">{children}</p>
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {children}
    </p>
  )
}

/** Provenance badge. Bot-captured numbers are unverified and must say so. */
export function SourceBadge({ source }: { source: MetricSource }) {
  if (source === 'bot_capture') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
        title="Captured by a bot from a third-party dashboard. Not verified against an API."
      >
        <Bot className="w-3 h-3" aria-hidden="true" />
        bot capture
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {source.replace('_', ' ')}
    </span>
  )
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
  approved: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  publishing: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  published: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  failed: 'bg-red-400/10 text-red-300 border-red-400/20',
  cancelled: 'bg-white/[0.04] text-slate-500 border-white/[0.08]',
  reviewed: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  running: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  succeeded: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  ok: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  overdue: 'bg-red-400/10 text-red-300 border-red-400/20',
  pending_first_run: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
  unknown: 'bg-white/[0.04] text-slate-500 border-white/[0.08]',
}

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unknown
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function formatNumber(value: number | null): string {
  if (value === null) return '—'
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
