'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

/* ─── Types ─── */

interface PropertySnapshot {
  listPrice?: number
  monthlyRent?: number
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  arv?: number
  propertyTaxes?: number
  insurance?: number
}

interface SavedProperty {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  best_strategy?: string
  best_cash_flow?: number
  best_coc_return?: number
  property_data_snapshot?: PropertySnapshot
  custom_purchase_price?: number
  custom_rent_estimate?: number
}

/* ─── Helpers ─── */

const fmt = (n: number | undefined | null, prefix = '$') => {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n.toLocaleString()}`
}

const fmtPct = (n: number | undefined | null) => {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

const strategyLabel = (key: string | undefined) => {
  if (!key) return '—'
  const map: Record<string, string> = {
    long_term_rental: 'Long-Term Rental',
    short_term_rental: 'Short-Term Rental',
    brrrr: 'BRRRR',
    fix_and_flip: 'Fix & Flip',
    house_hack: 'House Hack',
    wholesale: 'Wholesale',
  }
  return map[key] || key
}

/* ─── Comparison Row ─── */

function ComparisonRow({
  label,
  values,
  formatter = (v) => String(v ?? '—'),
  highlight,
}: {
  label: string
  values: (string | number | null | undefined)[]
  formatter?: (v: string | number | null | undefined) => string
  highlight?: 'max' | 'min'
}) {
  const formatted = values.map(formatter)
  const numericValues = values.map(v => typeof v === 'number' ? v : null)

  let bestIdx = -1
  if (highlight && numericValues.some(v => v != null)) {
    const validNums = numericValues.filter((v): v is number => v != null)
    if (validNums.length > 0) {
      const target = highlight === 'max' ? Math.max(...validNums) : Math.min(...validNums)
      bestIdx = numericValues.indexOf(target)
    }
  }

  return (
    <div className="grid items-center border-b" style={{
      gridTemplateColumns: `160px repeat(${values.length}, 1fr)`,
      borderColor: colors.ui.border,
    }}>
      <div className="px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text.secondary }}>{label}</span>
      </div>
      {formatted.map((v, i) => (
        <div key={i} className="px-4 py-3 text-center">
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: bestIdx === i ? colors.brand.teal : colors.text.body }}
          >
            {v}
            {bestIdx === i && (
              <svg className="inline ml-1 -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.brand.teal} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main Component ─── */

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []

  const [properties, setProperties] = useState<SavedProperty[]>([])
  const [allProperties, setAllProperties] = useState<SavedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  // Fetch comparison properties
  useEffect(() => {
    if (ids.length === 0) {
      setIsLoading(false)
      return
    }
    const fetchProps = async () => {
      setIsLoading(true)
      try {
        const results = await Promise.all(
          ids.map(id => api.get<SavedProperty>(`/api/v1/properties/saved/${id}`).catch(() => null))
        )
        setProperties(results.filter((p): p is SavedProperty => p !== null))
      } catch {
        // Ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchProps()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  // Fetch all saved for picker
  const loadAllProperties = useCallback(async () => {
    try {
      const data = await api.get<SavedProperty[]>('/api/v1/properties/saved?limit=50')
      setAllProperties(data)
    } catch {
      // Ignore
    }
  }, [])

  const addProperty = (id: string) => {
    const newIds = [...ids.filter(Boolean), id]
    router.push(`/compare?ids=${newIds.join(',')}`)
    setShowPicker(false)
  }

  const removeProperty = (id: string) => {
    const newIds = ids.filter(i => i !== id)
    router.push(`/compare?ids=${newIds.join(',')}`)
  }

  const snap = (p: SavedProperty) => p.property_data_snapshot || {} as PropertySnapshot

  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: colors.ui.border }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/saved-properties" className="text-sm text-slate-400 hover:text-white transition-colors no-underline">
              &larr; Saved Properties
            </Link>
            <h1 className="text-lg font-bold text-white">Compare Properties</h1>
          </div>
          {properties.length < 4 && (
            <button
              onClick={() => { setShowPicker(!showPicker); if (!showPicker) loadAllProperties() }}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}`, color: colors.text.body }}
            >
              + Add Property
            </button>
          )}
        </div>
      </header>

      {/* Picker Dropdown */}
      {showPicker && (
        <div className="border-b px-6 py-4" style={{ background: colors.background.card, borderColor: colors.ui.border }}>
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.text.secondary }}>Select a property to compare:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allProperties
                .filter(p => !ids.includes(p.id))
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProperty(p.id)}
                    className="text-left px-4 py-3 rounded-lg transition-all hover:opacity-80"
                    style={{ background: colors.background.bg, border: `1px solid ${colors.ui.border}` }}
                  >
                    <p className="text-sm font-semibold text-white truncate">{p.address_street}</p>
                    <p className="text-xs" style={{ color: colors.text.secondary }}>
                      {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                      {p.best_cash_flow != null && ` · ${fmt(p.best_cash_flow)}/mo`}
                    </p>
                  </button>
                ))}
              {allProperties.filter(p => !ids.includes(p.id)).length === 0 && (
                <p className="text-sm" style={{ color: colors.text.muted }}>No more saved properties to add.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Empty State */}
        {properties.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <svg className="mx-auto mb-4 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.text.secondary} strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <h2 className="text-lg font-bold text-white mb-2">Compare Properties Side-by-Side</h2>
            <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: colors.text.secondary }}>
              Select 2-4 saved properties to compare their key metrics, strategies, and financial performance.
            </p>
            <button
              onClick={() => { setShowPicker(true); loadAllProperties() }}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: colors.brand.blueDeep, color: '#fff' }}
            >
              Select Properties to Compare
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: colors.brand.blue }} />
            <p className="text-sm" style={{ color: colors.text.secondary }}>Loading properties...</p>
          </div>
        )}

        {/* Comparison Table */}
        {properties.length > 0 && !isLoading && (
          <div className="overflow-x-auto">
            {/* Property Headers */}
            <div className="grid sticky top-0 z-10" style={{
              gridTemplateColumns: `160px repeat(${properties.length}, 1fr)`,
              background: colors.background.bg,
            }}>
              <div className="px-4 py-4">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.brand.teal }}>
                  {properties.length} Properties
                </span>
              </div>
              {properties.map(p => (
                <div key={p.id} className="px-4 py-4 text-center">
                  <p className="text-sm font-bold text-white truncate">{p.address_street}</p>
                  <p className="text-xs truncate" style={{ color: colors.text.secondary }}>
                    {[p.address_city, p.address_state].filter(Boolean).join(', ')}
                  </p>
                  <button
                    onClick={() => removeProperty(p.id)}
                    className="text-[10px] font-medium mt-1"
                    style={{ color: colors.text.muted }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.ui.border}` }}>
              <div className="px-4 py-2" style={{ background: colors.background.card }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.brand.blue }}>Investment Analysis</span>
              </div>
              <ComparisonRow
                label="Best Strategy"
                values={properties.map(p => p.best_strategy)}
                formatter={(v) => strategyLabel(v as string)}
              />
              <ComparisonRow
                label="Monthly Cash Flow"
                values={properties.map(p => p.best_cash_flow)}
                formatter={(v) => fmt(v as number, '$')}
                highlight="max"
              />
              <ComparisonRow
                label="Cash-on-Cash"
                values={properties.map(p => p.best_coc_return)}
                formatter={(v) => fmtPct(v as number)}
                highlight="max"
              />

              <div className="px-4 py-2 mt-1" style={{ background: colors.background.card }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.brand.blue }}>Property Details</span>
              </div>
              <ComparisonRow
                label="List Price"
                values={properties.map(p => p.custom_purchase_price || snap(p).listPrice)}
                formatter={(v) => fmt(v as number)}
                highlight="min"
              />
              <ComparisonRow
                label="Monthly Rent"
                values={properties.map(p => p.custom_rent_estimate || snap(p).monthlyRent)}
                formatter={(v) => fmt(v as number)}
                highlight="max"
              />
              <ComparisonRow
                label="Bedrooms"
                values={properties.map(p => snap(p).bedrooms)}
                formatter={(v) => v != null ? String(v) : '—'}
              />
              <ComparisonRow
                label="Bathrooms"
                values={properties.map(p => snap(p).bathrooms)}
                formatter={(v) => v != null ? String(v) : '—'}
              />
              <ComparisonRow
                label="Sq Ft"
                values={properties.map(p => snap(p).sqft)}
                formatter={(v) => v != null ? (v as number).toLocaleString() : '—'}
                highlight="max"
              />
              <ComparisonRow
                label="Price / Sq Ft"
                values={properties.map(p => {
                  const price = p.custom_purchase_price || snap(p).listPrice
                  const sqft = snap(p).sqft
                  return price && sqft ? Math.round(price / sqft) : null
                })}
                formatter={(v) => fmt(v as number)}
                highlight="min"
              />

              <div className="px-4 py-2 mt-1" style={{ background: colors.background.card }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.brand.blue }}>Expenses</span>
              </div>
              <ComparisonRow
                label="Property Taxes"
                values={properties.map(p => snap(p).propertyTaxes)}
                formatter={(v) => fmt(v as number)}
                highlight="min"
              />
              <ComparisonRow
                label="Insurance"
                values={properties.map(p => snap(p).insurance)}
                formatter={(v) => fmt(v as number)}
                highlight="min"
              />
            </div>

            {/* Actions */}
            <div className="grid mt-6" style={{ gridTemplateColumns: `160px repeat(${properties.length}, 1fr)` }}>
              <div />
              {properties.map(p => (
                <div key={p.id} className="px-4 text-center">
                  <Link
                    href={`/verdict?address=${encodeURIComponent(p.address_street + (p.address_city ? ', ' + p.address_city : '') + (p.address_state ? ', ' + p.address_state : ''))}`}
                    className="inline-block px-4 py-2 rounded-lg text-xs font-semibold no-underline transition-all"
                    style={{ background: colors.brand.blueDeep, color: '#fff' }}
                  >
                    View Analysis
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38bdf8' }} />
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
