'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { 
  History, Search, MapPin, Building2, Clock, Trash2, 
  ExternalLink, TrendingUp, Filter,
  Calendar, BarChart3, Star, AlertCircle, X
} from 'lucide-react'

// ===========================================
// Search History Page — Dark Fintech Theme
// ===========================================
// Typography: Inter 700 headlines, 400 body, 600 financial data
// Text hierarchy: slate-100 > slate-300 > slate-400 > slate-500
// Accents: sky-400 (primary), teal-400 (positive), amber-400 (caution),
//          red-400 (negative), emerald-400 (success/income)
// Theme: true black base, #0C1220 cards, 7% white borders
// ===========================================

// Use relative URLs to go through Next.js API routes (which proxy to backend)

// ===========================================
// Types
// ===========================================

interface SearchHistoryItem {
  id: string
  user_id?: string
  search_query: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  property_cache_id?: string
  zpid?: string
  result_summary?: {
    property_type?: string
    bedrooms?: number
    bathrooms?: number
    square_footage?: number
    estimated_value?: number
    rent_estimate?: number
  }
  search_source?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
}

interface SearchStats {
  total_searches: number
  successful_searches: number
  saved_from_search: number
  searches_this_week: number
  searches_this_month: number
  top_markets: { state: string; count: number }[]
  recent_searches: SearchHistoryItem[]
}

// ===========================================
// Main Component
// ===========================================

export default function SearchHistoryPage() {
  const { isAuthenticated, isLoading } = useSession()
  const router = useRouter()
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSuccessful, setFilterSuccessful] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showClearAll, setShowClearAll] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch history and stats
  const fetchData = useCallback(async () => {
    try {
      const [historyData, statsData] = await Promise.all([
        api.get<{ items: SearchHistoryItem[] }>(`/api/v1/search-history?limit=50&successful_only=${filterSuccessful}`),
        api.get<SearchStats>('/api/v1/search-history/stats')
      ])

      setHistory(historyData.items || [])
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch search history:', err)
      setError('Failed to load search history')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [filterSuccessful])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  // Delete single entry (triggered by ConfirmDialog)
  const confirmDeleteEntry = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/v1/search-history/${deleteTarget}`)
      setHistory(prev => prev.filter(h => h.id !== deleteTarget))
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  // Clear all history (triggered by ConfirmDialog)
  const confirmClearAll = async () => {
    try {
      await api.delete('/api/v1/search-history')
      setHistory([])
      await fetchData()
    } catch (err) {
      console.error('Failed to clear history:', err)
    } finally {
      setShowClearAll(false)
    }
  }

  const formatDate = (dateString: string) => {
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  // ── Loading / auth gate ──────────────────────

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    )
  }

  // ── Render ───────────────────────────────────

  return (
    <div
      className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
              <History className="w-8 h-8 text-sky-400" />
              Search History
            </h1>
            <p className="mt-2 text-slate-400">
              Review your past property searches
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterSuccessful(!filterSuccessful)}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
                filterSuccessful
                  ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                  : 'bg-[#0C1220] text-slate-400 border border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Successful Only
            </button>
            {history.length > 0 && (
              <button
                onClick={() => setShowClearAll(true)}
                className="px-4 py-2.5 text-red-400 hover:bg-red-400/10 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Cards ───────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {/* Total Searches — sky (primary data) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-400/10 rounded-lg">
                  <Search className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{stats.total_searches}</p>
                  <p className="text-xs text-slate-500 font-medium">Total Searches</p>
                </div>
              </div>
            </div>

            {/* Successful — emerald (success) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-400/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{stats.successful_searches}</p>
                  <p className="text-xs text-slate-500 font-medium">Successful</p>
                </div>
              </div>
            </div>

            {/* Saved — amber (value/importance) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400/10 rounded-lg">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{stats.saved_from_search}</p>
                  <p className="text-xs text-slate-500 font-medium">Saved</p>
                </div>
              </div>
            </div>

            {/* This Week — teal (positive/info) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-400/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{stats.searches_this_week}</p>
                  <p className="text-xs text-slate-500 font-medium">This Week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Top Markets ───────────────────────── */}
        {stats && stats.top_markets.length > 0 && (
          <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07] mb-8">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Your Top Markets
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.top_markets.map(market => (
                <div
                  key={market.state}
                  className="px-3 py-1.5 bg-sky-400/10 rounded-full text-sm border border-sky-400/10"
                >
                  <span className="font-semibold text-sky-400">{market.state}</span>
                  <span className="text-sky-400/60 ml-1.5 tabular-nums">({market.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error State ───────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Search History List ────────────────── */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.07]">
            <h3 className="text-lg font-semibold text-slate-100">
              Recent Searches
            </h3>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
            </div>
          ) : history.length === 0 ? (
            /* ── Empty State ─────────────────────── */
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
                <Search className="w-8 h-8 text-slate-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-100 mb-2">
                No search history yet
              </h4>
              <p className="text-slate-400 mb-6 max-w-sm">
                Start searching for properties to build your history
              </p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
              >
                <Search className="w-4 h-4" />
                Search Properties
              </button>
              <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
            </div>
          ) : (
            /* ── History Items ────────────────────── */
            <div className="divide-y divide-white/[0.07]">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          item.was_successful 
                            ? 'bg-emerald-400/10' 
                            : 'bg-red-400/10'
                        }`}>
                          {item.was_successful ? (
                            <Building2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {/* Address */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-100 truncate">
                            {item.address_street || item.search_query}
                          </p>
                          {(item.address_city || item.address_state) && (
                            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[item.address_city, item.address_state].filter(Boolean).join(', ')}
                              {item.address_zip && ` ${item.address_zip}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Property Summary */}
                      {item.result_summary && item.was_successful && (
                        <div className="mt-3 ml-11 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          {item.result_summary.property_type && (
                            <span className="text-slate-400">
                              {item.result_summary.property_type}
                            </span>
                          )}
                          {item.result_summary.bedrooms != null && (
                            <span className="text-slate-400 tabular-nums">
                              {item.result_summary.bedrooms} bd
                            </span>
                          )}
                          {item.result_summary.bathrooms != null && (
                            <span className="text-slate-400 tabular-nums">
                              {item.result_summary.bathrooms} ba
                            </span>
                          )}
                          {item.result_summary.square_footage != null && (
                            <span className="text-slate-400 tabular-nums">
                              {item.result_summary.square_footage.toLocaleString()} sqft
                            </span>
                          )}
                          {item.result_summary.estimated_value != null && (
                            <span className="font-semibold text-sky-400 tabular-nums">
                              {formatCurrency(item.result_summary.estimated_value)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="mt-2 ml-11 flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.searched_at)}
                        </span>
                        {item.search_source && item.search_source !== 'web' && (
                          <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] text-xs text-slate-500 rounded">
                            {item.search_source}
                          </span>
                        )}
                        {item.was_saved && (
                          <span className="px-2 py-0.5 bg-emerald-400/10 text-xs text-emerald-400 rounded flex items-center gap-1 font-medium">
                            <Star className="w-3 h-3" />
                            Saved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.was_successful && (
                        <Link
                          href={`/property?address=${encodeURIComponent(item.search_query)}`}
                          className="p-2 text-sky-400 hover:bg-sky-400/10 rounded-lg transition-colors"
                          title="View property"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Single Entry Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Search Entry"
        description="Remove this search from your history?"
        variant="danger"
        confirmLabel="Delete"
        onConfirm={confirmDeleteEntry}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Clear All Confirmation */}
      <ConfirmDialog
        open={showClearAll}
        title="Clear All History"
        description="This will permanently delete all your search history. This cannot be undone."
        variant="danger"
        confirmLabel="Clear Everything"
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearAll(false)}
      />
    </div>
  )
}
