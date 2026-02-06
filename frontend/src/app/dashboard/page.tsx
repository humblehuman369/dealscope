'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { WidgetErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { useState } from 'react'
import {
  Building2, TrendingUp, DollarSign, BarChart3,
  Search, ArrowRight, Clock, Plus, ChevronRight, Zap, Eye
} from 'lucide-react'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Skeleton loaders
// ------------------------------------------------------------------

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700 animate-pulse">
          <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded mb-3" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-navy-700 rounded" />
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 dark:bg-navy-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export default function DashboardOverview() {
  const { user } = useSession()
  const [showSearch, setShowSearch] = useState(false)

  // Parallel data fetching with React Query
  const { data: stats, isLoading: statsLoading } = useQuery<PropertyStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/api/v1/properties/saved/stats'),
    staleTime: 2 * 60 * 1000,
  })

  const { data: recentSearches, isLoading: searchesLoading } = useQuery<SearchHistoryItem[]>({
    queryKey: ['dashboard', 'recentSearches'],
    queryFn: () => api.get('/api/v1/search-history/recent?limit=8'),
    staleTime: 60 * 1000,
  })

  const { data: savedProperties, isLoading: propsLoading } = useQuery<SavedProperty[]>({
    queryKey: ['dashboard', 'savedProperties'],
    queryFn: () => api.get('/api/v1/properties/saved?limit=5'),
    staleTime: 2 * 60 * 1000,
  })

  const firstName = user?.full_name?.split(' ')[0] || 'Investor'

  // Pipeline counts
  const pipeline = stats?.by_status || {}
  const watching = pipeline['watching'] || 0
  const analyzing = pipeline['analyzing'] || 0
  const negotiating = (pipeline['contacted'] || 0) + (pipeline['negotiating'] || 0)
  const underContract = pipeline['under_contract'] || 0
  const owned = pipeline['owned'] || 0
  const total = stats?.total || 0

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s your investment portfolio overview.
          </p>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
        >
          <Search className="w-4 h-4" />
          Analyze Property
        </button>
      </div>

      {/* Metrics cards */}
      <WidgetErrorBoundary>
        {statsLoading ? (
          <MetricsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Building2} label="Properties Tracked" value={String(total)} color="teal" />
            <MetricCard icon={DollarSign} label="Portfolio Value" value={fmt(stats?.total_estimated_value || 0)} color="blue" />
            <MetricCard icon={TrendingUp} label="Monthly Cash Flow" value={fmt(stats?.total_monthly_cash_flow || 0)} color="green" />
            <MetricCard icon={BarChart3} label="Avg CoC Return" value={fmtPct((stats?.average_coc_return || 0) * 100)} color="purple" />
          </div>
        )}
      </WidgetErrorBoundary>

      {/* Pipeline */}
      {total > 0 && (
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Deal Pipeline</h2>
            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-navy-800">
              {watching > 0 && <div className="h-full bg-slate-400" style={{ width: `${(watching / total) * 100}%` }} />}
              {analyzing > 0 && <div className="h-full bg-blue-500" style={{ width: `${(analyzing / total) * 100}%` }} />}
              {negotiating > 0 && <div className="h-full bg-amber-500" style={{ width: `${(negotiating / total) * 100}%` }} />}
              {underContract > 0 && <div className="h-full bg-teal-500" style={{ width: `${(underContract / total) * 100}%` }} />}
              {owned > 0 && <div className="h-full bg-green-500" style={{ width: `${(owned / total) * 100}%` }} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Watching: {watching}</span>
              <span>Analyzing: {analyzing}</span>
              <span>Negotiating: {negotiating}</span>
              <span>Under Contract: {underContract}</span>
              <span>Owned: {owned}</span>
            </div>
          </div>
        </WidgetErrorBoundary>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved properties */}
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Properties</h2>
              <Link href="/dashboard/properties" className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {propsLoading ? (
              <ListSkeleton />
            ) : savedProperties && savedProperties.length > 0 ? (
              <div className="space-y-2">
                {savedProperties.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/properties/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.address_street}</p>
                      <p className="text-xs text-slate-500">{p.address_city}, {p.address_state}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {p.best_cash_flow != null && (
                        <p className="text-sm font-medium text-green-600">{fmt(p.best_cash_flow)}/mo</p>
                      )}
                      {p.best_coc_return != null && (
                        <p className="text-xs text-slate-500">{fmtPct(p.best_coc_return * 100)} CoC</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No properties saved yet. Start by analyzing a property.
              </div>
            )}
          </div>
        </WidgetErrorBoundary>

        {/* Recent activity */}
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h2>
            </div>
            {searchesLoading ? (
              <ListSkeleton rows={4} />
            ) : recentSearches && recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.was_successful ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{s.search_query}</p>
                      <p className="text-xs text-slate-400">{timeAgo(s.searched_at)}</p>
                    </div>
                    {s.was_saved && <Eye className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No recent searches.
              </div>
            )}
          </div>
        </WidgetErrorBoundary>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction icon={Search} label="Search Property" onClick={() => setShowSearch(true)} />
        <QuickAction icon={Building2} label="My Properties" href="/dashboard/properties" />
        <QuickAction icon={BarChart3} label="Compare Deals" href="/dashboard/tools/compare" />
        <QuickAction icon={Zap} label="Reports" href="/dashboard/reports" />
      </div>

      {showSearch && <SearchPropertyModal onClose={() => setShowSearch(false)} />}
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, href, onClick }: { icon: any; label: string; href?: string; onClick?: () => void }) {
  const cls = "flex flex-col items-center gap-2 p-4 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer"
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </button>
  )
}
