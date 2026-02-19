'use client'

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Search, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api-client'

// ===========================================
// Metrics Glossary — Dark Fintech Theme
// ===========================================
// Teal for formulas (educational), amber for notes,
// sky for interpretation, white/7% borders throughout
// ===========================================

// ===========================================
// Types
// ===========================================

interface MetricEntry {
  formula?: string
  inputs?: string[]
  notes?: string
  description?: string
  interpretation?: string | Record<string, string>
}

interface StrategySection {
  id: string
  name: string
  metrics: Record<string, MetricEntry>
}

interface TopLevelSection {
  description?: string
  source?: string
  metrics?: Record<string, MetricEntry>
  [key: string]: any
}

interface GlossaryData {
  version?: string
  updatedAt?: string
  source?: string
  strategies?: StrategySection[]
  [key: string]: any
}

// ===========================================
// Helpers
// ===========================================

const formatKeyLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const SECTION_LABELS: Record<string, string> = {
  iq_verdict_score: 'IQ Verdict Score',
  wholesale_price_target: 'Wholesale Price Target',
  market_statistics: 'Market Statistics',
  rental_market_statistics: 'Rental Market Statistics',
  deal_opportunity_score: 'Deal Opportunity Score',
  performance_scores: 'Performance Scores',
  seller_motivation_score: 'Seller Motivation Score',
}

/** Check if a metric matches the search query */
function matchesSearch(metricId: string, metric: MetricEntry, query: string): boolean {
  const q = query.toLowerCase()
  return (
    metricId.toLowerCase().includes(q) ||
    formatKeyLabel(metricId).toLowerCase().includes(q) ||
    (metric.formula?.toLowerCase().includes(q) ?? false) ||
    (metric.description?.toLowerCase().includes(q) ?? false) ||
    (metric.notes?.toLowerCase().includes(q) ?? false) ||
    (metric.inputs?.some((i) => i.toLowerCase().includes(q)) ?? false)
  )
}

// ===========================================
// Sub-components
// ===========================================

function MetricCard({ metricId, metric }: { metricId: string; metric: MetricEntry }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-3 border border-white/[0.07]">
      <div className="text-xs font-semibold text-slate-200 mb-1.5">
        {formatKeyLabel(metricId)}
      </div>

      {metric.formula && (
        <div className="mb-1.5">
          <code className="text-[11px] text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded inline-block leading-relaxed break-all">
            {metric.formula}
          </code>
        </div>
      )}

      {metric.description && (
        <p className="text-[11px] text-slate-400 mb-1.5 leading-relaxed">
          {metric.description}
        </p>
      )}

      {metric.inputs && metric.inputs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {metric.inputs.map((input) => (
            <span
              key={input}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/[0.06] text-slate-300 border border-white/[0.07]"
            >
              {input}
            </span>
          ))}
        </div>
      )}

      {metric.notes && (
        <p className="text-[10px] text-amber-400 mt-1 leading-relaxed">
          {metric.notes}
        </p>
      )}

      {metric.interpretation && typeof metric.interpretation === 'string' && (
        <p className="text-[10px] text-sky-400 mt-1 leading-relaxed">
          {metric.interpretation}
        </p>
      )}

      {metric.interpretation && typeof metric.interpretation === 'object' && (
        <div className="mt-1.5 space-y-0.5">
          {Object.entries(metric.interpretation).map(([label, desc]) => (
            <p key={label} className="text-[10px] text-sky-400 leading-relaxed">
              <span className="font-semibold">{formatKeyLabel(label)}:</span> {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  matchCount,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  matchCount?: number
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Auto-expand sections with search matches
  useEffect(() => {
    if (matchCount && matchCount > 0) {
      setIsOpen(true)
    }
  }, [matchCount])

  return (
    <div className="border border-white/[0.07] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              {title}
            </h4>
            {description && !isOpen && (
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {matchCount !== undefined && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 tabular-nums">
            {matchCount} {matchCount === 1 ? 'metric' : 'metrics'}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {description && (
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

// ===========================================
// Main Component
// ===========================================

export function MetricsGlossarySection() {
  const [glossary, setGlossary] = useState<GlossaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await api.get<{ data: GlossaryData }>('/api/v1/admin/metrics-glossary')
        setGlossary(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load glossary')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGlossary()
  }, [])

  // Extract top-level sections (market_statistics, etc.) that have metrics
  const topLevelSections = useMemo(() => {
    if (!glossary) return []
    const skipKeys = ['version', 'updatedAt', 'source', 'strategies']
    return Object.entries(glossary)
      .filter(([key, val]) => !skipKeys.includes(key) && typeof val === 'object' && val !== null)
      .map(([key, val]) => ({
        id: key,
        name: SECTION_LABELS[key] || formatKeyLabel(key),
        description: (val as TopLevelSection).description,
        metrics: (val as TopLevelSection).metrics || {},
      }))
  }, [glossary])

  // Filter metrics by search query
  const filteredTopLevel = useMemo(() => {
    if (!searchQuery.trim()) return topLevelSections
    return topLevelSections
      .map((section) => ({
        ...section,
        metrics: Object.fromEntries(
          Object.entries(section.metrics).filter(([id, m]) => matchesSearch(id, m, searchQuery))
        ),
      }))
      .filter((section) => Object.keys(section.metrics).length > 0)
  }, [topLevelSections, searchQuery])

  const filteredStrategies = useMemo(() => {
    if (!glossary?.strategies) return []
    if (!searchQuery.trim()) return glossary.strategies
    return glossary.strategies
      .map((strategy) => ({
        ...strategy,
        metrics: Object.fromEntries(
          Object.entries(strategy.metrics).filter(([id, m]) => matchesSearch(id, m, searchQuery))
        ),
      }))
      .filter((strategy) => Object.keys(strategy.metrics).length > 0)
  }, [glossary?.strategies, searchQuery])

  const totalMatchCount = useMemo(() => {
    const topCount = filteredTopLevel.reduce((sum, s) => sum + Object.keys(s.metrics).length, 0)
    const stratCount = filteredStrategies.reduce((sum, s) => sum + Object.keys(s.metrics).length, 0)
    return topCount + stratCount
  }, [filteredTopLevel, filteredStrategies])

  return (
    <div className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Formula Glossary
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Complete reference of all metrics, formulas, and calculations used across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {glossary?.version && (
            <span className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
              v{glossary.version}
              {glossary.updatedAt && ` — ${glossary.updatedAt}`}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search metrics, formulas, or inputs..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 tabular-nums">
            {totalMatchCount} {totalMatchCount === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Source */}
      {glossary?.source && !searchQuery && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-4">
          <ExternalLink className="w-3 h-3" />
          <span>Source: {glossary.source}</span>
        </div>
      )}

      {/* Sections */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {/* Top-level sections (Market Stats, Deal Score, etc.) */}
          {filteredTopLevel.map((section) => (
            <CollapsibleSection
              key={section.id}
              title={section.name}
              description={section.description}
              matchCount={Object.keys(section.metrics).length}
              defaultOpen={!!searchQuery}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(section.metrics).map(([metricId, metric]) => (
                  <MetricCard key={metricId} metricId={metricId} metric={metric} />
                ))}
              </div>
            </CollapsibleSection>
          ))}

          {/* Strategy sections */}
          {filteredStrategies.map((strategy) => (
            <CollapsibleSection
              key={strategy.id}
              title={strategy.name}
              matchCount={Object.keys(strategy.metrics).length}
              defaultOpen={!!searchQuery}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(strategy.metrics).map(([metricId, metric]) => (
                  <MetricCard key={metricId} metricId={metricId} metric={metric} />
                ))}
              </div>
            </CollapsibleSection>
          ))}

          {/* No results */}
          {searchQuery && totalMatchCount === 0 && (
            <div className="text-center py-8 text-sm text-slate-500">
              No metrics match &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
