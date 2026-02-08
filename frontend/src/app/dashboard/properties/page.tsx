'use client'

import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useSavedProperties } from '@/hooks/useDashboardData'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { WidgetErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { toast } from 'sonner'
import { Building2, Search, Plus, AlertCircle, RefreshCw } from 'lucide-react'

// ------------------------------------------------------------------
// Filter tabs
// ------------------------------------------------------------------

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'watching', label: 'Watching' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'under_contract', label: 'Under Contract' },
  { key: 'owned', label: 'Owned' },
]

// ------------------------------------------------------------------
// Skeleton
// ------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 bg-slate-200 dark:bg-navy-700 rounded mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-navy-700 rounded" />
              <div className="h-3 w-32 bg-slate-200 dark:bg-navy-700 rounded" />
              <div className="flex gap-4 mt-3"><div className="h-8 w-20 bg-slate-200 dark:bg-navy-700 rounded" /><div className="h-8 w-20 bg-slate-200 dark:bg-navy-700 rounded" /></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

export default function SavedPropertiesPage() {
  const queryClient = useQueryClient()
  const [activeStatus, setActiveStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const { properties, stats } = useSavedProperties(activeStatus)

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/properties/saved/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['savedProperties'] }); toast.success('Status updated') },
    onError: () => toast.error('Failed to update status'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/properties/saved/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedProperties'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Property removed')
    },
    onError: () => toast.error('Failed to remove property'),
  })

  const handleStatusChange = useCallback((id: string, status: string) => statusMutation.mutate({ id, status }), [statusMutation])
  const handleRemove = useCallback((id: string) => { if (confirm('Remove this property from your saved deals?')) removeMutation.mutate(id) }, [removeMutation])

  // Client-side search
  const filtered = useMemo(() => {
    if (!properties.data) return []
    if (!searchTerm.trim()) return properties.data
    const t = searchTerm.toLowerCase()
    return properties.data.filter((p) =>
      p.address_street.toLowerCase().includes(t) ||
      p.address_city?.toLowerCase().includes(t) ||
      p.address_state?.toLowerCase().includes(t)
    )
  }, [properties.data, searchTerm])

  const total = stats.data?.total || 0
  const byStatus = stats.data?.by_status || {}

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Building2 className="w-6 h-6 text-teal-600" />My Properties</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} {total === 1 ? 'property' : 'properties'} in your DealVault</p>
        </div>
        <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      {/* Status quick-filter chips */}
      {total > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([status, count]) => count > 0 && (
            <button key={status} onClick={() => setActiveStatus(status === activeStatus ? 'all' : status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${activeStatus === status ? 'border-teal-300 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-700' : 'border-slate-200 dark:border-navy-700 hover:border-slate-300'}`}>
              <StatusBadge status={status} /><span className="font-medium text-slate-700 dark:text-slate-300">{count as number}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab bar + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-navy-800 rounded-lg p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveStatus(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeStatus === tab.key ? 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by address..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
        </div>
      </div>

      {/* Property list */}
      <WidgetErrorBoundary>
        {properties.error ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Failed to load properties</p>
            <p className="text-xs text-slate-400 mb-4">{(properties.error as any)?.message || 'Unknown error'}</p>
            <button onClick={() => properties.refetch()} className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        ) : properties.isLoading ? <CardSkeleton /> : filtered.length > 0 ? (
          <div className="space-y-3">{filtered.map((p) => <PropertyCard key={p.id} property={p} onStatusChange={handleStatusChange} onRemove={handleRemove} />)}</div>
        ) : properties.data && properties.data.length > 0 && searchTerm ? (
          <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No properties matching &ldquo;{searchTerm}&rdquo;</p>
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No properties saved yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">Start analyzing properties to save them to your DealVault.</p>
            <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm">
              <Search className="w-4 h-4" /> Analyze Your First Property
            </button>
          </div>
        )}
      </WidgetErrorBoundary>

      <SearchPropertyModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}
