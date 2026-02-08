'use client'

import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { useDashboardOverview } from '@/hooks/useDashboardData'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { WidgetErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { ActivityItem } from '@/components/dashboard/ActivityItem'
import { DealVaultCard } from '@/components/dashboard/DealVaultCard'
import { PortfolioPreviewChart } from '@/components/dashboard/PortfolioPreviewChart'
import { useState } from 'react'
import {
  Building2, TrendingUp, DollarSign, BarChart3,
  Search, Clock, ChevronRight, FileText, StickyNote, PieChart, AlertCircle, RefreshCw
} from 'lucide-react'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const fmt = (n: number, prefix = '$') => {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n.toFixed(0)}`
}
const fmtPct = (n: number) => `${n.toFixed(1)}%`

// ------------------------------------------------------------------
// Skeletons
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
// Inline error widget
// ------------------------------------------------------------------

function WidgetError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1 text-xs text-teal-600 hover:underline">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------

export default function DashboardOverview() {
  const { user } = useSession()
  const { stats, recentProperties, recentSearches } = useDashboardOverview()
  const [showSearch, setShowSearch] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] || 'Investor'

  // Pipeline counts
  const pipeline = stats.data?.by_status || {}
  const watching = pipeline['watching'] || 0
  const analyzing = pipeline['analyzing'] || 0
  const negotiating = (pipeline['contacted'] || 0) + (pipeline['negotiating'] || 0)
  const underContract = pipeline['under_contract'] || 0
  const owned = pipeline['owned'] || 0
  const total = stats.data?.total || 0

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your DealVault overview &mdash; track, analyze, and manage your investment pipeline.</p>
        </div>
        <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm shadow-sm">
          <Search className="w-4 h-4" /> Analyze Property
        </button>
      </div>

      {/* Metrics */}
      <WidgetErrorBoundary>
        {stats.isLoading ? <MetricsSkeleton /> : stats.error ? (
          <WidgetError message={`Stats: ${(stats.error as any)?.message || 'Failed to load'}`} onRetry={() => stats.refetch()} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Building2} label="Properties Tracked" value={String(total)} color="teal" />
            <MetricCard icon={DollarSign} label="Portfolio Value" value={fmt(stats.data?.total_estimated_value || 0)} color="blue" />
            <MetricCard icon={TrendingUp} label="Monthly Cash Flow" value={fmt(stats.data?.total_monthly_cash_flow || 0)} color="green" />
            <MetricCard icon={BarChart3} label="Avg CoC Return" value={fmtPct((stats.data?.average_coc_return || 0) * 100)} color="purple" />
          </div>
        )}
      </WidgetErrorBoundary>

      {/* Pipeline */}
      {total > 0 && (
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Deal Pipeline</h2>
              <Link href="/dashboard/properties" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Manage <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-navy-800">
              {watching > 0 && <div className="h-full bg-slate-400" style={{ width: `${(watching / total) * 100}%` }} />}
              {analyzing > 0 && <div className="h-full bg-blue-500" style={{ width: `${(analyzing / total) * 100}%` }} />}
              {negotiating > 0 && <div className="h-full bg-amber-500" style={{ width: `${(negotiating / total) * 100}%` }} />}
              {underContract > 0 && <div className="h-full bg-teal-500" style={{ width: `${(underContract / total) * 100}%` }} />}
              {owned > 0 && <div className="h-full bg-green-500" style={{ width: `${(owned / total) * 100}%` }} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {watching > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Watching: {watching}</span>}
              {analyzing > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Analyzing: {analyzing}</span>}
              {negotiating > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Negotiating: {negotiating}</span>}
              {underContract > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" />Under Contract: {underContract}</span>}
              {owned > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Owned: {owned}</span>}
            </div>
          </div>
        </WidgetErrorBoundary>
      )}

      {/* Two-column: Properties + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 flex flex-col">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Properties</h2>
              <Link href="/dashboard/properties" className="text-xs text-teal-600 hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="p-3 flex-1">
              {recentProperties.isLoading ? <ListSkeleton /> : recentProperties.error ? (
                <WidgetError message={`Properties: ${(recentProperties.error as any)?.message || 'Failed to load'}`} onRetry={() => recentProperties.refetch()} />
              ) : recentProperties.data && recentProperties.data.length > 0 ? (
                <div className="space-y-0.5">{recentProperties.data.map((p) => <PropertyCard key={p.id} property={p} compact />)}</div>
              ) : (
                <div className="text-center py-10 text-sm text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No properties saved yet.</p>
                  <button onClick={() => setShowSearch(true)} className="mt-3 text-teal-600 hover:underline text-xs font-medium">Analyze your first property</button>
                </div>
              )}
            </div>
          </div>
        </WidgetErrorBoundary>

        {/* Recent Activity */}
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 flex flex-col">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h2>
              <Link href="/dashboard/activity" className="text-xs text-teal-600 hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="p-3 flex-1">
              {recentSearches.isLoading ? <ListSkeleton rows={4} /> : recentSearches.error ? (
                <WidgetError message={`Activity: ${(recentSearches.error as any)?.message || 'Failed to load'}`} onRetry={() => recentSearches.refetch()} />
              ) : recentSearches.data && recentSearches.data.length > 0 ? (
                <div className="space-y-0.5">{recentSearches.data.map((s) => <ActivityItem key={s.id} item={s} compact />)}</div>
              ) : (
                <div className="text-center py-10 text-sm text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent searches.</p>
                  <button onClick={() => setShowSearch(true)} className="mt-3 text-teal-600 hover:underline text-xs font-medium">Search for a property</button>
                </div>
              )}
            </div>
          </div>
        </WidgetErrorBoundary>
      </div>

      {/* Portfolio Performance Chart (Coming Soon) */}
      <WidgetErrorBoundary><PortfolioPreviewChart /></WidgetErrorBoundary>

      {/* DealVault Feature Teasers */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">DealVault</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DealVaultCard icon={FileText} title="Documents" description="Store contracts, inspections, appraisals, and closing docs for every deal." color="teal" />
          <DealVaultCard icon={StickyNote} title="Notes" description="Track deal notes, observations, seller conversations, and follow-ups." color="blue" />
          <DealVaultCard icon={PieChart} title="Financial Reports" description="Portfolio P&L, tax summaries, expense tracking, and return projections." color="purple" />
        </div>
      </div>

      <SearchPropertyModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}

// ------------------------------------------------------------------
// MetricCard
// ------------------------------------------------------------------

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const cm: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-navy-900 rounded-xl p-5 border border-slate-200 dark:border-navy-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cm[color]}`}><Icon className="w-5 h-5" /></div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
