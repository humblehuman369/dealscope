'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useActivityLog } from '@/hooks/useDashboardData'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { WidgetErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { ActivityItem } from '@/components/dashboard/ActivityItem'
import { toast } from 'sonner'
import {
  History, Search, TrendingUp, Star, Calendar,
  Filter, Trash2, AlertCircle, BarChart3, RefreshCw
} from 'lucide-react'

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

export default function ActivityLogPage() {
  const queryClient = useQueryClient()
  const [filterSuccessful, setFilterSuccessful] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const { history, stats } = useActivityLog(filterSuccessful)

  // Delete single
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/search-history/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['activityLog'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Entry deleted') },
    onError: () => toast.error('Failed to delete entry'),
  })

  // Clear all
  const clearMutation = useMutation({
    mutationFn: () => api.delete('/api/v1/search-history'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['activityLog'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('History cleared') },
    onError: () => toast.error('Failed to clear history'),
  })

  const handleDelete = useCallback((id: string) => { if (confirm('Delete this search from history?')) deleteMutation.mutate(id) }, [deleteMutation])
  const handleClearAll = useCallback(() => { if (confirm('Clear all search history? This cannot be undone.')) clearMutation.mutate() }, [clearMutation])

  const items = history.data?.items || []

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><History className="w-6 h-6 text-teal-600" /> Activity Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your property search history and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterSuccessful(!filterSuccessful)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${filterSuccessful ? 'bg-teal-600 text-white' : 'bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-navy-700'}`}>
            <Filter className="w-4 h-4" /> Successful Only
          </button>
          {items.length > 0 && (
            <button onClick={handleClearAll} disabled={clearMutation.isPending}
              className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats.data && (
        <WidgetErrorBoundary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Search} label="Total Searches" value={stats.data.total_searches} color="teal" />
            <StatCard icon={TrendingUp} label="Successful" value={stats.data.successful_searches} color="green" />
            <StatCard icon={Star} label="Saved" value={stats.data.saved_from_search} color="purple" />
            <StatCard icon={Calendar} label="This Week" value={stats.data.searches_this_week} color="amber" />
          </div>
        </WidgetErrorBoundary>
      )}

      {/* Top Markets */}
      {stats.data && stats.data.top_markets.length > 0 && (
        <WidgetErrorBoundary>
          <div className="bg-white dark:bg-navy-900 rounded-xl p-4 border border-slate-200 dark:border-navy-700">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Your Top Markets</h3>
            <div className="flex flex-wrap gap-2">
              {stats.data.top_markets.map((m) => (
                <div key={m.state} className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-full text-sm">
                  <span className="font-medium text-teal-700 dark:text-teal-300">{m.state}</span>
                  <span className="text-teal-500 dark:text-teal-400 ml-1">({m.count})</span>
                </div>
              ))}
            </div>
          </div>
        </WidgetErrorBoundary>
      )}

      {/* Activity list */}
      <WidgetErrorBoundary>
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Recent Searches
              {history.data?.total != null && <span className="ml-2 text-xs font-normal text-slate-400">({history.data.total} total)</span>}
            </h3>
          </div>

          {history.error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Failed to load search history</p>
              <p className="text-xs text-slate-400 mb-4">{(history.error as any)?.message || 'Unknown error'}</p>
              <button onClick={() => history.refetch()} className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
                <RefreshCw className="w-3 h-3" /> Try Again
              </button>
            </div>
          ) : history.isLoading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" /></div>
          ) : items.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-navy-700">
              {items.map((item) => <ActivityItem key={item.id} item={item} onDelete={handleDelete} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No search history yet</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">Start searching for properties to build your activity log</p>
              <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm">
                <Search className="w-4 h-4" /> Search Properties
              </button>
            </div>
          )}
        </div>
      </WidgetErrorBoundary>

      <SearchPropertyModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}

// ------------------------------------------------------------------
// StatCard
// ------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const cm: Record<string, { bg: string; text: string }> = {
    teal:   { bg: 'bg-teal-100 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-400' },
    green:  { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    amber:  { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-600 dark:text-amber-400' },
  }
  const c = cm[color] || cm.teal
  return (
    <div className="bg-white dark:bg-navy-900 rounded-xl p-4 border border-slate-200 dark:border-navy-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`w-5 h-5 ${c.text}`} /></div>
        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div>
      </div>
    </div>
  )
}
