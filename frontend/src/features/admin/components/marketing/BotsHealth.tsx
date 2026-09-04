'use client'

import { Activity, AlertTriangle, Bot, CheckCircle2, XCircle } from 'lucide-react'
import { useBotRuns, useMarketingHealth } from './useMarketingOps'
import { ErrorNote, Panel, SkeletonRows, SourceBadge, StatusPill, formatDateTime, formatRelative } from './shared'

// ===========================================
// Bots & integrations health
// ===========================================

function Flag({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  const Icon = ok ? CheckCircle2 : XCircle
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ok ? 'text-emerald-400' : 'text-slate-500'}`} aria-hidden="true" />
      <div>
        <span className="text-slate-200">{label}</span>
        {detail && <span className="block text-xs text-slate-500">{detail}</span>}
      </div>
    </li>
  )
}

export function BotsHealthSection() {
  const health = useMarketingHealth()
  const runs = useBotRuns(15)

  return (
    <Panel title="Bots & integrations" icon={Activity}>
      {health.isLoading && <SkeletonRows rows={4} />}
      {health.error && <ErrorNote>Could not load health.</ErrorNote>}
      {health.data && (
        <div className="space-y-4">
          {health.data.linkedin_token_warnings.length > 0 && (
            <div role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              <p className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                LinkedIn token attention
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                {health.data.linkedin_token_warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            <Flag
              ok={health.data.linkedin_publish_enabled}
              label={health.data.linkedin_publish_enabled ? 'LinkedIn publishing live' : 'LinkedIn publisher in dry run'}
              detail="LINKEDIN_PUBLISH_ENABLED on Railway"
            />
            <Flag
              ok={health.data.x_publish_enabled}
              label={health.data.x_publish_enabled ? 'X publishing live' : 'X publisher in dry run'}
              detail={
                health.data.x_api_configured
                  ? 'X_PUBLISH_ENABLED on Railway'
                  : 'X_API_KEY / X_ACCESS_TOKEN not set; nothing can post'
              }
            />
            <Flag ok={health.data.bot_api_configured} label="Bot API token configured" detail="MARKETING_BOT_TOKEN" />
            <Flag
              ok={health.data.posthog_pull_configured}
              label="PostHog funnel pull"
              detail="POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID"
            />
            <Flag
              ok={health.data.gsc_pull_configured}
              label="Search Console pull"
              detail="GSC_SERVICE_ACCOUNT_JSON + GSC_SITE_URL"
            />
          </ul>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Scheduled jobs</h3>
            <ul className="space-y-1">
              {Object.entries(health.data.jobs).map(([name, job]) => (
                <li key={name} className="flex items-center gap-2 text-sm">
                  <StatusPill status={job.status} />
                  <span className="font-mono text-xs text-slate-300">{name}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    last ok {formatRelative(job.last_success)}
                  </span>
                </li>
              ))}
              {Object.keys(health.data.jobs).length === 0 && (
                <li className="text-xs text-slate-500">No heartbeat yet.</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Metric sources</h3>
            {health.data.sources.length === 0 ? (
              <p className="text-xs text-slate-500">No metric rows yet.</p>
            ) : (
              <ul className="space-y-1">
                {health.data.sources.map((s) => (
                  <li key={s.source} className="flex items-center gap-2 text-sm">
                    <SourceBadge source={s.source} />
                    <span className="text-xs text-slate-400">{s.rows_7d} rows / 7d</span>
                    <span className="ml-auto text-xs text-slate-500">last {formatRelative(s.last_captured_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Bots</h3>
            {health.data.bots.length === 0 ? (
              <p className="text-xs text-slate-500">
                No bot has checked in. Each routine must POST a run to /api/v1/marketing/bot/runs first.
              </p>
            ) : (
              <ul className="space-y-1">
                {health.data.bots.map((b) => (
                  <li key={b.bot_name} className="flex items-center gap-2 text-sm">
                    <Bot className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    <span className="text-slate-200">{b.bot_name}</span>
                    {b.last_run && <StatusPill status={b.last_run.status} />}
                    <span className="ml-auto text-xs text-slate-500">{formatRelative(b.last_run?.started_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {runs.data && runs.data.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-200">
            Recent runs ({runs.data.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {runs.data.map((run) => (
              <li key={run.id} className="rounded-md border border-white/[0.06] bg-[var(--surface-elevated)] px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={run.status} />
                  <span className="text-slate-200">{run.bot_name}</span>
                  <span className="text-slate-500">{run.routine}</span>
                  <span className="ml-auto text-slate-500 tabular-nums">{formatDateTime(run.started_at)}</span>
                </div>
                {run.summary && <p className="mt-1 text-slate-400">{run.summary}</p>}
                {run.error && <p className="mt-1 text-red-300">{run.error}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  )
}
