'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import {
  Bookmark, Search, MapPin, Building2, Clock, Trash2,
  TrendingUp, Filter, Star, AlertCircle,
  ChevronRight, BarChart3, Eye, MoreHorizontal, X
} from 'lucide-react'

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

const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  watching: { label: 'Watching', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  analyzing: { label: 'Analyzing', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  contacted: { label: 'Contacted', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  under_contract: { label: 'Under Contract', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  owned: { label: 'Owned', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  passed: { label: 'Passed', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  archived: { label: 'Archived', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900/30' },
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

  // Delete a saved property
  const deleteProperty = async (propertyId: string) => {
    if (!confirm('Remove this property from your saved list?')) return

    try {
      await api.delete(`/api/v1/properties/saved/${propertyId}`)
      setProperties(prev => prev.filter(p => p.id !== propertyId))
    } catch (err) {
      console.error('Failed to delete property:', err)
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    )
  }

  const statusCounts = stats?.by_status || {}
  const totalSaved = stats?.total || properties.length

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-brand-500" />
              Saved Properties
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              {totalSaved} {totalSaved === 1 ? 'property' : 'properties'} in your portfolio
            </p>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            Search New Property
          </button>
        </div>

        {/* Stats Row */}
        {totalSaved > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                  <Bookmark className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{totalSaved}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Saved</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{statusCounts.watching || 0}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Watching</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{statusCounts.analyzing || 0}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Analyzing</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{statusCounts.owned || 0}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Owned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Status filter pills */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-400 border border-neutral-200 dark:border-neutral-700'
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
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-brand-500 text-white'
                    : 'bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-400 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {config.label} {count > 0 && `(${count})`}
              </button>
            )
          })}

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search saved properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-white dark:bg-navy-800 text-navy-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Properties List */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Bookmark className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
                {filterStatus !== 'all' || searchQuery
                  ? 'No properties match your filters'
                  : 'No saved properties yet'}
              </h4>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
                {filterStatus !== 'all' || searchQuery
                  ? 'Try adjusting your filters or search terms'
                  : 'Save properties from any analysis page using the bookmark icon in the address bar'}
              </p>
              {filterStatus === 'all' && !searchQuery && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search Properties
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {properties.map((property) => {
                const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG.watching
                return (
                  <div
                    key={property.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-navy-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => goToProperty(property)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                            <Building2 className={`w-4 h-4 ${statusConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-navy-900 dark:text-white truncate">
                              {property.nickname || property.address_street}
                            </p>
                            {(property.address_city || property.address_state) && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[property.address_city, property.address_state].filter(Boolean).join(', ')}
                                {property.address_zip && ` ${property.address_zip}`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>

                          {property.best_strategy && (
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500" />
                              {STRATEGY_LABELS[property.best_strategy] || property.best_strategy}
                            </span>
                          )}

                          {property.best_cash_flow !== undefined && property.best_cash_flow !== null && (
                            <span className={`font-medium ${property.best_cash_flow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(property.best_cash_flow)}/yr
                            </span>
                          )}

                          {property.best_coc_return !== undefined && property.best_coc_return !== null && (
                            <span className={`font-medium ${property.best_coc_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatPercent(property.best_coc_return)} CoC
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Saved {formatDate(property.saved_at)}
                          </span>
                          {property.tags && property.tags.length > 0 && (
                            <div className="flex gap-1">
                              {property.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-navy-700 text-xs text-gray-600 dark:text-gray-400 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {property.tags.length > 3 && (
                                <span className="text-xs text-neutral-400">+{property.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => goToProperty(property)}
                          className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                          title="Analyze property"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteProperty(property.id)}
                          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
    </div>
  )
}
