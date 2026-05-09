'use client'

/**
 * Saved Properties tab content. Lifted out of the legacy /saved-properties
 * page in Phase 15 so the same view can sit alongside Recent Searches as a
 * tab within the unified "Recent Searches & Saved Properties" page.
 *
 * Stats + status filter pills + search input + paginated list. The page-
 * level header and search-modal trigger now live one level up.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useSavedProperties,
  useSavedPropertyStats,
  useDeleteSavedProperty,
} from '@/hooks/useSavedProperties'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Bookmark, Search, MapPin, Building2, Clock, Trash2,
  TrendingUp, Star, Eye,
  ChevronRight, BarChart3, ChevronLeft,
} from 'lucide-react'
import type { PropertyStatus, SavedPropertySummary } from '@/types/savedProperty'
import {
  STATUS_CONFIG,
  STRATEGY_LABELS,
  formatCurrency,
  formatPercent,
  formatRelativeDate as formatDate,
} from '@/lib/savedPropertyStatus'

const PAGE_SIZE = 20

interface SavedPropertiesPanelProps {
  /** Triggered when the user clicks the empty-state "Search Properties" CTA. */
  onOpenSearchModal: () => void
}

export function SavedPropertiesPanel({ onOpenSearchModal }: SavedPropertiesPanelProps) {
  const router = useRouter()

  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    setPage(0)
  }, [filterStatus, debouncedSearch])

  const propertiesQuery = useSavedProperties({
    page,
    pageSize: PAGE_SIZE,
    status: filterStatus,
    search: debouncedSearch,
  })
  const statsQuery = useSavedPropertyStats()
  const deleteMutation = useDeleteSavedProperty()

  const properties = propertiesQuery.data ?? []
  const stats = statsQuery.data ?? null
  const statusCounts = stats?.by_status ?? {}
  const totalSaved = stats?.total ?? 0
  const totalCount = stats?.total ?? properties.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget)
    setDeleteTarget(null)
  }

  const goToProperty = (property: SavedPropertySummary) => {
    const stateZip = [property.address_state, property.address_zip].filter(Boolean).join(' ')
    const fullAddress = [property.address_street, property.address_city, stateZip]
      .filter(Boolean)
      .join(', ')
    router.push(`/app/verdict?address=${encodeURIComponent(fullAddress)}`)
  }

  const hasActiveFilters = filterStatus !== 'all' || !!debouncedSearch
  const emptyTitle = hasActiveFilters
    ? 'No properties match your filters'
    : 'No saved properties yet'
  const emptyDescription = hasActiveFilters
    ? 'Try adjusting your filters or search terms'
    : 'Save properties from any analysis page using the bookmark icon in the address bar'

  return (
    <>
      {/* Stats Cards */}
      {totalSaved > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-sky-dim)] rounded-lg">
                <Bookmark className="w-5 h-5 text-[var(--accent-sky)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">{totalSaved}</p>
                <p className="text-xs text-[var(--text-label)] font-medium">Total Saved</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-sky-dim)] rounded-lg">
                <Eye className="w-5 h-5 text-[var(--accent-sky)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">{statusCounts.prospecting || 0}</p>
                <p className="text-xs text-[var(--text-label)] font-medium">Prospecting</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(251,191,36,0.10)] rounded-lg">
                <BarChart3 className="w-5 h-5 text-[var(--status-warning)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">{statusCounts.negotiating || 0}</p>
                <p className="text-xs text-[var(--text-label)] font-medium">Negotiating</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(52,211,153,0.10)] rounded-lg">
                <TrendingUp className="w-5 h-5 text-[var(--status-positive)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">{statusCounts.owned || 0}</p>
                <p className="text-xs text-[var(--text-label)] font-medium">Owned</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
            filterStatus === 'all'
              ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
              : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
          }`}
          style={filterStatus === 'all' ? { boxShadow: 'var(--shadow-card)' } : undefined}
        >
          All
        </button>
        {(['prospecting', 'pursuing', 'negotiating', 'under_contract', 'owned', 'passed'] as PropertyStatus[]).map(s => {
          const config = STATUS_CONFIG[s]
          const count = statusCounts[s] || 0
          if (count === 0 && filterStatus !== s) return null
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filterStatus === s
                  ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
              }`}
              style={filterStatus === s ? { boxShadow: 'var(--shadow-card)' } : undefined}
            >
              {config.label} {count > 0 && <span className="tabular-nums">({count})</span>}
            </button>
          )
        })}

        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-label)]" />
          <input
            type="text"
            placeholder="Search saved properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-[var(--surface-input)] text-[var(--text-heading)] border border-[var(--border-default)] placeholder:text-[var(--text-label)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky-dim)] focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
      </div>

      {/* Properties List */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
        <DataBoundary
          isLoading={propertiesQuery.isLoading}
          error={propertiesQuery.isError ? 'Failed to load saved properties' : null}
          onRetry={() => propertiesQuery.refetch()}
          isEmpty={properties.length === 0}
          emptyIcon={<Bookmark className="w-8 h-8 text-[var(--text-label)]" />}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={
            !hasActiveFilters ? (
              <button
                onClick={onOpenSearchModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] font-semibold rounded-lg transition-all"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <Search className="w-4 h-4" />
                Search Properties
              </button>
            ) : undefined
          }
        >
          <div className="divide-y divide-[var(--border-subtle)]">
            {properties.map((property: SavedPropertySummary) => {
              const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG.prospecting
              return (
                <div
                  key={property.id}
                  className="px-6 py-4 hover:bg-[var(--surface-card-hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => goToProperty(property)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${statusConfig.bg}`}>
                          <Building2 className={`w-4 h-4 ${statusConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-heading)] truncate">
                            {property.nickname || property.address_street}
                          </p>
                          {(property.address_city || property.address_state) && (
                            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[property.address_city, property.address_state].filter(Boolean).join(', ')}
                              {property.address_zip && ` ${property.address_zip}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 ml-11 flex flex-wrap items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>

                        {property.best_strategy && (
                          <span className="text-[var(--text-body)] flex items-center gap-1">
                            <Star className="w-3 h-3 text-[var(--status-warning)]" />
                            {STRATEGY_LABELS[property.best_strategy] || property.best_strategy}
                          </span>
                        )}

                        {property.best_cash_flow !== undefined && property.best_cash_flow !== null && (
                          <span className={`font-semibold tabular-nums ${property.best_cash_flow >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                            {formatCurrency(property.best_cash_flow)}/yr
                          </span>
                        )}

                        {property.best_coc_return !== undefined && property.best_coc_return !== null && (
                          <span className={`font-semibold tabular-nums ${property.best_coc_return >= 0 ? 'text-[var(--status-positive)]' : 'text-[var(--status-negative)]'}`}>
                            {formatPercent(property.best_coc_return)} CoC
                          </span>
                        )}
                      </div>

                      <div className="mt-2 ml-11 flex items-center gap-2">
                        <span className="text-xs text-[var(--text-label)] flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          Saved {formatDate(property.saved_at)}
                        </span>
                        {property.tags && property.tags.length > 0 && (
                          <div className="flex gap-1">
                            {property.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-label)] rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {property.tags.length > 3 && (
                              <span className="text-xs text-[var(--text-label)] tabular-nums">+{property.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => goToProperty(property)}
                        className="p-2 text-[var(--accent-sky)] hover:bg-[var(--color-sky-dim)] rounded-lg transition-colors"
                        title="Analyze property"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(property.id)}
                        className="p-2 text-[var(--text-label)] hover:text-[var(--status-negative)] hover:bg-[rgba(248,113,113,0.10)] rounded-lg transition-colors"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DataBoundary>

        {totalCount > PAGE_SIZE && !propertiesQuery.isLoading && !propertiesQuery.isError && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)]">
            <p className="text-sm text-[var(--text-label)] tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={!hasPrevPage}
                className="p-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--text-secondary)] tabular-nums px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage}
                className="p-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Property"
        description="Remove this property from your saved list? You can always re-add it later."
        variant="danger"
        confirmLabel="Remove"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
