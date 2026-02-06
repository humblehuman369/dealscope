'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAccessToken } from '@/lib/api'
import {
  FileBarChart, FileSpreadsheet, FileText, Building2,
  Download, ChevronRight, Clock, Loader2, Plus
} from 'lucide-react'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface SavedProperty {
  id: string
  external_property_id?: string
  zpid?: string
  address_street: string
  address_city?: string
  address_state?: string
  best_strategy?: string
}

export default function ReportsPage() {
  const [properties, setProperties] = useState<SavedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getAccessToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE_URL}/api/v1/properties/saved?limit=50`, { headers, credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProperties(data.items || data || [])
        }
      } catch (err) { console.error(err) }
      finally { setIsLoading(false) }
    }
    fetchProperties()
  }, [])

  const generateReport = async (propId: string, address: string, format: 'excel' | 'pdf') => {
    const key = `${propId}-${format}`
    setGenerating(key)
    try {
      const token = getAccessToken()
      const endpoint = format === 'excel'
        ? `${API_BASE_URL}/api/v1/proforma/property/${propId}/excel?address=${encodeURIComponent(address)}`
        : `${API_BASE_URL}/api/v1/proforma/property/${propId}/pdf?address=${encodeURIComponent(address)}`

      const res = await fetch(endpoint, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proforma-${address.replace(/\s+/g, '-')}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Report generation failed:', err)
    } finally { setGenerating(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileBarChart size={20} className="text-teal-500" />
          Reports Center
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Generate and download investment reports for your saved properties
        </p>
      </div>

      {/* Report Types Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20', title: 'Excel Proforma', desc: '10-year projections, NOI, amortization, sensitivity analysis' },
          { icon: FileText, color: 'text-red-600 bg-red-100 dark:bg-red-900/20', title: 'PDF Summary', desc: 'Professional investment summary for lenders and partners' },
          { icon: FileBarChart, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20', title: 'Financial Statements', desc: 'DSCR analysis, cash flow statement, strategy comparison' },
        ].map(rt => (
          <div key={rt.title} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
            <div className={`w-10 h-10 rounded-xl ${rt.color} flex items-center justify-center mb-3`}>
              <rt.icon size={18} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{rt.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{rt.desc}</p>
          </div>
        ))}
      </div>

      {/* Properties List with Report Actions */}
      <div className="bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-navy-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Generate Reports by Property</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
          </div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center">
            <FileBarChart size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No saved properties to generate reports for</p>
            <Link href="/dashboard/properties" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Save properties first
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {properties.map((prop) => {
              const propId = prop.external_property_id || prop.zpid || prop.id
              return (
                <div key={prop.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-navy-750/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                      <Building2 size={16} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{prop.address_street}</p>
                      <p className="text-xs text-slate-400">{prop.address_city}, {prop.address_state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => generateReport(propId, prop.address_street, 'excel')}
                      disabled={generating === `${propId}-excel`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 transition-colors"
                    >
                      {generating === `${propId}-excel` ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
                      Excel
                    </button>
                    <button
                      onClick={() => generateReport(propId, prop.address_street, 'pdf')}
                      disabled={generating === `${propId}-pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                    >
                      {generating === `${propId}-pdf` ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      PDF
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
