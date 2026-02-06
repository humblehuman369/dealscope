'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAccessToken } from '@/lib/api'
import {
  BarChart3, Building2, Plus, X, ChevronDown,
  TrendingUp, DollarSign, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface SavedProperty {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  estimated_value?: number
  status: string
}

const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n.toFixed(0)}`

export default function ComparePage() {
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getAccessToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=50`, { headers, credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setSavedProperties(data.items || data || [])
        }
      } catch (err) { console.error(err) }
      finally { setIsLoading(false) }
    }
    fetchProperties()
  }, [])

  const selected = savedProperties.filter(p => selectedIds.includes(p.id))
  const available = savedProperties.filter(p => !selectedIds.includes(p.id))

  const addProperty = (id: string) => {
    if (selectedIds.length < 4) {
      setSelectedIds(prev => [...prev, id])
      setShowSelector(false)
    }
  }

  const removeProperty = (id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id))
  }

  const metrics = [
    { label: 'Estimated Value', key: 'estimated_value', format: (v: any) => v ? fmt(v) : 'N/A' },
    { label: 'Best Strategy', key: 'best_strategy', format: (v: any) => v?.toUpperCase() || 'N/A' },
    { label: 'Monthly Cash Flow', key: 'best_cash_flow', format: (v: any) => v != null ? `$${v.toLocaleString()}` : 'N/A' },
    { label: 'CoC Return', key: 'best_coc_return', format: (v: any) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A' },
    { label: 'Status', key: 'status', format: (v: any) => v?.replace('_', ' ').toUpperCase() || 'N/A' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link href="/dashboard/tools" className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to Tools
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-500" />
            Compare Properties
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select up to 4 saved properties to compare side by side
          </p>
        </div>
      </div>

      {/* Property Selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {selected.map((prop) => (
          <div key={prop.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-sm">
            <Building2 size={14} className="text-teal-600" />
            <span className="text-teal-800 dark:text-teal-300 font-medium truncate max-w-[200px]">{prop.address_street}</span>
            <button onClick={() => removeProperty(prop.id)} className="text-teal-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ))}
        {selectedIds.length < 4 && (
          <div className="relative">
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-navy-600 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              <Plus size={14} /> Add Property
            </button>
            {showSelector && (
              <div className="absolute top-full left-0 mt-1 z-20 w-80 max-h-60 overflow-y-auto bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl shadow-xl p-1">
                {available.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-400 text-center">No more properties to add</p>
                ) : available.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => addProperty(prop.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 flex items-center gap-3 transition-colors"
                  >
                    <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{prop.address_street}</p>
                      <p className="text-xs text-slate-400">{prop.address_city}, {prop.address_state}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {selected.length >= 2 ? (
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Metric</th>
                {selected.map(prop => (
                  <th key={prop.id} className="text-left px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 size={12} className="text-teal-500" />
                      <span className="truncate max-w-[150px]">{prop.address_street}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, i) => (
                <tr key={metric.key} className={`${i % 2 === 0 ? 'bg-slate-50/50 dark:bg-navy-750/50' : ''} border-b border-slate-100 dark:border-navy-700/50 last:border-0`}>
                  <td className="px-5 py-3 text-xs text-slate-500 font-medium">{metric.label}</td>
                  {selected.map(prop => (
                    <td key={prop.id} className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-white">
                      {metric.format((prop as any)[metric.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700">
          <BarChart3 size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">Select Properties to Compare</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose at least 2 saved properties from your portfolio to compare
          </p>
        </div>
      )}
    </div>
  )
}
