'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useSavedProperties,
  useUpdateSavedPropertyStatus,
} from '@/hooks/useSavedProperties'
import {
  PIPELINE_STAGES,
  STATUS_CONFIG,
  STRATEGY_LABELS,
  formatCurrency,
  formatRelativeDate,
} from '@/lib/savedPropertyStatus'
import type { PropertyStatus, SavedPropertySummary } from '@/types/savedProperty'
import { ChevronRight, MoreHorizontal, Bookmark, ListChecks } from 'lucide-react'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { TasksSlideOver } from '@/components/tasks/TasksSlideOver'

interface PipelineKanbanProps {
  highlightStage: PropertyStatus | null
  onEmptyAction: () => void
}

// Statuses available in the per-card "Move to" dropdown — the active pipeline
// plus the two terminal columns. Kept in this order so a user reading the
// dropdown follows the funnel left-to-right then ends at the bench.
const MOVE_TO_OPTIONS: PropertyStatus[] = [
  'prospecting',
  'pursuing',
  'negotiating',
  'under_contract',
  'owned',
  'passed',
  'archived',
]

// Drag payload uses a custom MIME type so the kanban doesn't accidentally
// accept text drops from elsewhere on the page.
const DRAG_MIME = 'application/x-savedproperty-id'

// Late-funnel stages where "days in stage" is a more useful action signal
// than "last touched" — these are the columns where deadlines live.
const TIME_IN_STAGE_STATUSES: ReadonlySet<PropertyStatus> = new Set([
  'negotiating',
  'under_contract',
  'owned',
])

function shortAddress(p: SavedPropertySummary): string {
  return p.nickname || p.address_street
}

function buildFullAddress(p: SavedPropertySummary): string {
  const stateZip = [p.address_state, p.address_zip].filter(Boolean).join(' ')
  return [p.address_street, p.address_city, stateZip].filter(Boolean).join(', ')
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

/** Variance badge mirrors the styling used on the Active Flips page. */
function VarianceBadge({ pct }: { pct: string }) {
  const n = parseFloat(pct)
  if (!Number.isFinite(n)) return null
  const cls =
    n <= 0
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300'
      : n <= 10
      ? 'bg-amber-500/10 text-amber-900 ring-amber-500/25 dark:text-amber-200'
      : 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300'
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${cls}`}>
      {n > 0 ? '+' : ''}
      {pct}% vs est.
    </span>
  )
}

export function PipelineKanban({ highlightStage, onEmptyAction }: PipelineKanbanProps) {
  const router = useRouter()

  // Fetch up to 100 active properties — enough for any practical pipeline view.
  const query = useSavedProperties({
    page: 0,
    pageSize: 100,
    status: 'all',
    search: '',
  })

  const updateStatus = useUpdateSavedPropertyStatus()

  // Drag state: which column is currently being hovered as a drop target.
  const [dropTargetStage, setDropTargetStage] = useState<PropertyStatus | null>(null)

  // Property whose Tasks slide-over is currently open (null = closed).
  const [tasksFor, setTasksFor] = useState<SavedPropertySummary | null>(null)

  // Group by status
  const byStatus = useMemo(() => {
    const groups: Record<PropertyStatus, SavedPropertySummary[]> = {
      prospecting: [],
      pursuing: [],
      negotiating: [],
      under_contract: [],
      owned: [],
      passed: [],
      archived: [],
    }
    for (const p of query.data ?? []) {
      groups[p.status]?.push(p)
    }
    return groups
  }, [query.data])

  const totalActive = PIPELINE_STAGES.reduce(
    (sum, stage) => sum + byStatus[stage].length,
    0,
  )
  const archivedCount = byStatus.passed.length + byStatus.archived.length

  function handleDrop(stage: PropertyStatus, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDropTargetStage(null)
    const id = e.dataTransfer.getData(DRAG_MIME)
    if (!id) return
    const property = (query.data ?? []).find((p) => p.id === id)
    if (!property || property.status === stage) return
    updateStatus.mutate({ id, status: stage })
  }

  return (
    <DataBoundary
      isLoading={query.isLoading}
      error={query.isError ? 'Failed to load your pipeline' : null}
      onRetry={() => query.refetch()}
      isEmpty={totalActive === 0}
      emptyIcon={<Bookmark className="w-8 h-8 text-[var(--text-label)]" />}
      emptyTitle="Your pipeline is empty"
      emptyDescription="Save properties from any analysis page to start tracking deals here."
      emptyAction={
        <button
          onClick={onEmptyAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] font-semibold rounded-lg transition-all"
        >
          Search a property to save
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map(stage => {
          const items = byStatus[stage]
          const config = STATUS_CONFIG[stage]
          const isHighlighted = highlightStage === stage
          const isDropTarget = dropTargetStage === stage

          return (
            <div
              key={stage}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_MIME)) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dropTargetStage !== stage) setDropTargetStage(stage)
                }
              }}
              onDragLeave={(e) => {
                // Only clear when leaving the column, not when crossing a child.
                if (e.currentTarget.contains(e.relatedTarget as Node)) return
                if (dropTargetStage === stage) setDropTargetStage(null)
              }}
              onDrop={(e) => handleDrop(stage, e)}
              className={`rounded-xl border transition-colors ${
                isDropTarget
                  ? 'border-[var(--accent-sky)] bg-[var(--color-sky-dim)] ring-2 ring-[var(--accent-sky)] ring-offset-1 ring-offset-[var(--surface-base)]'
                  : isHighlighted
                  ? 'border-[var(--border-focus)] bg-[var(--surface-elevated)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)]'
              } flex flex-col min-h-[180px]`}
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] ${config.bg}`}
              >
                <h3 className={`text-xs font-bold uppercase tracking-wide ${config.color}`}>
                  {config.label}
                </h3>
                <span className="text-xs font-semibold tabular-nums text-[var(--text-label)]">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 flex flex-col gap-2 flex-1">
                {items.length === 0 ? (
                  <p className="text-xs text-[var(--text-label)] py-3 text-center">
                    {isDropTarget ? 'Drop to move here' : 'No properties'}
                  </p>
                ) : (
                  items.map(p => (
                    <KanbanCard
                      key={p.id}
                      property={p}
                      onClick={() => {
                        const addr = buildFullAddress(p)
                        router.push(`/verdict?address=${encodeURIComponent(addr)}`)
                      }}
                      onChangeStatus={(newStatus: PropertyStatus) =>
                        updateStatus.mutate({ id: p.id, status: newStatus })
                      }
                      onOpenTasks={() => setTasksFor(p)}
                      isUpdating={updateStatus.isPending}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {archivedCount > 0 && (
        <div className="mt-4 text-right">
          <button
            onClick={() => router.push('/saved-properties')}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
          >
            View {archivedCount} archived/passed
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <TasksSlideOver
        propertyId={tasksFor?.id ?? null}
        propertyTitle={tasksFor ? shortAddress(tasksFor) : ''}
        open={tasksFor !== null}
        onClose={() => setTasksFor(null)}
      />
    </DataBoundary>
  )
}

// ───────────────────────────────────────────────────────
// Card

interface KanbanCardProps {
  property: SavedPropertySummary
  onClick: () => void
  onChangeStatus: (newStatus: PropertyStatus) => void
  onOpenTasks: () => void
  isUpdating: boolean
}

function KanbanCard({ property, onClick, onChangeStatus, onOpenTasks, isUpdating }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const strategyLabel = property.best_strategy
    ? (STRATEGY_LABELS[property.best_strategy] ?? property.best_strategy)
    : null

  // Late-stage cards swap the "last updated" timestamp for a "days in stage"
  // counter — what the user actually needs to act on at this point in the
  // funnel. ``status_changed_at`` is populated by the backend; pre-migration
  // rows fall back to ``updated_at``.
  const showDaysInStage = TIME_IN_STAGE_STATUSES.has(property.status)
  const daysInStage = showDaysInStage
    ? daysSince(property.status_changed_at ?? property.updated_at)
    : null
  const showVariance = property.status === 'owned' && !!property.budget_variance_pct

  return (
    <div
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, property.id)
        e.dataTransfer.effectAllowed = 'move'
        setIsDragging(true)
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg p-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--border-focus)] transition-all cursor-grab active:cursor-grabbing"
      >
        <p className="text-sm font-semibold text-[var(--text-heading)] truncate pr-16">
          {shortAddress(property)}
        </p>
        {property.address_city && (
          <p className="text-[11px] text-[var(--text-label)] truncate">
            {property.address_city}{property.address_state ? `, ${property.address_state}` : ''}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--text-label)]">
            {showDaysInStage && daysInStage !== null
              ? `${daysInStage}d in stage`
              : formatRelativeDate(property.updated_at)}
          </span>
          {property.best_cash_flow != null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                property.best_cash_flow >= 0
                  ? 'text-[var(--status-positive)]'
                  : 'text-[var(--status-negative)]'
              }`}
            >
              {formatCurrency(property.best_cash_flow)}/mo
            </span>
          )}
        </div>
        {showVariance ? (
          <div className="mt-2">
            <VarianceBadge pct={property.budget_variance_pct as string} />
          </div>
        ) : strategyLabel ? (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-label)] truncate">
            {strategyLabel}
          </p>
        ) : null}
      </button>

      {/* Tasks badge — clickable. Always rendered so users discover the
          surface even on properties with zero tasks. Overdue items get a
          warning dot. */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onOpenTasks()
        }}
        className="absolute top-1.5 right-9 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums text-[var(--text-label)] hover:text-[var(--accent-sky)] hover:bg-[var(--hover-overlay)] transition-colors"
        aria-label={`${property.task_count_open ?? 0} open tasks`}
        title={`${property.task_count_open ?? 0} open${
          property.task_count_overdue ? ` · ${property.task_count_overdue} overdue` : ''
        }`}
      >
        <ListChecks className="w-3.5 h-3.5" />
        <span>{property.task_count_open ?? 0}</span>
        {!!property.task_count_overdue && property.task_count_overdue > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-negative)]" aria-hidden />
        )}
      </button>

      {/* Status menu trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen(prev => !prev)
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-label)]"
        aria-label="Change status"
        disabled={isUpdating}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {menuOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-1.5 top-8 z-50 w-44 rounded-lg shadow-lg py-1"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-[var(--text-label)]">
              Move to
            </p>
            {MOVE_TO_OPTIONS.map(s => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  if (s !== property.status) {
                    onChangeStatus(s)
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--hover-overlay)] ${
                  s === property.status
                    ? 'text-[var(--accent-sky)] font-semibold'
                    : 'text-[var(--text-body)]'
                }`}
              >
                {STATUS_CONFIG[s].label}
                {s === property.status && ' ✓'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
