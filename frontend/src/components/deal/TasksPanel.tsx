'use client'

/**
 * Tasks panel for a single saved property.
 *
 * Open-tasks list at top (drag-to-reorder), completed below the divider,
 * add-form pinned at the bottom. Renders identically inside the (legacy)
 * slide-over and the new ``/deals/[id]`` workflow page — just drop in with
 * ``propertyId`` and an optional ``stageLabel`` for the seed-templates CTA.
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, GripVertical, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
  useSeedTasks,
  useTasks,
  useUpdateTask,
} from '@/hooks/useTasks'
import type { PropertyTask } from '@/types/task'

interface TasksPanelProps {
  propertyId: string
  /** Stage label used on the "Suggest common tasks" empty-state button. */
  stageLabel?: string | null
  /** Auto-focus the new-task input on mount. Default false (set true when
   *  hosted in a slide-over so the user can type immediately). */
  autoFocus?: boolean
}

const TASK_DRAG_MIME = 'application/x-propertytask-id'

function formatDue(iso: string | null): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const days = Math.round((t - Date.now()) / 86_400_000)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1d overdue'
  if (days < 0) return `${-days}d overdue`
  return `Due in ${days}d`
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function TasksPanel({ propertyId, stageLabel, autoFocus }: TasksPanelProps) {
  const tasks = useTasks(propertyId)
  const create = useCreateTask(propertyId)
  const update = useUpdateTask(propertyId)
  const del = useDeleteTask(propertyId)
  const seed = useSeedTasks(propertyId)
  const reorder = useReorderTasks(propertyId)

  const [newTitle, setNewTitle] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  const items = tasks.data ?? []
  const openItems = items.filter((t) => t.completed_at === null)
  const doneItems = items.filter((t) => t.completed_at !== null)

  function reorderOpen(id: string, targetId: string | null): string[] {
    const ids = openItems.map((t) => t.id)
    const fromIdx = ids.indexOf(id)
    if (fromIdx === -1) return ids
    ids.splice(fromIdx, 1)
    const toIdx = targetId === null ? ids.length : ids.indexOf(targetId)
    if (toIdx === -1) ids.push(id)
    else ids.splice(toIdx, 0, id)
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {tasks.isLoading ? (
          <p className="text-sm text-[var(--text-label)] text-center py-6">Loading…</p>
        ) : tasks.isError ? (
          <p className="text-sm text-[var(--status-negative)] text-center py-6">
            Couldn&apos;t load tasks.{' '}
            <button onClick={() => tasks.refetch()} className="underline">
              Retry
            </button>
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
        className="border-t border-[var(--border-default)] px-3 py-3 flex items-center gap-2 shrink-0"
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
    </div>
  )
}

interface TaskRowProps {
  task: PropertyTask
  onToggle: (t: PropertyTask) => void
  onDelete: (t: PropertyTask) => void
  onEdit: (t: PropertyTask, body: { title?: string; due_date?: string | null }) => void
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
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
  const isOverdue =
    !isDone && task.due_date !== null && new Date(task.due_date).getTime() < Date.now()
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
    const desiredDate = editDate ? new Date(`${editDate}T23:59:59Z`).toISOString() : null
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
            isDone ? 'text-[var(--text-label)] line-through' : 'text-[var(--text-heading)]'
          }`}
        >
          {task.title}
        </p>
        {due && (
          <p
            className={`text-[11px] mt-0.5 ${
              isOverdue ? 'text-[var(--status-negative)] font-semibold' : 'text-[var(--text-label)]'
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
