'use client'

/**
 * "Due this week" widget — a daily-driver list of tasks across all of the
 * user's properties, sorted by due_date asc with overdue items pinned first.
 *
 * Click a row to open the per-property slide-over to the Tasks tab. The
 * slide-over state lives on the dashboard page so this widget and the
 * kanban share it.
 */

import { useUpcomingTasks } from '@/hooks/useTasks'
import { STATUS_CONFIG } from '@/lib/savedPropertyStatus'
import type { PropertyStatus } from '@/types/savedProperty'
import type { UpcomingTask } from '@/types/task'
import { CalendarClock, AlertCircle } from 'lucide-react'

interface UpcomingTasksProps {
  onOpen: (target: { id: string; title: string; stageLabel: string | null }) => void
}

export function UpcomingTasks({ onOpen }: UpcomingTasksProps) {
  const query = useUpcomingTasks({ days: 7, limit: 10 })

  // Hide the widget entirely when there's nothing to show — it would
  // otherwise add empty-state noise above the kanban.
  if (query.isLoading || query.isError) return null
  const items = query.data ?? []
  if (items.length === 0) return null

  const overdue = items.filter((t) => t.is_overdue)
  const soon = items.filter((t) => !t.is_overdue)

  return (
    <section className="mb-6">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-heading)] inline-flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[var(--accent-sky)]" />
          Due this week
        </h2>
        <span className="text-xs text-[var(--text-label)] tabular-nums">
          {items.length} task{items.length === 1 ? '' : 's'}
          {overdue.length > 0 && ` · ${overdue.length} overdue`}
        </span>
      </header>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)]">
        {/* Overdue first, then upcoming. */}
        {overdue.map((t) => (
          <UpcomingRow key={t.id} task={t} onOpen={onOpen} />
        ))}
        {soon.map((t) => (
          <UpcomingRow key={t.id} task={t} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function UpcomingRow({
  task,
  onOpen,
}: {
  task: UpcomingTask
  onOpen: (target: { id: string; title: string; stageLabel: string | null }) => void
}) {
  const propertyTitle =
    task.property_nickname || task.property_address_street
  const cityState = [task.property_address_city, task.property_address_state]
    .filter(Boolean)
    .join(', ')
  const stageLabel =
    STATUS_CONFIG[task.property_status as PropertyStatus]?.label ?? null

  return (
    <button
      type="button"
      onClick={() =>
        onOpen({ id: task.saved_property_id, title: propertyTitle, stageLabel })
      }
      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--hover-overlay)] transition-colors"
    >
      <span
        className={`shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full ${
          task.is_overdue
            ? 'bg-[rgba(239,68,68,0.12)] text-[var(--status-negative)]'
            : 'bg-[var(--color-sky-dim)] text-[var(--accent-sky)]'
        }`}
      >
        {task.is_overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-heading)] font-medium truncate">{task.title}</p>
        <p className="text-[11px] text-[var(--text-label)] truncate">
          {propertyTitle}
          {cityState ? ` · ${cityState}` : ''}
        </p>
      </div>
      <DueChip iso={task.due_date} isOverdue={task.is_overdue} />
    </button>
  )
}

function DueChip({ iso, isOverdue }: { iso: string; isOverdue: boolean }) {
  const t = new Date(iso).getTime()
  const days = Math.round((t - Date.now()) / 86_400_000)
  let label: string
  if (days === 0) label = 'Today'
  else if (days === 1) label = 'Tomorrow'
  else if (days === -1) label = '1d overdue'
  else if (days < 0) label = `${-days}d overdue`
  else label = `${days}d`
  return (
    <span
      className={`shrink-0 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
        isOverdue
          ? 'bg-[rgba(239,68,68,0.10)] text-[var(--status-negative)]'
          : days <= 1
          ? 'bg-[var(--color-sky-dim)] text-[var(--accent-sky)]'
          : 'bg-[var(--surface-elevated)] text-[var(--text-label)]'
      }`}
    >
      {label}
    </span>
  )
}
