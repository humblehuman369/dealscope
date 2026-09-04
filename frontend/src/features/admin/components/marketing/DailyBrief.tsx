'use client'

import { useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useBriefs, useReviewBrief, type Brief } from './useMarketingOps'
import { EmptyNote, ErrorNote, Panel, SkeletonRows, StatusPill, formatDateTime } from './shared'

// ===========================================
// Briefs — daily (bot-authored) and Monday weekly rollup (cron), human-reviewed
// ===========================================

// No typography plugin in this project; style the handful of tags briefs use.
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h3 className="text-base font-bold text-slate-100 mt-4 mb-2 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="text-sm font-bold text-slate-100 mt-4 mb-1.5 first:mt-0">{children}</h4>,
  h3: ({ children }) => (
    <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-3 mb-1">{children}</h5>
  ),
  p: ({ children }) => <p className="mb-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  strong: ({ children }) => <strong className="text-slate-100 font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[12px] text-slate-200">{children}</code>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold text-slate-300 border-b border-white/[0.1] px-2 py-1">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-white/[0.06] px-2 py-1 tabular-nums">{children}</td>,
}

// Capturing group keeps the URLs in the split output. A /g regex is stateful under
// .test(), so the per-part check is a separate anchored, non-global pattern.
const URL_SPLIT_RE = /(https?:\/\/[^\s)]+)/g
const IS_URL_RE = /^https?:\/\//

// Highlight bullets are plain strings; make any URL (PR, preview, post) clickable.
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT_RE)
  return (
    <>
      {parts.map((part, i) =>
        IS_URL_RE.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

function Highlights({ highlights }: { highlights: Record<string, unknown> }) {
  const entries = Object.entries(highlights).filter(([, v]) => Array.isArray(v) && v.length > 0)
  if (entries.length === 0) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 mb-4">
      {entries.map(([key, values]) => (
        <div key={key} className="rounded-lg border border-white/[0.07] bg-[var(--surface-elevated)] p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            {key.replace(/_/g, ' ')}
          </h4>
          <ul className="space-y-1 text-sm text-slate-200 list-disc pl-4">
            {(values as unknown[]).map((v, i) => (
              <li key={i}>{typeof v === 'string' ? <Linkified text={v} /> : JSON.stringify(v)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BriefView({ brief }: { brief: Brief }) {
  const review = useReviewBrief()
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusPill status={brief.status} />
        {brief.kind === 'weekly' && (
          <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
            Weekly rollup
          </span>
        )}
        <span className="text-xs text-slate-400">
          by {brief.created_by} · {formatDateTime(brief.updated_at)}
        </span>
        {brief.reviewed_by && (
          <span className="text-xs text-slate-500">
            reviewed by {brief.reviewed_by} {formatDateTime(brief.reviewed_at)}
          </span>
        )}
        {brief.status === 'draft' && (
          <button
            type="button"
            onClick={() =>
              review.mutate(brief.id, {
                onSuccess: () => toast.success('Brief marked reviewed'),
                onError: () => toast.error('Could not mark reviewed'),
              })
            }
            disabled={review.isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Mark reviewed
          </button>
        )}
      </div>
      <Highlights highlights={brief.highlights} />
      <div className="text-sm text-slate-300 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {brief.body_md}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export function DailyBriefSection() {
  const { data, isLoading, error } = useBriefs()
  const [selected, setSelected] = useState<string | null>(null)
  const briefs = data ?? []
  const active = briefs.find((b) => b.id === selected) ?? briefs[0]

  return (
    <Panel
      title="Briefs"
      icon={FileText}
      action={
        briefs.length > 1 ? (
          <label className="text-xs text-slate-400 flex items-center gap-2">
            <span className="sr-only">Brief date</span>
            <select
              value={active?.id ?? ''}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-md bg-[var(--surface-base)] border border-white/[0.1] px-2 py-1 text-xs text-slate-200"
            >
              {briefs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.date}
                  {b.kind === 'weekly' ? ' · weekly' : ''}
                  {b.status === 'draft' ? ' · unreviewed' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : undefined
      }
    >
      {isLoading && <SkeletonRows rows={4} />}
      {error && <ErrorNote>Could not load briefs.</ErrorNote>}
      {data && !active && (
        <EmptyNote>No brief yet. The Metrics Analyst bot files one each morning after the metrics pull.</EmptyNote>
      )}
      {active && <BriefView brief={active} />}
    </Panel>
  )
}
