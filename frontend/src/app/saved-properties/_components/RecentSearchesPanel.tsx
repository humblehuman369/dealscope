'use client'

/**
 * Recent Searches tab content. Lifted out of the legacy /search-history page
 * in Phase 15 so the same view can sit alongside Saved Properties as a tab
 * within the unified "Recent Searches & Saved Properties" page.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  useSearchHistory,
  useSearchHistoryStats,
  useDeleteSearchHistoryEntry,
  useClearSearchHistory,
  type SearchHistoryItem,
} from '@/hooks/useSearchHistory'
import { DataBoundary } from '@/components/ui/DataBoundary'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Search,
  MapPin,
  Building2,
  Clock,
  Trash2,
  ExternalLink,
  TrendingUp,
  Filter,
  Calendar,
  BarChart3,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const PAGE_SIZE = 20

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatCurrency(value?: number) {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

interface RecentSearchesPanelProps {
  /** Triggered when the user clicks the empty-state "Search Properties" CTA. */
  onOpenSearchModal: () => void
}

export function RecentSearchesPanel({ onOpenSearchModal }: RecentSearchesPanelProps) {
  const [filterSuccessful, setFilterSuccessful] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showClearAll, setShowClearAll] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [filterSuccessful])

  const historyQuery = useSearchHistory({
    page,
    pageSize: PAGE_SIZE,
    successfulOnly: filterSuccessful,
  })
  const statsQuery = useSearchHistoryStats()
  const deleteEntryMutation = useDeleteSearchHistoryEntry()
  const clearAllMutation = useClearSearchHistory()

  const history = historyQuery.data ?? []
  const stats = statsQuery.data ?? null
  const totalCount = stats?.total_searches ?? history.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteEntryMutation.mutate(deleteTarget)
    setDeleteTarget(null)
  }

  const handleConfirmClearAll = () => {
    clearAllMutation.mutate()
    setShowClearAll(false)
  }

  return (
    <>
      {/* Filter + clear-all controls (right-aligned strip) */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={() => setFilterSuccessful(!filterSuccessful)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
            filterSuccessful
              ? 'bg-[var(--accent-sky)] text-[var(--text-inverse)]'
              : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-body)] hover:border-[var(--border-strong)]'
          }`}
          style={filterSuccessful ? { boxShadow: 'var(--shadow-card)' } : undefined}
        >
          <Filter className="w-4 h-4" />
          Successful Only
        </button>
        {history.length > 0 && (
          <button
            onClick={() => setShowClearAll(true)}
            className="px-4 py-2 text-[var(--status-negative)] hover:bg-[rgba(248,113,113,0.10)] rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-sky-dim)] rounded-lg">
                <Search className="w-5 h-5 text-[var(--accent-sky)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">
                  {stats.total_searches}
                </p>
                <p className="text-xs text-[var(--text-label)] font-medium">Total Searches</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(52,211,153,0.10)] rounded-lg">
                <TrendingUp className="w-5 h-5 text-[var(--status-positive)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">
                  {stats.successful_searches}
                </p>
                <p className="text-xs text-[var(--text-label)] font-medium">Successful</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(251,191,36,0.10)] rounded-lg">
                <Star className="w-5 h-5 text-[var(--status-warning)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">
                  {stats.saved_from_search}
                </p>
                <p className="text-xs text-[var(--text-label)] font-medium">Saved</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--surface-elevated)] rounded-lg">
                <Calendar className="w-5 h-5 text-[var(--status-info)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums">
                  {stats.searches_this_week}
                </p>
                <p className="text-xs text-[var(--text-label)] font-medium">This Week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Markets */}
      {stats && stats.top_markets.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)] mb-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--text-label)]" />
            Your Top Markets
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_markets.map((market: { state: string; count: number }) => (
              <div
                key={market.state}
                className="px-3 py-1.5 bg-[var(--color-sky-dim)] rounded-full text-sm border border-[var(--border-focus)]"
              >
                <span className="font-semibold text-[var(--accent-sky)]">{market.state}</span>
                <span className="text-[var(--text-secondary)] ml-1.5 tabular-nums">
                  ({market.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search History List */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
        <DataBoundary
          isLoading={historyQuery.isLoading}
          error={historyQuery.isError ? 'Failed to load search history' : null}
          onRetry={() => historyQuery.refetch()}
          isEmpty={history.length === 0}
          emptyIcon={<Search className="w-8 h-8 text-[var(--text-label)]" />}
          emptyTitle="No search history yet"
          emptyDescription="Start searching for properties to build your history"
          emptyAction={
            <button
              onClick={onOpenSearchModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-[var(--text-inverse)] font-semibold rounded-lg transition-all"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <Search className="w-4 h-4" />
              Search Properties
            </button>
          }
        >
          <div className="divide-y divide-[var(--border-subtle)]">
            {history.map((item: SearchHistoryItem) => (
              <div
                key={item.id}
                className="px-6 py-4 hover:bg-[var(--surface-card-hover)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          item.was_successful
                            ? 'bg-[rgba(52,211,153,0.10)]'
                            : 'bg-[rgba(248,113,113,0.10)]'
                        }`}
                      >
                        {item.was_successful ? (
                          <Building2 className="w-4 h-4 text-[var(--status-positive)]" />
                        ) : (
                          <X className="w-4 h-4 text-[var(--status-negative)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-heading)] truncate">
                          {item.address_street || item.search_query}
                        </p>
                        {(item.address_city || item.address_state) && (
                          <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {[item.address_city, item.address_state].filter(Boolean).join(', ')}
                            {item.address_zip && ` ${item.address_zip}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.result_summary && item.was_successful && (
                      <div className="mt-3 ml-11 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {item.result_summary.property_type && (
                          <span className="text-[var(--text-secondary)]">
                            {item.result_summary.property_type}
                          </span>
                        )}
                        {item.result_summary.bedrooms != null && (
                          <span className="text-[var(--text-secondary)] tabular-nums">
                            {item.result_summary.bedrooms} bd
                          </span>
                        )}
                        {item.result_summary.bathrooms != null && (
                          <span className="text-[var(--text-secondary)] tabular-nums">
                            {item.result_summary.bathrooms} ba
                          </span>
                        )}
                        {item.result_summary.square_footage != null && (
                          <span className="text-[var(--text-secondary)] tabular-nums">
                            {item.result_summary.square_footage.toLocaleString()} sqft
                          </span>
                        )}
                        {item.result_summary.estimated_value != null && (
                          <span className="font-semibold text-[var(--accent-sky)] tabular-nums">
                            {formatCurrency(item.result_summary.estimated_value)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 ml-11 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-label)] flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.searched_at)}
                      </span>
                      {item.search_source && item.search_source !== 'web' && (
                        <span className="px-2 py-0.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-label)] rounded">
                          {item.search_source}
                        </span>
                      )}
                      {item.was_saved && (
                        <span className="px-2 py-0.5 bg-[rgba(52,211,153,0.10)] text-xs text-[var(--status-positive)] rounded flex items-center gap-1 font-medium">
                          <Star className="w-3 h-3" />
                          Saved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.was_successful && (
                      <Link
                        href={`/property?address=${encodeURIComponent(item.search_query)}`}
                        className="p-2 text-[var(--accent-sky)] hover:bg-[var(--color-sky-dim)] rounded-lg transition-colors"
                        title="View property"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="p-2 text-[var(--text-label)] hover:text-[var(--status-negative)] hover:bg-[rgba(248,113,113,0.10)] rounded-lg transition-colors"
                      title="Delete from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataBoundary>

        {totalCount > PAGE_SIZE && !historyQuery.isLoading && !historyQuery.isError && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)]">
            <p className="text-sm text-[var(--text-label)] tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
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
        title="Delete Search Entry"
        description="Remove this search from your history?"
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showClearAll}
        title="Clear All History"
        description="This will permanently delete all your search history. This cannot be undone."
        variant="danger"
        confirmLabel="Clear Everything"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearAll(false)}
      />
    </>
  )
}
