'use client'

import { useState, type ReactNode } from 'react'
import { CheckCircle2, ListChecks, Pencil, XCircle, Bot, User as UserIcon, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  useLinkedInActions,
  useMarketingQueue,
  useXActions,
  xWeightedLength,
  X_POST_MAX,
  type LinkedInPost,
  type LinkedInStatus,
  type XPost,
} from './useMarketingOps'
import { EmptyNote, ErrorNote, Panel, SkeletonRows, StatusPill, formatDateTime } from './shared'

// ===========================================
// Approval queue — the human gate
// ===========================================
// Mobile-first: one card per post, full-width approve/cancel.
// LinkedIn and X rows are interleaved by scheduled time; the card chrome
// (channel, status, provenance, actions) is shared, only the body differs.
// Only draft + approved rows are actionable; the rest are shown for context.
// ===========================================

const FILTERS: { id: LinkedInStatus | 'actionable'; label: string }[] = [
  { id: 'actionable', label: 'Needs action' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
]

type Channel = 'linkedin' | 'x'

type QueueItem = { channel: 'linkedin'; post: LinkedInPost } | { channel: 'x'; post: XPost }

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return 'Request failed'
}

function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
        channel === 'x' ? 'bg-slate-200/10 text-slate-100' : 'bg-sky-400/10 text-sky-300'
      }`}
    >
      {channel === 'x' ? 'X' : 'LI'}
    </span>
  )
}

interface CardShellProps {
  channel: Channel
  post: LinkedInPost | XPost
  subtitle?: string
  editing: boolean
  busy: boolean
  canSave: boolean
  onEdit: () => void
  onDiscard: () => void
  onSave: () => void
  onApprove: () => void
  onCancel: () => void
  children: ReactNode
}

function CardShell({
  channel,
  post,
  subtitle,
  editing,
  busy,
  canSave,
  onEdit,
  onDiscard,
  onSave,
  onApprove,
  onCancel,
  children,
}: CardShellProps) {
  const editable = post.status === 'draft' || post.status === 'approved'
  const isBot = post.created_by.startsWith('bot')

  return (
    <article className="rounded-lg border border-white/[0.07] bg-[var(--surface-elevated)] p-3 sm:p-4">
      <header className="flex flex-wrap items-center gap-2 mb-2">
        <ChannelBadge channel={channel} />
        <StatusPill status={post.status} />
        <span className="text-xs font-mono text-slate-400">{post.key}</span>
        {subtitle && <span className="text-xs text-slate-500 capitalize">{subtitle}</span>}
        <span
          className="inline-flex items-center gap-1 text-[11px] text-slate-500"
          title={isBot ? `Drafted by ${post.created_by}` : 'Written by a human'}
        >
          {isBot ? <Bot className="w-3 h-3" aria-hidden="true" /> : <UserIcon className="w-3 h-3" aria-hidden="true" />}
          {isBot ? post.created_by.replace('bot:', '') : 'human'}
        </span>
        <span className="ml-auto text-xs text-slate-400 tabular-nums">{formatDateTime(post.scheduled_at)}</span>
      </header>

      {children}

      {editing && (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy || !canSave}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-sky-500 disabled:opacity-50"
          >
            Save copy
          </button>
        </div>
      )}

      {post.error && <p className="mt-2 text-xs text-red-300">{post.error}</p>}
      {post.approved_by && post.status !== 'draft' && (
        <p className="mt-2 text-[11px] text-slate-500">
          {post.status === 'cancelled' ? 'Cancelled' : 'Approved'} by {post.approved_by}
        </p>
      )}

      {editable && !editing && (
        <footer className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-400/20 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" aria-hidden="true" />
            Cancel
          </button>
          {post.status === 'draft' ? (
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Approve
            </button>
          ) : (
            <span className="inline-flex items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2.5 text-xs font-semibold text-sky-300">
              Publishes {formatDateTime(post.scheduled_at)}
            </span>
          )}
        </footer>
      )}
    </article>
  )
}

const TEXTAREA_CLASS =
  'w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.1] p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500'

function LinkedInCard({ post }: { post: LinkedInPost }) {
  const { approve, cancel, edit } = useLinkedInActions()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(post.body)
  const busy = approve.isPending || cancel.isPending || edit.isPending

  return (
    <CardShell
      channel="linkedin"
      post={post}
      subtitle={post.account}
      editing={editing}
      busy={busy}
      canSave={body.trim().length > 0}
      onEdit={() => setEditing(true)}
      onDiscard={() => {
        setBody(post.body)
        setEditing(false)
      }}
      onSave={() =>
        edit.mutate(
          { id: post.id, patch: { body } },
          {
            onSuccess: () => {
              setEditing(false)
              toast.success('Copy updated')
            },
            onError: (err) => toast.error(errorMessage(err)),
          },
        )
      }
      onApprove={() =>
        approve.mutate(post.id, {
          onSuccess: () => toast.success(`Approved ${post.key}`),
          onError: (err) => toast.error(errorMessage(err)),
        })
      }
      onCancel={() =>
        cancel.mutate(post.id, {
          onSuccess: () => toast.success(`Cancelled ${post.key}`),
          onError: (err) => toast.error(errorMessage(err)),
        })
      }
    >
      {editing ? (
        <div className="space-y-1">
          <label htmlFor={`body-${post.id}`} className="sr-only">
            Post body
          </label>
          <textarea
            id={`body-${post.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={3000}
            className={TEXTAREA_CLASS}
          />
          <p className="text-[11px] text-slate-500">{body.length} / 3000</p>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{post.body}</p>
      )}

      {post.first_comment && (
        <p className="mt-2 text-xs text-slate-400 break-all">
          <span className="text-slate-500">First comment: </span>
          <a
            href={post.first_comment}
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 hover:underline inline-flex items-center gap-1"
          >
            {post.first_comment}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </p>
      )}
      {post.reshare_of_key && <p className="mt-1 text-xs text-slate-500">Reshare of {post.reshare_of_key}</p>}
      {post.media_type !== 'none' && (
        <p className="mt-1 text-xs text-slate-500">
          {post.media_type}: {post.media_path}
        </p>
      )}
    </CardShell>
  )
}

function XCard({ post }: { post: XPost }) {
  const { approve, cancel, edit } = useXActions()
  const [editing, setEditing] = useState(false)
  const [thread, setThread] = useState<string[]>(post.thread_json)
  const busy = approve.isPending || cancel.isPending || edit.isPending
  const overLimit = thread.some((t) => xWeightedLength(t) > X_POST_MAX)
  const canSave = thread.every((t) => t.trim().length > 0) && !overLimit
  const publishedCount = post.published_ids.length + (post.x_post_id ? 1 : 0)

  return (
    <CardShell
      channel="x"
      post={post}
      subtitle={post.thread_json.length > 1 ? `thread of ${post.thread_json.length}` : undefined}
      editing={editing}
      busy={busy}
      canSave={canSave}
      onEdit={() => setEditing(true)}
      onDiscard={() => {
        setThread(post.thread_json)
        setEditing(false)
      }}
      onSave={() =>
        edit.mutate(
          { id: post.id, patch: { thread } },
          {
            onSuccess: () => {
              setEditing(false)
              toast.success('Thread updated')
            },
            onError: (err) => toast.error(errorMessage(err)),
          },
        )
      }
      onApprove={() =>
        approve.mutate(post.id, {
          onSuccess: () => toast.success(`Approved ${post.key}`),
          onError: (err) => toast.error(errorMessage(err)),
        })
      }
      onCancel={() =>
        cancel.mutate(post.id, {
          onSuccess: () => toast.success(`Cancelled ${post.key}`),
          onError: (err) => toast.error(errorMessage(err)),
        })
      }
    >
      <ol className="space-y-2">
        {(editing ? thread : post.thread_json).map((text, index) => {
          const length = xWeightedLength(text)
          const over = length > X_POST_MAX
          return (
            <li key={index} className="flex gap-2">
              <span className="mt-1 shrink-0 w-5 text-[11px] font-mono text-slate-500 tabular-nums">{index + 1}/</span>
              {editing ? (
                <div className="flex-1 space-y-1">
                  <label htmlFor={`x-${post.id}-${index}`} className="sr-only">
                    Post {index + 1} of thread
                  </label>
                  <textarea
                    id={`x-${post.id}-${index}`}
                    value={text}
                    onChange={(e) => setThread(thread.map((t, i) => (i === index ? e.target.value : t)))}
                    rows={3}
                    className={`${TEXTAREA_CLASS} ${over ? 'border-red-400/60' : ''}`}
                  />
                  <p className={`text-[11px] tabular-nums ${over ? 'text-red-300' : 'text-slate-500'}`}>
                    {length} / {X_POST_MAX} (links count as 23)
                  </p>
                </div>
              ) : (
                <p className="flex-1 whitespace-pre-wrap text-sm text-slate-200 leading-relaxed break-words">{text}</p>
              )}
            </li>
          )
        })}
      </ol>
      {post.status === 'publishing' && publishedCount > 0 && (
        <p className="mt-2 text-xs text-amber-300">
          {publishedCount} of {post.thread_json.length} posts live; the publisher resumes on its next tick.
        </p>
      )}
      {post.x_post_id && post.status === 'published' && (
        <a
          href={`https://x.com/i/web/status/${post.x_post_id}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
        >
          View on X
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      )}
    </CardShell>
  )
}

export function ApprovalQueueSection() {
  const { data, isLoading, error } = useMarketingQueue()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('actionable')

  const items: QueueItem[] = [
    ...(data?.linkedin ?? []).map((post): QueueItem => ({ channel: 'linkedin', post })),
    ...(data?.x ?? []).map((post): QueueItem => ({ channel: 'x', post })),
  ].sort((a, b) => new Date(a.post.scheduled_at).getTime() - new Date(b.post.scheduled_at).getTime())
  const visible = items.filter(({ post }) => (filter === 'actionable' ? post.status === 'draft' : post.status === filter))
  const draftCount = items.filter(({ post }) => post.status === 'draft').length

  return (
    <Panel
      title={`Approval queue${draftCount ? ` (${draftCount})` : ''}`}
      icon={ListChecks}
      action={
        <div role="tablist" aria-label="Queue filter" className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <SkeletonRows rows={3} />}
      {error && <ErrorNote>Could not load the queue. {errorMessage(error)}</ErrorNote>}
      {data && visible.length === 0 && (
        <EmptyNote>
          {filter === 'actionable'
            ? 'Nothing waiting. LinkedIn and X drafts from the Content Drafter bot or a YAML import will appear here.'
            : `No ${filter} posts.`}
        </EmptyNote>
      )}
      <div className="space-y-3">
        {visible.map((item) =>
          item.channel === 'linkedin' ? (
            <LinkedInCard key={item.post.id} post={item.post} />
          ) : (
            <XCard key={item.post.id} post={item.post} />
          ),
        )}
      </div>
    </Panel>
  )
}
