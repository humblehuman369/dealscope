'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getAccessToken } from '@/lib/api'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { 
  Building2, TrendingUp, DollarSign, BarChart3,
  Search, ArrowRight, Clock, Star, Plus,
  ChevronRight, Zap, Eye, FileSpreadsheet
} from 'lucide-react'

// ===========================================
// Types
// ===========================================

interface PropertyStats {
  total: number
  by_status: Record<string, number>
  total_estimated_value?: number
  total_monthly_cash_flow?: number
  average_coc_return?: number
}

interface SearchHistoryItem {
  id: string
  search_query: string
  address_city?: string
  address_state?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
  search_source?: string
}

interface SavedProperty {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  status: string
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  saved_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// ===========================================
// Helpers
// ===========================================

const fmt = (n: number, prefix = '$') => {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n.toFixed(0)}`
}

const fmtPct = (n: number) => `${n.toFixed(1)}%`

const timeAgo = (d: string) => {
  const ms = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(ms / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(ms / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ===========================================
// Component
// ===========================================

export default function DashboardOverview() {
  const { user } = useAuth()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<PropertyStats | null>(null)
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([])
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([])

  const fetchData = useCallback(async () => {
    try {
      const token = getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [statsRes, historyRes, propsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/properties/saved/stats`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/v1/search-history/recent?limit=8`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=10`, { headers, credentials: 'include' }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (historyRes.ok) setRecentSearches(await historyRes.json())
      if (propsRes.ok) {
        const data = await propsRes.json()
        setSavedProperties(data.items || data || [])
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const firstName = user?.full_name?.split(' ')[0] || 'Investor'
  const pipeline = stats?.by_status || {}
  const pipelineStages = [
    { label: 'Watching', count: pipeline.watching || 0, color: 'bg-blue-500' },
    { label: 'Analyzing', count: pipeline.analyzing || 0, color: 'bg-amber-500' },
    { label: 'Negotiating', count: (pipeline.contacted || 0) + (pipeline.negotiating || 0), color: 'bg-purple-500' },
    { label: 'Under Contract', count: pipeline.under_contract || 0, color: 'bg-emerald-500' },
    { label: 'Owned', count: pipeline.owned || 0, color: 'bg-teal-600' },
  ]
  const pipelineTotal = pipelineStages.reduce((s, p) => s + p.count, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s your investment workspace overview
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => setShowSearchModal(true)}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 transition-all group"
        >
          <Search size={18} />
          <span className="text-sm font-semibold">Search Property</span>
        </button>
        <Link
          href="/dashboard/properties"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 text-slate-700 dark:text-slate-300 transition-all"
        >
          <Building2 size={18} className="text-teal-500" />
          <span className="text-sm font-medium">My Properties</span>
        </Link>
        <Link
          href="/dashboard/tools/compare"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 text-slate-700 dark:text-slate-300 transition-all"
        >
          <BarChart3 size={18} className="text-purple-500" />
          <span className="text-sm font-medium">Compare Deals</span>
        </Link>
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 text-slate-700 dark:text-slate-300 transition-all"
        >
          <FileSpreadsheet size={18} className="text-emerald-500" />
          <span className="text-sm font-medium">Reports</span>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Properties Tracked', value: stats?.total || 0, icon: Building2, color: 'text-teal-500', format: (v: number) => String(v) },
          { label: 'Portfolio Value', value: stats?.total_estimated_value || 0, icon: TrendingUp, color: 'text-blue-500', format: (v: number) => fmt(v) },
          { label: 'Monthly Cash Flow', value: stats?.total_monthly_cash_flow || 0, icon: DollarSign, color: 'text-emerald-500', format: (v: number) => fmt(v) },
          { label: 'Avg CoC Return', value: stats?.average_coc_return ? stats.average_coc_return * 100 : 0, icon: BarChart3, color: 'text-purple-500', format: fmtPct },
        ].map((m) => (
          <div key={m.label} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon size={16} className={m.color} />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{m.label}</span>
            </div>
            {isLoading ? (
              <div className="h-7 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-bold text-slate-800 dark:text-white">{m.format(m.value)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline - Left 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Deal Pipeline
            </h2>
            <Link href="/dashboard/properties" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />)}
            </div>
          ) : pipelineTotal === 0 ? (
            <div className="text-center py-8">
              <Building2 size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No deals in your pipeline yet</p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
              >
                <Plus size={14} /> Search Your First Property
              </button>
            </div>
          ) : (
            <>
              {/* Pipeline bar */}
              <div className="flex rounded-lg overflow-hidden h-8 mb-4">
                {pipelineStages.filter(s => s.count > 0).map((stage) => (
                  <div
                    key={stage.label}
                    className={`${stage.color} flex items-center justify-center transition-all`}
                    style={{ width: `${(stage.count / pipelineTotal) * 100}%`, minWidth: '40px' }}
                  >
                    <span className="text-[10px] font-bold text-white">{stage.count}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {pipelineStages.map((stage) => (
                  <div key={stage.label} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span>{stage.label}: <strong className="text-slate-800 dark:text-white">{stage.count}</strong></span>
                  </div>
                ))}
              </div>

              {/* Recent saved properties */}
              <div className="mt-5 space-y-2">
                {savedProperties.slice(0, 5).map((prop) => (
                  <Link
                    key={prop.id}
                    href={`/dashboard/properties/${prop.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-750 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{prop.address_street}</p>
                        <p className="text-xs text-slate-400">{prop.address_city}, {prop.address_state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        prop.status === 'watching' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        prop.status === 'analyzing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        prop.status === 'owned' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {prop.status.replace('_', ' ')}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity - Right col */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Recent Activity
            </h2>
            <Link href="/dashboard/properties" className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              History <ChevronRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />)}
            </div>
          ) : recentSearches.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
              <p className="text-xs text-slate-400 mt-1">Search a property to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentSearches.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-750 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.was_saved ? 'bg-emerald-100 dark:bg-emerald-900/30' : 
                    item.was_successful ? 'bg-blue-100 dark:bg-blue-900/30' : 
                    'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    {item.was_saved ? <Star size={12} className="text-emerald-600" /> :
                     item.was_successful ? <Eye size={12} className="text-blue-600" /> :
                     <Search size={12} className="text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {item.search_query.split(',')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{timeAgo(item.searched_at)}</span>
                      {item.search_source && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-navy-700 px-1.5 py-0.5 rounded">
                          {item.search_source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Getting Started (only show if no properties) */}
      {!isLoading && (stats?.total || 0) === 0 && (
        <div className="mt-8 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10 rounded-2xl border border-teal-200 dark:border-teal-800/30 p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Get Started with DealHubIQ</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">Your investor workspace is ready. Here&apos;s how to make the most of it:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Search a Property', desc: 'Enter any US address to get instant investment analysis', action: () => setShowSearchModal(true), cta: 'Search Now' },
              { step: '2', title: 'Save to Your Portfolio', desc: 'Save properties to track, compare, and build your deal pipeline', href: '/dashboard/properties', cta: 'View Properties' },
              { step: '3', title: 'Generate Reports', desc: 'Export Excel proformas, LOIs, and financial statements', href: '/dashboard/reports', cta: 'View Reports' },
            ].map((item) => (
              <div key={item.step} className="bg-white dark:bg-navy-800 rounded-xl p-4 border border-teal-100 dark:border-navy-700">
                <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold mb-3">{item.step}</div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{item.desc}</p>
                {item.action ? (
                  <button onClick={item.action} className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    {item.cta} <ArrowRight size={12} />
                  </button>
                ) : (
                  <Link href={item.href!} className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    {item.cta} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SearchPropertyModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </div>
  )
}
