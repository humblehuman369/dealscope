'use client'

import { useState, useEffect, useCallback } from 'react'
import { SlidersHorizontal, RefreshCw, Save } from 'lucide-react'
import { api } from '@/lib/api-client'

interface AdminAssumptionsResponse {
  assumptions: Record<string, any>
  updated_at?: string | null
  updated_by?: string | null
  updated_by_email?: string | null
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatKeyLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const getInputStep = (key: string) => {
  if (key.includes('pct') || key.includes('rate')) return 0.001
  if (key.includes('months') || key.includes('years') || key.includes('units')) return 1
  return 1
}

const getInputMin = (key: string) => (key.includes('pct') || key.includes('rate') ? 0 : undefined)

export function AdminAssumptionsSection() {
  const [assumptions, setAssumptions] = useState<Record<string, any> | null>(null)
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Pick<AdminAssumptionsResponse, 'updated_at' | 'updated_by' | 'updated_by_email'>>({})

  const fetchAssumptions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.get<AdminAssumptionsResponse>('/api/v1/admin/assumptions')
      setAssumptions(data.assumptions)
      setDraft(data.assumptions)
      setMeta({
        updated_at: data.updated_at,
        updated_by: data.updated_by,
        updated_by_email: data.updated_by_email,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assumptions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssumptions()
  }, [fetchAssumptions])

  const handleUpdate = (category: string, key: string, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }
    })
  }

  const handleUpdateGeneral = (key: string, value: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: value,
      }
    })
  }

  const handleSave = async () => {
    if (!draft) return
    try {
      setIsSaving(true)
      setError(null)
      const data = await api.put<AdminAssumptionsResponse>('/api/v1/admin/assumptions', draft)
      setAssumptions(data.assumptions)
      setDraft(data.assumptions)
      setMeta({
        updated_at: data.updated_at,
        updated_by: data.updated_by,
        updated_by_email: data.updated_by_email,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assumptions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (assumptions) {
      setDraft(assumptions)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
      </div>
    )
  }

  const generalKeys = ['appreciation_rate', 'rent_growth_rate', 'expense_growth_rate']
  const general = draft
    ? generalKeys.reduce((acc, key) => ({ ...acc, [key]: draft[key] }), {})
    : {}

  const categories = draft
    ? Object.entries(draft).filter(([key]) => !generalKeys.includes(key))
    : []

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-amber-500" />
          Metrics Assumptions (Admin Defaults)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssumptions}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-navy-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-navy-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {(meta.updated_at || meta.updated_by) && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Last updated {meta.updated_at ? formatDate(meta.updated_at) : '—'}
          {meta.updated_by ? ` by ${meta.updated_by}` : ''}
          {meta.updated_by_email ? ` (${meta.updated_by_email})` : ''}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map(([category, values]) => (
          <div key={category} className="border border-slate-200 dark:border-navy-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {formatKeyLabel(category)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(values as Record<string, number>).map(([key, value]) => (
                <label key={key} className="text-xs text-slate-500 dark:text-slate-400">
                  {formatKeyLabel(key)}
                  <input
                    type="number"
                    step={getInputStep(key)}
                    min={getInputMin(key)}
                    value={Number(value ?? 0)}
                    onChange={(e) => handleUpdate(category, key, Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-800 dark:text-white px-2 py-1 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="border border-slate-200 dark:border-navy-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            General Assumptions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(general).map(([key, value]) => (
              <label key={key} className="text-xs text-slate-500 dark:text-slate-400">
                {formatKeyLabel(key)}
                <input
                  type="number"
                  step={getInputStep(key)}
                  min={getInputMin(key)}
                  value={Number(value ?? 0)}
                  onChange={(e) => handleUpdateGeneral(key, Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-800 dark:text-white px-2 py-1 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
