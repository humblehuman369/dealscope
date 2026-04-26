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
import { ChevronRight, MoreHorizontal, Bookmark } from 'lucide-react'
import { DataBoundary } from '@/components/ui/DataBoundary'

interface PipelineKanbanProps {
  highlightStage: PropertyStatus | null
  onEmptyAction: () => void
}

function shortAddress(p: SavedPropertySummary): string {
  return p.nickname || p.address_street
}

function buildFullAddress(p: SavedPropertySummary): string {
  const stateZip = [p.address_state, p.address_zip].filter(Boolean).join(' ')
  return [p.address_street, p.address_city, stateZip].filter(Boolean).join(', ')
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

  // Group by status
  const byStatus = useMemo(() => {
    const groups: Record<PropertyStatus, SavedPropertySummary[]> = {
      watching: [],
      analyzing: [],
      contacted: [],
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

          return (
            <div
              key={stage}
              className={`rounded-xl border ${
                isHighlighted
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
                    No properties
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
    </DataBoundary>
  )
}

// ───────────────────────────────────────────────────────
// Card

interface KanbanCardProps {
  property: SavedPropertySummary
  onClick: () => void
  onChangeStatus: (newStatus: PropertyStatus) => void
  isUpdating: boolean
}

function KanbanCard({ property, onClick, onChangeStatus, isUpdating }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const strategyLabel = property.best_strategy
    ? (STRATEGY_LABELS[property.best_strategy] ?? property.best_strategy)
    : null

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg p-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--border-focus)] transition-all"
      >
        <p className="text-sm font-semibold text-[var(--text-heading)] truncate pr-6">
          {shortAddress(property)}
        </p>
        {property.address_city && (
          <p className="text-[11px] text-[var(--text-label)] truncate">
            {property.address_city}{property.address_state ? `, ${property.address_state}` : ''}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--text-label)]">
            {formatRelativeDate(property.updated_at)}
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
        {strategyLabel && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-label)] truncate">
            {strategyLabel}
          </p>
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
            {(['watching', 'analyzing', 'contacted', 'under_contract', 'owned', 'passed', 'archived'] as PropertyStatus[]).map(s => (
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
