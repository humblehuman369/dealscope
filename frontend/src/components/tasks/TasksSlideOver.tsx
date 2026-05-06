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
  Download,
  Eye,
  FileText,
  FolderOpen,
  GripVertical,
  Mail,
  Pencil,
  Phone,
  Plus,
  ListChecks,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
  useSeedTasks,
  useTasks,
  useUpdateTask,
} from '@/hooks/useTasks'
import { useAddNote, useDeleteNote, useTimeline } from '@/hooks/useTimeline'
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from '@/hooks/useContacts'
import {
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
} from '@/hooks/useDocuments'
import type { PropertyTask } from '@/types/task'
import type { TimelineEvent, TimelineEventKind } from '@/types/timeline'
import {
  CONTACT_ROLES_ORDERED,
  CONTACT_ROLE_LABELS,
  type ContactRole,
  type PropertyContact,
} from '@/types/contact'
import {
  DOCUMENT_TYPES_ORDERED,
  DOCUMENT_TYPE_LABELS,
  formatFileSize,
  type DocumentType,
  type PropertyDocument,
} from '@/types/document'

interface TasksSlideOverProps {
  propertyId: string | null
  propertyTitle: string
  /** Human label for the property's current pipeline stage — used on the "Suggest common tasks" button. */
  stageLabel?: string | null
  open: boolean
  onClose: () => void
}

type Tab = 'tasks' | 'activity' | 'contacts' | 'documents'

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
              {tab === 'tasks'
                ? 'Tasks'
                : tab === 'contacts'
                ? 'Contacts'
                : tab === 'documents'
                ? 'Documents'
                : 'Activity'}
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

        {/* Tabs — overflow-x scrollable so 4+ tabs always fit on narrow widths. */}
        <nav className="flex border-b border-[var(--border-default)] px-2 overflow-x-auto" aria-label="Property detail tabs">
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListChecks className="w-3.5 h-3.5" />}>
            Tasks
          </TabButton>
          <TabButton active={tab === 'contacts'} onClick={() => setTab('contacts')} icon={<Users className="w-3.5 h-3.5" />}>
            Contacts
          </TabButton>
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')} icon={<FolderOpen className="w-3.5 h-3.5" />}>
            Documents
          </TabButton>
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity className="w-3.5 h-3.5" />}>
            Activity
          </TabButton>
        </nav>

        {tab === 'tasks' ? (
          <TasksTab propertyId={propertyId} stageLabel={stageLabel ?? null} inputRef={inputRef} />
        ) : tab === 'contacts' ? (
          <ContactsTab propertyId={propertyId} />
        ) : tab === 'documents' ? (
          <DocumentsTab propertyId={propertyId} />
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

// Drag MIME type kept distinct from the kanban's so a kanban card can't be
// dropped into the task list and vice versa.
const TASK_DRAG_MIME = 'application/x-propertytask-id'

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
  const reorder = useReorderTasks(propertyId)
  const [newTitle, setNewTitle] = useState('')

  // Currently-dragged task id; used to compute drop position and styling.
  const [dragId, setDragId] = useState<string | null>(null)

  const items = tasks.data ?? []
  const openItems = items.filter((t) => t.completed_at === null)
  const doneItems = items.filter((t) => t.completed_at !== null)

  // When dropping ``dragId`` ABOVE ``targetId``, return the new ordered array
  // of open task ids. ``targetId === null`` means drop at the bottom of the
  // open list. We only reorder the open subset — completed tasks render in a
  // separate group and their order doesn't matter.
  function reorderOpen(dragId: string, targetId: string | null): string[] {
    const ids = openItems.map((t) => t.id)
    const fromIdx = ids.indexOf(dragId)
    if (fromIdx === -1) return ids
    ids.splice(fromIdx, 1)
    const toIdx = targetId === null ? ids.length : ids.indexOf(targetId)
    if (toIdx === -1) ids.push(dragId)
    else ids.splice(toIdx, 0, dragId)
    return ids
  }

  function handleDrop(targetId: string | null, e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    const id = e.dataTransfer.getData(TASK_DRAG_MIME)
    setDragId(null)
    if (!id || id === targetId) return
    const newOrder = reorderOpen(id, targetId)
    if (newOrder.join('|') !== openItems.map((t) => t.id).join('|')) {
      reorder.mutate(newOrder)
    }
  }

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

  function handleEdit(t: PropertyTask, body: { title?: string; due_date?: string | null }) {
    update.mutate({ taskId: t.id, body })
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
              <TaskRow
                key={t.id}
                task={t}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                draggable
                isDragging={dragId === t.id}
                onDragStart={(e) => {
                  e.dataTransfer.setData(TASK_DRAG_MIME, t.id)
                  e.dataTransfer.effectAllowed = 'move'
                  setDragId(t.id)
                }}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }
                }}
                onDrop={(e) => handleDrop(t.id, e)}
              />
            ))}
            {/* Tail drop zone — drop here to send a task to the bottom of
                the open list. Renders as a thin gutter only when something
                is being dragged, to avoid visual noise the rest of the time. */}
            {dragId && (
              <div
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }
                }}
                onDrop={(e) => handleDrop(null, e)}
                className="h-6 rounded border border-dashed border-[var(--accent-sky)] mx-2 my-1"
                aria-hidden
              />
            )}
            {doneItems.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mt-4 mb-1 px-2">
                Completed
              </p>
            )}
            {doneItems.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
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
  onEdit: (t: PropertyTask, body: { title?: string; due_date?: string | null }) => void
  // Drag-related props are optional so completed-section rows (which aren't
  // reorderable) don't have to pass them.
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
}

/** ISO datetime → "yyyy-MM-dd" for the <input type="date"> value. */
function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onEdit,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TaskRowProps) {
  const isDone = task.completed_at !== null
  const due = formatDue(task.due_date)
  const isOverdue = !isDone && task.due_date !== null && new Date(task.due_date).getTime() < Date.now()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDate, setEditDate] = useState(isoToDateInput(task.due_date))

  function startEdit() {
    setEditTitle(task.title)
    setEditDate(isoToDateInput(task.due_date))
    setEditing(true)
  }

  function saveEdit() {
    const t = editTitle.trim()
    if (!t) return
    const body: { title?: string; due_date?: string | null } = {}
    if (t !== task.title) body.title = t
    // Convert "yyyy-MM-dd" → end-of-day ISO so a "due today" task is overdue
    // only after the day ends. Empty string clears the due date.
    const desiredDate = editDate
      ? new Date(`${editDate}T23:59:59Z`).toISOString()
      : null
    if (desiredDate !== task.due_date) body.due_date = desiredDate
    if (Object.keys(body).length > 0) {
      onEdit(task, body)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg p-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-2">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)]"
        />
        <div className="flex items-center justify-between gap-2">
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-xs text-[var(--text-heading)]"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-2 py-1 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editTitle.trim()}
              className="px-2 py-1 rounded text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-start gap-1 px-1 py-2 rounded-lg hover:bg-[var(--hover-overlay)] ${
        isDragging ? 'opacity-40' : ''
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {draggable && (
        <span
          aria-hidden
          className="shrink-0 mt-0.5 text-[var(--text-label)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </span>
      )}
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
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={startEdit}
          aria-label="Edit task"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label="Delete task"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
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
    case 'contact_added':
      return { Icon: Users, color: '#06b6d4' } // cyan
    case 'document_added':
      return { Icon: FileText, color: '#6366f1' } // indigo
    case 'note':
      return { Icon: StickyNote, color: '#0ea5e9' }
    default:
      return { Icon: Circle, color: '#94a3b8' }
  }
}

// ───────────────────────────────────────────────────────
// Contacts tab

function ContactsTab({ propertyId }: { propertyId: string }) {
  const contacts = useContacts(propertyId)
  const create = useCreateContact(propertyId)
  const update = useUpdateContact(propertyId)
  const del = useDeleteContact(propertyId)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<ContactRole>('listing_agent')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')

  const items = contacts.data ?? []

  function reset() {
    setName('')
    setRole('listing_agent')
    setPhone('')
    setEmail('')
    setCompany('')
    setShowForm(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(
      {
        name: name.trim(),
        role,
        phone: phone.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
      },
      { onSuccess: reset },
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {contacts.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : contacts.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load contacts.{' '}
            <button onClick={() => contacts.refetch()} className="underline">Retry</button>
          </p>
        ) : items.length === 0 && !showForm ? (
          <div className="flex flex-col items-center text-center py-8 px-4 gap-3">
            <p className="text-sm text-[var(--text-label)]">
              No contacts yet — add the seller, agent, or anyone else involved with this deal.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a contact
            </button>
          </div>
        ) : (
          items.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onDelete={() => del.mutate(c.id)}
              onEdit={(body) => update.mutate({ contactId: c.id, body })}
            />
          ))
        )}
      </div>

      {/* Add form: pinned to bottom. Toggle visibility via "+" button when
          there are existing contacts; auto-shown for empty state via the CTA. */}
      {showForm ? (
        <form
          onSubmit={submit}
          className="border-t border-[var(--border-default)] px-3 py-3 space-y-2"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ContactRole)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
            >
              {CONTACT_ROLES_ORDERED.map((r) => (
                <option key={r} value={r}>
                  {CONTACT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
            />
          </div>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company (optional)"
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-label)]"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Save contact
            </button>
          </div>
        </form>
      ) : items.length > 0 ? (
        <div className="border-t border-[var(--border-default)] px-3 py-3">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another contact
          </button>
        </div>
      ) : null}
    </>
  )
}

function ContactRow({
  contact,
  onDelete,
  onEdit,
}: {
  contact: PropertyContact
  onDelete: () => void
  onEdit: (body: {
    name?: string
    role?: ContactRole
    phone?: string | null
    email?: string | null
    company?: string | null
  }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(contact.name)
  const [role, setRole] = useState<ContactRole>(contact.role)
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [email, setEmail] = useState(contact.email ?? '')
  const [company, setCompany] = useState(contact.company ?? '')

  function startEdit() {
    setName(contact.name)
    setRole(contact.role)
    setPhone(contact.phone ?? '')
    setEmail(contact.email ?? '')
    setCompany(contact.company ?? '')
    setEditing(true)
  }

  function saveEdit() {
    if (!name.trim()) return
    const body: {
      name?: string
      role?: ContactRole
      phone?: string | null
      email?: string | null
      company?: string | null
    } = {}
    if (name.trim() !== contact.name) body.name = name.trim()
    if (role !== contact.role) body.role = role
    const newPhone = phone.trim() || null
    if (newPhone !== contact.phone) body.phone = newPhone
    const newEmail = email.trim() || null
    if (newEmail !== contact.email) body.email = newEmail
    const newCompany = company.trim() || null
    if (newCompany !== contact.company) body.company = newCompany
    if (Object.keys(body).length > 0) onEdit(body)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg p-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ContactRole)}
            className="rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          >
            {CONTACT_ROLES_ORDERED.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
          />
        </div>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1.5 text-sm text-[var(--text-heading)]"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-1 text-xs font-semibold text-[var(--text-label)] hover:text-[var(--text-body)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={!name.trim()}
            className="px-3 py-1 rounded text-xs font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-lg p-2.5 hover:bg-[var(--hover-overlay)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--text-heading)] truncate">
              {contact.name}
            </p>
            <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-sky-dim)] text-[var(--accent-sky)]">
              {CONTACT_ROLE_LABELS[contact.role]}
            </span>
          </div>
          {contact.company && (
            <p className="text-[11px] text-[var(--text-label)] truncate">{contact.company}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-sky)] hover:underline"
              >
                <Phone className="w-3 h-3" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-sky)] hover:underline truncate max-w-[200px]"
              >
                <Mail className="w-3 h-3" />
                {contact.email}
              </a>
            )}
          </div>
          {contact.notes && (
            <p className="mt-1 text-[11px] text-[var(--text-label)] whitespace-pre-wrap">{contact.notes}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit contact"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete contact"
            className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Documents tab

function DocumentsTab({ propertyId }: { propertyId: string }) {
  const docs = useDocuments(propertyId)
  const upload = useUploadDocument(propertyId)
  const del = useDeleteDocument(propertyId)

  const [docType, setDocType] = useState<DocumentType>('contract')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const items = docs.data?.items ?? []

  function uploadFiles(files: FileList | File[]) {
    for (const f of Array.from(files)) {
      upload.mutate({ file: f, document_type: docType })
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files)
      // Reset so the same file can be re-selected later if the user removed it.
      e.target.value = ''
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {docs.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : docs.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load documents.{' '}
            <button onClick={() => docs.refetch()} className="underline">Retry</button>
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-label)] text-center py-8 px-4">
            No documents yet — drop a contract, inspection report, or photos below.
          </p>
        ) : (
          items.map((d) => (
            <DocumentRow key={d.id} doc={d} onDelete={() => del.mutate(d.id)} />
          ))
        )}
      </div>

      {/* Upload zone — drag-drop area + traditional file picker + type select. */}
      <div className="border-t border-[var(--border-default)] px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            aria-label="Document type"
            className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 text-sm text-[var(--text-heading)]"
          >
            {DOCUMENT_TYPES_ORDERED.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onPickFile}
            className="hidden"
          />
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!isDraggingFile) setIsDraggingFile(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setIsDraggingFile(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDraggingFile(false)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              uploadFiles(e.dataTransfer.files)
            }
          }}
          className={`rounded-lg border border-dashed px-3 py-3 text-center text-xs transition-colors ${
            isDraggingFile
              ? 'border-[var(--accent-sky)] bg-[var(--color-sky-dim)] text-[var(--accent-sky)]'
              : 'border-[var(--border-default)] text-[var(--text-label)]'
          }`}
        >
          {upload.isPending
            ? 'Uploading…'
            : upload.isError
            ? `Upload failed: ${(upload.error as Error)?.message ?? 'unknown error'}`
            : 'Drop files here or click Upload'}
        </div>
      </div>
    </>
  )
}

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: PropertyDocument
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-[var(--hover-overlay)]">
      <span className="shrink-0 mt-0.5 w-7 h-7 rounded inline-flex items-center justify-center bg-[var(--surface-elevated)] text-[var(--accent-sky)]">
        <FileText className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-heading)] truncate">
          {doc.original_filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--color-sky-dim)] text-[var(--accent-sky)]">
            {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
          </span>
          <span className="text-[11px] text-[var(--text-label)] tabular-nums">
            {formatFileSize(doc.file_size)}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`/api/v1/documents/${doc.id}/view`}
          target="_blank"
          rel="noreferrer"
          aria-label="View document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          <Eye className="w-3.5 h-3.5" />
        </a>
        <a
          href={`/api/v1/documents/${doc.id}/download`}
          aria-label="Download document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--accent-sky)]"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete document"
          className="p-1 rounded text-[var(--text-label)] hover:text-[var(--status-negative)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
