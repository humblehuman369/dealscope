'use client'

/**
 * Slide-over panel listing tasks for a single saved property.
 *
 * Triggered from the kanban card task badge. Open tasks render at the top,
 * completed below. Inline checkbox toggles complete/reopen, trash deletes.
 * The "Add a task" form at the bottom keeps focus locally so the user can
 * dump several to-dos in a row without re-opening anything.
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from '@/hooks/useTasks'
import type { PropertyTask } from '@/types/task'

interface TasksSlideOverProps {
  propertyId: string | null
  propertyTitle: string
  open: boolean
  onClose: () => void
}

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

export function TasksSlideOver({ propertyId, propertyTitle, open, onClose }: TasksSlideOverProps) {
  const tasks = useTasks(propertyId)
  const create = useCreateTask(propertyId ?? '')
  const update = useUpdateTask(propertyId ?? '')
  const del = useDeleteTask(propertyId ?? '')

  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus the input when the panel opens — slightly delayed so the
  // browser has the panel mounted before we steal focus.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

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

  const items = tasks.data ?? []
  const openItems = items.filter((t) => t.completed_at === null)
  const doneItems = items.filter((t) => t.completed_at !== null)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    create.mutate(
      { title },
      {
        onSuccess: () => setNewTitle(''),
      },
    )
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Tasks for ${propertyTitle}`}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-[var(--surface-card)] border-l border-[var(--border-default)] shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-default)]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
              Tasks
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

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {tasks.isLoading ? (
            <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
          ) : tasks.isError ? (
            <p className="text-sm text-[var(--status-negative)] text-center py-6">
              Couldn&apos;t load tasks.{' '}
              <button onClick={() => tasks.refetch()} className="underline">Retry</button>
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--text-label)] text-center py-8 px-4">
              No tasks yet — add the next thing you need to do for this deal.
            </p>
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

        {/* Add form */}
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
      </aside>
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
