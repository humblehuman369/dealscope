'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Zap,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Home,
  Wrench,
  TrendingUp,
  MapPin,
  Flame,
  Info,
  Building2,
} from 'lucide-react'
import {
  RehabIntelligence,
  RehabEstimate,
  PropertyInput,
  PropertyCondition,
  CapExWarning,
  getLocationFactor,
} from '@/lib/rehabIntelligence'
import type { RehabSelection } from '@/lib/analytics'
import { lineItemsToSelections } from '@/lib/rehabBudgetSeed'
import type { RegionalCostContext } from '@/lib/estimatorTypes'
import { ConfidenceBadge, CostExplanationPanel } from './EstimatorConfidence'
import { trackConditionChanged } from '@/lib/estimatorTracking'

// ============================================
// TYPES
// ============================================

export interface QuickEstimateSnapshot {
  getSelections: () => RehabSelection[]
  contingencyPct: number
  total: number
}

interface QuickRehabEstimateProps {
  propertyData: {
    square_footage?: number
    year_built?: number
    arv?: number
    current_value_avm?: number
    zip_code?: string
    bedrooms?: number
    bathrooms?: number
    has_pool?: boolean
    roof_type?: string
    stories?: number
    garage_spaces?: number
    lot_size?: number
    hoa_monthly?: number
  }
  onEstimateChange?: (total: number) => void
  onEstimateSnapshot?: (snapshot: QuickEstimateSnapshot) => void
  onSwitchToDetailed?: () => void
  initialCondition?: PropertyCondition
  costContext?: RegionalCostContext | null
  saveAction?: React.ReactNode
}

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value)
}

// ============================================
// CONDITION SELECTOR
// ============================================

function ConditionSelector({
  value,
  onChange,
}: {
  value: PropertyCondition
  onChange: (condition: PropertyCondition) => void
}) {
  const conditions: {
    id: PropertyCondition
    label: string
    description: string
    activeColor: string
  }[] = [
    {
      id: 'distressed',
      label: 'Distressed',
      description: 'Major issues, full gut needed',
      activeColor: 'var(--status-fail)',
    },
    {
      id: 'fair',
      label: 'Fair',
      description: 'Functional but dated',
      activeColor: 'var(--status-warning)',
    },
    {
      id: 'good',
      label: 'Good',
      description: 'Minor updates needed',
      activeColor: 'var(--status-pass)',
    },
    {
      id: 'excellent',
      label: 'Excellent',
      description: 'Move-in ready',
      activeColor: 'var(--accent-sky)',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {conditions.map((cond) => {
        const isActive = value === cond.id
        return (
          <button
            key={cond.id}
            onClick={() => onChange(cond.id)}
            className="p-2 rounded-lg border-2 text-left transition-all"
            style={{
              backgroundColor: isActive ? 'var(--surface-elevated)' : 'var(--surface-card)',
              borderColor: isActive ? cond.activeColor : 'var(--border-default)',
              color: isActive ? cond.activeColor : 'var(--text-secondary)',
            }}
          >
            <div
              className="text-sm font-semibold"
              style={{ color: isActive ? cond.activeColor : 'var(--text-heading)' }}
            >
              {cond.label}
            </div>
            <div className="text-xs opacity-75 leading-tight">{cond.description}</div>
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// PROPERTY CONTEXT CARD
// ============================================

function PropertyContextCard({
  estimate,
  propertyData,
}: {
  estimate: RehabEstimate
  propertyData: QuickRehabEstimateProps['propertyData']
}) {
  const assetClassLabels = {
    standard: 'Standard',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra-Luxury',
  }

  const assetClassColors = {
    standard: { bg: 'var(--surface-elevated)', color: 'var(--text-secondary)' },
    luxury: { bg: 'rgba(147, 51, 234, 0.15)', color: '#a855f7' },
    ultra_luxury: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  }

  const cls = assetClassColors[estimate.asset_class]

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
            Property Analysis
          </span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: cls.bg, color: cls.color }}
        >
          {assetClassLabels[estimate.asset_class]} Class
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Square Feet', value: formatNumber(propertyData.square_footage || 0) },
          { label: 'Year Built', value: propertyData.year_built || 'N/A' },
          {
            label: 'Property Age',
            value: propertyData.year_built
              ? `${new Date().getFullYear() - propertyData.year_built} years`
              : 'N/A',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg p-2.5"
            style={{ backgroundColor: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-heading)' }}>
              {item.label}
            </div>
            <div className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Location Factor */}
      <div
        className="rounded-lg p-2.5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {estimate.location_market}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-heading)' }}>
            Cost Factor
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{
              backgroundColor:
                estimate.location_factor > 1.3
                  ? 'rgba(239,68,68,0.15)'
                  : estimate.location_factor > 1.15
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(34,197,94,0.15)',
              color:
                estimate.location_factor > 1.3
                  ? '#ef4444'
                  : estimate.location_factor > 1.15
                    ? '#f59e0b'
                    : '#22c55e',
            }}
          >
            {estimate.location_factor > 1 ? '+' : ''}
            {((estimate.location_factor - 1) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// CAPEX WARNINGS
// ============================================

function CapExWarningsCard({ warnings }: { warnings: CapExWarning[] }) {
  const [expanded, setExpanded] = useState(true)

  if (warnings.length === 0) return null

  const criticalCount = warnings.filter((w) => w.priority === 'critical').length
  const totalCost = warnings.reduce((sum, w) => sum + w.estimated_cost, 0)

  const priorityStyles: Record<string, { bg: string; border: string; color: string }> = {
    critical: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
    high: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
    medium: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', color: '#eab308' },
    low: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
  }

  const priorityIcons = {
    critical: <AlertCircle className="w-3.5 h-3.5" />,
    high: <AlertTriangle className="w-3.5 h-3.5" />,
    medium: <Info className="w-3.5 h-3.5" />,
    low: <CheckCircle className="w-3.5 h-3.5" />,
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500" />
          <span className="text-base font-semibold text-red-500">
            CapEx Warnings ({warnings.length})
          </span>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-red-500">{formatCurrency(totalCost)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-red-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-red-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {warnings.map((warning, idx) => {
            const ps = priorityStyles[warning.priority] || priorityStyles.medium
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg"
                style={{
                  backgroundColor: ps.bg,
                  border: `1px solid ${ps.border}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2" style={{ color: ps.color }}>
                    {priorityIcons[warning.priority as keyof typeof priorityIcons]}
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {warning.item}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                    {formatCurrency(warning.estimated_cost)}
                  </span>
                </div>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {warning.notes}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// COST BREAKDOWN
// ============================================

function CostBreakdownCard({
  estimate,
  excludedCategories,
  onToggleCategory,
}: {
  estimate: RehabEstimate
  excludedCategories: Set<string>
  onToggleCategory: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const breakdown = estimate.breakdown

  const categories = [
    { key: 'kitchen', label: 'Kitchen', value: breakdown.kitchen, icon: '🍳' },
    { key: 'bathrooms', label: 'Bathrooms', value: breakdown.bathrooms, icon: '🚿' },
    { key: 'flooring', label: 'Flooring', value: breakdown.flooring, icon: '🏠' },
    { key: 'paint_walls', label: 'Paint & Walls', value: breakdown.paint_walls, icon: '🎨' },
    { key: 'exterior', label: 'Exterior', value: breakdown.exterior, icon: '🏡' },
    { key: 'roof', label: 'Roof', value: breakdown.roof, icon: '🔨' },
    { key: 'hvac', label: 'HVAC', value: breakdown.hvac, icon: '❄️' },
    { key: 'electrical', label: 'Electrical', value: breakdown.electrical, icon: '⚡' },
    { key: 'plumbing', label: 'Plumbing', value: breakdown.plumbing, icon: '🔧' },
    { key: 'windows_doors', label: 'Windows & Doors', value: breakdown.windows_doors, icon: '🪟' },
    { key: 'other', label: 'Other', value: breakdown.other, icon: '📦' },
    { key: 'permits', label: 'Permits', value: breakdown.permits, icon: '📋' },
  ]
    .filter((c) => c.value > 0)
    // Sort by natural cost, but push deselected categories to the bottom.
    .sort((a, b) => {
      const aEx = excludedCategories.has(a.key)
      const bEx = excludedCategories.has(b.key)
      if (aEx !== bEx) return aEx ? 1 : -1
      return b.value - a.value
    })

  const topCategories = categories.slice(0, 4)
  const remainingCategories = categories.slice(4)

  const renderCategory = (cat: { key: string; label: string; value: number; icon: string }) => {
    const isExcluded = excludedCategories.has(cat.key)
    return (
      <button
        key={cat.key}
        type="button"
        onClick={() => onToggleCategory(cat.key)}
        aria-pressed={!isExcluded}
        aria-label={`${isExcluded ? 'Include' : 'Exclude'} ${cat.label}`}
        className="rounded-lg p-2 flex items-center justify-between text-left transition-opacity"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          opacity: isExcluded ? 0.5 : 1,
          border: isExcluded
            ? '1px dashed var(--border-default)'
            : '1px solid transparent',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="flex items-center justify-center w-4 h-4 rounded shrink-0"
            style={{
              border: `1.5px solid ${isExcluded ? 'var(--border-default)' : 'var(--accent-sky)'}`,
              backgroundColor: isExcluded ? 'transparent' : 'var(--accent-sky)',
            }}
          >
            {!isExcluded && <Check className="w-3 h-3" style={{ color: 'var(--text-inverse)' }} />}
          </span>
          <span className="text-sm">{cat.icon}</span>
          <span
            className="text-sm truncate"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: isExcluded ? 'line-through' : 'none',
            }}
          >
            {cat.label}
          </span>
        </div>
        <span
          className="text-sm font-semibold shrink-0"
          style={{
            color: 'var(--text-heading)',
            textDecoration: isExcluded ? 'line-through' : 'none',
          }}
        >
          {formatCurrency(cat.value)}
        </span>
      </button>
    )
  }

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
          <Wrench className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
            Cost Breakdown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold" style={{ color: 'var(--accent-sky)' }}>
            {formatCurrency(breakdown.construction_total)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
          )}
        </div>
      </button>

      <div className="px-3 pb-3">
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Tap a category to include or exclude it from the estimate.
        </p>
        <div className="grid grid-cols-2 gap-2">{topCategories.map(renderCategory)}</div>

        {expanded && remainingCategories.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {remainingCategories.map(renderCategory)}
          </div>
        )}

        {remainingCategories.length > 0 && !expanded && (
          <div className="text-center mt-2">
            <span className="text-xs" style={{ color: 'var(--text-heading)' }}>
              +{remainingCategories.length} more categories
            </span>
          </div>
        )}

        {/* Contingency */}
        <div
          className="mt-2 p-2 rounded-lg flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm text-amber-600 dark:text-amber-400">Contingency (10%)</span>
          </div>
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(breakdown.contingency)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HOLDING COSTS
// ============================================

function HoldingCostsCard({ estimate }: { estimate: RehabEstimate }) {
  const holding = estimate.holding_costs
  if (!holding) return null

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        backgroundColor: 'rgba(139,92,246,0.08)',
        border: '1px solid rgba(139,92,246,0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          <span className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
            Holding Costs
          </span>
          <span className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
            &quot;The Silent Killer&quot;
          </span>
        </div>
        <span className="text-base font-bold" style={{ color: '#8b5cf6' }}>
          {formatCurrency(holding.total_holding)}
        </span>
      </div>

      <div
        className="rounded-lg p-2"
        style={{ backgroundColor: 'var(--surface-card)', opacity: 0.9 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: '#8b5cf6' }}>
            Estimated Timeline
          </span>
          <span className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
            {holding.duration_months} months
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Interest', value: holding.monthly_interest },
            { label: 'Taxes', value: holding.monthly_taxes },
            { label: 'Insurance', value: holding.monthly_insurance },
            { label: 'Utilities', value: holding.monthly_utilities },
          ].map((item) => (
            <div key={item.label} className="flex justify-between">
              <span style={{ color: 'var(--text-heading)' }}>{item.label}</span>
              <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
                {formatCurrency(item.value)}/mo
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-2 pt-2 flex justify-between"
          style={{ borderTop: '1px solid rgba(139,92,246,0.2)' }}
        >
          <span className="text-sm font-medium" style={{ color: '#8b5cf6' }}>
            Monthly Burn Rate
          </span>
          <span className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
            {formatCurrency(holding.monthly_total)}/mo
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function QuickRehabEstimate({
  propertyData,
  onEstimateChange,
  onEstimateSnapshot,
  onSwitchToDetailed,
  initialCondition = 'fair',
  costContext,
  saveAction,
}: QuickRehabEstimateProps) {
  const [condition, setConditionRaw] = useState<PropertyCondition>(initialCondition)
  const setCondition = (c: PropertyCondition) => {
    setConditionRaw(c)
    trackConditionChanged(c, propertyData.zip_code)
  }
  const [contingencyPct, setContingencyPct] = useState(0.1)
  const [includeHolding, setIncludeHolding] = useState(true)
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = useCallback((key: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const { estimate, intelligence } = useMemo(() => {
    const ri = new RehabIntelligence({
      sq_ft: propertyData.square_footage || 1500,
      year_built: propertyData.year_built || 2000,
      arv: propertyData.arv || propertyData.current_value_avm || 400000,
      zip_code: propertyData.zip_code || '33401',
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      condition,
      has_pool: propertyData.has_pool,
      roof_type: propertyData.roof_type as PropertyInput['roof_type'],
      stories: propertyData.stories,
      garage_spaces: propertyData.garage_spaces,
      lot_sqft: propertyData.lot_size,
      hoa_monthly: propertyData.hoa_monthly,
      regional_factor: costContext?.combined_factor,
      excluded_categories: Array.from(excludedCategories),
    })

    return {
      intelligence: ri,
      estimate: ri.calculate({
        contingencyPct,
        includeHoldingCosts: includeHolding,
      }),
    }
  }, [propertyData, condition, contingencyPct, includeHolding, costContext, excludedCategories])

  useMemo(() => {
    onEstimateChange?.(estimate.total_rehab)
  }, [estimate.total_rehab, onEstimateChange])

  useEffect(() => {
    onEstimateSnapshot?.({
      getSelections: () => lineItemsToSelections(intelligence.generateLineItems()),
      contingencyPct,
      total: estimate.total_rehab,
    })
  }, [intelligence, contingencyPct, estimate.total_rehab, onEstimateSnapshot])

  return (
    <div className="space-y-4">
      {/* Header with AI badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-brand-500 to-sky-500 rounded-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
              Quick Estimate
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-heading)' }}>
              AI-powered rehab analysis
            </p>
          </div>
        </div>
        {onSwitchToDetailed && (
          <button
            onClick={onSwitchToDetailed}
            className="px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors"
            style={{
              color: 'var(--accent-sky)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-card)',
            }}
          >
            Switch to Detailed Mode
          </button>
        )}
      </div>

      {/* Property Context */}
      <PropertyContextCard estimate={estimate} propertyData={propertyData} />

      {/* Condition Selector */}
      <div>
        <label
          className="text-sm font-semibold mb-2 block"
          style={{ color: 'var(--text-secondary)' }}
        >
          Property Condition
        </label>
        <ConditionSelector value={condition} onChange={setCondition} />
      </div>

      {/* CapEx Warnings */}
      <CapExWarningsCard warnings={estimate.capex_warnings} />

      {/* Cost Breakdown */}
      <CostBreakdownCard
        estimate={estimate}
        excludedCategories={excludedCategories}
        onToggleCategory={toggleCategory}
      />

      {/* Why This Number */}
      <CostExplanationPanel
        propertyData={propertyData}
        costContext={costContext}
        totalEstimate={estimate.total_rehab}
      />

      {/* Holding Costs Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeHolding}
            onChange={(e) => setIncludeHolding(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--surface-input)',
            }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Include holding costs
          </span>
        </label>
      </div>

      {includeHolding && <HoldingCostsCard estimate={estimate} />}

      {/* Contingency Selector */}
      <div
        className="rounded-lg p-3 flex justify-between items-center"
        style={{
          backgroundColor: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}
      >
        <div>
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Contingency Reserve
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-500">Buffer for unexpected costs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={contingencyPct}
            onChange={(e) => setContingencyPct(parseFloat(e.target.value))}
            className="px-2 py-1 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--surface-input)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            <option value={0.05}>5%</option>
            <option value={0.1}>10%</option>
            <option value={0.15}>15%</option>
            <option value={0.2}>20%</option>
          </select>
          <span className="text-base font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(estimate.breakdown.contingency)}
          </span>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gradient-to-r from-brand-500 to-sky-600 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Total Rehab Estimate</h2>
            <div className="flex gap-3 text-xs text-white/80 mt-0.5">
              <span>Base: {formatCurrency(estimate.breakdown.construction_total)}</span>
              <span>+</span>
              <span>Contingency: {formatCurrency(estimate.breakdown.contingency)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(estimate.total_rehab)}
          </div>
        </div>

        {includeHolding && estimate.holding_costs && (
          <div className="pt-2 border-t border-white/20">
            <div className="flex justify-between items-center">
              <div className="text-white/90 text-sm">
                <span className="font-medium">Total Project Cost</span>
                <span className="text-white/70 ml-2">
                  (Rehab + {estimate.holding_costs.duration_months}mo Holding)
                </span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(estimate.total_project_cost)}
              </div>
            </div>
          </div>
        )}
      </div>

      {saveAction}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onSwitchToDetailed && (
          <button
            onClick={onSwitchToDetailed}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--accent-sky)',
              border: '2px solid var(--accent-sky)',
            }}
          >
            <Wrench className="w-3.5 h-3.5" />
            Customize Line Items
          </button>
        )}
      </div>
    </div>
  )
}
