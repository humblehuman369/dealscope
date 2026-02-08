'use client'

import Link from 'next/link'
import { Building2, X, MapPin, Clock, Star, ExternalLink, Trash2 } from 'lucide-react'
import type { SearchHistoryItem } from '@/hooks/useDashboardData'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const timeAgo = (d: string) => {
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(ms / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtCurrency = (v?: number) =>
  v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : null

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface Props {
  item: SearchHistoryItem
  onDelete?: (id: string) => void
  compact?: boolean
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function ActivityItem({ item, onDelete, compact = false }: Props) {
  const address = item.address_street || item.search_query
  const loc = [item.address_city, item.address_state].filter(Boolean).join(', ')

  /* ---------- compact ---------- */
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.was_successful ? 'bg-green-500' : 'bg-red-400'}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{address}</p>
          <p className="text-xs text-slate-400">{timeAgo(item.searched_at)}</p>
        </div>
        {item.was_saved && <Star className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
      </div>
    )
  }

  /* ---------- full ---------- */
  return (
    <div className="p-4 hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${item.was_successful ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {item.was_successful ? <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" /> : <X className="w-4 h-4 text-red-600 dark:text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">{address}</p>
              {loc && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{loc}{item.address_zip ? ` ${item.address_zip}` : ''}</p>}
            </div>
          </div>
          {item.result_summary && item.was_successful && (
            <div className="mt-2 ml-11 flex flex-wrap items-center gap-3 text-sm">
              {item.result_summary.property_type && <span className="text-slate-600 dark:text-slate-400">{item.result_summary.property_type}</span>}
              {item.result_summary.bedrooms != null && <span className="text-slate-600 dark:text-slate-400">{item.result_summary.bedrooms} bd</span>}
              {item.result_summary.bathrooms != null && <span className="text-slate-600 dark:text-slate-400">{item.result_summary.bathrooms} ba</span>}
              {item.result_summary.square_footage != null && <span className="text-slate-600 dark:text-slate-400">{item.result_summary.square_footage.toLocaleString()} sqft</span>}
              {fmtCurrency(item.result_summary.estimated_value) && <span className="font-medium text-slate-900 dark:text-white">{fmtCurrency(item.result_summary.estimated_value)}</span>}
            </div>
          )}
          <div className="mt-2 ml-11 flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(item.searched_at)}</span>
            {item.search_source && item.search_source !== 'web' && <span className="px-2 py-0.5 bg-slate-100 dark:bg-navy-700 text-xs text-slate-600 dark:text-slate-400 rounded">{item.search_source}</span>}
            {item.was_saved && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-xs text-green-700 dark:text-green-400 rounded flex items-center gap-1"><Star className="w-3 h-3" />Saved</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.was_successful && (
            <Link href={`/verdict?address=${encodeURIComponent(item.search_query)}`} className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title="Re-analyze">
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
          {onDelete && (
            <button onClick={() => onDelete(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
