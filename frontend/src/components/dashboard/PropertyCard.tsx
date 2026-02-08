'use client'

import Link from 'next/link'
import { Building2, ChevronDown, Trash2, ExternalLink, Clock } from 'lucide-react'
import { StatusBadge, PROPERTY_STATUSES } from './StatusBadge'
import { useState } from 'react'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SavedPropertyData {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  status: string
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  estimated_value?: number
  saved_at: string
}

interface PropertyCardProps {
  property: SavedPropertyData
  onStatusChange?: (id: string, status: string) => void
  onRemove?: (id: string) => void
  compact?: boolean
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function PropertyCard({ property, onStatusChange, onRemove, compact = false }: PropertyCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const p = property
  const address = [p.address_city, p.address_state].filter(Boolean).join(', ')

  if (compact) {
    return (
      <Link
        href={`/verdict?address=${encodeURIComponent(p.address_street + (address ? `, ${address}` : ''))}`}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors group"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.address_street}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">{address}</p>
            <StatusBadge status={p.status} />
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          {p.best_cash_flow != null && (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(p.best_cash_flow)}/mo</p>
          )}
          {p.best_coc_return != null && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{fmtPct(p.best_coc_return * 100)} CoC</p>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 p-4 hover:border-slate-300 dark:hover:border-navy-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Property info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.address_street}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">{address}{p.address_zip ? ` ${p.address_zip}` : ''}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3 ml-6">
            <StatusBadge status={p.status} />
            {p.best_strategy && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Best: {p.best_strategy.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-3 ml-6">
            {p.best_cash_flow != null && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Cash Flow</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(p.best_cash_flow)}/mo</p>
              </div>
            )}
            {p.best_coc_return != null && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">CoC Return</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{fmtPct(p.best_coc_return * 100)}</p>
              </div>
            )}
            {p.estimated_value != null && p.estimated_value > 0 && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Value</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{fmt(p.estimated_value)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={`/verdict?address=${encodeURIComponent(p.address_street + (address ? `, ${address}` : ''))}`}
            className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            title="View Analysis"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {onStatusChange && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                title="Change Status"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-navy-800 rounded-lg shadow-lg border border-slate-200 dark:border-navy-700 py-1 z-10">
                  {PROPERTY_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange(p.id, s); setShowStatusMenu(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-navy-700 ${
                        s === p.status ? 'font-medium text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(p.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 mt-3 ml-6 text-xs text-slate-400 dark:text-slate-500">
        <Clock className="w-3 h-3" />
        Saved {timeAgo(p.saved_at)}
      </div>
    </div>
  )
}
