'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useSavedProperties,
  useUpdateFlipStage,
  useUpdateSavedPropertyStatus,
} from '@/hooks/useSavedProperties'
import {
  STATUS_CONFIG,
  STRATEGY_LABELS,
  formatCurrency,
  formatRelativeDate,
} from '@/lib/savedPropertyStatus'
import {
  STAGES_BY_STRATEGY,
  STAGE_LABELS,
  STRATEGY_HEADER,
  resolveStrategy,
  type LifecycleStrategy,
} from '@/lib/lifecycleStages'
import type { FlipStage, PropertyStatus, SavedPropertySummary } from '@/types/savedProperty'
import { ChevronRight, MoreHorizontal, Bookmark, ListChecks } from 'lucide-react'
import { DataBoundary } from '@/components/ui/DataBoundary'

interface PipelineKanbanProps {
  highlightStage: PropertyStatus | null
  onEmptyAction: () => void
  onOpenTasks: (target: { id: string; title: string; stageLabel: string | null }) => void
}

// Pre-purchase tier — universal across every strategy.
const PRE_STAGES: PropertyStatus[] = [
  'prospecting',
  'pursuing',
  'negotiating',
  'under_contract',
]

// Statuses available in the per-card "Move to" dropdown.
const MOVE_TO_OPTIONS: PropertyStatus[] = [
  'prospecting',
  'pursuing',
  'negotiating',
  'under_contract',
  'owned',
  'passed',
  'archived',
]

const DRAG_MIME = 'application/x-savedproperty-id'

// Late-funnel stages where "days in stage" is a more useful action signal
// than "last touched" — these are the columns where deadlines live.
const TIME_IN_STAGE_STATUSES: ReadonlySet<PropertyStatus> = new Set([
  'negotiating',
  'under_contract',
  'owned',
])

type StrategyFilter = 'all' | LifecycleStrategy
const STRATEGY_FILTERS: StrategyFilter[] = [
  'all',
  'flip',
  'brrrr',
  'ltr',
  'str',
  'house_hack',
  'wholesale',
]
const STRATEGY_FILTER_LABEL: Record<StrategyFilter, string> = {
  all: 'All Strategies',
  flip: 'Fix & Flip',
  brrrr: 'BRRRR',
  ltr: 'LTR',
  str: 'STR',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
}

// Column descriptor — encodes which API call to fire on drop.
type Column =
  | { kind: 'pre'; status: PropertyStatus; label: string; bg: string; color: string }
  | { kind: 'owned-stage'; stage: FlipStage; strategy: LifecycleStrategy; label: string }
  | { kind: 'owned-all'; label: string }

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

/** Variance badge mirrors the styling used elsewhere; doubles as a link to
 *  the Budget page when a propertyId is supplied. */
function VarianceBadge({ pct, propertyId }: { pct: string; propertyId?: string }) {
  const n = parseFloat(pct)
  if (!Number.isFinite(n)) return null
  const cls =
    n <= 0
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20'
      : n <= 10
      ? 'bg-amber-500/10 text-amber-900 ring-amber-500/25 dark:text-amber-200 hover:bg-amber-500/20'
      : 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300 hover:bg-red-500/20'
  const content = (
    <>
      {n > 0 ? '+' : ''}
      {pct}% vs est.
    </>
  )
  const baseClasses = `text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 transition-colors ${cls}`
  if (propertyId) {
    return (
      <Link
        href={`/budget/${propertyId}`}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex ${baseClasses}`}
      >
        {content}
      </Link>
    )
  }
  return <span className={baseClasses}>{content}</span>
}

/** Compute the kanban's columns based on the active strategy filter.
 *  The pre-purchase tier is always the same 4 columns; the post-purchase
 *  tier varies. "All" shows a single unified Owned column where cards
 *  carry strategy chips; specific strategies show their own progression. */
function computeColumns(strategy: StrategyFilter): { pre: Column[]; post: Column[] } {
  const pre: Column[] = PRE_STAGES.map((s) => ({
    kind: 'pre',
    status: s,
    label: STATUS_CONFIG[s].label,
    bg: STATUS_CONFIG[s].bg,
    color: STATUS_CONFIG[s].color,
  }))

  const post: Column[] =
    strategy === 'all'
      ? [{ kind: 'owned-all', label: 'Owned' }]
      : STAGES_BY_STRATEGY[strategy].map((stage) => ({
          kind: 'owned-stage',
          stage,
          strategy,
          label: STAGE_LABELS[stage],
        }))

  return { pre, post }
}

/** Decide which column a property belongs in given the active filter. */
function columnIndexFor(
  p: SavedPropertySummary,
  columns: { pre: Column[]; post: Column[] },
  strategy: StrategyFilter,
): { tier: 'pre' | 'post'; index: number } | null {
  if (p.status !== 'owned') {
    const idx = columns.pre.findIndex((c) => c.kind === 'pre' && c.status === p.status)
    return idx >= 0 ? { tier: 'pre', index: idx } : null
  }
  // Owned property:
  if (strategy === 'all') {
    return { tier: 'post', index: 0 }
  }
  const propStrategy = resolveStrategy(p.best_strategy)
  if (propStrategy !== strategy) return null
  if (!p.flip_stage) return null
  const idx = columns.post.findIndex(
    (c) => c.kind === 'owned-stage' && c.stage === p.flip_stage,
  )
  return idx >= 0 ? { tier: 'post', index: idx } : null
}

export function PipelineKanban({ highlightStage, onEmptyAction, onOpenTasks }: PipelineKanbanProps) {
  const router = useRouter()

  const query = useSavedProperties({
    page: 0,
    pageSize: 100,
    status: 'all',
    search: '',
  })
  const updateStatus = useUpdateSavedPropertyStatus()
  const updateFlipStage = useUpdateFlipStage()

  // Default the strategy filter to whatever the user owns most of, falling
  // back to "all" so multi-strategy investors aren't tunnelled into one path.
  const defaultStrategy: StrategyFilter = useMemo(() => {
    const counts: Record<LifecycleStrategy, number> = {
      flip: 0,
      brrrr: 0,
      ltr: 0,
      str: 0,
      house_hack: 0,
      wholesale: 0,
    }
    for (const p of query.data ?? []) {
      if (p.status === 'owned') counts[resolveStrategy(p.best_strategy)] += 1
    }
    const top = (Object.entries(counts) as [LifecycleStrategy, number][])
      .sort((a, b) => b[1] - a[1])[0]
    return top && top[1] > 0 ? top[0] : 'all'
  }, [query.data])

  const [strategy, setStrategy] = useState<StrategyFilter>('all')
  // Sync to data-driven default on first load.
  const [strategyTouched, setStrategyTouched] = useState(false)
  if (!strategyTouched && defaultStrategy !== 'all' && strategy === 'all') {
    setStrategy(defaultStrategy)
    setStrategyTouched(true)
  }

  const [dropTarget, setDropTarget] = useState<{ tier: 'pre' | 'post'; index: number } | null>(null)

  const columns = useMemo(() => computeColumns(strategy), [strategy])

  // Bucket properties into columns. Anything that doesn't match the active
  // filter (e.g. a flip Owned when the LTR filter is on) is held aside so
  // it can be surfaced via the count chip instead of disappearing silently.
  const { byColumn, hiddenOwned, totalActive } = useMemo(() => {
    const byColumn: SavedPropertySummary[][][] = [
      columns.pre.map(() => [] as SavedPropertySummary[]),
      columns.post.map(() => [] as SavedPropertySummary[]),
    ]
    let hiddenOwned = 0
    let totalActive = 0
    for (const p of query.data ?? []) {
      if (p.status === 'passed' || p.status === 'archived') continue
      const slot = columnIndexFor(p, columns, strategy)
      if (!slot) {
        if (p.status === 'owned') hiddenOwned += 1
        continue
      }
      byColumn[slot.tier === 'pre' ? 0 : 1][slot.index].push(p)
      totalActive += 1
    }
    return { byColumn, hiddenOwned, totalActive }
  }, [columns, query.data, strategy])

  const closedItems = useMemo(
    () => (query.data ?? []).filter((p) => p.status === 'passed' || p.status === 'archived'),
    [query.data],
  )
  const closedCount = closedItems.length
  const passedItems = useMemo(() => closedItems.filter((p) => p.status === 'passed'), [closedItems])
  const archivedItems = useMemo(() => closedItems.filter((p) => p.status === 'archived'), [closedItems])

  const [showClosed, setShowClosed] = useState(false)

  // True when the user has at least one tracked deal but nothing has hit
  // Owned yet — drives ghost-column rendering for the post-purchase tier
  // so the "FlipCycle" promise is visible from day one.
  const noOwnedYet = useMemo(
    () => totalActive > 0 && byColumn[1].every((items) => items.length === 0),
    [byColumn, totalActive],
  )

  function handleDrop(
    target: { tier: 'pre' | 'post'; index: number },
    e: React.DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault()
    setDropTarget(null)
    const id = e.dataTransfer.getData(DRAG_MIME)
    if (!id) return
    const property = (query.data ?? []).find((p) => p.id === id)
    if (!property) return

    const col = target.tier === 'pre' ? columns.pre[target.index] : columns.post[target.index]
    if (!col) return

    if (col.kind === 'pre') {
      if (property.status === col.status) return
      updateStatus.mutate({ id, status: col.status })
    } else if (col.kind === 'owned-stage') {
      // Already in the right column?
      if (property.status === 'owned' && property.flip_stage === col.stage) return
      if (property.status !== 'owned') {
        // Promote to Owned first (backend auto-assigns Rehab — the universal
        // first stage). When the user drops directly into a later stage,
        // chain a second call to override.
        updateStatus.mutate(
          { id, status: 'owned' },
          {
            onSuccess: () => {
              if (col.stage !== 'Rehab') {
                updateFlipStage.mutate({ id, stage: col.stage })
              }
            },
          },
        )
      } else {
        updateFlipStage.mutate({ id, stage: col.stage })
      }
    } else if (col.kind === 'owned-all') {
      if (property.status !== 'owned') {
        updateStatus.mutate({ id, status: 'owned' })
      }
    }
  }

  return (
    <DataBoundary
      isLoading={query.isLoading}
      error={query.isError ? 'Failed to load your pipeline' : null}
      onRetry={() => query.refetch()}
      isEmpty={totalActive === 0 && hiddenOwned === 0}
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
      {/* Strategy filter pills — drives which post-purchase columns render. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {STRATEGY_FILTERS.map((s) => {
          const active = strategy === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStrategy(s)
                setStrategyTouched(true)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
              }`}
            >
              {STRATEGY_FILTER_LABEL[s]}
            </button>
          )
        })}
        {hiddenOwned > 0 && (
          <span className="text-[11px] text-[var(--text-label)] ml-1">
            {hiddenOwned} owned in other strateg{hiddenOwned === 1 ? 'y' : 'ies'} hidden
          </span>
        )}
      </div>

      {/* Tiered kanban — pre-purchase, divider, post-purchase. */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-3 min-w-max">
          {/* Tier 1: Pre-purchase funnel */}
          <TierGroup label="Active Funnel" tone="sky">
            {columns.pre.map((col, i) => (
              <KanbanColumn
                key={`pre-${i}`}
                col={col}
                items={byColumn[0][i]}
                isHighlighted={col.kind === 'pre' && col.status === highlightStage}
                isDropTarget={!!dropTarget && dropTarget.tier === 'pre' && dropTarget.index === i}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(DRAG_MIME)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTarget({ tier: 'pre', index: i })
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return
                  setDropTarget(null)
                }}
                onDrop={(e) => handleDrop({ tier: 'pre', index: i }, e)}
                onCardClick={(p) => {
                  const addr = buildFullAddress(p)
                  router.push(`/verdict?address=${encodeURIComponent(addr)}`)
                }}
                onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
                onOpenTasks={(p) =>
                  onOpenTasks({
                    id: p.id,
                    title: shortAddress(p),
                    stageLabel: STATUS_CONFIG[p.status].label,
                  })
                }
                isUpdating={updateStatus.isPending || updateFlipStage.isPending}
                showStrategyChip={false}
              />
            ))}
          </TierGroup>

          {/* Vertical divider between tiers */}
          <div className="w-px shrink-0 bg-[var(--border-default)]" aria-hidden />

          {/* Tier 2: Post-purchase lifecycle */}
          <TierGroup label={strategy === 'all' ? 'Owned' : STRATEGY_HEADER[strategy]} tone="positive">
            {columns.post.map((col, i) => (
              <KanbanColumn
                key={`post-${i}`}
                col={col}
                items={byColumn[1][i]}
                isHighlighted={false}
                isDropTarget={!!dropTarget && dropTarget.tier === 'post' && dropTarget.index === i}
                isGhost={noOwnedYet}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(DRAG_MIME)) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTarget({ tier: 'post', index: i })
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return
                  setDropTarget(null)
                }}
                onDrop={(e) => handleDrop({ tier: 'post', index: i }, e)}
                onCardClick={(p) => {
                  const addr = buildFullAddress(p)
                  router.push(`/verdict?address=${encodeURIComponent(addr)}`)
                }}
                onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
                onOpenTasks={(p) =>
                  onOpenTasks({
                    id: p.id,
                    title: shortAddress(p),
                    stageLabel:
                      p.flip_stage ? STAGE_LABELS[p.flip_stage] : STATUS_CONFIG[p.status].label,
                  })
                }
                isUpdating={updateStatus.isPending || updateFlipStage.isPending}
                showStrategyChip={strategy === 'all'}
              />
            ))}
          </TierGroup>

          {/* Tier 3 (collapsible): Closed deals — passed / archived. Off by
              default so the active board stays scannable; toggling opens
              two columns inline so the user can see history without
              leaving the page. */}
          {closedCount > 0 && (
            <>
              <div className="w-px shrink-0 bg-[var(--border-default)]" aria-hidden />
              <TierGroup
                label={`Closed · ${closedCount}`}
                tone="muted"
                action={
                  <button
                    type="button"
                    onClick={() => setShowClosed((prev) => !prev)}
                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
                  >
                    {showClosed ? 'Hide' : 'Show'}
                  </button>
                }
              >
                {showClosed ? (
                  <>
                    <KanbanColumn
                      col={{
                        kind: 'pre',
                        status: 'passed',
                        label: STATUS_CONFIG.passed.label,
                        bg: STATUS_CONFIG.passed.bg,
                        color: STATUS_CONFIG.passed.color,
                      }}
                      items={passedItems}
                      isHighlighted={false}
                      isDropTarget={false}
                      isGhost={false}
                      onDragOver={() => {}}
                      onDragLeave={() => {}}
                      onDrop={() => {}}
                      onCardClick={(p) => {
                        const addr = buildFullAddress(p)
                        router.push(`/verdict?address=${encodeURIComponent(addr)}`)
                      }}
                      onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
                      onOpenTasks={(p) =>
                        onOpenTasks({
                          id: p.id,
                          title: shortAddress(p),
                          stageLabel: STATUS_CONFIG[p.status].label,
                        })
                      }
                      isUpdating={updateStatus.isPending}
                      showStrategyChip={false}
                    />
                    <KanbanColumn
                      col={{
                        kind: 'pre',
                        status: 'archived',
                        label: STATUS_CONFIG.archived.label,
                        bg: STATUS_CONFIG.archived.bg,
                        color: STATUS_CONFIG.archived.color,
                      }}
                      items={archivedItems}
                      isHighlighted={false}
                      isDropTarget={false}
                      isGhost={false}
                      onDragOver={() => {}}
                      onDragLeave={() => {}}
                      onDrop={() => {}}
                      onCardClick={(p) => {
                        const addr = buildFullAddress(p)
                        router.push(`/verdict?address=${encodeURIComponent(addr)}`)
                      }}
                      onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
                      onOpenTasks={(p) =>
                        onOpenTasks({
                          id: p.id,
                          title: shortAddress(p),
                          stageLabel: STATUS_CONFIG[p.status].label,
                        })
                      }
                      isUpdating={updateStatus.isPending}
                      showStrategyChip={false}
                    />
                  </>
                ) : (
                  <ClosedSummaryCard
                    passed={passedItems.length}
                    archived={archivedItems.length}
                    onClick={() => setShowClosed(true)}
                  />
                )}
              </TierGroup>
            </>
          )}
        </div>
      </div>

      {closedCount > 0 && (
        <div className="mt-4 text-right">
          <button
            onClick={() => router.push('/saved-properties')}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors"
          >
            See full saved-properties list
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </DataBoundary>
  )
}

// ───────────────────────────────────────────────────────
// Collapsed-closed summary card

function ClosedSummaryCard({
  passed,
  archived,
  onClick,
}: {
  passed: number
  archived: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[200px] shrink-0 min-h-[180px] rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] flex flex-col items-center justify-center gap-1 text-[var(--text-label)] hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)] transition-colors"
    >
      <span className="text-2xl font-bold tabular-nums">{passed + archived}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">
        {passed} passed · {archived} archived
      </span>
      <span className="text-[10px] text-[var(--text-label)] mt-1">Click to expand</span>
    </button>
  )
}

// ───────────────────────────────────────────────────────
// Tier wrapper

function TierGroup({
  label,
  tone,
  children,
  action,
}: {
  label: string
  tone: 'sky' | 'positive' | 'muted'
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const toneClass =
    tone === 'sky'
      ? 'text-[var(--accent-sky)]'
      : tone === 'positive'
      ? 'text-[var(--status-positive)]'
      : 'text-[var(--text-label)]'
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${toneClass}`}>{label}</p>
        {action}
      </div>
      <div className="flex gap-3">{children}</div>
    </div>
  )
}

// ───────────────────────────────────────────────────────
// Column

interface KanbanColumnProps {
  col: Column
  items: SavedPropertySummary[]
  isHighlighted: boolean
  isDropTarget: boolean
  /** Render dimmed with a "future stage" hint when no Owned properties exist
   *  yet — telegraphs the FlipCycle progression on day one. */
  isGhost?: boolean
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onCardClick: (p: SavedPropertySummary) => void
  onChangeStatus: (id: string, status: PropertyStatus) => void
  onOpenTasks: (p: SavedPropertySummary) => void
  isUpdating: boolean
  showStrategyChip: boolean
}

function KanbanColumn({
  col,
  items,
  isHighlighted,
  isDropTarget,
  isGhost,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardClick,
  onChangeStatus,
  onOpenTasks,
  isUpdating,
  showStrategyChip,
}: KanbanColumnProps) {
  const headerBg =
    col.kind === 'pre'
      ? col.bg
      : col.kind === 'owned-stage'
      ? 'bg-[rgba(52,211,153,0.10)]'
      : 'bg-[rgba(52,211,153,0.10)]'
  const headerColor =
    col.kind === 'pre'
      ? col.color
      : 'text-[var(--status-positive)]'

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-[200px] shrink-0 rounded-xl border transition-colors ${
        isDropTarget
          ? 'border-[var(--accent-sky)] bg-[var(--color-sky-dim)] ring-2 ring-[var(--accent-sky)] ring-offset-1 ring-offset-[var(--surface-base)]'
          : isGhost
          ? 'border-dashed border-[var(--border-default)] bg-[var(--surface-base)] opacity-60'
          : isHighlighted
          ? 'border-[var(--border-focus)] bg-[var(--surface-elevated)]'
          : 'border-[var(--border-default)] bg-[var(--surface-card)]'
      } flex flex-col min-h-[180px]`}
    >
      <div className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] ${headerBg}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wide ${headerColor}`}>{col.label}</h3>
        <span className="text-xs font-semibold tabular-nums text-[var(--text-label)]">
          {items.length}
        </span>
      </div>
      <div className="p-2 flex flex-col gap-2 flex-1">
        {items.length === 0 ? (
          isGhost ? (
            <p className="text-[11px] text-[var(--text-label)] leading-snug py-3 text-center px-1">
              Once a deal hits Owned, your <span className="font-semibold">{col.label}</span> phase lives here.
            </p>
          ) : (
            <p className="text-xs text-[var(--text-label)] py-3 text-center">
              {isDropTarget ? 'Drop to move here' : 'No properties'}
            </p>
          )
        ) : (
          items.map((p) => (
            <KanbanCard
              key={p.id}
              property={p}
              onClick={() => onCardClick(p)}
              onChangeStatus={(s) => onChangeStatus(p.id, s)}
              onOpenTasks={() => onOpenTasks(p)}
              isUpdating={isUpdating}
              showStrategyChip={showStrategyChip}
            />
          ))
        )}
      </div>
    </div>
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
  showStrategyChip: boolean
}

function KanbanCard({
  property,
  onClick,
  onChangeStatus,
  onOpenTasks,
  isUpdating,
  showStrategyChip,
}: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const strategyLabel = property.best_strategy
    ? (STRATEGY_LABELS[property.best_strategy] ?? property.best_strategy)
    : null

  const showDaysInStage = TIME_IN_STAGE_STATUSES.has(property.status)
  // For Owned cards we want time-in-current-lifecycle-stage (Rehab → Listed
  // → Sold etc.), not time-since-becoming-Owned. ``flip_stage_entered_at``
  // is stamped on every flip-stage transition; fall back to the broader
  // status_changed_at if it's missing.
  const daysInStage = showDaysInStage
    ? daysSince(
        property.status === 'owned'
          ? property.flip_stage_entered_at ?? property.status_changed_at ?? property.updated_at
          : property.status_changed_at ?? property.updated_at,
      )
    : null
  const showVariance = property.status === 'owned' && !!property.budget_variance_pct

  // The "All" filter shows owned cards from every strategy together; surface
  // the strategy + sub-stage as chips so the user can scan them at a glance.
  const showStageBadge = property.status === 'owned' && !!property.flip_stage

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
            {property.address_city}
            {property.address_state ? `, ${property.address_state}` : ''}
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
        {(showStrategyChip && showStageBadge) || showVariance ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {showStrategyChip && showStageBadge && (
              <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]">
                {strategyLabel ?? 'Flip'} · {STAGE_LABELS[property.flip_stage as FlipStage]}
              </span>
            )}
            {showVariance && (
              <VarianceBadge
                pct={property.budget_variance_pct as string}
                propertyId={property.id}
              />
            )}
          </div>
        ) : strategyLabel && property.status !== 'owned' ? (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-label)] truncate">
            {strategyLabel}
          </p>
        ) : null}
      </button>

      {/* Tasks badge */}
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

      {/* Status menu */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((prev) => !prev)
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[var(--hover-overlay)] text-[var(--text-label)]"
        aria-label="Change status"
        disabled={isUpdating}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
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
            {MOVE_TO_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  if (s !== property.status) onChangeStatus(s)
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
