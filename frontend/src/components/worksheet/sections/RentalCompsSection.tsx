'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorksheetStore } from '@/stores/worksheetStore'
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  RefreshCw,
  Home,
  TrendingUp,
  Lock,
  Unlock,
  RotateCcw,
  Info,
} from 'lucide-react'
import {
  calculateRentAppraisalValues,
  calculateSimilarityScore,
  calculateRentAdjustments,
  type SubjectProperty as AppraisalSubjectProperty,
  type CompProperty,
  type RentAppraisalResult,
  type CompAdjustment,
} from '@/utils/appraisalCalculations'
import { formatCurrency } from '@/utils/formatters'
import { fetchRentComps } from '@/lib/api/rent-comps'
import type { RentComp, SubjectProperty as CompsSubjectProperty } from '@/lib/api/types'
import { usePropertyData } from '@/hooks/usePropertyData'
import { mapPropertyToIQSources } from '@/utils/propertySourceMapper'
import { buildRentalConsensus, type UnderwritingMode } from '@/utils/marketConsensus'
import { MarketConsensusRail } from '@/components/worksheet/consensus/MarketConsensusRail'
import type { IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'

// ============================================
// UTILITIES
// ============================================
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getListingAge = (dateString: string) => {
  if (!dateString) return ''
  const listDate = new Date(dateString)
  if (isNaN(listDate.getTime())) return ''
  const today = new Date()
  const diffTime = today.getTime() - listDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Coming'
  if (diffDays === 0) return 'Today'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 60) return '1mo ago'
  return `${Math.floor(diffDays / 30)}mo ago`
}

const getListingDaysAgo = (dateString: string): number => {
  if (!dateString) return 999
  const listDate = new Date(dateString)
  if (isNaN(listDate.getTime())) return 999
  const today = new Date()
  const diffTime = today.getTime() - listDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

const getFreshnessBadge = (
  dateString: string,
): { label: string; color: string; bgColor: string } | null => {
  const daysAgo = getListingDaysAgo(dateString)
  if (daysAgo < 0) return null
  if (daysAgo <= 30)
    return { label: 'Recent', color: '#0465f2', bgColor: 'rgba(4, 101, 242, 0.12)' }
  if (daysAgo > 90) return { label: 'Older listing', color: '#b7791f', bgColor: '#b7791f15' }
  return null
}

// Convert RentComp to appraisal calculation format
function toCompProperty(comp: RentComp): CompProperty {
  return {
    id: comp.id,
    zpid: comp.zpid,
    address: comp.address,
    price: comp.monthlyRent,
    sqft: comp.sqft,
    beds: comp.beds,
    baths: comp.baths,
    yearBuilt: comp.yearBuilt,
    lotSize: comp.lotSize ?? 0,
    distance: comp.distanceMiles,
    pricePerSqft: comp.rentPerSqft,
  }
}

// ============================================
// COMPONENTS
// ============================================
const RentalCardSkeleton = () => (
  <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-24 h-24 bg-[var(--chart-grid)] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--chart-grid)] rounded w-3/4" />
        <div className="h-3 bg-[var(--chart-grid)] rounded w-1/2" />
        <div className="h-3 bg-[var(--chart-grid)] rounded w-1/3" />
      </div>
    </div>
  </div>
)

const SimilarityBar = ({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ElementType
}) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
    <span className="text-xs text-[var(--text-secondary)] w-14">{label}</span>
    <div className="flex-1 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          backgroundColor: value >= 90 ? 'var(--accent-sky)' : value >= 75 ? '#0354d1' : '#b7791f',
        }}
      />
    </div>
    <span className="text-xs font-semibold text-[var(--text-body)] w-8 text-right tabular-nums">
      {value}%
    </span>
  </div>
)

// Dual Rent Valuation Panel Component
const DualRentValuationPanel = ({
  appraisalResult,
  isMarketRentOverridden,
  isImprovedRentOverridden,
  manualMarketRent,
  manualImprovedRent,
  onMarketRentChange,
  onImprovedRentChange,
  onToggleMarketRentOverride,
  onToggleImprovedRentOverride,
  onApplyRent,
  loading,
  selectedCount,
  purchasePrice,
}: {
  appraisalResult: RentAppraisalResult
  isMarketRentOverridden: boolean
  isImprovedRentOverridden: boolean
  manualMarketRent: number
  manualImprovedRent: number
  onMarketRentChange: (value: number) => void
  onImprovedRentChange: (value: number) => void
  onToggleMarketRentOverride: () => void
  onToggleImprovedRentOverride: () => void
  onApplyRent: () => void
  loading: boolean
  selectedCount: number
  purchasePrice: number
}) => {
  const displayMarketRent = isMarketRentOverridden ? manualMarketRent : appraisalResult.marketRent
  const displayImprovedRent = isImprovedRentOverridden
    ? manualImprovedRent
    : appraisalResult.improvedRent

  // Calculate metrics
  const annualGross = displayMarketRent * 12
  const estimatedNOI = annualGross * 0.6
  const capRate = purchasePrice > 0 ? (estimatedNOI / purchasePrice) * 100 : 0

  return (
    <div className="bg-gradient-to-r from-[var(--accent-sky)]/10 via-[var(--accent-brand-blue)]/5 to-[var(--accent-sky)]/10 rounded-xl p-4 border border-[rgba(4, 101, 242,0.25)]/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-card)] shadow-sm flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--accent-sky)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Rental Appraisal</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              From {selectedCount} selected comps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-card)]/60">
            <div className="text-lg font-bold text-[var(--accent-sky)] tabular-nums">
              {capRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase">Est. Cap Rate</div>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-[var(--surface-card)]/60">
            <div
              className="text-lg font-bold tabular-nums"
              style={{
                color:
                  appraisalResult.confidence >= 85
                    ? 'var(--accent-sky)'
                    : appraisalResult.confidence >= 70
                      ? '#b7791f'
                      : '#b42318',
              }}
            >
              {loading ? '...' : appraisalResult.confidence}%
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase">Confidence</div>
          </div>
        </div>
      </div>

      {/* Dual Rent Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Market Rent */}
        <div className="bg-[var(--surface-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Est. Market Rent
            </span>
            <button
              onClick={onToggleMarketRentOverride}
              className={`p-1 rounded transition-colors ${isMarketRentOverridden ? 'text-[var(--status-warning)] bg-[rgba(183,121,31,0.08)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              title={
                isMarketRentOverridden ? 'Value overridden - click to reset' : 'Click to override'
              }
            >
              {isMarketRentOverridden ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {isMarketRentOverridden ? (
            <div className="flex items-baseline">
              <input
                type="text"
                value={formatCurrency(manualMarketRent)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                  if (!isNaN(val)) onMarketRentChange(val)
                }}
                className="text-xl font-bold text-[var(--text-heading)] tabular-nums bg-[rgba(183,121,31,0.08)] border border-[rgba(183,121,31,0.25)] rounded px-2 py-1 w-24"
              />
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/mo</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-[var(--text-heading)] tabular-nums">
              {loading ? '...' : formatCurrency(displayMarketRent)}
              <span className="text-sm font-normal text-[var(--text-muted)]">/mo</span>
            </div>
          )}
          <div className="text-[10px] text-[var(--text-muted)] mt-1">As-Is Condition</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Range: ${appraisalResult.rangeLow} — ${appraisalResult.rangeHigh}
          </div>
        </div>

        {/* Improved Rent */}
        <div className="bg-[var(--surface-card)] rounded-lg p-3 border border-[rgba(4, 101, 242,0.25)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--accent-sky)] uppercase tracking-wide">
              Improved Rent
            </span>
            <button
              onClick={onToggleImprovedRentOverride}
              className={`p-1 rounded transition-colors ${isImprovedRentOverridden ? 'text-[var(--status-warning)] bg-[rgba(183,121,31,0.08)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              title={
                isImprovedRentOverridden ? 'Value overridden - click to reset' : 'Click to override'
              }
            >
              {isImprovedRentOverridden ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {isImprovedRentOverridden ? (
            <div className="flex items-baseline">
              <input
                type="text"
                value={formatCurrency(manualImprovedRent)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, ''))
                  if (!isNaN(val)) onImprovedRentChange(val)
                }}
                className="text-xl font-bold text-[var(--accent-sky-light)] tabular-nums bg-[rgba(183,121,31,0.08)] border border-[rgba(183,121,31,0.25)] rounded px-2 py-1 w-24"
              />
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/mo</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-[var(--accent-sky-light)] tabular-nums">
              {loading ? '...' : formatCurrency(displayImprovedRent)}
              <span className="text-sm font-normal text-[var(--text-muted)]">/mo</span>
            </div>
          )}
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Post-Rehab (+10% premium)</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-medium text-green-600">
              Updated condition premium
            </span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-[var(--surface-card)]/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase">Rent/Sq.Ft.</div>
          <div className="text-sm font-semibold text-[var(--text-heading)] tabular-nums">
            ${appraisalResult.rentPerSqft}
          </div>
        </div>
        <div className="bg-[var(--surface-card)]/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase">Annual Gross</div>
          <div className="text-sm font-semibold text-[var(--accent-sky)] tabular-nums">
            {formatCurrency(annualGross)}
          </div>
        </div>
        <div className="bg-[var(--surface-card)]/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase">Est. NOI (60%)</div>
          <div className="text-sm font-semibold text-[var(--text-heading)] tabular-nums">
            {formatCurrency(estimatedNOI)}
          </div>
        </div>
      </div>

      {/* Methodology Info */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-3 px-1">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Weighted hybrid: Adjusted rents (50%) + $/sqft (50%)</span>
        </div>
        <span className="tabular-nums">${appraisalResult.rentPerSqft}/sqft avg</span>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApplyRent}
        disabled={displayMarketRent === 0}
        className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent-sky)] hover:bg-[var(--accent-sky-light)] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Apply Rent to Deal Analysis
      </button>
    </div>
  )
}

// Rent Adjustment Grid Component
const RentAdjustmentGrid = ({
  compAdjustments,
  isExpanded,
  onToggle,
}: {
  compAdjustments: CompAdjustment[]
  isExpanded: boolean
  onToggle: () => void
}) => {
  if (compAdjustments.length === 0) return null

  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--accent-sky)]" />
          <span className="text-sm font-semibold text-[var(--text-body)]">
            Rent Adjustment Breakdown
          </span>
          <span className="text-xs text-[var(--text-muted)]">({compAdjustments.length} comps)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-elevated)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">
                    Comp Address
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Base Rent
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Size
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Bed
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Bath
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--accent-sky)]">
                    Adjusted
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody>
                {compAdjustments.map((ca, idx) => (
                  <tr
                    key={ca.compId}
                    className={
                      idx % 2 === 0 ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-elevated)]/50'
                    }
                  >
                    <td
                      className="px-3 py-2 text-[var(--text-body)] truncate max-w-[150px]"
                      title={ca.compAddress}
                    >
                      {ca.compAddress}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      ${ca.basePrice}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.sizeAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.sizeAdjustment >= 0 ? '+' : ''}${ca.sizeAdjustment}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.bedroomAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.bedroomAdjustment >= 0 ? '+' : ''}${ca.bedroomAdjustment}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${ca.bathroomAdjustment >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {ca.bathroomAdjustment >= 0 ? '+' : ''}${ca.bathroomAdjustment}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--accent-sky-light)]">
                      ${ca.adjustedPrice}/mo
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {(ca.weight * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Rental Comp Card
const RentalCompCard = ({
  comp,
  subject,
  isSelected,
  onToggle,
  isExpanded,
  onExpand,
  onRefreshComp,
  refreshing,
  freshnessBadge,
}: {
  comp: RentComp
  subject: {
    address: string
    city: string
    state: string
    zip: string
    sqft: number
    beds: number
    baths: number
    yearBuilt: number
    lotSize: number
    price: number
    latitude: number
    longitude: number
  }
  isSelected: boolean
  onToggle: () => void
  isExpanded: boolean
  onExpand: () => void
  onRefreshComp: () => void
  refreshing: boolean
  freshnessBadge?: { label: string; color: string; bgColor: string } | null
}) => {
  // Calculate similarity and adjustments for this comp
  const subjectForCalc: AppraisalSubjectProperty = {
    sqft: subject.sqft,
    beds: subject.beds,
    baths: subject.baths,
    yearBuilt: subject.yearBuilt,
    lotSize: subject.lotSize,
  }
  const compForCalc = toCompProperty(comp)
  const similarity = calculateSimilarityScore(subjectForCalc, compForCalc)
  const adjustments = calculateRentAdjustments(subjectForCalc, compForCalc)

  return (
    <div
      className={`relative rounded-xl border transition-all overflow-hidden ${
        isSelected
          ? 'bg-[var(--surface-card)] ring-2 ring-[var(--accent-sky)]/20 border-[rgba(4, 101, 242,0.25)]'
          : 'bg-[var(--surface-elevated)] border-[var(--border-default)] hover:border-[var(--border-default)]'
      }`}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-[var(--accent-sky)] border-[var(--accent-sky)]'
            : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--accent-sky)]'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Refresh button for unselected comps */}
      {!isSelected && (
        <button
          onClick={onRefreshComp}
          disabled={refreshing}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--accent-sky)] hover:border-[rgba(4, 101, 242,0.4)] transition-colors disabled:opacity-50"
          title="Replace this comp with a new one"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}

      <div className="flex">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-[var(--surface-elevated)]">
          {comp.imageUrl ? (
            <img
              src={comp.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--chart-grid)]">
              <Home className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-[var(--surface-card)]/90 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] font-semibold text-[var(--accent-sky)] tabular-nums">
              {comp.distanceMiles?.toFixed(2)} mi
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 pl-4">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] truncate">
                {comp.address}
              </h4>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {comp.city}, {comp.state}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[var(--accent-sky)] tabular-nums">
                {formatCurrency(comp.monthlyRent)}
                <span className="text-xs font-normal text-[var(--text-muted)]">/mo</span>
              </p>
              <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                ${comp.rentPerSqft?.toFixed(2)}/sf
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1 pl-4">
            <span className="flex items-center gap-0.5">
              <Bed className="w-3 h-3" />
              {comp.beds}
            </span>
            <span className="flex items-center gap-0.5">
              <Bath className="w-3 h-3" />
              {comp.baths}
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              <Square className="w-3 h-3" />
              {comp.sqft?.toLocaleString()} sq ft
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              Year Built {comp.yearBuilt ?? 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">
                Listed {formatDate(comp.listingDate)}
              </span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                {getListingAge(comp.listingDate)}
              </span>
              {freshnessBadge && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: freshnessBadge.bgColor, color: freshnessBadge.color }}
                >
                  {freshnessBadge.label}
                </span>
              )}
            </div>
            <button
              onClick={onExpand}
              className="text-xs text-[var(--accent-sky)] hover:text-[var(--accent-sky-light)] font-medium flex items-center gap-0.5"
            >
              Details{' '}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Match Score */}
        <div className="w-16 flex flex-col items-center justify-center bg-[var(--surface-elevated)] border-l border-[var(--border-subtle)]">
          <div
            className="text-xl font-bold tabular-nums"
            style={{
              color:
                similarity.overall >= 90
                  ? 'var(--accent-sky)'
                  : similarity.overall >= 75
                    ? '#0354d1'
                    : '#b7791f',
            }}
          >
            {similarity.overall}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">% Match</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--surface-elevated)]/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--accent-sky)] uppercase tracking-wide mb-2">
                Similarity
              </h5>
              <div className="space-y-1.5">
                <SimilarityBar label="Location" value={similarity.location} icon={MapPin} />
                <SimilarityBar label="Size" value={similarity.size} icon={Square} />
                <SimilarityBar label="Bed/Bath" value={similarity.bedBath} icon={Bed} />
                <SimilarityBar label="Age" value={similarity.age} icon={Calendar} />
              </div>
            </div>
            <div>
              <h5 className="text-[10px] font-semibold text-[var(--text-body)] uppercase tracking-wide mb-2">
                Rent Adjustments
              </h5>
              <div className="space-y-1">
                {[
                  { label: 'Size', value: adjustments.size },
                  { label: 'Bedroom', value: adjustments.bedroom },
                  { label: 'Bathroom', value: adjustments.bathroom },
                ].map((adj) => (
                  <div key={adj.label} className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{adj.label}</span>
                    <span
                      className={`font-medium tabular-nums ${adj.value >= 0 ? 'text-[var(--accent-sky)]' : 'text-red-500'}`}
                    >
                      {adj.value >= 0 ? '+' : ''}
                      {formatCurrency(adj.value)}/mo
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-[var(--border-default)]">
                  <span className="font-semibold text-[var(--text-body)]">Adjusted</span>
                  <span className="font-bold text-[var(--accent-sky)] tabular-nums">
                    {formatCurrency(comp.monthlyRent + adjustments.total)}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function RentalCompsSection() {
  const { propertyData, assumptions, updateAssumption } = useWorksheetStore()

  const [comps, setComps] = useState<RentComp[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedCompIds, setSelectedCompIds] = useState<Set<string | number>>(new Set())
  const [expandedComp, setExpandedComp] = useState<number | string | null>(null)
  const [recencyFilter, setRecencyFilter] = useState<'all' | '30' | '90'>('all')
  const [refreshingCompId, setRefreshingCompId] = useState<string | number | null>(null)
  const [showAdjustmentGrid, setShowAdjustmentGrid] = useState(false)
  const [fetchOffset, setFetchOffset] = useState(0)

  // Override state
  const [isMarketRentOverridden, setIsMarketRentOverridden] = useState(false)
  const [isImprovedRentOverridden, setIsImprovedRentOverridden] = useState(false)
  const [manualMarketRent, setManualMarketRent] = useState(0)
  const [manualImprovedRent, setManualImprovedRent] = useState(0)

  // Market consensus state
  const { fetchProperty } = usePropertyData()
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null, mashvisor: null },
  })
  const [activeUnderwriteMode, setActiveUnderwriteMode] = useState<UnderwritingMode | null>(null)

  // Build subject property from worksheet data
  const snapshot = propertyData?.property_data_snapshot
  const subject = useMemo(
    () => ({
      address:
        snapshot?.street ||
        snapshot?.streetAddress ||
        snapshot?.address ||
        propertyData?.address_street ||
        '',
      city: snapshot?.city || propertyData?.address_city || '',
      state: snapshot?.state || propertyData?.address_state || '',
      zip: snapshot?.zipCode || snapshot?.zipcode || propertyData?.address_zip || '',
      price: assumptions.purchasePrice || snapshot?.listPrice || 0,
      beds: snapshot?.bedrooms || 0,
      baths: snapshot?.bathrooms || 0,
      sqft: snapshot?.sqft || snapshot?.livingArea || 0,
      lotSize: snapshot?.lotSize || 0,
      yearBuilt: snapshot?.yearBuilt || 0,
      latitude: snapshot?.latitude ?? null,
      longitude: snapshot?.longitude ?? null,
    }),
    [snapshot, propertyData, assumptions.purchasePrice],
  )

  const subjectForComps: CompsSubjectProperty | undefined = useMemo(() => {
    const hasId = Boolean(subject.address || propertyData?.zpid || snapshot?.zpid)
    if (!hasId) return undefined
    return {
      zpid: propertyData?.zpid?.toString() || snapshot?.zpid?.toString() || '',
      address: subject.address,
      city: subject.city,
      state: subject.state,
      zip: subject.zip,
      beds: subject.beds,
      baths: subject.baths,
      sqft: subject.sqft,
      yearBuilt: subject.yearBuilt,
      propertyType: '',
      listPrice: subject.price,
      zestimate: null,
      rentZestimate: null,
      latitude: subject.latitude,
      longitude: subject.longitude,
    }
  }, [subject, propertyData, snapshot])

  const zpid = propertyData?.zpid?.toString() || snapshot?.zpid?.toString() || ''

  // Calculate rent appraisal values from selected comps
  const appraisalResult = useMemo(() => {
    const selectedComps = comps.filter((c) => selectedCompIds.has(c.id)).map(toCompProperty)

    const subjectForCalc: AppraisalSubjectProperty = {
      sqft: subject.sqft,
      beds: subject.beds,
      baths: subject.baths,
      yearBuilt: subject.yearBuilt,
      lotSize: subject.lotSize,
    }

    return calculateRentAppraisalValues(subjectForCalc, selectedComps)
  }, [selectedCompIds, comps, subject])

  // Fetch comps (non-blocking; never blocks core analysis)
  const fetchComps = useCallback(
    async (offset = 0, excludeZpids: string[] = []) => {
      setLoading(true)
      setLoadFailed(false)

      const identifier = {
        zpid: zpid || undefined,
        address: subject.address
          ? `${subject.address}, ${subject.city}, ${subject.state} ${subject.zip}`.trim()
          : undefined,
        limit: 10,
        offset,
        exclude_zpids: excludeZpids.length > 0 ? excludeZpids.join(',') : undefined,
      }

      const result = await fetchRentComps(identifier, subjectForComps ?? undefined)

      setLoading(false)
      if (result.ok && result.data) {
        setComps(result.data)
        setLoadFailed(false)
        return result.data
      }
      setLoadFailed(true)
      setComps([])
      return []
    },
    [subject, zpid, subjectForComps],
  )

  // Initial fetch when we have an identifier (runs when zpid/address becomes available)
  useEffect(() => {
    if (!subject.address && !zpid) return
    const doFetch = async () => {
      const fetched = await fetchComps()
      if (fetched.length > 0) {
        setSelectedCompIds(new Set(fetched.slice(0, 3).map((c) => c.id)))
      }
    }
    doFetch()
  }, [zpid, subject.address, subject.city, subject.state, subject.zip, fetchComps])

  // When comps have zpid but no image, fetch photos from /api/v1/photos and set first photo as image
  const compsNeedingPhotos = comps.filter(
    (c) => c.zpid && !(c.imageUrl && c.imageUrl.startsWith('http')),
  )
  useEffect(() => {
    if (compsNeedingPhotos.length === 0) return

    let cancelled = false
    const photoByZpid: Record<string, string> = {}

    Promise.allSettled(
      compsNeedingPhotos.map(async (c) => {
        const res = await fetch(
          `${window.location.origin}/api/v1/photos?zpid=${encodeURIComponent(c.zpid!)}`,
          {
            headers: { Accept: 'application/json' },
          },
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        const url = data?.photos?.[0]?.url
        if (url) photoByZpid[c.zpid!] = url
      }),
    ).then(() => {
      if (cancelled || Object.keys(photoByZpid).length === 0) return
      setComps((prev) =>
        prev.map((c) => {
          const url = c.zpid ? photoByZpid[c.zpid] : null
          return url ? { ...c, imageUrl: url } : c
        }),
      )
    })

    return () => {
      cancelled = true
    }
  }, [comps.length, compsNeedingPhotos.length])

  // Load source estimates from shared property cache for consensus rail
  useEffect(() => {
    if (!subject.address) return
    const fullAddr = [subject.address, subject.city, subject.state, subject.zip]
      .filter(Boolean)
      .join(', ')
    fetchProperty(fullAddr, {
      city: subject.city || undefined,
      state: subject.state || undefined,
      zip_code: subject.zip || undefined,
    })
      .then((data) => setIqSources(mapPropertyToIQSources(data)))
      .catch(() => {
        /* sources unavailable — consensus rail hides gracefully */
      })
  }, [subject.address, subject.city, subject.state, subject.zip, fetchProperty])

  // Compute consensus from sources + comp appraisal
  const consensus = useMemo(
    () => buildRentalConsensus(iqSources, appraisalResult),
    [iqSources, appraisalResult],
  )

  // Refresh all comps
  const handleRefreshAll = async () => {
    const fetched = await fetchComps()
    setComps(fetched)
    setFetchOffset(0)
    if (fetched.length > 0) {
      setSelectedCompIds(new Set(fetched.slice(0, 3).map((c) => c.id)))
    }
  }

  // Refresh only unselected comps
  const handleRefreshUnselected = async () => {
    setLoading(true)
    try {
      const selectedZpids = comps
        .filter((c) => selectedCompIds.has(c.id))
        .map((c) => c.zpid || String(c.id))
        .filter(Boolean)

      const unselectedCount = comps.filter((c) => !selectedCompIds.has(c.id)).length
      const newOffset = fetchOffset + unselectedCount

      const newComps = await fetchComps(newOffset, selectedZpids)

      const selectedComps = comps.filter((c) => selectedCompIds.has(c.id))
      setComps([...selectedComps, ...newComps.slice(0, unselectedCount)])
      setFetchOffset(newOffset)
    } finally {
      setLoading(false)
    }
  }

  // Refresh single comp
  const handleRefreshComp = async (compId: string | number) => {
    setRefreshingCompId(compId)
    try {
      const excludeZpids = comps
        .filter((c) => c.id !== compId)
        .map((c) => c.zpid || String(c.id))
        .filter(Boolean)

      const newComps = await fetchComps(fetchOffset, excludeZpids)

      if (newComps.length > 0) {
        setComps((prev) => prev.map((c) => (c.id === compId ? newComps[0] : c)))
        setFetchOffset((prev) => prev + 1)
      }
    } finally {
      setRefreshingCompId(null)
    }
  }

  const toggleComp = (id: number | string) => {
    setSelectedCompIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Apply rent to worksheet
  const handleApplyRent = () => {
    const rent = isMarketRentOverridden ? manualMarketRent : appraisalResult.marketRent
    if (rent > 0) {
      updateAssumption('monthlyRent', rent)
    }
  }

  // Apply consensus underwriting mode
  const handleApplyConsensusMode = (mode: UnderwritingMode, value: number) => {
    setActiveUnderwriteMode(mode)
    if (value > 0) {
      setIsMarketRentOverridden(true)
      setManualMarketRent(value)
    }
  }

  // Override handlers
  const handleToggleMarketRentOverride = () => {
    if (isMarketRentOverridden) {
      setIsMarketRentOverridden(false)
      setManualMarketRent(0)
    } else {
      setIsMarketRentOverridden(true)
      setManualMarketRent(appraisalResult.marketRent)
    }
  }

  const handleToggleImprovedRentOverride = () => {
    if (isImprovedRentOverridden) {
      setIsImprovedRentOverridden(false)
      setManualImprovedRent(0)
    } else {
      setIsImprovedRentOverridden(true)
      setManualImprovedRent(appraisalResult.improvedRent)
    }
  }

  // Filter comps by recency
  const filteredComps = useMemo(() => {
    return comps.filter((c) => {
      const daysAgo = getListingDaysAgo(c.listingDate)
      if (recencyFilter === '30') return daysAgo <= 30
      if (recencyFilter === '90') return daysAgo <= 90
      return true
    })
  }, [comps, recencyFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-heading)]">Rental Appraisal Toolkit</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Comparable rentals for {subject.address}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshUnselected}
            disabled={loading || selectedCompIds.size === 0}
            className="px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-50 flex items-center gap-1.5"
            title="Get new comps for unselected items"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Unselected
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Dual Rent Valuation Panel */}
      <DualRentValuationPanel
        appraisalResult={appraisalResult}
        isMarketRentOverridden={isMarketRentOverridden}
        isImprovedRentOverridden={isImprovedRentOverridden}
        manualMarketRent={manualMarketRent}
        manualImprovedRent={manualImprovedRent}
        onMarketRentChange={setManualMarketRent}
        onImprovedRentChange={setManualImprovedRent}
        onToggleMarketRentOverride={handleToggleMarketRentOverride}
        onToggleImprovedRentOverride={handleToggleImprovedRentOverride}
        onApplyRent={handleApplyRent}
        loading={loading}
        selectedCount={selectedCompIds.size}
        purchasePrice={subject.price}
      />

      {/* Market Consensus Rail */}
      <MarketConsensusRail
        consensus={consensus}
        mode="rent"
        onApplyMode={handleApplyConsensusMode}
        activeMode={activeUnderwriteMode}
      />

      {/* Adjustment Grid */}
      <RentAdjustmentGrid
        compAdjustments={appraisalResult.compAdjustments}
        isExpanded={showAdjustmentGrid}
        onToggle={() => setShowAdjustmentGrid(!showAdjustmentGrid)}
      />

      {/* Recency Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">Filter by:</span>
        <div className="flex rounded-lg bg-[var(--surface-elevated)] p-0.5">
          {[
            { value: 'all' as const, label: 'All' },
            { value: '30' as const, label: 'Last 30 days' },
            { value: '90' as const, label: 'Last 90 days' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setRecencyFilter(filter.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                recencyFilter === filter.value
                  ? 'bg-[var(--surface-card)] text-[var(--accent-sky)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-body)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          {selectedCompIds.size} of {filteredComps.length} rentals selected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCompIds(new Set(filteredComps.map((c) => c.id)))}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-lg"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedCompIds(new Set())}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && comps.length === 0 && !loadFailed && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <RentalCardSkeleton key={i} />
          ))}
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Loading comparable rentals...
          </p>
        </div>
      )}

      {/* Unavailable (friendly fallback — no raw errors) */}
      {loadFailed && !loading && (
        <div className="rounded-xl border border-[var(--border-default)] p-6 text-center bg-[var(--surface-elevated)]/80">
          <Info className="mx-auto mb-3 text-[var(--text-muted)] w-10 h-10" aria-hidden />
          <h3 className="text-sm font-semibold text-[var(--text-body)] mb-1">
            Comparable rentals temporarily unavailable
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
            Your deal analysis and scores above are complete. Comps will appear here when the data
            source is back online.
          </p>
          <button
            type="button"
            onClick={() => handleRefreshAll()}
            className="px-4 py-2 text-sm font-medium text-[var(--text-body)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-elevated)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty (success but no comps found) */}
      {!loading && !loadFailed && comps.length === 0 && (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-6 text-center">
          <Home className="mx-auto mb-2 text-[var(--text-muted)] w-8 h-8" />
          <h3 className="text-sm font-semibold text-[var(--text-body)] mb-1">
            No Rental Comps Found
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Try refreshing or check the property address
          </p>
        </div>
      )}

      {/* Rental Comps List */}
      {!loading && !loadFailed && comps.length > 0 && (
        <div className="space-y-3">
          {filteredComps.map((comp) => {
            const freshnessBadge = getFreshnessBadge(comp.listingDate)
            return (
              <RentalCompCard
                key={comp.id}
                comp={comp}
                subject={subject}
                isSelected={selectedCompIds.has(comp.id)}
                onToggle={() => toggleComp(comp.id)}
                isExpanded={expandedComp === comp.id}
                onExpand={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
                onRefreshComp={() => handleRefreshComp(comp.id)}
                refreshing={refreshingCompId === comp.id}
                freshnessBadge={freshnessBadge}
              />
            )
          })}
        </div>
      )}

      {/* Distance-based confidence indicator */}
      {!loading && !loadFailed && comps.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              {comps.filter((c) => c.distanceMiles <= 0.5).length} of {comps.length} comps within
              0.5 mi
            </span>
            <span
              className={`text-xs font-semibold ${
                comps.filter((c) => c.distanceMiles <= 0.5).length >= 3
                  ? 'text-[var(--accent-sky)]'
                  : comps.filter((c) => c.distanceMiles <= 1).length >= 3
                    ? 'text-[var(--status-warning)]'
                    : 'text-[var(--text-secondary)]'
              }`}
            >
              Location Quality:{' '}
              {comps.filter((c) => c.distanceMiles <= 0.5).length >= 3
                ? 'EXCELLENT'
                : comps.filter((c) => c.distanceMiles <= 1).length >= 3
                  ? 'GOOD'
                  : 'FAIR'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
