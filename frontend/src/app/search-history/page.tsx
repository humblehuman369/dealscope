'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { getAccessToken } from '@/lib/api'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { 
  History, Search, MapPin, Building2, Clock, Trash2, 
  ExternalLink, ChevronRight, TrendingUp, Filter,
  Calendar, BarChart3, Star, AlertCircle, X
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch history and stats
  const fetchData = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (!token) return

      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/search-history?limit=50&successful_only=${filterSuccessful}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/search-history/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ])

      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data.items || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
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

  // Delete single entry
  const deleteEntry = async (entryId: string) => {
    if (!confirm('Delete this search from history?')) return

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/search-history/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setHistory(prev => prev.filter(h => h.id !== entryId))
      }
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }

  // Clear all history
  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to clear all search history? This cannot be undone.')) return

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/search-history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setHistory([])
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to clear history:', err)
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white flex items-center gap-3">
              <History className="w-8 h-8 text-brand-500" />
              Search History
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Review your past property searches
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterSuccessful(!filterSuccessful)}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                filterSuccessful
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-400 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Successful Only
            </button>
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                  <Search className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{stats.total_searches}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Searches</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{stats.successful_searches}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Successful</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{stats.saved_from_search}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Saved</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">{stats.searches_this_week}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">This Week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Markets */}
        {stats && stats.top_markets.length > 0 && (
          <div className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 mb-8">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Your Top Markets
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.top_markets.map(market => (
                <div
                  key={market.state}
                  className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-full text-sm"
                >
                  <span className="font-medium text-brand-700 dark:text-brand-300">{market.state}</span>
                  <span className="text-brand-500 dark:text-brand-400 ml-1">({market.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Search History List */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
              Recent Searches
            </h3>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-navy-900 dark:text-white mb-2">
                No search history yet
              </h4>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
                Start searching for properties to build your history
              </p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Search Properties
              </button>
              <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-navy-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          item.was_successful 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {item.was_successful ? (
                            <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-navy-900 dark:text-white truncate">
                            {item.address_street || item.search_query}
                          </p>
                          {(item.address_city || item.address_state) && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[item.address_city, item.address_state].filter(Boolean).join(', ')}
                              {item.address_zip && ` ${item.address_zip}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Property Summary */}
                      {item.result_summary && item.was_successful && (
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                          {item.result_summary.property_type && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.result_summary.property_type}
                            </span>
                          )}
                          {item.result_summary.bedrooms && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.result_summary.bedrooms} bd
                            </span>
                          )}
                          {item.result_summary.bathrooms && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.result_summary.bathrooms} ba
                            </span>
                          )}
                          {item.result_summary.square_footage && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.result_summary.square_footage.toLocaleString()} sqft
                            </span>
                          )}
                          {item.result_summary.estimated_value && (
                            <span className="font-medium text-navy-900 dark:text-white">
                              {formatCurrency(item.result_summary.estimated_value)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.searched_at)}
                        </span>
                        {item.search_source && item.search_source !== 'web' && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-navy-700 text-xs text-gray-600 dark:text-gray-400 rounded">
                            {item.search_source}
                          </span>
                        )}
                        {item.was_saved && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-xs text-green-700 dark:text-green-400 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Saved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {item.was_successful && (
                        <Link
                          href={`/property?address=${encodeURIComponent(item.search_query)}`}
                          className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                          title="View property"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => deleteEntry(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
    </div>
  )
}

