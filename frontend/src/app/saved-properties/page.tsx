'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Bookmark, Search, MapPin, Building2, Clock, Trash2,
  TrendingUp, Star, AlertCircle,
  ChevronRight, BarChart3, Eye, X
} from 'lucide-react'

// ===========================================
// Saved Properties Page — Dark Fintech Theme
// ===========================================
// Typography: Inter 700 headlines, 400 body, 600 financial data
// Text hierarchy: slate-100 > slate-300 > slate-400 > slate-500
// Accents: sky-400 (primary), teal-400 (positive), amber-400 (caution),
//          red-400 (negative), emerald-400 (success/income)
// Theme: true black base, #0C1220 cards, 7% white borders
// Status colors carry meaning: sky=watching, teal=analyzing,
//          amber=in-progress, emerald=success, slate=inactive
// ===========================================

// ===========================================
// Types
// ===========================================

type PropertyStatus =
  | 'watching'
  | 'analyzing'
  | 'contacted'
  | 'under_contract'
  | 'owned'
  | 'passed'
  | 'archived'

interface SavedPropertySummary {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  nickname?: string
  status: PropertyStatus
  tags?: string[]
  color_label?: string
  priority?: number
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  saved_at: string
  last_viewed_at?: string
  updated_at: string
}

interface SavedPropertyStats {
  total: number
  by_status: Record<string, number>
}

// Semantic status colors — color carries meaning, not decoration
const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  watching:        { label: 'Watching',        color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  analyzing:       { label: 'Analyzing',       color: 'text-teal-400',    bg: 'bg-teal-400/10'    },
  contacted:       { label: 'Contacted',       color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  under_contract:  { label: 'Under Contract',  color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  owned:           { label: 'Owned',           color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  passed:          { label: 'Passed',          color: 'text-slate-400',   bg: 'bg-slate-400/10'   },
  archived:        { label: 'Archived',        color: 'text-slate-500',   bg: 'bg-slate-500/10'   },
}

const STRATEGY_LABELS: Record<string, string> = {
  ltr: 'Long-Term Rental',
  str: 'Short-Term Rental',
  flip: 'Fix & Flip',
  brrrr: 'BRRRR',
  wholesale: 'Wholesale',
  subject_to: 'Subject-To',
}

// ===========================================
// Main Component
// ===========================================

export default function SavedPropertiesPage() {
  const { isAuthenticated, isLoading } = useSession()
  const router = useRouter()
  const [properties, setProperties] = useState<SavedPropertySummary[]>([])
  const [stats, setStats] = useState<SavedPropertyStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch saved properties
  const fetchData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const [propertiesData, statsData] = await Promise.all([
        api.get<SavedPropertySummary[]>(`/api/v1/properties/saved?${params.toString()}`),
        api.get<SavedPropertyStats>('/api/v1/properties/saved/stats'),
      ])

      setProperties(propertiesData || [])
      setStats(statsData)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch saved properties:', err)
      setError('Failed to load saved properties')
    } finally {
      setIsLoadingData(false)
    }
  }, [filterStatus, searchQuery])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  // Delete a saved property (triggered by ConfirmDialog)
  const confirmDeleteProperty = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/v1/properties/saved/${deleteTarget}`)
      setProperties(prev => prev.filter(p => p.id !== deleteTarget))
    } catch (err) {
      console.error('Failed to delete property:', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  // Navigate to property analysis
  const goToProperty = (property: SavedPropertySummary) => {
    const fullAddress = [
      property.address_street,
      property.address_city,
      property.address_state,
      property.address_zip,
    ].filter(Boolean).join(', ')

    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`)
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '—'
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '—'
    return `${(value * 100).toFixed(1)}%`
  }

  // ── Loading / auth gate ──────────────────────

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    )
  }

  const statusCounts = stats?.by_status || {}
  const totalSaved = stats?.total || properties.length

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
              <Bookmark className="w-8 h-8 text-sky-400" />
              Saved Properties
            </h1>
            <p className="mt-2 text-slate-400">
              <span className="text-slate-100 font-semibold tabular-nums">{totalSaved}</span>{' '}
              {totalSaved === 1 ? 'property' : 'properties'} in your portfolio
            </p>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
          >
            <Search className="w-4 h-4" />
            Search New Property
          </button>
        </div>

        {/* ── Stats Cards ───────────────────────── */}
        {totalSaved > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {/* Total Saved — sky (primary data) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-400/10 rounded-lg">
                  <Bookmark className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{totalSaved}</p>
                  <p className="text-xs text-slate-500 font-medium">Total Saved</p>
                </div>
              </div>
            </div>

            {/* Watching — sky (attention) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-400/10 rounded-lg">
                  <Eye className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{statusCounts.watching || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Watching</p>
                </div>
              </div>
            </div>

            {/* Analyzing — teal (positive process) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-400/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{statusCounts.analyzing || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Analyzing</p>
                </div>
              </div>
            </div>

            {/* Owned — emerald (income/success) */}
            <div className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-400/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">{statusCounts.owned || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Owned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ───────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Status filter pills */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-sky-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.15)]'
                : 'bg-[#0C1220] text-slate-400 border border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]'
            }`}
          >
            All
          </button>
          {(['watching', 'analyzing', 'contacted', 'under_contract', 'owned', 'passed'] as PropertyStatus[]).map(s => {
            const config = STATUS_CONFIG[s]
            const count = statusCounts[s] || 0
            if (count === 0 && filterStatus !== s) return null
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  filterStatus === s
                    ? 'bg-sky-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.15)]'
                    : 'bg-[#0C1220] text-slate-400 border border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]'
                }`}
              >
                {config.label} {count > 0 && <span className="tabular-nums">({count})</span>}
              </button>
            )
          })}

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search saved properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-white/[0.04] text-slate-100 border border-white/[0.07] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
            />
          </div>
        </div>

        {/* ── Error State ───────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Properties List ───────────────────── */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] overflow-hidden">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
            </div>
          ) : properties.length === 0 ? (
            /* ── Empty State ─────────────────────── */
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
                <Bookmark className="w-8 h-8 text-slate-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-100 mb-2">
                {filterStatus !== 'all' || searchQuery
                  ? 'No properties match your filters'
                  : 'No saved properties yet'}
              </h4>
              <p className="text-slate-400 mb-6 max-w-sm">
                {filterStatus !== 'all' || searchQuery
                  ? 'Try adjusting your filters or search terms'
                  : 'Save properties from any analysis page using the bookmark icon in the address bar'}
              </p>
              {filterStatus === 'all' && !searchQuery && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                >
                  <Search className="w-4 h-4" />
                  Search Properties
                </button>
              )}
            </div>
          ) : (
            /* ── Property Items ──────────────────── */
            <div className="divide-y divide-white/[0.07]">
              {properties.map((property) => {
                const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG.watching
                return (
                  <div
                    key={property.id}
                    className="px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => goToProperty(property)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Status Icon */}
                          <div className={`p-2 rounded-lg flex-shrink-0 ${statusConfig.bg}`}>
                            <Building2 className={`w-4 h-4 ${statusConfig.color}`} />
                          </div>
                          {/* Address */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 truncate">
                              {property.nickname || property.address_street}
                            </p>
                            {(property.address_city || property.address_state) && (
                              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {[property.address_city, property.address_state].filter(Boolean).join(', ')}
                                {property.address_zip && ` ${property.address_zip}`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metrics row — financial data uses 600 weight + tabular-nums */}
                        <div className="mt-3 ml-11 flex flex-wrap items-center gap-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>

                          {property.best_strategy && (
                            <span className="text-slate-300 flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" />
                              {STRATEGY_LABELS[property.best_strategy] || property.best_strategy}
                            </span>
                          )}

                          {property.best_cash_flow !== undefined && property.best_cash_flow !== null && (
                            <span className={`font-semibold tabular-nums ${property.best_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatCurrency(property.best_cash_flow)}/yr
                            </span>
                          )}

                          {property.best_coc_return !== undefined && property.best_coc_return !== null && (
                            <span className={`font-semibold tabular-nums ${property.best_coc_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatPercent(property.best_coc_return)} CoC
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="mt-2 ml-11 flex items-center gap-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" />
                            Saved {formatDate(property.saved_at)}
                          </span>
                          {property.tags && property.tags.length > 0 && (
                            <div className="flex gap-1">
                              {property.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.07] text-xs text-slate-500 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {property.tags.length > 3 && (
                                <span className="text-xs text-slate-500 tabular-nums">+{property.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => goToProperty(property)}
                          className="p-2 text-sky-400 hover:bg-sky-400/10 rounded-lg transition-colors"
                          title="Analyze property"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(property.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Property"
        description="Remove this property from your saved list? You can always re-add it later."
        variant="danger"
        confirmLabel="Remove"
        onConfirm={confirmDeleteProperty}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
