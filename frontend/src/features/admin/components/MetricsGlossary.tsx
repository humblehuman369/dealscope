'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { api } from '@/lib/api-client'

interface MetricsGlossary {
  version?: string
  updatedAt?: string
  source?: string
  strategies?: Array<{
    id: string
    name: string
    metrics: Record<string, { formula?: string; inputs?: string[]; notes?: string }>
  }>
}

const formatKeyLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

export function MetricsGlossarySection() {
  const [glossary, setGlossary] = useState<MetricsGlossary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await api.get<{ data: MetricsGlossary }>('/api/v1/admin/metrics-glossary')
        setGlossary(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load glossary')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGlossary()
  }, [])

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          Metrics Glossary
        </h3>
        {glossary?.version && (
          <span className="text-xs text-slate-500 dark:text-slate-400">v{glossary.version}</span>
        )}
      </div>

      {isLoading && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {glossary?.strategies && (
        <div className="space-y-6">
          {glossary.strategies.map((strategy) => (
            <div key={strategy.id} className="border border-slate-200 dark:border-navy-600 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                {strategy.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(strategy.metrics).map(([metricId, metric]) => (
                  <div key={metricId} className="rounded-lg bg-slate-50 dark:bg-navy-700 p-3">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {formatKeyLabel(metricId)}
                    </div>
                    {metric.formula && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        {metric.formula}
                      </div>
                    )}
                    {metric.inputs && metric.inputs.length > 0 && (
                      <div className="text-[10px] text-slate-400">
                        Inputs: {metric.inputs.join(', ')}
                      </div>
                    )}
                    {metric.notes && (
                      <div className="text-[10px] text-amber-600 mt-1">{metric.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
