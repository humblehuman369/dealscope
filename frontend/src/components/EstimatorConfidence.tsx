'use client'

import { useState } from 'react'
import {
  Shield, ShieldCheck, ShieldAlert,
  ChevronDown, ChevronUp,
  MapPin, Ruler, Calendar, Bath,
  TrendingUp, HelpCircle,
} from 'lucide-react'
import type {
  RegionalCostContext,
  EstimatorPropertyInput,
  ConfidenceLevel,
  CostContributor,
} from '@/lib/estimatorTypes'

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)

// ============================================
// CONFIDENCE BADGE
// ============================================

interface ConfidenceBadgeProps {
  costContext: RegionalCostContext | null
  compact?: boolean
}

export function ConfidenceBadge({ costContext, compact }: ConfidenceBadgeProps) {
  if (!costContext) return null

  const level = costContext.confidence as ConfidenceLevel
  const config = {
    high: {
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      label: 'High Confidence',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.3)',
      color: '#22c55e',
    },
    medium: {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'Medium Confidence',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.3)',
      color: '#f59e0b',
    },
    low: {
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      label: 'Low Confidence',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.3)',
      color: '#ef4444',
    },
  }[level]

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
        style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}
      >
        {config.icon}
        {config.label}
      </span>
    )
  }

  return (
    <div
      className="rounded-lg p-2.5 flex items-center justify-between"
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: config.color }}>{config.icon}</span>
        <div>
          <span className="text-sm font-semibold" style={{ color: config.color }}>{config.label}</span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
            {costContext.market_label}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {Math.round(costContext.confidence_score * 100)}% score
      </span>
    </div>
  )
}

// ============================================
// REGIONAL CONTEXT CARD
// ============================================

interface RegionalContextCardProps {
  costContext: RegionalCostContext
}

export function RegionalContextCard({ costContext }: RegionalContextCardProps) {
  const premium = ((costContext.combined_factor - 1) * 100)
  const isPremium = premium > 0

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Regional Cost Factors
          </span>
        </div>
        <ConfidenceBadge costContext={costContext} compact />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Labor', value: costContext.labor_factor },
          { label: 'Materials', value: costContext.material_factor },
          { label: 'Permits', value: costContext.permit_factor },
        ].map(({ label, value }) => {
          const pct = ((value - 1) * 100)
          return (
            <div
              key={label}
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: 'var(--surface-card)' }}
            >
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
              <div className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                {value.toFixed(2)}x
              </div>
              <div
                className="text-[10px] font-semibold"
                style={{
                  color: pct > 10 ? '#ef4444' : pct > 0 ? '#f59e0b' : '#22c55e',
                }}
              >
                {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="rounded-lg p-2 flex items-center justify-between"
        style={{ backgroundColor: 'var(--surface-card)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Combined Market Factor
        </span>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
            {costContext.combined_factor.toFixed(2)}x
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{
              backgroundColor: isPremium ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              color: isPremium ? '#ef4444' : '#22c55e',
            }}
          >
            {isPremium ? '+' : ''}{premium.toFixed(0)}% vs national avg
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// "WHY THIS NUMBER" EXPLANATION PANEL
// ============================================

interface CostExplanationPanelProps {
  propertyData?: EstimatorPropertyInput
  costContext?: RegionalCostContext | null
  totalEstimate: number
  breakdown?: { category: string; cost: number }[]
}

export function CostExplanationPanel({
  propertyData,
  costContext,
  totalEstimate,
  breakdown,
}: CostExplanationPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!propertyData) return null

  const age = propertyData.year_built
    ? new Date().getFullYear() - propertyData.year_built
    : null

  const drivers: { icon: React.ReactNode; label: string; value: string; effect: string }[] = []

  if (propertyData.square_footage) {
    const sqft = propertyData.square_footage
    drivers.push({
      icon: <Ruler className="w-3 h-3" />,
      label: 'Size',
      value: `${sqft.toLocaleString()} sqft`,
      effect: sqft > 2500
        ? 'Increases flooring, paint, and material quantities'
        : sqft < 1200
        ? 'Reduces material quantities'
        : 'Standard material quantities',
    })
  }

  if (age !== null) {
    drivers.push({
      icon: <Calendar className="w-3 h-3" />,
      label: 'Age',
      value: `${age} years (built ${propertyData.year_built})`,
      effect: age > 30
        ? 'Major systems likely need replacement'
        : age > 15
        ? 'Some systems may need updating'
        : 'Systems likely in serviceable condition',
    })
  }

  if (propertyData.bathrooms) {
    drivers.push({
      icon: <Bath className="w-3 h-3" />,
      label: 'Bathrooms',
      value: `${propertyData.bathrooms}`,
      effect: propertyData.bathrooms > 2
        ? 'Multiple baths increase wet-room renovation costs'
        : 'Standard bathroom scope',
    })
  }

  if (costContext && costContext.combined_factor !== 1.0) {
    const pct = ((costContext.combined_factor - 1) * 100).toFixed(0)
    drivers.push({
      icon: <MapPin className="w-3 h-3" />,
      label: 'Market',
      value: costContext.market_label,
      effect: `${costContext.combined_factor > 1 ? '+' : ''}${pct}% cost adjustment vs national average`,
    })
  }

  const topContributors: CostContributor[] = (breakdown ?? [])
    .filter(b => b.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 4)
    .map(b => ({
      category: b.category,
      amount: b.cost,
      pct_of_total: totalEstimate > 0 ? Math.round((b.cost / totalEstimate) * 100) : 0,
    }))

  const recommendation = costContext
    ? costContext.confidence === 'high'
      ? 'Use as underwriting base'
      : costContext.confidence === 'medium'
      ? 'Good starting point — validate key line items'
      : 'Broad estimate — manual adjustment recommended'
    : 'No regional data — using national averages'

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Why This Number
          </span>
        </div>
        <div className="flex items-center gap-2">
          {costContext && <ConfidenceBadge costContext={costContext} compact />}
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Property Drivers */}
          <div>
            <div className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Property Drivers
            </div>
            <div className="space-y-1.5">
              {drivers.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--surface-elevated)' }}
                >
                  <span className="mt-0.5" style={{ color: 'var(--accent-sky)' }}>{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>{d.label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.value}</span>
                    </div>
                    <div className="text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>{d.effect}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cost Contributors */}
          {topContributors.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Top Cost Drivers
              </div>
              <div className="space-y-1">
                {topContributors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--accent-sky)', opacity: 1 - i * 0.2 }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-heading)' }}>{c.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {formatCurrency(c.amount)}
                      </span>
                      <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                        {c.pct_of_total}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div
            className="rounded-lg p-2.5 flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
          >
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-sky)' }} />
            <span className="text-xs" style={{ color: 'var(--text-heading)' }}>
              {recommendation}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
