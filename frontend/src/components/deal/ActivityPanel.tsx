'use client'

/**
 * Activity panel — merged event timeline grouped by day. Pinned note input
 * at the top so adding a quick observation is the first affordance.
 */

import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  ListChecks,
  Plus,
  Send,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react'
import { useAddNote, useDeleteNote, useTimeline } from '@/hooks/useTimeline'
import type { TimelineEvent, TimelineEventKind } from '@/types/timeline'

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const dayOf = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dayOf.getTime() === today.getTime()) return 'Today'
  if (dayOf.getTime() === yesterday.getTime()) return 'Yesterday'
  const includeYear = d.getFullYear() !== now.getFullYear()
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
  })
}

function visualForKind(kind: TimelineEventKind): {
  Icon: React.ComponentType<{ className?: string }>
  color: string
} {
  switch (kind) {
    case 'status_change':
    case 'flip_stage_change':
      return { Icon: ArrowRight, color: '#0ea5e9' }
    case 'task_added':
      return { Icon: ListChecks, color: '#94a3b8' }
    case 'task_completed':
      return { Icon: CheckCircle2, color: '#10b981' }
    case 'task_reopened':
      return { Icon: Circle, color: '#94a3b8' }
    case 'expense_added':
      return { Icon: Plus, color: '#f59e0b' }
    case 'budget_locked':
      return { Icon: ListChecks, color: '#8b5cf6' }
    case 'contact_added':
      return { Icon: Users, color: '#06b6d4' }
    case 'document_added':
      return { Icon: FileText, color: '#6366f1' }
    case 'note':
      return { Icon: StickyNote, color: '#0ea5e9' }
    default:
      return { Icon: Circle, color: '#94a3b8' }
  }
}

export function ActivityPanel({ propertyId }: { propertyId: string }) {
  const events = useTimeline(propertyId)
  const addNote = useAddNote(propertyId)
  const deleteNote = useDeleteNote(propertyId)
  const [noteText, setNoteText] = useState('')

  const list = events.data ?? []

  const groups: { label: string; items: TimelineEvent[] }[] = []
  for (const e of list) {
    const label = formatDayHeader(e.occurred_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(e)
    else groups.push({ label, items: [e] })
  }

  function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const text = noteText.trim()
    if (!text) return
    addNote.mutate(text, { onSuccess: () => setNoteText('') })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <form
        onSubmit={submitNote}
        className="border-b border-[var(--border-default)] px-3 py-3 flex items-start gap-2 shrink-0"
      >
        <StickyNote className="w-4 h-4 mt-2 text-[var(--text-label)] shrink-0" />
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note (call recap, decision, observation)…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)]"
          disabled={addNote.isPending}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              ;(e.currentTarget.form as HTMLFormElement | null)?.requestSubmit()
            }
          }}
        />
        <button
          type="submit"
          disabled={!noteText.trim() || addNote.isPending}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-40 transition-colors"
          aria-label="Save note"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {events.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : events.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load activity.{' '}
            <button onClick={() => events.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-[var(--text-label)] text-center py-8">
            Nothing happened yet on this deal — actions will show up here.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
                {group.label}
              </p>
              <div className="relative pl-5">
                <span
                  className="absolute left-1.5 top-1 bottom-1 w-px bg-[var(--border-default)]"
                  aria-hidden
                />
                <ul className="space-y-3">
                  {group.items.map((ev) => (
                    <TimelineRow
                      key={ev.id}
                      event={ev}
                      onDeleteNote={(adjId) => deleteNote.mutate(adjId)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TimelineRow({
  event,
  onDeleteNote,
}: {
  event: TimelineEvent
  onDeleteNote: (adjustmentId: string) => void
}) {
  const { Icon, color } = visualForKind(event.kind)
  const isNote = event.kind === 'note'
  return (
    <li className="relative group">
      <span
        className="absolute -left-[18px] top-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full ring-2 ring-[var(--surface-card)]"
        style={{ background: color }}
        aria-hidden
      >
        <Icon className="w-2.5 h-2.5 text-white" />
      </span>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-heading)] leading-snug">{event.title}</p>
          {event.body && (
            <p className="text-xs text-[var(--text-label)] mt-0.5 whitespace-pre-wrap">
              {event.body}
            </p>
          )}
          <p className="text-[11px] text-[var(--text-label)] mt-0.5">
            {formatTimeOnly(event.occurred_at)}
          </p>
        </div>
        {isNote && (
          <button
            type="button"
            onClick={() => {
              const adjId = (event.meta?.adjustment_id as string | undefined) ?? null
              if (adjId) onDeleteNote(adjId)
            }}
            aria-label="Delete note"
            className="shrink-0 p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </li>
  )
}
