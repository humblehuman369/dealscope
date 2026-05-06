'use client'

/**
 * Property-detail slide-over with two tabs: Tasks and Activity.
 *
 * Triggered from a kanban card. Open tasks render at the top of the Tasks
 * tab; completed below. Activity tab merges status changes, task events,
 * expenses, and user notes into one chronological stream grouped by day.
 *
 * Note: file is named TasksSlideOver for backward-compat — its scope grew in
 * Phase 2C. The exported component still gets imported as TasksSlideOver.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  ListChecks,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import {
  useCreateTask,
  useDeleteTask,
  useSeedTasks,
  useTasks,
  useUpdateTask,
} from '@/hooks/useTasks'
import { useAddNote, useDeleteNote, useTimeline } from '@/hooks/useTimeline'
import type { PropertyTask } from '@/types/task'
import type { TimelineEvent, TimelineEventKind } from '@/types/timeline'

interface TasksSlideOverProps {
  propertyId: string | null
  propertyTitle: string
  /** Human label for the property's current pipeline stage — used on the "Suggest common tasks" button. */
  stageLabel?: string | null
  open: boolean
  onClose: () => void
}

type Tab = 'tasks' | 'activity'

function formatDue(iso: string | null): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const now = Date.now()
  const days = Math.round((t - now) / 86_400_000)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1d overdue'
  if (days < 0) return `${-days}d overdue`
  return `Due in ${days}d`
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "Today" / "Yesterday" / "Mon, Jan 12" / "Jan 12, 2025". */
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

export function TasksSlideOver({
  propertyId,
  propertyTitle,
  stageLabel,
  open,
  onClose,
}: TasksSlideOverProps) {
  const [tab, setTab] = useState<Tab>('tasks')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Reset to Tasks tab whenever a new property is opened.
  useEffect(() => {
    if (open) setTab('tasks')
  }, [open, propertyId])

  // Auto-focus the new-task input when Tasks tab is shown.
  useEffect(() => {
    if (open && tab === 'tasks') {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open, tab])

  // Esc closes.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !propertyId) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detail panel for ${propertyTitle}`}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-[var(--surface-card)] border-l border-[var(--border-default)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-default)]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
              {tab === 'tasks' ? 'Tasks' : 'Activity'}
            </p>
            <h2 className="text-lg font-bold text-[var(--text-heading)] truncate">
              {propertyTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-label)]"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-[var(--border-default)] px-2" aria-label="Property detail tabs">
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListChecks className="w-3.5 h-3.5" />}>
            Tasks
          </TabButton>
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity className="w-3.5 h-3.5" />}>
            Activity
          </TabButton>
        </nav>

        {tab === 'tasks' ? (
          <TasksTab propertyId={propertyId} stageLabel={stageLabel ?? null} inputRef={inputRef} />
        ) : (
          <ActivityTab propertyId={propertyId} />
        )}
      </aside>
    </>
  )
}

// ───────────────────────────────────────────────────────
// Tab button

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? 'text-[var(--accent-sky)] border-[var(--accent-sky)]'
          : 'text-[var(--text-label)] border-transparent hover:text-[var(--text-body)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// ───────────────────────────────────────────────────────
// Tasks tab

function TasksTab({
  propertyId,
  stageLabel,
  inputRef,
}: {
  propertyId: string
  stageLabel: string | null
  inputRef: React.MutableRefObject<HTMLInputElement | null>
}) {
  const tasks = useTasks(propertyId)
  const create = useCreateTask(propertyId)
  const update = useUpdateTask(propertyId)
  const del = useDeleteTask(propertyId)
  const seed = useSeedTasks(propertyId)
  const [newTitle, setNewTitle] = useState('')

  const items = tasks.data ?? []
  const openItems = items.filter((t) => t.completed_at === null)
  const doneItems = items.filter((t) => t.completed_at !== null)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    create.mutate({ title }, { onSuccess: () => setNewTitle('') })
  }

  function handleToggle(t: PropertyTask) {
    update.mutate({
      taskId: t.id,
      body: {
        completed_at: t.completed_at === null ? new Date().toISOString() : null,
      },
    })
  }

  function handleDelete(t: PropertyTask) {
    del.mutate(t.id)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {tasks.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : tasks.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load tasks.{' '}
            <button onClick={() => tasks.refetch()} className="underline">Retry</button>
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 px-4 gap-3">
            <p className="text-sm text-[var(--text-label)]">
              No tasks yet — add the next thing you need to do for this deal.
            </p>
            <button
              type="button"
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Suggest common tasks{stageLabel ? ` for ${stageLabel}` : ''}
            </button>
          </div>
        ) : (
          <>
            {openItems.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
            {doneItems.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mt-4 mb-1 px-2">
                Completed
              </p>
            )}
            {doneItems.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="border-t border-[var(--border-default)] px-3 py-3 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)]"
          disabled={create.isPending}
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || create.isPending}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-40 transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </>
  )
}

interface TaskRowProps {
  task: PropertyTask
  onToggle: (t: PropertyTask) => void
  onDelete: (t: PropertyTask) => void
}

function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const isDone = task.completed_at !== null
  const due = formatDue(task.due_date)
  const isOverdue = !isDone && task.due_date !== null && new Date(task.due_date).getTime() < Date.now()

  return (
    <div className="group flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-[var(--hover-overlay)]">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={isDone ? 'Reopen task' : 'Complete task'}
        className="shrink-0 mt-0.5 text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
      >
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-[var(--status-positive)]" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            isDone
              ? 'text-[var(--text-label)] line-through'
              : 'text-[var(--text-heading)]'
          }`}
        >
          {task.title}
        </p>
        {due && (
          <p
            className={`text-[11px] mt-0.5 ${
              isOverdue
                ? 'text-[var(--status-negative)] font-semibold'
                : 'text-[var(--text-label)]'
            }`}
          >
            {due}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDelete(task)}
        aria-label="Delete task"
        className="shrink-0 mt-0.5 p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Activity tab

function ActivityTab({ propertyId }: { propertyId: string }) {
  const events = useTimeline(propertyId)
  const addNote = useAddNote(propertyId)
  const deleteNote = useDeleteNote(propertyId)
  const [noteText, setNoteText] = useState('')

  const list = events.data ?? []

  // Group events by day-bucket. Order is preserved (events come newest-first).
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
    <>
      {/* Note input pinned to top — adding a note is the primary write affordance here. */}
      <form
        onSubmit={submitNote}
        className="border-b border-[var(--border-default)] px-3 py-3 flex items-start gap-2"
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
            // Cmd/Ctrl+Enter submits — convention for textareas in chat-like UIs.
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
            <button onClick={() => events.refetch()} className="underline">Retry</button>
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
                {/* Vertical rail */}
                <span className="absolute left-1.5 top-1 bottom-1 w-px bg-[var(--border-default)]" aria-hidden />
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
    </>
  )
}

interface TimelineRowProps {
  event: TimelineEvent
  onDeleteNote: (adjustmentId: string) => void
}

function TimelineRow({ event, onDeleteNote }: TimelineRowProps) {
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
            <p className="text-xs text-[var(--text-label)] mt-0.5 whitespace-pre-wrap">{event.body}</p>
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

/** Map an event kind to its bullet icon + color. CSS variables would be ideal
 *  but bullet ring needs a literal color value, so we use Tailwind palette-ish
 *  hexes that look right in both themes. */
function visualForKind(kind: TimelineEventKind): {
  Icon: React.ComponentType<{ className?: string }>
  color: string
} {
  switch (kind) {
    case 'status_change':
    case 'flip_stage_change':
      return { Icon: ArrowRight, color: '#0ea5e9' } // sky
    case 'task_added':
      return { Icon: ListChecks, color: '#94a3b8' } // slate
    case 'task_completed':
      return { Icon: CheckCircle2, color: '#10b981' } // emerald
    case 'task_reopened':
      return { Icon: Circle, color: '#94a3b8' }
    case 'expense_added':
      return { Icon: Plus, color: '#f59e0b' } // amber
    case 'budget_locked':
      return { Icon: ListChecks, color: '#8b5cf6' } // violet
    case 'note':
      return { Icon: StickyNote, color: '#0ea5e9' }
    default:
      return { Icon: Circle, color: '#94a3b8' }
  }
}
