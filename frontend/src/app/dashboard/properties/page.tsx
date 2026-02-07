'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getAccessToken } from '@/lib/api'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import {
  Building2, Search, Clock, Star, Filter, ChevronRight,
  Trash2, Plus, Eye, MoreVertical, MapPin, TrendingUp,
  Grid3X3, List, ChevronDown, X, ArrowUpDown
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

// ===========================================
// Types
// ===========================================

interface SearchHistoryItem {
  id: string
  search_query: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  property_cache_id?: string
  zpid?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
  search_source?: string
}

interface SavedProperty {
  id: string
  external_property_id?: string
  zpid?: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  nickname?: string
  status: string
  tags?: string[]
  priority?: number
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  estimated_value?: number
  saved_at: string
  updated_at: string
}

// ===========================================
// Helpers
// ===========================================

const fmt = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const timeAgo = (d: string) => {
  const ms = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(ms / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(ms / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const statusColors: Record<string, string> = {
  watching: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  analyzing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  contacted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  negotiating: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  under_contract: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  owned: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  passed: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

// ===========================================
// Component
// ===========================================

export default function PropertiesHub() {
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Saved properties state
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('saved_at')

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'successful' | 'saved'>('all')

  const [searchQuery, setSearchQuery] = useState('')

  const fetchHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const headers = fetchHeaders()
      const [propsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=50`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/v1/search-history?limit=50`, { headers, credentials: 'include' }),
      ])

      if (propsRes.ok) {
        const data = await propsRes.json()
        setSavedProperties(data.items || data || [])
      }
      if (historyRes.ok) {
        const data = await historyRes.json()
        setSearchHistory(data.items || data || [])
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchHeaders])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDeleteHistory = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/search-history/${id}`, {
        method: 'DELETE', headers: fetchHeaders(), credentials: 'include'
      })
      setSearchHistory(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleDeleteSaved = async (id: string) => {
    if (!confirm('Remove this property from your portfolio?')) return
    try {
      await fetch(`${API_BASE_URL}/api/v1/properties/saved/${id}`, {
        method: 'DELETE', headers: fetchHeaders(), credentials: 'include'
      })
      setSavedProperties(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // Filter & sort saved properties
  const filteredSaved = savedProperties
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => !searchQuery || p.address_street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.address_city || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'saved_at') return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      if (sortBy === 'address') return a.address_street.localeCompare(b.address_street)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return 0
    })

  // Filter search history
  const filteredHistory = searchHistory
    .filter(h => historyFilter === 'all' || (historyFilter === 'successful' && h.was_successful) || (historyFilter === 'saved' && h.was_saved))
    .filter(h => !searchQuery || h.search_query.toLowerCase().includes(searchQuery.toLowerCase()))

  const statusOptions = ['all', 'watching', 'analyzing', 'contacted', 'negotiating', 'under_contract', 'owned', 'passed']

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 size={20} className="text-teal-500" />
            Properties
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {savedProperties.length} saved &middot; {searchHistory.length} searched
          </p>
        </div>
        <button
          onClick={() => setShowSearchModal(true)}
          className="mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all"
        >
          <Plus size={16} /> New Search
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl w-fit">
        {[
          { key: 'saved' as const, label: 'Saved Properties', icon: Star, count: savedProperties.length },
          { key: 'history' as const, label: 'Search History', icon: Clock, count: searchHistory.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-navy-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-slate-200 text-slate-500 dark:bg-navy-600 dark:text-slate-400'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {activeTab === 'saved' && (
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="saved_at">Newest First</option>
              <option value="address">Address A-Z</option>
              <option value="status">By Status</option>
            </select>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex gap-1 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'successful' as const, label: 'Found' },
              { key: 'saved' as const, label: 'Saved' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  historyFilter === f.key
                    ? 'bg-white dark:bg-navy-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >{f.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'saved' ? (
        /* Saved Properties */
        filteredSaved.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700">
            <Building2 size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No saved properties</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Search for properties and save them to build your portfolio</p>
            <button onClick={() => setShowSearchModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              <Search size={16} /> Search Properties
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSaved.map((prop) => (
              <Link
                key={prop.id}
                href={`/dashboard/properties/${prop.id}`}
                className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {prop.nickname || prop.address_street}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      {prop.address_city}, {prop.address_state} {prop.address_zip}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {prop.best_strategy && (
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-slate-400">Best Strategy</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">{prop.best_strategy}</p>
                    </div>
                  )}
                  {prop.best_cash_flow !== undefined && prop.best_cash_flow !== null && (
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-slate-400">Cash Flow</p>
                      <p className={`text-sm font-bold ${prop.best_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ${prop.best_cash_flow.toLocaleString()}/mo
                      </p>
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full ${statusColors[prop.status] || 'bg-slate-100 text-slate-500'}`}>
                    {prop.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSaved(prop.id) }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        /* Search History */
        filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700">
            <Clock size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No search history</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Properties you search will appear here</p>
            <button onClick={() => setShowSearchModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              <Search size={16} /> Search Properties
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.was_saved ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    item.was_successful ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    {item.was_saved ? <Star size={14} className="text-emerald-600" /> :
                     item.was_successful ? <Eye size={14} className="text-blue-600" /> :
                     <Search size={14} className="text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.search_query}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{timeAgo(item.searched_at)}</span>
                      {item.search_source && (
                        <span className="text-[10px] bg-slate-100 dark:bg-navy-700 text-slate-500 px-1.5 py-0.5 rounded capitalize">{item.search_source}</span>
                      )}
                      {item.was_saved && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">Saved</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.was_successful && item.zpid && (
                    <Link
                      href={`/property/${item.zpid}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteHistory(item.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </div>
  )
}
