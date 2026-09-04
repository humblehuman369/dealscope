'use client'

import { CalendarDays, ExternalLink, GitPullRequest } from 'lucide-react'
import { useBlogPrs, useMarketingQueue, type LinkedInPost, type XPost } from './useMarketingOps'
import { EmptyNote, Panel, SkeletonRows, StatusPill, formatRelative } from './shared'

// ===========================================
// Content calendar — next 14 days of scheduled posts + recent blog dates
// ===========================================

export interface BlogCalendarItem {
  slug: string
  title: string
  date_published: string
}

interface CalendarEntry {
  key: string
  when: Date
  kind: 'linkedin' | 'x' | 'blog'
  label: string
  status?: string
  href?: string
}

const KIND_BADGE: Record<CalendarEntry['kind'], { label: string; className: string }> = {
  linkedin: { label: 'LI', className: 'bg-sky-400/10 text-sky-300' },
  x: { label: 'X', className: 'bg-slate-200/10 text-slate-100' },
  blog: { label: 'Blog', className: 'bg-teal-400/10 text-teal-300' },
}

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function entriesFor(
  posts: LinkedInPost[],
  xPosts: XPost[],
  blog: BlogCalendarItem[],
  now: Date,
): Map<string, CalendarEntry[]> {
  const start = new Date(now.getTime() - 2 * DAY_MS)
  const end = new Date(now.getTime() + 14 * DAY_MS)
  const entries: CalendarEntry[] = []

  for (const post of posts) {
    if (post.status === 'cancelled') continue
    const when = new Date(post.scheduled_at)
    if (when < start || when > end) continue
    entries.push({
      key: post.id,
      when,
      kind: 'linkedin',
      label: `${post.account === 'founder' ? 'Founder' : 'Company'} · ${post.body.split('\n')[0].slice(0, 80)}`,
      status: post.status,
    })
  }
  for (const post of xPosts) {
    if (post.status === 'cancelled') continue
    const when = new Date(post.scheduled_at)
    if (when < start || when > end) continue
    const head = post.thread_json[0]?.split('\n')[0].slice(0, 80) ?? post.key
    entries.push({
      key: post.id,
      when,
      kind: 'x',
      label: post.thread_json.length > 1 ? `Thread (${post.thread_json.length}) · ${head}` : head,
      status: post.status,
    })
  }
  for (const item of blog) {
    const when = new Date(`${item.date_published}T12:00:00Z`)
    if (Number.isNaN(when.getTime()) || when < start || when > end) continue
    entries.push({
      key: `blog-${item.slug}`,
      when,
      kind: 'blog',
      label: item.title,
      href: `/blog/${item.slug}`,
    })
  }

  entries.sort((a, b) => a.when.getTime() - b.when.getTime())
  const byDay = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    const k = dayKey(entry.when)
    byDay.set(k, [...(byDay.get(k) ?? []), entry])
  }
  return byDay
}

// Blog drafts arrive as GitHub PRs on bot/blog/* branches; merge is the approval.
function BlogDraftsInReview() {
  const { data } = useBlogPrs()
  if (!data || data.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        Blog drafts in review ({data.length})
      </h3>
      <ul className="space-y-1">
        {data.map((pr) => (
          <li
            key={pr.number}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-teal-400/20 bg-[var(--surface-elevated)] px-3 py-2 text-sm"
          >
            <GitPullRequest className="w-4 h-4 shrink-0 text-teal-300" aria-hidden="true" />
            <a href={pr.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-slate-200 hover:text-teal-300">
              {pr.title}
            </a>
            <span className="text-xs text-slate-500">#{pr.number}</span>
            {pr.preview_url ? (
              <a
                href={pr.preview_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:underline"
              >
                Preview
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-xs text-slate-500">preview building</span>
            )}
            <span className="ml-auto text-xs text-slate-500">{formatRelative(pr.updated_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ContentCalendarSection({ blog }: { blog: BlogCalendarItem[] }) {
  const { data, isLoading } = useMarketingQueue()
  const byDay = entriesFor(data?.linkedin ?? [], data?.x ?? [], blog, new Date())
  const days = [...byDay.keys()]

  return (
    <Panel title="Calendar (next 14 days)" icon={CalendarDays}>
      <BlogDraftsInReview />
      {isLoading && <SkeletonRows rows={3} />}
      {!isLoading && days.length === 0 && (
        <EmptyNote>Nothing scheduled in the next two weeks.</EmptyNote>
      )}
      <ol className="space-y-3">
        {days.map((day) => (
          <li key={day}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              {new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
            <ul className="space-y-1">
              {(byDay.get(day) ?? []).map((entry) => (
                <li
                  key={entry.key}
                  className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${KIND_BADGE[entry.kind].className}`}
                  >
                    {KIND_BADGE[entry.kind].label}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {entry.kind !== 'blog'
                      ? entry.when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : ''}
                  </span>
                  {entry.href ? (
                    <a href={entry.href} className="truncate text-slate-200 hover:text-sky-300" target="_blank" rel="noreferrer">
                      {entry.label}
                    </a>
                  ) : (
                    <span className="truncate text-slate-200">{entry.label}</span>
                  )}
                  {entry.status && (
                    <span className="ml-auto shrink-0">
                      <StatusPill status={entry.status} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
